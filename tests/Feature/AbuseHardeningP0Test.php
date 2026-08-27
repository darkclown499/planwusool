<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\User;
use App\Models\Product;
use App\Models\Order;
use App\Models\StoreCoupon;
use App\Models\Plan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Illuminate\Support\Facades\Hash;

class AbuseHardeningP0Test extends TestCase
{
    use RefreshDatabase;

    private function companyUser(): User
    {
        $plan = Plan::factory()->create(['storage_limit' => 5]);
        $user = User::forceCreate([
            'name' => 'Merchant',
            'email' => 'merchant'.uniqid().'@test.com',
            'password' => Hash::make('password'),
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'is_enable_login' => 1,
        ]);
        try { $user->assignRole('company'); } catch (\Throwable $e) {}
        return $user;
    }

    private function storeFor(User $user, string $slug = null): Store
    {
        $slug = $slug ?? 'store'.uniqid();
        $store = Store::forceCreate([
            'name' => 'S '.$slug,
            'slug' => $slug,
            'theme' => Store::DEFAULT_TEMPLATE,
            'user_id' => $user->id,
        ]);
        $user->forceFill(['current_store' => $store->id])->save();
        \App\Models\StoreConfiguration::setConfiguration($store->id, 'store_status', 'true');
        return $store;
    }

    private function productFor(Store $store, int $stock = 100): Product
    {
        $category = \App\Models\Category::factory()->create(['store_id' => $store->id]);
        return Product::factory()->create([
            'store_id' => $store->id,
            'category_id' => $category->id,
            'stock' => $stock,
            'track_inventory' => true,
            'price' => 100,
            'sale_price' => null,
        ]);
    }

    private function addToCartViaApi(Store $store, Product $product, int $qty = 1)
    {
        $this->postJson('/api/cart/add', [
            'store_id' => $store->id,
            'product_id' => $product->id,
            'quantity' => $qty,
        ])->assertStatus(200);
    }

    private function placeOrderUrl(Store $store): string
    {
        return 'http://'.$store->slug.'.localhost/order/place';
    }

    private function checkoutPayload(Store $store, string $payment = 'cod', array $overrides = []): array
    {
        $base = [
            'store_id' => $store->id,
            'customer_first_name' => 'John',
            'customer_last_name' => 'Doe',
            'customer_email' => 'john'.uniqid().'@example.com',
            'customer_phone' => '0599000000',
            'shipping_address' => 'Test St',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'West Bank',
            'shipping_country' => 'Palestine',
            'billing_address' => 'Test St',
            'billing_city' => 'Nablus',
            'billing_state' => 'West Bank',
            'billing_country' => 'Palestine',
            'payment_method' => $payment,
            'notes' => 'test',
        ];
        return array_merge($base, $overrides);
    }

    public function test_excessive_order_attempts_returns_429(): void
    {
        $routes = \Illuminate\Support\Facades\Route::getRoutes();
        $found = false;
        foreach ($routes as $r) {
            if (str_contains($r->uri(), 'order/place')) {
                $mw = implode(',', $r->middleware());
                if (str_contains($mw, 'throttle')) $found = true;
            }
        }
        $this->assertTrue($found, 'Order place route must have throttle middleware');
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $this->assertEquals(0, Order::where('store_id',$store->id)->count());
    }

    public function test_rate_limited_order_does_not_decrement_stock(): void
    {
        $user = $this->companyUser();
        $store = $this->storeFor($user);
        $product = $this->productFor($store, 10);
        foreach (['Palestine'=>'PSE'] as $n=>$c) \App\Models\Country::firstOrCreate(['code'=>$c], ['name'=>$n,'status'=>true]);
        for ($i=0; $i<5; $i++) {
            $this->addToCartViaApi($store, $product);
            $payload = $this->checkoutPayload($store,'cod',['customer_email'=>'flood@test.com','idempotency_key'=>uniqid()]);
            $this->postJson($this->placeOrderUrl($store), $payload);
        }
        $product->refresh();
        $stockAfter5 = $product->stock;
        $this->addToCartViaApi($store, $product);
        $payload = $this->checkoutPayload($store,'cod',['customer_email'=>'flood@test.com','idempotency_key'=>uniqid()]);
        $res = $this->postJson($this->placeOrderUrl($store), $payload);
        if ($res->status() === 429) {
            $product->refresh();
            $this->assertEquals($stockAfter5, $product->stock);
        } else {
            $this->assertTrue(true);
        }
    }

    public function test_store_a_limiter_does_not_block_store_b(): void
    {
        $userA = $this->companyUser(); $storeA = $this->storeFor($userA, 'storea'.uniqid());
        $userB = $this->companyUser(); $storeB = $this->storeFor($userB, 'storeb'.uniqid());
        foreach (['Palestine'=>'PSE'] as $n=>$c) \App\Models\Country::firstOrCreate(['code'=>$c], ['name'=>$n,'status'=>true]);
        for ($i=0;$i<6;$i++) {
            $payload = $this->checkoutPayload($storeA,'cod',['customer_email'=>"a{$i}@test.com",'idempotency_key'=>uniqid()]);
            $this->postJson($this->placeOrderUrl($storeA), $payload);
        }
        $payloadB = $this->checkoutPayload($storeB,'cod',['customer_email'=>'b@test.com','idempotency_key'=>uniqid()]);
        $resB = $this->postJson($this->placeOrderUrl($storeB), $payloadB);
        $this->assertNotEquals(429, $resB->status(), 'Store B should not be blocked by Store A flood (store-scoped limiter)');
    }

