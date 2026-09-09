<?php

namespace Tests\Feature;

use App\Events\OrderStatusChanged;
use App\Jobs\SendStoreCustomerEmail;
use App\Listeners\AwardLoyaltyOnDelivery;
use App\Models\Category;
use App\Models\Customer;
use App\Models\LoyaltySetting;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\LoyaltyService;
use App\Services\OrderTransitionService;
use Illuminate\Events\CallQueuedListener;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * B4-01 — Loyalty award-on-delivery queue reliability.
 *
 * Guards the dedicated `loyalty` queue contract, delivered-only awarding,
 * tenant isolation, idempotency under retries/replays, safe failure for
 * missing records, retryability of transient failures, and the tracked
 * worker contract that consumes the `loyalty` queue.
 */
class LoyaltyQueueReliabilityTest extends TestCase
{
    use RefreshDatabase;

    private function merchantWithStore(): array
    {
        $plan = Plan::factory()->create(['max_stores' => 10, 'max_products_per_store' => 1000, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'onboarded_at' => now(), 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth()]);
        $store = Store::factory()->create(['user_id' => $user->id]);
        $user->current_store = $store->id; $user->save();
        return [$user, $store];
    }

    private function customer(Store $store): Customer
    {
        return Customer::create([
            'store_id' => $store->id,
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'loyalty' . uniqid() . '@example.com',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
            'is_active' => true,
        ]);
    }

    private function orderFor(Store $store, Customer $customer, string $status = 'shipped', float $subtotal = 100): Order
    {
        $order = new Order();
        $order->store_id = $store->id;
        $order->customer_id = $customer->id;
        $order->order_number = Order::generateOrderNumber();
        $order->status = $status;
        $order->payment_status = 'paid';
        $order->subtotal = $subtotal;
        $order->discount_amount = 0;
        $order->shipping_amount = 0;
        $order->tax_amount = 0;
        $order->total_amount = $subtotal;
        $order->customer_email = $customer->email;
        $order->customer_first_name = $customer->first_name;
        $order->customer_last_name = $customer->last_name;
        $order->shipping_address = 'Test St 1';
        $order->shipping_city = 'Ramallah';
        $order->shipping_state = 'West Bank';
        $order->shipping_country = 'PS';
        $order->billing_address = 'Test St 1';
        $order->billing_city = 'Ramallah';
        $order->billing_state = 'West Bank';
        $order->billing_country = 'PS';
        $order->payment_method = 'cod';
        $order->save();
        $cat = Category::factory()->create(['store_id' => $store->id]);
        $prod = Product::create(['store_id' => $store->id, 'category_id' => $cat->id, 'name' => 'P', 'price' => $subtotal, 'stock' => 100, 'is_active' => true, 'images' => '/a.jpg', 'cover_image' => '/a.jpg']);
        OrderItem::create(['order_id' => $order->id, 'product_id' => $prod->id, 'product_name' => $prod->name, 'quantity' => 1, 'product_price' => $subtotal, 'unit_price' => $subtotal, 'total_price' => $subtotal]);
        return $order->fresh();
    }

    private function enableLoyalty(Store $store, float $pointsPerCurrency = 1): void
    {
        LoyaltySetting::forStore($store->id)->update(['is_enabled' => true, 'points_per_currency' => $pointsPerCurrency]);
    }

    // --- 1. QUEUE ROUTING ---

    public function test_listener_is_registered_on_order_status_changed(): void
    {
        Event::fake([OrderStatusChanged::class]);
        Event::assertListening(OrderStatusChanged::class, AwardLoyaltyOnDelivery::class);
    }

    public function test_delivered_transition_dispatches_listener_on_loyalty_queue(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->enableLoyalty($store);
        $customer = $this->customer($store);
        $order = $this->orderFor($store, $customer, 'shipped');

        Queue::fake();
        OrderTransitionService::transition($order, 'delivered');

        Queue::assertPushedOn('loyalty', CallQueuedListener::class, function ($job) {
            return $job->class === AwardLoyaltyOnDelivery::class
                && $job->method === 'handle'
                && $job->tries === 3;
        });
    }

