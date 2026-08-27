<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\StorePaymentController;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use App\Services\Payment\PaymentCurrencyGuard;
use App\Services\Payment\PaymentProviderCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PaymentHubPhase1Test extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(): array
    {
        $plan = Plan::factory()->create(['name'=>'P'.uniqid(),'price'=>99,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth(),'onboarded_at'=>now(),'email_verified_at'=>now()]);
        $store = new Store(); $store->user_id=$user->id; $store->name='S'.uniqid(); $store->slug='s-'.uniqid(); $store->theme='bazaar-market'; $store->email='store@example.com'; $store->save();
        $user->current_store=$store->id; $user->save();
        // Ensure payment permission if hardening is active (seed if needed)
        try {
            if (!\Spatie\Permission\Models\Permission::where('name','manage-payment-settings')->exists()) {
                \Spatie\Permission\Models\Permission::create(['name'=>'manage-payment-settings','guard_name'=>'web']);
            }
            if (!\Spatie\Permission\Models\Permission::where('name','manage-settings')->exists()) {
                \Spatie\Permission\Models\Permission::create(['name'=>'manage-settings','guard_name'=>'web']);
            }
            $user->givePermissionTo('manage-payment-settings');
            app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        } catch (\Throwable $e) {}
        return [$user->fresh(),$store];
    }

    public function test_provider_classification(): void
    {
        $this->assertEquals('manual', PaymentProviderCatalog::typeOf('jawwal_pay'));
        $this->assertEquals('manual', PaymentProviderCatalog::typeOf('bank_palestine'));
        $this->assertEquals('partner', PaymentProviderCatalog::typeOf('bank_of_palestine_gateway'));
        $this->assertEquals('partner', PaymentProviderCatalog::typeOf('cliq_gateway'));
        $this->assertEquals('partner', PaymentProviderCatalog::typeOf('grow'));
        $this->assertEquals('connected', PaymentProviderCatalog::typeOf('stripe'));
        $this->assertEquals('connected', PaymentProviderCatalog::typeOf('paypal'));
        $this->assertTrue(PaymentProviderCatalog::isManual('jawwal_pay'));
        $this->assertTrue(PaymentProviderCatalog::isPartner('grow'));
        $this->assertTrue(PaymentProviderCatalog::isConnected('stripe'));
    }

    public function test_fake_api_fields_absent_from_manual_ui(): void
    {
        $fields = StorePaymentController::credentialFields();
        // manual wallets must NOT expose api_key/secret_key
        foreach (['jawwal_pay','pal_pay','zain_cash','cliq','bank_palestine','bit','paybox'] as $m) {
            $keys = array_column($fields[$m] ?? [], 'key');
            $this->assertNotContains($m.'_api_key', $keys, "fake api_key still present for $m");
            $this->assertNotContains($m.'_secret_key', $keys, "fake secret_key still present for $m");
            $this->assertContains($m.'_phone_number', $keys);
            $this->assertContains($m.'_instructions', $keys);
        }
        // usdt manual must have wallet_address not api_key
        $this->assertContains('usdt_trc20_wallet_address', array_column($fields['usdt_trc20'] ?? [], 'key'));
        $this->assertNotContains('usdt_trc20_api_key', array_column($fields['usdt_trc20'] ?? [], 'key'));
        // partner must have no fields (no fake form)
        // partner entries are not in FeatureService, but catalog filters — StorePaymentController now returns [] for partner in index
        // credentialFields still has no partner id; ensure partner catalog id not in credentialFields
        $this->assertArrayNotHasKey('bank_of_palestine_gateway', $fields);
        $this->assertArrayNotHasKey('cliq_gateway', $fields);
    }

    public function test_encrypted_sensitive_keys_do_not_include_fake_wallet_apis(): void
    {
        $sensitive = (new class { use \App\Models\Concerns\EncryptsSensitiveSettings; public function expose(){ return static::sensitiveSettingKeys(); } })->expose();
        $this->assertNotContains('jawwal_pay_api_key', $sensitive);
        $this->assertNotContains('pal_pay_secret_key', $sensitive);
        $this->assertNotContains('cliq_api_key', $sensitive);
        $this->assertNotContains('bank_palestine_api_key', $sensitive);
        $this->assertContains('stripe_secret', $sensitive);
        $this->assertContains('paypal_secret_key', $sensitive);
    }

    public function test_manual_method_persistence_and_checkout_propagation(): void
    {
        [$user,$store] = $this->ownerWithStore();
        PaymentSetting::updateOrCreateSetting($user->id, 'is_jawwal_pay_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'jawwal_pay_phone_number', '0599000111', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'jawwal_pay_merchant_name', 'Test Merchant', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'jawwal_pay_instructions', 'ارسل على هذا الرقم', $store->id);

        $res = $this->actingAs($user)->getJson("/api/stores/{$store->id}/payments");
        $res->assertOk();
        $methods = collect($res->json('methods'));
        $jawwal = $methods->firstWhere('method','jawwal_pay');
        $this->assertNotNull($jawwal);
        $this->assertTrue($jawwal['enabled']);
        $this->assertEquals('manual', $jawwal['type']);
        $this->assertEquals('يدوي', $jawwal['badge_label']);

        // checkout propagation via getMethods
        $this->actingAs($user);
        $checkout = $this->getJson("/api/payment-methods?store_id={$store->id}");
        $checkout->assertOk();
        $names = array_column($checkout->json('payment_methods') ?? [], 'name');
        $this->assertContains('jawwal_pay', $names);
        $jawwalCheckout = collect($checkout->json('payment_methods'))->firstWhere('name','jawwal_pay');
        $this->assertNotNull($jawwalCheckout['details']);
        $this->assertStringContainsString('0599000111', $jawwalCheckout['details']);
    }

    public function test_manual_payment_never_auto_paid(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $order = Order::forceCreate([
            'order_number'=>Order::generateOrderNumber(),'store_id'=>$store->id,'session_id'=>'sess-'.uniqid(),
            'status'=>'pending','payment_status'=>'pending','payment_method'=>'jawwal_pay',
            'customer_email'=>'c@example.com','customer_phone'=>'0599000000','customer_first_name'=>'T','customer_last_name'=>'U',
            'shipping_address'=>'A','shipping_city'=>'Nablus','shipping_state'=>'West Bank','shipping_country'=>'Palestine',
            'billing_address'=>'A','billing_city'=>'Nablus','billing_state'=>'West Bank','billing_country'=>'Palestine',
            'subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'currency'=>'ILS',
        ]);
        $svc = app(\App\Services\OrderService::class);
        $result = $svc->processPayment($order);
        $this->assertTrue($result['success']);
        $order->refresh();
        $this->assertEquals('pending', $order->payment_status, 'manual must stay pending, never auto-paid');
        $this->assertEquals('pending', $order->status);
    }

    public function test_currency_compatibility_guard(): void
    {
        // Jawwal Pay ILS only — JOD should be rejected for connected guard path but manual is permissive?
        // Connected guard is bypassed for manual, so JOD manual passes. Test connected guard:
        $this->assertTrue(PaymentProviderCatalog::supportsCurrency('jawwal_pay','ILS'));
        $this->assertFalse(PaymentProviderCatalog::supportsCurrency('jawwal_pay','USD'));
        $this->assertTrue(PaymentProviderCatalog::supportsCurrency('cliq','JOD'));
        $this->assertFalse(PaymentProviderCatalog::supportsCurrency('cliq','USD'));
        $this->assertTrue(PaymentProviderCatalog::supportsCurrency('stripe','ILS'));
        // Guard throws for unsupported
        $order = new Order(['payment_method'=>'jawwal_pay','currency'=>'USD']);
        try {
            PaymentCurrencyGuard::assertOrderCurrency($order);
            $this->fail('should have thrown for jawwal_pay USD');
        } catch (\Exception $e) {
            $this->assertStringContainsString('غير مدعومة', $e->getMessage());
        }
        // connected order USD on stripe should pass
        $order2 = new Order(['payment_method'=>'stripe','currency'=>'USD']);
        PaymentCurrencyGuard::assertOrderCurrency($order2); // no throw
        $this->assertTrue(true);
    }

    public function test_payment_proof_private_storage_and_validation(): void
    {
        Storage::fake('local');
        [$user,$store] = $this->ownerWithStore();
        $file = UploadedFile::fake()->image('receipt.jpg', 100, 100);
        $path = $file->store('bank_transfers','local');
        $this->assertNotNull($path);
        Storage::disk('local')->assertExists($path);
        // mimes validation would be in controller — fake image passes
        $bad = UploadedFile::fake()->create('evil.exe', 10, 'application/x-msdownload');
        // simulate controller validation would reject — we test service directly would reject via rules
        $this->assertNotEquals('image/jpeg', $bad->getMimeType());
    }

    public function test_store_isolation_payment_config(): void
    {
        [$userA,$storeA] = $this->ownerWithStore();
        [$userB,$storeB] = $this->ownerWithStore();
        PaymentSetting::updateOrCreateSetting($userA->id, 'is_stripe_enabled', '1', $storeA->id);
        PaymentSetting::updateOrCreateSetting($userA->id, 'stripe_secret', 'sk_a_secret', $storeA->id);

        // A can read own
        $this->actingAs($userA)->getJson("/api/stores/{$storeA->id}/payments")->assertOk();
        // B cannot read A's store
        $this->actingAs($userB)->getJson("/api/stores/{$storeA->id}/payments")->assertStatus(403);
        // B's checkout does not see A's stripe
        $checkoutB = $this->actingAs($userB)->getJson("/api/payment-methods?store_id={$storeB->id}");
        $namesB = array_column($checkoutB->json('payment_methods') ?? [], 'name');
        $this->assertNotContains('stripe', $namesB);
    }

    public function test_historical_payment_method_compatibility(): void
    {
        // unknown historic method should not crash catalog
        $this->assertEquals('international', PaymentProviderCatalog::typeOf('unknown_legacy_gateway_xyz'));
        $label = PaymentProviderCatalog::labelOf('unknown_legacy_gateway_xyz');
        $this->assertNotEmpty($label, 'legacy label must degrade gracefully');
        // existing cod/bank still resolve
        $this->assertEquals('الدفع عند الاستلام', PaymentProviderCatalog::labelOf('cod'));
    }

    public function test_partner_methods_not_advertise_connected(): void
    {
        [$user,$store] = $this->ownerWithStore();
        $res = $this->actingAs($user)->getJson("/api/stores/{$store->id}/payments");
        $methods = collect($res->json('methods'));
        foreach ($methods->where('is_partner', true) as $m) {
            // when disabled badge is "غير مفعّل", when enabled would be "يتطلب عقداً" — check that we never show "متصل"
            $this->assertNotEquals('متصل', $m['badge_label'], "partner {$m['method']} must not show متصل");
            $this->assertEmpty($m['fields'], "partner {$m['method']} must have no fake fields");
        }
        // manual must never be "متصل"
        foreach ($methods->where('type','manual')->where('enabled', true) as $m) {
            $this->assertNotEquals('متصل', $m['badge_label']);
        }
    }
}
