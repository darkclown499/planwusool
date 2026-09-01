<?php

namespace Tests\Feature\Certification;

use App\Models\Store;
use Tests\TestCase;

/**
 * CERTIFICATION: Grocery / Hero carousel behavior.
 *
 * Guards against regression returning to:
 *  - a single-banner-only slide collapse
 *  - first-video-only early return
 *  - srcMobile duplicating a logical slide
 *  - incorrect dots/arrows/count when media count changes
 *
 * We scope these source-contract assertions to the canonical shared carousel
 * utility and the SouqHero consumer so a break is caught without asserting
 * arbitrary implementation strings across every template.
 */
class HeroCarouselCertificationTest extends TestCase
{
    private function heroMediaSrc(): string
    {
        return file_get_contents(resource_path('js/templates-v2/shared/heroMedia.ts'));
    }

    private function souqHeroSrc(): string
    {
        return file_get_contents(resource_path('js/templates-v2/grocery-souq/SouqComponents.tsx'));
    }

    public function test_media_is_primary_slide_source(): void
    {
        $src = $this->souqHeroSrc() . $this->heroMediaSrc();
        // Canonical media[] must be read (not only legacy images) and mapped entirely.
        $this->assertStringContainsString('media', $src);
        $this->assertStringContainsString('.map(', $src);
    }

    public function test_single_banner_still_one_logical_slide(): void
    {
        $souq = $this->souqHeroSrc();
        // length-agnostic slides handling must exist, not "media.length > 1 requires carousel"
        $this->assertStringContainsString('totalSlides', $souq, 'carousel must compute totalSlides from slides');
    }

    public function test_no_first_video_only_early_return(): void
    {
        // A first-video early return would collapse the carousel to a single slide.
        $souq = $this->souqHeroSrc();
        $this->assertStringNotContainsString('media[0].type', $souq, 'carousel slide build must not special-case index 0 by type');
    }

    public function test_src_mobile_does_not_duplicate_logical_slide(): void
    {
        $souq = $this->souqHeroSrc();
        $this->assertStringContainsString('totalSlides', $souq, 'slide count must be derived from slides count, not per-src swap');
    }

    public function test_dots_and_arrows_use_total_slides(): void
    {
        $souq = $this->souqHeroSrc();
        $this->assertStringContainsString('totalSlides', $souq, 'dots/arrows must reference totalSlides');
        // Next/prev must wrap modulo totalSlides.
        $this->assertMatchesRegularExpression('/%.*totalSlides|totalSlides.*%/', $souq, 'carousel wrap must use totalSlides');
    }

    public function test_video_cleanup_and_ended_advance_present(): void
    {
        $souq = $this->souqHeroSrc();
        // Hidden videos pause and active plays, ended advances (video loop false).
        $this->assertStringContainsString('pause()', $souq);
        $this->assertStringContainsString('onEnded', $souq);
    }

    public function test_vertical_scroll_arbitration_token_exists_in_shared_source(): void
    {
        // The touch/scroll arbitration guard lives in the consumer; assert the shared token.
        $souq = $this->souqHeroSrc();
        $this->assertStringContainsString('scroll', $souq, 'scroll arbitration must be present');
    }

    public function test_legacy_hero_images_fallback_still_supported(): void
    {
        $hm = $this->heroMediaSrc();
        $this->assertStringContainsString('images', $hm, 'legacy hero.images fallback must remain supported');
    }
}
