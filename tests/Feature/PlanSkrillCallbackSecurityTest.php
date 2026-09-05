<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\PaymentSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P0 hardening tests for plan-level Skrill IPN callbacks.
 *
 * Activation requires a pending PlanOrder bound to the server-generated
 * transaction id, a valid md5sig (merchant + transaction + secret + amount +
 * currency + status), a matching merchant id, a matching amount, and status 2.
 * The gateway is always acknowledged with HTTP 200 so it stops retrying.
 */
class PlanSkrillCallbackSecurityTest extends TestCase
{
    use RefreshDatabase;

    private const MERCHANT_ID = 'merchant@example.com';
    private const SECRET_WORD = 'secret123';

    private User $superAdmin;
    private User $user;
    private Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::factory()->create(['type' => 'superadmin']);
        PaymentSetting::updateOrCreateSetting($this->superAdmin->id, 'skrill_merchant_id', self::MERCHANT_ID);
        PaymentSetting::updateOrCreateSetting($this->superAdmin->id, 'skrill_secret_word', self::SECRET_WORD);

        $this->plan = Plan::factory()->create([
            'name' => 'SkrillPlan' . uniqid(),
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

    private function pendingOrder(string $transactionId, ?int $couponId = null, ?string $couponCode = null): PlanOrder
    {
        $order = createPlanOrder([
            'user_id' => $this->user->id,
            'plan_id' => $this->plan->id,
            'billing_cycle' => 'yearly',
            'payment_method' => 'skrill',
            'coupon_id' => $couponId,
            'coupon_code' => $couponCode,
            'payment_id' => $transactionId,
            'status' => 'pending',
        ]);

        return $order->fresh();
    }

    private function md5sig(string $merchantId, string $transactionId, string $amount, string $currency, string $status, ?string $secretWord = null): string
    {
        $secret = $secretWord ?? self::SECRET_WORD;

        return strtoupper(md5($merchantId . $transactionId . strtoupper(md5($secret)) . $amount . $currency . $status));
    }

    private function assertNotActivated(PlanOrder $order): void
    {
        $this->assertEquals('pending', $order->fresh()->status, 'order must remain pending');
        $this->assertNull($this->user->fresh()->plan_id, 'user plan must not be assigned');
    }

    // -----------------------------------------------------------------
    // Missing / invalid md5sig
    // -----------------------------------------------------------------

    public function test_callback_without_md5sig_does_not_activate(): void
    {
        $order = $this->pendingOrder('SKRILL-AAAA');

        $response = $this->postJson(route('skrill.callback'), [
            'merchant_id' => self::MERCHANT_ID,
            'transaction_id' => 'SKRILL-AAAA',
            'mb_amount' => '29.00',
            'mb_currency' => 'USD',
            'status' => '2',
        ]);

        $response->assertStatus(200);
        $this->assertNotActivated($order);
    }

    public function test_callback_with_invalid_md5sig_does_not_activate(): void
    {
        $order = $this->pendingOrder('SKRILL-BBBB');

        $response = $this->postJson(route('skrill.callback'), [
            'merchant_id' => self::MERCHANT_ID,
            'transaction_id' => 'SKRILL-BBBB',
            'mb_amount' => '29.00',
            'mb_currency' => 'USD',
            'status' => '2',
            'md5sig' => str_repeat('A', 32),
        ]);

        $response->assertStatus(200);
        $this->assertNotActivated($order);
    }

    // -----------------------------------------------------------------
    // Merchant binding
    // -----------------------------------------------------------------

    public function test_callback_with_foreign_merchant_id_does_not_activate(): void
    {
        $order = $this->pendingOrder('SKRILL-CCCC');

        // Attacker signs with their OWN merchant id (signature is therefore
        // valid) but the merchant must match the configured one.
        $attackerMerchant = 'attacker@example.com';
        $sig = $this->md5sig($attackerMerchant, 'SKRILL-CCCC', '29.00', 'USD', '2');

        $response = $this->postJson(route('skrill.callback'), [
            'merchant_id' => $attackerMerchant,
            'transaction_id' => 'SKRILL-CCCC',
            'mb_amount' => '29.00',
            'mb_currency' => 'USD',
            'status' => '2',
            'md5sig' => $sig,
        ]);

        $response->assertStatus(200);
        $this->assertNotActivated($order);
    }

    // -----------------------------------------------------------------
    // Amount verification
    // -----------------------------------------------------------------

    public function test_callback_with_amount_mismatch_does_not_activate(): void
    {
        $order = $this->pendingOrder('SKRILL-DDDD');

        $sig = $this->md5sig(self::MERCHANT_ID, 'SKRILL-DDDD', '1.00', 'USD', '2');

        $response = $this->postJson(route('skrill.callback'), [
            'merchant_id' => self::MERCHANT_ID,
            'transaction_id' => 'SKRILL-DDDD',
            'mb_amount' => '1.00',
            'mb_currency' => 'USD',
            'status' => '2',
            'md5sig' => $sig,
        ]);

        $response->assertStatus(200);
        $this->assertNotActivated($order);
    }

    // -----------------------------------------------------------------
    // Status verification
    // -----------------------------------------------------------------

    public function test_callback_with_non_processed_status_does_not_activate(): void
    {
        $order = $this->pendingOrder('SKRILL-EEEE');

        $sig = $this->md5sig(self::MERCHANT_ID, 'SKRILL-EEEE', '29.00', 'USD', '0');

        $response = $this->postJson(route('skrill.callback'), [
            'merchant_id' => self::MERCHANT_ID,
            'transaction_id' => 'SKRILL-EEEE',
            'mb_amount' => '29.00',
            'mb_currency' => 'USD',
            'status' => '0',
            'md5sig' => $sig,
        ]);

        $response->assertStatus(200);
        $this->assertNotActivated($order);
    }

    // -----------------------------------------------------------------
    // Order binding
    // -----------------------------------------------------------------

    public function test_callback_with_unknown_transaction_does_not_activate(): void
    {
        $response = $this->postJson(route('skrill.callback'), [
            'merchant_id' => self::MERCHANT_ID,
            'transaction_id' => 'SKRILL-NOTEXIST',
            'mb_amount' => '29.00',
            'mb_currency' => 'USD',
            'status' => '2',
            'md5sig' => $this->md5sig(self::MERCHANT_ID, 'SKRILL-NOTEXIST', '29.00', 'USD', '2'),
        ]);

        $response->assertStatus(200)
            ->assertSee('OK');

        $this->assertDatabaseCount('plan_orders', 0);
        $this->assertNull($this->user->fresh()->plan_id);
    }

    // -----------------------------------------------------------------
    // Happy path + idempotency
    // -----------------------------------------------------------------

    public function test_valid_callback_activates_plan(): void
    {
        $order = $this->pendingOrder('SKRILL-VALID');

        $response = $this->postJson(route('skrill.callback'), [
            'merchant_id' => self::MERCHANT_ID,
            'transaction_id' => 'SKRILL-VALID',
            'mb_amount' => '29.00',
            'mb_currency' => 'USD',
            'status' => '2',
            'md5sig' => $this->md5sig(self::MERCHANT_ID, 'SKRILL-VALID', '29.00', 'USD', '2'),
        ]);

        $response->assertStatus(200)
            ->assertSee('OK');

        $this->assertEquals('approved', $order->fresh()->status);
        $this->assertEquals($this->plan->id, $this->user->fresh()->plan_id, 'user plan must be assigned');
        $this->assertEquals(1, $this->user->fresh()->plan_is_active);
    }

    public function test_duplicate_valid_callback_is_idempotent(): void
    {
        $coupon = Coupon::factory()->create([
            'code' => strtoupper('SKRDUP' . uniqid()),
            'type' => 'flat',
            'discount_amount' => 5,
            'status' => 1,
            'expiry_date' => now()->addMonth(),
        ]);

        $order = $this->pendingOrder('SKRILL-DUP', $coupon->id, $coupon->code);

        $payload = [
            'merchant_id' => self::MERCHANT_ID,
            'transaction_id' => 'SKRILL-DUP',
            'mb_amount' => '24.00',
            'mb_currency' => 'USD',
            'status' => '2',
            'md5sig' => $this->md5sig(self::MERCHANT_ID, 'SKRILL-DUP', '24.00', 'USD', '2'),
        ];

        $this->postJson(route('skrill.callback'), $payload)->assertStatus(200);
        $this->assertEquals('approved', $order->fresh()->status);
        $this->assertEquals(1, $coupon->fresh()->used_count, 'coupon must be counted once');

        // Second delivery of the same IPN must not re-activate or double-count.
        $this->postJson(route('skrill.callback'), $payload)->assertStatus(200);
        $this->assertEquals('approved', $order->fresh()->status);
        $this->assertEquals(1, $coupon->fresh()->used_count, 'duplicate IPN must not double-count the coupon');
        $this->assertEquals($this->plan->id, $this->user->fresh()->plan_id);
    }

    public function test_callback_acknowledges_legit_rejections_with_200(): void
    {
        // Even failed verifications return 200 so Skrill stops retrying.
        $order = $this->pendingOrder('SKRILL-ACK');

        $response = $this->postJson(route('skrill.callback'), [
            'merchant_id' => self::MERCHANT_ID,
            'transaction_id' => 'SKRILL-ACK',
            'mb_amount' => '1.00',
            'mb_currency' => 'USD',
            'status' => '2',
            'md5sig' => $this->md5sig(self::MERCHANT_ID, 'SKRILL-ACK', '1.00', 'USD', '2'),
        ]);

        $response->assertStatus(200);
        $this->assertNotActivated($order);
    }
}