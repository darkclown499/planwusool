<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryHierarchyBestsellerTest extends TestCase
{
    use RefreshDatabase;

    private function merchantWithStore(array $storeAttrs = []): array
    {
        $plan = \App\Models\Plan::factory()->create([
            'name' => 'Hierarchy-'.uniqid(),
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
        $store = Store::factory()->create(array_merge(['user_id' => $user->id], $storeAttrs));
        $user->current_store = $store->id; $user->save();
        try {
            $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'hier-test-'.uniqid(), 'guard_name' => 'web']);
            $perms = \Spatie\Permission\Models\Permission::whereIn('name', ['manage-categories','create-categories','edit-categories','delete-categories','view-categories'])->get();
            if ($perms->count() > 0) { $role->syncPermissions($perms); $user->assignRole($role); } else { $user->type='superadmin'; $user->save(); }
        } catch (\Throwable $e) { $user->type='superadmin'; $user->save(); }
        return [$user, $store];
    }

    private function makeProduct(Store $store, Category $cat, string $name, int $price = 100): Product
    {
        return Product::create([
            'name' => $name, 'price' => $price, 'stock' => 50, 'store_id' => $store->id,
            'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true,
        ]);
    }

    private function makePaidOrder(Store $store, Product $product, int $quantity, array $orderOverrides = []): Order
    {
        $order = new Order(array_merge([
            'customer_email' => 'c@example.com','customer_first_name'=>'F','customer_last_name'=>'L',
            'shipping_address'=>'addr','shipping_city'=>'city','shipping_state'=>'state','shipping_country'=>'PS',
            'billing_address'=>'addr','billing_city'=>'city','billing_state'=>'state','billing_country'=>'PS',
            'subtotal'=> $product->price * $quantity, 'total_amount'=> $product->price * $quantity,
            'payment_method'=>'cod','payment_status'=>'paid','status'=>'pending',
        ], $orderOverrides));
        $order->store_id = $store->id; $order->order_number='ORD-'.strtoupper(uniqid()); $order->save();
        OrderItem::create([
            'order_id'=>$order->id,'product_id'=>$product->id,'product_name'=>$product->name,'product_price'=>$product->price,
            'quantity'=>$quantity,'unit_price'=>$product->price,'total_price'=>$product->price*$quantity,
        ]);
        return $order;
    }

    public function test_existing_categories_remain_valid_as_roots(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $cat = Category::factory()->create(['store_id'=>$store->id,'parent_id'=>null,'is_active'=>true]);
        $this->assertNull($cat->parent_id);
        $this->assertTrue($cat->isRoot());
        $this->assertFalse($cat->isSubcategory());
    }

    public function test_create_main_category(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $res = $this->post(route('categories.store'), ['name'=>'رجالي','is_active'=>true]);
        $res->assertRedirect(route('categories.index'));
        $this->assertDatabaseHas('categories',['store_id'=>$store->id,'name'=>'رجالي','parent_id'=>null]);
    }

    public function test_create_subcategory(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $parent = Category::factory()->create(['store_id'=>$store->id,'parent_id'=>null]);
        $this->actingAs($user);
        $res = $this->post(route('categories.store'), ['name'=>'بلايز','parent_id'=>$parent->id]);
        $res->assertRedirect(route('categories.index'));
        $this->assertDatabaseHas('categories',['store_id'=>$store->id,'name'=>'بلايز','parent_id'=>$parent->id]);
    }

    public function test_cross_store_parent_rejected_bestseller_scope(): void
    {
        [$user,$store]=$this->merchantWithStore();
        [, $otherStore]= $this->merchantWithStore();
        $otherCat = Category::factory()->create(['store_id'=>$otherStore->id,'parent_id'=>null]);
        $this->actingAs($user);
        $res=$this->post(route('categories.store'),['name'=>'hack','parent_id'=>$otherCat->id]);
        $res->assertSessionHasErrors('parent_id');
    }

    public function test_invalid_parent_and_depth_limit(): void
    {
        [$user,$store]=$this->merchantWithStore();
        $a=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>null]);
        $b=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>$a->id]);
        $this->actingAs($user);
        // Non-existent id
        $this->post(route('categories.store'),['name'=>'bad','parent_id'=>999999])->assertSessionHasErrors('parent_id');
        // Depth 2 should be rejected (parent is subcategory)
        $this->post(route('categories.store'),['name'=>'too deep','parent_id'=>$b->id])->assertSessionHasErrors('parent_id');
        // Self parent
        $this->put(route('categories.update',$a->id),['name'=>$a->name,'parent_id'=>$a->id])->assertSessionHasErrors('parent_id');
    }

    public function test_product_assigned_to_subcategory(): void
    {
        [$user,$store]=$this->merchantWithStore();
        $parent=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>null]);
        $sub=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>$parent->id]);
        $this->actingAs($user);
        // Create product assigned to subcategory directly via ProductController path (category_id = sub)
        $res=$this->post(route('products.store'),[
            'name'=>'Shirt','price'=>50,'stock'=>10,'images'=>'/storage/a.jpg','category_id'=>$sub->id,
        ]);
        $res->assertRedirect(route('products.index'));
        $this->assertDatabaseHas('products',['store_id'=>$store->id,'category_id'=>$sub->id]);
        // Product remains visible under parent's hierarchical listing (descendant ids)
        $ids = $parent->fresh()->descendantCategoryIdsForProducts();
        $this->assertContains($sub->id, $ids);
        $this->assertContains($parent->id, $ids);
        $found = Product::where('store_id',$store->id)->whereIn('category_id',$ids)->get();
        $this->assertCount(1,$found);
    }

    public function test_storefront_hierarchy_payload(): void
    {
        [$user,$store]=$this->merchantWithStore();
        $root=Category::factory()->create(['store_id'=>$store->id,'name'=>'رجالي','parent_id'=>null,'is_active'=>true,'sort_order'=>1]);
        $sub1=Category::factory()->create(['store_id'=>$store->id,'name'=>'بلايز','parent_id'=>$root->id,'is_active'=>true,'sort_order'=>1]);
        $sub2=Category::factory()->create(['store_id'=>$store->id,'name'=>'بناطيل','parent_id'=>$root->id,'is_active'=>true,'sort_order'=>2]);
        $otherRoot=Category::factory()->create(['store_id'=>$store->id,'name'=>'نسائي','parent_id'=>null,'is_active'=>true,'sort_order'=>2]);

        $hier = Category::hierarchicalForStorefront($store->id);
        $this->assertCount(2,$hier);
        $this->assertSame('رجالي',$hier[0]['name']);
        $this->assertCount(2,$hier[0]['subcategories']);
        $this->assertSame('بلايز',$hier[0]['subcategories'][0]['name']);
        $this->assertSame('نسائي',$hier[1]['name']);
        $this->assertCount(0,$hier[1]['subcategories']);
        // Inactive child excluded
        $sub1->update(['is_active'=>false]);
        $hier2 = Category::hierarchicalForStorefront($store->id);
        $this->assertCount(1,$hier2[0]['subcategories']);
    }

    public function test_bestseller_uses_real_sales_and_includes_subcategories_for_main(): void
    {
        [$user,$store]=$this->merchantWithStore();
        $root=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>null,'is_active'=>true]);
        $sub=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>$root->id,'is_active'=>true]);
        $otherSub=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>$root->id,'is_active'=>true]);
        $unrelated=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>null,'is_active'=>true]);

        $pRoot = $this->makeProduct($store,$root,'RootProduct',100);
        $pSub = $this->makeProduct($store,$sub,'SubProduct',150);
        $pOtherSub = $this->makeProduct($store,$otherSub,'OtherSubProduct',200);
        $pUnrelated = $this->makeProduct($store,$unrelated,'Unrelated',300);

        // Paid orders: pSub highest quantity (most sold)
        $this->makePaidOrder($store,$pRoot,2);
        $this->makePaidOrder($store,$pRoot,1); // total 3 for pRoot
        $this->makePaidOrder($store,$pSub,10); // 10 for pSub -> top
        $this->makePaidOrder($store,$pOtherSub,1);
        $this->makePaidOrder($store,$pUnrelated,100); // should not appear in root bestsellers
        // Pending / cancelled orders must be ignored
        $this->makePaidOrder($store,$pRoot,999,['payment_status'=>'pending','status'=>'pending']);
        $this->makePaidOrder($store,$pRoot,999,['payment_status'=>'paid','status'=>'cancelled']);
        $this->makePaidOrder($store,$pRoot,999,['payment_status'=>'refunded','status'=>'refunded']);

        $bestsellers = Category::bestsellersForCategory($store->id,$root->id,8);
        $ids = $bestsellers->pluck('id')->all();
        // Top should be pSub
        $this->assertSame((int)$pSub->id, (int)$bestsellers[0]->id);
        // Should include root+sub products, but NOT unrelated
        $this->assertContains((int)$pRoot->id, $ids);
        $this->assertContains((int)$pSub->id, $ids);
        $this->assertContains((int)$pOtherSub->id, $ids);
        $this->assertNotContains((int)$pUnrelated->id, $ids);
        // Ensure quantity aggregation respected (pending/cancelled not counted)
        // If pending counted, pRoot would have 999 extra and outrank; verify not
        $this->assertNotSame((int)$pRoot->id, (int)$bestsellers[0]->id);
    }

    public function test_bestseller_subcategory_is_strictly_scoped(): void
    {
        [$user,$store]=$this->merchantWithStore();
        $root=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>null]);
        $sub=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>$root->id]);
        $pRoot=$this->makeProduct($store,$root,'Root',10);
        $pSub=$this->makeProduct($store,$sub,'Sub',10);
        $this->makePaidOrder($store,$pRoot,10);
        $this->makePaidOrder($store,$pSub,1);
        $bestsellersSub = Category::bestsellersForCategory($store->id,$sub->id,8);
        $this->assertCount(1,$bestsellersSub);
        $this->assertSame((int)$pSub->id, (int)$bestsellersSub[0]->id);
    }

    public function test_bestseller_fallback_when_no_sales(): void
    {
        [$user,$store]=$this->merchantWithStore();
        $root=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>null]);
        $sub=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>$root->id]);
        $p1=$this->makeProduct($store,$sub,'A',10);
        sleep(1);
        $p2=$this->makeProduct($store,$sub,'B',10);
        $bestsellers = Category::bestsellersForCategory($store->id,$root->id,8);
        // No orders, fallback to newest first (B newer than A)
        $this->assertCount(2,$bestsellers);
        $this->assertSame((int)$p2->id, (int)$bestsellers[0]->id);
    }

    public function test_bestseller_tenant_isolation(): void
    {
        [$user,$store]=$this->merchantWithStore();
        [$otherUser,$otherStore]=$this->merchantWithStore();
        $root=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>null]);
        $otherRoot=Category::factory()->create(['store_id'=>$otherStore->id,'parent_id'=>null]);
        $pStore=$this->makeProduct($store,$root,'StoreP',10);
        $pOther=$this->makeProduct($otherStore,$otherRoot,'OtherP',10);
        $this->makePaidOrder($otherStore,$pOther,100);
        $this->makePaidOrder($store,$pStore,1);
        $bestsellers = Category::bestsellersForCategory($store->id,$root->id,8);
        $ids=$bestsellers->pluck('id')->all();
        $this->assertContains((int)$pStore->id,$ids);
        $this->assertNotContains((int)$pOther->id,$ids);
        // Cross-store bestseller request returns empty / not leaked
        $bestsellersOther = Category::bestsellersForCategory($store->id,$otherRoot->id,8);
        $this->assertCount(0,$bestsellersOther);
    }

    public function test_storefront_category_page_includes_subcategory_products(): void
    {
        [$user,$store]=$this->merchantWithStore();
        $root=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>null,'slug'=>'رجالي-'.uniqid(),'is_active'=>true]);
        $sub=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>$root->id,'is_active'=>true]);
        $pRoot=$this->makeProduct($store,$root,'RootProd',10);
        $pSub=$this->makeProduct($store,$sub,'SubProd',10);
        // Simulate ThemeController category listing query (descendant ids)
        $ids = $root->descendantCategoryIdsForProducts();
        $found = Product::where('store_id',$store->id)->where('is_active',true)->whereIn('category_id',$ids)->get();
        $this->assertCount(2,$found);
        // Subcategory page only its own
        $idsSub = $sub->descendantCategoryIdsForProducts();
        $foundSub = Product::where('store_id',$store->id)->where('is_active',true)->whereIn('category_id',$idsSub)->get();
        $this->assertCount(1,$foundSub);
    }

    public function test_cyclic_parent_rejected(): void
    {
        [$user,$store]=$this->merchantWithStore();
        $a=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>null]);
        $b=Category::factory()->create(['store_id'=>$store->id,'parent_id'=>$a->id]);
        $this->actingAs($user);
        $this->put(route('categories.update',$a->id),['name'=>$a->name,'parent_id'=>$b->id])->assertSessionHasErrors('parent_id');
    }
}
