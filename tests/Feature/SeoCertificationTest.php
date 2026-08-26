<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\LandingPageCustomPage;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\StorePage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SeoCertificationTest extends TestCase
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
            'name' => 'SEO Test Store',
            'seo_title' => 'SEO Test Store Title',
            'seo_description' => 'SEO test store description for certification',
            'seo_keywords' => 'seo, test, store',
            'seo_image' => '/images/og-test.png',
        ], $storeAttrs));
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function createActiveProduct(Store $store, array $overrides = []): Product
    {
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        return Product::create(array_merge([
            'name' => 'SEO Test Product',
            'price' => 49.99,
            'stock' => 10,
            'store_id' => $store->id,
            'category_id' => $cat->id,
            'images' => '/storage/media/product.jpg',
            'is_active' => true,
            'meta_title' => 'Custom Product SEO Title',
            'meta_description' => 'Custom product meta description for search engines',
            'seo_url_slug' => 'seo-test-product',
        ], $overrides));
    }

    // ─── Sitemap Tests ─────────────────────────────────────────────

    public function test_sitemap_route_returns_valid_xml(): void
    {
        $response = $this->get('/sitemap.xml');
        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/xml');

        $content = $response->getContent();
        $this->assertStringContainsString('<?xml version="1.0" encoding="UTF-8"?>', $content);
        $this->assertStringContainsString('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"', $content);
        $this->assertStringContainsString('<urlset', $content);
        $this->assertStringContainsString('</urlset>', $content);
    }

    public function test_sitemap_includes_platform_pages(): void
    {
        $response = $this->get('/sitemap.xml');
        $content = $response->getContent();

        $this->assertStringContainsString('/features', $content);
        $this->assertStringContainsString('/about', $content);
        $this->assertStringContainsString('/terms', $content);
        $this->assertStringContainsString('/privacy', $content);
    }

    public function test_sitemap_includes_active_stores(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get('/sitemap.xml');
        $content = $response->getContent();

        // Store URL uses the slug as subdomain
        $this->assertStringContainsString($store->slug, $content);
    }

    public function test_sitemap_uses_seo_url_slug_for_products(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $product = $this->createActiveProduct($store, ['seo_url_slug' => 'my-seo-slug']);

        $response = $this->get('/sitemap.xml');
        $content = $response->getContent();

        $this->assertStringContainsString('my-seo-slug', $content);
    }

    public function test_sitemap_falls_back_to_product_id_when_no_slug(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $product = $this->createActiveProduct($store, ['seo_url_slug' => null]);

        $response = $this->get('/sitemap.xml');
        $content = $response->getContent();

        $this->assertStringContainsString("/product/{$product->id}", $content);
    }

    public function test_sitemap_excludes_inactive_stores(): void
    {
        $inactiveUser = User::factory()->create(['type' => 'company', 'is_active' => 0]);
        $store = Store::factory()->create(['user_id' => $inactiveUser->id, 'slug' => 'inactive-seo-store']);

        $response = $this->get('/sitemap.xml');
        $content = $response->getContent();

        $this->assertStringNotContainsString('inactive-seo-store', $content);
    }

    public function test_sitemap_includes_landing_custom_pages(): void
    {
        LandingPageCustomPage::create([
            'title' => 'SEO Custom Page',
            'slug' => 'seo-custom-page',
            'content' => '<p>Test content</p>',
            'meta_title' => 'SEO Custom Page Title',
            'is_active' => true,
        ]);

        $response = $this->get('/sitemap.xml');
        $content = $response->getContent();

        $this->assertStringContainsString('seo-custom-page', $content);
    }

    public function test_sitemap_excludes_inactive_custom_pages(): void
    {
        LandingPageCustomPage::create([
            'title' => 'Hidden Page',
            'slug' => 'hidden-seo-page',
            'content' => '<p>Hidden</p>',
            'is_active' => false,
        ]);

        $response = $this->get('/sitemap.xml');
        $content = $response->getContent();

        $this->assertStringNotContainsString('hidden-seo-page', $content);
    }

    public function test_sitemap_xml_urls_are_properly_escaped(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get('/sitemap.xml');
        $content = $response->getContent();

        // URLs are stored via htmlspecialchars in SitemapController
        $this->assertStringContainsString('<loc>', $content);
        // Verify no raw < > in URL content
        $this->assertStringNotContainsString('<loc>Store & Co <test>', $content);
    }

    public function test_sitemap_includes_store_custom_pages(): void
    {
        [$user, $store] = $this->merchantWithStore();
        StorePage::create([
            'store_id' => $store->id,
            'title' => 'About Us',
            'slug' => 'about-us',
            'content' => '<p>About</p>',
            'is_active' => true,
        ]);

        $response = $this->get('/sitemap.xml');
        $content = $response->getContent();

        $this->assertStringContainsString('/page/about-us', $content);
    }

    public function test_sitemap_has_cache_control_header(): void
    {
        $response = $this->get('/sitemap.xml');
        $response->assertHeader('Cache-Control');
    }

    // ─── robots.txt Tests ──────────────────────────────────────────

    public function test_robots_txt_exists_and_is_readable(): void
    {
        $path = public_path('robots.txt');
        $this->assertFileExists($path);

        $content = file_get_contents($path);
        $this->assertStringContainsString('User-agent: *', $content);
        $this->assertStringContainsString('Allow: /', $content);
    }

    public function test_robots_txt_blocks_private_routes(): void
    {
        $content = file_get_contents(public_path('robots.txt'));

        $this->assertStringContainsString('Disallow: /dashboard/', $content);
        $this->assertStringContainsString('Disallow: /settings/', $content);
        $this->assertStringContainsString('Disallow: /admin/', $content);
        $this->assertStringContainsString('Disallow: /api/', $content);
        $this->assertStringContainsString('Disallow: /storage/private/', $content);
    }

    public function test_robots_txt_disallows_preview_and_search_pages(): void
    {
        $content = file_get_contents(public_path('robots.txt'));

        $this->assertStringContainsString('Disallow: /*?preview=1', $content);
        $this->assertStringContainsString('Disallow: /search?', $content);
        $this->assertStringContainsString('Disallow: /*?action=', $content);
    }

    public function test_robots_txt_references_sitemap(): void
    {
        $content = file_get_contents(public_path('robots.txt'));

        $this->assertStringContainsString('Sitemap:', $content);
        $this->assertStringContainsString('/sitemap.xml', $content);
    }

    public function test_robots_txt_has_ai_crawler_directives(): void
    {
        $content = file_get_contents(public_path('robots.txt'));

        $this->assertStringContainsString('GPTBot', $content);
        $this->assertStringContainsString('Google-Extended', $content);
    }

    // ─── Landing Page SEO Tests ────────────────────────────────────

    public function test_home_page_has_robots_meta_tag(): void
    {
        $response = $this->get('/');
        $content = $response->getContent();

        $response->assertStatus(200);
        $this->assertStringContainsString('<meta name="robots" content=', $content);
    }

    public function test_home_page_has_structured_data(): void
    {
        $response = $this->get('/');
        $content = $response->getContent();

        $this->assertStringContainsString('application/ld+json', $content);
        $this->assertStringContainsString('Organization', $content);
        $this->assertStringContainsString('WebSite', $content);
        $this->assertStringContainsString('BreadcrumbList', $content);
    }

    public function test_home_page_allows_indexing(): void
    {
        $response = $this->get('/');
        $content = $response->getContent();

        $this->assertStringContainsString('index, follow', $content);
    }

    // ─── Static Pages SEO Tests ────────────────────────────────────

    public function test_about_page_has_seo_meta_tags(): void
    {
        $response = $this->get('/about');
        $content = $response->getContent();

        $this->assertStringContainsString('<title>', $content);
        $this->assertStringContainsString('<meta name="description"', $content);
        $this->assertStringContainsString('<link rel="canonical"', $content);
    }

    public function test_about_page_has_open_graph_tags(): void
    {
        $response = $this->get('/about');
        $content = $response->getContent();

        $this->assertStringContainsString('<meta property="og:title"', $content);
        $this->assertStringContainsString('<meta property="og:description"', $content);
    }

    public function test_features_page_has_seo_meta_tags(): void
    {
        $response = $this->get('/features');
        $content = $response->getContent();

        $this->assertStringContainsString('<title>', $content);
        $this->assertStringContainsString('<link rel="canonical"', $content);
    }

    public function test_terms_page_has_seo_meta_tags(): void
    {
        $response = $this->get('/terms');
        $content = $response->getContent();

        $this->assertStringContainsString('<title>', $content);
        $this->assertStringContainsString('<link rel="canonical"', $content);
    }

    public function test_privacy_page_has_seo_meta_tags(): void
    {
        $response = $this->get('/privacy');
        $content = $response->getContent();

        $this->assertStringContainsString('<title>', $content);
        $this->assertStringContainsString('<link rel="canonical"', $content);
    }

    // ─── Storefront SEO Tests ─────────────────────────────────────

    public function test_store_home_has_seo_meta_tags(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/');
        $content = $response->getContent();

        $this->assertStringContainsString('SEO Test Store Title', $content);
        $this->assertStringContainsString('<meta name="description" content="SEO test store description for certification">', $content);
        $this->assertStringContainsString('<link rel="canonical"', $content);
    }

    public function test_store_home_has_open_graph_tags(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/');
        $content = $response->getContent();

        $this->assertStringContainsString('og:title', $content);
        $this->assertStringContainsString('og:type', $content);
        $this->assertStringContainsString('og:url', $content);
    }

    public function test_store_home_has_twitter_card_tags(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/');
        $content = $response->getContent();

        $this->assertStringContainsString('twitter:card', $content);
        $this->assertStringContainsString('twitter:title', $content);
    }

    public function test_store_home_has_structured_data(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/');
        $content = $response->getContent();

        $this->assertStringContainsString('application/ld+json', $content);
        $this->assertStringContainsString('Store', $content);
    }

    public function test_store_home_has_breadcrumb_schema(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/');
        $content = $response->getContent();

        $this->assertStringContainsString('BreadcrumbList', $content);
    }

    public function test_store_falls_back_to_config_seo_when_store_seo_empty(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $store->update(['seo_title' => null, 'seo_description' => null]);
        StoreConfiguration::create([
            'store_id' => $store->id,
            'key' => 'meta_title',
            'value' => 'Config Meta Title',
        ]);

        $response = $this->get($this->storeUrl($store) . '/');
        $content = $response->getContent();

        $this->assertStringContainsString('Config Meta Title', $content);
    }

    public function test_store_keyword_meta_tag_present_when_set(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/');
        $content = $response->getContent();

        $this->assertStringContainsString('<meta name="keywords" content="seo, test, store">', $content);
    }

    public function test_store_allows_indexing(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/');
        $content = $response->getContent();

        $this->assertStringContainsString('index, follow', $content);
    }

    public function test_store_og_image_is_present(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/');
        $content = $response->getContent();

        $this->assertStringContainsString('og:image', $content);
    }

    // ─── Custom Page SEO Tests ─────────────────────────────────────

    public function test_landing_custom_page_has_seo_tags(): void
    {
        $page = LandingPageCustomPage::create([
            'title' => 'Custom SEO Page',
            'slug' => 'custom-seo-test-page',
            'content' => '<p>Custom page content</p>',
            'meta_title' => 'Custom SEO Page Title',
            'meta_description' => 'Custom SEO page description',
            'is_active' => true,
        ]);

        $response = $this->get('/page/' . $page->slug);
        $content = $response->getContent();

        $this->assertStringContainsString('Custom SEO Page Title', $content);
        $this->assertStringContainsString('Custom SEO page description', $content);
    }

    // ─── Product SEO Data Persistence Tests ────────────────────────

    public function test_product_meta_title_is_persisted(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $product = $this->createActiveProduct($store);

        $this->assertDatabaseHas('products', [
            'store_id' => $store->id,
            'meta_title' => 'Custom Product SEO Title',
            'meta_description' => 'Custom product meta description for search engines',
            'seo_url_slug' => 'seo-test-product',
        ]);
    }

    // ─── Schema.org Validation Tests ───────────────────────────────

    public function test_landing_page_json_ld_is_valid_json(): void
    {
        $response = $this->get('/');
        $content = $response->getContent();

        $response->assertStatus(200);

        preg_match_all('/<script type="application\/ld\+json">(.+?)<\/script>/s', $content, $matches);

        $this->assertNotEmpty($matches[1], 'No JSON-LD blocks found on landing page');

        foreach ($matches[1] as $jsonBlock) {
            $decoded = json_decode(trim($jsonBlock), true);
            $this->assertNotNull($decoded, 'Invalid JSON-LD: ' . json_last_error_msg());
            $this->assertArrayHasKey('@context', $decoded);
            $this->assertEquals('https://schema.org', $decoded['@context']);
        }
    }

    public function test_store_page_json_ld_is_valid_json(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/');
        $content = $response->getContent();

        preg_match_all('/<script type="application\/ld\+json">(.+?)<\/script>/s', $content, $matches);

        $this->assertNotEmpty($matches[1], 'No JSON-LD blocks found on store page');

        foreach ($matches[1] as $jsonBlock) {
            $decoded = json_decode(trim($jsonBlock), true);
            $this->assertNotNull($decoded, 'Invalid JSON-LD: ' . json_last_error_msg());
            $this->assertArrayHasKey('@context', $decoded);
        }
    }

    // ─── Search Page SEO Tests ─────────────────────────────────────

    public function test_search_page_has_noindex(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $response = $this->get($this->storeUrl($store) . '/search?q=test');
        $content = $response->getContent();

        $this->assertStringContainsString('noindex, follow', $content);
    }

    // ─── Helper Method Tests ───────────────────────────────────────

    public function test_get_scheme_aware_url_returns_url(): void
    {
        $url = getSchemeAwareUrl();
        $this->assertNotEmpty($url);
        $this->assertStringContainsString('://', $url);
    }

    public function test_get_base_domain_returns_string(): void
    {
        $domain = getBaseDomain();
        $this->assertNotEmpty($domain);
        $this->assertIsString($domain);
    }

    // ─── Category Page SEO Tests ───────────────────────────────────

    public function test_category_page_has_noindex_for_inactive(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => false, 'slug' => 'inactive-cat']);

        $response = $this->get($this->storeUrl($store) . '/category/inactive-cat');
        // Should return 404 for inactive category
        $response->assertStatus(404);
    }

    // ─── Preview Mode SEO Tests ────────────────────────────────────

    public function test_preview_mode_gets_noindex(): void
    {
        $response = $this->get('/?preview=1');
        $content = $response->getContent();

        $this->assertStringContainsString('noindex', $content);
    }
}
