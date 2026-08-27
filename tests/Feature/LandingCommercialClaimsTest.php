<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingCommercialClaimsTest extends TestCase
{
    use RefreshDatabase;

    private array $publicLandingFiles = [];

    protected function setUp(): void
    {
        parent::setUp();
        $base = base_path();
        $this->publicLandingFiles = [
            $base . '/resources/js/pages/welcome.tsx',
            $base . '/resources/js/pages/static/FeaturesPage.tsx',
            $base . '/resources/js/pages/static/AboutPage.tsx',
            $base . '/resources/js/pages/static/TermsPage.tsx',
            $base . '/resources/js/pages/static/PrivacyPage.tsx',
            $base . '/resources/js/pages/landing-page/components/HeroSection.tsx',
            $base . '/resources/js/pages/landing-page/components/FeaturesSection.tsx',
            $base . '/resources/js/pages/landing-page/components/TrustedBySection.tsx',
            $base . '/resources/js/pages/landing-page/components/PlansSection.tsx',
            $base . '/resources/js/pages/landing-page/components/Footer.tsx',
            $base . '/database/seeders/LandingPageSeeder.php',
            $base . '/database/seeders/PlanSeeder.php',
        ];
    }

    private function slurp(string $path): string
    {
        return file_exists($path) ? file_get_contents($path) : '';
    }

    public function test_no_29_templates_claim(): void
    {
        $forbidden = ['29 قالب', '29 قالباً', '+29', '٢٩ قالب', 'عشرات القوالب', '29 templates'];
        foreach ($this->publicLandingFiles as $file) {
            $content = $this->slurp($file);
            foreach ($forbidden as $needle) {
                $this->assertStringNotContainsString($needle, $content, "Forbidden template count '$needle' found in $file");
            }
        }
    }

    public function test_six_templates_truthful(): void
    {
        $welcome = $this->slurp(base_path('resources/js/pages/welcome.tsx'));
        $this->assertStringContainsString('6 قوالب قطاعية', $welcome, 'welcome.tsx must state 6 sector templates truthfully');

        // All six slugs must be listed
        foreach (['bazaar-market', 'grocery-souq', 'bakery-house', 'electronics-hub', 'fashion-atelier', 'restaurant-menu'] as $slug) {
            $this->assertStringContainsString($slug, $welcome, "welcome.tsx must list template slug $slug");
        }

        $features = $this->slurp(base_path('resources/js/pages/static/FeaturesPage.tsx'));
        $this->assertStringContainsString('6 قوالب قطاعية', $features);

        $seeder = $this->slurp(base_path('database/seeders/PlanSeeder.php'));
        // PlanSeeder must not contain false 29-template claim
        $this->assertStringNotContainsString('29 قالب', $seeder);
        $this->assertStringNotContainsString('29 template', $seeder);
    }

    public function test_no_fake_social_proof(): void
    {
        $welcome = $this->slurp(base_path('resources/js/pages/welcome.tsx'));
        // Fake numbers
        $this->assertStringNotContainsString('+٢٬٠٠٠ متجر', $welcome);
        $this->assertStringNotContainsString('+2,000', $welcome);
        $this->assertStringNotContainsString('2000 متجر', $welcome);
        $this->assertStringNotContainsString('تقييم ٤.٩', $welcome);
        $this->assertStringNotContainsString('4.9', $welcome);
        $this->assertStringNotContainsString('99.9%', $welcome);
        $this->assertStringNotContainsString('٩٩.٩%', $welcome);

        // Testimonials must be empty (no invented unverified)
        $this->assertStringContainsString('TESTIMONIALS: Array', $welcome);
        $this->assertStringContainsString('[]', $welcome); // empty array

        // Seeder testimonials must be empty
        $seeder = $this->slurp(base_path('database/seeders/LandingPageSeeder.php'));
        // Ensure testimonials array is empty, not populated with 6 fake entries
        $this->assertStringContainsString("'testimonials' => []", $seeder);
        $this->assertStringNotContainsString('أحمد منصور', $seeder);
        $this->assertStringNotContainsString('١٠ آلاف+', $seeder);
        $this->assertStringNotContainsString('٩٩٪', $seeder);
    }

    public function test_pricing_matches_backend(): void
    {
        $welcome = $this->slurp(base_path('resources/js/pages/welcome.tsx'));
        // Must match PlanSeeder yearly prices 0, 299, 399
        $this->assertStringContainsString("'299'", $welcome);
        $this->assertStringContainsString("'399'", $welcome);
        $this->assertStringContainsString("/سنة", $welcome);
        $this->assertStringNotContainsString("'/شهرياً'", $welcome);
        // Old false monthly prices must not exist
        $this->assertStringNotContainsString("price: '49'", $welcome);
        $this->assertStringNotContainsString("price: '99'", $welcome);
    }

    public function test_optional_features_qualified(): void
    {
        $welcome = $this->slurp(base_path('resources/js/pages/welcome.tsx'));
        // Payment must be qualified as حسب التوفر not absolute 20 gateways
        $this->assertStringContainsString('حسب التوفر', $welcome);
        $this->assertStringNotContainsString('أكثر من 20 بوابة دفع', $welcome);

        $featuresPage = $this->slurp(base_path('resources/js/pages/static/FeaturesPage.tsx'));
        $this->assertStringContainsString('حسب الباقة', $featuresPage);
        $this->assertStringContainsString('حسب التوفر', $featuresPage);
        $this->assertStringNotContainsString('عشرات القوالب', $featuresPage);
    }

    public function test_public_cta_routes_valid(): void
    {
        $this->get('/')->assertStatus(200);
        $this->get('/about')->assertStatus(200);
        $this->get('/features')->assertStatus(200);
        $this->get('/privacy')->assertStatus(200);
        $this->get('/terms')->assertStatus(200);
        $this->get('/login')->assertStatus(200);
        $this->get('/register')->assertStatus(200);
    }

    public function test_trust_logos_disclaimer(): void
    {
        $trusted = $this->slurp(base_path('resources/js/pages/landing-page/components/TrustedBySection.tsx'));
        $this->assertStringContainsString('دون ادعاء شراكة', $trusted);
    }
}
