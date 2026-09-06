<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * Source-inspection clarity guard for the onboarding wizard progress UX.
 *
 * These tests lock the contract of the "clarity" work shipped in Phase 2C:
 * the segmented step stepper, the "Step X of Y" counter, the current/next
 * caption strip, the save indicator, the required-fields hint, and the rule
 * that no GET alias or skip control was introduced. Assertions read the
 * implementation source rather than Tailwind class names so the checks stay
 * robust against style refactors.
 */
class OnboardingWizardClarityTest extends TestCase
{
    private function wizardSource(): string
    {
        return file_get_contents(base_path('resources/js/pages/onboarding.tsx'));
    }

    private function langFile(string $code): array
    {
        return json_decode(file_get_contents(base_path("resources/lang/{$code}.json")), true, 512, JSON_THROW_ON_ERROR);
    }

    public function test_wizard_defines_exactly_nine_steps_and_renders_them_in_one_stepper(): void
    {
        $source = $this->wizardSource();

        preg_match('/const STEP_META: .*?= \[(.*?)\];/s', $source, $m);
        $this->assertNotEmpty($m, 'STEP_META must be defined');

        $steps = preg_match_all('/key:\s*[\'"]([a-z]+)[\'"]/', $m[1], $keys);
        $this->assertSame(9, $steps, 'STEP_META must define exactly 9 steps');
        $this->assertSame(
            ['welcome', 'name', 'store', 'details', 'branding', 'language', 'currency', 'theme', 'confirm'],
            $keys[1],
        );

        $this->assertStringContainsString("aria-label={t('Store setup steps')}", $source);
        $this->assertStringContainsString('{STEP_META.map((meta, i) => {', $source);
        $this->assertStringContainsString('key={meta.key}', $source);
    }

    public function test_current_step_is_marked_with_aria_current_attribute(): void
    {
        $source = $this->wizardSource();

        $this->assertStringContainsString("aria-current={isCurrent ? 'step' : undefined}", $source);
        $this->assertStringContainsString('const isCurrent = i === step;', $source);
    }

    public function test_step_counter_total_is_derived_from_step_meta_not_a_literal(): void
    {
        $this->assertStringContainsString(
            'Step {{current}} of {{total}}',
            $this->wizardSource(),
        );
        $this->assertStringContainsString(
            'total: STEP_META.length',
            $this->wizardSource(),
        );
    }

    public function test_initial_step_is_server_initial_step_clamped_to_stepper_bounds(): void
    {
        $source = $this->wizardSource();

        $this->assertStringContainsString(
            'Math.min(Math.max(initialStep || 0, 0), STEP_META.length - 1)',
            $source,
        );
    }

    public function test_autosave_still_uses_the_canonical_progress_post_and_never_a_get_alias(): void
    {
        $source = $this->wizardSource();

        // Autosave fires axios.post against the canonical contract route
        // (the call is spread across source lines, so match the two halves).
        $this->assertStringContainsString('axios', $source);
        $this->assertStringContainsString(".post(route('onboarding.progress')", $source);
        $this->assertStringContainsString('step: step + 1', $source);
        $this->assertSame(
            1,
            substr_count($source, "route('onboarding.progress')"),
            'autosave must reference the canonical POST route exactly once',
        );
        $this->assertStringNotContainsString(".get(route('onboarding.progress')", $source);
    }

    public function test_save_indicator_is_live_region_and_shows_saving_and_saved_states(): void
    {
        $source = $this->wizardSource();
        $ar = $this->langFile('ar');

        $this->assertStringContainsString('role="status"', $source);
        $this->assertStringContainsString("t('Saving…')", $source);
        $this->assertStringContainsString("t('All changes saved')", $source);

        $this->assertSame('جارٍ الحفظ…', $ar['Saving…']);
        $this->assertSame('تم حفظ التغييرات', $ar['All changes saved']);
    }

    public function test_back_navigation_only_moves_steps_and_preserves_typed_data(): void
    {
        $source = $this->wizardSource();

        $backBody = null;
        if (preg_match('/const back = \(\) => \{(.*?)\n    \};/s', $source, $m)) {
            $backBody = $m[1];
        }
        $this->assertNotNull($backBody, 'back handler must be defined');
        $this->assertStringContainsString('setStep(step - 1)', $backBody);
        $this->assertStringNotContainsString('setData', $backBody);

        $this->assertStringContainsString('disabled={!canProceed()}', $source);
        $this->assertStringContainsString(
            "t('Complete the required fields to continue')",
            $source,
        );
    }

    public function test_required_field_gating_still_guards_name_and_store_steps(): void
    {
        $this->assertStringContainsString(
            "return data.name.trim().length > 0;",
            $this->wizardSource(),
        );
        $this->assertStringContainsString(
            'data.store_name.trim().length > 0 &&',
            $this->wizardSource(),
        );
        $this->assertStringContainsString(
            'data.store_subdomain.trim().length > 0 &&',
            $this->wizardSource(),
        );
        $this->assertStringContainsString('availability.available', $this->wizardSource());
    }

    public function test_no_skip_feature_was_introduced_in_the_footer_navigation(): void
    {
        $source = $this->wizardSource();

        $this->assertStringContainsString("t('Back')", $source);
        $this->assertStringContainsString("{t('Next')}", $source);
        $this->assertStringContainsString("{t('Finish')}", $source);

        // The footer must only know Back/Next/Finish — no Skip action may exist.
        $this->assertStringNotContainsString('Skip', $source);
        $this->assertStringNotContainsString("t('Skip')", $source);
    }

    public function test_merchant_facing_copy_has_no_replacement_characters_and_new_keys_are_translated(): void
    {
        $source = $this->wizardSource();
        $en = $this->langFile('en');
        $ar = $this->langFile('ar');

        // Newly added clarity copy must contain the intended typographic
        // characters (multiplication sign / em dash), never U+FFFD.
        $this->assertStringContainsString('Recommended size: 500 × 500 px', $source);
        $this->assertStringContainsString(
            'Describe your business and make it yours — everything here is optional.',
            $source,
        );

        foreach (['Store setup steps', 'Saving…', 'All changes saved', 'Complete the required fields to continue'] as $key) {
            $this->assertArrayHasKey($key, $en, "en.json is missing key: {$key}");
            $this->assertArrayHasKey($key, $ar, "ar.json is missing key: {$key}");
        }

        $this->assertSame('Store setup steps', $en['Store setup steps']);
        $this->assertSame('مراحل إعداد المتجر', $ar['Store setup steps']);
        $this->assertSame('أكمل الحقول المطلوبة للمتابعة', $ar['Complete the required fields to continue']);

        // No replacement character anywhere in the two edited bundles.
        $this->assertStringNotContainsString("\u{FFFD}", $en['Store setup steps']);
        $this->assertStringNotContainsString("\u{FFFD}", $ar['Store setup steps']);
        $this->assertStringNotContainsString("\u{FFFD}", $ar['Saving…']);
        $this->assertStringNotContainsString("\u{FFFD}", $ar['All changes saved']);
    }

    public function test_previously_existing_merchant_caption_keys_remain_available(): void
    {
        $en = $this->langFile('en');
        $ar = $this->langFile('ar');

        $this->assertSame('How customers reach you', $en['How customers reach you']);
        $this->assertSame('كيف يتواصل معك العملاء', $ar['How customers reach you']);
        $this->assertSame('Brand your store', $en['Brand your store']);
        $this->assertSame('علامتك التجارية', $ar['Brand your store']);
    }
}