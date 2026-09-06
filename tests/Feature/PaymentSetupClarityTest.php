<?php

namespace Tests\Feature;

use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use App\Services\Payment\PaymentProviderCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * P2C-03 — Merchant Payment Setup Clarity.
 *
 * The merchant Payments area (/cod-payments) must show, instantly, whether
 * payments are ready — sourced ONLY from the authenticated merchant's current
 * store, and always consistent with the checkout engine's
 * getEnabledPaymentMethods() (the same helper the dashboard uses). Methods are
 * further labeled ACTIVE / INACTIVE / NOT-CONFIGURED purely from backend truth
 * (enabled flag + presence of saved credentials); nothing redefines what counts
 * as a valid method, and no secrets ever leave the server.
 */
class PaymentSetupClarityTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(): array
    {
        $plan = Plan::factory()->create(['name' => 'P' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth(), 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'S' . uniqid();
        $store->slug = 's-' . uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 'store@example.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        $this->actingAs($user);
        return [$user->fresh(), $store];
    }

    private function allow(User $user, string ...$perms): User
    {
        foreach ($perms as $p) {
            if (!Permission::where('name', $p)->where('guard_name', 'web')->exists()) {
                Permission::create(['name' => $p, 'guard_name' => 'web']);
            }
            $user->givePermissionTo($p);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        return $user->fresh();
    }

    private function hubReadyAssertion(array $expected): callable
    {
        return fn ($p) => $p
            ->where('paymentReadiness.available', true)
            ->where('paymentReadiness.ready', $expected['ready'])
            ->where('paymentReadiness.active_count', $expected['active_count']);
    }

    // ─────────── Readiness state (mirrors getEnabledPaymentMethods) ───────────

    public function test_no_active_methods_merchant_reports_not_ready(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'manage-cod-payments');

        $this->assertCount(0, getEnabledPaymentMethods($user->id, $store->id));

        $this->get(route('cod-payments.index'))
            ->assertOk()
            ->assertInertia($this->hubReadyAssertion(['ready' => false, 'active_count' => 0]));
    }

    public function test_activating_via_api_flips_readiness_and_checkout_engine(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'settings-stores');

        // Real mutation path: enable COD through the store payments API.
        $this->put(route('api.store-payments.update', $store->id), ['method' => 'cod', 'enabled' => true])
            ->assertOk()
            ->assertJson(['success' => true, 'method' => 'cod', 'enabled' => true]);

        // Checkout engine agrees with the hub the very same way the dashboard does.
        $enabled = getEnabledPaymentMethods($user->id, $store->id);
        $this->assertArrayHasKey('cod', $enabled);

        $this->get(route('cod-payments.index'))
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('paymentReadiness.ready', true)
                ->where('paymentReadiness.active_count', count($enabled)));

        // And the reloaded API still reports cod enabled (consistent state).
        $res = $this->getJson(route('api.store-payments.index', $store->id));
        $res->assertOk();
        $methods = collect($res->json('methods'));
        $this->assertTrue($methods->firstWhere('method', 'cod')['enabled']);
    }

    public function test_active_method_label_is_surfaced_in_readiness(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'manage-cod-payments');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_cod_enabled', '1', $store->id);

        $this->get(route('cod-payments.index'))
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('paymentReadiness.ready', true)
                ->where('paymentReadiness.active_labels', [PaymentProviderCatalog::labelOf('cod')]));
    }

    public function test_explicit_disabled_row_is_not_counted_as_ready(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'manage-cod-payments');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_cod_enabled', '0', $store->id);

        $this->assertCount(0, getEnabledPaymentMethods($user->id, $store->id));

        $this->get(route('cod-payments.index'))
            ->assertOk()
            ->assertInertia($this->hubReadyAssertion(['ready' => false, 'active_count' => 0]));
    }

    public function test_enabled_gateway_without_credentials_still_counts_like_checkout_engine(): void
    {
        // Current backend behavior: an enabled row is what checkout offers — keys are
        // a separate clarity concern, not a validity gate. Readiness must preserve this.
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'settings-stores');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_razorpay_enabled', '1', $store->id);

        $this->assertArrayHasKey('razorpay', getEnabledPaymentMethods($user->id, $store->id));

        $this->get(route('cod-payments.index'))
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('paymentReadiness.ready', true)
                ->where('paymentReadiness.active_count', 1)
                ->where('paymentReadiness.active_labels', [PaymentProviderCatalog::labelOf('razorpay')]));

        // But the method itself is clearly NOT CONFIGURED so the merchant knows
        // the difference between "offered" and "wired".
        $res = $this->getJson(route('api.store-payments.index', $store->id));
        $res->assertOk();
        $razorpay = collect($res->json('methods'))->firstWhere('method', 'razorpay');
        $this->assertTrue($razorpay['enabled']);
        $this->assertFalse($razorpay['configured']);
        $this->assertSame('incomplete', $razorpay['status']);
    }

    // ─────────── Per-method ACTIVE / INACTIVE / NOT-CONFIGURED ───────────

    public function test_api_distinguishes_active_incomplete_inactive(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'settings-stores');

        PaymentSetting::updateOrCreateSetting($user->id, 'is_cod_enabled', '1', $store->id);     // manual → active
        PaymentSetting::updateOrCreateSetting($user->id, 'is_paypal_enabled', '1', $store->id);  // connected, no keys → incomplete
        // razorpay left disabled → inactive

        $res = $this->getJson(route('api.store-payments.index', $store->id));
        $res->assertOk();
        $methods = collect($res->json('methods'));

        $cod = $methods->firstWhere('method', 'cod');
        $this->assertNotNull($cod);
        $this->assertTrue($cod['enabled']);
        $this->assertSame('active', $cod['status']);

        $paypal = $methods->firstWhere('method', 'paypal');
        $this->assertNotNull($paypal);
        $this->assertTrue($paypal['enabled']);
        $this->assertFalse($paypal['configured']);
        $this->assertSame('incomplete', $paypal['status']);

        $razorpay = $methods->firstWhere('method', 'razorpay');
        $this->assertNotNull($razorpay);
        $this->assertFalse($razorpay['enabled']);
        $this->assertSame('inactive', $razorpay['status']);

        // Contract-only partner cards are never presented as connectable.
        $partner = $methods->firstWhere('method', 'bank_of_palestine_gateway');
        $this->assertNotNull($partner);
        $this->assertFalse($partner['configured']);
        $this->assertSame('inactive', $partner['status']);
    }

    public function test_configured_gateway_is_active_and_secret_stays_masked(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'settings-stores');

        $secret = 'sk_test_P2C03_paypal';
        PaymentSetting::updateOrCreateSetting($user->id, 'is_paypal_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'paypal_secret_key', $secret, $store->id);

        $res = $this->getJson(route('api.store-payments.index', $store->id));
        $res->assertOk();
        $paypal = collect($res->json('methods'))->firstWhere('method', 'paypal');

        $this->assertTrue($paypal['enabled']);
        $this->assertTrue($paypal['configured']);
        $this->assertSame('active', $paypal['status']);

        $this->assertStringNotContainsString($secret, $res->getContent());
        $masked = collect($paypal['fields'])->firstWhere('key', 'paypal_secret_key')['value'];
        $this->assertStringStartsWith('••••••••', $masked);
        $this->assertSame('••••••••' . substr($secret, -4), $masked);
    }

    // ─────────── Setup CTA target & store isolation ───────────

    public function test_setup_cta_targets_existing_gated_methods_config(): void
    {
        // The NOT-READY CTA in the UI leads only to the existing methods tab —
        // reachable by settings-capable owners, still blocked for everyone else.
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'settings-stores');
        $this->get(route('cod-payments.index', ['tab' => 'methods']))
            ->assertOk()
            ->assertInertia(fn ($p) => $p
                ->where('tab', 'methods')
                ->where('paymentReadiness.available', true)
                ->where('paymentReadiness.ready', false));

        [$o2, ] = $this->ownerWithStore();
        $this->allow($o2, 'manage-orders');
        $this->get(route('cod-payments.index', ['tab' => 'methods']))->assertStatus(403);
    }

    public function test_readiness_is_store_scoped_and_cross_store_api_blocked(): void
    {
        [$userA, $storeA] = $this->ownerWithStore();
        $this->allow($userA, 'settings-stores');
        PaymentSetting::updateOrCreateSetting($userA->id, 'is_cod_enabled', '1', $storeA->id);

        $this->get(route('cod-payments.index'))
            ->assertOk()
            ->assertInertia(fn ($p) => $p->where('paymentReadiness.ready', true));

        // A second merchant on their own store sees its own (empty) truth.
        [$userB, $storeB] = $this->ownerWithStore();
        $this->allow($userB, 'settings-stores');
        $this->get(route('cod-payments.index'))
            ->assertOk()
            ->assertInertia(fn ($p) => $p->where('paymentReadiness.ready', false));

        // User A can never read B's payment configuration (IDOR guard).
        $this->actingAs($userA);
        $this->getJson(route('api.store-payments.index', $storeB->id))->assertStatus(403);
    }

    public function test_secrets_never_reach_hub_page_or_api(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->allow($user, 'settings-stores');
        $secret = 'sk_test_P2C03_paypal';
        PaymentSetting::updateOrCreateSetting($user->id, 'is_paypal_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'paypal_secret_key', $secret, $store->id);

        $page = $this->get(route('cod-payments.index'));
        $page->assertOk();
        $page->assertInertia(fn ($p) => $p->where('paymentReadiness.ready', true));
        $this->assertStringNotContainsString($secret, $page->getContent());

        $api = $this->getJson(route('api.store-payments.index', $store->id));
        $api->assertOk();
        $this->assertStringNotContainsString($secret, $api->getContent());
    }

    // ─────────── Terminology + readiness copy ───────────

    public function test_canonical_transaction_history_and_readiness_copy(): void
    {
        $source = file_get_contents(resource_path('js/pages/cod-payments/hub.tsx'));

        // Canonical per P2A-01 (ar.json 'Transaction History').
        $this->assertStringContainsString('سجل المعاملات', $source);
        $this->assertStringNotContainsString('سجل العمليات', $source);

        // The two readiness states the merchant must instantaneously see.
        $this->assertStringContainsString('المدفوعات جاهزة', $source);
        $this->assertStringContainsString('إعداد المدفوعات غير مكتمل', $source);
    }
}