<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\PosTerminal;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * WUSOL POS TERMINAL MANAGEMENT — Inertia page resolution regression.
 *
 * The live bug: the merchant management page at GET /pos/terminals rendered the
 * Inertia component `pos/terminals`, but the actual page lives at
 * resources/js/pages/pos/terminals/index.tsx. Because the resolver in app.tsx
 * maps the component name to `./pages/{name}.tsx`, Inertia failed to resolve
 * the page (`Page not found: ./pages/pos/terminals.tsx`) and the merchant
 * arrived at a blank screen.
 *
 * This test pins the fix to a component that exactly matches an EXISTING page
 * file, proves the authorized merchant gets a valid Inertia response, proves an
 * unauthorized merchant is blocked (403), and that the management index stays
 * store-scoped (no cross-store terminal leakage / IDOR).
 */
class PosTerminalsInertiaPageRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function companyUser(array $overrides = []): User
    {
        $plan = Plan::factory()->create(['name' => 'PTI-' . uniqid(), 'price' => 99, 'themes' => ['all'], 'max_stores' => 10, 'max_products_per_store' => 1000]);
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
        $role = \App\Models\Role::where('name', 'company')->where('guard_name', 'web')->first();
        if ($role && !$user->hasRole($role)) {
            $user->assignRole($role);
        }
        $perm = \Spatie\Permission\Models\Permission::firstOrCreate(
            ['name' => 'manage-pos', 'guard_name' => 'web'],
            ['module' => 'pos', 'label' => 'Manage POS', 'description' => 'Can manage in-store point of sale']
        );
        if ($role && !$role->hasPermissionTo($perm)) {
            $role->givePermissionTo($perm);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        return $user;
    }

    private function merchantWithoutPos(array $overrides = []): User
    {
        $plan = Plan::factory()->create(['name' => 'PTI-NO-' . uniqid(), 'price' => 10, 'themes' => ['all'], 'max_stores' => 5, 'max_products_per_store' => 100]);
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
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        return $user;
    }

    private function createTerminal(User $owner, string $username, string $pin = '1234'): PosTerminal
    {
        $this->actingAs($owner)->post(route('pos.terminals.store'), [
            'name' => 'Front Cashier',
            'username' => $username,
            'pin' => $pin,
        ]);
        return PosTerminal::where('store_id', $owner->current_store)->where('username', $username)->firstOrFail();
    }

    public function test_authorized_merchant_gets_valid_inertia_response_with_existing_component(): void
    {
        $owner = $this->companyUser();
        $terminal = $this->createTerminal($owner, 'reg-front', '4321');

        $res = $this->actingAs($owner)->get(route('pos.terminals.index'));
        $res->assertOk();
        $res->assertInertia(fn ($page) => $page->component('pos/terminals/index'));

        $page = $res->inertiaPage();
        $this->assertSame('pos/terminals/index', $page['component'], 'component must match the canonical management page');

        // The component (with the trailing index) must resolve to a REAL page file.
        $this->assertFileExists(
            resource_path('js/pages/pos/terminals/index.tsx'),
            'the rendered component must map to an existing page file so Inertia can resolve it'
        );

        // And the old, non-existent path must NOT be what the backend renders.
        $this->assertNotSame(
            'pos/terminals',
            $page['component'],
            'the buggy non-existent component name must not be rendered'
        );

        // The store's own terminal is included.
        $ids = collect($page['props']['terminals'] ?? [])->pluck('id')->all();
        $this->assertContains($terminal->id, $ids, 'the owner sees their own terminal');
    }

    public function test_unauthorized_merchant_without_manage_pos_is_blocked(): void
    {
        // A JSON/API request is rejected with an explicit 403 by the
        // CheckPermission middleware — the canonical proof that the gate holds.
        $chief = $this->merchantWithoutPos();
        $this->assertSame(403, $this->actingAs($chief)->getJson(route('pos.terminals.index'))->getStatusCode(), 'no management page without manage-pos (403)');

        // On the standard web stack the middleware redirects (302) to a safe
        // landing page instead of leaking any terminal data.
        $res = $this->actingAs($chief)->get(route('pos.terminals.index'));
        $this->assertNotSame(200, $res->getStatusCode(), 'merchant without manage-pos must never get the management page');

        // Authorized control stays intact.
        $owner = $this->companyUser(['email' => 'ctl-' . uniqid() . '@test.com']);
        $this->assertEquals(200, $this->actingAs($owner)->get(route('pos.terminals.index'))->getStatusCode(), 'authorized owner still reaches the management page');
    }

    public function test_management_index_is_store_scoped_no_cross_store_leak(): void
    {
        $ownerA = $this->companyUser(['email' => 'iso-a-' . uniqid() . '@test.com']);
        $ownerB = $this->companyUser(['email' => 'iso-b-' . uniqid() . '@test.com']);
        $termB = $this->createTerminal($ownerB, 'iso-b-term', '2222');

        $res = $this->actingAs($ownerA)->get(route('pos.terminals.index'));
        $res->assertOk();
        $res->assertInertia(fn ($page) => $page
            ->component('pos/terminals/index')
            ->where('store.id', $ownerA->current_store));

        $ids = collect($res->inertiaPage()['props']['terminals'] ?? [])->pluck('id')->all();
        $this->assertNotContains($termB->id, $ids, 'Store A management must never list Store B terminals');
    }
}
