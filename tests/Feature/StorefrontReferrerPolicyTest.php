<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Storefront pages must strip the Referer for cross-origin subresource loads
 * (reference product images hosted by third parties that block hotlinking),
 * while merchant/app pages keep the global config default.
 */
class StorefrontReferrerPolicyTest extends TestCase
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
            'name' => 'Referrer Policy Store',
        ], $storeAttrs));
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    public function test_storefront_homepage_uses_same_origin_referrer_policy(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/');

        $response->assertStatus(200);
        $response->assertHeader('Referrer-Policy', 'same-origin');
    }

    public function test_storefront_product_page_uses_same_origin_referrer_policy(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        Product::create([
            'name' => 'Referrer Product',
            'price' => 10,
            'stock' => 5,
            'track_inventory' => 1,
            'allow_backorder' => 0,
            'store_id' => $store->id,
            'category_id' => $cat->id,
            'images' => 'https://www.example.com/hotlink-protected.png',
            'is_active' => true,
            'seo_url_slug' => 'referrer-product',
        ]);

        $response = $this->get($this->storeUrl($store) . '/product/referrer-product');

        $response->assertStatus(200);
        $response->assertHeader('Referrer-Policy', 'same-origin');
    }

    public function test_storefront_response_exposes_reference_image_url_unchanged(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        Product::create([
            'name' => 'Referrer Product',
            'price' => 10,
            'stock' => 5,
            'track_inventory' => 1,
            'allow_backorder' => 0,
            'store_id' => $store->id,
            'category_id' => $cat->id,
            'images' => 'https://www.example.com/hotlink-protected.png',
            'is_active' => true,
            'seo_url_slug' => 'referrer-product',
        ]);

        $response = $this->get($this->storeUrl($store) . '/product/referrer-product');

        // The reference image URL must reach the storefront untouched (src stays
        // the remote host); referrer stripping happens at the browser level.
        $this->assertStringContainsString('https://www.example.com/hotlink-protected.png', $response->getContent());
    }

    public function test_merchant_app_pages_keep_global_referrer_policy(): void
    {
        $user = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'onboarded_at' => now()]);

        $response = $this->actingAs($user)->get('/dashboard');

        $this->assertSame('strict-origin-when-cross-origin', $response->headers->get('Referrer-Policy'));
    }
}