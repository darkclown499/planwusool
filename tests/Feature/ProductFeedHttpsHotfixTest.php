<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\StoreDomain;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Production hotfix: align product feed URLs (Google Merchant XML + CSV) with
 * the canonical HTTPS-aware storefront/SEO URL semantics.
 *
 * The storefront SEO (StorefrontSeoService::schemeFor) already upgrades the
 * scheme to https whenever APP_URL is https, even behind a TLS proxy that
 * delivers plain-http to the backend. The feed g:link / image links previously
 * used Store::getProtocol() which read $request->isSecure() directly and leaked
 * http:// in production. These tests pin the feed to the same canonical source
 * of truth without hardcoding any domain and without forcing https in a local
 * http environment.
 */
class ProductFeedHttpsHotfixTest extends TestCase
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
            'name' => 'Https Hotfix Store',
        ], $storeAttrs));
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function createActiveProduct(Store $store, array $overrides = []): Product
    {
        return Product::create(array_merge([
            'name' => 'Hotfix Product',
            'price' => 9.99,
            'stock' => 5,
            'track_inventory' => 1,
            'allow_backorder' => 0,
            'store_id' => $store->id,
            'images' => '/storage/media/hotfix.jpg',
            'is_active' => true,
            'seo_url_slug' => 'hotfix-product',
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

    // ─── 1. HTTPS Wusool subdomain: g:link uses https ───────────────────────

    public function test_g_link_uses_https_when_app_url_is_https(): void
    {
        config(['app.url' => 'https://wusool.ps']);

        [$user, $store] = $this->merchantWithStore();
        $this->createActiveProduct($store, ['seo_url_slug' => 'https-slug']);

        $body = $this->fetchGoogleFeed($store)->streamedContent();

        $httpsBase = 'https://' . $store->slug . '.' . config('app.store_domain');
        $this->assertStringContainsString("<g:link>{$httpsBase}/product/https-slug</g:link>", $body);
        $this->assertStringNotContainsString('http://' . $store->slug, $body);
    }

    // ─── 2. SEO/feed consistency: g:link == canonical SEO product URL ───────

    public function test_g_link_matches_https_canonical_seo_product_url(): void
    {
        config(['app.url' => 'https://wusool.ps']);

        [$user, $store] = $this->merchantWithStore();
        $product = $this->createActiveProduct($store, ['seo_url_slug' => 'consistent-slug']);

        // The storefront canonical for a product over an HTTPS request.
        $canonical = 'https://' . $store->slug . '.' . config('app.store_domain')
            . '/product/' . $product->seo_url_slug;

        $body = $this->fetchGoogleFeed($store)->streamedContent();
        $this->assertStringContainsString("<g:link>{$canonical}</g:link>", $body);
    }

    // ─── 3. Arabic product slug remains correct ─────────────────────────────

    public function test_arabic_slug_remains_correct_with_https(): void
    {
        config(['app.url' => 'https://wusool.ps']);

        [$user, $store] = $this->merchantWithStore();
        $product = $this->createActiveProduct($store, ['seo_url_slug' => 'منتج-تجريبي']);

        $httpsBase = 'https://' . $store->slug . '.' . config('app.store_domain');
        $body = $this->fetchGoogleFeed($store)->streamedContent();
        $this->assertStringContainsString(
            "<g:link>{$httpsBase}/product/" . $product->seo_url_slug . "</g:link>",
            $body
        );
    }

    // ─── 4. Verified custom domain: correct HTTPS host ───────────────────────

    public function test_verified_custom_domain_uses_https_host(): void
    {
        config(['app.url' => 'https://wusool.ps']);

        [$user, $store] = $this->merchantWithStore();
        StoreDomain::create([
            'store_id' => $store->id,
            'domain_name' => 'shop.example.test',
            'is_verified' => true,
            'is_primary' => true,
        ]);
        $this->createActiveProduct($store, ['seo_url_slug' => 'cd-https']);

        $body = $this->fetchGoogleFeed($store)->streamedContent();
        $this->assertStringContainsString(
            '<g:link>https://shop.example.test/product/cd-https</g:link>',
            $body
        );
        $this->assertStringNotContainsString('http://shop.example.test', $body);
    }

    // ─── 5. g:image_link: HTTPS when public storefront is HTTPS ─────────────

    public function test_image_links_use_https_when_app_url_is_https(): void
    {
        config(['app.url' => 'https://wusool.ps']);

        [$user, $store] = $this->merchantWithStore();
        $this->createActiveProduct($store, [
            'images' => '/storage/media/primary.jpg,/storage/media/extra.jpg',
            'seo_url_slug' => 'img-https',
        ]);

        $body = $this->fetchGoogleFeed($store)->streamedContent();

        $httpsBase = 'https://' . $store->slug . '.' . config('app.store_domain');
        $this->assertStringContainsString(
            "<g:image_link>{$httpsBase}/storage/media/primary.jpg</g:image_link>",
            $body
        );
        $this->assertStringContainsString(
            "<g:additional_image_link>{$httpsBase}/storage/media/extra.jpg</g:additional_image_link>",
            $body
        );
        $this->assertStringNotContainsString("http://{$store->slug}.", $body);
    }

    // ─── 6. CSV link/image fields use the same HTTPS generation path ────────

    public function test_csv_link_and_image_use_https_when_app_url_is_https(): void
    {
        config(['app.url' => 'https://wusool.ps']);

        [$user, $store] = $this->merchantWithStore();
        $product = $this->createActiveProduct($store, [
            'images' => '/storage/media/csv.jpg',
            'seo_url_slug' => 'csv-https',
        ]);

        $body = $this->fetchCsvFeed($store)->streamedContent();

        $httpsBase = 'https://' . $store->slug . '.' . config('app.store_domain');
        $this->assertStringContainsString("{$httpsBase}/product/csv-https", $body);
        $this->assertStringContainsString("{$httpsBase}/storage/media/csv.jpg", $body);
        $this->assertStringNotContainsString("http://{$store->slug}.", $body);
    }

    // ─── 7. Local HTTP test environment is NOT forced to https ──────────────

    public function test_local_http_environment_keeps_http_links(): void
    {
        // APP_URL defaults to http in the local/test environment (no config
        // override here). The feed must NOT blindly upgrade to https.
        [$user, $store] = $this->merchantWithStore();
        $this->createActiveProduct($store, ['seo_url_slug' => 'local-http']);

        $body = $this->fetchGoogleFeed($store)->streamedContent();

        $this->assertStringContainsString(
            "http://{$store->slug}." . config('app.store_domain') . '/product/local-http',
            $body
        );
        $this->assertStringNotContainsString('https://' . $store->slug, $body);
    }
}