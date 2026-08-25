<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Plan;
use App\Models\PaymentSetting;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

class StripePaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Permissions and roles are normally seeded for the whole application,
        // so reproduce that state before exercising permission-gated routes.
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    public function test_stripe_payment_configuration()
    {
        // Create super admin user and a store to satisfy store_id requirement
        $superAdmin = User::factory()->create(['type' => 'superadmin'])
            ->assignRole('superadmin');
        $store = \App\Models\Store::factory()->create(['user_id' => $superAdmin->id]);

        // Create payment settings for that store
        PaymentSetting::create([
            'user_id' => $superAdmin->id,
            'store_id' => $store->id,
            'key' => 'stripe_key',
            'value' => 'pk_test_123456789'
        ]);
        
        PaymentSetting::create([
            'user_id' => $superAdmin->id,
            'store_id' => $store->id,
            'key' => 'stripe_secret',
            'value' => 'sk_test_123456789'
        ]);
        
        PaymentSetting::create([
            'user_id' => $superAdmin->id,
            'store_id' => $store->id,
            'key' => 'is_stripe_enabled',
            'value' => '1'
        ]);

        $this->actingAs($superAdmin);

        // Test payment methods API - new endpoint returns payment_methods array
        $response = $this->get(route('api.payment.methods', ['store_id' => $store->id]));
        
        $response->assertStatus(200);
        $data = $response->json();
        
        $this->assertArrayHasKey('payment_methods', $data);
        // Find stripe in list
        $stripe = collect($data['payment_methods'])->firstWhere('name', 'stripe');
        $this->assertNotNull($stripe, 'stripe method should be present');
    }

    public function test_stripe_payment_validation()
    {
        // Create user and plan
        $user = User::factory()->create();
        $plan = Plan::factory()->create(['price' => 10.00]);
        
        $this->actingAs($user);

        // Test without payment method ID
        $response = $this->post(route('stripe.payment'), [
            'plan_id' => $plan->id,
            'billing_cycle' => 'monthly',
            'coupon_code' => '',
            'cardholder_name' => 'Test User',
        ]);

        $response->assertSessionHasErrors(['payment_method_id']);
    }

    public function test_stripe_payment_missing_configuration()
    {
        // Create user and plan
        $user = User::factory()->create();
        $plan = Plan::factory()->create(['price' => 10.00]);
        
        $this->actingAs($user);

        // Test without Stripe configuration
        $response = $this->post(route('stripe.payment'), [
            'payment_method_id' => 'pm_test_123',
            'plan_id' => $plan->id,
            'billing_cycle' => 'monthly',
            'coupon_code' => '',
            'cardholder_name' => 'Test User',
        ]);

        $response->assertSessionHasErrors(['error']);
    }
}