    public function test_worker_contract_documents_loyalty_queue(): void
    {
        $listener = app(AwardLoyaltyOnDelivery::class);
        $this->assertSame('loyalty', $listener->queue, 'dedicated loyalty queue is the canonical contract');

        $doc = file_get_contents(base_path('DEPLOYMENT.md'));
        $this->assertStringContainsString('queue:work', $doc);
        $this->assertMatchesRegularExpression('/--queue=[A-Za-z0-9_,]+/', $doc);
        preg_match('/--queue=([A-Za-z0-9_,]+)/', $doc, $m);
        $queues = explode(',', $m[1]);
        foreach (['default', 'accounting', 'notifications', 'loyalty'] as $expected) {
            $this->assertContains($expected, $queues, "tracked worker contract must consume the '$expected' queue");
        }
    }

    // --- 2. DELIVERED ONLY + AWARD ---

    public function test_delivered_transition_awards_loyalty_points(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->enableLoyalty($store);
        $customer = $this->customer($store);
        $order = $this->orderFor($store, $customer, 'shipped');

        OrderTransitionService::transition($order, 'delivered');

        $this->assertEquals('delivered', $order->fresh()->status);
        $this->assertDatabaseHas('loyalty_transactions', ['store_id' => $store->id, 'customer_id' => $customer->id, 'order_id' => $order->id, 'type' => 'earn', 'points' => 100]);
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($store->id, $customer->id));
    }

    public function test_undelivered_states_never_award(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->enableLoyalty($store);
        $customer = $this->customer($store);

        foreach (['pending', 'confirmed', 'processing', 'shipped', 'cancelled', 'failed', 'refunded'] as $status) {
            $o = $this->orderFor($store, $customer, $status);
            app(AwardLoyaltyOnDelivery::class)->handle(new OrderStatusChanged($o, $status, $status));
            $this->assertEquals(0, LoyaltyTransaction::where('order_id', $o->id)->where('type', 'earn')->count(), "no earn award for status $status");
        }

        // Service-level guard too: a delivered event must not award an order whose
        // committed row is not delivered (e.g. stale event replayed after status change).
        $order = $this->orderFor($store, $customer, 'shipped');
        $order->status = 'shipped';
        $order->save();
        app(LoyaltyService::class)->earnPointsForOrder($order->fresh());
        $this->assertEquals(0, LoyaltyTransaction::where('order_id', $order->id)->where('type', 'earn')->count());

        $this->assertEquals(0, LoyaltyTransaction::where('type', 'earn')->count());
    }

    // --- 3. IDEMPOTENCY ---

    public function test_retry_and_duplicate_delivery_job_never_double_awards(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->enableLoyalty($store);
        $customer = $this->customer($store);
        $order = $this->orderFor($store, $customer, 'shipped');

        OrderTransitionService::transition($order, 'delivered'); // canonical single award

        $listener = app(AwardLoyaltyOnDelivery::class);
        $listener->handle(new OrderStatusChanged($order->fresh(), 'shipped', 'delivered')); // worker retry #2
        $listener->handle(new OrderStatusChanged($order->fresh(), 'shipped', 'delivered')); // manual replay

        $this->assertEquals(1, LoyaltyTransaction::where('store_id', $store->id)->where('order_id', $order->id)->where('type', 'earn')->count());
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($store->id, $customer->id));
    }

    public function test_same_delivered_transition_twice_never_double_awards(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->enableLoyalty($store);
        $customer = $this->customer($store);
        $order = $this->orderFor($store, $customer, 'shipped');

        OrderTransitionService::transition($order, 'delivered');

        Bus::fake([SendStoreCustomerEmail::class]);
        $replay = new OrderStatusChanged($order->fresh(), 'shipped', 'delivered');
        event($replay);
        event($replay);

        $this->assertEquals(1, LoyaltyTransaction::where('store_id', $store->id)->where('order_id', $order->id)->where('type', 'earn')->count());
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($store->id, $customer->id));
    }

    // --- 4. TENANT ISOLATION ---

    public function test_store_a_delivery_never_awards_store_b(): void
    {
        [$userA, $storeA] = $this->merchantWithStore();
        [$userB, $storeB] = $this->merchantWithStore();
        $this->enableLoyalty($storeA);
        $this->enableLoyalty($storeB);

        $customerA = $this->customer($storeA);
        $orderA = $this->orderFor($storeA, $customerA, 'shipped');

        OrderTransitionService::transition($orderA, 'delivered');

        $this->assertEquals(100, LoyaltyTransaction::balanceFor($storeA->id, $customerA->id));
        $this->assertEquals(1, LoyaltyTransaction::where('store_id', $storeA->id)->where('order_id', $orderA->id)->where('type', 'earn')->count());
        $this->assertEquals(0, LoyaltyTransaction::where('store_id', $storeB->id)->count());
    }

    // --- 5. SAFE FAILURE / RETRY ---

    public function test_missing_customer_fails_safely(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->enableLoyalty($store);
        $customer = $this->customer($store);
        $order = $this->orderFor($store, $customer, 'delivered');
        $order->customer_id = null;
        $order->save();

        app(AwardLoyaltyOnDelivery::class)->handle(new OrderStatusChanged($order->fresh(), 'shipped', 'delivered'));

        $this->assertEquals(0, LoyaltyTransaction::where('store_id', $store->id)->count());
    }

    public function test_deleted_order_fails_safely(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->enableLoyalty($store);
        $customer = $this->customer($store);
        $order = $this->orderFor($store, $customer, 'delivered');

        $event = new OrderStatusChanged($order, 'shipped', 'delivered');
        $order->delete();

        app(AwardLoyaltyOnDelivery::class)->handle($event);

        $this->assertEquals(0, LoyaltyTransaction::where('store_id', $store->id)->count());
    }

    public function test_transient_failure_is_not_swallowed_and_remains_retryable(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->enableLoyalty($store);
        $customer = $this->customer($store);
        $order = $this->orderFor($store, $customer, 'delivered');

        $failing = new class extends LoyaltyService
        {
            public function earnPointsForOrder(\App\Models\Order $order): void
            {
                throw new \RuntimeException('db temporarily unavailable');
            }
        };
        $this->app->instance(LoyaltyService::class, $failing);

        $listener = app(AwardLoyaltyOnDelivery::class);
        $this->assertSame(3, $listener->tries, 'transient failures must be retried, not silently completed');
        $this->assertNotEmpty($listener->backoff);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('db temporarily unavailable');
        $listener->handle(new OrderStatusChanged($order->fresh(), 'shipped', 'delivered'));
    }

    // --- 6. LEDGER CORRECTNESS ---

    public function test_existing_ledger_and_balance_remain_correct(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->enableLoyalty($store, 2);
        $customer = $this->customer($store);

        $o1 = $this->orderFor($store, $customer, 'shipped', 100);
        $o2 = $this->orderFor($store, $customer, 'shipped', 50);

        OrderTransitionService::transition($o1, 'delivered');
        OrderTransitionService::transition($o2, 'delivered');

        $this->assertEquals(2, LoyaltyTransaction::where('store_id', $store->id)->where('type', 'earn')->count());
        $this->assertEquals(300, (int) LoyaltyTransaction::balanceFor($store->id, $customer->id));

        // Balance reconciles with the ledger chain regardless of order.
        $sum = (float) LoyaltyTransaction::where('store_id', $store->id)
            ->where('customer_id', $customer->id)
            ->sum('points');
        $this->assertEquals(300, (int) $sum);
    }
}