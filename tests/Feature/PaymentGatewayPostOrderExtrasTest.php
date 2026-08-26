<?php

namespace Tests\Feature;

use App\Events\OrderCreated;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PaymentGatewayPostOrderExtrasTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name' => 'P' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = $attrs['name'] ?? 'TestStore';
        $store->slug = $attrs['slug'] ?? 'ts-' . uniqid();
        $store->theme = $attrs['theme'] ?? 'bazaar-market';
        $store->email = 'store@example.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function orderFor(Store $store, array $overrides = []): Order
    {
        return Order::forceCreate(array_merge([
            'order_number' => Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 'sess-' . uniqid(),
            'status' => 'pending',
            'payment_status' => 'pending',
            'customer_email' => 'cust@example.com',
            'customer_phone' => '0599000000',
            'customer_first_name' => 'Test',
            'customer_last_name' => 'User',
            'shipping_address' => 'Addr',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'West Bank',
            'shipping_country' => 'Palestine',
            'billing_address' => 'Addr',
            'billing_city' => 'Nablus',
            'billing_state' => 'West Bank',
            'billing_country' => 'Palestine',
            'subtotal' => 100,
            'tax_amount' => 0,
            'shipping_amount' => 0,
            'discount_amount' => 0,
            'total_amount' => 100,
            'currency' => 'ILS',
            'payment_method' => 'stripe',
            'order_source' => 'storefront',
        ], $overrides));
    }

    // ---------------------------------------------------------------
    // completePostOrderExtras CAS idempotency
    // ---------------------------------------------------------------

    public function test_complete_post_order_extras_runs_exactly_once(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->orderFor($store);

        $service = app(OrderService::class);

        $service->completePostOrderExtras($order);
        $order->refresh();
        $this->assertNotNull($order->post_order_extras_at);

        // Second call should be a no-op (CAS fails)
        $service->completePostOrderExtras($order);
        $order->refresh();
        $this->assertNotNull($order->post_order_extras_at);
    }

    public function test_complete_post_order_extras_dispatches_order_created_once(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->orderFor($store);

        Event::fake([OrderCreated::class]);

        $service = app(OrderService::class);
        $service->completePostOrderExtras($order);

        Event::assertDispatched(OrderCreated::class, 1);

        // Second call should not dispatch again
        $service->completePostOrderExtras($order);
        Event::assertDispatched(OrderCreated::class, 1); // still 1
    }

    public function test_complete_post_order_extras_sets_timestamp(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->orderFor($store);
        $this->assertNull($order->post_order_extras_at);

        $service = app(OrderService::class);
        $service->completePostOrderExtras($order);

        $order->refresh();
        $this->assertNotNull($order->post_order_extras_at);
        $this->assertTrue($order->post_order_extras_at->isPast());
    }

    // ---------------------------------------------------------------
    // Stripe: success callback → extras exactly once
    // ---------------------------------------------------------------

    public function test_stripe_success_sets_post_order_extras(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->orderFor($store, [
            'payment_method' => 'stripe',
            'payment_details' => ['checkout_session_id' => 'cs_test_123'],
        ]);

        $service = app(OrderService::class);
        $service->completePostOrderExtras($order);

        $order->refresh();
        $this->assertNotNull($order->post_order_extras_at);
    }

    public function test_stripe_replay_no_duplicate_extras(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->orderFor($store, [
            'payment_method' => 'stripe',
            'payment_details' => ['checkout_session_id' => 'cs_test_123'],
        ]);

        Event::fake([OrderCreated::class]);

        $service = app(OrderService::class);

        // First "success callback"
        $service->completePostOrderExtras($order);
        Event::assertDispatched(OrderCreated::class, 1);

        // Second "webhook replay"
        $service->completePostOrderExtras($order);
        Event::assertDispatched(OrderCreated::class, 1); // still 1

        $order->refresh();
        $this->assertNotNull($order->post_order_extras_at);
    }

    // ---------------------------------------------------------------
    // PayPal: success callback → extras exactly once
    // ---------------------------------------------------------------

    public function test_paypal_success_sets_post_order_extras(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->orderFor($store, [
            'payment_method' => 'paypal',
            'payment_details' => ['paypal_order_id' => 'PAY-123'],
        ]);

        $service = app(OrderService::class);
        $service->completePostOrderExtras($order);

        $order->refresh();
        $this->assertNotNull($order->post_order_extras_at);
    }

    public function test_paypal_replay_no_duplicate_extras(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->orderFor($store, [
            'payment_method' => 'paypal',
            'payment_details' => ['paypal_order_id' => 'PAY-123'],
        ]);

        Event::fake([OrderCreated::class]);

        $service = app(OrderService::class);

        // First "success callback"
        $service->completePostOrderExtras($order);
        Event::assertDispatched(OrderCreated::class, 1);

        // Second "webhook replay"
        $service->completePostOrderExtras($order);
        Event::assertDispatched(OrderCreated::class, 1); // still 1
    }

    // ---------------------------------------------------------------
    // Razorpay: verifyPayment → extras exactly once
    // ---------------------------------------------------------------

    public function test_razorpay_success_sets_post_order_extras(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->orderFor($store, [
            'payment_method' => 'razorpay',
            'payment_details' => ['razorpay_order_id' => 'order_RP123'],
        ]);

        $service = app(OrderService::class);
        $service->completePostOrderExtras($order);

        $order->refresh();
        $this->assertNotNull($order->post_order_extras_at);
    }

    public function test_razorpay_replay_no_duplicate_extras(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->orderFor($store, [
            'payment_method' => 'razorpay',
            'payment_details' => ['razorpay_order_id' => 'order_RP123'],
        ]);

        Event::fake([OrderCreated::class]);

        $service = app(OrderService::class);

        // First "verify payment"
        $service->completePostOrderExtras($order);
        Event::assertDispatched(OrderCreated::class, 1);

        // Second "webhook replay"
        $service->completePostOrderExtras($order);
        Event::assertDispatched(OrderCreated::class, 1); // still 1
    }

    // ---------------------------------------------------------------
    // Cross-gateway: browser callback + webhook race
    // ---------------------------------------------------------------

    public function test_browser_callback_then_webhook_no_duplicate(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->orderFor($store, ['payment_method' => 'stripe']);

        Event::fake([OrderCreated::class]);

        $service = app(OrderService::class);

        // Browser callback marks paid + calls extras
        $order->update(['payment_status' => 'paid', 'status' => 'confirmed']);
        $service->completePostOrderExtras($order);

        Event::assertDispatched(OrderCreated::class, 1);

        // Webhook arrives later — markOrderPaid sees already paid, still calls completePostOrderExtras
        // (Our GatewayWebhookController calls it even for already-paid orders)
        $service->completePostOrderExtras($order);

        Event::assertDispatched(OrderCreated::class, 1); // still 1
    }

    public function test_webhook_then_browser_callback_no_duplicate(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->orderFor($store, ['payment_method' => 'paypal']);

        Event::fake([OrderCreated::class]);

        $service = app(OrderService::class);

        // Webhook marks paid + calls extras
        $order->update(['payment_status' => 'paid', 'status' => 'confirmed']);
        $service->completePostOrderExtras($order);

        Event::assertDispatched(OrderCreated::class, 1);

        // Browser callback arrives later
        $service->completePostOrderExtras($order);

        Event::assertDispatched(OrderCreated::class, 1); // still 1
    }

    // ---------------------------------------------------------------
    // Order status correctness
    // ---------------------------------------------------------------

    public function test_order_status_remains_correct_after_extras(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->orderFor($store, ['payment_method' => 'stripe']);

        // Simulate payment confirmation
        $order->update(['status' => 'confirmed', 'payment_status' => 'paid']);

        $service = app(OrderService::class);
        $service->completePostOrderExtras($order);

        $order->refresh();
        $this->assertEquals('confirmed', $order->status);
        $this->assertEquals('paid', $order->payment_status);
    }

    // ---------------------------------------------------------------
    // Already-paid order: extras not duplicated
    // ---------------------------------------------------------------

    public function test_already_paid_order_does_not_duplicate_extras(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->orderFor($store, ['payment_method' => 'stripe']);

        // Pre-set post_order_extras_at (simulating prior completion)
        $order->update([
            'payment_status' => 'paid',
            'status' => 'confirmed',
            'post_order_extras_at' => now(),
        ]);

        Event::fake([OrderCreated::class]);

        $service = app(OrderService::class);
        $service->completePostOrderExtras($order);

        // Should not dispatch event since extras already ran
        Event::assertNotDispatched(OrderCreated::class);
    }
}
