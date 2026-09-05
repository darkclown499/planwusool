<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * P2A-02 — canonical merchant Delivery destination (/delivery).
 *
 * The merchant-facing operational destination for "التوصيل" is the Delivery Hub
 * (delivery.index → /delivery). Legacy /shipping routes and the settings-surface
 * entry into the same underlying feature remain reachable for backward
 * compatibility, but the general dashboard/setup CTAs must resolve to the Hub
 * while specific method create/edit actions keep their real settings routes.
 */
class DeliveryDestinationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed([PermissionSeeder::class, RoleSeeder::class]);
    }

    private function ownerWithStore(string $name = 'Dest Store', string $shippingFlag = 'on'): array
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

    private function inertiaVersion(): string
    {
        return (string) app(\App\Http\Middleware\HandleInertiaRequests::class)->version(request());
    }

    private function getDashboardOnboarding(User $owner): array
    {
        $res = $this->actingAs($owner)->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())
            ->getJson(route('dashboard'));
        $res->assertOk();
        $onboarding = $res->json('props.onboarding');
        $this->assertNotNull($onboarding);
        return $onboarding;
    }

    // 1. Merchant navigation "التوصيل" resolves to canonical Delivery Hub
    public function test_sidebar_navigation_resolves_to_delivery_hub(): void
    {
        $primary = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        // Level-1 area label is canonical التوصيل
        $this->assertStringContainsString("id: 'delivery', labelKey: 'Delivery', labelAr: 'التوصيل'", $primary, 'sidebar delivery area must be labelled التوصيل');
        $this->assertStringContainsString("Delivery: 'التوصيل'", $primary, 'MERCHANT_AR_LABELS Delivery');
        // Contextual Level-2 hub items resolve via delivery.* named routes
        $this->assertStringContainsString("tryRoute('delivery.index', '/delivery')", $primary, 'context nav hub uses delivery.index');
        $this->assertStringContainsString("tryRoute('delivery.zones.index', '/delivery/zones')", $primary);

        // MerchantPrimaryNav resolves the delivery area to the canonical hub
        $nav = file_get_contents(resource_path('js/components/merchant/MerchantPrimaryNav.tsx'));
        $this->assertStringContainsString("try { return route('delivery.index'); } catch { return '/delivery'; }", $nav, 'primary nav delivery href must resolve to delivery hub');

        // The canonical route itself resolves to /delivery and is reachable
        [$owner] = $this->ownerWithStore();
        $this->assertSame('/delivery', route('delivery.index', [], false));
        $this->actingAs($owner)->withHeader('X-Inertia','true')->withHeader('X-Inertia-Version',$this->inertiaVersion())
            ->getJson(route('delivery.index'))->assertOk();
    }

    // 2. Dashboard shipping checklist step resolves to the Delivery Hub when not configured
    public function test_dashboard_shipping_checklist_step_points_to_delivery_hub(): void
    {
        [$owner] = $this->ownerWithStore();
        $onboarding = $this->getDashboardOnboarding($owner);
        $shippingStep = collect($onboarding['steps'])->firstWhere('key', 'shipping');
        $this->assertNotNull($shippingStep);
        $this->assertFalse($shippingStep['done']);
        $this->assertSame('/delivery', route('delivery.index', [], false));
        $this->assertStringEndsWith('/delivery', $shippingStep['href'], 'general delivery setup CTA must resolve to Delivery Hub (not legacy settings tab)');
        $this->assertStringNotContainsString('settings?tab=shipping', $shippingStep['href'], 'must not point to legacy settings page');
    }

    // 3. Dashboard publish-warning 'إعداد الشحن' CTA routes to /delivery
    public function test_dashboard_publish_warning_cta_routes_to_delivery_hub(): void
    {
        $source = file_get_contents(resource_path('js/pages/dashboard.tsx'));
        $this->assertStringContainsString("onboarding.missingForPublish.includes('الشحن والتوصيل') && (", $source, 'dashboard must surface shipping in missing-for-publish');
        $this->assertStringContainsString("router.visit(route('delivery.index'))", $source, 'publish-warning إعداد الشحن CTA must visit the Delivery Hub');
        $this->assertStringNotContainsString("settings?tab=shipping", $source, 'no legacy settings-tab CTA for general delivery setup');
    }

    // 4. Specific method create/edit actions keep their real settings routes
    public function test_specific_method_actions_keep_their_settings_routes(): void
    {
        $hub = file_get_contents(resource_path('js/pages/delivery/index.tsx'));
        $this->assertStringContainsString("route('shipping.create')", $hub, 'create method action stays on shipping.create');
        $this->assertStringContainsString("route('shipping.edit', s.id)", $hub, 'edit method action stays on shipping.edit');
        $this->assertStringContainsString("route('delivery.zones.create')", $hub, 'create zone stays on delivery.zones.create');
        $this->assertStringContainsString("route('delivery.drivers.create')", $hub, 'create driver stays on delivery.drivers.create');

        // Route names still resolve and stay distinct from the hub
        $this->assertSame('/shipping/create', route('shipping.create', [], false));
        $this->assertSame('/delivery', route('delivery.index', [], false));
    }

    // 5. Legacy shipping routes remain reachable (200/302 handoff or settings render)
    public function test_legacy_shipping_routes_remain_reachable(): void
    {
        [$owner,$store] = $this->ownerWithStore();
        $this->actingAs($owner);

        $global = $this->get(route('shipping.index'));
        $this->assertTrue(in_array($global->status(), [200, 302]), 'shipping.index must not 404');

        $scoped = $this->get(route('stores.shipping.canonical', $store->id));
        $this->assertTrue(in_array($scoped->status(), [200, 302]), 'stores.shipping.canonical must not 404');
        if ($scoped->status() === 302) {
            $this->assertStringContainsString('/delivery', $scoped->headers->get('Location'), 'settings entry that redirects must land on Delivery Hub');
        }

        $alias = $this->get(route('store.shipping'));
        $this->assertTrue(in_array($alias->status(), [200, 302]), 'store.shipping alias must not 404');
    }

    // 6. No route was removed for this ticket: delivery + shipping named routes all resolve
    public function test_no_routes_removed_delivery_and_shipping_contract_intact(): void
    {
        foreach ([
            'delivery.index','delivery.zones.index','delivery.zones.create','delivery.zones.store',
            'delivery.drivers.index','delivery.drivers.create','delivery.drivers.store',
            'shipping.index','shipping.create','shipping.store','shipping.edit','shipping.destroy','shipping.show','shipping.free.update',
            'stores.shipping.canonical','stores.shipping.integrations','store.shipping',
        ] as $name) {
            $this->assertTrue(\Illuminate\Support\Facades\Route::has($name), "route $name must still be registered");
        }
    }

    // 7. Delivery mutations still enforce entitlement at the server boundary
    // (anchors the existing ShippingEntitlementEnforcementTest contract; the moving
    // of an internal link to /delivery must not weaken write gating).
    public function test_delivery_mutations_still_enforce_entitlement(): void
    {
        [$starter,$starterStore] = $this->ownerWithStore('Starter Dest', 'off');
        $res = $this->from(route('delivery.index'))->actingAs($starter)->post(route('shipping.store'), ['name'=>'بدون ترخيص','type'=>'flat_rate','cost'=>5]);
        $res->assertRedirect();
        $this->assertDatabaseMissing('shippings', ['name'=>'بدون ترخيص','store_id'=>$starterStore->id]);

        $zres = $this->from(route('delivery.index'))->actingAs($starter)->post(route('delivery.zones.store'), ['name'=>'منطقة محظورة','fee'=>5]);
        $zres->assertRedirect();
        $this->assertDatabaseMissing('delivery_zones', ['name'=>'منطقة محظورة','store_id'=>$starterStore->id]);

        // Growth merchant keeps full access after the CTA change to /delivery
        [$growth,$growthStore] = $this->ownerWithStore('Growth Dest', 'on');
        $this->actingAs($growth)->post(route('shipping.store'), ['name'=>'مسموح','type'=>'flat_rate','cost'=>10])->assertRedirect();
        $this->assertDatabaseHas('shippings', ['name'=>'مسموح','store_id'=>$growthStore->id]);
    }
}
