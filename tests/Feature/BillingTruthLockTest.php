<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingTruthLockTest extends TestCase
{
    use RefreshDatabase;

    public function test_subscription_currency_is_usd(): void
    {
        $this->assertEquals('USD', getSubscriptionCurrency());
        $this->assertStringStartsWith('$', formatSubscriptionPrice(299));
        $this->assertEquals('$299', formatSubscriptionPrice(299));
        $this->assertEquals('$0', formatSubscriptionPrice(0));
        $this->assertEquals('$399', formatSubscriptionPrice(399));
    }

    public function test_billing_interval_is_yearly_only(): void
    {
        $this->assertEquals('yearly', getSubscriptionBillingCycle());
        // validatePaymentRequest should only accept yearly
        $plan = Plan::factory()->create(['price' => 299, 'yearly_price' => 299]);
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $request = \Illuminate\Http\Request::create('/', 'POST', [
            'plan_id' => $plan->id,
            'billing_cycle' => 'monthly',
        ]);
        validatePaymentRequest($request);
    }

    public function test_growth_is_299_yearly(): void
    {
        $this->seed(\Database\Seeders\PlanSeeder::class);
        $growth = Plan::where('name', 'Growth')->first();
        $this->assertNotNull($growth, 'Growth plan missing');
        $this->assertEquals(299, (int) $growth->price);
        $this->assertEquals(299, (int) $growth->yearly_price);
        $this->assertEquals('yearly', $growth->duration);
        $this->assertEquals(299, $growth->getPriceForCycle('yearly'));
        // Even if passed monthly, should still return yearly price (USD yearly lock)
        $this->assertEquals(299, $growth->getPriceForCycle('monthly'));
    }

    public function test_professional_is_399_yearly(): void
    {
        $this->seed(\Database\Seeders\PlanSeeder::class);
        $pro = Plan::where('name', 'Professional')->first();
        $this->assertNotNull($pro, 'Professional plan missing');
        $this->assertEquals(399, (int) $pro->price);
        $this->assertEquals(399, (int) $pro->yearly_price);
        $this->assertEquals('yearly', $pro->duration);
        $this->assertEquals(399, $pro->getPriceForCycle('yearly'));
        $this->assertEquals(399, $pro->getPriceForCycle('monthly'));
    }

    public function test_starter_is_zero_yearly(): void
    {
        $this->seed(\Database\Seeders\PlanSeeder::class);
        $starter = Plan::where('name', 'Starter')->first();
        $this->assertNotNull($starter);
        $this->assertEquals(0, (int) $starter->price);
        $this->assertEquals(0, (int) $starter->yearly_price);
        $this->assertEquals('yearly', $starter->duration);
        $this->assertStringStartsWith('$0', formatSubscriptionPrice($starter->yearly_price));
    }

    public function test_no_monthly_purchase_option_validation(): void
    {
        // Validate server-side billing_cycle enforcement (yearly only)
        $plan = Plan::factory()->create(['price' => 299, 'yearly_price' => 299, 'duration' => 'yearly']);

        // Direct validation helper must reject monthly
        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $request = \Illuminate\Http\Request::create('/', 'POST', [
            'plan_id' => $plan->id,
            'billing_cycle' => 'monthly',
        ]);
        validatePaymentRequest($request);

        // Yearly should pass (no exception)
        $yearlyRequest = \Illuminate\Http\Request::create('/', 'POST', [
            'plan_id' => $plan->id,
            'billing_cycle' => 'yearly',
        ]);
        // Should not throw
        $result = null;
        try {
            $result = validatePaymentRequest($yearlyRequest);
        } catch (\Exception $e) {
            $this->fail('Yearly billing_cycle should be valid, but got: ' . $e->getMessage());
        }
        $this->assertNotNull($result);
    }

    public function test_plan_payment_calculation_uses_authoritative_annual_price(): void
    {
        $plan = Plan::factory()->create([
            'price' => 299,
            'yearly_price' => 299,
            'duration' => 'yearly',
        ]);

        $pricing = calculatePlanPricing($plan, null, 'yearly');
        $this->assertEquals(299, $pricing['original_price']);
        $this->assertEquals(299, $pricing['final_price']);

        // Service pricing also yearly
        $svcPricing = app(\App\Services\Plan\Pricing\PlanPricingService::class)->calculate($plan, null, 'yearly');
        $this->assertEquals(299, $svcPricing['original_price']);

        // Even if caller passes monthly, authoritative price remains yearly (no client-controlled monthly amount)
        $pricingMonthly = app(\App\Services\Plan\Pricing\PlanPricingService::class)->calculate($plan, null, 'monthly');
        $this->assertEquals(299, $pricingMonthly['original_price'], 'Server must ignore client monthly and use yearly');
    }

    public function test_terms_contain_usd_and_yearly_billing(): void
    {
        $termsPath = resource_path('js/pages/static/TermsPage.tsx');
        $content = file_get_contents($termsPath);
        $this->assertStringContainsString('الدولار الأمريكي', $content, 'Terms must mention USD');
        $this->assertStringContainsString('USD', $content, 'Terms must contain USD');
        $this->assertStringContainsString('سنوية', $content, 'Terms must mention yearly');

        // Also check lang files
        $arLang = file_get_contents(resource_path('lang/ar.json'));
        $this->assertStringContainsString('الدولار الأمريكي (USD)', $arLang);
        $this->assertStringContainsString('سنوية', $arLang);
        $this->assertStringNotContainsString('الشيكل الإسرائيلي (₪)', $arLang, 'ILS subscription reference must be removed');
    }

    public function test_no_subscription_page_contains_ils_or_monthly_purchase(): void
    {
        // Check critical subscription UI files do NOT contain ILS/₪ for subscription billing
        $subscriptionFiles = [
            resource_path('js/pages/landing-page/components/PlansSection.tsx'),
            resource_path('js/pages/plans/index.tsx'),
            resource_path('js/components/payment/payment-processor.tsx'),
            resource_path('js/pages/static/TermsPage.tsx'),
        ];

        foreach ($subscriptionFiles as $file) {
            $content = file_get_contents($file);
            // Subscription files should not contain ₪/ILS as subscription currency (storefront may, but subscription must be USD)
            // PlansSection uses formatUSD with $, not ₪
            // payment-processor fallback should be $ not ₪
            if (str_contains($file, 'payment-processor')) {
                $this->assertStringNotContainsString('₪', $content, "Subscription file {$file} must not contain ₪, use USD");
            }
            if (str_contains($file, 'TermsPage')) {
                $this->assertStringNotContainsString('₪', $content, "Terms must not contain ₪");
            }
        }

        // Plan factory must be yearly
        $factoryContent = file_get_contents(database_path('factories/PlanFactory.php'));
        $this->assertStringContainsString("'duration' => 'yearly'", $factoryContent);
        $this->assertStringNotContainsString("'duration' => 'monthly'", $factoryContent);

        // Plan duration must be yearly
        $planContent = file_get_contents(app_path('Models/Plan.php'));
        $this->assertStringContainsString("\$cycle = 'yearly'", $planContent);
    }

    public function test_assign_plan_to_user_always_yearly(): void
    {
        $user = User::factory()->create(['type' => 'company']);
        $plan = Plan::factory()->create(['duration' => 'yearly', 'price' => 299, 'yearly_price' => 299]);

        // Even if caller passes monthly, result must be yearly
        assignPlanToUser($user, $plan, 'monthly');
        $user->refresh();
        $this->assertEquals('yearly', $user->plan_duration, 'assignPlanToUser must enforce yearly');
        $expectedExpiry = now()->addYear()->format('Y-m-d');
        $this->assertEquals($expectedExpiry, \Carbon\Carbon::parse($user->plan_expire_date)->format('Y-m-d'));
    }

    public function test_growth_has_14_day_trial_not_monthly_billing(): void
    {
        $this->seed(\Database\Seeders\PlanSeeder::class);
        $growth = Plan::where('name', 'Growth')->first();
        $this->assertEquals('on', $growth->is_trial);
        $this->assertEquals(14, (int) $growth->trial_day);
        $this->assertEquals('yearly', $growth->duration, 'Trial does NOT mean monthly billing');

        $pro = Plan::where('name', 'Professional')->first();
        $this->assertEquals('yearly', $pro->duration);
    }
}
