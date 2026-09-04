<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Customer;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\InventoryService;
use App\Services\PointOfSaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * WUSOL POS + UNIFIED INVENTORY (Phase 1) feature certification.
 *
 * Proves the single canonical inventory truth is shared by online checkout and
 * in-store POS, that POS sales become real orders with order_source='pos', that
 * the stock-movement ledger records the correct movement types + deltas, that
 * manual adjustments respect no-negative-stock, and that everything is
 * store-scoped (no cross-store IDOR).
 */
class PosUnifiedInventoryPhase1Test extends TestCase
{
    use RefreshDatabase;

    private function merchantWithStore(): array
    {
        $plan = \App\Models\Plan::factory()->create([
            'name' => 'POS-'.uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_products_per_store' => 1000,
            'max_stores' => 10,
        ]);
        $user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
        ]);
        $store = Store::factory()->create(['user_id' => $user->id, 'currency' => 'ILS']);
        $user->current_store = $store->id;
        $user->save();
        try {
            $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'pos-test-'.uniqid(), 'guard_name' => 'web']);
            $perms = \Spatie\Permission\Models\Permission::whereIn('name', ['manage-pos'])->get();
            if ($perms->count() > 0) {
                $role->syncPermissions($perms);
                $user->assignRole($role);
            } else {
                $user->type = 'superadmin';
                $user->save();
            }
        } catch (\Throwable $e) {
            $user->type = 'superadmin';
            $user->save();
        }
        return [$user, $store];
    }

    private function category(Store $store): Category
    {
        return Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
    }

    private function product(Store $store, Category $cat, array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $store->id,
            'category_id' => $cat->id,
            'is_active' => true,
            'price' => 100,
            'stock' => 50,
            'track_inventory' => true,
            'allow_backorder' => false,
            'inventory_mode' => 'product',
            'variants' => [],
            'variant_combinations' => [],
        ], $overrides));
    }

    private function variantProduct(Store $store, Category $cat): Product
    {
        $combos = [
            ['id' => 'Red‖S', 'uuid' => 'uuid-red-s', 'values' => ['Red','S'], 'label' => 'Red / S', 'price' => '100', 'stock' => '5', 'sku' => 'RED-S', 'image' => ''],
            ['id' => 'Red‖M', 'uuid' => 'uuid-red-m', 'values' => ['Red','M'], 'label' => 'Red / M', 'price' => '110', 'stock' => '10', 'sku' => 'RED-M', 'image' => ''],
        ];
        return $this->product($store, $cat, [
            'inventory_mode' => 'variant',
            'variants' => [['name' => 'Color', 'values' => ['Red']], ['name' => 'Size', 'values' => ['S','M']]],
            'variant_combinations' => $combos,
            'stock' => 999,
        ]);
    }

    // ---------------------------------------------------------------------
    // 1. POS sale decrements the SAME canonical stock as online checkout.
    // ---------------------------------------------------------------------

    public function test_pos_sale_decrements_product_stock_and_records_movement(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 10, 'sku' => 'SKU-POS-1']);

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 3]],
            'cash'
        );

        $p->refresh();
        $this->assertSame(7, (int) $p->stock, 'POS must decrement canonical product stock');
        $this->assertSame('pos', $order->order_source);
        $this->assertNotNull($order->id);
        $this->assertSame('delivered', $order->status);
        $this->assertSame('paid', $order->payment_status);
        $this->assertSame($user->id, (int) $order->payment_confirmed_by);

        $mv = InventoryMovement::where('store_id', $store->id)
            ->where('product_id', $p->id)
            ->where('movement_type', InventoryMovement::MOVEMENT_POS_SALE)
            ->first();
        $this->assertNotNull($mv, 'POS_SALE movement must be recorded on the ledger');
        $this->assertSame(-3, $mv->quantity_delta);
        $this->assertSame(10, $mv->before_quantity);
        $this->assertSame(7, $mv->after_quantity);
        $this->assertSame('order', $mv->reference_type);
        $this->assertSame($order->id, (int) $mv->reference_id);
    }

    public function test_online_and_pos_share_one_inventory_truth(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 10]);

        // Online checkout consumes 4 -> 6.
        app(\App\Services\OrderService::class)->createOrder([
            'store_id' => $store->id, 'customer_email' => 'a@test.com', 'customer_phone' => '0599000000',
            'customer_first_name' => 'A', 'customer_last_name' => 'B',
            'shipping_address' => 'addr', 'shipping_city' => 'c', 'shipping_state' => 's', 'shipping_country' => 'PS',
            'billing_address' => 'addr', 'billing_city' => 'c', 'billing_state' => 's', 'billing_country' => 'PS',
            'subtotal' => 400, 'tax_amount' => 0, 'shipping_amount' => 0, 'discount_amount' => 0, 'total_amount' => 400,
            'payment_method' => 'cod', 'order_source' => 'storefront',
        ], [['product_id' => $p->id, 'name' => $p->name, 'sku' => $p->sku, 'price' => 100, 'sale_price' => null, 'quantity' => 4, 'variants' => null]]);
        $p->refresh();
        $this->assertSame(6, (int) $p->stock);

        // POS consumes 4 from the same row -> 2.
        app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 4]], 'cash');
        $p->refresh();
        $this->assertSame(2, (int) $p->stock, 'POS must see stock already consumed by online channel');

        $this->assertSame(
            1,
            (int) InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->where('movement_type', InventoryMovement::MOVEMENT_ONLINE_SALE)->count()
        );
        $this->assertSame(
            1,
            (int) InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->where('movement_type', InventoryMovement::MOVEMENT_POS_SALE)->count()
        );
    }

    public function test_pos_decrements_exact_variant_not_product_stock(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->variantProduct($store, $cat);

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'variant_id' => 'Red‖S', 'quantity' => 2]],
            'cash'
        );

        $p->refresh();
        $this->assertSame('3', $p->variant_combinations[0]['stock'], 'only Red/S must decrement');
        $this->assertSame('10', $p->variant_combinations[1]['stock'], 'other variant untouched');
        $this->assertSame(999, (int) $p->stock, 'product stock must remain the sentinel in variant mode');

        $item = $order->items->first();
        $this->assertSame('Red‖S', $item->variant_combination_id);
        $this->assertSame('variant', $item->inventory_mode);

        $mv = InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->where('movement_type', InventoryMovement::MOVEMENT_POS_SALE)->first();
        $this->assertNotNull($mv);
        $this->assertSame(-2, $mv->quantity_delta);
        $this->assertSame('uuid-red-s', $mv->variant_uuid);
    }

    public function test_pos_variant_resolved_by_uuid(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->variantProduct($store, $cat);

        app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'variant_uuid' => 'uuid-red-m', 'quantity' => 1]],
            'cash'
        );

        $p->refresh();
        $this->assertSame('9', $p->variant_combinations[1]['stock']);
        $this->assertSame('5', $p->variant_combinations[0]['stock']);
    }

    // ---------------------------------------------------------------------
    // 2. Insufficient stock and no-negative-stock.
    // ---------------------------------------------------------------------

    public function test_pos_insufficient_stock_rejected(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 2]);

        $this->expectException(\Exception::class);
        app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 5]], 'cash');
    }

    public function test_pos_oos_variant_rejected(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->variantProduct($store, $cat);
        $combos = $p->variant_combinations;
        $combos[0]['stock'] = '1';
        $p->variant_combinations = $combos;
        $p->save();

        $this->expectException(\Exception::class);
        app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'variant_id' => 'Red‖S', 'quantity' => 2]], 'cash');
    }

    public function test_pos_rejected_sale_does_not_move_ledger(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 1]);

        try {
            app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 9]], 'cash');
        } catch (\Exception $e) {
        }

        $p->refresh();
        $this->assertSame(1, (int) $p->stock);
        $this->assertSame(0, (int) InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->where('movement_type', InventoryMovement::MOVEMENT_POS_SALE)->count());
        $this->assertSame(0, (int) Order::where('store_id', $store->id)->where('order_source', 'pos')->count());
    }

    // ---------------------------------------------------------------------
    // 3. POS order shape, optional customer, cash/collected semantics.
    // ---------------------------------------------------------------------

    public function test_pos_order_source_and_walkin_customer(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 5]);

        $order = app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 1]], 'cash', null, 'walk-in note');

        $this->assertSame('pos', $order->order_source);
        $this->assertNull($order->customer_id, 'walk-in POS sale must not be linked to a customer');
        $this->assertSame('زبون مباشر', $order->customer_first_name);
        $this->assertSame('walk-in note', $order->notes);
        $this->assertSame('delivered', $order->status);
        $this->assertNotNull($order->delivered_at);
        $this->assertSame('paid', $order->payment_status);
        $this->assertNotNull($order->paid_at);
    }

    public function test_pos_links_validated_store_customer(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 5]);
        $cust = Customer::create(['store_id' => $store->id, 'first_name' => 'سارة', 'last_name' => '', 'email' => 'sara@test.com', 'phone' => '0599000001']);

        $order = app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 1]], 'cash', $cust->id);

        $this->assertSame($cust->id, (int) $order->customer_id);
    }

    public function test_pos_rejects_cross_store_customer(): void
    {
        [$user, $store] = $this->merchantWithStore();
        [, $otherStore] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 5]);
        $otherCust = Customer::create(['store_id' => $otherStore->id, 'first_name' => 'X', 'last_name' => '', 'email' => 'x@x.com', 'phone' => '0599999999']);

        $this->expectException(\Exception::class);
        app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 1]], 'cash', $otherCust->id);
    }

    public function test_pos_cash_is_always_paid_regardless_of_mark_collected_param(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 5]);

        // POS cash is ALWAYS paid — server overrides legacy $markCollected=false.
        $order = app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 1]], 'cash', null, null, false);

        $this->assertSame('delivered', $order->status);
        $this->assertSame('paid', $order->payment_status, 'POS cash is always paid — server overrides stale client');
        $this->assertNotNull($order->paid_at);
    }

    public function test_pos_rejects_bad_payment_method(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 5]);

        $this->expectException(\Exception::class);
        app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 1]], 'credit_card');
    }

    // Blocker 1 — POS payment semantics: only in-store CASH collected by the cashier is
    // auto-paid; bank/bank_transfer stay pending until the authoritative manual confirm.
    // COD is NOT exposed in Phase 1 POS.

    public function test_pos_cash_collected_is_paid_and_confirmed(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 5]);

        $order = app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 1]], 'cash', null, null, true);

        $this->assertSame('paid', $order->payment_status);
        $this->assertNotNull($order->paid_at);
        $this->assertSame($user->id, $order->payment_confirmed_by);
        $this->assertSame('delivered', $order->status);
    }

    public function test_pos_bank_transfer_is_never_auto_paid(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 5]);

        // Even with $markCollected = true, a bank transfer is NEVER auto-paid at creation.
        $order = app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 1]], 'bank_transfer', null, null, true);

        $this->assertSame('pending', $order->payment_status);
        $this->assertNull($order->paid_at);
        $this->assertNull($order->payment_confirmed_by);
    }

    public function test_pos_bank_is_never_auto_paid(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 5]);

        $order = app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 1]], 'bank', null, null, true);

        $this->assertSame('pending', $order->payment_status);
        $this->assertNull($order->paid_at);
        $this->assertNull($order->payment_confirmed_by);
    }

    public function test_pos_rejects_cod_payment_method(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 5]);

