<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Launch blocker P1-5 (Skrill secret word): the store Skrill callback must
 * FAIL CLOSED when the store's skrill_secret_word is missing, empty, or
 * whitespace-only. Today the signature is computed against md5('') which lets
 * an attacker who knows the store has no usable secret forge a "valid" IPN.
 *
 * Contract after the fix:
 *  - authoritative store -> store-bound skrill config -> non-empty secret Word
 *    -> only then signature verification;
 *  - null / '' / whitespace secret_word -> fail closed before any order or
 *    payment mutation (response stays "OK" so Skrill stops retrying);
 *  - invalid signatures stay rejected;
 *  - wrong-store credentials cannot validate against the order's store;
 *  - valid callbacks remain idempotent.
 *
 * These tests exercise the REAL route through the REAL middleware stack via
 * postJson() on the {slug}.localhost host, mirroring
 * LaunchBlockerPaymentCallbackReachabilityTest.
 */
class LaunchBlockerSkrillSecretWordTest extends TestCase
{
    use RefreshDatabase;

    private function makePlan(): Plan
    {
        return Plan::factory()->create([
            'name' => 'SkrillSecret-' . uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_stores' => 10,
            'max_products_per_store' => 100,
            'max_users_per_store' => 20,
        ]);
    }

    private function company(): User
    {
        $plan = $this->makePlan();
        return User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addYear(),
            'plan_is_active' => 1,
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
    }

    private function makeStore(User $owner): Store
    {
        $store = Store::factory()->create(['user_id' => $owner->id])->fresh();
        StoreConfiguration::setConfiguration($store->id, 'store_status', 'true');
        return $store->fresh();
    }

    private function makeOrder(Store $store, string $paymentTransactionId, float $total = 99.99): Order
    {
        $order = new Order([
            'customer_email' => 'skrill-buyer@example.com',
            'customer_first_name' => 'Noor',
            'customer_last_name' => 'Hassan',
            'shipping_address' => 'Main St 1',
            'shipping_city' => 'Amman',
            'shipping_state' => 'Amman',
            'shipping_country' => 'JO',
            'billing_address' => 'Main St 1',
            'billing_city' => 'Amman',
            'billing_state' => 'Amman',
            'billing_country' => 'JO',
            'subtotal' => $total,
            'total_amount' => $total,
            'payment_method' => 'skrill',
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_transaction_id' => $paymentTransactionId,
        ]);
        $order->store_id = $store->id;
        $order->order_number = 'ORD-' . Str::uuid();
        $order->save();

        return $order->fresh();
    }

    private function storeSkrillMerchantId(Store $store, string $merchantId): void
    {
        PaymentSetting::updateOrCreateSetting($store->user_id, 'skrill_merchant_id', $merchantId, $store->id);
    }

    private function storeSkrillConfig(Store $store, string $merchantId, string $secretWord): void
    {
        PaymentSetting::updateOrCreateSetting($store->user_id, 'skrill_merchant_id', $merchantId, $store->id);
        PaymentSetting::updateOrCreateSetting($store->user_id, 'skrill_secret_word', $secretWord, $store->id);
    }

    private function subdomainUrl(Store $store, string $path): string
    {
        return 'http://' . $store->slug . '.localhost' . $path;
    }

    private function skrillSignature(string $merchantId, string $transactionId, string $secretWord, string $amount, string $currency, string $status): string
    {
        $concat = $merchantId
            . $transactionId
            . strtoupper(md5($secretWord))
            . $amount
            . $currency
            . $status;
        return strtoupper(md5($concat));
    }

    private function ipn(Store $store, Order $order, string $merchantId, string $secretWord, float $amount, string $status = '2'): \Illuminate\Testing\TestResponse
    {
        return $this->postJson($this->subdomainUrl($store, '/skrill/callback'), [
            'merchant_id' => $merchantId,
            'transaction_id' => $order->payment_transaction_id,
            'mb_amount' => number_format($amount, 2, '.', ''),
            'mb_currency' => 'USD',
            'status' => $status,
            'md5sig' => $this->skrillSignature($merchantId, $order->payment_transaction_id, $secretWord, number_format($amount, 2, '.', ''), 'USD', $status),
        ]);
    }

    public function test_valid_secret_word_and_signature_marks_order_paid(): void
    {
        $store = $this->makeStore($this->company());
        $this->storeSkrillConfig($store, 'mer_secret_ok', 'super-secret-word');
        $order = $this->makeOrder($store, 'trx_secret_ok');

        $res = $this->ipn($store, $order, 'mer_secret_ok', 'super-secret-word', 99.99);

        $res->assertOk();
        $this->assertSame('OK', trim($res->getContent()));
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame('confirmed', $order->fresh()->status);
    }

