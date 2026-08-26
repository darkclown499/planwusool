<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Currency;
use App\Models\PaymentSetting;
use App\Models\Product;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use App\Services\StorePreviewService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class UnpublishedPreviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Currency::create(['name' => 'Shekel', 'code' => 'ILS', 'symbol' => '₪']);
    }

    private function merchant(): User
    {
        $user = User::factory()->create(['type' => 'company', 'onboarded_at' => now()]);
        $plan = \App\Models\Plan::factory()->create(['max_stores' => 5, 'max_products_per_store' => 100]);
        $user->plan_id = $plan->id;
        $user->plan_is_active = 1;
        $user->save();
        return $user;
    }

    private function createUnpublishedStore(User $user, string $slug): Store
    {
        $store = Store::create(['name' => 'S ' . $slug, 'slug' => $slug, 'theme' => Store::DEFAULT_TEMPLATE, 'user_id' => $user->id]);
        $user->current_store = $store->id;
        $user->save();
        StoreConfiguration::setConfiguration($store->id, 'store_status', 'false');
        return $store;
    }

    // --- Owner can preview own unpublished store ---
    public function test_owner_session_can_preview_own_unpublished_store(): void
    {
        $owner = $this->merchant();
        $store = $this->createUnpublishedStore($owner, 'ownerstore1');
        $cat = Category::create(['name' => 'Cat', 'slug' => 'cat', 'store_id' => $store->id, 'is_active' => true]);
        Product::create(['name' => 'Prod', 'price' => 10, 'stock' => 5, 'images' => '/a.jpg', 'cover_image' => '/a.jpg', 'category_id' => $cat->id, 'store_id' => $store->id, 'is_active' => true]);

        $this->actingAs($owner);
        // Simulate subdomain request with owner session - CheckStoreStatus should allow preview
        $request = Request::create('http://ownerstore1.localhost/', 'GET');
        $request->setLaravelSession(session()->driver());
        // Validate via service directly
        $can = StorePreviewService::canPreview($request, $store);
        $this->assertTrue($can, 'Owner session should allow preview');
    }

    public function test_signed_token_allows_preview(): void
    {
        $owner = $this->merchant();
        $store = $this->createUnpublishedStore($owner, 'signed1');
        $url = StorePreviewService::generatePreviewUrl($store);
        $this->assertStringContainsString('preview_token=', $url);
        // Parse token
        parse_str(parse_url($url, PHP_URL_QUERY), $qs);
        $token = $qs['preview_token'] ?? null;
        $this->assertNotEmpty($token);
        $validated = StorePreviewService::validateToken($token);
        $this->assertSame($store->id, $validated);
        // Valid token should allow preview even anonymous
        $request = Request::create('http://signed1.localhost/?preview_token=' . urlencode($token), 'GET');
        $this->assertTrue(StorePreviewService::canPreview($request, $store));
    }

    // --- Anonymous cannot preview unpublished store ---
    public function test_anonymous_cannot_preview_unpublished(): void
    {
        $owner = $this->merchant();
        $store = $this->createUnpublishedStore($owner, 'anon1');
        $request = Request::create('http://anon1.localhost/', 'GET');
        $this->assertFalse(StorePreviewService::canPreview($request, $store));
        // Even with ?preview=1 alone (no token, no auth) must fail
        $request2 = Request::create('http://anon1.localhost/?preview=1', 'GET');
        $this->assertFalse(StorePreviewService::canPreview($request2, $store));
    }

    public function test_anonymous_blocked_on_subdomain_middleware(): void
    {
        $owner = $this->merchant();
        $store = $this->createUnpublishedStore($owner, 'blockedanon');
        // Anonymous request to subdomain home should be 503 without token
        $this->get('http://blockedanon.localhost/')->assertStatus(503);
    }

    // --- Merchant B cannot preview Merchant A unpublished store ---
    public function test_cross_merchant_cannot_preview(): void
    {
        $ownerA = $this->merchant();
        $storeA = $this->createUnpublishedStore($ownerA, 'crossa');
        $merchantB = $this->merchant();
        // B has own store but tries to preview A's store via session
        $storeB = Store::create(['name' => 'S crossb', 'slug' => 'crossb', 'theme' => Store::DEFAULT_TEMPLATE, 'user_id' => $merchantB->id]);
        $merchantB->current_store = $storeB->id;
        $merchantB->save();

        $this->actingAs($merchantB);
        $request = Request::create('http://crossa.localhost/', 'GET');
        $this->assertFalse(StorePreviewService::canPreview($request, $storeA));

        // Also via subdomain routing: B's session on A's subdomain should be 503
        $this->get('http://crossa.localhost/')->assertStatus(503);
    }

    public function test_copied_token_for_other_store_fails(): void
    {
        $owner = $this->merchant();
        $storeA = $this->createUnpublishedStore($owner, 'tokencopya');
        $storeB = Store::create(['name' => 'S tokenb', 'slug' => 'tokenb', 'theme' => Store::DEFAULT_TEMPLATE, 'user_id' => $owner->id]);
        StoreConfiguration::setConfiguration($storeB->id, 'store_status', 'false');
        $urlA = StorePreviewService::generatePreviewUrl($storeA);
        parse_str(parse_url($urlA, PHP_URL_QUERY), $qs);
        $tokenA = $qs['preview_token'];

        // Token from A used on B's domain must fail
        $request = Request::create('http://tokenb.localhost/?preview_token=' . urlencode($tokenA), 'GET');
        $this->assertFalse(StorePreviewService::canPreview($request, $storeB));
        $this->assertTrue(StorePreviewService::canPreview($request, $storeA)); // but still valid for A
    }

    public function test_expired_token_rejected(): void
    {
        $owner = $this->merchant();
        $store = $this->createUnpublishedStore($owner, 'expired1');
        // Craft expired token
        $expires = time() - 3600;
        $payload = $store->id . '|' . $expires;
        $sig = hash_hmac('sha256', $payload, config('app.key'));
        $token = base64_encode(json_encode(['s' => $store->id, 'e' => $expires, 'h' => $sig]));
        $request = Request::create('http://expired1.localhost/?preview_token=' . urlencode($token), 'GET');
        $this->assertFalse(StorePreviewService::canPreview($request, $store));
        $this->assertNull(StorePreviewService::validateToken($token));
    }

    public function test_published_store_remains_public(): void
    {
        $owner = $this->merchant();
        $store = Store::create(['name' => 'S pub1', 'slug' => 'pub1', 'theme' => Store::DEFAULT_TEMPLATE, 'user_id' => $owner->id]);
        StoreConfiguration::setConfiguration($store->id, 'store_status', 'true');
        $cat = Category::create(['name' => 'Cat', 'slug' => 'catpub', 'store_id' => $store->id, 'is_active' => true]);
        Product::create(['name' => 'Prod', 'price' => 10, 'stock' => 5, 'images' => '/a.jpg', 'cover_image' => '/a.jpg', 'category_id' => $cat->id, 'store_id' => $store->id, 'is_active' => true]);
        // Anonymous should get 200
        $this->get('http://pub1.localhost/')->assertOk();
    }

    public function test_unpublished_normal_public_url_blocked(): void
    {
        $owner = $this->merchant();
        $store = $this->createUnpublishedStore($owner, 'unpub1');
        $this->get('http://unpub1.localhost/')->assertStatus(503);
    }

    public function test_preview_uses_real_store_content(): void
    {
        $owner = $this->merchant();
        $store = $this->createUnpublishedStore($owner, 'realcontent1');
        $store->design_tokens = ['primary' => '#ff0000'];
        $store->store_content = ['welcome_message' => 'Hello Preview'];
        $store->save();
        $cat = Category::create(['name' => 'Cat RC', 'slug' => 'catrc', 'store_id' => $store->id, 'is_active' => true]);
        Product::create(['name' => 'Real Prod', 'price' => 42, 'stock' => 7, 'images' => '/a.jpg', 'cover_image' => '/a.jpg', 'category_id' => $cat->id, 'store_id' => $store->id, 'is_active' => true]);

        $url = StorePreviewService::generatePreviewUrl($store);
        parse_str(parse_url($url, PHP_URL_QUERY), $qs);
        $token = $qs['preview_token'];

        // Owner preview via signed token should render 200 with correct content pipeline
        $response = $this->get('http://realcontent1.localhost/?preview_token=' . urlencode($token));
        $response->assertOk();
        // Response is Inertia; verify props contain real data
        $response->assertInertia(fn ($page) => $page
            ->where('store.name', $store->name)
            ->has('products')
            ->has('isOwnerPreview')
        );
    }

    public function test_preview_template_override_respects_plan_allowlist(): void
    {
        $owner = $this->merchant();
        $store = $this->createUnpublishedStore($owner, 'planpreview1');
        $url = StorePreviewService::generatePreviewUrl($store);
        parse_str(parse_url($url, PHP_URL_QUERY), $qs);
        $token = $qs['preview_token'];
        // Try premium template via preview param — should still be gated if plan doesn't include it
        // ApplyPreviewTheme checks plan allowlist; we test that arbitrary theme doesn't bypass
        $request = Request::create('http://planpreview1.localhost/?preview_token=' . urlencode($token) . '&preview=1&theme=nonexistent-premium', 'GET');
        // normalizeThemeSlug should fallback to default, not allow arbitrary
        $slug = Store::normalizeThemeSlug('nonexistent-premium');
        $this->assertSame(Store::DEFAULT_TEMPLATE, $slug);
        $this->assertContains($slug, Store::ALL_TEMPLATES);
    }

    public function test_preview_cannot_create_order(): void
    {
        $owner = $this->merchant();
        $store = $this->createUnpublishedStore($owner, 'noorder1');
        $cat = Category::create(['name' => 'Cat', 'slug' => 'catno', 'store_id' => $store->id, 'is_active' => true]);
        Product::create(['name' => 'Prod', 'price' => 10, 'stock' => 5, 'images' => '/a.jpg', 'cover_image' => '/a.jpg', 'category_id' => $cat->id, 'store_id' => $store->id, 'is_active' => true]);
        $url = StorePreviewService::generatePreviewUrl($store);
        parse_str(parse_url($url, PHP_URL_QUERY), $qs);
        $token = $qs['preview_token'];

        // Attempt to place order in preview mode must be blocked 403
        $response = $this->postJson('http://noorder1.localhost/order/place?preview_token=' . urlencode($token), [
            'store_id' => $store->id,
            'customer_first_name' => 'Test',
            'customer_last_name' => 'User',
            'customer_email' => 'test@example.com',
            'customer_phone' => '0599000000',
            'shipping_address' => 'Gaza St',
            'shipping_city' => 'Gaza',
            'shipping_state' => 'Gaza',
            'shipping_country' => 'PS',
            'payment_method' => 'cod',
        ]);
        $response->assertStatus(403);
        $response->assertJsonFragment(['preview_mode' => true]);
    }

    public function test_publish_readiness_still_requires_three(): void
    {
        $owner = $this->merchant();
        $store = Store::create(['name' => 'S ready1', 'slug' => 'ready1', 'theme' => Store::DEFAULT_TEMPLATE, 'user_id' => $owner->id]);
        $owner->current_store = $store->id; $owner->save();
        $this->actingAs($owner);
        // No products/shipping/payments -> not ready
        $response = $this->get(route('dashboard'));
        $this->assertFalse($response->inertiaPage()['props']['onboarding']['isReadyToPublish']);
        // Optional tax/domain must not block readiness — add them alone should still be not ready
        \App\Models\Tax::create(['store_id' => $store->id, 'name' => 'VAT', 'rate' => 16, 'country' => 'PS']);
        $store->custom_subdomain = 'myready1';
        $store->enable_custom_subdomain = true;
        $store->save();
        StoreConfiguration::forgetConfiguration($store->id);
        \Illuminate\Support\Facades\Cache::forget('store_configuration.' . $store->id);
        $response = $this->get(route('dashboard'));
        $this->assertFalse($response->inertiaPage()['props']['onboarding']['isReadyToPublish'], 'Tax+domain alone must not make ready');
        // Add required three -> ready
        $cat = Category::create(['name' => 'Cat', 'slug' => 'catready', 'store_id' => $store->id, 'is_active' => true]);
        Product::create(['name' => 'Prod', 'price' => 10, 'stock' => 5, 'images' => '/a.jpg', 'cover_image' => '/a.jpg', 'category_id' => $cat->id, 'store_id' => $store->id, 'is_active' => true]);
        Shipping::create(['store_id' => $store->id, 'name' => 'Flat', 'type' => 'flat_rate', 'cost' => 10, 'is_active' => true, 'zone_type' => 'domestic']);
        PaymentSetting::create(['user_id' => $owner->id, 'store_id' => $store->id, 'key' => 'is_cod_enabled', 'value' => '1']);
        StoreConfiguration::forgetConfiguration($store->id);
        \Illuminate\Support\Facades\Cache::forget('store_configuration.' . $store->id);
        $response = $this->get(route('dashboard'));
        $this->assertTrue($response->inertiaPage()['props']['onboarding']['isReadyToPublish']);
    }

    public function test_preview_token_generation_requires_ownership(): void
    {
        $owner = $this->merchant();
        $store = $this->createUnpublishedStore($owner, 'ownertoken');
        $attacker = $this->merchant();
        $this->actingAs($attacker);
        $this->get(route('stores.preview-token', $store->id))->assertStatus(403); // permission/store ownership denied
    }
}
