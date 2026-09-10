<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Customer;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\User;
use App\Models\Plan;
use App\Services\ManualOrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ManualOrderCreationTest extends TestCase
{
    use RefreshDatabase;

    private function merchantWithStore(): array
    {
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $plan = Plan::factory()->create(['name' => 'Pro-' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $store = Store::factory()->create(['user_id' => $user->id, 'currency' => 'ILS']);
        $user->current_store = $store->id;
        $user->save();

        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label' => 'Company']);
        $perms = \Spatie\Permission\Models\Permission::whereIn('name', ['manage-orders', 'create-orders', 'view-orders', 'edit-orders'])->get();
        if ($perms->count() > 0) {
            $role->syncPermissions($perms);
            $user->assignRole($role);
        } else {
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
        return $this->product($store, $cat, [
            'inventory_mode' => 'variant',
            'variants' => [['name' => 'Color', 'values' => ['Red']], ['name' => 'Size', 'values' => ['S', 'M']]],
            'variant_combinations' => [
                ['id' => 'Red‖S', 'uuid' => 'uuid-red-s', 'values' => ['Red', 'S'], 'label' => 'Red / S', 'price' => '100', 'stock' => '5', 'sku' => 'RED-S', 'image' => ''],
                ['id' => 'Red‖M', 'uuid' => 'uuid-red-m', 'values' => ['Red', 'M'], 'label' => 'Red / M', 'price' => '110', 'stock' => '10', 'sku' => 'RED-M', 'image' => ''],
            ],
            'stock' => 999,
        ]);
    }

    private function customer(Store $store, array $over = []): Customer
    {
        return Customer::create(array_merge([
            'store_id' => $store->id,
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
            'password' => bcrypt('secret'),
            'is_active' => true,
        ], $over));
    }

    private function inertiaVersion(): string
    {
        return (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());
    }

    public function test_manual_order_is_created_with_order_source_manual_and_pending_state(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store), ['price' => 100, 'stock' => 10]);

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 2]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
            'phone' => '0599000000',
        ]);

        $this->assertSame('manual', $order->order_source);
        $this->assertSame('pending', $order->status);
        $this->assertSame('pending', $order->payment_status);
        $this->assertSame('cod', $order->payment_method);
        $this->assertSame(200.0, (float) $order->subtotal);
        $this->assertSame(200.0, (float) $order->total_amount);
        $this->assertSame('maha@example.com', $order->customer_email);
        $this->assertSame(1, OrderItem::where('order_id', $order->id)->count());
        $this->assertSame(200.0, (float) OrderItem::firstWhere('order_id', $order->id)->total_price);
    }

    public function test_manual_order_ignores_forged_prices_and_totals(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store), ['price' => 100, 'stock' => 10]);

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 2, 'price' => 0.01]],
            'payment_method' => 'bank',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
            'subtotal' => 0.01,
            'tax_amount' => 999,
            'shipping_amount' => 999,
            'total_amount' => 0.01,
        ]);

        $this->assertSame(200.0, (float) $order->subtotal, 'forged subtotal must be ignored');
        $this->assertSame(200.0, (float) $order->total_amount, 'forged total must be ignored');
        $this->assertSame(100.0, (float) OrderItem::firstWhere('order_id', $order->id)->product_price, 'forged unit price must be ignored');
        $this->assertSame(0.0, (float) $order->shipping_amount);
    }

    public function test_manual_order_with_variant_uses_effective_variant_price_and_decrements_variant_stock(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->variantProduct($store, $this->category($store));

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'variant_id' => 'Red‖M', 'quantity' => 2]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
        ]);

        $item = OrderItem::firstWhere('order_id', $order->id);
        $this->assertSame(110.0, (float) $item->product_price, 'variant price must win');
        $this->assertSame(220.0, (float) $order->subtotal);
        $combos = $p->fresh()->variant_combinations;
        $this->assertSame('8', collect($combos)->firstWhere('id', 'Red‖M')['stock'], 'variant stock must decrement');
        $this->assertSame(InventoryMovement::MOVEMENT_ONLINE_SALE, InventoryMovement::where('reference_id', $order->id)->value('movement_type'));
    }

    public function test_manual_order_requires_variant_selection_for_variant_products(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->variantProduct($store, $this->category($store));

        $this->expectException(\Exception::class);
        app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 1], ['product_id' => $p->id, 'variant_id' => 'Red‖S', 'quantity' => 1]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
        ]);
    }

    public function test_manual_order_rejects_out_of_stock_tracked_product(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store), ['stock' => 1]);

        $this->expectException(\Exception::class);
        app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 2]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
        ]);
    }

    public function test_manual_order_rejects_online_gateway_payment_method(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store));

        $this->expectException(\Exception::class);
        app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'stripe',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
        ]);
    }

    public function test_manual_order_links_store_scoped_customer_and_rejects_foreign_customer(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store));
        $cust = $this->customer($store);

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cod',
            'customer_id' => $cust->id,
        ]);
        $this->assertSame($cust->id, $order->customer_id);

        $foreignStore = Store::factory()->create();
        $foreignCustomer = Customer::create(['store_id' => $foreignStore->id, 'first_name' => 'X', 'last_name' => 'Y', 'email' => 'x@y.com', 'password' => bcrypt('p'), 'is_active' => true]);
        try {
            app(ManualOrderService::class)->createManualOrder($store->id, [
                'items' => [['product_id' => $p->id, 'quantity' => 1]],
                'payment_method' => 'cod',
                'customer_id' => $foreignCustomer->id,
            ]);
            $this->fail('foreign customer must be rejected');
        } catch (\Exception $e) {
            $this->assertStringContainsString('العميل', $e->getMessage());
        }
    }

    public function test_manual_order_computes_exclusive_tax_and_shipping_from_canonical_data(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $tax = \App\Models\Tax::create(['store_id' => $store->id, 'name' => 'VAT', 'rate' => 10, 'type' => 'percentage', 'is_active' => true]);
        $p = $this->product($store, $cat, ['price' => 100, 'is_tax_included' => false, 'tax_id' => $tax->id]);
        $ship = Shipping::create(['store_id' => $store->id, 'name' => 'Flat', 'type' => 'fixed', 'cost' => 15, 'handling_fee' => 5, 'is_active' => true]);

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 2]],
            'payment_method' => 'bank',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
            'shipping_method_id' => $ship->id,
            'shipping_address' => 'Ramallah 1',
            'shipping_city' => 'Ramallah',
        ]);

        $this->assertSame(200.0, (float) $order->subtotal);
        $this->assertSame(20.0, (float) $order->tax_amount);
        $this->assertSame(20.0, (float) $order->shipping_amount, 'cost + handling_fee = 15 + 5');
        $this->assertSame(240.0, (float) $order->total_amount);
    }

    public function test_manual_order_keeps_bank_payment_pending_for_authoritative_confirmation(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store));

        $order = app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'bank',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
        ]);

        $this->assertSame('pending', $order->payment_status);
        $this->assertNull($order->paid_at);
    }

    public function test_manual_order_requires_valid_payment_method(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store));

        $this->expectException(\Exception::class);
        app(ManualOrderService::class)->createManualOrder($store->id, [
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => '',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha@example.com',
        ]);
    }

    public function test_merchant_can_create_manual_order_via_http_and_is_redirected_to_show(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store), ['stock' => 10]);

        $response = $this->post(route('orders.store'), [
            'idempotency_key' => 'manual-key-1',
            'items' => [['product_id' => $p->id, 'quantity' => 2]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha2@example.com',
            'phone' => '0599000000',
            'shipping_address' => 'Ramallah 1',
            'shipping_city' => 'Ramallah',
        ]);

        $order = Order::firstWhere('store_id', $store->id);
        $this->assertNotNull($order);
        $this->assertSame('manual', $order->order_source);
        $this->assertSame('pending', $order->status);
        $response->assertRedirect(route('orders.show', $order->id));
    }

    public function test_duplicate_idempotency_key_returns_the_same_order_without_duplicate(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store));

        $payload = [
            'idempotency_key' => 'manual-key-same',
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha3@example.com',
        ];
        $first = $this->post(route('orders.store'), $payload);
        $order = Order::firstWhere('store_id', $store->id);
        $this->assertNotNull($order);
        $first->assertRedirect(route('orders.show', $order->id));

        $second = $this->post(route('orders.store'), $payload);
        $second->assertRedirect(route('orders.show', $order->id));
        $this->assertSame(1, Order::where('store_id', $store->id)->count(), 'no duplicate order');
    }

    public function test_cross_store_product_is_rejected_and_no_order_created(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $otherUser = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'onboarded_at' => now()]);
        $otherStore = Store::factory()->create(['user_id' => $otherUser->id]);
        $otherProduct = $this->product($otherStore, $this->category($otherStore));
        $this->actingAs($user);

        $response = $this->from(route('orders.index'))->post(route('orders.store'), [
            'idempotency_key' => 'manual-key-xstore',
            'items' => [['product_id' => $otherProduct->id, 'quantity' => 1]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha4@example.com',
        ]);

        $response->assertSessionHasErrors('general');
        $this->assertSame(0, Order::where('store_id', $store->id)->count());
    }

    public function test_guest_without_create_orders_permission_is_forbidden(): void
    {
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $plan = Plan::factory()->create(['name' => 'Pro-' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $store = Store::factory()->create(['user_id' => $user->id, 'currency' => 'ILS']);
        $user->current_store = $store->id;
        $user->save();
        $this->actingAs($user);

        $this->post(route('orders.store'), [
            'items' => [],
            'payment_method' => 'cod',
        ])->assertStatus(403);
    }

    public function test_online_gateway_payment_method_is_rejected_by_validation(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store));

        $this->from(route('orders.create'))->post(route('orders.store'), [
            'idempotency_key' => 'manual-key-stripe',
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'stripe',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha5@example.com',
        ])->assertSessionHasErrors('payment_method');

        $this->assertSame(0, Order::where('store_id', $store->id)->count());
    }

    public function test_manual_cod_order_can_be_collected_via_canonical_lifecycle_and_show_invoice(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store), ['stock' => 10]);

        $this->post(route('orders.store'), [
            'idempotency_key' => 'manual-key-cod',
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha6@example.com',
        ]);
        $order = Order::firstWhere('store_id', $store->id);

        $this->assertSame('pending', $order->payment_status);
        $this->post(route('orders.collect-cod', $order->id))->assertRedirect();
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->get(route('orders.invoice', $order->id))->assertOk();
    }

    public function test_manual_order_starts_in_the_new_grouped_tab(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->product($store, $this->category($store));

        $this->post(route('orders.store'), [
            'idempotency_key' => 'manual-key-newtab',
            'items' => [['product_id' => $p->id, 'quantity' => 1]],
            'payment_method' => 'cod',
            'first_name' => 'Maha',
            'last_name' => 'Owner',
            'email' => 'maha7@example.com',
        ]);
        $order = Order::firstWhere('store_id', $store->id);

        $this->assertSame('pending', $order->status, 'manual orders start pending');
        $this->assertContains(
            $order->status,
            \App\Http\Controllers\OrderController::ORDER_GROUPS['new'],
            'pending must live in the merchant new tab'
        );
    }

    public function test_create_page_provides_form_data_for_the_manual_form(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = $this->variantProduct($store, $this->category($store));
        $this->customer($store);
        Shipping::create(['store_id' => $store->id, 'name' => 'Flat', 'type' => 'fixed', 'cost' => 15, 'is_active' => true]);

        $response = $this->actingAs($user)->get(route('orders.create'));

        $response->assertStatus(200);
        $props = $response->inertiaPage()['props'];
        $this->assertNotEmpty($props['customers']);
        $this->assertNotEmpty($props['products']);
        $this->assertNotEmpty($props['shippingMethods']);
        $this->assertNotEmpty($props['paymentMethods']);
        $this->assertSame('ILS', $props['currency']);
        $line = collect($props['products'])->firstWhere('id', $p->id);
        $this->assertTrue($line['has_variants']);
        $this->assertNotEmpty($line['variant_combinations']);
    }
}