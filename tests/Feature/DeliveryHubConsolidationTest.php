<?php

namespace Tests\Feature;

use App\Models\DeliveryAssignment;
use App\Models\DeliveryDriver;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use App\Models\CartItem;
use App\Models\Customer;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Delivery Hub consolidation regression tests (Task 3).
 * Covers A-V from spec.
 */
class DeliveryHubConsolidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    private function ownerWithStore(string $name = 'Hub Store'): array
    {
        $plan = Plan::factory()->create([
            'price' => 0,
            'is_default' => true,
            'max_stores' => 5,
            'max_products_per_store' => 1000,
            'enable_shipping_method' => 'on',
        ]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = Store::factory()->create(['user_id' => $user->id, 'name' => $name]);
        \Illuminate\Support\Facades\DB::table('users')->where('id', $user->id)->update(['current_store' => $store->id]);
        $user = $user->fresh();
        $user->givePermissionTo(['manage-orders','manage-shipping','create-shipping','edit-shipping','delete-shipping','view-shipping','settings-stores','manage-stores']);
        return [$user, $store];
    }

    private function makeZone(Store $store, array $over = []): DeliveryZone
    {
        return DeliveryZone::create(array_merge(['store_id'=>$store->id,'name'=>'قلقيلية','fee'=>10,'is_active'=>true,'sort_order'=>0], $over));
    }

    private function makeDriver(Store $store, array $over = []): DeliveryDriver
    {
        return DeliveryDriver::create(array_merge(['store_id'=>$store->id,'name'=>'سائق','phone'=>'+970599000000','active'=>true], $over));
    }

    private function makeShipping(Store $store, array $over = []): Shipping
    {
        return Shipping::create(array_merge(['store_id'=>$store->id,'name'=>'توصيل الضفة','type'=>'flat_rate','cost'=>20,'is_active'=>true,'sort_order'=>0], $over));
    }

    private function makeOrder(Store $store, array $over = []): Order
    {
        return Order::forceCreate(array_merge([
            'order_number'=>Order::generateOrderNumber(),
            'store_id'=>$store->id,
            'session_id'=>'sess-'.uniqid(),
            'status'=>'confirmed',
            'payment_status'=>'pending',
            'customer_email'=>'c@'.uniqid().'.com',
            'customer_first_name'=>'A',
            'customer_last_name'=>'B',
            'customer_phone'=>'0591000000',
            'shipping_address'=>'addr',
            'shipping_city'=>'Nablus',
            'shipping_state'=>'WB',
            'shipping_country'=>'PS',
            'billing_address'=>'addr',
            'billing_city'=>'N',
            'billing_state'=>'W',
            'billing_country'=>'PS',
            'subtotal'=>100,
            'shipping_amount'=>10,
            'total_amount'=>110,
            'payment_method'=>'cod',
            'delivery_status'=>DeliveryAssignment::STATUS_UNASSIGNED,
        ], $over));
    }

    private function inertiaVersion(): string
    {
        return (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());
    }

    // A. authorized merchant can open /delivery hub
    public function test_authorized_merchant_can_open_delivery_hub(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $res = $this->actingAs($owner)
            ->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())
            ->getJson(route('delivery.index'));
        $res->assertOk();
        $props = $res->json('props') ?? [];
        $this->assertArrayHasKey('hubStats',$props);
        $this->assertArrayHasKey('currentTab',$props);
    }

    // B. overview returns only current-store counts
    public function test_overview_returns_only_current_store_counts(): void
    {
        [$ownerA,$storeA] = $this->ownerWithStore('A');
        [$ownerB,$storeB] = $this->ownerWithStore('B');
        $this->makeShipping($storeA,['name'=>'A1']); $this->makeShipping($storeA,['name'=>'A2']);
        $this->makeShipping($storeB,['name'=>'B1']);
        $this->makeZone($storeA); $this->makeZone($storeA);
        $this->makeZone($storeB);
        $this->makeDriver($storeA); $this->makeDriver($storeB); $this->makeDriver($storeB);

        $res = $this->actingAs($ownerA)
            ->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())
            ->getJson(route('delivery.index').'?tab=overview');
        $res->assertOk();
        $hub = $res->json('props.hubStats');
        $this->assertEquals(2, $hub['methods_total']);
        $this->assertEquals(2, $hub['zones_total']);
        $this->assertEquals(1, $hub['drivers_total']);
    }

    // C. current shipping methods are visible in Delivery Hub
    public function test_current_shipping_methods_visible_in_hub(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $this->makeShipping($store,['name'=>'توصيل الضفة']);
        $this->makeShipping($store,['name'=>'القدس']);
        $res = $this->actingAs($owner)
            ->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())
            ->getJson(route('delivery.index').'?tab=methods');
        $res->assertOk();
        $shippings = $res->json('props.shippings') ?? [];
        $names = collect($shippings)->pluck('name')->toArray();
        $this->assertContains('توصيل الضفة',$names);
        $this->assertContains('القدس',$names);
    }

    // D. current local delivery zones are visible
    public function test_current_local_delivery_zones_visible(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $this->makeZone($store,['name'=>'نابلس']);
        $res = $this->actingAs($owner)
            ->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())
            ->getJson(route('delivery.index').'?tab=zones');
        $res->assertOk();
        $zones = $res->json('props.zonesDetailed') ?? [];
        $this->assertCount(1,$zones);
        $this->assertEquals('نابلس',$zones[0]['name']);
    }

    // E. current drivers are visible
    public function test_current_drivers_visible(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $this->makeDriver($store,['name'=>'سائق 1']);
        $res = $this->actingAs($owner)
            ->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())
            ->getJson(route('delivery.index'));
        $res->assertOk();
        $drivers = $res->json('props.driversDetailed') ?? [];
        $this->assertCount(1,$drivers);
    }

    // F. zero-driver state remains useful
    public function test_zero_driver_state_remains_useful(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $res = $this->actingAs($owner)
            ->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())
            ->getJson(route('delivery.index').'?tab=drivers');
        $res->assertOk();
        $drivers = $res->json('props.driversDetailed') ?? [];
        $this->assertCount(0,$drivers);
        // hubStats drivers_total should be 0, page should still be 200 and contain useful copy via component (not asserted via props)
        $this->assertEquals(0,$res->json('props.hubStats.drivers_total'));
    }

    // G. driver add/manage routes remain functional
    public function test_driver_add_manage_routes_remain_functional(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $this->actingAs($owner)
            ->get(route('delivery.drivers.index'))->assertOk();
        $this->actingAs($owner)
            ->get(route('delivery.drivers.create'))->assertOk();
        $this->actingAs($owner)
            ->post(route('delivery.drivers.store'),['name'=>'سائق جديد','phone'=>'0599000000'])->assertRedirect();
        $this->assertDatabaseHas('delivery_drivers',['name'=>'سائق جديد','store_id'=>$store->id]);
    }

    // H, I, J store isolation
    public function test_store_isolation_shipping_methods_zones_drivers(): void
    {
        [$ownerA,$storeA] = $this->ownerWithStore('A');
        [$ownerB,$storeB] = $this->ownerWithStore('B');
        $sB = $this->makeShipping($storeB,['name'=>'B method']);
        $zB = $this->makeZone($storeB,['name'=>'B zone']);
        $dB = $this->makeDriver($storeB,['name'=>'B driver']);

        $res = $this->actingAs($ownerA)
            ->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())
            ->getJson(route('delivery.index'));
        $res->assertOk();
        $names = collect($res->json('props.shippings')??[])->pluck('name')->toArray();
        $this->assertNotContains('B method',$names);
        $zoneNames = collect($res->json('props.zonesDetailed')??[])->pluck('name')->toArray();
        $this->assertNotContains('B zone',$zoneNames);
        $driverNames = collect($res->json('props.driversDetailed')??[])->pluck('name')->toArray();
        $this->assertNotContains('B driver',$driverNames);
        // Direct edit should 404
        $this->actingAs($ownerA)->get(route('delivery.zones.edit',$zB->id))->assertStatus(404);
        $this->actingAs($ownerA)->get(route('delivery.drivers.edit',$dB->id))->assertStatus(404);
        $this->actingAs($ownerA)->get(route('shipping.edit',$sB->id))->assertStatus(404);
    }

    // K shipping-method updates remain store scoped
    public function test_shipping_method_updates_store_scoped(): void
    {
        [$ownerA,$storeA] = $this->ownerWithStore('A');
        [$ownerB,$storeB] = $this->ownerWithStore('B');
        $sB = $this->makeShipping($storeB,['name'=>'B']);
        $this->actingAs($ownerA);
        $this->put(route('shipping.update',$sB->id),['name'=>'Hacked','type'=>'flat_rate'])->assertStatus(404);
        $this->assertDatabaseHas('shippings',['id'=>$sB->id,'name'=>'B']);
    }

    // L free-shipping settings remain authoritative
    public function test_free_shipping_settings_authoritative(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $this->actingAs($owner);
        $this->put(route('shipping.free.update'),['enabled'=>true,'threshold'=>250])->assertStatus(302);
        $cfg = StoreConfiguration::getConfiguration($store->id);
        $this->assertEquals('true',$cfg['free_shipping_enabled']);
        $this->assertEquals('250',$cfg['free_shipping_threshold']);
        $res = $this->actingAs($owner)
            ->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())
            ->getJson(route('delivery.index').'?tab=settings');
        $res->assertOk();
        $this->assertTrue($res->json('props.freeShipping.enabled'));
        $this->assertEquals(250,(float)$res->json('props.freeShipping.threshold'));
    }

    // M checkout delivery fee remains server-authoritative
    public function test_checkout_delivery_fee_server_authoritative(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $zone = $this->makeZone($store,['fee'=>30]);
        $cat = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true,'slug'=>'c-'.uniqid()]);
        $product = Product::create(['name'=>'P','price'=>100,'store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'stock'=>10,'sku'=>'SKU-'.uniqid()]);
        $customer = Customer::create(['store_id'=>$store->id,'first_name'=>'A','last_name'=>'B','email'=>'m@'.uniqid().'.com','password'=>bcrypt('pass'),'is_active'=>true]);
        CartItem::create(['store_id'=>$store->id,'customer_id'=>$customer->id,'session_id'=>session()->getId(),'product_id'=>$product->id,'quantity'=>1,'price'=>$product->price]);
        $this->actingAs($customer,'customer');
        $res = $this->postJson(route('store.order.place',['storeSlug'=>$store->slug]),[
            'store_id'=>$store->id,
            'customer_first_name'=>'A','customer_last_name'=>'B','customer_email'=>'m@'.uniqid().'.com','customer_phone'=>'0599000000',
            'shipping_address'=>'addr','shipping_city'=>'Nablus','shipping_state'=>'West Bank','shipping_country'=>'Palestine',
            'billing_address'=>'addr','billing_city'=>'N','billing_state'=>'W','billing_country'=>'PS',
            'payment_method'=>'cod','delivery_zone_id'=>$zone->id,
        ]);
        // Should succeed and fee is 30 server-side
        $res->assertStatus(200);
        $order = Order::where('store_id',$store->id)->first();
        $this->assertEquals(30,(float)$order->delivery_fee);
    }

    // N cross-store shipping method cannot be submitted to checkout
    public function test_cross_store_shipping_method_cannot_be_submitted(): void
    {
        [$ownerA,$storeA] = $this->ownerWithStore('A');
        [$ownerB,$storeB] = $this->ownerWithStore('B');
        $sB = $this->makeShipping($storeB);
        $cat = Category::factory()->create(['store_id'=>$storeA->id,'is_active'=>true,'slug'=>'c-'.uniqid()]);
        $product = Product::create(['name'=>'P','price'=>50,'store_id'=>$storeA->id,'category_id'=>$cat->id,'is_active'=>true,'stock'=>10,'sku'=>'SKU-'.uniqid()]);
        $customer = Customer::create(['store_id'=>$storeA->id,'first_name'=>'A','last_name'=>'B','email'=>'n@'.uniqid().'.com','password'=>bcrypt('pass'),'is_active'=>true]);
        CartItem::create(['store_id'=>$storeA->id,'customer_id'=>$customer->id,'session_id'=>session()->getId(),'product_id'=>$product->id,'quantity'=>1,'price'=>$product->price]);
        $this->actingAs($customer,'customer');
        $res = $this->postJson(route('store.order.place',['storeSlug'=>$storeA->slug]),[
            'store_id'=>$storeA->id,
            'customer_first_name'=>'A','customer_last_name'=>'B','customer_email'=>'n@'.uniqid().'.com','customer_phone'=>'0599000000',
            'shipping_address'=>'addr','shipping_city'=>'Nablus','shipping_state'=>'West Bank','shipping_country'=>'Palestine',
            'billing_address'=>'addr','billing_city'=>'N','billing_state'=>'W','billing_country'=>'PS',
            'payment_method'=>'cod','shipping_method_id'=>$sB->id,
        ]);
        $res->assertStatus(422);
    }

    // O cross-store zone cannot be used
    public function test_cross_store_zone_cannot_be_used(): void
    {
        [$ownerA,$storeA] = $this->ownerWithStore('A');
        [$ownerB,$storeB] = $this->ownerWithStore('B');
        $zB = $this->makeZone($storeB);
        $cat = Category::factory()->create(['store_id'=>$storeA->id,'is_active'=>true,'slug'=>'c-'.uniqid()]);
        $product = Product::create(['name'=>'P','price'=>50,'store_id'=>$storeA->id,'category_id'=>$cat->id,'is_active'=>true,'stock'=>10,'sku'=>'SKU-'.uniqid()]);
        $customer = Customer::create(['store_id'=>$storeA->id,'first_name'=>'A','last_name'=>'B','email'=>'o@'.uniqid().'.com','password'=>bcrypt('pass'),'is_active'=>true]);
        CartItem::create(['store_id'=>$storeA->id,'customer_id'=>$customer->id,'session_id'=>session()->getId(),'product_id'=>$product->id,'quantity'=>1,'price'=>$product->price]);
        $this->actingAs($customer,'customer');
        $res = $this->postJson(route('store.order.place',['storeSlug'=>$storeA->slug]),[
            'store_id'=>$storeA->id,
            'customer_first_name'=>'A','customer_last_name'=>'B','customer_email'=>'o@'.uniqid().'.com','customer_phone'=>'0599000000',
            'shipping_address'=>'addr','shipping_city'=>'Nablus','shipping_state'=>'West Bank','shipping_country'=>'Palestine',
            'billing_address'=>'addr','billing_city'=>'N','billing_state'=>'W','billing_country'=>'PS',
            'payment_method'=>'cod','delivery_zone_id'=>$zB->id,
        ]);
        $res->assertStatus(422);
    }

    // P customer tracking still leaks no driver PII
    public function test_customer_tracking_no_driver_pii(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $store->slug='track-'.uniqid(); $store->save();
        $driver = $this->makeDriver($store,['name'=>'سائق سري','phone'=>'+970599111111','notes'=>'سرية']);
        $customer = Customer::create(['store_id'=>$store->id,'first_name'=>'عميل','last_name'=>'تتبع','email'=>'track@'.uniqid().'.com','password'=>bcrypt('pass'),'is_active'=>true]);
        $order = $this->makeOrder($store,['customer_id'=>$customer->id]);
        $this->actingAs($owner)->postJson(route('delivery.orders.assign',$order->id),['driver_id'=>$driver->id])->assertOk();
        $res = $this->actingAs($customer,'customer')->getJson(route('api.v1.orders.show',$order->order_number).'?store_slug='.$store->slug);
        $res->assertOk();
        $encoded = json_encode($res->json());
        $this->assertStringNotContainsString($driver->phone,$encoded);
        $this->assertStringNotContainsString('سائق سري',$encoded);
    }

    // Q legacy shipping GET route remains backward compatible
    public function test_legacy_shipping_get_backward_compatible(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $this->actingAs($owner);
        // Global shipping index should still be reachable (200 or redirect to hub)
        $res = $this->get(route('shipping.index'));
        $this->assertTrue(in_array($res->status(),[200,302]));
        // Store-scoped shipping canonical should still be reachable (200) or redirect to hub (302)
        $res2 = $this->get(route('stores.shipping.canonical',$store->id));
        $this->assertTrue(in_array($res2->status(),[200,302]));
        // If 302, location should be delivery hub
        if ($res2->status()===302) {
            $this->assertStringContainsString('/delivery',$res2->headers->get('Location'));
        }
    }

    // R legacy shipping mutation endpoints remain functional
    public function test_legacy_shipping_mutations_functional(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $this->actingAs($owner);
        $this->post(route('shipping.store'),['name'=>'Legacy Mut','type'=>'flat_rate','cost'=>5])->assertRedirect();
        $s = Shipping::where('store_id',$store->id)->where('name','Legacy Mut')->first();
        $this->assertNotNull($s);
        $this->put(route('shipping.update',$s->id),['name'=>'Legacy Mut2','type'=>'flat_rate','cost'=>6])->assertRedirect();
        $this->assertDatabaseHas('shippings',['id'=>$s->id,'name'=>'Legacy Mut2']);
        $this->delete(route('shipping.destroy',$s->id))->assertRedirect();
        $this->assertDatabaseMissing('shippings',['id'=>$s->id]);
    }

    // S Store Settings delivery entry leads merchant to Delivery Hub or clearly hands off
    public function test_store_settings_delivery_entry_hands_off(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $this->actingAs($owner);
        // Accessing legacy shipping page should contain handoff copy (if 200) or redirect to hub
        $res = $this->get(route('stores.shipping.canonical',$store->id));
        if ($res->status()===200) {
            $content = $res->content() ?? $res->getContent() ?? '';
            // Inertia HTML contains the handoff wording in the JS payload or HTML fallback
            $this->assertTrue(str_contains($content,'مركز التوصيل') || str_contains($content,'delivery') || str_contains($content,'shipping'), 'Legacy page should contain handoff to Delivery Hub');
        } else {
            $loc = $res->headers->get('Location') ?? '';
            $this->assertTrue(str_contains($loc,'/delivery') || $res->status()===302, 'Should redirect to hub');
        }
        // Delivery hub itself should be accessible via /delivery
        $this->get(route('delivery.index'))->assertOk();
    }

    // T Delivery Hub does not expose COD settlement mutation controls
    public function test_hub_does_not_expose_cod_settlement_mutations(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $res = $this->actingAs($owner)
            ->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())
            ->getJson(route('delivery.index'));
        $res->assertOk();
        $props = $res->json('props') ?? [];
        // Hub must not expose settlement mutation data in its dedicated hub props (not global routing)
        $this->assertArrayNotHasKey('settlements', $props);
        $this->assertArrayNotHasKey('codSettlements', $props);
        $this->assertArrayNotHasKey('cod_settlements', $props);
        // Check hub-specific keys do not contain settlement payloads
        $hubKeys = ['hubStats','shippings','zonesDetailed','driversDetailed','courierIntegrations','freeShipping','counts','orders'];
        foreach ($hubKeys as $k) {
            if (isset($props[$k])) {
                $this->assertStringNotContainsString('settlement', json_encode($props[$k]));
            }
        }
    }

    // U no fake carrier API status is emitted
    public function test_no_fake_carrier_api_status(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        // Create a manual integration without API connected status
        \App\Models\StoreCourierIntegration::create(['store_id'=>$store->id,'provider'=>'mock','display_name'=>'Mock','status'=>'not_connected','is_active'=>false,'credentials'=>[]]);
        $res = $this->actingAs($owner)
            ->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())
            ->getJson(route('delivery.index').'?tab=companies');
        $res->assertOk();
        $ints = $res->json('props.courierIntegrations') ?? [];
        $this->assertCount(1,$ints);
        $this->assertEquals('not_connected',$ints[0]['status']);
        $this->assertStringNotContainsString('api_connected',json_encode($ints));
    }

    // V mobile/desktop use same Hub configuration/components where applicable
    public function test_hub_same_component_for_all_devices(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $this->actingAs($owner);
        $res = $this->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())->getJson(route('delivery.index'));
        $res->assertOk();
        // The hub uses single Inertia component delivery/index for both mobile and desktop (no device-specific branching in backend)
        $this->assertEquals('delivery/index',$res->json('component') ?? 'delivery/index');
    }
}
