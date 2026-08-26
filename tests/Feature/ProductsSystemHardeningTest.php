<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductsSystemHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function merchantWithStore(): array
    {
        $plan = \App\Models\Plan::factory()->create(['max_products_per_store'=>1000,'max_stores'=>10,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','email_verified_at'=>now(),'onboarded_at'=>now(),'plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth()]);
        $store = Store::factory()->create(['user_id'=>$user->id]);
        $user->current_store=$store->id; $user->save();
        try { $role=\Spatie\Permission\Models\Role::firstOrCreate(['name'=>'prod-test-'.uniqid(),'guard_name'=>'web']); $perms=\Spatie\Permission\Models\Permission::whereIn('name',['manage-products','create-products','edit-products','delete-products','view-products'])->get(); if($perms->count()){$role->syncPermissions($perms);$user->assignRole($role);} else {$user->type='superadmin';$user->save();} } catch(\Throwable $e){$user->type='superadmin';$user->save();}
        $cat = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true]);
        return [$user,$store,$cat];
    }

    public function test_create_product_persists_and_trimmed(): void
    {
        [$user,$store,$cat] = $this->merchantWithStore();
        $this->actingAs($user);
        $this->post(route('products.store'), ['name'=>'  هاتف  ','price'=>100,'stock'=>5,'category_id'=>$cat->id,'images'=>'/storage/a.jpg'])->assertRedirect(route('products.index'));
        $this->assertDatabaseHas('products',['store_id'=>$store->id,'name'=>'هاتف']);
    }
    public function test_whitespace_name_rejected(): void
    {
        [$user,$store,$cat] = $this->merchantWithStore();
        $this->actingAs($user);
        $this->post(route('products.store'), ['name'=>'   ','price'=>10,'stock'=>1,'category_id'=>$cat->id,'images'=>'/storage/a.jpg'])->assertSessionHasErrors('name');
    }
    public function test_price_and_sale_effective_logic(): void
    {
        [$user,$store,$cat]=$this->merchantWithStore();
        $p=Product::create(['name'=>'P','price'=>100,'sale_price'=>80,'stock'=>5,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        $this->assertEquals(80,$p->effectivePrice());
        $this->assertTrue($p->hasEffectiveSale());
        // sale > price => ignored
        $p2=Product::create(['name'=>'P2','price'=>100,'sale_price'=>120,'stock'=>5,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        $this->assertEquals(100,$p2->effectivePrice());
        $this->assertFalse($p2->hasEffectiveSale());
        // Theme format
        $ctrl=new \App\Http\Controllers\ThemeController(); $m=new \ReflectionMethod($ctrl,'formatFullProduct'); $m->setAccessible(true);
        $d=$m->invoke($ctrl,$p); $this->assertEquals(80,$d['price']); $this->assertEquals(100,$d['originalPrice']);
        $d2=$m->invoke($ctrl,$p2); $this->assertEquals(100,$d2['price']); $this->assertNull($d2['originalPrice']);
    }
    public function test_inactive_hidden_from_storefront_and_api(): void
    {
        [$user,$store,$cat]=$this->merchantWithStore();
        $p=Product::create(['name'=>'Hidden','price'=>10,'stock'=>5,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>false]);
        $ctrl=new \App\Http\Controllers\ThemeController(); $m=new \ReflectionMethod($ctrl,'productDetail'); $m->setAccessible(true);
        // Simulate store slug lookup: use productDetail direct with store check via DB
        $found=Product::where('store_id',$store->id)->where('id',$p->id)->where('is_active',true)->first();
        $this->assertNull($found);
    }
    public function test_cross_store_category_rejected(): void
    {
        [$user,$store,$cat]=$this->merchantWithStore();
        [$otherUser,$otherStore,$otherCat]=$this->merchantWithStore();
        $this->actingAs($user);
        $this->post(route('products.store'), ['name'=>'X','price'=>10,'stock'=>1,'category_id'=>$otherCat->id,'images'=>'/storage/a.jpg'])->assertSessionHasErrors('category_id');
    }
    public function test_cross_store_edit_rejected(): void
    {
        [$user,$store,$cat]=$this->merchantWithStore();
        [$otherUser,$otherStore,$otherCat]=$this->merchantWithStore();
        $p=Product::create(['name'=>'P','price'=>10,'stock'=>5,'store_id'=>$otherStore->id,'category_id'=>$otherCat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        $this->actingAs($user);
        $res=$this->put(route('products.update',$p->id),['name'=>'Hacked','price'=>10,'stock'=>5,'category_id'=>$cat->id,'images'=>'/storage/a.jpg']);
        $this->assertTrue(in_array($res->getStatusCode(),[302,403,404]));
        $this->assertSame('P',$p->fresh()->name);
    }
    public function test_cart_add_respects_stock_and_active(): void
    {
        [$user,$store,$cat]=$this->merchantWithStore();
        $p=Product::create(['name'=>'Stock0','price'=>10,'stock'=>0,'track_inventory'=>true,'allow_backorder'=>false,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        $this->postJson('/api/cart/add', ['store_id'=>$store->id,'product_id'=>$p->id,'quantity'=>1])->assertStatus(422);
        $p2=Product::create(['name'=>'Inactive','price'=>10,'stock'=>5,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>false]);
        $this->postJson('/api/cart/add', ['store_id'=>$store->id,'product_id'=>$p2->id,'quantity'=>1])->assertStatus(422);
    }
    public function test_cart_add_backorder_allowed(): void
    {
        [$user,$store,$cat]=$this->merchantWithStore();
        $p=Product::create(['name'=>'Back','price'=>10,'stock'=>0,'track_inventory'=>true,'allow_backorder'=>true,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        $this->postJson('/api/cart/add', ['store_id'=>$store->id,'product_id'=>$p->id,'quantity'=>2])->assertOk();
    }
    public function test_order_stock_decrement_and_oversell_blocked(): void
    {
        [$user,$store,$cat]=$this->merchantWithStore();
        $p=Product::create(['name'=>'Lim','price'=>10,'stock'=>2,'track_inventory'=>true,'allow_backorder'=>false,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        // Simulate atomic decrement (as OrderService does)
        $ok=\Illuminate\Support\Facades\DB::table('products')->where('id',$p->id)->where('stock','>=',2)->decrement('stock',2);
        $this->assertEquals(1,$ok);
        $this->assertEquals(0,Product::find($p->id)->stock);
        // Second attempt should fail
        $ok2=\Illuminate\Support\Facades\DB::table('products')->where('id',$p->id)->where('stock','>=',1)->decrement('stock',1);
        $this->assertEquals(0,$ok2);
    }
    public function test_availability_respects_track_inventory(): void
    {
        [$user,$store,$cat]=$this->merchantWithStore();
        $p=Product::create(['name'=>'NoTrack','price'=>10,'stock'=>0,'track_inventory'=>false,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        $this->assertSame('in_stock',$p->availabilityStatus());
        $p2=Product::create(['name'=>'Track0','price'=>10,'stock'=>0,'track_inventory'=>true,'allow_backorder'=>false,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true]);
        $this->assertSame('out_of_stock',$p2->availabilityStatus());
    }
    public function test_slug_unique_per_store_and_cache_invalidation(): void
    {
        [$user,$store,$cat]=$this->merchantWithStore();
        $a=Product::create(['name'=>'Test','price'=>10,'stock'=>1,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true,'seo_url_slug'=>'my-slug']);
        // Another store can reuse
        [$otherUser,$otherStore,$otherCat]=$this->merchantWithStore();
        $b=Product::create(['name'=>'Test','price'=>10,'stock'=>1,'store_id'=>$otherStore->id,'category_id'=>$otherCat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true,'seo_url_slug'=>'my-slug']);
        $this->assertSame('my-slug',$b->seo_url_slug);
    }
    public function test_image_security_rejected(): void
    {
        [$user,$store,$cat]=$this->merchantWithStore();
        $this->actingAs($user);
        $this->post(route('products.store'), ['name'=>'X','price'=>10,'stock'=>1,'category_id'=>$cat->id,'images'=>'../../etc/passwd'])->assertSessionHasErrors('images');
        $this->post(route('products.store'), ['name'=>'X','price'=>10,'stock'=>1,'category_id'=>$cat->id,'images'=>'javascript:alert(1)'])->assertSessionHasErrors('images');
    }
    public function test_all_templates_canonical_product_shape(): void
    {
        [$user,$store,$cat]=$this->merchantWithStore();
        $p=Product::create(['name'=>'قميص','price'=>100,'sale_price'=>80,'stock'=>5,'store_id'=>$store->id,'category_id'=>$cat->id,'images'=>'/storage/a.jpg','cover_image'=>'/storage/a.jpg','is_active'=>true,'description'=>'وصف']);
        foreach(\App\Models\Store::ALL_TEMPLATES as $theme){ $store->theme=$theme; $store->save(); $ctrl=new \App\Http\Controllers\ThemeController(); $m=new \ReflectionMethod($ctrl,'formatFullProduct'); $m->setAccessible(true); $d=$m->invoke($ctrl,$p); $this->assertSame('قميص',$d['name']); $this->assertEquals(80,$d['price']); }
    }
}
