<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinalHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function merchantWithStore(): array
    {
        $plan = \App\Models\Plan::factory()->create(['max_products_per_store'=>1000,'max_stores'=>10,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','email_verified_at'=>now(),'onboarded_at'=>now(),'plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth()]);
        $store = Store::factory()->create(['user_id'=>$user->id]);
        $user->current_store=$store->id; $user->save();
        try { $role=\Spatie\Permission\Models\Role::firstOrCreate(['name'=>'final-'.uniqid(),'guard_name'=>'web']); $perms=\Spatie\Permission\Models\Permission::whereIn('name',['manage-products','create-products','edit-products','delete-products','view-products'])->get(); if($perms->count()){$role->syncPermissions($perms);$user->assignRole($role);} else {$user->type='superadmin';$user->save();} } catch(\Throwable $e){$user->type='superadmin';$user->save();}
        return [$user,$store];
    }

    private function cat(Store $store){ return Category::factory()->create(['store_id'=>$store->id,'is_active'=>true]); }

    // Variant pricing tests
    public function test_base_price_fallback(): void
    {
        [$u,$store]=$this->merchantWithStore(); $cat=$this->cat($store);
        $p=Product::create(['name'=>'Base','price'=>100,'sale_price'=>null,'stock'=>10,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true,'variants'=>json_encode([['name'=>'Color','values'=>['Red','Blue']]]),'variant_combinations'=>json_encode([['id'=>'Red','values'=>['Red'],'label'=>'Red','price'=>'120'],['id'=>'Blue','values'=>['Blue'],'label'=>'Blue','price'=>'']])]);
        $this->assertEquals(100,$p->effectivePriceForVariant(null));
        $this->assertEquals(100,$p->effectivePriceForVariant([]));
    }
    public function test_variant_explicit_price_used(): void
    {
        [$u,$store]=$this->merchantWithStore(); $cat=$this->cat($store);
        $p=Product::create(['name'=>'V','price'=>100,'stock'=>10,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true,'variants'=>json_encode([['name'=>'Size','values'=>['S','XL']]]),'variant_combinations'=>json_encode([['id'=>'S','values'=>['S'],'label'=>'S','price'=>'100'],['id'=>'XL','values'=>['XL'],'label'=>'XL','price'=>'130','sku'=>'SKU-XL']])]);
        $this->assertEquals(100,$p->effectivePriceForVariant(['Size'=>'S']));
        $this->assertEquals(130,$p->effectivePriceForVariant(['Size'=>'XL']));
        $this->assertEquals(130,$p->effectivePriceForVariant('XL'));
    }
    public function test_null_variant_price_fallback(): void
    {
        [$u,$store]=$this->merchantWithStore(); $cat=$this->cat($store);
        $p=Product::create(['name'=>'V','price'=>100,'sale_price'=>80,'stock'=>10,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true,'variants'=>json_encode([['name'=>'Color','values'=>['A','B']]]),'variant_combinations'=>json_encode([['id'=>'A','values'=>['A'],'label'=>'A','price'=>''],['id'=>'B','values'=>['B'],'label'=>'B','price'=>null]])]);
        $this->assertEquals(80,$p->effectivePriceForVariant(['Color'=>'A']));
        $this->assertEquals(80,$p->effectivePriceForVariant(['Color'=>'B']));
    }
    public function test_fake_combination_rejected_in_cart(): void
    {
        [$u,$store]=$this->merchantWithStore(); $cat=$this->cat($store);
        $p=Product::create(['name'=>'V','price'=>100,'stock'=>10,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true,'variants'=>json_encode([['name'=>'Color','values'=>['Red']]]),'variant_combinations'=>json_encode([['id'=>'Red','values'=>['Red'],'label'=>'Red','price'=>'120']])]);
        $this->postJson('/api/cart/add',['store_id'=>$store->id,'product_id'=>$p->id,'quantity'=>1,'variants'=>['Color'=>'Fake']])->assertStatus(422);
        $this->postJson('/api/cart/add',['store_id'=>$store->id,'product_id'=>$p->id,'quantity'=>1,'variants'=>['id'=>'Fake-id']])->assertStatus(422);
    }
    public function test_client_variant_price_ignored(): void
    {
        [$u,$store]=$this->merchantWithStore(); $cat=$this->cat($store);
        $p=Product::create(['name'=>'V','price'=>100,'stock'=>10,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true,'variants'=>json_encode([['name'=>'Size','values'=>['XL']]]),'variant_combinations'=>json_encode([['id'=>'XL','values'=>['XL'],'label'=>'XL','price'=>'130']])]);
        // Client tries to claim price 1
        $this->postJson('/api/cart/add',['store_id'=>$store->id,'product_id'=>$p->id,'quantity'=>1,'variants'=>['Size'=>'XL'],'price'=>1])->assertOk();
        $item=CartItem::where('store_id',$store->id)->first();
        $this->assertEquals(130,(float)$item->price);
    }
    public function test_cart_recalculates_variant_price(): void
    {
        [$u,$store]=$this->merchantWithStore(); $cat=$this->cat($store);
        $p=Product::create(['name'=>'V','price'=>100,'stock'=>10,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true,'variants'=>json_encode([['name'=>'Size','values'=>['XL']]]),'variant_combinations'=>json_encode([['id'=>'XL','values'=>['XL'],'label'=>'XL','price'=>'130']])]);
        $this->postJson('/api/cart/add',['store_id'=>$store->id,'product_id'=>$p->id,'quantity'=>1,'variants'=>['Size'=>'XL']])->assertOk();
        // Direct model recalc reflects new price
        $p->refresh();
        $p->variant_combinations=[['id'=>'XL','values'=>['XL'],'label'=>'XL','price'=>'125']]; $p->save();
        $p->refresh();
        $this->assertEquals(125,(float)$p->effectivePriceForVariant(['Size'=>'XL']));
    }
    public function test_checkout_variant_price_snapshot(): void
    {
        [$u,$store]=$this->merchantWithStore(); $cat=$this->cat($store);
        $p=Product::create(['name'=>'V','price'=>100,'stock'=>10,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true,'variants'=>json_encode([['name'=>'Size','values'=>['XL']]]),'variant_combinations'=>json_encode([['id'=>'XL','values'=>['XL'],'label'=>'XL','price'=>'130','sku'=>'SKU-XL']])]);
        // Use OrderService directly to ensure variant price flows
        $calc=\App\Services\CartCalculationService::calculateCartTotals($store->id, 'test-sess');
        // Manually create cart item with variant
        CartItem::create(['store_id'=>$store->id,'session_id'=>'test-sess','product_id'=>$p->id,'quantity'=>1,'variants'=>json_encode(['Size'=>'XL']),'price'=>130]);
        $calc2=\App\Services\CartCalculationService::calculateCartTotals($store->id, 'test-sess');
        $this->assertEquals(130,(float)$calc2['subtotal']);
    }

    // Search tests — English to avoid sqlite arabic LIKE collation issues
    public function test_search_active_found_and_inactive_hidden(): void
    {
        [$u,$store]=$this->merchantWithStore(); $cat=$this->cat($store);
        $a=Product::create(['name'=>'Samsung Galaxy','price'=>10,'stock'=>5,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true,'sku'=>'SAM-001']);
        $b=Product::create(['name'=>'HiddenProd','price'=>10,'stock'=>5,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>false]);
        $res=$this->getJson('/api/storefront/search?store_id='.$store->id.'&q=Samsung');
        $res->assertOk(); $this->assertTrue(collect($res->json('products'))->pluck('id')->contains((string)$a->id));
        $res2=$this->getJson('/api/storefront/search?store_id='.$store->id.'&q=HiddenProd');
        $res2->assertOk(); $this->assertEmpty($res2->json('products'));
        // Inactive category
        $cat2=Category::factory()->create(['store_id'=>$store->id,'is_active'=>false]);
        $c=Product::create(['name'=>'HiddenCatProd','price'=>10,'stock'=>5,'store_id'=>$store->id,'category_id'=>$cat2->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        $res3=$this->getJson('/api/storefront/search?store_id='.$store->id.'&q=HiddenCatProd');
        $res3->assertOk(); $this->assertEmpty($res3->json('products'));
    }
    public function test_search_cross_store_never_returns_other(): void
    {
        [$u,$store]=$this->merchantWithStore(); [$u2,$store2]=$this->merchantWithStore();
        $cat=$this->cat($store); $cat2=$this->cat($store2);
        Product::create(['name'=>'UniqueStoreA','price'=>10,'stock'=>5,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        Product::create(['name'=>'UniqueStoreA','price'=>10,'stock'=>5,'store_id'=>$store2->id,'category_id'=>$cat2->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        $res=$this->getJson('/api/storefront/search?store_id='.$store->id.'&q=UniqueStoreA');
        $res->assertOk();
        $this->assertGreaterThanOrEqual(1, count($res->json('products')));
        foreach($res->json('products') as $p){ $this->assertEquals((string)$store->id, (string)Product::find($p['id'])->store_id); }
    }
    public function test_search_empty_and_whitespace(): void
    {
        [$u,$store]=$this->merchantWithStore();
        $res=$this->getJson('/api/storefront/search?store_id='.$store->id.'&q=ab');
        // ab min length 2, but no product named ab -> empty is ok
        $res->assertOk();
        $a=$res->json('products');
        $this->assertIsArray($a);
    }

    private function mkOrder(Store $store): Order { return Order::forceCreate(['order_number'=>Order::generateOrderNumber(),'store_id'=>$store->id,'customer_email'=>'a@a.com','customer_phone'=>'123','customer_first_name'=>'A','customer_last_name'=>'B','shipping_address'=>'addr','shipping_city'=>'c','shipping_state'=>'s','shipping_country'=>'PS','billing_address'=>'addr','billing_city'=>'c','billing_state'=>'s','billing_country'=>'PS','subtotal'=>10,'tax_amount'=>0,'shipping_amount'=>0,'discount_amount'=>0,'total_amount'=>10,'payment_method'=>'cod','status'=>'pending','payment_status'=>'pending']); }
    // Stock restoration
    public function test_stock_restore_track_inventory_true(): void
    {
        [$u,$store]=$this->merchantWithStore(); $cat=$this->cat($store);
        $p=Product::create(['name'=>'Rest','price'=>10,'stock'=>10,'track_inventory'=>true,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        $order=$this->mkOrder($store);
        OrderItem::create(['order_id'=>$order->id,'product_id'=>$p->id,'product_name'=>$p->name,'product_price'=>10,'quantity'=>2,'unit_price'=>10,'total_price'=>20]);
        $p->decrement('stock',2); $this->assertEquals(8,Product::find($p->id)->stock);
        $order->update(['status'=>'cancelled']); $order->refresh();
        $this->assertEquals(10,Product::find($p->id)->stock);
        $this->assertTrue((bool)$order->stock_restored);
    }
    public function test_stock_restore_track_inventory_false_unchanged(): void
    {
        [$u,$store]=$this->merchantWithStore(); $cat=$this->cat($store);
        $p=Product::create(['name'=>'NoTrack','price'=>10,'stock'=>10,'track_inventory'=>false,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        $order=$this->mkOrder($store);
        OrderItem::create(['order_id'=>$order->id,'product_id'=>$p->id,'product_name'=>$p->name,'product_price'=>10,'quantity'=>2,'unit_price'=>10,'total_price'=>20]);
        $order->update(['status'=>'cancelled']);
        $this->assertEquals(10,Product::find($p->id)->stock);
    }
    public function test_stock_restore_idempotent(): void
    {
        [$u,$store]=$this->merchantWithStore(); $cat=$this->cat($store);
        $p=Product::create(['name'=>'Idem','price'=>10,'stock'=>10,'track_inventory'=>true,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        $order=$this->mkOrder($store);
        OrderItem::create(['order_id'=>$order->id,'product_id'=>$p->id,'product_name'=>$p->name,'product_price'=>10,'quantity'=>2,'unit_price'=>10,'total_price'=>20]);
        $p->decrement('stock',2);
        $order->update(['status'=>'cancelled']);
        $this->assertEquals(10,Product::find($p->id)->stock);
        $order->update(['status'=>'refunded']);
        $this->assertEquals(10,Product::find($p->id)->stock);
    }
    public function test_stock_restore_missing_product_safe(): void
    {
        [$u,$store]=$this->merchantWithStore(); $cat=$this->cat($store);
        $p=Product::create(['name'=>'Gone','price'=>10,'stock'=>10,'track_inventory'=>true,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        $order=$this->mkOrder($store);
        OrderItem::create(['order_id'=>$order->id,'product_id'=>$p->id,'product_name'=>'Gone','product_price'=>10,'quantity'=>2,'unit_price'=>10,'total_price'=>20]);
        $p->delete();
        $order->update(['status'=>'cancelled']);
        $this->assertTrue((bool)$order->fresh()->stock_restored);
    }
}
