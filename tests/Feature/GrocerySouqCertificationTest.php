<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GrocerySouqCertificationTest extends TestCase
{
    use RefreshDatabase;

    private function souqHeaderSrc(): string { return file_get_contents(resource_path('js/templates-v2/grocery-souq/SouqComponents.tsx')); }
    private function souqRootSrc(): string { return file_get_contents(resource_path('js/templates-v2/grocery-souq/GrocerySouqRoot.tsx')); }
    private function souqOverlaysSrc(): string { return file_get_contents(resource_path('js/templates-v2/grocery-souq/SouqOverlays.tsx')); }

    public function test_mobile_header_exists(): void
    {
        $src = $this->souqHeaderSrc();
        $this->assertStringNotContainsString('className="hidden md:block sticky', $src, 'mobile header must not be hidden md:block sticky (blocker)');
        $this->assertStringContainsString('md:hidden', $src, 'mobile header 375/390 must exist');
        $this->assertStringContainsString('sticky top-0', $src);
        $this->assertStringContainsString("env(safe-area-inset-top)", $src);
    }

    public function test_mobile_search_available(): void
    {
        $src = $this->souqHeaderSrc();
        $this->assertStringContainsString('ابحث في المتجر', $src);
        // mobile second row search + desktop search both present
        $this->assertGreaterThanOrEqual(2, substr_count($src, 'placeholder="ابحث'), 'both mobile and desktop search must exist');
    }

    public function test_shared_server_search_used(): void
    {
        $overlay = $this->souqOverlaysSrc();
        $this->assertStringContainsString('SearchSheet', $overlay, 'SouqOverlays must delegate to shared SearchSheet');
        $searchSheet = file_get_contents(resource_path('js/templates-v2/shared/SearchSheet.tsx'));
        $this->assertStringContainsString('useServerSearch', $searchSheet, 'SearchSheet must use useServerSearch hook');
        $hook = file_get_contents(resource_path('js/hooks/useServerSearch.ts'));
        $this->assertStringContainsString('api/storefront/search', $hook, 'useServerSearch must call canonical storefront search endpoint');
        $this->assertStringContainsString('store_id', $hook, 'useServerSearch must enforce store scope');
        $this->assertStringNotContainsString("String(p.name || '').toLowerCase().includes", $overlay, 'must not use client-only filter');
        $this->assertStringNotContainsString("String(p.name || '').toLowerCase().includes", $this->souqHeaderSrc(), 'must not use client-only filter');
    }

    public function test_category_visible_limit_behavior(): void
    {
        $src = $this->souqRootSrc();
        $this->assertStringContainsString('CATS_INITIAL', $src);
        $this->assertStringContainsString('عرض جميع الأقسام', $src);
        $this->assertStringContainsString('catsExpanded', $src);
        $this->assertStringContainsString('scrollbar-none', $src, 'mobile horizontal scroll');
    }

    public function test_no_emoji_fake_image_fallback(): void
    {
        $src = $this->souqRootSrc() . $this->souqHeaderSrc();
        $this->assertStringNotContainsString('🥬', $src);
        $this->assertStringNotContainsString('🥦', $src);
        $this->assertStringContainsString('from-stone-100 to-stone-200', $src, 'neutral gradient fallback required');
        $this->assertStringContainsString("slice(0,2)", $src);
    }

    public function test_no_nested_button(): void
    {
        $src = $this->souqHeaderSrc();
        // Product card must not have button nested inside button
        $card = substr($src, strpos($src, 'export function SouqProductCard'));
        // Check the valid structure: div wrapper contains sibling buttons, not nested
        $this->assertStringContainsString('relative aspect-square', $card);
        // Ensure wishlist button is sibling not inside product click button (check for two sibling buttons pattern)
        $this->assertStringNotContainsString('<button type="button" onClick={() => productCtx.handleProductClick(product)} className="relative aspect-square', $card, 'old nested pattern must be gone');
        $this->assertStringContainsString('<div className="relative aspect-square', $card);
    }

    public function test_designer_accent_propagation(): void
    {
        $src = $this->souqHeaderSrc();
        $this->assertStringContainsString('accent_color', $src);
        $this->assertStringContainsString('--souq-accent', $src);
        $this->assertStringContainsString('header_bg', $src);
        $this->assertStringContainsString('--souq-header-bg', $src);
    }

    public function test_no_hardcoded_whatsapp(): void
    {
        $src = $this->souqHeaderSrc();
        $this->assertStringNotContainsString('970599000000', $src);
        $this->assertStringContainsString('waPhoneRaw', $src);
        $this->assertStringContainsString('config?.socialMedia?.whatsapp', $src);
    }

    public function test_truthful_homepage_section_logic(): void
    {
        $src = $this->souqRootSrc();
        $this->assertStringNotContainsString('وصل طازج اليوم', $src, 'synthetic claim must be removed');
        $this->assertStringNotContainsString('أساسيات المؤونة', $src);
        $this->assertStringContainsString('وصل حديثاً', $src);
        $this->assertStringContainsString('منتجات مختارة', $src);
        $this->assertStringContainsString('slice(0, 14)', $src, 'latest must use real latest slice(0,14)');
    }

    public function test_product_grid_contract(): void
    {
        $src = $this->souqRootSrc();
        $this->assertStringContainsString('auto-rows-fr', $src);
        $this->assertStringContainsString('items-stretch', $src);
        $card = $this->souqHeaderSrc();
        $this->assertStringContainsString('h-full', $card);
        $this->assertStringContainsString('flex-col', $card);
        // sparse handling
        $this->assertStringContainsString('sparse', $src);
    }

    public function test_hero_settings_propagation(): void
    {
        $src = $this->souqHeaderSrc(); // SouqComponents contains SouqHero
        $this->assertStringContainsString('hero.fit', $src);
        $this->assertStringContainsString('hero.position', $src);
        $this->assertStringContainsString('hero.heightDesktop', $src);
        $this->assertStringContainsString('hero.heightMobile', $src);
        $this->assertStringContainsString('177.77777778vh', $src);
    }

    public function test_loyalty_off_propagation(): void
    {
        $src = $this->souqHeaderSrc();
        $this->assertStringContainsString('getLoyaltySettingsFromPage', $src);
        $this->assertStringContainsString('is_enabled', $src);
        $this->assertStringContainsString('calcEarnedPoints', $src);
    }

    public function test_cart_quantity_stepper(): void
    {
        $src = $this->souqHeaderSrc();
        $this->assertStringContainsString('cartIndex', $src);
        $this->assertStringContainsString('cart.updateQuantity', $src);
        $this->assertStringContainsString('inCart', $src);
    }
}
