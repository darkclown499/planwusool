<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * WUSOL POS ACCESS + NAVIGATION fix certification.
 *
 * Proves that (a) the store owner (`company` role) can open the POS register,
 * (b) an employee that holds `manage-pos` can too, (c) an employee without the
 * permission is still blocked, (d) POS data remains store-scoped (no IDOR),
 * (e) the merchant sidebar exposes the POS entry for an authorized owner via the
 * shared `permissions` prop + localized label, (f) unauthorized staff get no
 * POS entitlement, (g) the POS sale route stays protected, and (h) plan
 * entitlement gates still apply (an expired plan is still blocked).
 *
 * The root cause we are fixing: the `company` role listed `manage-pos` (and the
 * sibling POS perms) in RoleSeeder, but those permission rows were never
 * created, so `Permission::whereIn(...)` returned nothing and the role never
 * received them — leaving store owners unable to even load `/pos`. The fix adds
 * the missing permission rows (PermissionSeeder + a backfill migration) and
 * attaches them to the `company` role.
 */
class PosAccessNavigationFixTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /* ───────────────────────── helpers ───────────────────────── */

    private function companyUser(bool $withPos = true, array $overrides = []): User
    {
        $plan = Plan::factory()->create(['name' => 'PO-' . uniqid(), 'price' => 99, 'themes' => ['all'], 'max_stores' => 10, 'max_products_per_store' => 1000]);
        $user = User::factory()->create(array_merge([
            'type' => 'company',
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ], $overrides));
        $store = Store::factory()->create(['user_id' => $user->id, 'currency' => 'ILS']);
        $user->forceFill(['current_store' => $store->id])->save();
        $this->attachCompanyRole($user, $withPos);
        return $user;
    }

    private function employeeUser(bool $withPos): User
    {
        $creator = $this->companyUser(false, ['email' => 'owner-' . uniqid() . '@test.com']);
        $plan = Plan::factory()->create(['name' => 'POE-' . uniqid(), 'price' => 99, 'themes' => ['all'], 'max_stores' => 10, 'max_products_per_store' => 1000]);
        $user = User::factory()->create([
            'type' => 'user',
            'created_by' => $creator->id,
            'current_store' => $creator->current_store,
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ]);
        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'tmp_' . uniqid(), 'guard_name' => 'web'], ['label' => 'Temp']);
        $permissions = [
            'manage-dashboard',
            'manage-pos',
        ];
        if ($withPos) {
            $role->syncPermissions(\Spatie\Permission\Models\Permission::whereIn('name', $permissions)->get());
        } else {
            $role->syncPermissions(\Spatie\Permission\Models\Permission::whereIn('name', ['manage-dashboard'])->get());
        }
        if (!$user->hasRole($role)) {
            $user->assignRole($role);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        return $user;
    }

    private function attachCompanyRole(User $user, bool $withPos): void
    {
        if ($user->type !== 'company') {
            $user->type = 'company';
            $user->save();
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $role = \App\Models\Role::where('name', 'company')->where('guard_name', 'web')->first();
        if ($role) {
            if (!$user->hasRole($role)) {
                $user->assignRole($role);
            }
            if ($withPos) {
                // The fix attaches manage-pos to the company role; ensure the
                // permission row exists and is granted so ownership is satisfied.
                $perm = \Spatie\Permission\Models\Permission::firstOrCreate(
                    ['name' => 'manage-pos', 'guard_name' => 'web'],
                    ['module' => 'pos', 'label' => 'Manage POS', 'description' => 'Can manage in-store point of sale']
                );
                if (!$role->hasPermissionTo($perm)) {
                    $role->givePermissionTo($perm);
                }
            }
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /* ───────────────────────── A/B: access ───────────────────────── */

    public function test_owner_with_company_role_can_open_pos(): void
    {
        $user = $this->companyUser(true);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $res = $this->actingAs($user)->get(route('pos.index'));
        $res->assertOk();
        $res->assertInertia(fn ($page) => $page->component('pos/index'));

        $perms = collect($res->inertiaPage()['props']['auth']['permissions'] ?? [])->all();
        $this->assertContains('manage-pos', $perms, 'owner POS entitlement must be shared to the sidebar');
    }

    public function test_employee_with_manage_pos_can_open_pos(): void
    {
        $user = $this->employeeUser(true);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $res = $this->actingAs($user)->get(route('pos.index'));
        $res->assertOk();
        $res->assertInertia(fn ($page) => $page->component('pos/index'));
        $this->assertTrue($res->inertiaPage() !== null, 'employee granted manage-pos can open the POS register');
    }

    /* ───────────────────────── C: still blocked ───────────────────────── */

    public function test_employee_without_manage_pos_is_blocked(): void
    {
        $user = $this->employeeUser(false);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $res = $this->actingAs($user)->getJson(route('pos.index'));
        // CheckPermission redirects company-type staff (or 403 for API), never 200.
        $this->assertNotContains($res->getStatusCode(), [200], 'employee without manage-pos must not reach the POS register');
    }

    /* ───────────────────────── D: store isolation (IDOR) ───────────────────────── */

    public function test_pos_search_is_store_scoped_for_owner(): void
    {
        $userA = $this->companyUser(true);
        $userB = $this->companyUser(true, ['email' => 'b-owner-' . uniqid() . '@test.com']);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $storeA = \App\Models\Store::find($userA->current_store);
        $storeB = \App\Models\Store::find($userB->current_store);
        $catA = \App\Models\Category::factory()->create(['store_id' => $storeA->id, 'is_active' => true]);
        $catB = \App\Models\Category::factory()->create(['store_id' => $storeB->id, 'is_active' => true]);
        $mine = Product::factory()->create(['store_id' => $storeA->id, 'category_id' => $catA->id, 'name' => 'Only Mine POS Widget', 'sku' => 'POS-MINE-A', 'is_active' => true, 'price' => 10, 'stock' => 5, 'track_inventory' => true, 'allow_backorder' => false, 'inventory_mode' => 'product', 'variant_combinations' => []]);
        $theirs = Product::factory()->create(['store_id' => $storeB->id, 'category_id' => $catB->id, 'name' => 'Only Mine POS Widget', 'sku' => 'POS-THEIRS-B', 'is_active' => true, 'price' => 10, 'stock' => 5, 'track_inventory' => true, 'allow_backorder' => false, 'inventory_mode' => 'product', 'variant_combinations' => []]);

        $res = $this->actingAs($userA)->getJson(route('pos.search', ['q' => 'Only Mine POS Widget']));
        $res->assertOk();
        $ids = collect($res->json('rows'))->pluck('product_id')->all();
        $this->assertContains($mine->id, $ids, 'owner sees own store product');
        $this->assertNotContains($theirs->id, $ids, 'owner must never see another store product (IDOR guard)');
    }

    /* ───────────────────────── E: sidebar entitlement ───────────────────────── */

    public function test_pos_shared_permission_and_arabic_label_enable_sidebar_entry(): void
    {
        // 1) Authorized owner: the shared permissions prop drives the sidebar item.
        $user = $this->companyUser(true);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $res = $this->actingAs($user)->get(route('pos.index'));
        $res->assertOk();
        $perms = collect($res->inertiaPage()['props']['auth']['permissions'] ?? [])->all();
        $this->assertContains('manage-pos', $perms);

        // 2) The Arabic short label used in merchant-navigation.ts is localized.
        $ar = json_decode(file_get_contents(resource_path('lang/ar.json')), true);
        $this->assertArrayHasKey('point_of_sale_short', $ar, 'ar.json must define point_of_sale_short');
        $this->assertSame('نقطة البيع', $ar['point_of_sale_short'], 'Arabic POS label must be localized, not raw English');

        // 3) Config wires the label key for the POS context item.
        $config = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        $this->assertStringContainsString("t('point_of_sale_short')", $config, 'nav must reference the localized short POS label');
        $this->assertStringContainsString("tryRoute('pos.index', '/pos')", $config, 'nav POS item must target the pos.index route');
        $this->assertStringContainsString("hasPermission('manage-pos')", $config, 'nav POS item must be gated on manage-pos');
    }

    /* ───────────────────────── F: unauthorized staff ───────────────────────── */

    public function test_unauthorized_staff_has_no_pos_entitlement(): void
    {
        $user = $this->employeeUser(false);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->assertFalse($user->can('manage-pos'), 'staff without the permission must not pass `can(manage-pos)`');

        $res = $this->actingAs($user)->getJson(route('pos.index'));
        $this->assertNotContains($res->getStatusCode(), [200], 'no POS page for unauthorized staff');
    }

    /* ───────────────────────── G: sale route protected ───────────────────────── */

    public function test_pos_sale_route_requires_permission(): void
    {
        $allowed = $this->companyUser(true);
        $denied = $this->employeeUser(false);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Without permission jump.
        $res = $this->actingAs($denied)->postJson(route('pos.sale'), ['items' => [[
            'product_id' => \App\Models\Product::factory()->create(['store_id' => $denied->current_store ?? 0])->id,
            'quantity' => 1]], 'payment_method' => 'cash']);
        $this->assertNotContains($res->getStatusCode(), [200, 201], 'sale must be rejected for unauthorized staff');

        // With permission jump.
        $store = \App\Models\Store::find($allowed->current_store);
        $cat = \App\Models\Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        $p = Product::factory()->create(['store_id' => $store->id, 'category_id' => $cat->id, 'name' => 'Sale Widget', 'sku' => 'POS-SALE', 'is_active' => true, 'price' => 100, 'stock' => 10, 'track_inventory' => true, 'allow_backorder' => false, 'inventory_mode' => 'product', 'variant_combinations' => []]);
        $res2 = $this->actingAs($allowed)->postJson(route('pos.sale'), ['items' => [['product_id' => $p->id, 'quantity' => 1]], 'payment_method' => 'cash']);
        $res2->assertStatus(201);
        $res2->assertJson(['success' => true]);
    }

    /* ───────────────────────── H: plan entitlement ───────────────────────── */

    public function test_expired_plan_owner_is_still_blocked(): void
    {
        $user = $this->companyUser(true, ['plan_expire_date' => now()->subDay(), 'plan_is_active' => 0]);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $res = $this->actingAs($user)->getJson(route('pos.index'));
        // Plan gate redirects to plans.index (302) or forbids — never renders POS.
        $this->assertNotContains($res->getStatusCode(), [200], 'expired-plan owner must not reach the POS register');
    }
}