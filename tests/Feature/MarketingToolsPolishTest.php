<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

/**
 * P2E-02 — merchant marketing tools clarity polish.
 *
 * Contracts pinned here:
 *  - status pages render with the canonical props the frontend consumes
 *  - first-use empty states are truthful and distinct from filtered "no results"
 *  - the abandoned-carts first-use CTA points at the real WhatsApp automation
 *    page, never the platform-admin settings page
 *  - filtered no-results states offer an explicit clear/reset action
 *  - loyalty copy stays canonical and truthful (disabled banner, points origin)
 *  - referral dashboard explains what counts as a referral on first use
 *
 * Frontend semantics are asserted against shipped source (same approach as
 * ArabicTerminologyTest) so the contract survives refactors of copy.
 */
class MarketingToolsPolishTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function companyWithStore(): array
    {
        $plan = Plan::factory()->create([
            'name' => 'Pro-' . uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_stores' => 10,
            'max_products_per_store' => 100,
            'max_users_per_store' => 20,
        ]);

        $user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
            'onboarded_at' => now(),
        ]);

        $store = Store::factory()->create(['user_id' => $user->id]);
        $user->forceFill(['current_store' => $store->id])->save();

        $role = \App\Models\Role::firstOrCreate(
            ['name' => 'company', 'guard_name' => 'web'],
            ['label' => 'Company']
        );
        $role->syncPermissions(Permission::all());
        $user->assignRole($role);
        foreach (Permission::all() as $permission) {
            try {
                $user->givePermissionTo($permission);
            } catch (\Throwable $e) {
                // permission may already be granted via role
            }
        }

        return [$user->fresh(), $store, $plan];
    }

    public function test_abandoned_carts_store_page_renders_with_polish_props(): void
    {
        [$user, $store] = $this->companyWithStore();

        $response = $this->actingAs($user)
            ->get(route('stores.abandoned-carts.index', $store->id));

        $response->assertStatus(200)->assertInertia(fn ($page) => $page
            ->component('abandoned-carts/index')
            ->has('carts')
            ->has('filters')
            ->has('stats')
            ->has('currency_symbol')
            ->where('activeStoreId', $store->id));
    }

    public function test_coupon_system_page_renders_with_props(): void
    {
        [$user] = $this->companyWithStore();

        $this->actingAs($user)
            ->get(route('coupon-system.index'))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('coupon-system/index')
                ->has('coupons')
                ->has('filters')
                ->has('stats'));
    }

    public function test_advanced_coupons_page_renders_with_props(): void
    {
        [$user] = $this->companyWithStore();

        $this->actingAs($user)
            ->get(route('advanced-coupons.index'))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('advanced-coupons/index')
                ->has('coupons')
                ->has('filters')
                ->has('stats'));
    }

    public function test_loyalty_transactions_page_renders_with_props(): void
    {
        [$user] = $this->companyWithStore();

        $this->actingAs($user)
            ->get(route('loyalty.transactions'))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('loyalty/transactions')
                ->has('transactions')
                ->has('filters')
                ->has('stats'));
    }

    public function test_loyalty_settings_page_renders_with_settings(): void
    {
        [$user] = $this->companyWithStore();

        $this->actingAs($user)
            ->get(route('loyalty.settings'))
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('loyalty/settings')
                ->has('settings'));
    }

    public function test_abandoned_carts_empty_states_are_distinct_and_cta_is_honest(): void
    {
        $source = file_get_contents(resource_path('js/pages/abandoned-carts/index.tsx'));

        $this->assertStringContainsString('لا توجد سلال متروكة تطابق البحث أو الفلاتر الحالية', $source, 'filtered no-results must be distinct from first-use');
        $this->assertStringContainsString('مسح الفلاتر', $source, 'filtered no-results must offer a clear-filters action');
        $this->assertStringContainsString('hasActiveFilters', $source, 'first-use vs filtered state must be driven by active filters');
        $this->assertStringContainsString('stores.notifications.whatsapp', $source, 'first-use CTA must point to the real WhatsApp automation page');
        $this->assertStringNotContainsString("router.visit(route('settings'))", $source, 'CTA must never navigate to platform-admin settings');
    }

    public function test_coupon_system_filtered_empty_state_is_distinct_and_rows_wrap(): void
    {
        $source = file_get_contents(resource_path('js/pages/coupon-system/index.tsx'));

        $this->assertStringContainsString('لا توجد كوبونات تطابق البحث أو الفلاتر الحالية', $source, 'filtered no-results must not reuse the first-use copy');
        $this->assertStringContainsString('مسح الفلاتر', $source, 'filtered no-results must offer a clear-filters action');
        $this->assertStringContainsString('flex flex-wrap items-center justify-between gap-3 p-4', $source, 'coupon rows must wrap on narrow screens');
    }

    public function test_advanced_coupons_filtered_empty_state_is_distinct(): void
    {
        $source = file_get_contents(resource_path('js/pages/advanced-coupons/index.tsx'));

        $this->assertStringContainsString('لا توجد كوبونات متقدمة تطابق البحث أو الفلاتر الحالية', $source, 'filtered no-results must not mislead with a create-first CTA');
    }

    public function test_referral_dashboard_first_use_hint_is_truthful(): void
    {
        $source = file_get_contents(resource_path('js/pages/referral/components/referral-dashboard.tsx'));

        $this->assertStringContainsString('لم ينضم أحد بعد من خلال رابطك', $source, 'first-use must explain what counts as a referral');
    }

    public function test_loyalty_transactions_empty_state_explains_points_origin(): void
    {
        $source = file_get_contents(resource_path('js/pages/loyalty/transactions.tsx'));

        $this->assertStringContainsString('لا توجد حركة نقاط بعد', $source, 'first-use empty state must explain what generates points');
    }

    public function test_loyalty_settings_disabled_banner_is_distinct_from_plan_lock(): void
    {
        $source = file_get_contents(resource_path('js/pages/loyalty/settings.tsx'));

        $this->assertStringContainsString('البرنامج معطل حالياً', $source, 'disabled state must be a plain settings banner, not a plan lock');
    }
}