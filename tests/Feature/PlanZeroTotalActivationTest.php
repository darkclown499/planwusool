<?php

namespace Tests\Feature;

use App\Models\Coupon;
use App\Models\Plan;
use App\Models\PaymentSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * F3 regression: an administrator-authorized coupon that brings the final
 * price to $0 must activate the subscription directly, without requiring a
 * gateway payment or a server-side callback.
 */
class PlanZeroTotalActivationTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;
    private User $user;
    private Plan $plan;
    private Coupon $zeroCoupon;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::factory()->create(['type' => 'superadmin']);
        PaymentSetting::updateOrCreateSetting($this->superAdmin->id, 'midtrans_secret_key', 'server-key-123');
        PaymentSetting::updateOrCreateSetting($this->superAdmin->id, 'midtrans_mode', 'sandbox');
        PaymentSetting::updateOrCreateSetting($this->superAdmin->id, 'skrill_merchant_id', 'merchant@example.com');
        PaymentSetting::updateOrCreateSetting($this->superAdmin->id, 'skrill_secret_word', 'secret123');

        $this->plan = Plan::factory()->create([
            'name' => 'ZeroPlan' . uniqid(),
            'price' => 29,
            'yearly_price' => 29,
        ]);

        $this->zeroCoupon = Coupon::factory()->create([
            'type' => 'flat',
            'discount_amount' => 1000,
            'status' => 1,
            'expiry_date' => now()->addMonth(),
        ]);

        $this->user = User::factory()->create([
            'type' => 'company',
            'plan_id' => null,
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
    }

    public function test_midtrans_zero_total_activates_without_gateway(): void
    {
        $this->actingAs($this->user);

        $response = $this->postJson(route('midtrans.create-payment'), [
            'plan_id' => $this->plan->id,
            'billing_cycle' => 'yearly',
            'coupon_code' => $this->zeroCoupon->code,
        ]);

        $response->assertOk()
            ->assertJson(['success' => true, 'zero_total' => true]);

        $order = \App\Models\PlanOrder::where('user_id', $this->user->id)->first();
        $this->assertNotNull($order, 'an approved order must exist');
        $this->assertEquals('approved', $order->status);
        $this->assertEquals('midtrans', $order->payment_method);
        $this->assertEquals(0, (float) $order->final_price);
        $this->assertEquals($this->plan->id, $this->user->fresh()->plan_id, 'user plan must be assigned');
        $this->assertEquals(1, $this->zeroCoupon->fresh()->used_count);
    }

    public function test_skrill_zero_total_activates_without_gateway(): void
    {
        $this->actingAs($this->user);

        $response = $this->postJson(route('skrill.payment'), [
            'plan_id' => $this->plan->id,
            'billing_cycle' => 'yearly',
            'coupon_code' => $this->zeroCoupon->code,
            'email' => 'customer@example.com',
        ]);

        $response->assertOk()
            ->assertJson(['success' => true, 'zero_total' => true]);

        $order = \App\Models\PlanOrder::where('user_id', $this->user->id)->first();
        $this->assertNotNull($order, 'an approved order must exist');
        $this->assertEquals('approved', $order->status);
        $this->assertEquals('skrill', $order->payment_method);
        $this->assertEquals(0, (float) $order->final_price);
        $this->assertEquals($this->plan->id, $this->user->fresh()->plan_id, 'user plan must be assigned');
        $this->assertEquals(1, $this->zeroCoupon->fresh()->used_count);
    }
}