<?php

namespace Tests\Feature;

use App\Models\DeliveryZone;
use App\Models\Plan;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P2C-04 — Merchant Delivery Setup Clarity.
 *
 * The canonical Delivery Hub (/delivery) must make the merchant's delivery
 * setup state obvious from backend facts only:
 *   - entitled / locked (plan)
 *   - any method exists
 *   - any method is active (usable at checkout)
 *   - zones are an optional coverage layer, never a readiness blocker
 *   - one truthful next action CTA
 *
 * Readiness semantics mirror what checkout actually uses: the storefront
 * exposes shipping methods only when is_active = true, so a single active
 * method means delivery is ready. Zones are optional; they never gate
 * readiness by themselves.
 *
 * No shopping/checkout/entitlement logic was changed — this asserts the
 * truthful read-model (deliveryReadiness prop) and the canonical UI copy.
 */
class DeliverySetupClarityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    private function merchantWithStore(string $shippingFlag = 'on', string $name = 'Clarity Store'): array
    {
        $plan = Plan::factory()->create([
            'price' => 0,
            'is_default' => true,
            'max_stores' => 5,
            'max_products_per_store' => 1000,
            'enable_shipping_method' => $shippingFlag,
        ]);
        $user = User::factory()->create(['type' => 'company', 'plan_id' => $plan->id, 'onboarded_at' => now(), 'email_verified_at' => now()]);
        $store = Store::factory()->create(['user_id' => $user->id, 'name' => $name]);
        \Illuminate\Support\Facades\DB::table('users')->where('id', $user->id)->update(['current_store' => $store->id]);
        $user = $user->fresh();
        $user->givePermissionTo(['manage-orders','manage-shipping','create-shipping','edit-shipping','delete-shipping','view-shipping','settings-stores','manage-stores']);
        return [$user, $store];
    }

    private function makeShipping(Store $store, array $over = []): Shipping
    {
        return Shipping::create(array_merge(['store_id'=>$store->id,'name'=>'توصيل','type'=>'flat_rate','cost'=>20,'is_active'=>true,'sort_order'=>0], $over));
    }

    private function makeZone(Store $store, array $over = []): DeliveryZone
    {
        return DeliveryZone::create(array_merge(['store_id'=>$store->id,'name'=>'منطقة','fee'=>10,'is_active'=>true,'sort_order'=>0], $over));
    }

    private function inertiaVersion(): string
    {
        return (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());
    }

    private function hubReadiness(User $owner, string $tab = 'overview'): array
    {
        $res = $this->actingAs($owner)
            ->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())
            ->getJson(route('delivery.index').'?tab='.$tab);
        $res->assertOk();
        $readiness = $res->json('props.deliveryReadiness') ?? [];
        $this->assertNotEmpty($readiness, 'deliveryReadiness prop must always be present on the hub');
        return $readiness;
    }

    private function hubSource(): string
    {
        return file_get_contents(resource_path('js/pages/delivery/index.tsx'));
    }

    private function ar(): array
    {
        return json_decode(file_get_contents(resource_path('lang/ar.json')), true);
    }

    // 1. No method + entitled plan → not-ready with an add-method CTA.
    public function test_entitled_store_with_no_method_is_not_ready_and_offers_add_cta(): void
    {
        [$owner] = $this->merchantWithStore('on', 'NoMethod Store');
        $r = $this->hubReadiness($owner);
        $this->assertTrue($r['entitled']);
        $this->assertFalse($r['has_methods']);
        $this->assertFalse($r['has_active_method']);
        $this->assertSame(0, $r['methods_total']);
        $this->assertNull($r['first_inactive_method_id']);

        $source = $this->hubSource();
        $this->assertStringContainsString('لم تتم إضافة طريقة توصيل بعد', $source, 'not-ready headline for missing method');
        $this->assertStringContainsString('أضف طريقة توصيل وحدد التغطية المناسبة لمتجرك', $source, 'supporting copy for missing method');
        $this->assertStringContainsString("route('shipping.create')", $source, 'add-method CTA must resolve to the specific method creation route');
    }

    // 2. Active valid method → ready state.
    public function test_active_method_means_delivery_is_ready(): void
    {
        [$owner, $store] = $this->merchantWithStore('on', 'Ready Store');
        $this->makeShipping($store, ['name'=>'توصيل سريع', 'is_active'=>true]);
        $r = $this->hubReadiness($owner);
        $this->assertTrue($r['entitled']);
        $this->assertTrue($r['has_methods']);
        $this->assertTrue($r['has_active_method']);
        $this->assertSame(1, $r['active_methods_count']);

        $source = $this->hubSource();
        $this->assertStringContainsString('التوصيل جاهز', $source, 'ready state headline');
    }

    // 3. Inactive method only → NOT falsely ready; activation CTA.
    public function test_inactive_method_is_not_falsely_ready(): void
    {
        [$owner, $store] = $this->merchantWithStore('on', 'Inactive Store');
        $m = $this->makeShipping($store, ['name'=>'موقوف', 'is_active'=>false]);
        $r = $this->hubReadiness($owner);
        $this->assertTrue($r['entitled']);
        $this->assertTrue($r['has_methods']);
        $this->assertFalse($r['has_active_method'], 'inactive method must not flip the ready flag');
        $this->assertSame($m->id, $r['first_inactive_method_id'], 'inactive method id must be surfaced for the activate CTA');

        $source = $this->hubSource();
        $this->assertStringContainsString('طريقة التوصيل غير مفعلة', $source, 'inactive headline');
        $this->assertStringContainsString("route('shipping.edit', readiness.first_inactive_method_id)", $source, 'activate CTA must target the inactive method edit route');
    }

    // 4. Zones are an optional coverage layer and never gate readiness.
    public function test_zones_are_optional_and_do_not_make_delivery_ready(): void
    {
        [$owner, $store] = $this->merchantWithStore('on', 'ZoneOnly Store');
        $this->makeZone($store, ['name'=>'نابلس', 'is_active'=>true]);
        $r = $this->hubReadiness($owner);
        $this->assertTrue($r['entitled']);
        $this->assertTrue($r['zones_optional'], 'zones must remain an optional coverage layer');
        $this->assertSame(1, $r['zones_active_count']);
        // No method exists, so active zones alone must not trigger ready.
        $this->assertFalse($r['has_methods']);
        $this->assertFalse($r['has_active_method'], 'active zones alone must never mean delivery is ready');

        // Zone active + method active → ready, zones still optional.
        [$owner2, $store2] = $this->merchantWithStore('on', 'ZoneAndMethod Store');
        $this->makeZone($store2);
        $this->makeShipping($store2);
        $r2 = $this->hubReadiness($owner2);
        $this->assertTrue($r2['has_active_method']);
        $this->assertTrue($r2['zones_optional']);
        $this->assertTrue($r2['entitled']);
    }

    // 5. Locked plan → truthful locked state.
    public function test_locked_plan_exposes_truthful_locked_state(): void
    {
        [$owner] = $this->merchantWithStore('off', 'Locked Store');
        $r = $this->hubReadiness($owner);
        $this->assertFalse($r['entitled'], 'locked plan must report entitled=false');

        $source = $this->hubSource();
        $this->assertStringContainsString('التوصيل غير متاح في خطتك الحالية', $source, 'locked headline must name the module التوصيل');
        $this->assertStringContainsString('متاح في خطة Growth أو أعلى', $source, 'plan requirement is already available source-wide');
        $this->assertStringContainsString("route('plan-orders.index')", $source, 'locked state must offer the existing upgrade CTA');
    }

    // 6. Locked plan direct create mutation still blocked server-side.
    public function test_locked_plan_direct_create_method_still_blocked(): void
    {
        [$owner, $store] = $this->merchantWithStore('off', 'Locked Create Store');
        $res = $this->from(route('delivery.index'))->actingAs($owner)->post(route('shipping.store'), ['name'=>'بدون ترخيص','type'=>'flat_rate','cost'=>5]);
        $res->assertRedirect();
        $this->assertDatabaseMissing('shippings', ['name'=>'بدون ترخيص','store_id'=>$store->id]);
    }

    // 7. Locked plan direct activate/update still blocked server-side.
    public function test_locked_plan_direct_update_and_activate_still_blocked(): void
    {
        [$owner, $store] = $this->merchantWithStore('off', 'Locked Update Store');
        $m = $this->makeShipping($store, ['name'=>'حالي', 'is_active'=>false]);
        $this->from(route('delivery.index'))->actingAs($owner)
            ->put(route('shipping.update', $m->id), ['name'=>'حالي','type'=>'flat_rate','cost'=>20,'is_active'=>true])
            ->assertRedirect();
        $this->assertDatabaseHas('shippings', ['id'=>$m->id, 'name'=>'حالي', 'is_active'=>false]);
    }

    // 8. Canonical module wording = التوصيل (and the hub labels itself correctly).
    public function test_canonical_module_wording_is_delivery(): void
    {
        $ar = $this->ar();
        $this->assertSame('التوصيل', $ar['Delivery'], 'module term must be التوصيل');
        $source = $this->hubSource();
        $this->assertStringContainsString('مركز التوصيل', $source, 'hub title must name the module التوصيل');
        $this->assertStringContainsString('التوصيل جاهز', $source, 'ready verdict must use canonical module term');
    }

    // 9. Specific method wording = طريقة التوصيل (never طريقة الشحن in the hub).
    public function test_specific_method_wording_is_delivery_method(): void
    {
        $ar = $this->ar();
        $this->assertSame('طريقة التوصيل', $ar['Delivery Method'], 'specific method term must be طريقة التوصيل');
        $this->assertSame('منطقة التوصيل', $ar['Delivery Zone'], 'specific zone term must be منطقة التوصيل');

        $source = $this->hubSource();
        $this->assertStringContainsString('إضافة طريقة توصيل', $source, 'add-method CTA uses طريقة توصيل');
        $this->assertStringContainsString('تفعيل طريقة التوصيل', $source, 'activate-method CTA uses طريقة التوصيل');
        $this->assertStringNotContainsString('طريقة الشحن', $source, 'no legacy shipping-method term in the hub');
        $this->assertStringNotContainsString('طرق الشحن', $source, 'no legacy shipping-methods term in the hub');
        $this->assertStringContainsString('featureName="Delivery Method"', $source, 'locked method feature resolves via canonical key');
    }

    // 10. Setup CTA resolves to /delivery or the specific method route as context requires.
    public function test_setup_ctas_resolve_to_canonical_routes(): void
    {
        $this->assertSame('/delivery', route('delivery.index', [], false), 'general setup lives on the canonical hub');
        $this->assertSame('/shipping/create', route('shipping.create', [], false), 'method creation lives on its specific route');
        $source = $this->hubSource();
        $this->assertStringContainsString("route('shipping.create')", $source);
        $this->assertStringContainsString("route('shipping.edit', readiness.first_inactive_method_id)", $source);
        $this->assertStringContainsString("route('delivery.index')", $source, 'hub navigation stays canonical');
    }

    // 11. Store A cannot see Store B methods or readiness.
    public function test_store_a_cannot_see_store_b_methods_or_readiness(): void
    {
        [$ownerA, $storeA] = $this->merchantWithStore('on', 'Tenant A');
        [$ownerB, $storeB] = $this->merchantWithStore('on', 'Tenant B');
        $this->makeShipping($storeB, ['name'=>'خصوصي B']);
        $this->makeShipping($storeB, ['name'=>'خصوصي B2']);
        $this->makeShipping($storeA, ['name'=>'خصوصي A', 'is_active'=>false]);

        $rA = $this->hubReadiness($ownerA);
        $this->assertFalse($rA['has_active_method'], 'Store B active methods must never flip Store A readiness');
        $this->assertSame(1, $rA['methods_total'], 'Store A must only count its own methods');
        $this->assertSame(0, $rA['active_methods_count']);

        $res = $this->actingAs($ownerA)
            ->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())
            ->getJson(route('delivery.index').'?tab=methods');
        $res->assertOk();
        $names = collect($res->json('props.shippings') ?? [])->pluck('name')->toArray();
        $this->assertNotContains('خصوصي B', $names);
        $this->assertNotContains('خصوصي B2', $names);
        $this->assertContains('خصوصي A', $names);

        $rB = $this->hubReadiness($ownerB);
        $this->assertTrue($rB['has_active_method']);
        $this->assertSame(2, $rB['active_methods_count']);
    }

    // 12. Legacy shipping routes remain intact.
    public function test_legacy_shipping_routes_remain_intact(): void
    {
        // P2C-04 only adds a read-model to the canonical hub; every legacy
        // shipping route, alias, and the /delivery redirect must still exist.
        foreach (['shipping.index','shipping.store','shipping.create','shipping.edit','shipping.update','shipping.destroy','shipping.show','shipping.export','shipping.free.update','store.shipping','stores.shipping.canonical','delivery.index','delivery.zones.create','delivery.drivers.create'] as $name) {
            $this->assertTrue(\Illuminate\Support\Facades\Route::has($name), "route [$name] must remain registered");
        }
        $this->assertSame('/shipping', route('shipping.index', [], false));
        $this->assertSame('/store/shipping', route('store.shipping', [], false));
        $this->assertSame('/stores/'.'1'.'/shipping', route('stores.shipping.canonical', 1, false));
    }
}