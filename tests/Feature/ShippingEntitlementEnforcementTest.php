<?php

namespace Tests\Feature;

use App\Models\CartItem;
use App\Models\Category;
use App\Models\Customer;
use App\Models\DeliveryDriver;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * PHASE 1 / P1 — shipping entitlement enforcement.
 * Starter stores must not create/update/toggle shipping methods, local delivery
 * zones or delivery drivers, must not expose them to checkout, and must not be
 * able to submit them at order time. Growth stores keep full access.
 * Deletion (cleanup) stays allowed on all plans.
 */
class ShippingEntitlementEnforcementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    private function merchantWithStore(string $shippingFlag = 'off', string $storeName = 'Entitlement Store'): array
    {
        $plan = Plan::factory()->create([
            'price' => 0,
            'is_default' => true,
            'max_stores' => 5,
            'max_products_per_store' => 1000,
            'enable_shipping_method' => $shippingFlag,
        ]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = Store::factory()->create(['user_id' => $user->id, 'name' => $storeName]);
        \Illuminate\Support\Facades\DB::table('users')->where('id', $user->id)->update(['current_store' => $store->id]);
        $user = $user->fresh();
        $user->givePermissionTo(['manage-orders','manage-shipping','create-shipping','edit-shipping','delete-shipping','view-shipping','settings-stores','manage-stores']);
        return [$user, $store];
    }

    private function makeShipping(Store $store, array $over = []): Shipping
    {
        return Shipping::create(array_merge(['store_id'=>$store->id,'name'=>'طريقة','type'=>'flat_rate','cost'=>20,'is_active'=>true,'sort_order'=>0], $over));
    }

    private function makeZone(Store $store, array $over = []): DeliveryZone
    {
        return DeliveryZone::create(array_merge(['store_id'=>$store->id,'name'=>'منطقة','fee'=>10,'is_active'=>true,'sort_order'=>0], $over));
    }

    private function makeDriver(Store $store, array $over = []): DeliveryDriver
    {
        return DeliveryDriver::create(array_merge(['store_id'=>$store->id,'name'=>'سائق','phone'=>'+970599000000','active'=>true], $over));
    }

    private function makeCart(Store $store): Customer
    {
        $cat = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true,'slug'=>'c-'.uniqid()]);
        $product = Product::create(['name'=>'P','price'=>100,'store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'stock'=>10,'sku'=>'SKU-'.uniqid()]);
        $customer = Customer::create(['store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'x@'.uniqid().'.com','password'=>bcrypt('pass'),'is_active'=>true]);
        CartItem::create(['store_id'=>$store->id,'customer_id'=>$customer->id,'session_id'=>session()->getId(),'product_id'=>$product->id,'quantity'=>1,'price'=>$product->price]);
        $this->actingAs($customer,'customer');
        return $customer;
    }

    /** WRITE GATES — Starter plan */

    public function test_starter_cannot_create_shipping_method(): void
    {
        [$owner,$store] = $this->merchantWithStore('off');
        $res = $this->from('/shipping')->actingAs($owner)->post(route('shipping.store'), ['name'=>'بدون ترخيص','type'=>'flat_rate','cost'=>5]);
        $res->assertRedirect('/shipping');
        $this->assertNotNull($res->getSession()->get('error'));
        $this->assertDatabaseMissing('shippings', ['name'=>'بدون ترخيص','store_id'=>$store->id]);
    }

    public function test_starter_cannot_update_shipping_method(): void
    {
        [$owner,$store] = $this->merchantWithStore('off');
        $s = $this->makeShipping($store, ['name'=>'original']);
        $res = $this->from('/shipping')->actingAs($owner)->put(route('shipping.update',$s->id), ['name'=>'hacked','type'=>'flat_rate','cost'=>99]);
        $res->assertRedirect('/shipping');
        $this->assertDatabaseHas('shippings', ['id'=>$s->id,'name'=>'original']);
    }

    public function test_starter_cannot_change_free_shipping_settings(): void
    {
        [$owner,$store] = $this->merchantWithStore('off');
        $res = $this->from('/shipping')->actingAs($owner)->put(route('shipping.free.update'), ['enabled'=>true,'threshold'=>250]);
        $res->assertRedirect('/shipping');
        $cfg = StoreConfiguration::getConfiguration($store->id);
        $this->assertNotEquals('true',$cfg['free_shipping_enabled'] ?? null);
    }

    public function test_starter_cannot_create_delivery_zone(): void
    {
        [$owner,$store] = $this->merchantWithStore('off');
        $res = $this->from(route('delivery.zones.index'))->actingAs($owner)->post(route('delivery.zones.store'), ['name'=>'غير مسموح','fee'=>5]);
        $res->assertRedirect(route('delivery.zones.index'));
        $this->assertDatabaseMissing('delivery_zones', ['name'=>'غير مسموح','store_id'=>$store->id]);
    }

    public function test_starter_cannot_toggle_or_reorder_zones(): void
    {
        [$owner,$store] = $this->merchantWithStore('off');
        $z = $this->makeZone($store, ['name'=>'منطقة محمية','is_active'=>false]);
        $this->from(route('delivery.zones.index'))->actingAs($owner)->post(route('delivery.zones.toggle-status',$z->id))->assertRedirect();
        $this->from(route('delivery.zones.index'))->actingAs($owner)->post(route('delivery.zones.reorder'), ['ids'=>[$z->id]])->assertRedirect();
        $this->assertDatabaseHas('delivery_zones', ['id'=>$z->id,'is_active'=>false]);
    }

    public function test_starter_cannot_create_or_toggle_drivers(): void
    {
        [$owner,$store] = $this->merchantWithStore('off');
        $this->from(route('delivery.drivers.index'))->actingAs($owner)->post(route('delivery.drivers.store'), ['name'=>'سائق محظور','phone'=>'0599000000'])->assertRedirect();
        $this->assertDatabaseMissing('delivery_drivers', ['name'=>'سائق محظور','store_id'=>$store->id]);

        $d = $this->makeDriver($store, ['name'=>'سائق حالي','active'=>true]);
        $this->from(route('delivery.drivers.index'))->actingAs($owner)->post(route('delivery.drivers.toggle-status',$d->id))->assertRedirect();
        $this->assertDatabaseHas('delivery_drivers', ['id'=>$d->id,'active'=>true]);
    }

    public function test_json_api_calls_get_403_when_blocked(): void
    {
        [$owner,$store] = $this->merchantWithStore('off');
        $this->actingAs($owner)
            ->postJson(route('delivery.zones.store'), ['name'=>'api محظور','fee'=>5])
            ->assertStatus(403)
            ->assertJson(['success'=>false]);
    }

    /** CLEANUP stays allowed */

    public function test_starter_can_still_delete_shipping_method(): void
    {
        [$owner,$store] = $this->merchantWithStore('off');
        $s = $this->makeShipping($store);
        $this->actingAs($owner)->delete(route('shipping.destroy',$s->id))->assertRedirect();
        $this->assertDatabaseMissing('shippings', ['id'=>$s->id]);
    }

    public function test_starter_can_still_delete_zones_and_drivers(): void
    {
        [$owner,$store] = $this->merchantWithStore('off');
        $z = $this->makeZone($store); $d = $this->makeDriver($store);
        $this->actingAs($owner)->delete(route('delivery.zones.destroy',$z->id))->assertRedirect();
        $this->actingAs($owner)->delete(route('delivery.drivers.destroy',$d->id))->assertRedirect();
        $this->assertDatabaseMissing('delivery_zones', ['id'=>$z->id]);
        $this->assertDatabaseMissing('delivery_drivers', ['id'=>$d->id]);
    }

    /** STOREFRONT READ GATES */

    public function test_starter_storefront_sees_no_methods_or_zones_even_if_present(): void
    {
        [$owner,$store] = $this->merchantWithStore('off');
        $this->makeShipping($store, ['name'=>'مخفي','is_active'=>true]);
        $this->makeZone($store, ['name'=>'مخفي','is_active'=>true]);

        $res = $this->getJson(route('api.shipping.methods').'?store_id='.$store->id);
        $res->assertOk();
        $this->assertEquals([], $res->json('shipping_methods'));

        $zres = $this->getJson(route('api.delivery-zones').'?store_id='.$store->id);
        $zres->assertOk();
        $this->assertEquals([], $zres->json('delivery_zones'));
    }

    public function test_growth_storefront_sees_methods(): void
    {
        [$owner,$store] = $this->merchantWithStore('on');
        $this->makeShipping($store, ['name'=>'مرئي','is_active'=>true]);
        $res = $this->getJson(route('api.shipping.methods').'?store_id='.$store->id);
        $res->assertOk()->assertJsonCount(1,'shipping_methods');
    }

    /** ORDER GATE */

    public function test_starter_checkout_rejects_shipping_method_and_zone(): void
    {
        [$owner,$store] = $this->merchantWithStore('off');
        $s = $this->makeShipping($store); $z = $this->makeZone($store);
        $this->makeCart($store);
        $base = [
            'store_id'=>$store->id,
            'customer_first_name'=>'A','customer_last_name'=>'B','customer_email'=>uniqid().'@c.com','customer_phone'=>'0599000000',
            'shipping_address'=>'addr','shipping_city'=>'Nablus','shipping_state'=>'WB','shipping_country'=>'PS',
            'billing_address'=>'addr','billing_city'=>'N','billing_state'=>'W','billing_country'=>'PS',
            'payment_method'=>'cod',
        ];
        $this->postJson(route('store.order.place',['storeSlug'=>$store->slug]), $base + ['shipping_method_id'=>$s->id])->assertStatus(422);
        $this->postJson(route('store.order.place',['storeSlug'=>$store->slug]), $base + ['delivery_zone_id'=>$z->id])->assertStatus(422);
        $this->assertCount(0, Order::where('store_id',$store->id)->get());
    }

    public function test_starter_checkout_without_shipping_succeeds_cod(): void
    {
        [$owner,$store] = $this->merchantWithStore('off');
        $this->makeCart($store);
        $res = $this->postJson(route('store.order.place',['storeSlug'=>$store->slug]), [
            'store_id'=>$store->id,
            'customer_first_name'=>'A','customer_last_name'=>'B','customer_email'=>uniqid().'@c.com','customer_phone'=>'0599000000',
            'shipping_address'=>'addr','shipping_city'=>'Nablus','shipping_state'=>'WB','shipping_country'=>'PS',
            'billing_address'=>'addr','billing_city'=>'N','billing_state'=>'W','billing_country'=>'PS',
            'payment_method'=>'cod',
        ]);
        $res->assertStatus(200)->assertJson(['success'=>true]);
        $order = Order::where('store_id',$store->id)->first();
        $this->assertNotNull($order);
        $this->assertEquals(0.0,(float)$order->shipping_amount);
    }

    /** GROWTH stays fully functional */

    public function test_growth_merchant_keeps_full_shipping_management(): void
    {
        [$owner,$store] = $this->merchantWithStore('on');
        $this->actingAs($owner)->post(route('shipping.store'), ['name'=>'طريقة Growth','type'=>'flat_rate','cost'=>15])->assertRedirect();
        $this->assertDatabaseHas('shippings', ['name'=>'طريقة Growth','store_id'=>$store->id]);
        $this->actingAs($owner)->post(route('delivery.zones.store'), ['name'=>'منطقة Growth','fee'=>12])->assertRedirect();
        $this->assertDatabaseHas('delivery_zones', ['name'=>'منطقة Growth','store_id'=>$store->id]);
        $this->actingAs($owner)->post(route('delivery.drivers.store'), ['name'=>'سائق Growth','phone'=>'0599000000'])->assertRedirect();
        $this->assertDatabaseHas('delivery_drivers', ['name'=>'سائق Growth','store_id'=>$store->id]);
    }

    public function test_growth_checkout_accepts_delivery_zone(): void
    {
        [$owner,$store] = $this->merchantWithStore('on');
        $z = $this->makeZone($store, ['fee'=>30]);
        $this->makeCart($store);
        $res = $this->postJson(route('store.order.place',['storeSlug'=>$store->slug]), [
            'store_id'=>$store->id,
            'customer_first_name'=>'A','customer_last_name'=>'B','customer_email'=>uniqid().'@c.com','customer_phone'=>'0599000000',
            'shipping_address'=>'addr','shipping_city'=>'Nablus','shipping_state'=>'WB','shipping_country'=>'PS',
            'billing_address'=>'addr','billing_city'=>'N','billing_state'=>'W','billing_country'=>'PS',
            'payment_method'=>'cod','delivery_zone_id'=>$z->id,
        ]);
        $res->assertStatus(200);
        $order = Order::where('store_id',$store->id)->first();
        $this->assertEquals(30.0,(float)$order->delivery_fee);
    }

    /** HUB UI STATE */

    public function test_delivery_hub_exposes_shipping_enabled_flag(): void
    {
        [$starter,$starterStore] = $this->merchantWithStore('off','Starter Hub');
        $res = $this->actingAs($starter)
            ->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',(string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request()))
            ->getJson(route('delivery.index'));
        $res->assertOk();
        $this->assertFalse($res->json('props.shippingEnabled'));

        [$growth,$growthStore] = $this->merchantWithStore('on','Growth Hub');
        $res2 = $this->actingAs($growth)
            ->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',(string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request()))
            ->getJson(route('delivery.index'));
        $res2->assertOk();
        $this->assertTrue($res2->json('props.shippingEnabled'));
    }

    /** CROSS-USER isolation: same feature, different plans */

    public function test_cross_user_isolation_starter_blocked_growth_allowed(): void
    {
        [$starter,$starterStore] = $this->merchantWithStore('off','Starter Isolated');
        [$growth,$growthStore] = $this->merchantWithStore('on','Growth Isolated');

        $this->from(route('shipping.index'))->actingAs($starter)->post(route('shipping.store'), ['name'=>'A','type'=>'flat_rate','cost'=>5])->assertRedirect();
        $this->assertDatabaseMissing('shippings', ['name'=>'A']);

        $this->actingAs($growth)->post(route('shipping.store'), ['name'=>'A','type'=>'flat_rate','cost'=>5])->assertRedirect();
        $this->assertDatabaseHas('shippings', ['name'=>'A','store_id'=>$growthStore->id]);
    }
}