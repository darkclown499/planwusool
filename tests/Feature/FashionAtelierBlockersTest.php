<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FashionAtelierBlockersTest extends TestCase
{
    use RefreshDatabase;

    private function makeStoreWithOwner(array $overrides = []): array
    {
        $user = User::factory()->create();
        $store = Store::factory()->create(array_merge(['user_id' => $user->id, 'theme' => 'fashion-atelier'], $overrides));
        return [$user, $store];
    }

    public function test_hero_fit_persistence(): void
    {
        [$user, $store] = $this->makeStoreWithOwner();
        $this->actingAs($user);
        $res = $this->putJson("/api/stores/{$store->id}/designer", ['content' => ['hero_banner.fit' => 'contain', 'hero_banner.position' => 'top', 'hero_banner.height_mobile' => '420px', 'hero_banner.height_desktop' => '520px']]);
        $res->assertOk();
        $store->refresh();
        $content = $store->store_content;
        $this->assertEquals('contain', data_get($content, 'hero_banner.fit'));
        $this->assertEquals('top', data_get($content, 'hero_banner.position'));
        $this->assertEquals('420px', data_get($content, 'hero_banner.height_mobile'));
    }

    public function test_hero_mobile_height_render_contract(): void
    {
        // shared/heroMedia must handle fit/position/height via useResolvedHero contract
        $this->assertFileExists(resource_path('js/templates-v2/shared/heroMedia.ts'));
        $this->assertStringContainsString('heightMobile', file_get_contents(resource_path('js/templates-v2/shared/heroMedia.ts')));
        $this->assertStringContainsString('atelier-hero', file_get_contents(resource_path('js/templates-v2/fashion-atelier/components/AtelierHero.tsx')));
        $this->assertStringContainsString('@media (max-width: 767px)', file_get_contents(resource_path('js/templates-v2/fashion-atelier/components/AtelierHero.tsx')));
    }

    public function test_customer_logout_available_in_profile(): void
    {
        $content = file_get_contents(resource_path('js/templates-v2/shared/neutral/CustomerModals.tsx'));
        $this->assertStringContainsString('تسجيل الخروج', $content);
        $this->assertStringContainsString('useAuth', $content);
        $this->assertStringContainsString('LogOut', $content);
    }

    private function makeCustomer($store, $email): Customer
    {
        return Customer::create(['store_id'=>$store->id,'first_name'=>'Test','last_name'=>'User','email'=>$email,'password'=>bcrypt('password'),'phone'=>'05xxxxxxxx','is_active'=>true,'email_verified_at'=>now()]);
    }
    public function test_address_crud_and_ownership(): void
    {
        [$user, $store] = $this->makeStoreWithOwner();
        $customer = $this->makeCustomer($store, 'a@test.com');
        $customerB = $this->makeCustomer($store, 'b@test.com');

        $this->actingAs($customer, 'customer');
        // create
        $res = $this->postJson('/api/customer-addresses', ['store_id' => $store->id, 'type' => 'shipping', 'address' => 'Ramallah St 1', 'city' => 'Ramallah', 'country' => 'Palestine']);
        $res->assertOk()->assertJsonPath('success', true);
        $id = $res->json('address.id');

        // list
        $res = $this->getJson("/api/customer-addresses?store_id={$store->id}");
        $res->assertOk()->assertJsonCount(1, 'addresses');

        // update
        $res = $this->putJson("/api/customer-addresses/{$id}", ['store_id' => $store->id, 'city' => 'Nablus']);
        $res->assertOk();

        // IDOR: B cannot update A's address
        $this->actingAs($customerB, 'customer');
        $res = $this->putJson("/api/customer-addresses/{$id}", ['store_id' => $store->id, 'city' => 'Hebron']);
        $res->assertStatus(404);

        // IDOR: B cannot delete
        $res = $this->deleteJson("/api/customer-addresses/{$id}?store_id={$store->id}");
        $res->assertStatus(404);

        // A can delete
        $this->actingAs($customer, 'customer');
        $res = $this->deleteJson("/api/customer-addresses/{$id}?store_id={$store->id}");
        $res->assertOk();
        $this->assertDatabaseMissing('customer_addresses', ['id' => $id]);
    }

    public function test_address_store_isolation(): void
    {
        [$userA, $storeA] = $this->makeStoreWithOwner();
        [$userB, $storeB] = $this->makeStoreWithOwner();
        $custA = $this->makeCustomer($storeA, 'a2@test.com');
        $this->actingAs($custA, 'customer');
        $res = $this->postJson('/api/customer-addresses', ['store_id' => $storeB->id, 'type' => 'shipping', 'address' => 'Addr', 'city' => 'City', 'country' => 'Country']);
        // store mismatch should be 403
        $res->assertStatus(403);
    }

    public function test_review_approved_only(): void
    {
        [$user, $store] = $this->makeStoreWithOwner();
        $product = Product::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        // create approved and unapproved via direct insert
        $customer = $this->makeCustomer($store, 'rev@test.com');
        $customer2 = $this->makeCustomer($store, 'rev2@test.com');
        \App\Models\ProductReview::create(['store_id'=>$store->id,'product_id'=>$product->id,'customer_id'=>$customer->id,'rating'=>5,'title'=>'Great','comment'=>'Excellent','is_approved'=>true, 'is_verified_purchase'=>true]);
        \App\Models\ProductReview::create(['store_id'=>$store->id,'product_id'=>$product->id,'customer_id'=>$customer2->id,'rating'=>1,'title'=>'Bad','comment'=>'Poor','is_approved'=>false, 'is_verified_purchase'=>false]);
        $res = $this->getJson("/api/reviews/product/{$product->id}");
        $res->assertOk();
        $reviews = $res->json('reviews.data') ?? $res->json('reviews') ?? [];
        // ensure unapproved not in response (only 1 approved)
        $this->assertCount(1, $reviews);
        $this->assertEquals(5, $reviews[0]['rating']);
    }

    public function test_search_store_isolation(): void
    {
        [$userA, $storeA] = $this->makeStoreWithOwner();
        [$userB, $storeB] = $this->makeStoreWithOwner();
        Product::factory()->create(['store_id' => $storeA->id, 'name' => 'UniqueSearchTermXYZ', 'is_active' => true]);
        Product::factory()->create(['store_id' => $storeB->id, 'name' => 'Other', 'is_active' => true]);

        $res = $this->getJson("/api/storefront/search?q=UniqueSearchTermXYZ&store_id={$storeB->id}");
        $res->assertOk();
        $this->assertCount(0, $res->json('products'));

        $res = $this->getJson("/api/storefront/search?q=UniqueSearchTermXYZ&store_id={$storeA->id}");
        $res->assertOk();
        $this->assertCount(1, $res->json('products'));
    }

    public function test_order_tracking_visibility(): void
    {
        [$user, $store] = $this->makeStoreWithOwner();
        $customer = $this->makeCustomer($store, 'ord@test.com');
        $orderNumber = 'ORD-TEST123456';
        \Illuminate\Support\Facades\DB::table('orders')->insert(['store_id'=>$store->id,'customer_id'=>$customer->id,'session_id'=>str()->random(10),'order_number'=>$orderNumber,'status'=>'shipped','payment_status'=>'paid','customer_email'=>$customer->email,'customer_phone'=>'05x','customer_first_name'=>'Test','customer_last_name'=>'User','shipping_address'=>'Addr','shipping_city'=>'City','shipping_state'=>'State','shipping_country'=>'Country','billing_address'=>'Addr','billing_city'=>'City','billing_state'=>'State','billing_country'=>'Country','payment_method'=>'cod','subtotal'=>100,'total_amount'=>100,'tracking_number'=>'TRK123','shipped_at'=>now(),'created_at'=>now(),'updated_at'=>now()]);
        $this->actingAs($customer, 'customer');
        $res = $this->getJson("/api/orders/{$orderNumber}?store_slug={$store->slug}");
        $res->assertOk();
        $this->assertEquals('TRK123', $res->json('order.tracking_number'));
        $this->assertNotNull($res->json('order.timeline'));
        $this->assertEquals('shipped', $res->json('order.status'));
    }

    public function test_mobile_desktop_search_use_server_contract(): void
    {
        $atelier = file_get_contents(resource_path('js/templates-v2/fashion-atelier/overlays/AtelierSearchOverlay.tsx'));
        $this->assertStringContainsString('useServerSearch', $atelier);
        $mobile = file_get_contents(resource_path('js/components/storefront/MobileAppShell.tsx'));
        $this->assertStringContainsString('setShowSearch', $mobile);
        $hook = file_get_contents(resource_path('js/hooks/useServerSearch.ts'));
        $this->assertStringContainsString('/api/storefront/search', $hook);
        $this->assertStringContainsString('store_id', $hook);
    }
}
