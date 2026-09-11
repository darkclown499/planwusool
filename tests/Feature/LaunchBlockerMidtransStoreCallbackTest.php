<?php

namespace Tests\Feature;

use App\Http\Controllers\Store\MidtransController;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Launch blocker P1-3: the store-level Midtrans callback must fail CLOSED.
 *
 * Vulnerable shape identified: when no server key is configured for the
 * order's store, `$serverKey` is '' so BOTH the `if ($serverKey && ...)` and
 * `elseif ($serverKey)` branches are skipped -> signature verification is
 * skipped entirely and a forged `transaction_status=capture` callback marks
 * the order paid with zero authentication.
 *
 * Required contract (mirrors the plan-level MidtransPaymentController):
 *  - resolve the authoritative store config (order's own store, store-bound);
 *  - empty server key -> 503 "Midtrans not configured" (never skip the check);
 *  - missing signature fields -> 403;
 *  - invalid signature -> 403 (hash_equals against the store key);
 *  - no global/default/other-store secret fallback;
 *  - amount verification + pending-only idempotency preserved.
 *
 * NOTE: the callback is invoked directly on the controller (instead of via
 * the store subdomain HTTP route) because DomainResolver currently 404s
 * unlisted store subdomain paths before the router can dispatch them. This
 * is a separate pre-existing reachability defect; the method under test here
 * is the signature / amount enforcement itself.
 */
class LaunchBlockerMidtransStoreCallbackTest extends TestCase
{
    use RefreshDatabase;

    private const SERVER_KEY = 'STORE-server-key-123';

    private function makePlan(): Plan
    {
        return Plan::factory()->create([
            'name' => 'Block-' . uniqid(),
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
        return Store::factory()->create(['user_id' => $owner->id])->fresh();
    }

    private function makeOrder(Store $store, string $paymentTransactionId, float $total = 100.0): Order
    {
        $order = new Order([
            'customer_email' => 'buyer@example.com',
            'customer_first_name' => 'Sara',
            'customer_last_name' => 'Ali',
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
            'payment_method' => 'midtrans',
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_transaction_id' => $paymentTransactionId,
        ]);
        $order->store_id = $store->id;
        $order->order_number = 'ORD-' . Str::uuid();
        $order->save();

        return $order->fresh();
    }

    private function storePrivateKey(Store $store, string $key): void
    {
        PaymentSetting::updateOrCreateSetting($store->user_id, 'midtrans_secret_key', $key, $store->id);
    }

    private function signature(string $orderId, string $statusCode, string $grossAmount, string $key): string
    {
        return hash('sha512', $orderId . $statusCode . $grossAmount . $key);
    }

    private function callCallback(Store $store, array $payload)
    {
        $request = Request::create(
            'http://' . $store->slug . '.localhost/midtrans/callback',
            'POST',
            $payload,
            [],
            [],
            ['HTTP_HOST' => $store->slug . '.localhost']
        );

        return app(MidtransController::class)->callback($request);
    }

    private function assertCallbackStatus($response, int $expected, string $message = ''): void
    {
        $this->assertSame($expected, $response->getStatusCode(), $message);
    }

    private function assertPending(Order $order): void
    {
        $fresh = $order->fresh();
        $this->assertSame('pending', $fresh->payment_status, 'order must remain pending');
        $this->assertSame('pending', $fresh->status, 'order status must remain pending');
    }

    // -----------------------------------------------------------------
    // Fail closed when no server key is configured (the vulnerable shape)
    // -----------------------------------------------------------------

    public function test_webhook_without_server_key_rejects_unsigned_forge(): void
    {
        $store = $this->makeStore($this->company());
        $order = $this->makeOrder($store, 'trx_forge_nokey_111');

        $response = $this->callCallback($store, [
            'order_id' => 'trx_forge_nokey_111',
            'transaction_status' => 'capture',
            'status_code' => '200',
            'gross_amount' => '100',
        ]);

        $this->assertTrue(
            $response->status() === 503 || $response->status() === 403,
            vsprintf('Expected fail-closed (503/403), got %d: %s', [
                $response->status(),
                $response->getContent(),
            ])
        );
        $this->assertPending($order);
    }

    public function test_webhook_without_server_key_rejects_signature_signed_with_wrong_key(): void
    {
        $store = $this->makeStore($this->company());
        $order = $this->makeOrder($store, 'trx_forge_nokey_222');

        // Attacker signs with a made-up key; the store has no key configured.
        // The callback must NOT fall back to any secret or skip verification.
        $response = $this->callCallback($store, [
            'order_id' => 'trx_forge_nokey_222',
            'transaction_status' => 'capture',
            'status_code' => '200',
            'gross_amount' => '100',
            'signature_key' => $this->signature('trx_forge_nokey_222', '200', '100', 'attacker-key'),
        ]);

        $this->assertTrue(
            $response->status() === 503 || $response->status() === 403,
            vsprintf('Expected fail-closed (503/403), got %d: %s', [
                $response->status(),
                $response->getContent(),
            ])
        );
        $this->assertPending($order);
    }

    public function test_webhook_without_server_key_rejects_junk_signature(): void
    {
        $store = $this->makeStore($this->company());
        $order = $this->makeOrder($store, 'trx_forge_nokey_333');

        $response = $this->callCallback($store, [
            'order_id' => 'trx_forge_nokey_333',
            'transaction_status' => 'settlement',
            'status_code' => '200',
            'gross_amount' => '100',
            'signature_key' => str_repeat('deadbeef', 8),
        ]);

        $this->assertTrue(
            $response->status() === 503 || $response->status() === 403,
            vsprintf('Expected fail-closed (503/403), got %d: %s', [
                $response->status(),
                $response->getContent(),
            ])
        );
        $this->assertPending($order);
    }

    // -----------------------------------------------------------------
    // Store-bound signature enforcement when a key IS configured
    // -----------------------------------------------------------------

    public function test_webhook_with_key_requires_all_signature_fields(): void
    {
        $store = $this->makeStore($this->company());
        $this->storePrivateKey($store, self::SERVER_KEY);
        $order = $this->makeOrder($store, 'trx_nokeyfields_111');

        $response = $this->callCallback($store, [
            'order_id' => 'trx_nokeyfields_111',
            'transaction_status' => 'capture',
        ]);

        $this->assertCallbackStatus($response, 403);
        $this->assertPending($order);
    }

    public function test_webhook_with_key_rejects_missing_signature_field(): void
    {
        $store = $this->makeStore($this->company());
        $this->storePrivateKey($store, self::SERVER_KEY);
        $order = $this->makeOrder($store, 'trx_nosig_111');

        $response = $this->callCallback($store, [
            'order_id' => 'trx_nosig_111',
            'transaction_status' => 'capture',
            'status_code' => '200',
            'gross_amount' => '100',
        ]);

        $this->assertCallbackStatus($response, 403);
        $this->assertPending($order);
    }

    public function test_webhook_with_key_rejects_invalid_signature(): void
    {
        $store = $this->makeStore($this->company());
        $this->storePrivateKey($store, self::SERVER_KEY);
        $order = $this->makeOrder($store, 'trx_badsig_111');

        $response = $this->callCallback($store, [
            'order_id' => 'trx_badsig_111',
            'transaction_status' => 'capture',
            'status_code' => '200',
            'gross_amount' => '100',
            'signature_key' => $this->signature('trx_badsig_111', '200', '100', 'other-key'),
        ]);

        $this->assertCallbackStatus($response, 403);
        $this->assertPending($order);
    }

    public function test_webhook_with_key_rejects_amount_mismatch(): void
    {
        $store = $this->makeStore($this->company());
        $this->storePrivateKey($store, self::SERVER_KEY);
        $order = $this->makeOrder($store, 'trx_amount_111', 350.00);

        $response = $this->callCallback($store, [
            'order_id' => 'trx_amount_111',
            'transaction_status' => 'capture',
            'status_code' => '200',
            'gross_amount' => '1',
            'signature_key' => $this->signature('trx_amount_111', '200', '1', self::SERVER_KEY),
        ]);

        $this->assertCallbackStatus($response, 400);
        $this->assertPending($order);
    }

    // -----------------------------------------------------------------
    // Happy path + idempotency (must keep working)
    // -----------------------------------------------------------------

    public function test_valid_signed_webhook_marks_order_paid(): void
    {
        $store = $this->makeStore($this->company());
        $this->storePrivateKey($store, self::SERVER_KEY);
        $order = $this->makeOrder($store, 'trx_valid_111', 250.00);

        $response = $this->callCallback($store, [
            'order_id' => 'trx_valid_111',
            'transaction_status' => 'settlement',
            'status_code' => '200',
            'gross_amount' => '250',
            'signature_key' => $this->signature('trx_valid_111', '200', '250', self::SERVER_KEY),
        ]);

        $this->assertCallbackStatus($response, 200);

        $fresh = $order->fresh();
        $this->assertSame('paid', $fresh->payment_status);
        $this->assertSame('confirmed', $fresh->status);
    }

    public function test_duplicate_valid_webhook_is_idempotent(): void
    {
        $store = $this->makeStore($this->company());
        $this->storePrivateKey($store, self::SERVER_KEY);
        $order = $this->makeOrder($store, 'trx_dup_111', 120.00);

        $payload = [
            'order_id' => 'trx_dup_111',
            'transaction_status' => 'capture',
            'status_code' => '200',
            'gross_amount' => '120',
            'signature_key' => $this->signature('trx_dup_111', '200', '120', self::SERVER_KEY),
        ];

        $this->assertCallbackStatus($this->callCallback($store, $payload), 200);
        $this->assertCallbackStatus($this->callCallback($store, $payload), 200);

        $fresh = $order->fresh();
        $this->assertSame('paid', $fresh->payment_status);
        $this->assertSame('confirmed', $fresh->status);
    }

    // -----------------------------------------------------------------
    // Tenant isolation: no other-store / global secret fallback
    // -----------------------------------------------------------------

    public function test_store_A_key_never_accepts_store_B_callback(): void
    {
        $storeA = $this->makeStore($this->company());
        $storeB = $this->makeStore($this->company());
        $this->storePrivateKey($storeA, 'STORE-A-key-only');

        // Order belongs to store B (no key configured there).
        $orderB = $this->makeOrder($storeB, 'trx_cross_111', 80.00);

        // Signature produced with store A's secret: must NOT be accepted.
        $response = $this->callCallback($storeB, [
            'order_id' => 'trx_cross_111',
            'transaction_status' => 'settlement',
            'status_code' => '200',
            'gross_amount' => '80',
            'signature_key' => $this->signature('trx_cross_111', '200', '80', 'STORE-A-key-only'),
        ]);

        $this->assertTrue(
            $response->status() === 503 || $response->status() === 403,
            vsprintf('Cross-store secret must be rejected (503/403), got %d: %s', [
                $response->status(),
                $response->getContent(),
            ])
        );
        $this->assertPending($orderB);
    }
}