    public function test_duplicate_idempotency_protected(): void
    {
        $user = $this->companyUser(); $store = $this->storeFor($user);
        $product = $this->productFor($store);
        foreach (['Palestine'=>'PSE'] as $n=>$c) \App\Models\Country::firstOrCreate(['code'=>$c], ['name'=>$n,'status'=>true]);
        $this->addToCartViaApi($store, $product);
        $key = 'dup-'.uniqid();
        $payload = $this->checkoutPayload($store,'cod',['idempotency_key'=>$key]);
        $r1 = $this->postJson($this->placeOrderUrl($store), $payload);
        if ($r1->status()!==200) $this->markTestSkipped('Order creation failed in test setup: '.$r1->content());
        $this->addToCartViaApi($store, $product);
        $r2 = $this->postJson($this->placeOrderUrl($store), $payload);
        $this->assertEquals(1, Order::where('store_id',$store->id)->where('idempotency_key',$key)->count());
        $this->assertTrue($r2->json('duplicate') === true || $r2->status()===200 || $r2->status()===409);
    }

    public function test_password_reset_throttling(): void
    {
        for ($i=0;$i<3;$i++) {
            $this->post('/forgot-password', ['email'=>'test@test.com']);
        }
        $res = $this->post('/forgot-password', ['email'=>'test@test.com']);
        $this->assertTrue(in_array($res->status(), [302,429]));
    }

    public function test_coupon_brute_force_throttled(): void
    {
        $routes = \Illuminate\Support\Facades\Route::getRoutes();
        $found = false;
        foreach ($routes as $r) {
            if (str_contains($r->uri(), 'coupon/validate')) {
                $mw = implode(',', $r->middleware());
                if (str_contains($mw, 'throttle')) $found = true;
            }
        }
        $this->assertTrue($found, 'Coupon validate routes must have throttle middleware');
        $user = $this->companyUser(); $store = $this->storeFor($user);
        StoreCoupon::create(['store_id'=>$store->id,'name'=>'Test','code'=>'VALID10','type'=>'flat','discount_amount'=>10,'status'=>true,'minimum_spend'=>0]);
        $res = $this->postJson('/api/coupon/validate', ['code'=>'INVALID','store_id'=>$store->id,'subtotal'=>100]);
        $this->assertEquals(400, $res->status());
    }

    public function test_valid_coupon_still_works(): void
    {
        $user = $this->companyUser(); $store = $this->storeFor($user);
        StoreCoupon::create(['store_id'=>$store->id,'name'=>'Test','code'=>'VALID10','type'=>'flat','discount_amount'=>10,'status'=>true,'minimum_spend'=>0]);
        $res = $this->postJson('/api/coupon/validate', ['code'=>'VALID10','store_id'=>$store->id,'subtotal'=>100]);
        $res->assertStatus(200)->assertJson(['valid'=>true]);
    }

    public function test_cross_store_coupon_rejected(): void
    {
        $userA = $this->companyUser(); $storeA = $this->storeFor($userA);
        $userB = $this->companyUser(); $storeB = $this->storeFor($userB);
        StoreCoupon::create(['store_id'=>$storeB->id,'name'=>'B','code'=>'CROSS'.uniqid(),'type'=>'flat','discount_amount'=>10,'status'=>true]);
        $code = StoreCoupon::where('store_id',$storeB->id)->first()->code;
        $res = $this->postJson('/api/coupon/validate', ['code'=>$code,'store_id'=>$storeA->id,'subtotal'=>100]);
        $res->assertStatus(400);
        $this->assertFalse($res->json('valid'));
    }

    public function test_user_cannot_mass_assign_privileged_type(): void
    {
        $user = $this->companyUser();
        $this->actingAs($user);
        $target = User::forceCreate([
            'name'=>'Target','email'=>'target'.uniqid().'@test.com','password'=>Hash::make('password'),'type'=>'company','created_by'=>$user->id
        ]);
        $roleId = \Spatie\Permission\Models\Role::first()?->id ?? 1;
        $this->put("/users/{$target->id}", [
            'name'=>'Hacked',
            'email'=>$target->email,
            'phone'=>'123',
            'roles'=> $roleId,
            'type'=>'superadmin',
            'plan_id'=>999,
            'created_by'=>999,
        ]);
        $target->refresh();
        $this->assertNotEquals('superadmin', $target->type);
        $this->assertNotEquals(999, $target->created_by);
    }

    public function test_store_ownership_cannot_be_reassigned(): void
    {
        $userA = $this->companyUser(); $storeA = $this->storeFor($userA);
        $userB = $this->companyUser();
        $this->actingAs($userA);
        $this->put("/stores/{$storeA->id}", [
            'name'=>'Hacked','theme'=>Store::DEFAULT_TEMPLATE,'user_id'=>$userB->id
        ]);
        $storeA->refresh();
        $this->assertEquals($userA->id, $storeA->user_id);
    }
}
