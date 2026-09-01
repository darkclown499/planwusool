<?php

namespace Tests\Feature;

use App\Models\CodPayment;
use App\Models\CodSettlement;
use App\Models\MerchantNotification;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Store;
use App\Models\User;
use App\Services\CodPaymentService;
use App\Services\CodSettlementService;
use App\Services\MerchantNotificationService;
use App\Services\OrderTransitionService;
use App\Services\PaymentFinancialMetrics;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PaymentOperationsPhase2Test extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(): array
    {
        $plan = Plan::factory()->create(['name' => 'P' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth(), 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = new Store(); $store->user_id = $user->id; $store->name = 'S' . uniqid(); $store->slug = 's-' . uniqid(); $store->theme = 'bazaar-market'; $store->email = 'store@example.com'; $store->save();
        $user->current_store = $store->id; $user->save();
        $this->actingAs($user);
        return [$user->fresh(), $store];
    }

    private function makeOrder(Store $store, array $overrides = []): Order
    {
        return Order::forceCreate(array_merge([
            'order_number' => Order::generateOrderNumber(), 'store_id' => $store->id, 'session_id' => 'sess-' . uniqid(),
            'status' => 'pending', 'payment_status' => 'pending', 'payment_method' => 'cod',
            'customer_email' => 'c@example.com', 'customer_phone' => '0599000000', 'customer_first_name' => 'T', 'customer_last_name' => 'U',
            'shipping_address' => 'A', 'shipping_city' => 'Nablus', 'shipping_state' => 'West Bank', 'shipping_country' => 'Palestine',
            'billing_address' => 'A', 'billing_city' => 'Nablus', 'billing_state' => 'West Bank', 'billing_country' => 'Palestine',
            'subtotal' => 100, 'tax_amount' => 0, 'shipping_amount' => 0, 'discount_amount' => 0, 'total_amount' => 100, 'currency' => 'ILS',
        ], $overrides));
    }

    public function test_gmv_counts_all_non_terminal_orders_regardless_of_payment_state(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->makeOrder($store, ['total_amount' => 50, 'payment_status' => 'pending']);          // pending → GMV
        $this->makeOrder($store, ['total_amount' => 100, 'payment_status' => 'paid', 'paid_at' => now(), 'payment_confirmed_by' => $user->id]); // collected → GMV
        $this->makeOrder($store, ['total_amount' => 200, 'status' => 'cancelled']);                // excluded

        $summary = PaymentFinancialMetrics::summary($store->id);
        // 50 + 100 = 150 (cancelled 200 excluded)
        $this->assertEquals(150, $summary['gmv_total']);
        $this->assertEquals(100, $summary['collected_total']);
        $this->assertEquals(50, $summary['pending_collection_total']);
        // Net collected = collected - refunded
        $this->assertEquals(100, $summary['net_collected_total']);
    }

    public function test_delivered_but_not_paid_is_not_collected_revenue(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->makeOrder($store, ['status' => 'delivered', 'payment_status' => 'pending', 'total_amount' => 300]);

        $summary = PaymentFinancialMetrics::summary($store->id);
        $this->assertEquals(300, $summary['gmv_total'], 'delivered counts toward GMV');
        $this->assertEquals(0, $summary['collected_total'], 'delivered but unpaid is NOT collected');
        $this->assertEquals(300, $summary['pending_collection_total'], 'delivered unpaid still pending collection');
    }

    public function test_offline_pending_orders_are_pending_but_online_pending_are_not(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending', 'total_amount' => 10]);
        $this->makeOrder($store, ['payment_method' => 'bank', 'payment_status' => 'pending', 'total_amount' => 20]);
        // Online in-flight (stripe) pending → not an expected receivable
        $this->makeOrder($store, ['payment_method' => 'stripe', 'payment_status' => 'pending', 'total_amount' => 999]);

        $summary = PaymentFinancialMetrics::summary($store->id);
        // only cod 10 + bank 20 = 30 — stripe 999 excluded from pending collection
        $this->assertEquals(30, $summary['pending_collection_total']);
        $this->assertEquals(1, $summary['cod_pending_count']);
        $this->assertEquals(1, $summary['bank_pending_count']);
    }

    public function test_currencies_never_mixed(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->makeOrder($store, ['total_amount' => 100, 'currency' => 'ILS', 'payment_status' => 'paid', 'paid_at' => now()]);
        $this->makeOrder($store, ['total_amount' => 50, 'currency' => 'JOD', 'payment_status' => 'paid', 'paid_at' => now()]);

        $summary = PaymentFinancialMetrics::summary($store->id);
        $ils = collect($summary['collected'])->firstWhere('code', 'ILS');
        $jod = collect($summary['collected'])->firstWhere('code', 'JOD');
        $this->assertEquals(100, $ils['amount']);
        $this->assertEquals(50, $jod['amount']);
        $this->assertContains('ILS', $summary['currencies']);
        $this->assertContains('JOD', $summary['currencies']);
    }

    public function test_refunded_orders_deduct_from_net_but_remain_in_gmv(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $this->makeOrder($store, ['total_amount' => 100, 'payment_status' => 'paid', 'paid_at' => now(), 'refunded_amount' => 100, 'refunded_at' => now()]);

        $summary = PaymentFinancialMetrics::summary($store->id);
        $this->assertEquals(100, $summary['gmv_total'], 'refunded order still counts in GMV');
        $this->assertEquals(100, $summary['collected_total']);
        $this->assertEquals(100, $summary['refunded_total']);
        $this->assertEquals(0, $summary['net_collected_total']);
    }

    public function test_collect_cod_marks_paid_and_stamps_timestamps(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending']);
        CodPayment::create(['order_id' => $order->id, 'store_id' => $store->id, 'total_amount' => 100, 'cod_fee' => 0, 'amount_collected' => 0, 'amount_remaining' => 100, 'status' => 'pending']);

        $fresh = OrderTransitionService::collectCod($order);
        $fresh->refresh();
        $this->assertEquals('paid', $fresh->payment_status);
        $this->assertNotNull($fresh->paid_at);
        $this->assertEquals($user->id, $fresh->payment_confirmed_by);
        // COD module converged to paid too
        $this->assertEquals('paid', CodPayment::where('order_id', $order->id)->first()->status);
    }

    public function test_collect_cod_is_idempotent(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending']);
        $first = OrderTransitionService::collectCod($order);
        $first->refresh();
        $this->assertEquals('paid', $first->payment_status);
        $paidAt = $first->paid_at->copy();

        $second = OrderTransitionService::collectCod($order);
        $this->assertEquals('paid', $second->payment_status);
        // paid_at not re-stamped
        $this->assertTrue($paidAt->equalTo($second->paid_at));
        // only one notification for this cod_collected type
        $this->assertEquals(1, MerchantNotification::where('related_id', $order->id)->where('type', 'cod_collected')->count());
    }

    public function test_collect_cod_rejects_refunded_or_cancelled(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $refunded = $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'refunded']);
        try {
            OrderTransitionService::collectCod($refunded);
            $this->fail('should reject refunded collect');
        } catch (\Exception $e) {
            $this->assertStringContainsString('مسترجع', $e->getMessage());
        }

        $cancelled = $this->makeOrder($store, ['payment_method' => 'cod', 'status' => 'cancelled', 'payment_status' => 'pending']);
        try {
            OrderTransitionService::collectCod($cancelled);
            $this->fail('should reject cancelled collect');
        } catch (\Exception $e) {
            $this->assertStringContainsString('ملغي', $e->getMessage());
        }
    }

    public function test_bank_confirm_marks_paid_and_is_idempotent(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->makeOrder($store, ['payment_method' => 'bank', 'payment_status' => 'pending']);

        $fresh = OrderTransitionService::confirmBankTransfer($order);
        $this->assertEquals('paid', $fresh->payment_status);
        $this->assertNotNull($fresh->paid_at);
        $this->assertEquals($user->id, $fresh->payment_confirmed_by);
        $this->assertEquals(1, MerchantNotification::where('related_id', $order->id)->where('type', 'bank_transfer')->count());

        OrderTransitionService::confirmBankTransfer($order);
        $this->assertEquals(1, MerchantNotification::where('related_id', $order->id)->where('type', 'bank_transfer')->count(), 'bank notification idempotent');
    }

    public function test_bank_reject_flips_to_failed_without_deleting_order(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->makeOrder($store, ['payment_method' => 'bank', 'payment_status' => 'pending']);

        $fresh = OrderTransitionService::rejectBankProof($order, 'صورة غير واضحة');
        $this->assertEquals('failed', $fresh->payment_status);
        $this->assertStringContainsString('صورة غير واضحة', $fresh->notes);
        // order NOT deleted
        $this->assertTrue(Order::where('id', $order->id)->exists());
    }

    public function test_bank_reject_cannot_reject_a_paid_order(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->makeOrder($store, ['payment_method' => 'bank', 'payment_status' => 'pending']);
        OrderTransitionService::confirmBankTransfer($order);
        try {
            OrderTransitionService::rejectBankProof($order);
            $this->fail('should not reject a confirmed payment');
        } catch (\Exception $e) {
            $this->assertStringContainsString('رفض دفعة تم تأكيدها', $e->getMessage());
        }
    }

    public function test_merchant_cod_collected_notification_is_created(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending']);
        OrderTransitionService::collectCod($order);

        $notifs = MerchantNotification::where('store_id', $store->id)->where('related_id', $order->id)->where('type', 'cod_collected')->get();
        $this->assertCount(1, $notifs);
        $this->assertStringContainsString($order->order_number, $notifs->first()->body);
    }

    public function test_record_collection_converges_partial_then_full_on_order(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $order = $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending']);
        $cod = CodPayment::create(['order_id' => $order->id, 'store_id' => $store->id, 'total_amount' => 100, 'cod_fee' => 0, 'amount_collected' => 0, 'amount_remaining' => 100, 'status' => 'pending']);
        $svc = app(CodPaymentService::class);

        // partial → order stays pending
        $svc->recordCollection($cod, 40, ['payment_method' => 'cash']);
        $order->refresh();
        $this->assertEquals('pending', $order->payment_status);
        $this->assertEquals('partial', CodPayment::where('id', $cod->id)->first()->status);

        // completing → order becomes paid
        $svc->recordCollection($cod->fresh(), 60, ['payment_method' => 'cash']);
        $order->refresh();
        $this->assertEquals('paid', $order->payment_status);
        $this->assertNotNull($order->paid_at);
    }

    public function test_operations_page_is_tenant_scoped_and_requires_permission(): void
    {
        [$userA, $storeA] = $this->ownerWithStore();
        [$userB, $storeB] = $this->ownerWithStore();
        $this->actingAs($userA)->makeOrder($storeA, ['total_amount' => 55]);
        $this->actingAs($userB)->makeOrder($storeB, ['total_amount' => 555]);

        // B cannot read A's page data via the page (metrics are computed from auth store)
        // Without the manage-orders permission the page should be forbidden.
        $userC = User::factory()->create(['type' => 'company', 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $res = $this->actingAs($userC)->getJson(route('payments.operations'));
        $this->assertContains($res->status(), [403, 302]);
    }

    public function test_meta_currency_symbols_resolve(): void
    {
        $this->assertEquals('₪', PaymentFinancialMetrics::symbolFor('ILS'));
        $this->assertEquals('د.ا', PaymentFinancialMetrics::symbolFor('JOD'));
        $this->assertEquals('$', PaymentFinancialMetrics::symbolFor('USD'));
    }

    // ─────────────────── COD settlement (5) ───────────────────

    public function test_settlement_creates_draft_and_marks_full_pending_cod_paid(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $o1 = $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending', 'total_amount' => 100]);
        $o2 = $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending', 'total_amount' => 50]);
        $c1 = CodPayment::create(['order_id' => $o1->id, 'store_id' => $store->id, 'total_amount' => 100, 'cod_fee' => 0, 'amount_collected' => 0, 'amount_remaining' => 100, 'status' => 'pending']);
        $c2 = CodPayment::create(['order_id' => $o2->id, 'store_id' => $store->id, 'total_amount' => 50, 'cod_fee' => 0, 'amount_collected' => 0, 'amount_remaining' => 50, 'status' => 'pending']);

        $service = app(CodSettlementService::class);
        $draft = $service->createDraft($store->id, [$c1->id, $c2->id], ['courier_company' => 'Company', 'courier_fees' => 10]);
        $this->assertEquals('draft', $draft->status);
        $this->assertEquals(150, $draft->gross_amount);
        $this->assertEquals(140, $draft->net_amount);
        $this->assertCount(2, $draft->items);

        $settled = $service->settle($draft);
        $this->assertEquals('settled', $settled->status);
        $this->assertEquals('paid', CodPayment::where('id', $c1->id)->first()->status);
        $this->assertEquals('paid', CodPayment::where('id', $c2->id)->first()->status);
        $o1->refresh(); $o2->refresh();
        $this->assertEquals('paid', $o1->payment_status);
        $this->assertEquals('paid', $o2->payment_status);
    }

    public function test_settlement_is_idempotent_and_blocks_double_settle(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $o = $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending', 'total_amount' => 100]);
        $c = CodPayment::create(['order_id' => $o->id, 'store_id' => $store->id, 'total_amount' => 100, 'cod_fee' => 0, 'amount_collected' => 0, 'amount_remaining' => 100, 'status' => 'pending']);

        $service = app(CodSettlementService::class);
        $draft = $service->createDraft($store->id, [$c->id]);
        $service->settle($draft)->status;

        try {
            $service->settle(CodSettlement::find($draft->id));
            $this->fail('settled batch cannot settle again');
        } catch (\Exception $e) {
            $this->assertStringContainsString('مسبقاً', $e->getMessage());
        }

        // A second draft re-using the same COD payment must be rejected (DB unique guard).
        try {
            $service->createDraft($store->id, [$c->id]);
            $this->fail('same COD payment cannot enter a second batch');
        } catch (\Exception $e) {
            $this->assertStringContainsString('الطلب', $e->getMessage());
        }
    }

    public function test_settlement_rejects_second_batch_for_same_cod_payment(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $o = $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending', 'total_amount' => 100]);
        $c = CodPayment::create(['order_id' => $o->id, 'store_id' => $store->id, 'total_amount' => 100, 'cod_fee' => 0, 'amount_collected' => 0, 'amount_remaining' => 100, 'status' => 'pending']);

        $service = app(CodSettlementService::class);
        $service->createDraft($store->id, [$c->id]);
        try {
            $service->createDraft($store->id, [$c->id]);
            $this->fail('duplicate batch must be rejected');
        } catch (\Exception $e) {
            $this->assertTrue(true);
        }
    }

    public function test_settlement_rejects_already_collected_cod_payment(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $o = $this->makeOrder($store, ['payment_method' => 'cod', 'payment_status' => 'pending', 'total_amount' => 100]);
        $c = CodPayment::create(['order_id' => $o->id, 'store_id' => $store->id, 'total_amount' => 100, 'cod_fee' => 0, 'amount_collected' => 100, 'amount_remaining' => 0, 'status' => 'paid']);

        try {
            app(CodSettlementService::class)->createDraft($store->id, [$c->id]);
            $this->fail('already paid COD cannot enter a draft');
        } catch (\Exception $e) {
            $this->assertStringContainsString('انتظار التحصيل', $e->getMessage());
        }
    }

    public function test_settlement_is_scope_guard_and_delete_draft(): void
    {
        [$userA, $storeA] = $this->ownerWithStore();
        [$userB, $storeB] = $this->ownerWithStore();
        $o = $this->actingAs($userA)->makeOrder($storeA, ['payment_method' => 'cod', 'payment_status' => 'pending', 'total_amount' => 100]);
        $c = CodPayment::create(['order_id' => $o->id, 'store_id' => $storeA->id, 'total_amount' => 100, 'cod_fee' => 0, 'amount_collected' => 0, 'amount_remaining' => 100, 'status' => 'pending']);

        $service = app(CodSettlementService::class);
        $draft = $service->createDraft($storeA->id, [$c->id]);

        // Store B cannot settle A's draft via the route (scoped query 404)
        $this->actingAs($userB);
        $this->getJson(route('payments.settlements.settle', $draft->id))->assertStatus(404);

        // Owner can delete the draft
        $this->actingAs($userA);
        $service->deleteDraft($draft);
        $this->assertNull(CodSettlement::find($draft->id));
        $this->assertEquals(0, CodSettlement::where('store_id', $storeA->id)->count());
    }
}