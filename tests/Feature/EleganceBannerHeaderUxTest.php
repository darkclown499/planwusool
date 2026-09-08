<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * ELEGANCE (fashion-atelier) banner + mobile header UX contracts.
 *
 * Covers the "Elegance banner readability / CTA / mobile announcement bar"
 * ticket surface:
 *  1. Banner text readability — editorial scrim behind the text zone only,
 *     pointer-safe, never a full opaque veil (the merchant overlay stays the
 *     only full-media darkener).
 *  2. Canonical banner CTA — one shared identity token used by the hero and
 *     the cover-flow (multi) banner.
 *  3. Announcement bar placement — above the header in every mode, never
 *     inside <main> on mobile (root cause of the scroll glitch).
 */
class EleganceBannerHeaderUxTest extends TestCase
{
    private function atelierHero(): string
    {
        return file_get_contents(resource_path('js/templates-v2/fashion-atelier/components/AtelierHero.tsx'));
    }

    private function coverFlow(): string
    {
        return file_get_contents(resource_path('js/templates-v2/shared/CoverFlow.tsx'));
    }

    private function atelierRoot(): string
    {
        return file_get_contents(resource_path('js/templates-v2/fashion-atelier/FashionAtelierRoot.tsx'));
    }

    public function test_announcement_bar_sits_above_header_in_all_modes(): void
    {
        $src = $this->atelierRoot();
        $posAnn = strpos($src, '<AnnouncementBar');
        $posHeader = strpos($src, '<AtelierHeader');
        $posMain = strpos($src, '{normalMain}');

        $this->assertNotFalse($posAnn, 'announcement must be mounted');
        $this->assertNotFalse($posHeader, 'header must be mounted');
        $this->assertNotFalse($posMain, 'home main region must be mounted');
        $this->assertLessThan($posHeader, $posAnn, 'announcement must be ABOVE header');
        $this->assertLessThan($posMain, $posHeader, 'header must mount ABOVE home main region (header is a top-level sibling, never inside main)');
        // Home mobile previously rendered a second bar inside <main> below the
        // sticky header — that in-main instance is the scroll bug and must be gone.
        $this->assertStringNotContainsString('md:hidden"><AnnouncementBar', $src);
        // The bar must also not be gated to desktop only — it must render on all
        // breakpoints, above the sticky header.
        $this->assertStringNotContainsString('hidden md:block"><AnnouncementBar', $src);
        // Exactly one per surface: home + category + page, no in-main duplicate.
        $this->assertSame(3, substr_count($src, '<AnnouncementBar'), 'one bar per surface (home/category/page), no in-main duplicate');
    }

    public function test_mobile_top_stack_keeps_announcement_above_header(): void
    {
        $src = $this->atelierRoot();
        // Every surface wraps bar + header in ONE structural stack that is
        // sticky on mobile (390/430) and display: contents on desktop (md+),
        // so on desktop the wrapper box disappears, the bar may scroll away,
        // and the header's containing block becomes the full-page container
        // (desktop header stickiness is intentionally preserved).
        $this->assertSame(3, substr_count($src, 'atelier-top-stack'), 'one top-stack wrapper per surface (home/category/page)');
        $this->assertSame(3, substr_count($src, 'sticky top-0 z-40 md:contents'), 'stack is sticky on mobile only, display: contents on desktop');

        // Wrapper must open before the first bar so both stay glued together
        // as one stable stack (no gap, no overlap, no magic top offset).
        $posWrap = strpos($src, 'atelier-top-stack');
        $posAnn = strpos($src, '<AnnouncementBar');
        $this->assertNotFalse($posWrap, 'top-stack wrapper must exist');
        $this->assertNotFalse($posAnn, 'announcement must be mounted');
        $this->assertLessThan($posAnn, $posWrap, 'stack wrapper must open BEFORE the announcement bar');

        // The header itself must NOT own the mobile stickiness (a sticky header
        // inside the stuck stack would slide up and overlap the bar): header
        // stickiness is a desktop-only concern.
        $header = file_get_contents(resource_path('js/templates-v2/fashion-atelier/components/AtelierHeader.tsx'));
        $this->assertStringNotContainsString('className={`sticky top-0 z-40', $header, 'header must not be sticky-first on mobile inside the stack');
        $this->assertStringContainsString('md:sticky md:top-0', $header, 'header stickiness moves to a desktop-only concern (md+)');
    }

    public function test_banner_scrim_is_pointer_safe_and_content_only(): void
    {
        $hero = $this->atelierHero();
        // Scrim lives inside the text overlay layer (rendered only when content is shown).
        $this->assertStringContainsString('atelier-banner-scrim', $hero);
        $this->assertStringContainsString('pointer-events-none', $hero);
        // The scrim is a soft directional gradient, not a full opaque veil.
        $this->assertMatchesRegularExpression('/linear-gradient\(\s*to left,[^;]*rgba\(/', $hero, 'scrim must be a directional gradient');
        // Cover-flow multi banner: legibility scrim must exist and be prop-driven.
        $cf = $this->coverFlow();
        $this->assertStringContainsString('legibilityScrim', $cf);
        $this->assertStringContainsString('pointer-events-none', $cf);
        // AtelierHero must hand the scrim + canonical CTA to the shared cover flow.
        $this->assertStringContainsString('legibilityScrim', $hero);
    }

    public function test_banner_cta_single_canonical_identity(): void
    {
        $hero = $this->atelierHero();
        $cf = $this->coverFlow();
        $ds = file_get_contents(resource_path('js/templates-v2/fashion-atelier/design-system.ts'));
        // Canonical identity tokens live in exactly ONE place (design system).
        $this->assertStringContainsString('hover:bg-[#d8b48a]', $ds);
        $this->assertStringContainsString('border border-white/70', $ds);
        $this->assertStringContainsString('tracking-wide', $ds);
        // The hero consumes the canonical token (no bespoke CTA class strings).
        $this->assertStringContainsString('ATELIER_BANNER_CTA', $hero);
        // Cover-flow's multi CTA must be fed by the canonical token via a prop,
        // not duplicated bespoke classes inside the shared component.
        $this->assertStringContainsString('ctaClassName', $cf);
        $this->assertStringContainsString('ctaClassName={', $hero);
    }
}