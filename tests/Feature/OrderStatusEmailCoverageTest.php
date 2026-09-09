<?php

namespace Tests\Feature;

use App\Events\OrderCreated;
use App\Events\OrderStatusChanged;
use App\Jobs\SendMerchantWhatsAppNotification;
use App\Jobs\SendStoreCustomerEmail;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderShipment;
use App\Models\Plan;
use App\Models\Store;
use App\Models\StoreEmailLog;
use App\Models\User;
use App\Services\OrderTransitionService;
use App\Services\StoreMailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * B3-01 — Customer order-status email coverage contract.
 *
 * Contract:
 *   pending    -> ALREADY COVERED (order_created on OrderCreated)
 *   confirmed  -> NO (deliberate anti-spam; order_created already covers receipt)
 *   processing -> NO (internal step, no customer-facing email)
 *   shipped    -> ALREADY COVERED (shipment_created)
 *   delivered  -> YES (shipment_delivered)
 *   cancelled  -> ALREADY COVERED (order_cancelled)
 *   refunded   -> YES (order_refunded)
 *   failed     -> YES (shipment_failed)
 *
 * All emails are store-owned only (StoreMailService), dispatched after commit
 * via SendStoreCustomerEmail, and never fall back to the Wusool mailer.
 */
class OrderStatusEmailCoverageTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(array $attrs = []): array
    {
        $plan = Plan::factory()->create(['name' => 'P' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth(), 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = $attrs['name'] ?? 'TestStore';
        $store->slug = $attrs['slug'] ?? 'tstore-' . uniqid();
        $store->theme = $attrs['theme'] ?? 'bazaar-market';
        $store->email = 'store@example.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function customerFor(Store $store, string $email = 'cust@example.com'): Customer
    {
        return Customer::create(['store_id' => $store->id, 'first_name' => 'Cust', 'last_name' => 'One', 'email' => $email, 'password' => bcrypt('pass'), 'is_active' => true]);
    }

    private function orderFor(Store $store, Customer $customer, array $overrides = []): Order
    {
        $payload = array_merge([
            'order_number' => Order::generateOrderNumber(),
            'store_id' => $store->id,
            'customer_id' => $customer->id,
            'session_id' => 'sess-' . uniqid(),
            'status' => 'pending',
            'payment_status' => 'pending',
            'customer_email' => $customer->email,
            'customer_phone' => '0599000000',
            'customer_first_name' => $customer->first_name,
            'customer_last_name' => $customer->last_name,
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
            'payment_method' => 'cod',
            'order_source' => 'storefront',
        ], $overrides);
        return Order::forceCreate($payload);
    }

    private function connectMail(Store $store, string $from = 'noreply@example.com', string $host = 'smtp.test'): void
    {
        StoreMailService::updateConfig($store, ['host' => $host, 'port' => '587', 'username' => 'u@test.com', 'password' => 'secret123', 'encryption' => 'tls', 'from_address' => $from, 'from_name' => $store->name]);
        StoreMailService::setStatus($store, StoreMailService::STATUS_CONNECTED);
    }

    // --- 1. CONFIRMED — contract NO, deliberate anti-spam ---
    public function test_confirmed_transition_sends_no_customer_email(): void
    {
        Bus::fake([SendStoreCustomerEmail::class]);
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'conf@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'pending']);
        OrderTransitionService::transition($order, 'confirmed');
        $this->assertEquals('confirmed', $order->fresh()->status);
        Bus::assertNotDispatched(SendStoreCustomerEmail::class);
    }

    // --- 2. PROCESSING — contract NO, internal step ---
    public function test_processing_transition_sends_no_customer_email(): void
    {
        Bus::fake([SendStoreCustomerEmail::class]);
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'proc@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'confirmed']);
        OrderTransitionService::transition($order, 'processing');
        $this->assertEquals('processing', $order->fresh()->status);
        Bus::assertNotDispatched(SendStoreCustomerEmail::class);
    }

    // --- 3. SHIPPED — ALREADY COVERED via shipment_created ---
    public function test_shipped_transition_dispatches_shipment_created_email(): void
    {
        Bus::fake([SendStoreCustomerEmail::class]);
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'ship@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'processing']);
        OrderTransitionService::transition($order, 'shipped');
        $this->assertEquals('shipped', $order->fresh()->status);
        Bus::assertDispatched(SendStoreCustomerEmail::class, fn($j) =>
            $j->type === 'shipment_created' && $j->orderId === $order->id && $j->storeId === $store->id);
    }

    // --- 4. DELIVERED — new coverage via shipment_delivered ---
    public function test_delivered_transition_dispatches_shipment_delivered_email(): void
    {
        Bus::fake([SendStoreCustomerEmail::class]);
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'deliv@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'shipped']);
        OrderTransitionService::transition($order, 'delivered');
        $this->assertEquals('delivered', $order->fresh()->status);
        Bus::assertDispatched(SendStoreCustomerEmail::class, fn($j) =>
            $j->type === 'shipment_delivered' && $j->orderId === $order->id && $j->storeId === $store->id);
    }

    // --- 5. REFUNDED — new coverage via order_refunded ---
    public function test_refunded_transition_dispatches_order_refunded_email(): void
    {
        Bus::fake([SendStoreCustomerEmail::class]);
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'refund@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'delivered']);
        OrderTransitionService::transition($order, 'refunded');
        $this->assertEquals('refunded', $order->fresh()->status);
        Bus::assertDispatched(SendStoreCustomerEmail::class, fn($j) =>
            $j->type === 'order_refunded' && $j->orderId === $order->id && $j->storeId === $store->id);
    }

    // --- 6. FAILED — new coverage via shipment_failed (customer-safe) ---
    public function test_failed_transition_dispatches_shipment_failed_email(): void
    {
        Bus::fake([SendStoreCustomerEmail::class]);
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'fail@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'shipped']);
        OrderTransitionService::transition($order, 'failed');
        $this->assertEquals('failed', $order->fresh()->status);
        Bus::assertDispatched(SendStoreCustomerEmail::class, fn($j) =>
            $j->type === 'shipment_failed' && $j->orderId === $order->id && $j->storeId === $store->id);
    }

    // --- 7. SKIPPED STATUSES remain skipped (confirmed + processing) ---
    public function test_skipped_statuses_remain_skipped(): void
    {
        Bus::fake([SendStoreCustomerEmail::class]);
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'skip@ex.com');
        foreach (['confirmed' => 'pending', 'processing' => 'confirmed'] as $to => $from) {
            $order = $this->orderFor($store, $customer, ['status' => $from, 'order_number' => Order::generateOrderNumber()]);
            OrderTransitionService::transition($order, $to);
            $this->assertEquals($to, $order->fresh()->status);
        }
        Bus::assertNotDispatched(SendStoreCustomerEmail::class);
    }

    // --- 7b. PENDING is covered by order_created on creation ---
    public function test_pending_receipt_is_covered_by_order_created_email(): void
    {
        Bus::fake([SendStoreCustomerEmail::class]);
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'pend@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'pending']);
        event(new OrderCreated($order));
        Bus::assertDispatched(SendStoreCustomerEmail::class, fn($j) =>
            $j->type === 'order_created' && $j->orderId === $order->id && $j->recipientEmail === $order->customer_email);
    }

    // --- 7c. CANCELLED stays covered ---
    public function test_cancelled_transition_dispatches_order_cancelled_email(): void
    {
        Bus::fake([SendStoreCustomerEmail::class]);
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'cancel@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'pending']);
        OrderTransitionService::transition($order, 'cancelled');
        Bus::assertDispatched(SendStoreCustomerEmail::class, fn($j) =>
            $j->type === 'order_cancelled' && $j->orderId === $order->id);
    }

    // --- 8. STORE-OWNED MAIL ONLY — status changes queue SendStoreCustomerEmail, never raw Mail ---
    public function test_status_email_goes_through_store_owned_mail_only(): void
    {
        Mail::fake();
        Bus::fake([SendStoreCustomerEmail::class]);
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'owned@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'delivered']);
        OrderTransitionService::transition($order, 'refunded');
        Bus::assertDispatched(SendStoreCustomerEmail::class, fn($j) => $j->type === 'order_refunded');
        Mail::assertNothingSent();
    }

    // --- 9. MISSING STORE MAIL — no fallback, order intact ---
    public function test_missing_store_mail_does_not_fallback_to_wusool(): void
    {
        Mail::fake();
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'noconn@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'delivered']);
        $this->assertFalse(StoreMailService::isConnected($store));
        $job = new SendStoreCustomerEmail($store->id, 'order_refunded', $customer->email, $order->id);
        $job->handle();
        Mail::assertNothingSent();
        $this->assertTrue(Order::where('id', $order->id)->exists());
        $log = StoreEmailLog::where('store_id', $store->id)->where('order_id', $order->id)->first();
        if ($log) {
            $this->assertNotEquals(StoreEmailLog::STATUS_SENT, $log->status);
        }
    }

    // --- 10. STORE A/B MAIL ISOLATION for the new status emails ---
    public function test_store_a_b_status_email_isolation(): void
    {
        Mail::fake();
        [$u1, $s1] = $this->ownerWithStore(['slug' => 'sa-' . uniqid(), 'name' => 'StoreA']);
        [$u2, $s2] = $this->ownerWithStore(['slug' => 'sb-' . uniqid(), 'name' => 'StoreB']);
        $this->connectMail($s1, 'a@store-a.test', 'smtp-a.test');
        $this->connectMail($s2, 'b@store-b.test', 'smtp-b.test');
        $c1 = $this->customerFor($s1, 'a1@ex.com');
        $o1 = $this->orderFor($s1, $c1, ['status' => 'shipped']);
        $c2 = $this->customerFor($s2, 'b1@ex.com');
        $o2 = $this->orderFor($s2, $c2, ['status' => 'shipped']);
        OrderTransitionService::transition($o1, 'delivered');
        OrderTransitionService::transition($o2, 'delivered');
        $this->assertEquals(1, StoreEmailLog::where('store_id', $s1->id)->where('order_id', $o1->id)->where('type', 'shipment_delivered')->count());
        $this->assertEquals(1, StoreEmailLog::where('store_id', $s2->id)->where('order_id', $o2->id)->where('type', 'shipment_delivered')->count());
        $this->assertEquals(0, StoreEmailLog::where('store_id', $s1->id)->where('order_id', $o2->id)->count());
        $this->assertEquals(0, StoreEmailLog::where('store_id', $s2->id)->where('order_id', $o1->id)->count());
        // Recipient must be the order's own customer email, never store-provider email
        $log1 = StoreEmailLog::where('store_id', $s1->id)->where('order_id', $o1->id)->first();
        $this->assertEquals('a1@ex.com', $log1->recipient);
    }

    // --- 11. REJECTED TRANSITION — no email on invalid move ---
    public function test_rejected_transition_sends_no_email(): void
    {
        Bus::fake([SendStoreCustomerEmail::class]);
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'reject@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'pending']);
        try {
            OrderTransitionService::transition($order, 'shipped');
            $this->fail('Invalid transition was allowed');
        } catch (\Exception $e) {
            // expected domain rejection
        }
        $this->assertEquals('pending', $order->fresh()->status);
        Bus::assertNotDispatched(SendStoreCustomerEmail::class);
    }

    // --- 12. SAME-STATUS UPDATE — no duplicate ---
    public function test_same_status_update_sends_no_duplicate(): void
    {
        Bus::fake([SendStoreCustomerEmail::class]);
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'same@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'processing']);
        $result = OrderTransitionService::transition($order, 'processing');
        $this->assertEquals($order->id, $result->id);
        Bus::assertNotDispatched(SendStoreCustomerEmail::class);
    }

    // --- 12b. DEDUPE when courier already sent delivered email for the same shipment ---
    public function test_delivered_after_courier_webhook_sends_one_email_only(): void
    {
        Mail::fake();
        [$user, $store] = $this->ownerWithStore();
        $this->connectMail($store);
        $customer = $this->customerFor($store, 'dedupe@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'shipped']);
        // Courier webhook already sent shipment_delivered with a shipment id
        $shipment = OrderShipment::create(['store_id' => $store->id, 'order_id' => $order->id, 'provider' => 'test', 'tracking_number' => 'TRK-' . uniqid(), 'status' => 'delivered']);
        (new SendStoreCustomerEmail($store->id, 'shipment_delivered', $customer->email, $order->id, $shipment->id, $order->customer_id))->handle();
        Mail::assertSent(\App\Mail\StoreTransactionalMail::class, 1);
        // Merchant marks the order delivered after the courier did
        Mail::fake();
        OrderTransitionService::transition($order, 'delivered');
        Mail::assertNothingSent(); // same shipment id => idempotent, no duplicate
        $logs = StoreEmailLog::where('store_id', $store->id)->where('order_id', $order->id)->where('type', 'shipment_delivered')->where('status', StoreEmailLog::STATUS_SENT)->count();
        $this->assertEquals(1, $logs);
    }

    // --- 13. ROLLBACK — afterCommit email discarded ---
    public function test_rollback_sends_no_email(): void
    {
        Mail::fake();
        [$user, $store] = $this->ownerWithStore();
        $this->connectMail($store);
        $customer = $this->customerFor($store, 'rb@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'shipped']);
        try {
            DB::transaction(function () use ($order) {
                event(new OrderStatusChanged($order, 'shipped', 'delivered'));
                throw new \Exception('force rollback');
            });
        } catch (\Throwable $e) {
            // expected
        }
        // afterCommit deferral means a rolled-back transition must never deliver mail
        Mail::assertNothingSent();
        $this->assertEquals(0, StoreEmailLog::count());
    }

    // --- 14. QUEUED MAIL PRESERVES STORE AUTHORITY ---
    public function test_queued_email_preserves_store_authority(): void
    {
        Mail::fake();
        [$u1, $s1] = $this->ownerWithStore(['slug' => 'qsa-' . uniqid()]);
        [$u2, $s2] = $this->ownerWithStore(['slug' => 'qsb-' . uniqid()]);
        $this->connectMail($s1, 'from-a@store.test', 'smtp-a.test');
        $this->connectMail($s2, 'from-b@store.test', 'smtp-b.test');
        $c1 = $this->customerFor($s1, 'qa@ex.com');
        $o1 = $this->orderFor($s1, $c1, ['status' => 'delivered']);
        $jobA = new SendStoreCustomerEmail($s1->id, 'order_refunded', $c1->email, $o1->id, null, $o1->customer_id);
        $this->assertEquals('notifications', $jobA->queue);
        $jobA->handle();
        $this->assertEquals('from-a@store.test', config('mail.from.address'));
        $this->assertEquals('smtp-a.test', config('mail.mailers.smtp.host'));
        // Now store B job must flip config to B — never reuse A
        $c2 = $this->customerFor($s2, 'qb@ex.com');
        $o2 = $this->orderFor($s2, $c2, ['status' => 'delivered']);
        (new SendStoreCustomerEmail($s2->id, 'order_refunded', $c2->email, $o2->id, null, $o2->customer_id))->handle();
        $this->assertEquals('from-b@store.test', config('mail.from.address'));
        $this->assertEquals('smtp-b.test', config('mail.mailers.smtp.host'));
        $this->assertEquals(0, StoreEmailLog::where('store_id', $s1->id)->where('order_id', $o2->id)->count());
        $this->assertEquals(0, StoreEmailLog::where('store_id', $s2->id)->where('order_id', $o1->id)->count());
    }

    // --- 15. WHATSAPP NON-REGRESSION ---
    public function test_status_emails_do_not_alter_whatsapp_dispatch(): void
    {
        Bus::fake([SendStoreCustomerEmail::class, SendMerchantWhatsAppNotification::class]);
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'wa2@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'shipped']);
        OrderTransitionService::transition($order, 'delivered');
        Bus::assertDispatched(SendStoreCustomerEmail::class, fn($j) => $j->type === 'shipment_delivered');
        // Status-change emails must NEVER trigger WhatsApp dispatch
        Bus::assertNotDispatched(SendMerchantWhatsAppNotification::class);
    }

    public function test_whatsapp_order_created_dispatch_unchanged(): void
    {
        Bus::fake([SendStoreCustomerEmail::class, SendMerchantWhatsAppNotification::class]);
        [$user, $store] = $this->ownerWithStore();
        $customer = $this->customerFor($store, 'wa3@ex.com');
        $order = $this->orderFor($store, $customer, ['payment_method' => 'whatsapp', 'order_source' => 'whatsapp', 'whatsapp_number' => '+970599000000']);
        event(new OrderCreated($order));
        Bus::assertDispatched(SendMerchantWhatsAppNotification::class, fn($j) => $j->orderId === $order->id);
        Bus::assertDispatched(SendStoreCustomerEmail::class, fn($j) => $j->type === 'order_created' && $j->orderId === $order->id);
    }

    // --- CONTENT TRUTH (canonical customer-safe Arabic, no internal enum) ---
    public function test_refunded_email_content_uses_canonical_label(): void
    {
        Mail::fake();
        [$user, $store] = $this->ownerWithStore(['name' => 'متجري']);
        $this->connectMail($store);
        $customer = $this->customerFor($store, 'content@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'delivered']);
        OrderTransitionService::transition($order, 'refunded');
        Mail::assertSent(\App\Mail\StoreTransactionalMail::class, function ($mail) use ($order) {
            return str_contains($mail->subjectLine, 'تم استرداد المبلغ')
                && str_contains($mail->subjectLine, $order->order_number)
                && !str_contains($mail->htmlBody, 'refunded')
                && !str_contains($mail->htmlBody, 'Refunded');
        });
    }

    public function test_delivered_email_content_uses_shipping_label(): void
    {
        Mail::fake();
        [$user, $store] = $this->ownerWithStore(['name' => 'متجري']);
        $this->connectMail($store);
        $customer = $this->customerFor($store, 'dcontent@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'shipped']);
        OrderTransitionService::transition($order, 'delivered');
        Mail::assertSent(\App\Mail\StoreTransactionalMail::class, function ($mail) {
            return str_contains($mail->subjectLine, 'تم التسليم');
        });
    }

    public function test_failed_email_content_is_neutral_customer_safe(): void
    {
        Mail::fake();
        [$user, $store] = $this->ownerWithStore(['name' => 'متجري']);
        $this->connectMail($store);
        $customer = $this->customerFor($store, 'fcontent@ex.com');
        $order = $this->orderFor($store, $customer, ['status' => 'shipped']);
        OrderTransitionService::transition($order, 'failed');
        Mail::assertSent(\App\Mail\StoreTransactionalMail::class, function ($mail) {
            return str_contains($mail->htmlBody, 'تعذر توصيل')
                && !str_contains($mail->htmlBody, 'فشل');
        });
    }
}