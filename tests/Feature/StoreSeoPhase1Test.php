<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\StoreDomain;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Phase 1 of Wusool Store SEO Pro — the centralized shared SEO layer.
 *
 * Every storefront template renders through resources/views/app.blade.php,
 * sourcing its <head> from StorefrontSeoService, so these tests hold for all
 * six (and any future) templates. Covers: title/meta/canonical/robots,
 * product + category structured data, real price/currency/availability,
 * OpenGraph, Arabic slugs, custom-domain + subdomain canonicals, XSS escaping.
 */
class StoreSeoPhase1Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        StoreConfiguration::flushRequestCache();
        \Illuminate\Support\Facades\Cache::flush();
    }

    private function storeUrl(Store $store): string
    {
        return "http://{$store->slug}." . config('app.store_domain');
    }

    private function merchantWithStore(array $storeAttrs = []): array
    {
        $user = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'onboarded_at' => now()]);
        $store = Store::factory()->create(array_merge([
            'user_id' => $user->id,
            'name' => 'Phase One Store',
            'seo_title' => 'Phase One Store Title',
            'seo_description' => 'Phase one store description',
        ], $storeAttrs));
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function createActiveProduct(Store $store, array $overrides = []): Product
    {
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        return Product::create(array_merge([
            'name' => 'Phase One Product',
            'price' => 49.99,
            'stock' => 10,
            'track_inventory' => 1,
            'allow_backorder' => 0,
            'store_id' => $store->id,
            'category_id' => $cat->id,
            'images' => '/storage/media/product.jpg',
            'is_active' => true,
            'meta_title' => 'Phase One Product SEO Title',
            'meta_description' => 'Phase one product meta description',
            'seo_url_slug' => 'phase-one-product',
        ], $overrides));
    }

    // ─── 1. Homepage title ─────────────────────────────────────────

    public function test_homepage_title_uses_store_seo_title(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/');
        $response->assertStatus(200);
        $this->assertStringContainsString('<title>Phase One Store Title</title>', $response->getContent());
    }

    // ─── 2/3. Product page title ───────────────────────────────────

    public function test_product_page_uses_meta_title(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->createActiveProduct($store, ['seo_url_slug' => 'phase-one-slug']);

        $response = $this->get($this->storeUrl($store) . '/product/phase-one-slug');
        $response->assertStatus(200);
        $this->assertStringContainsString('<title>Phase One Product SEO Title</title>', $response->getContent());
    }

    public function test_product_page_falls_back_to_product_name(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->createActiveProduct($store, ['meta_title' => null, 'seo_url_slug' => 'name-only-slug']);

        $response = $this->get($this->storeUrl($store) . '/product/name-only-slug');
        $response->assertStatus(200);
        $this->assertStringContainsString('<title>Phase One Product</title>', $response->getContent());
    }

    // ─── 4. Category title ─────────────────────────────────────────

    public function test_category_page_title_contains_category_and_store(): void
    {
        [$user, $store] = $this->merchantWithStore();
        Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'cat-one', 'name' => 'Category One']);

        $response = $this->get($this->storeUrl($store) . '/category/cat-one');
        $response->assertStatus(200);
        $this->assertStringContainsString('Category One', $response->getContent());
        $this->assertStringContainsString('Phase One Store', $response->getContent());
    }

    // ─── 5/6/7. Product structured data ────────────────────────────

    public function test_product_page_emits_product_json_ld(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->createActiveProduct($store);

        $response = $this->get($this->storeUrl($store) . '/product/phase-one-product');
        $content = $response->getContent();

        $this->assertStringContainsString('application/ld+json', $content);
        $this->assertStringContainsString('"@type":"Product"', $content);
        $this->assertStringContainsString('"name":"Phase One Product"', $content);
    }

    public function test_product_json_ld_uses_real_price_and_currency(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->createActiveProduct($store, ['price' => 49.99, 'currency' => 'USD']);

        $response = $this->get($this->storeUrl($store) . '/product/phase-one-product');
        $content = $response->getContent();

        $this->assertStringContainsString('"offers"', $content);
        $this->assertStringContainsString('"price":"49.99"', $content);
        $this->assertStringContainsString('"priceCurrency":"ILS"', $content);
    }

    public function test_product_json_ld_marks_out_of_stock(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->createActiveProduct($store, ['stock' => 0, 'track_inventory' => 1, 'allow_backorder' => 0]);

        $response = $this->get($this->storeUrl($store) . '/product/phase-one-product');
        $content = $response->getContent();

        $this->assertStringContainsString('OutOfStock', $content);
    }

    // ─── 8. No invented rating ─────────────────────────────────────

    public function test_product_json_ld_never_invents_aggregate_rating(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->createActiveProduct($store);

        $response = $this->get($this->storeUrl($store) . '/product/phase-one-product');
        $content = $response->getContent();

        $this->assertStringNotContainsString('aggregateRating', $content);
    }

    // ─── 9. Store structured data ──────────────────────────────────

    public function test_store_home_emits_store_json_ld(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/');
        $content = $response->getContent();

        $this->assertStringContainsString('application/ld+json', $content);
        $this->assertStringContainsString('BreadcrumbList', $content);
    }

    // ─── 10/11/12. Canonicals ──────────────────────────────────────

    public function test_store_home_canonical_matches_subdomain(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/');
        $content = $response->getContent();

        $expected = rtrim($this->storeUrl($store), '/');
        $this->assertStringContainsString('<link rel="canonical" href="' . $expected . '">', $content);
    }

    public function test_product_page_canonical_uses_slug_url(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->createActiveProduct($store, ['seo_url_slug' => 'phase-one-slug']);

        $response = $this->get($this->storeUrl($store) . '/product/phase-one-slug');
        $content = $response->getContent();

        $expected = $this->storeUrl($store) . '/product/phase-one-slug';
        $this->assertStringContainsString('<link rel="canonical" href="' . $expected . '">', $content);
    }

    public function test_custom_domain_canonical_uses_that_domain(): void
    {
        [$user, $store] = $this->merchantWithStore();
        StoreDomain::create([
            'store_id' => $store->id,
            'domain_name' => 'seo-phase.example.com',
            'is_verified' => true,
            'is_primary' => true,
            'ssl_status' => 'gcip',
        ]);
        $this->createActiveProduct($store, ['seo_url_slug' => 'custom-slug']);

        $response = $this->get('http://seo-phase.example.com/product/custom-slug');
        $response->assertStatus(200);
        $content = $response->getContent();

        // A resolved custom-domain store must emit that domain in its canonical.
        $this->assertStringContainsString('<link rel="canonical" href="http://seo-phase.example.com/product/custom-slug">', $content);
    }

    // ─── 13/14. noindex ────────────────────────────────────────────

    public function test_preview_mode_is_noindex(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/?preview=1');
        $content = $response->getContent();

        $this->assertStringContainsString('noindex', $content);
    }

    public function test_search_page_is_noindex(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/search?q=test');
        $content = $response->getContent();

        $this->assertStringContainsString('noindex', $content);
    }

    // ─── 15. JSON modal endpoint preserved ─────────────────────────

    public function test_product_json_endpoint_still_returns_json(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $product = $this->createActiveProduct($store);

        $response = $this->get($this->storeUrl($store) . '/product/phase-one-product', ['Accept' => 'application/json']);
        $response->assertStatus(200);
        $response->assertJson(['product' => ['id' => (string) $product->id]]);
    }

    // ─── 16. Arabic slug ───────────────────────────────────────────

    public function test_arabic_slug_product_is_crawlable(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->createActiveProduct($store, ['seo_url_slug' => 'منتج-جديد']);

        $response = $this->get($this->storeUrl($store) . '/product/' . rawurlencode('منتج-جديد'));
        $response->assertStatus(200);
        $this->assertStringContainsString('<title>Phase One Product SEO Title</title>', $response->getContent());
    }

    // ─── 17. XSS escaping ──────────────────────────────────────────

    public function test_merchant_seo_inputs_are_escaped(): void
    {
        [$user, $store] = $this->merchantWithStore([
            'seo_title' => '<script>alert(1)</script>XSS Store',
            'seo_description' => '<b>bold</b> description',
        ]);

        $response = $this->get($this->storeUrl($store) . '/');
        $content = $response->getContent();

        // Raw scripts must never appear in the rendered document.
        $this->assertStringNotContainsString('<script>alert(1)</script>', $content);
        $this->assertStringContainsString('&lt;script&gt;alert(1)&lt;/script&gt;', $content);
        $this->assertStringContainsString('&lt;b&gt;', $content);
    }

    // ─── 18. Description fallback ──────────────────────────────────

    public function test_product_meta_description_falls_back_to_short_description(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->createActiveProduct($store, [
            'meta_description' => null,
            'short_description' => 'Short product blurb',
            'seo_url_slug' => 'short-blurb-slug',
        ]);

        $response = $this->get($this->storeUrl($store) . '/product/short-blurb-slug');
        $content = $response->getContent();

        $this->assertStringContainsString('Short product blurb', $content);
    }

    // ─── 19. Shared layer across templates ─────────────────────────

    public function test_shared_seo_head_renders_for_all_store_routes(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->createActiveProduct($store, ['seo_url_slug' => 'shared-slug']);
        Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'slug' => 'shared-cat']);

        $routes = [
            $this->storeUrl($store) . '/',
            $this->storeUrl($store) . '/product/shared-slug',
            $this->storeUrl($store) . '/category/shared-cat',
            $this->storeUrl($store) . '/search?q=test',
        ];

        foreach ($routes as $url) {
            $content = $this->get($url)->getContent();
            $this->assertStringContainsString('<title>', $content, "no title on $url");
            $this->assertStringContainsString('<link rel="canonical"', $content, "no canonical on $url");
        }
    }

    // ─── 20. Store title fallback chain ────────────────────────────

    public function test_store_title_falls_back_to_config_then_name(): void
    {
        [$user, $store] = $this->merchantWithStore(['seo_title' => null]);
        StoreConfiguration::create([
            'store_id' => $store->id,
            'key' => 'meta_title',
            'value' => 'Config Phase Title',
        ]);

        $response = $this->get($this->storeUrl($store) . '/');
        $this->assertStringContainsString('Config Phase Title', $response->getContent());
    }
}
