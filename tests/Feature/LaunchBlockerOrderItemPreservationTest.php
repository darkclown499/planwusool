<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Launch blocker P1-4: deleting a product must NOT cascade-destroy its
 * historical order items. Sales history and analytics depend on
 * order_items surviving product deletion (product_id severed to null).
 */
class LaunchBlockerOrderItemPreservationTest extends TestCase
{
    use RefreshDatabase;

    private function makePlan(): Plan
    {
        return Plan::factory()->create([
            'name' => 'Block-'.uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_stores' => 10,
            'max_products_per_store' => 100,
            'max_users_per_store' => 20,
        ]);
    }

    private function company(): User
    {
        $plan = $this->makePlan();
        return User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addYear(),
            'plan_is_active' => 1,
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
    }

    private function makeStore(User $owner): Store
    {
        $store = Store::factory()->create(['user_id' => $owner->id]);
        return $store->fresh();
    }

    private function makeOrder(Store $store): Order
    {
        $order = new Order([
            'customer_email' => 'buyer@example.com',
            'customer_first_name' => 'Sara',
            'customer_last_name' => 'Ali',
            'shipping_address' => 'Main St 1',
            'shipping_city' => 'Amman',
            'shipping_state' => 'Amman',
            'shipping_country' => 'JO',
            'billing_address' => 'Main St 1',
            'billing_city' => 'Amman',
            'billing_state' => 'Amman',
            'billing_country' => 'JO',
            'subtotal' => 100.00,
            'total_amount' => 100.00,
            'payment_method' => 'cod',
            'status' => 'delivered',
            'payment_status' => 'paid',
        ]);
        $order->store_id = $store->id;
        $order->order_number = 'ORD-'.Str::uuid();
        $order->save();

        return $order;
    }

    public function test_product_deletion_preserves_order_items_and_severs_product_link(): void
    {
        $owner = $this->company();
        $store = $this->makeStore($owner);
        $product = Product::factory()->create([
            'store_id' => $store->id,
            'name' => 'Historic Widget',
            'price' => 100.00,
            'stock' => 10,
        ]);
        $order = $this->makeOrder($store);

        $item = OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => 'Historic Widget',
            'product_sku' => 'WGT-1',
            'product_price' => 100.00,
            'quantity' => 1,
            'unit_price' => 100.00,
            'total_price' => 100.00,
        ]);

        $product->delete();

        $this->assertDatabaseHas('order_items', ['id' => $item->id]);
        $this->assertSame($item->id, DB::table('order_items')->where('id', $item->id)->value('id'));
        $this->assertNull(DB::table('order_items')->where('id', $item->id)->value('product_id'));
        $this->assertSame('Historic Widget', DB::table('order_items')->where('id', $item->id)->value('product_name'));

        $fresh = OrderItem::find($item->id);
        $this->assertNotNull($fresh);
        $this->assertNull($fresh->product);
    }

    public function test_active_product_deletion_does_not_affect_other_stores_items(): void
    {
        $ownerA = $this->company();
        $ownerB = $this->company();
        $storeA = $this->makeStore($ownerA);
        $storeB = $this->makeStore($ownerB);

        $productA = Product::factory()->create(['store_id' => $storeA->id, 'price' => 10, 'stock' => 5]);
        $productA = Product::where('id', $productA->id)->first();

        $itemA = $this->makeItem($storeA, $productA, 'A');
        $productB = Product::factory()->create(['store_id' => $storeB->id, 'price' => 20, 'stock' => 5]);
        $itemB = $this->makeItem($storeB, $productB, 'B');

        $productA->delete();

        $this->assertDatabaseHas('order_items', ['id' => $itemA->id]);
        $this->assertNull(DB::table('order_items')->where('id', $itemA->id)->value('product_id'));
        $this->assertDatabaseHas('order_items', ['id' => $itemB->id]);
        $this->assertSame($productB->id, DB::table('order_items')->where('id', $itemB->id)->value('product_id'));
    }

    private function makeItem(Store $store, Product $product, string $suffix): OrderItem
    {
        $order = $this->makeOrder($store);
        return OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => 'Product '.$suffix,
            'product_sku' => 'SKU-'.$suffix,
            'product_price' => $product->price,
            'quantity' => 1,
            'unit_price' => $product->price,
            'total_price' => $product->price,
        ]);
    }
}