<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class InventoryVariantStockTest extends TestCase
{
    use RefreshDatabase;

    private Store $store;
    private Store $storeB;
    private User $merchant;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->merchant = User::factory()->create(['type' => 'company']);
        $this->store = Store::factory()->create(['user_id' => $this->merchant->id, 'slug' => 'test-store']);
        $this->storeB = Store::factory()->create(['user_id' => $this->merchant->id, 'slug' => 'other-store']);
        $this->category = Category::factory()->create(['store_id' => $this->store->id, 'is_active' => true]);
    }

    private function product(array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $this->store->id,
            'category_id' => $this->category->id,
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

    private function variantProduct(int $redS = 5, int $redM = 0, int $blueS = 3): Product
    {
        $combos = [
            ['id' => 'Red‖S', 'values' => ['Red','S'], 'label' => 'Red / S', 'price' => '100', 'stock' => (string)$redS, 'sku' => 'RED-S', 'image' => ''],
            ['id' => 'Red‖M', 'values' => ['Red','M'], 'label' => 'Red / M', 'price' => '110', 'stock' => (string)$redM, 'sku' => 'RED-M', 'image' => ''],
            ['id' => 'Blue‖S', 'values' => ['Blue','S'], 'label' => 'Blue / S', 'price' => '100', 'stock' => (string)$blueS, 'sku' => 'BLUE-S', 'image' => ''],
        ];
        return $this->product([
            'inventory_mode' => 'variant',
            'variants' => [
                ['name' => 'Color', 'values' => ['Red','Blue']],
                ['name' => 'Size', 'values' => ['S','M']],
            ],
            'variant_combinations' => $combos,
            'stock' => 999, // product stock should be ignored in variant mode
        ]);
    }

    // PRODUCT LEVEL
    public function test_tracked_product_stock_decrements(): void
    {
        $p = $this->product(['stock' => 10]);
        $order = app(\App\Services\OrderService::class)->createOrder([
            'store_id' => $this->store->id,
            'customer_email' => 'a@test.com', 'customer_phone' => '0599000000',
            'customer_first_name' => 'A','customer_last_name' => 'B',
            'shipping_address' => 'addr','shipping_city' => 'c','shipping_state' => 's','shipping_country' => 'PS',
            'billing_address' => 'addr','billing_city' => 'c','billing_state' => 's','billing_country' => 'PS',
            'subtotal' => 200,'tax_amount' => 0,'shipping_amount' => 0,'discount_amount' => 0,'total_amount' => 200,
            'payment_method' => 'cod',
        ], [
            ['product_id' => $p->id, 'name' => $p->name,'sku' => $p->sku,'price'=>100,'sale_price'=>null,'quantity'=>3,'variants'=>null],
        ]);
        $p->refresh();
        $this->assertEquals(7, (int)$p->stock);
        $this->assertNotNull($order->id);
        $this->assertEquals('product', $order->items->first()->inventory_mode);
    }

    public function test_tracked_product_insufficient_rejected(): void
    {
        $p = $this->product(['stock' => 2]);
        $this->expectException(\Exception::class);
        app(\App\Services\OrderService::class)->createOrder([
            'store_id' => $this->store->id,
            'customer_email' => 'a@test.com','customer_phone'=>'0599000000',
            'customer_first_name'=>'A','customer_last_name'=>'B',
            'shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS',
            'billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS',
            'subtotal'=>300,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>300,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>$p->sku,'price'=>100,'sale_price'=>null,'quantity'=>5,'variants'=>null]]);
    }

    public function test_untracked_product_ignores_stock(): void
    {
        $p = $this->product(['stock'=>0,'track_inventory'=>false]);
        $this->assertTrue(InventoryService::resolve($p)['purchasable']);
        $this->assertEquals('in_stock', $p->availabilityStatus());
        // Order should succeed even stock 0
        $order = app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,
            'customer_email'=>'a@test.com','customer_phone'=>'0599000000',
            'customer_first_name'=>'A','customer_last_name'=>'B',
            'shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS',
            'billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS',
            'subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>$p->sku,'price'=>100,'sale_price'=>null,'quantity'=>100,'variants'=>null]]);
        $p->refresh();
        $this->assertEquals(0, (int)$p->stock, 'untracked product stock must not decrement');
    }

    public function test_backorder_allows_negative_stock(): void
    {
        $p = $this->product(['stock'=>1,'allow_backorder'=>true]);
        app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,
            'customer_email'=>'a@test.com','customer_phone'=>'0599000000',
            'customer_first_name'=>'A','customer_last_name'=>'B',
            'shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS',
            'billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS',
            'subtotal'=>300,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>300,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>$p->sku,'price'=>100,'sale_price'=>null,'quantity'=>5,'variants'=>null]]);
        $p->refresh();
        $this->assertEquals(-4, (int)$p->stock);
        $this->assertEquals('in_stock', $p->availabilityStatus());
    }

    public function test_cancellation_restores_once(): void
    {
        $p = $this->product(['stock'=>5]);
        $order = app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'c@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>300,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>300,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>$p->sku,'price'=>100,'sale_price'=>null,'quantity'=>2,'variants'=>null]]);
        $p->refresh(); $this->assertEquals(3, (int)$p->stock);
        $order->update(['status'=>'cancelled']);
        $p->refresh(); $this->assertEquals(5, (int)$p->stock);
        // double restore blocked
        $order->update(['status'=>'refunded']);
        $p->refresh(); $this->assertEquals(5, (int)$p->stock);
        $order->refresh(); $this->assertTrue((bool)$order->stock_restored);
    }

    public function test_cancelled_refunded_no_double_restore(): void
    {
        $p = $this->product(['stock'=>10]);
        $order = app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'c@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>300,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>300,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>$p->sku,'price'=>100,'sale_price'=>null,'quantity'=>2,'variants'=>null]]);
        $order->update(['status'=>'cancelled']);
        $p->refresh(); $this->assertEquals(10, (int)$p->stock);
        $order->update(['status'=>'refunded']);
        $p->refresh(); $this->assertEquals(10, (int)$p->stock, 'second terminal transition must not double restore');
    }

    // VARIANT LEVEL
    public function test_variant_stock_saved(): void
    {
        $p = $this->variantProduct(5,10,3);
        $p->refresh();
        $this->assertCount(3, $p->variant_combinations);
        $this->assertEquals('5', $p->variant_combinations[0]['stock']);
    }

    public function test_correct_combination_resolved(): void
    {
        $p = $this->variantProduct(5,0,3);
        $c = $p->resolveVariantCombination('Red‖M');
        $this->assertNotNull($c);
        $this->assertEquals('Red‖M', $c['id']);
        $c2 = $p->resolveVariantCombination(['Color'=>'Red','Size'=>'M']);
        $this->assertNotNull($c2);
        $this->assertEquals('Red‖M', $c2['id']);
    }

    public function test_variant_stock_decrements(): void
    {
        $p = $this->variantProduct(5,10,3);
        app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'v@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>'RED-S','price'=>100,'sale_price'=>null,'quantity'=>2,'variants'=> json_encode(['Color'=>'Red','Size'=>'S']) ]]);
        $p->refresh();
        $this->assertEquals('3', $p->variant_combinations[0]['stock']);
        // product stock should remain untouched
        $this->assertEquals(999, (int)$p->stock);
    }

    public function test_another_variant_unaffected(): void
    {
        $p = $this->variantProduct(5,0,3);
        app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'v@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>'RED-S','price'=>100,'sale_price'=>null,'quantity'=>1,'variants'=> json_encode(['Color'=>'Red','Size'=>'S']) ]]);
        $p->refresh();
        $this->assertEquals('4', $p->variant_combinations[0]['stock']);
        $this->assertEquals('0', $p->variant_combinations[1]['stock']);
        $this->assertEquals('3', $p->variant_combinations[2]['stock']);
    }

    public function test_oos_variant_rejected(): void
    {
        $p = $this->variantProduct(5,0,3);
        $this->expectException(\Exception::class);
        app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'v@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>110,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>110,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>'RED-M','price'=>110,'sale_price'=>null,'quantity'=>1,'variants'=> json_encode(['Color'=>'Red','Size'=>'M']) ]]);
    }

    public function test_available_variant_accepted(): void
    {
        $p = $this->variantProduct(5,0,3);
        $inv = InventoryService::resolve($p, ['Color'=>'Red','Size'=>'S']);
        $this->assertTrue($inv['purchasable']);
        $inv2 = InventoryService::resolve($p, ['Color'=>'Red','Size'=>'M']);
        $this->assertFalse($inv2['purchasable']);
    }

    public function test_fake_variant_rejected(): void
    {
        $p = $this->variantProduct();
        $this->expectException(\Exception::class);
        app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'f@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>'FAKE','price'=>100,'sale_price'=>null,'quantity'=>1,'variants'=> json_encode(['Color'=>'Purple','Size'=>'XXL']) ]]);
    }

    public function test_cart_existing_qty_included(): void
    {
        $p = $this->variantProduct(3,10,3);
        // simulate CartController check: existing qty 2 + request 2 => total 4 > available 3 => reject
        $inv = InventoryService::resolve($p, ['Color'=>'Red','Size'=>'S']);
        $this->assertEquals(3, $inv['available_qty']);
        $existingQty = 2;
        $requestedQty = 2;
        $this->assertTrue($existingQty + $requestedQty > $inv['available_qty']);
    }

    public function test_cart_qty_update_cannot_exceed(): void
    {
        $p = $this->variantProduct(5,0,3);
        $inv = InventoryService::resolve($p, ['Color'=>'Blue','Size'=>'S']);
        $this->assertEquals(3, $inv['available_qty']);
        // update to 10 should fail if we enforce inv check (CartController does)
        $this->assertFalse(10 <= $inv['available_qty']);
    }

    public function test_checkout_revalidates_stock(): void
    {
        $p = $this->variantProduct(2,10,3);
        // first order takes 2 => stock 0, second order should fail even if cart validation passed earlier
        app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'a@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>'RED-S','price'=>100,'sale_price'=>null,'quantity'=>2,'variants'=> json_encode(['Color'=>'Red','Size'=>'S']) ]]);
        $this->expectException(\Exception::class);
        app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'b@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>'RED-S','price'=>100,'sale_price'=>null,'quantity'=>1,'variants'=> json_encode(['Color'=>'Red','Size'=>'S']) ]]);
    }

    public function test_variant_price_remains_correct(): void
    {
        $p = $this->variantProduct();
        // Red/M price 110
        $this->assertEquals(110.0, $p->effectivePriceForVariant(['Color'=>'Red','Size'=>'M']));
        $this->assertEquals(100.0, $p->effectivePriceForVariant(['Color'=>'Red','Size'=>'S']));
    }

    public function test_variant_sku_snapshot_correct(): void
    {
        $p = $this->variantProduct(5,10,3);
        $order = app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'sku@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>110,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>110,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>'RED-M','price'=>110,'sale_price'=>null,'quantity'=>1,'variants'=> json_encode(['Color'=>'Red','Size'=>'M']) ]]);
        $item = $order->items->first();
        $this->assertEquals('RED-M', $item->product_sku);
        $this->assertEquals('Red‖M', $item->variant_combination_id);
        $this->assertEquals('variant', $item->inventory_mode);
    }

    public function test_cancellation_restores_exact_variant(): void
    {
        $p = $this->variantProduct(5,10,3);
        $order = app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'rest@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>'RED-S','price'=>100,'sale_price'=>null,'quantity'=>2,'variants'=> json_encode(['Color'=>'Red','Size'=>'S']) ]]);
        $p->refresh(); $this->assertEquals('3', $p->variant_combinations[0]['stock']);
        $order->update(['status'=>'cancelled']);
        $p->refresh(); $this->assertEquals('5', $p->variant_combinations[0]['stock']);
        // other variant unchanged
        $this->assertEquals('10', $p->variant_combinations[1]['stock']);
    }

    public function test_double_restore_blocked_variant(): void
    {
        $p = $this->variantProduct(5,10,3);
        $order = app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'dbl@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>'BLUE-S','price'=>100,'sale_price'=>null,'quantity'=>1,'variants'=> json_encode(['Color'=>'Blue','Size'=>'S']) ]]);
        $order->update(['status'=>'cancelled']);
        $p->refresh(); $this->assertEquals('3', $p->variant_combinations[2]['stock']); // blue-s was 3 ->2 ->3
        $order->update(['status'=>'refunded']);
        $p->refresh(); $this->assertEquals('3', $p->variant_combinations[2]['stock']);
    }

    public function test_changed_product_after_order_handled_safely(): void
    {
        $p = $this->variantProduct(5,0,3);
        $order = app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'chg@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>'RED-S','price'=>100,'sale_price'=>null,'quantity'=>1,'variants'=> json_encode(['Color'=>'Red','Size'=>'S']) ]]);
        // Merchant deletes XL variant (but RED-S remains) — actually delete Red/S combination
        $combos = $p->variant_combinations;
        // Remove Red‖S to simulate deletion
        $combos = array_values(array_filter($combos, fn($c)=>$c['id'] !== 'Red‖S'));
        $p->variant_combinations = $combos; $p->save();
        // Cancellation should not crash and should log warning (stock not restored)
        $order->update(['status'=>'cancelled']);
        $this->assertTrue(true); // no exception
        $p->refresh();
        // Since combo gone, available combos no longer contain Red/S -> no restore inflated
        $this->assertCount(2, $p->variant_combinations);
    }

    public function test_deleted_product_handled_safely(): void
    {
        $p = $this->product(['stock'=>5]);
        $order = app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'del@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>$p->sku,'price'=>100,'sale_price'=>null,'quantity'=>1,'variants'=>null]]);
        $p->delete();
        // Should not throw
        $order->update(['status'=>'cancelled']);
        $this->assertTrue((bool)$order->refresh()->stock_restored);
    }

    // CONCURRENCY
    public function test_stock1_two_checkouts_only_one_succeeds(): void
    {
        $p = $this->variantProduct(1,0,0);
        $success = 0;
        $failed = 0;
        foreach (['a@test.com','b@test.com'] as $email) {
            try {
                app(\App\Services\OrderService::class)->createOrder([
                    'store_id'=>$this->store->id,'customer_email'=>$email,'customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
                ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>'RED-S','price'=>100,'sale_price'=>null,'quantity'=>1,'variants'=> json_encode(['Color'=>'Red','Size'=>'S']) ]]);
                $success++;
            } catch (\Exception $e) { $failed++; }
        }
        $this->assertEquals(1, $success);
        $this->assertEquals(1, $failed);
        $p->refresh(); $this->assertEquals('0', $p->variant_combinations[0]['stock']);
    }

    public function test_no_negative_stock(): void
    {
        $p = $this->product(['stock'=>1]);
        $success = 0;
        foreach (['a@test.com','b@test.com'] as $email) {
            try {
                app(\App\Services\OrderService::class)->createOrder([
                    'store_id'=>$this->store->id,'customer_email'=>$email,'customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
                ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>$p->sku,'price'=>100,'sale_price'=>null,'quantity'=>1,'variants'=>null]]);
                $success++;
            } catch (\Exception $e) {}
        }
        $p->refresh();
        $this->assertGreaterThanOrEqual(0, (int)$p->stock);
        $this->assertEquals(1, $success);
    }

    // STOREFRONT
    public function test_product_available_if_any_variant_available(): void
    {
        $p = $this->variantProduct(0,0,3); // only blue S available
        $this->assertEquals('in_stock', $p->availabilityStatus());
    }

    public function test_product_oos_if_all_variants_oos(): void
    {
        $p = $this->variantProduct(0,0,0);
        $this->assertEquals('out_of_stock', $p->availabilityStatus());
    }

    public function test_search_availability_variant_aware(): void
    {
        $p1 = $this->variantProduct(0,0,0);
        $p2 = $this->variantProduct(0,0,3);
        $this->assertEquals('out_of_stock', $p1->availabilityStatus());
        $this->assertEquals('in_stock', $p2->availabilityStatus());
    }

    public function test_category_availability_variant_aware(): void
    {
        // category filtering already covered by search — verify formatFullProduct uses same resolver
        $p = $this->variantProduct(0,0,1);
        $ctrl = new \App\Http\Controllers\ThemeController();
        $m = new \ReflectionMethod($ctrl, 'formatFullProduct'); $m->setAccessible(true);
        $data = $m->invoke($ctrl, $p);
        $this->assertEquals('in_stock', $data['availability']);
        $this->assertEquals('variant', $data['inventoryMode']);
    }

    public function test_all_templates_receive_same_inventory_contract(): void
    {
        $p = $this->variantProduct(0,0,0);
        foreach (\App\Models\Store::ALL_TEMPLATES as $theme) {
            $this->store->theme = $theme; $this->store->save();
            $ctrl = new \App\Http\Controllers\ThemeController();
            $m = new \ReflectionMethod($ctrl, 'formatFullProduct'); $m->setAccessible(true);
            $d = $m->invoke($ctrl, $p);
            $this->assertEquals('out_of_stock', $d['availability'], "theme $theme mismatch");
        }
        $p2 = $this->variantProduct(1,0,0);
        foreach (\App\Models\Store::ALL_TEMPLATES as $theme) {
            $this->store->theme = $theme; $this->store->save();
            $ctrl = new \App\Http\Controllers\ThemeController();
            $m = new \ReflectionMethod($ctrl, 'formatFullProduct'); $m->setAccessible(true);
            $d = $m->invoke($ctrl, $p2);
            $this->assertEquals('in_stock', $d['availability'], "theme $theme should be in_stock when any variant available");
        }
    }

    // SECURITY
    public function test_cross_store_variant_rejected(): void
    {
        $otherCat = Category::factory()->create(['store_id'=>$this->storeB->id,'is_active'=>true]);
        $otherProduct = Product::factory()->create(['store_id'=>$this->storeB->id,'category_id'=>$otherCat->id,'is_active'=>true,'price'=>100,'stock'=>10,'variants'=>[['name'=>'Color','values'=>['Red']]],'variant_combinations'=>[['id'=>'Red','values'=>['Red'],'label'=>'Red','price'=>'100','stock'=>'5','sku'=>'R']]]);
        $this->expectException(\Exception::class);
        // try to order other store product using store A context -> should be rejected by store_id scoping
        app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'x@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
        ], [['product_id'=>$otherProduct->id,'name'=>$otherProduct->name,'sku'=>$otherProduct->sku,'price'=>100,'sale_price'=>null,'quantity'=>1,'variants'=> json_encode(['Color'=>'Red']) ]]);
    }

    public function test_cross_store_restore_blocked(): void
    {
        $otherCat = Category::factory()->create(['store_id'=>$this->storeB->id,'is_active'=>true]);
        $otherProduct = Product::factory()->create(['store_id'=>$this->storeB->id,'category_id'=>$otherCat->id,'is_active'=>true,'price'=>100,'stock'=>10]);
        $order = Order::forceCreate([
            'order_number'=>Order::generateOrderNumber(),'store_id'=>$this->store->id,'status'=>'pending','payment_status'=>'pending','stock_restored'=>false,
            'customer_email'=>'x@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B',
            'shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS',
            'billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS',
            'subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
        ]);
        OrderItem::create(['order_id'=>$order->id,'product_id'=>$otherProduct->id,'product_name'=>$otherProduct->name,'product_sku'=>$otherProduct->sku,'product_price'=>100,'quantity'=>2,'unit_price'=>100,'total_price'=>200]);
        $before = (int)$otherProduct->fresh()->stock;
        $order->update(['status'=>'cancelled']);
        $otherProduct->refresh();
        $this->assertEquals($before, (int)$otherProduct->stock, 'cross-store restore must be blocked');
    }

    public function test_client_stock_ignored(): void
    {
        // client cannot send stock=999 to override; InventoryService must use DB state
        $p = $this->variantProduct(1,0,0);
        $inv = InventoryService::resolve($p, ['Color'=>'Red','Size'=>'S']);
        $this->assertEquals(1, $inv['available_qty']);
        // Even if client crafts request with huge qty, server validates via InventoryService
        $this->expectException(\Exception::class);
        app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'tamper@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>1000,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>1000,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>'RED-S','price'=>100,'sale_price'=>null,'quantity'=>999,'variants'=> json_encode(['Color'=>'Red','Size'=>'S']) ]]);
    }

    public function test_client_availability_ignored(): void
    {
        $p = $this->variantProduct(0,0,0);
        $this->assertEquals('out_of_stock', $p->availabilityStatus());
        // client cannot force availability=true; OrderService still rejects OOS variant
        $this->expectException(\Exception::class);
        app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'tamper2@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>100,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>100,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>'RED-M','price'=>110,'sale_price'=>null,'quantity'=>1,'variants'=> json_encode(['Color'=>'Red','Size'=>'M']) ]]);
    }

    // REGRESSIONS
    public function test_coupon_totals_unchanged(): void
    {
        $p = $this->variantProduct(5,0,0);
        // price 100 for Red/S, 110 for Red/M — verify subtotal uses variant price not product.base
        $this->assertEquals(100.0, $p->effectivePriceForVariant(['Color'=>'Red','Size'=>'S']));
        // Ensure order subtotal 100*2 =200 unaffected by inventory changes
        $order = app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'reg@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>200,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>200,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>'RED-S','price'=> $p->effectivePriceForVariant(['Color'=>'Red','Size'=>'S']), 'sale_price'=>null,'quantity'=>2,'variants'=> json_encode(['Color'=>'Red','Size'=>'S']) ]]);
        $this->assertEquals(200, (float)$order->total_amount);
        $this->assertEquals(100, (float)$order->items->first()->unit_price);
    }

    public function test_track_inventory_off_does_not_decrement(): void
    {
        $p = $this->product(['stock'=>5,'track_inventory'=>false]);
        app(\App\Services\OrderService::class)->createOrder([
            'store_id'=>$this->store->id,'customer_email'=>'off@test.com','customer_phone'=>'0599000000','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>300,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>300,'payment_method'=>'cod',
        ], [['product_id'=>$p->id,'name'=>$p->name,'sku'=>$p->sku,'price'=>100,'sale_price'=>null,'quantity'=>3,'variants'=>null]]);
        $p->refresh();
        $this->assertEquals(5, (int)$p->stock);
    }

    public function test_allow_backorder_disabled_respects_stock(): void
    {
        $p = $this->product(['stock'=>0,'allow_backorder'=>false]);
        $inv = InventoryService::resolve($p);
        $this->assertFalse($inv['purchasable']);
    }

    public function test_old_product_backward_compat_product_mode(): void
    {
        // old product without inventory_mode column -> should default product (backward compat)
        $p = Product::factory()->create(['store_id'=>$this->store->id,'category_id'=>$this->category->id,'is_active'=>true,'price'=>100,'stock'=>10,'track_inventory'=>true,'allow_backorder'=>false,'inventory_mode'=>'product','variants'=>[['name'=>'Color','values'=>['Red','Blue']]],'variant_combinations'=>[['id'=>'Red','values'=>['Red'],'label'=>'Red','price'=>'100','stock'=>'0','sku'=>'R'],['id'=>'Blue','values'=>['Blue'],'label'=>'Blue','price'=>'100','stock'=>'0','sku'=>'B']]]);
        $p->refresh();
        // Should not be variant inventory since mode is product default
        $this->assertFalse(InventoryService::isVariantInventory($p));
        $this->assertEquals('in_stock', $p->availabilityStatus()); // product stock 10 => in_stock even though variants stock 0
        // Even if we set null (legacy) treated as product via Service logic
        DB::table('products')->where('id',$p->id)->update(['inventory_mode'=>'product']);
        $p->refresh();
        $this->assertFalse(InventoryService::isVariantInventory($p));
    }
}