    public function test_missing_secret_word_fails_closed(): void
    {
        $store = $this->makeStore($this->company());
        $this->storeSkrillMerchantId($store, 'mer_secret_missing');
        $order = $this->makeOrder($store, 'trx_secret_missing');
        $before = $order->fresh();

        // Attacker signs with the empty secret -> md5('') vector.
        $res = $this->ipn($store, $order, 'mer_secret_missing', '', 99.99);

        $res->assertOk();
        $this->assertSame('OK', trim($res->getContent()));
        $this->assertNoOrderMutation($order, $before);
    }

    public function test_empty_secret_word_fails_closed(): void
    {
        $store = $this->makeStore($this->company());
        $this->storeSkrillConfig($store, 'mer_secret_empty', '');
        $order = $this->makeOrder($store, 'trx_secret_empty');
        $before = $order->fresh();

        $res = $this->ipn($store, $order, 'mer_secret_empty', '', 99.99);

        $res->assertOk();
        $this->assertSame('OK', trim($res->getContent()));
        $this->assertNoOrderMutation($order, $before);
    }

    public function test_whitespace_secret_word_fails_closed(): void
    {
        $store = $this->makeStore($this->company());
        $this->storeSkrillConfig($store, 'mer_secret_space', '   ');
        $order = $this->makeOrder($store, 'trx_secret_space');
        $before = $order->fresh();

        $res = $this->ipn($store, $order, 'mer_secret_space', '   ', 99.99);

        $res->assertOk();
        $this->assertSame('OK', trim($res->getContent()));
        $this->assertNoOrderMutation($order, $before);
    }

    public function test_invalid_signature_is_rejected(): void
    {
        $store = $this->makeStore($this->company());
        $this->storeSkrillConfig($store, 'mer_secret_bad', 'real-secret');
        $order = $this->makeOrder($store, 'trx_secret_bad');
        $before = $order->fresh();

        // Signed with the wrong secret -> must never mark paid.
        $res = $this->ipn($store, $order, 'mer_secret_bad', 'attacker-secret', 99.99);

        $res->assertOk();
        $this->assertSame('OK', trim($res->getContent()));
        $this->assertNoOrderMutation($order, $before);
    }

    public function test_failed_guard_causes_no_order_mutation(): void
    {
        $store = $this->makeStore($this->company());
        $this->storeSkrillMerchantId($store, 'mer_secret_nomut');
        $order = $this->makeOrder($store, 'trx_secret_nomut');
        $before = $order->fresh();

        $res = $this->ipn($store, $order, 'mer_secret_nomut', '', 99.99);

        $res->assertOk();
        $this->assertNoOrderMutation($order, $before);
    }

    public function test_wrong_store_credentials_cannot_validate(): void
    {
        $owner = $this->company();
        $storeA = $this->makeStore($owner);
        $storeB = $this->makeStore($owner);
        $this->storeSkrillConfig($storeA, 'mer_A', 'secret-A');
        $this->storeSkrillConfig($storeB, 'mer_B', 'secret-B');
        $orderB = $this->makeOrder($storeB, 'trx_secret_cross');
        $before = $orderB->fresh();

        // Attacker posts store A's merchant + secret on store B's subdomain
        // for store B's order -> the order's store config must reject it.
        $res = $this->ipn($storeB, $orderB, 'mer_A', 'secret-A', 99.99);

        $res->assertOk();
        $this->assertSame('OK', trim($res->getContent()));
        $this->assertNoOrderMutation($orderB, $before);
    }

    public function test_valid_callback_is_idempotent(): void
    {
        $store = $this->makeStore($this->company());
        $this->storeSkrillConfig($store, 'mer_secret_idem', 'idempotent-secret');
        $order = $this->makeOrder($store, 'trx_secret_idem');

        $first = $this->ipn($store, $order, 'mer_secret_idem', 'idempotent-secret', 99.99);
        $first->assertOk();
        $this->assertSame('paid', $order->fresh()->payment_status);

        // Duplicate IPN from Skrill retries must stay OK and idempotent.
        $second = $this->ipn($store, $order, 'mer_secret_idem', 'idempotent-secret', 99.99);
        $second->assertOk();
        $this->assertSame('OK', trim($second->getContent()));
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame('confirmed', $order->fresh()->status);
    }

    private function assertNoOrderMutation(Order $order, Order $before): void
    {
        $now = $order->fresh();
        $this->assertSame('pending', $now->payment_status);
        $this->assertSame('pending', $now->status);
        $this->assertEquals($before->updated_at, $now->updated_at, 'order must not be touched by a failed guard');
    }
}