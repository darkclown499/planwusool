<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * P0 payment hardening regression tests.
 * Covers: forged callbacks, amount/currency mismatch, cross-store, duplicate idempotency,
 * fail-closed for Nepalste/Paiement/CinetPay, atomic markPaid, AuthorizeNet safe behavior.
 */
class PaymentP0HardeningTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(string $currency = 'ILS'): array
    {
        $plan = Plan::factory()->create(['name' => 'P' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth(), 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'S' . uniqid();
        $store->slug = 's-' . uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 'store@example.com';
        $store->currency = $currency;
        $store->save();
        $user->current_store = $store->id;
        $user->save();

        return [$user->fresh(), $store];
    }

    private function createOrder(Store $store, float $total = 100, string $currency = 'ILS', string $paymentMethod = 'nepalste'): Order
    {
        return Order::forceCreate([
            'order_number' => Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 'sess-' . uniqid(),
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_method' => $paymentMethod,
            'customer_email' => 'c@example.com',
            'customer_phone' => '0599000000',
            'customer_first_name' => 'T',
            'customer_last_name' => 'U',
            'shipping_address' => 'A',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'West Bank',
            'shipping_country' => 'Palestine',
            'billing_address' => 'A',
            'billing_city' => 'Nablus',
            'billing_state' => 'West Bank',
            'billing_country' => 'Palestine',
            'subtotal' => $total,
            'tax_amount' => 0,
            'shipping_amount' => 0,
            'discount_amount' => 0,
            'total_amount' => $total,
            'currency' => $currency,
        ]);
    }

    // -----------------------------------------------------------------
    // Nepalste: fail closed without server verification, amount, currency
    // -----------------------------------------------------------------

    public function test_nepalste_forged_callback_does_not_mark_paid(): void
    {
        [$user, $store] = $this->ownerWithStore('NPR');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_nepalste_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'nepalste_public_key', 'pub_test', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'nepalste_secret_key', 'sec_test', $store->id);

        $order = $this->createOrder($store, 100, 'NPR', 'nepalste');

        // Mock token fetch to fail — verification must fail closed
        Http::fake([
            'nepalste.com.np/*' => Http::response(['error' => 'invalid'], 401),
        ]);

        $response = $this->postJson("http://{$store->slug}.localhost/nepalste/callback/{$order->order_number}", [
            'status' => 'completed',
            'purchase_order_id' => 'plan_1_1_' . time(),
            'amount' => 100,
        ]);

        $response->assertStatus(200);
        $order->refresh();
        $this->assertNotEquals('paid', $order->payment_status, 'forged Nepalste callback must not mark paid without server verification');
    }

    public function test_nepalste_amount_mismatch_does_not_mark_paid(): void
    {
        [$user, $store] = $this->ownerWithStore('NPR');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_nepalste_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'nepalste_public_key', 'pub_test', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'nepalste_secret_key', 'sec_test', $store->id);
        $order = $this->createOrder($store, 100, 'NPR', 'nepalste');

        // Server returns amount 1 while order is 100 — should fail
        Http::fake([
            'nepalste.com.np/pay/sandbox/api/v1/access-token' => Http::response(['token' => 'tok123'], 200),
            'nepalste.com.np/*' => Http::response(['status' => 'completed', 'amount' => 1], 200),
        ]);

        $response = $this->postJson("http://{$store->slug}.localhost/nepalste/callback/{$order->order_number}", [
            'status' => 'completed',
            'purchase_order_id' => 'po_' . uniqid(),
            'amount' => 1,
        ]);

        $order->refresh();
        $this->assertNotEquals('paid', $order->payment_status, 'amount mismatch must not mark paid');
    }

    // -----------------------------------------------------------------
    // Paiement: fail closed, amount required, currency check
    // -----------------------------------------------------------------

    public function test_paiement_missing_amount_does_not_mark_paid(): void
    {
        [$user, $store] = $this->ownerWithStore('XOF');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_paiement_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'paiement_merchant_id', 'mid_test', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'paiement_merchant_secret', 'sec_test', $store->id);

        $order = $this->createOrder($store, 5000, 'XOF', 'paiement');

        // No amount field — must fail closed
        $response = $this->postJson("http://{$store->slug}.localhost/paiement/callback/{$order->order_number}", [
            'status' => 'success',
            'reference' => 'ref_' . uniqid(),
        ]);

        $order->refresh();
        $this->assertNotEquals('paid', $order->payment_status, 'missing amount must fail closed');
    }

    public function test_paiement_amount_mismatch_does_not_mark_paid(): void
    {
        [$user, $store] = $this->ownerWithStore('XOF');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_paiement_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'paiement_merchant_id', 'mid_test', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'paiement_merchant_secret', 'sec_test', $store->id);

        $order = $this->createOrder($store, 5000, 'XOF', 'paiement');

        $response = $this->postJson("http://{$store->slug}.localhost/paiement/callback/{$order->order_number}", [
            'status' => 'success',
            'reference' => 'ref_' . uniqid(),
            'amount' => 1,
        ]);

        $order->refresh();
        $this->assertNotEquals('paid', $order->payment_status, 'amount mismatch must not mark paid');
    }

    public function test_paiement_forged_status_does_not_mark_paid(): void
    {
        [$user, $store] = $this->ownerWithStore('XOF');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_paiement_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'paiement_merchant_id', 'mid_test', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'paiement_merchant_secret', 'sec_test', $store->id);

        $order = $this->createOrder($store, 5000, 'XOF', 'paiement');

        $response = $this->postJson("http://{$store->slug}.localhost/paiement/callback/{$order->order_number}", [
            'status' => 'failed',
            'reference' => 'ref_' . uniqid(),
            'amount' => 5000,
        ]);

        $order->refresh();
        $this->assertNotEquals('paid', $order->payment_status);
    }

    // -----------------------------------------------------------------
    // CinetPay: fail closed without api_key, server verification
    // -----------------------------------------------------------------

    public function test_cinetpay_without_api_key_fails_closed(): void
    {
        [$user, $store] = $this->ownerWithStore('XOF');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_cinetpay_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'cinetpay_site_id', 'site123', $store->id);
        // No api_key set — must fail closed

        $order = $this->createOrder($store, 1000, 'XOF', 'cinetpay');

        $response = $this->postJson("http://{$store->slug}.localhost/cinetpay/callback/{$order->order_number}", [
            'cpm_result' => '00',
            'cpm_trans_id' => 'trans_' . uniqid(),
            'cpm_amount' => 1000,
            'cpm_currency' => 'XOF',
        ]);

        $order->refresh();
        $this->assertNotEquals('paid', $order->payment_status, 'CinetPay without api_key must fail closed');
    }

    public function test_cinetpay_amount_mismatch_does_not_mark_paid(): void
    {
        [$user, $store] = $this->ownerWithStore('XOF');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_cinetpay_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'cinetpay_site_id', 'site123', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'cinetpay_api_key', 'key123', $store->id);
        $order = $this->createOrder($store, 1000, 'XOF', 'cinetpay');

        Http::fake([
            'api-checkout.cinetpay.com/*' => Http::response(['code' => '00', 'data' => ['amount' => 1, 'currency' => 'XOF']], 200),
        ]);

        $response = $this->postJson("http://{$store->slug}.localhost/cinetpay/callback/{$order->order_number}", [
            'cpm_result' => '00',
            'cpm_trans_id' => 'trans_' . uniqid(),
            'cpm_amount' => 1,
            'cpm_currency' => 'XOF',
        ]);

        $order->refresh();
        $this->assertNotEquals('paid', $order->payment_status, 'CinetPay amount mismatch must not mark paid');
    }

    public function test_cinetpay_valid_server_verification_marks_paid(): void
    {
        [$user, $store] = $this->ownerWithStore('XOF');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_cinetpay_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'cinetpay_site_id', 'site123', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'cinetpay_api_key', 'key123', $store->id);
        $order = $this->createOrder($store, 1000, 'XOF', 'cinetpay');

        Http::fake([
            'api-checkout.cinetpay.com/*' => Http::response(['code' => '00', 'data' => ['amount' => 1000, 'currency' => 'XOF']], 200),
        ]);

        $tx = 'trans_' . uniqid();
        $response = $this->postJson("http://{$store->slug}.localhost/cinetpay/callback/{$order->order_number}", [
            'cpm_result' => '00',
            'cpm_trans_id' => $tx,
            'cpm_amount' => 1000,
            'cpm_currency' => 'XOF',
        ]);

        $order->refresh();
        $this->assertEquals('paid', $order->payment_status, 'valid CinetPay server verification must mark paid');
        $this->assertEquals($tx, $order->payment_transaction_id);
    }

    // -----------------------------------------------------------------
    // Currency verification
    // -----------------------------------------------------------------

    public function test_currency_mismatch_does_not_mark_paid(): void
    {
        // Order is USD but gateway is XOF-only — should fail
        [$user, $store] = $this->ownerWithStore('USD');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_cinetpay_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'cinetpay_site_id', 'site123', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'cinetpay_api_key', 'key123', $store->id);

        // Order currency USD is not supported by CinetPay (XOF only)
        $order = $this->createOrder($store, 1000, 'USD', 'cinetpay');

        Http::fake([
            'api-checkout.cinetpay.com/*' => Http::response(['code' => '00', 'data' => ['amount' => 1000, 'currency' => 'XOF']], 200),
        ]);

        $response = $this->postJson("http://{$store->slug}.localhost/cinetpay/callback/{$order->order_number}", [
            'cpm_result' => '00',
            'cpm_trans_id' => 'trans_' . uniqid(),
            'cpm_amount' => 1000,
            'cpm_currency' => 'XOF',
        ]);

        $order->refresh();
        $this->assertNotEquals('paid', $order->payment_status, 'currency mismatch must not mark paid');
    }

    // -----------------------------------------------------------------
    // Cross-store isolation
    // -----------------------------------------------------------------

    public function test_cross_store_order_resolution_blocked(): void
    {
        [$userA, $storeA] = $this->ownerWithStore('XOF');
        [$userB, $storeB] = $this->ownerWithStore('XOF');

        PaymentSetting::updateOrCreateSetting($userA->id, 'is_paiement_enabled', '1', $storeA->id);
        PaymentSetting::updateOrCreateSetting($userA->id, 'paiement_merchant_id', 'mid_test', $storeA->id);
        PaymentSetting::updateOrCreateSetting($userA->id, 'paiement_merchant_secret', 'sec_test', $storeA->id);

        PaymentSetting::updateOrCreateSetting($userB->id, 'is_paiement_enabled', '1', $storeB->id);
        PaymentSetting::updateOrCreateSetting($userB->id, 'paiement_merchant_id', 'mid_test', $storeB->id);
        PaymentSetting::updateOrCreateSetting($userB->id, 'paiement_merchant_secret', 'sec_test', $storeB->id);

        $orderA = $this->createOrder($storeA, 5000, 'XOF', 'paiement');

        // Attacker tries to use storeB's slug with orderA's order_number
        $response = $this->postJson("http://{$storeB->slug}.localhost/paiement/callback/{$orderA->order_number}", [
            'status' => 'success',
            'reference' => 'ref_' . uniqid(),
            'amount' => 5000,
        ]);

        $orderA->refresh();
        $this->assertNotEquals('paid', $orderA->payment_status, 'cross-store callback must not mark paid');
        // Should be 404 or not paid — either is safe
        $this->assertTrue($response->status() === 404 || $orderA->payment_status !== 'paid');
    }

    // -----------------------------------------------------------------
    // Duplicate / idempotency
    // -----------------------------------------------------------------

    public function test_duplicate_callback_is_idempotent(): void
    {
        [$user, $store] = $this->ownerWithStore('XOF');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_cinetpay_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'cinetpay_site_id', 'site123', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'cinetpay_api_key', 'key123', $store->id);
        $order = $this->createOrder($store, 1000, 'XOF', 'cinetpay');

        Http::fake([
            'api-checkout.cinetpay.com/*' => Http::response(['code' => '00', 'data' => ['amount' => 1000, 'currency' => 'XOF']], 200),
        ]);

        $tx = 'trans_dup_' . uniqid();
        $payload = [
            'cpm_result' => '00',
            'cpm_trans_id' => $tx,
            'cpm_amount' => 1000,
            'cpm_currency' => 'XOF',
        ];

        $this->postJson("http://{$store->slug}.localhost/cinetpay/callback/{$order->order_number}", $payload);
        $order->refresh();
        $this->assertEquals('paid', $order->payment_status);
        $firstTx = $order->payment_transaction_id;

        // Second identical callback should be idempotent — no change
        $this->postJson("http://{$store->slug}.localhost/cinetpay/callback/{$order->order_number}", $payload);
        $order->refresh();
        $this->assertEquals('paid', $order->payment_status);
        $this->assertEquals($firstTx, $order->payment_transaction_id, 'duplicate must not alter transaction id');
    }

    public function test_mark_paid_is_atomic(): void
    {
        // Simulate already paid order — second callback should not re-process
        [$user, $store] = $this->ownerWithStore('XOF');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_paiement_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'paiement_merchant_id', 'mid_test', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'paiement_merchant_secret', 'sec_test', $store->id);

        $order = $this->createOrder($store, 5000, 'XOF', 'paiement');
        // Manually mark paid
        $order->update(['payment_status' => 'paid', 'status' => 'confirmed', 'payment_transaction_id' => 'tx_existing']);

        $response = $this->postJson("http://{$store->slug}.localhost/paiement/callback/{$order->order_number}", [
            'status' => 'success',
            'reference' => 'tx_new_' . uniqid(),
            'amount' => 5000,
        ]);

        $order->refresh();
        $this->assertEquals('tx_existing', $order->payment_transaction_id, 'atomic markPaid must not overwrite existing paid transaction');
    }

    // -----------------------------------------------------------------
    // Secret mapping: paiement must use paiement_merchant_secret, not cinetpay_secret_key
    // -----------------------------------------------------------------

    public function test_paiement_uses_correct_secret_mapping(): void
    {
        // If middleware still mapped to cinetpay_secret_key, this would fail to resolve correctly
        $middleware = new \App\Http\Middleware\VerifyWebhookSignature();
        $ref = new \ReflectionClass($middleware);
        $prop = $ref->getProperty('settingsSecretKeys');
        $prop->setAccessible(true);
        $map = $prop->getValue();
        $this->assertEquals('paiement_merchant_secret', $map['paiement'], 'paiement must map to paiement_merchant_secret');
        $this->assertEquals('cinetpay_secret_key', $map['cinetpay']);
    }

    // -----------------------------------------------------------------
    // AuthorizeNet safe callback: forged transId without server verification must not mark paid
    // -----------------------------------------------------------------

    public function test_authorizenet_forged_transid_does_not_mark_paid(): void
    {
        [$user, $store] = $this->ownerWithStore('USD');
        PaymentSetting::updateOrCreateSetting($user->id, 'is_authorizenet_enabled', '1', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'authorizenet_merchant_id', 'mid_test', $store->id);
        PaymentSetting::updateOrCreateSetting($user->id, 'authorizenet_transaction_key', 'key_test', $store->id);

        $order = $this->createOrder($store, 50, 'USD', 'authorizenet');

        // No real Authorize.Net SDK call will succeed with fake transId — verify should fail
        $response = $this->postJson("http://{$store->slug}.localhost/authorizenet/callback/{$order->order_number}", [
            'transId' => 'forged_' . uniqid(),
        ]);

        $order->refresh();
        $this->assertNotEquals('paid', $order->payment_status, 'forged AuthorizeNet transId must not mark paid');
    }
}
