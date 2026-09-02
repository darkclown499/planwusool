<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use DOMDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Merchant UX regression tests for the Product Feeds settings page
 * (Marketing → Product Feeds).
 *
 * Focused on the merchant-facing page: it must render for an authorized
 * merchant, show ONLY their own store's Google/CSV feed links, produce HTTPS
 * URLs under a production-style HTTPS config, keep both feeds valid, and never
 * claim a Google approval that Wusool does not guarantee.
 */
class ProductFeedsMerchantUxTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        StoreConfiguration::flushRequestCache();
        \Illuminate\Support\Facades\Cache::flush();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    private function storeUrl(Store $store): string
    {
        return "http://{$store->slug}." . config('app.store_domain');
    }

    private function merchantWithStore(array $storeAttrs = []): array
    {
        $plan = Plan::factory()->create([
            'price' => 0,
            'is_default' => true,
            'max_stores' => 5,
            'max_products_per_store' => 1000,
        ]);
        $user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_is_active' => true,
        ]);
        $store = Store::factory()->create(array_merge([
            'user_id' => $user->id,
            'name' => 'UX Feed Store',
        ], $storeAttrs));
        \Illuminate\Support\Facades\DB::table('users')->where('id', $user->id)->update(['current_store' => $store->id]);
        $user = $user->fresh();
        $user->givePermissionTo('settings-stores');
        return [$user, $store];
    }

    private function createActiveProduct(Store $store, array $overrides = []): Product
    {
        return Product::create(array_merge([
            'name' => 'UX Product',
            'price' => 49.99,
            'stock' => 10,
            'track_inventory' => 1,
            'allow_backorder' => 0,
            'store_id' => $store->id,
            'images' => '/storage/media/ux.jpg',
            'is_active' => true,
            'seo_url_slug' => 'ux-product',
        ], $overrides));
    }

    private function fetchGoogleFeed(Store $store): \Illuminate\Testing\TestResponse
    {
        return $this->get($this->storeUrl($store) . '/feeds/google.xml');
    }

    private function fetchCsvFeed(Store $store): \Illuminate\Testing\TestResponse
    {
        return $this->get($this->storeUrl($store) . '/feeds/products.csv');
    }

    // ─── A. Page renders for authorized merchant + own URLs shown ───────────

    public function test_settings_page_renders_for_authorized_merchant(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);

        $this->get(route('product-feeds.index'))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page->component('feeds/product-feeds')->has('stats'));
    }

    public function test_product_feeds_page_denied_without_permission(): void
    {
        $plan = Plan::factory()->create(['is_default' => true]);
        $user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_is_active' => true,
        ]);
        $store = Store::factory()->create(['user_id' => $user->id]);
        $user->current_store = $store->id;
        $user->save();
        $this->actingAs($user);

        $this->get(route('product-feeds.index'))
            ->assertStatus(403);
    }

    public function test_own_store_google_and_csv_urls_are_exposed_to_page(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);

        $pageUrl = rtrim($store->getStoreUrl(), '/');
        $this->get(route('product-feeds.index'))
            ->assertInertia(fn ($page) => $page
                ->where('googleFeedUrl', $pageUrl . '/feeds/google.xml')
                ->where('csvFeedUrl', $pageUrl . '/feeds/products.csv'));
    }

    // ─── D. HTTPS under production-style config ─────────────────────────────

    public function test_page_feed_urls_are_https_under_https_config(): void
    {
        config(['app.url' => 'https://wusool.ps']);

        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);

        $httpsBase = 'https://' . $store->slug . '.' . config('app.store_domain');
        $this->get(route('product-feeds.index'))
            ->assertInertia(fn ($page) => $page
                ->where('googleFeedUrl', $httpsBase . '/feeds/google.xml')
                ->where('csvFeedUrl', $httpsBase . '/feeds/products.csv'));
    }

    // ─── E. Store A never receives Store B feed link/data ──────────────────

    public function test_store_a_page_never_exposes_store_b_feed_data(): void
    {
        [$userA, $storeA] = $this->merchantWithStore(['slug' => 'ux-store-a', 'name' => 'Store A']);
        [$userB, $storeB] = $this->merchantWithStore(['slug' => 'ux-store-b', 'name' => 'Store B']);

        // Store B owns a secret product that must never reach Store A's page/feed.
        $this->createActiveProduct($storeB, ['name' => 'Confidential B', 'seo_url_slug' => 'secret-b']);

        // Acting as A, the page only exposes A's own feed URLs.
        $this->actingAs($userA);
        $this->get(route('product-feeds.index'))
            ->assertInertia(fn ($page) => $page
                ->whereNot('googleFeedUrl', $storeB->getStoreUrl() . '/feeds/google.xml')
                ->whereNot('csvFeedUrl', $storeB->getStoreUrl() . '/feeds/products.csv'));

        // And A's feed never contains B's products.
        $body = $this->fetchGoogleFeed($storeA)->streamedContent();
        $this->assertStringNotContainsString('Confidential B', $body);
    }

    // ─── J. No Google approval claim is passed to the page ──────────────────

    public function test_page_does_not_expose_google_approval_claim(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);

        $this->get(route('product-feeds.index'))
            ->assertInertia(fn ($page) => $page
                ->missing('googleApproved')
                ->missing('googleApproval')
                ->missing('approvedForGoogle'));
    }

    // ─── F/G. Feeds remain valid ────────────────────────────────────────────

    public function test_google_feed_remains_valid_xml(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->createActiveProduct($store);

        $body = $this->fetchGoogleFeed($store)->streamedContent();
        $doc = new DOMDocument();
        $this->assertTrue(@$doc->loadXML($body), 'Google feed must be valid XML');
        $this->assertStringContainsString('application/xml', $this->fetchGoogleFeed($store)->headers->get('Content-Type'));
    }

    public function test_csv_feed_remains_valid_with_real_products(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $product = $this->createActiveProduct($store);

        $response = $this->fetchCsvFeed($store);
        $response->assertStatus(200);
        $body = $response->streamedContent();

        // CSV header row present.
        $this->assertStringContainsString('id,item_group_id,title', $body);
        // Real product present with correct ID and title.
        $this->assertStringContainsString($store->id . '-' . $product->id, $body);
        $this->assertStringContainsString('UX Product', $body);
    }

    // ─── I. Readiness counts remain accurate ────────────────────────────────

    public function test_page_readiness_counts_remain_accurate(): void
    {
        [$user, $store] = $this->merchantWithStore();
        // One ready product.
        $this->createActiveProduct($store, ['name' => 'Ready', 'seo_url_slug' => 'ready']);
        // One not-ready product: missing image.
        $this->createActiveProduct($store, ['name' => 'No Image', 'seo_url_slug' => 'no-image', 'images' => '']);
        $this->actingAs($user);

        $this->get(route('product-feeds.index'))
            ->assertInertia(fn ($page) => $page
                ->where('stats.eligible_items', 1)
                ->where('stats.excluded_products', 1));
    }
}
