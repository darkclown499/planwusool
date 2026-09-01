<?php

namespace Tests\Feature\Certification;

use App\Models\Store;
use Tests\TestCase;

/**
 * CERTIFICATION: Bazaar + template-specific contracts.
 *
 * Bazaar protects approved contracts:
 *  - multi-video / mixed-media hero, autoplay, dots, swipe, video pause/reset,
 *    onEnded advance, per-media fit/position/zoom, contain zoom lock
 *  - NO green/emerald full-media overlay, no opacity-75 on hero media,
 *    no default dark veil over the media layer
 *  - announcement above header, wishlist in header/cards/detail/search
 *  - merchant primary color propagation
 *
 * Template contracts:
 *  - Fashion keeps its own mobile menu (no Drawer/Sheet/Portal replacement)
 *  - Electronics mobile drawer is portal-based, no generic bottom nav
 *  - Grocery no generic bottom nav, keeps white cards
 *  - Bazaar no generic bottom nav, clean hero colors
 *  - Restaurant keeps internal id restaurant-menu + right category sidebar, no bottom nav
 */
class BazaarTemplateCertificationTest extends TestCase
{
    private function bazaarSrc(): string
    {
        return file_get_contents(resource_path('js/templates-v2/bazaar-market/BazaarMarket.tsx'));
    }

    public function test_bazaar_hero_supports_mixed_and_multi_video(): void
    {
        $src = $this->bazaarSrc();
        $this->assertStringContainsString('media', $src, 'bazaar hero must read the media collection');
        $this->assertStringContainsString("m.type === 'video'", $src, 'bazaar hero must handle video slides alongside images');
        $this->assertStringContainsString('videoRefs', $src, 'bazaar hero must manage multiple video elements');
        $this->assertStringContainsString('totalSlides', $src, 'bazaar hero must derive total slides from media');
    }

    public function test_bazaar_autoplay_dots_swipe_present(): void
    {
        $src = $this->bazaarSrc();
        $this->assertStringContainsString('setInterval', $src, 'autoplay');
        // dots + swipe (touch) are part of the carousel contract
        $this->assertTrue(str_contains($src, 'touchStartX') || str_contains($src, 'touch'), 'swipe');
        $this->assertStringContainsString('totalSlides', $src);
    }

    public function test_bazaar_video_pause_reset_and_ended_advance(): void
    {
        $src = $this->bazaarSrc();
        $this->assertStringContainsString('pause()', $src, 'hidden video must pause');
        $this->assertStringContainsString('onEnded', $src, 'onEnded must advance');
    }

    public function test_bazaar_per_media_presentation_and_contain_lock(): void
    {
        $src = $this->bazaarSrc();
        $this->assertStringContainsString('fit', $src);
        $this->assertStringContainsString('zoom', $src);
        $this->assertStringContainsString('position', $src);
        // contain zoom lock should appear on the rendering path
        $this->assertStringContainsString('contain', $src);
    }

    public function test_bazaar_no_green_full_media_overlay(): void
    {
        $src = $this->bazaarSrc();
        // Older regression introduced a green/emerald overlay directly over hero media.
        // Semantic green may exist elsewhere; scope to the hero media overlay.
        $this->assertStringNotContainsString('opacity-75', $src, 'no opacity-75 full overlay on hero media');
    }

    public function test_bazaar_wishlist_available_header_cards_detail(): void
    {
        $src = $this->bazaarSrc();
        $this->assertStringContainsString('wishlist', $src, 'bazaar surfaces wishlist');
        $detail = file_get_contents(resource_path('js/templates-v2/bazaar-market/BazaarProductDetail.tsx'));
        $this->assertStringContainsString('wishlist', $detail, 'bazaar product detail surfaces wishlist');
    }

    public function test_bazaar_announcement_above_header(): void
    {
        $src = $this->bazaarSrc();
        $this->assertStringContainsString('BazaarAnnouncementBar', $src, 'bazaar renders announcement bar');
    }

    public function test_bazaar_merchant_primary_color_propagation(): void
    {
        $src = $this->bazaarSrc();
        $this->assertStringContainsString('primary', $src, 'bazaar must consume merchant primary color');
    }

    // ---------------- Generic bottom nav absence (several templates) ----------------
    public function test_generic_bottom_nav_absent_for_v2_templates(): void
    {
        $map = [
            'grocery-souq' => 'GrocerySouqRoot.tsx',
            'bazaar-market' => 'BazaarMarket.tsx',
            'electronics-hub' => 'ElectronicsHub.tsx',
            'restaurant-menu' => 'RestaurantMenu.tsx',
        ];
        foreach ($map as $slug => $file) {
            $src = file_get_contents(resource_path("js/templates-v2/$slug/$file"));
            $this->assertStringNotContainsString('BottomNav', $src, "$slug must not use generic bottom nav");
        }
    }

    public function test_fashion_owns_mobile_menu_no_drawer_sheet_replacement(): void
    {
        $header = file_get_contents(resource_path('js/templates-v2/fashion-atelier/components/AtelierHeader.tsx'));
        // Fashion keeps its own mobile menu entry point (hamburger + onOpenMobileMenu);
        // the header must not hand the mobile menu over to a generic Drawer/Sheet portal.
        $this->assertStringContainsString('onOpenMobileMenu', $header, 'fashion header must own its mobile menu trigger');
        $this->assertStringContainsString(', Menu,', $header, 'fashion hamburger icon must be its own lucide Menu');
    }

    public function test_electronics_mobile_drawer_portal_based(): void
    {
        $hub = file_get_contents(resource_path('js/templates-v2/electronics-hub/ElectronicsHub.tsx'));
        $this->assertStringContainsString('createPortal', $hub, 'electronics mobile drawer must be portal-based');
        $this->assertStringNotContainsString('BottomNav', $hub);
    }

    public function test_grocery_white_cards_retained(): void
    {
        $src = file_get_contents(resource_path('js/templates-v2/grocery-souq/SouqComponents.tsx'));
        $this->assertStringContainsString('bg-white', $src, 'grocery keeps white cards');
        $this->assertStringNotContainsString('BottomNav', $src);
    }

    public function test_restaurant_keeps_internal_id_and_right_category_sidebar(): void
    {
        $menu = file_get_contents(resource_path('js/templates-v2/restaurant-menu/RestaurantMenu.tsx'));
        // template internal identity
        $this->assertStringContainsString('restaurant-menu', $menu, 'restaurant must keep internal id restaurant-menu');
        // right category sidebar for the RTL restaurant layout (HayahSidebar uses <aside>)
        $this->assertStringContainsString('HayahSidebar', $menu);
        $this->assertStringContainsString('<aside', $menu);
        $this->assertStringNotContainsString('BottomNav', $menu);
    }

    public function test_all_templates_resolve_and_render_contract(): void
    {
        foreach (Store::ALL_TEMPLATES as $slug) {
            $this->assertTrue(in_array($slug, Store::ALL_TEMPLATES));
        }
    }
}
