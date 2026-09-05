<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\PaymentSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * P0 hardening tests for plan-level Midtrans callbacks.
 *
 * The attacker's old tricks — forging transaction_status, guessing order_id,
 * replaying an order signed with an unknown order id — must never activate a
 * subscription. Approval requires a pending PlanOrder bound to the server-side
 * order id, a valid SHA512 signature, a matching amount, AND an authoritative
 * Midtrans status API re-fetch.
 */
class PlanMidtransCallbackSecurityTest extends TestCase
{
    use RefreshDatabase;

    private const SERVER_KEY = 'server-key-123';

    private User $superAdmin;
    private User $user;
    private Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::factory()->create(['type' => 'superadmin']);
        PaymentSetting::updateOrCreateSetting($this->superAdmin->id, 'midtrans_secret_key', self::SERVER_KEY);
        PaymentSetting::updateOrCreateSetting($this->superAdmin->id, 'midtrans_mode', 'sandbox');

        $this->plan = Plan::factory()->create([
            'name' => 'MidtransPlan' . uniqid(),
            'price' => 29,
            'yearly_price' => 29,
        ]);

        $this->user = User::factory()->create([
            'type' => 'company',
            'plan_id' => null,
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
    }

    private function pendingOrder(string $orderId, ?int $couponId = null, ?string $couponCode = null): PlanOrder
    {
        $order = createPlanOrder([
            'user_id' => $this->user->id,
            'plan_id' => $this->plan->id,
            'billing_cycle' => 'yearly',
            'payment_method' => 'midtrans',
            'coupon_id' => $couponId,
            'coupon_code' => $couponCode,
            'payment_id' => $orderId,
            'status' => 'pending',
        ]);

        return $order->fresh();
    }

    private function signature(string $orderId, string $statusCode, string $grossAmount): string
    {
        return hash('sha512', $orderId . $statusCode . $grossAmount . self::SERVER_KEY);
    }

    private function assertNotActivated(PlanOrder $order): void
    {
        $this->assertEquals('pending', $order->fresh()->status, 'order must remain pending');
        $this->assertNull($this->user->fresh()->plan_id, 'user plan must not be assigned');
    }

    // -----------------------------------------------------------------
    // Missing / invalid signature
    // -----------------------------------------------------------------

    public function test_callback_without_signature_is_rejected(): void
    {
        $order = $this->pendingOrder('plan_1_1_111');

        $response = $this->postJson(route('midtrans.callback'), [
            'order_id' => 'plan_1_1_111',
            'transaction_status' => 'capture',
            'status_code' => '200',
            'gross_amount' => '29',
        ]);

        $response->assertStatus(403);
        $this->assertNotActivated($order);
    }

    public function test_callback_with_invalid_signature_is_rejected(): void
    {
        $order = $this->pendingOrder('plan_1_1_222');

        $response = $this->postJson(route('midtrans.callback'), [
            'order_id' => 'plan_1_1_222',
            'transaction_status' => 'capture',
            'signature_key' => str_repeat('deadbeef', 8),
            'status_code' => '200',
            'gross_amount' => '29',
        ]);

        $response->assertStatus(403);
        $this->assertNotActivated($order);
    }

    // -----------------------------------------------------------------
    // Amount verification
    // -----------------------------------------------------------------

    public function test_callback_with_amount_mismatch_is_rejected(): void
    {
        $order = $this->pendingOrder('plan_1_1_333');

        $response = $this->postJson(route('midtrans.callback'), [
            'order_id' => 'plan_1_1_333',
            'transaction_status' => 'capture',
            'signature_key' => $this->signature('plan_1_1_333', '200', '1'),
            'status_code' => '200',
            'gross_amount' => '1',
        ]);

        $response->assertStatus(400);
        $this->assertNotActivated($order);
    }

    // -----------------------------------------------------------------
    // Order binding
    // -----------------------------------------------------------------

    public function test_callback_with_unknown_order_is_rejected(): void
    {
        $response = $this->postJson(route('midtrans.callback'), [
            'order_id' => 'forged_' . uniqid(),
            'transaction_status' => 'capture',
            'signature_key' => $this->signature('forged_' . uniqid(), '200', '29'),
            'status_code' => '200',
            'gross_amount' => '29',
        ]);

        $response->assertStatus(404);
        $this->assertDatabaseCount('plan_orders', 0);
    }

    // -----------------------------------------------------------------
    // Server-side status API verification
    // -----------------------------------------------------------------

    public function test_callback_fails_closed_when_status_api_does_not_confirm(): void
    {
        $order = $this->pendingOrder('plan_1_1_444');

        // Signature + amount look fine, but the authoritative status API says deny.
        Http::fake([
            'api.sandbox.midtrans.com/*' => Http::response([
                'transaction_status' => 'deny',
                'gross_amount' => '29',
                'fraud_status' => 'accept',
            ], 200),
            '*' => Http::response([], 500),
        ]);

        $response = $this->postJson(route('midtrans.callback'), [
            'order_id' => 'plan_1_1_444',
            'transaction_status' => 'capture',
            'signature_key' => $this->signature('plan_1_1_444', '200', '29'),
            'status_code' => '200',
            'gross_amount' => '29',
        ]);

        $response->assertStatus(400);
        $this->assertNotActivated($order);
    }

    public function test_callback_fails_closed_when_status_api_unreachable(): void
    {
        $order = $this->pendingOrder('plan_1_1_555');

        Http::fake([
            '*' => Http::response([], 500),
        ]);

        $response = $this->postJson(route('midtrans.callback'), [
            'order_id' => 'plan_1_1_555',
            'transaction_status' => 'capture',
            'signature_key' => $this->signature('plan_1_1_555', '200', '29'),
            'status_code' => '200',
            'gross_amount' => '29',
        ]);

        $response->assertStatus(400);
        $this->assertNotActivated($order);
    }

    // -----------------------------------------------------------------
    // Happy path + idempotency
    // -----------------------------------------------------------------

    public function test_valid_callback_activates_plan(): void
    {
        $order = $this->pendingOrder('plan_1_1_666');

        Http::fake([
            'api.sandbox.midtrans.com/*' => Http::response([
                'transaction_status' => 'settlement',
                'gross_amount' => '29',
                'fraud_status' => 'accept',
            ], 200),
            '*' => Http::response([], 500),
        ]);

        $response = $this->postJson(route('midtrans.callback'), [
            'order_id' => 'plan_1_1_666',
            'transaction_status' => 'settlement',
            'signature_key' => $this->signature('plan_1_1_666', '200', '29'),
            'status_code' => '200',
            'gross_amount' => '29',
        ]);

        $response->assertStatus(200)
            ->assertJson(['status' => 'OK']);

        $this->assertEquals('approved', $order->fresh()->status);
        $this->assertEquals($this->plan->id, $this->user->fresh()->plan_id, 'user plan must be assigned');
        $this->assertEquals(1, $this->user->fresh()->plan_is_active);
    }

    public function test_duplicate_valid_callback_is_idempotent(): void
    {
        $coupon = \App\Models\Coupon::factory()->create([
            'code' => strtoupper('MIDDUP' . uniqid()),
            'type' => 'flat',
            'discount_amount' => 5,
            'status' => 1,
            'expiry_date' => now()->addMonth(),
        ]);

        $order = $this->pendingOrder('plan_1_1_777', $coupon->id, $coupon->code);

        Http::fake([
            'api.sandbox.midtrans.com/*' => Http::response([
                'transaction_status' => 'capture',
                'gross_amount' => '24',
                'fraud_status' => 'accept',
            ], 200),
            '*' => Http::response([], 500),
        ]);

        $payload = [
            'order_id' => 'plan_1_1_777',
            'transaction_status' => 'capture',
            'signature_key' => $this->signature('plan_1_1_777', '200', '24'),
            'status_code' => '200',
            'gross_amount' => '24',
        ];

        $this->postJson(route('midtrans.callback'), $payload)->assertStatus(200);
        $order->refresh();
        $this->assertEquals('approved', $order->status);
        $this->assertEquals(1, $coupon->fresh()->used_count, 'coupon must be counted once');

        // Second delivery of the same IPN must not re-activate or double-count.
        $this->postJson(route('midtrans.callback'), $payload)->assertStatus(200);
        $this->assertEquals('approved', $order->fresh()->status);
        $this->assertEquals(1, $coupon->fresh()->used_count, 'duplicate IPN must not double-count the coupon');
        $this->assertEquals($this->plan->id, $this->user->fresh()->plan_id);
    }

    // -----------------------------------------------------------------
    // Snap onSuccess (authenticated processPayment) — server re-verifies
    // -----------------------------------------------------------------

    public function test_process_payment_requires_real_pending_order(): void
    {
        $this->actingAs($this->user);

        Http::fake(['*' => Http::response([], 500)]);

        $response = $this->from(route('plans.index'))->post(route('midtrans.payment'), [
            'plan_id' => $this->plan->id,
            'billing_cycle' => 'yearly',
            'transaction_status' => 'capture',
            'order_id' => 'forged_order_' . uniqid(),
        ]);

        $response->assertSessionHasErrors('error');
        $this->assertDatabaseCount('plan_orders', 0);
        $this->assertNull($this->user->fresh()->plan_id);
    }

    public function test_process_payment_forged_status_is_rejected(): void
    {
        $order = $this->pendingOrder('plan_1_1_888');
        $this->actingAs($this->user);

        // Server says the transaction never settled.
        Http::fake([
            'api.sandbox.midtrans.com/*' => Http::response([
                'transaction_status' => 'deny',
                'gross_amount' => '29',
                'fraud_status' => 'accept',
            ], 200),
            '*' => Http::response([], 500),
        ]);

        $response = $this->from(route('plans.index'))->post(route('midtrans.payment'), [
            'plan_id' => $this->plan->id,
            'billing_cycle' => 'yearly',
            'transaction_status' => 'capture',
            'order_id' => 'plan_1_1_888',
        ]);

        $response->assertSessionHasErrors('error');
        $this->assertNotActivated($order);
    }

    public function test_process_payment_valid_server_verification_activates(): void
    {
        $this->pendingOrder('plan_1_1_999');
        $this->actingAs($this->user);

        Http::fake([
            'api.sandbox.midtrans.com/*' => Http::response([
                'transaction_status' => 'settlement',
                'gross_amount' => '29',
                'fraud_status' => 'accept',
            ], 200),
            '*' => Http::response([], 500),
        ]);

        $response = $this->from(route('plans.index'))->post(route('midtrans.payment'), [
            'plan_id' => $this->plan->id,
            'billing_cycle' => 'yearly',
            'transaction_status' => 'capture',
            'order_id' => 'plan_1_1_999',
        ]);

        $response->assertSessionHas('success');
        $this->assertEquals('approved', PlanOrder::where('payment_id', 'plan_1_1_999')->first()->status);
        $this->assertEquals($this->plan->id, $this->user->fresh()->plan_id);
    }
}