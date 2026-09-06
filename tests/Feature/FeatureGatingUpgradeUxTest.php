<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * P2E-01 — Feature gating & upgrade UX.
 *
 * Proves the merchant upgrade/locked surfaces stay truthful, consistent and
 * non-duplicative:
 *   - PLAN lock (feature not in plan) vs PERMISSION denial vs SETUP/readiness
 *     are not conflated.
 *   - Every plan-locked surface exposes exactly ONE upgrade CTA.
 *   - The upgrade CTA resolves to the canonical plan shop (plans.index) which
 *     the merchant can actually reach — never to invoice history.
 *   - Server-side entitlement (shipping_method) remains authoritative.
 *   - Product runtime limits remain server-driven.
 */
class FeatureGatingUpgradeUxTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    /**
     * Company merchant with a plan-owned store. Exactly like
     * ShippingEntitlementEnforcementTest::merchantWithStore.
     */
    private function merchantWithStore(string $shippingFlag = 'off', array $extraPlan = [], string $storeSlug = 'gating-store'): array
    {
        $plan = Plan::factory()->create(array_merge([
            'price' => 0,
            'is_default' => true,
            'max_stores' => 5,
            'max_products_per_store' => 1000,
            'enable_shipping_method' => $shippingFlag,
        ], $extraPlan));
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'onboarded_at' => now(), 'email_verified_at' => now(), 'plan_is_active' => 1, 'plan_expire_date' => now()->addYear()]);
        $store = Store::factory()->create(['user_id' => $user->id, 'slug' => $storeSlug . '-' . uniqid()]);
        DB::table('users')->where('id', $user->id)->update(['current_store' => $store->id]);
        $user = $user->fresh();
        $user->givePermissionTo([
            'manage-plans',
            'manage-orders',
            'manage-shipping',
            'create-shipping',
            'edit-shipping',
            'delete-shipping',
            'view-shipping',
            'settings-stores',
            'manage-stores',
            'manage-products',
        ]);
        return [$user, $store, $plan];
    }

    private function inertiaJson(User $user, string $route): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($user)
            ->withHeader('X-Inertia', 'true')
            ->withHeader('X-Inertia-Version', (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request()))
            ->getJson($route);
    }

    /* ------------------- PLAN LOCK IS TRUTHFUL & SERVER-DRIVEN ------------------- */

    public function test_plan_locked_delivery_is_flagged_false_and_uses_plan_column(): void
    {
        [$owner, ] = $this->merchantWithStore('off');
        $res = $this->inertiaJson($owner, route('delivery.index'));
        $res->assertOk();
        $this->assertFalse($res->json('props.shippingEnabled'));
        $this->assertFalse($res->json('props.deliveryReadiness.entitled'));
    }

    public function test_entitled_plan_is_not_flagged_locked(): void
    {
        [$owner, ] = $this->merchantWithStore('on');
        $res = $this->inertiaJson($owner, route('delivery.index'));
        $res->assertOk();
        $this->assertTrue($res->json('props.shippingEnabled'));
        $this->assertTrue($res->json('props.deliveryReadiness.entitled'));
    }

    /* ------------- ENTITLED-BUT-NOT-CONFIGURED ≠ UPGRADE ------------- */

    public function test_entitled_store_with_no_shipping_method_is_setup_not_lock(): void
    {
        [$owner, ] = $this->merchantWithStore('on');
        $res = $this->inertiaJson($owner, route('delivery.index'));
        $res->assertOk();
        // Plan IS entitled — the block is missing setup, so the hub must not
        // present an upgrade/lock for this store.
        $this->assertTrue($res->json('props.deliveryReadiness.entitled'));
        $this->assertFalse($res->json('props.deliveryReadiness.has_methods'));
        $this->assertFalse($res->json('props.deliveryReadiness.has_active_method'));
    }

    /* ----------------- SERVER-SIDE ENTITLEMENT ENFORCEMENT ----------------- */

    public function test_starter_cannot_create_shipping_method(): void
    {
        [$owner, $store] = $this->merchantWithStore('off');
        $res = $this->from('/delivery')->actingAs($owner)->post(route('shipping.store'), ['name' => 'بدون ترخيص', 'type' => 'flat_rate', 'cost' => 5]);
        $res->assertRedirect('/delivery');
        $this->assertNotNull($res->getSession()->get('error'));
        $this->assertDatabaseMissing('shippings', ['name' => 'بدون ترخيص', 'store_id' => $store->id]);
    }

    /* ------------- PERMISSION DENIAL ≠ PLAN LOCK ------------- */

    public function test_permission_denied_is_not_mislabeled_as_plan_lock(): void
    {
        // Growth (shipping entitled) user who simply lacks create-shipping.
        $plan = Plan::factory()->create(['price' => 0, 'is_default' => true, 'enable_shipping_method' => 'on']);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'onboarded_at' => now(), 'email_verified_at' => now(), 'plan_is_active' => 1, 'plan_expire_date' => now()->addYear()]);
        $store = Store::factory()->create(['user_id' => $user->id, 'slug' => 'perm-denied-' . uniqid()]);
        DB::table('users')->where('id', $user->id)->update(['current_store' => $store->id]);
        $user = $user->fresh();
        // Deliberately NOT granting create-shipping.

        $res = $this->from(route('delivery.index'))->actingAs($user)->post(route('shipping.store'), ['name' => 'ممنوع', 'type' => 'flat_rate', 'cost' => 5]);
        // Permission denial: 403 (not a plan-lock redirect to the plan shop).
        $this->assertTrue(in_array($res->getStatusCode(), [403, 302]), 'permission denial must be 403 or redirect, never an upgrade prompt');
        if ($res->getStatusCode() === 302) {
            $this->assertNotEquals('/plans', $res->headers->get('Location'), 'permission denial must not redirect to plan shop');
        }
        $this->assertDatabaseMissing('shippings', ['name' => 'ممنوع', 'store_id' => $store->id]);
    }

    /* ------------- CANONICAL UPGRADE ROUTE REACHABLE ------------- */

    public function test_upgrade_cta_route_is_reachable_by_merchant(): void
    {
        [$owner, ] = $this->merchantWithStore('on');
        // The canonical plan shop (/plans) is the destination of every
        // plan-locked upgrade CTA. A merchant with manage-plans can reach it.
        $res = $this->inertiaJson($owner, route('plans.index'));
        $res->assertOk();
        $this->assertSame('/plans', parse_url(route('plans.index'), PHP_URL_PATH), 'plans.index must be the canonical plan shop path');
    }

    /* ------------- SINGLE UPGRADE CTA PER LOCKED SURFACE ------------- */

    public function test_locked_overlay_has_one_cta_to_plan_shop(): void
    {
        $comp = file_get_contents(resource_path('js/components/FeatureLockedOverlay.tsx'));
        $this->assertStringContainsString("router.visit(route('plans.index'))", $comp, 'locked overlay CTA must go to plan shop');
        $this->assertStringNotContainsString("route('plan-orders.index')", $comp, 'locked overlay must not target invoice history');
        // Exactly one CTA in the overlay.
        $this->assertSame(1, substr_count($comp, "router.visit(route('plans.index'))"), 'exactly one upgrade CTA in FeatureLockedOverlay');
        // Fallback copy must be truthful when no specific tier claim exists.
        $this->assertStringContainsString("t('This feature is not available in your current plan.')", $comp, 'generic truthful locked copy');
    }

    public function test_upgrade_modal_cta_targets_plan_shop(): void
    {
        $modal = file_get_contents(resource_path('js/components/UpgradeModal.tsx'));
        $this->assertStringContainsString("router.visit(route('plans.index'))", $modal, 'UpgradeModal CTA must go to plan shop');
        $this->assertStringNotContainsString("route('plan-orders.index')", $modal, 'UpgradeModal must not target invoice history');
    }

    public function test_dead_duplicate_upgrade_modal_removed(): void
    {
        // The lowercase duplicate modal was a dead, conflicting surface.
        $this->assertFileDoesNotExist(resource_path('js/components/upgrade-modal.tsx'));
    }

    public function test_delivery_hub_has_single_page_level_lock(): void
    {
        $delivery = file_get_contents(resource_path('js/pages/delivery/index.tsx'));
        // No per-tab duplicate locked overlays remain.
        $this->assertStringNotContainsString('FeatureLockedOverlay', $delivery, 'delivery hub must not duplicate per-tab locked overlays');
        // The single page-level locked state (readiness header) drives to the plan shop.
        $this->assertStringContainsString("router.visit(route('plans.index'))", $delivery, 'delivery locked header CTA must go to plan shop');
        $this->assertStringNotContainsString("route('plan-orders.index')", $delivery, 'delivery upgrade CTA must not target invoice history');
        // Exactly one upgrade CTA in the locked readiness header.
        $this->assertSame(1, substr_count($delivery, "router.visit(route('plans.index'))"), 'delivery hub exposes exactly one upgrade CTA');
    }

    /* ------------- WEBHOOK NO LONGER MISLABELED AS PLAN LOCK ------------- */

    public function test_webhook_section_not_plan_locked(): void
    {
        $settings = file_get_contents(resource_path('js/pages/settings/index.tsx'));
        // No webhook plan entitlement exists server-side; the section must not
        // be gated on enable_custdomain or present a locked overlay.
        $this->assertStringNotContainsString("FeatureLockedOverlay featureName=\"Webhook Settings\"", $settings, 'webhooks must not be plan-locked');
        $this->assertStringNotContainsString("planFeatures?.enable_custdomain", $settings, 'webhook section must not be gated on custom-domain flag');
        $this->assertStringContainsString('<WebhookSettings webhooks={webhooks} availableModules={availableModules} />', $settings, 'webhook settings render directly when permission-gated');
    }

    /* ------------- WAREHOUSE FALSE CLAIMS NOT INTRODUCED ------------- */

    public function test_no_warehouse_claims_in_upgrade_copy(): void
    {
        foreach ([
            'js/components/FeatureLockedOverlay.tsx',
            'js/components/UpgradeModal.tsx',
            'js/pages/delivery/index.tsx',
            'js/pages/settings/index.tsx',
        ] as $file) {
            $src = strtolower(file_get_contents(resource_path($file)));
            $this->assertStringNotContainsString('warehouse', $src, "no warehouse claim in $file");
            $this->assertStringNotContainsString('مستودع', $src, "no Arabic warehouse claim in $file");
        }
    }

    /* ------------- PRODUCT LIMIT REMAINS SERVER-DRIVEN ------------- */

    public function test_product_limit_served_from_plan_not_hardcoded(): void
    {
        [$owner, ] = $this->merchantWithStore('off', ['max_products_per_store' => 37]);
        $res = $this->inertiaJson($owner, route('products.index'));
        $res->assertOk();
        $this->assertSame(37, $res->json('props.planLimits.max_products'), 'product limit must be DB-driven, never a hardcoded literal');
    }

    /* ------------- TENANT SCOPING REMAINS CURRENT-STORE ------------- */

    public function test_delivery_readiness_stays_scoped_to_current_store(): void
    {
        [$owner, $storeA] = $this->merchantWithStore('on', [], 'gating-store-a');
        $storeB = Store::factory()->create(['user_id' => $owner->id, 'slug' => 'gating-store-b-' . uniqid()]);
        Shipping::create(['store_id' => $storeA->id, 'name' => 'طريقة أ', 'type' => 'flat_rate', 'cost' => 10, 'is_active' => true, 'sort_order' => 0]);

        // Store A (current) exposes its method.
        $resA = $this->inertiaJson($owner, route('delivery.index'));
        $resA->assertOk();
        $this->assertTrue($resA->json('props.deliveryReadiness.has_methods'));

        // Switch current store to B — must not leak store A's method.
        DB::table('users')->where('id', $owner->id)->update(['current_store' => $storeB->id]);
        $owner = $owner->fresh();
        $resB = $this->inertiaJson($owner, route('delivery.index'));
        $resB->assertOk();
        $this->assertFalse($resB->json('props.deliveryReadiness.has_methods'), 'delivery readiness must stay current-store scoped');
    }

    /* ------------- GENERIC LOCKED COPY IS LOCALISED ------------- */

    public function test_generic_locked_copy_exists_in_arabic_and_english(): void
    {
        $ar = json_decode(file_get_contents(resource_path('lang/ar.json')), true);
        $en = json_decode(file_get_contents(resource_path('lang/en.json')), true);
        $this->assertArrayHasKey('This feature is not available in your current plan.', $ar);
        $this->assertSame('هذه الميزة غير متاحة في باقتك الحالية.', $ar['This feature is not available in your current plan.']);
        $this->assertArrayHasKey('This feature is not available in your current plan.', $en);
    }
}