$this->expectException(\Exception::class);
        app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 1]], 'cod');
    }

    public function test_pos_bank_transfer_paid_only_via_authoritative_confirm(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 5]);

        $order = app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 1]], 'bank_transfer', null, null, true);
        $oid = $order->id;

        // Creation must leave it pending — not auto-paid.
        $this->assertSame('pending', $order->payment_status);
        $this->assertNull($order->paid_at);

        // The existing canonical manual confirm is the authoritative path that marks it paid.
        $confirmed = \App\Services\OrderTransitionService::confirmBankTransfer($order);
        $this->assertSame('paid', $confirmed->payment_status);
        $this->assertNotNull($confirmed->paid_at);

        // A later re-confirm stays exactly-once (no-op returning the already-paid order).
        $again = \App\Services\OrderTransitionService::confirmBankTransfer($confirmed);
        $this->assertSame('paid', $again->payment_status);
        $this->assertSame($confirmed->paid_at?->toDateTimeString(), $again->paid_at?->toDateTimeString());
    }

    // ---------------------------------------------------------------------
    // 4. Cancel restores once; returns via canonical service.
    // ---------------------------------------------------------------------

    public function test_pos_order_cancel_restores_once(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 5]);

        $order = app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 2]], 'cash');
        $p->refresh();
        $this->assertSame(3, (int) $p->stock);

        $order->update(['status' => 'cancelled']);
        $p->refresh();
        $this->assertSame(5, (int) $p->stock, 'cancel must restore to canonical stock');
        $this->assertSame(
            1,
            (int) InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->where('movement_type', InventoryMovement::MOVEMENT_ORDER_CANCEL_RESTOCK)->count()
        );

        $order->update(['status' => 'refunded']);
        $p->refresh();
        $this->assertSame(5, (int) $p->stock, 'second terminal transition must not double-restore');
        $this->assertSame(
            1,
            (int) InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->where('movement_type', InventoryMovement::MOVEMENT_ORDER_CANCEL_RESTOCK)->count(),
            'only one cancel-restock movement may exist'
        );
    }

    public function test_return_restock_via_canonical_service(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 10]);

        $order = Order::forceCreate([
            'store_id' => $store->id,
            'order_number' => Order::generateOrderNumber(),
            'status' => 'pending',
            'payment_status' => 'pending',
            'stock_restored' => false,
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_email' => 'r@test.com',
            'customer_phone' => '0599000000',
            'shipping_address' => 'a', 'shipping_city' => 'c', 'shipping_state' => 's', 'shipping_country' => 'PS',
            'billing_address' => 'a', 'billing_city' => 'c', 'billing_state' => 's', 'billing_country' => 'PS',
            'subtotal' => 100, 'tax_amount' => 0, 'shipping_amount' => 0, 'discount_amount' => 0, 'total_amount' => 100,
            'payment_method' => 'cod',
        ]);
        $item = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $p->id,
            'product_name' => $p->name,
            'product_sku' => $p->sku,
            'product_price' => 100,
            'quantity' => 2,
            'unit_price' => 100,
            'total_price' => 200,
            'inventory_mode' => 'product',
        ]);
        $item->refresh();

        InventoryService::restockQuantity($item, 2, $store->id);
        $p->refresh();
        $this->assertSame(12, (int) $p->stock, 'return restock must increase canonical stock');
        $this->assertSame(
            1,
            (int) InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->where('movement_type', InventoryMovement::MOVEMENT_RETURN_RESTOCK)->count()
        );
    }

    // ---------------------------------------------------------------------
    // 5. Manual adjustment ledger + no-negative-stock.
    // ---------------------------------------------------------------------

    public function test_manual_adjustment_records_delta_and_flag(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 10]);

        $r = InventoryService::adjustStock($p, 5, $store->id, null, null, 'restock shelf', $user->id);
        $this->assertTrue($r['success']);
        $this->assertSame('product', $r['mode']);
        $this->assertSame(10, $r['before']);
        $this->assertSame(15, $r['after']);

        $p->refresh();
        $this->assertSame(15, (int) $p->stock);

        $mv = InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->where('movement_type', InventoryMovement::MOVEMENT_MANUAL_ADJUSTMENT)->first();
        $this->assertNotNull($mv);
        $this->assertSame(5, $mv->quantity_delta);
        $this->assertSame(10, $mv->before_quantity);
        $this->assertSame(15, $mv->after_quantity);
        $this->assertSame('restock shelf', $mv->note);
    }

    public function test_manual_decrease_without_negative(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 3]);

        $r = InventoryService::adjustStock($p, -5, $store->id, null, null, 'below zero attempt', $user->id);
        $this->assertFalse($r['success']);
        $p->refresh();
        $this->assertSame(3, (int) $p->stock, 'stock must never go negative on manual adjustment');
        $this->assertSame(0, (int) InventoryMovement::where('store_id', $store->id)->where('movement_type', InventoryMovement::MOVEMENT_MANUAL_ADJUSTMENT)->count());
    }

    public function test_manual_variant_adjustment(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->variantProduct($store, $cat);

        $r = InventoryService::adjustStock($p, 3, $store->id, 'uuid-red-s', 'Red‖S', 'added stock', $user->id);
        $this->assertTrue($r['success']);
        $this->assertSame('variant', $r['mode']);

        $p->refresh();
        $this->assertSame('8', $p->variant_combinations[0]['stock']);
        $this->assertSame('10', $p->variant_combinations[1]['stock']);

        $mv = InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->where('movement_type', InventoryMovement::MOVEMENT_MANUAL_ADJUSTMENT)->first();
        $this->assertSame('uuid-red-s', $mv->variant_uuid);
    }

    // ---------------------------------------------------------------------
    // 6. HTTP layer: routes, authorization, store-scoping (IDOR).
    // ---------------------------------------------------------------------

    public function test_pos_and_inventory_routes_require_permission(): void
    {
        $plan = \App\Models\Plan::factory()->create(['name' => 'NO-POS-'.uniqid(), 'price' => 99, 'themes' => ['all'], 'max_products_per_store' => 1000, 'max_stores' => 10]);
        $user = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'onboarded_at' => now(), 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth()]);
        $store = Store::factory()->create(['user_id' => $user->id]);
        $user->current_store = $store->id;
        $user->save();
        // No manage-pos permission granted.

        $this->actingAs($user);
        $this->get(route('pos.index'))->assertForbidden();
        $this->get(route('inventory.index'))->assertForbidden();
        $this->get(route('inventory.movements'))->assertForbidden();
    }

    public function test_http_pos_sale_returns_order_number(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 10, 'sku' => 'HTTP-POS']);

        $res = $this->post(route('pos.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 2]],
            'payment_method' => 'cash',
        ]);
        $res->assertStatus(201);
        $res->assertJson(['success' => true]);
        $orderNumber = $res->json('order_number');
        $this->assertNotEmpty($orderNumber);

        $order = Order::where('store_id', $store->id)->where('order_source', 'pos')->first();
        $this->assertNotNull($order);
        $this->assertSame($orderNumber, $order->order_number);

        $p->refresh();
        $this->assertSame(8, (int) $p->stock);
    }

    public function test_http_pos_insufficient_stock_returns_409(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 1]);

        $res = $this->post(route('pos.sale'), [
            'items' => [['product_id' => $p->id, 'quantity' => 5]],
            'payment_method' => 'cash',
        ]);
        $res->assertStatus(409);
        $p->refresh();
        $this->assertSame(1, (int) $p->stock);
    }

    public function test_http_pos_ignores_cross_store_product(): void
    {
        [$user, $store] = $this->merchantWithStore();
        [, $otherStore] = $this->merchantWithStore();
        $this->actingAs($user);
        $otherCat = $this->category($otherStore);
        $otherProduct = $this->product($otherStore, $otherCat, ['stock' => 5]);

        $res = $this->post(route('pos.sale'), [
            'items' => [['product_id' => $otherProduct->id, 'quantity' => 1]],
            'payment_method' => 'cash',
        ]);
        // Product not in merchant's current store -> rejected.
        $res->assertStatus(409);
        $otherProduct->refresh();
        $this->assertSame(5, (int) $otherProduct->stock, 'cross-store stock must never change');
    }

    public function test_pos_search_is_store_scoped(): void
    {
        [$user, $store] = $this->merchantWithStore();
        [, $otherStore] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $otherCat = $this->category($otherStore);
        $mine = $this->product($store, $cat, ['name' => 'Only Mine Shirt', 'sku' => 'MINE-1', 'stock' => 5]);
        $other = $this->product($otherStore, $otherCat, ['name' => 'Only Mine Shirt', 'sku' => 'Theirs-1', 'stock' => 5]);

        $res = $this->getJson(route('pos.search', ['q' => 'Only Mine Shirt']));
        $res->assertStatus(200);
        $ids = collect($res->json('rows'))->pluck('product_id')->all();
        $this->assertContains($mine->id, $ids);
        $this->assertNotContains($other->id, $ids, 'search must never leak other-store products');
    }

    public function test_receipt_requires_store_ownership(): void
    {
        [$user, $store] = $this->merchantWithStore();
        [, $otherStore] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($otherStore);
        $p = $this->product($otherStore, $cat, ['stock' => 5]);
        $otherOrder = app(PointOfSaleService::class)->createPosSale($otherStore->id, [['product_id' => $p->id, 'quantity' => 1]], 'cash');

        // Merchant A cannot view store B's POS receipt.
        $this->get(route('pos.receipt', $otherOrder->id))->assertNotFound();
    }

    public function test_inventory_movements_page_is_store_scoped(): void
    {
        [$user, $store] = $this->merchantWithStore();
        [, $otherStore] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($otherStore);
        $p = $this->product($otherStore, $cat, ['stock' => 5]);
        app(PointOfSaleService::class)->createPosSale($otherStore->id, [['product_id' => $p->id, 'quantity' => 1]], 'cash');

        $res = $this->get(route('inventory.movements'));
        $res->assertStatus(200);

        $this->assertSame(
            0,
            (int) InventoryMovement::where('store_id', $store->id)->count(),
            'merchant must only ever query their own store ledger'
        );
        $this->assertSame(
            1,
            (int) InventoryMovement::where('store_id', $otherStore->id)->count(),
            'the other store retains its own POS_SALE movement'
        );
    }

    public function test_http_manual_adjustment_write(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 20]);

        $res = $this->post(route('inventory.adjust'), [
            'product_id' => $p->id,
            'direction' => 'decrease',
            'quantity' => 6,
            'reason' => 'damaged unit',
        ]);
        $res->assertRedirect();
        $p->refresh();
        $this->assertSame(14, (int) $p->stock);
        $this->assertSame(1, (int) InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->where('movement_type', InventoryMovement::MOVEMENT_MANUAL_ADJUSTMENT)->count());
    }
}