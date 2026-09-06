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
 * P2D-04 — merchant POS mobile UX.
 *
 * Locks the POS-specific mobile contract WITHOUT touching POS business logic:
 *   - a mobile representation exists alongside the desktop multi-column one
 *   - product search + add remain available
 *   - cart lines expose the product name with usable quantity/remove controls
 *   - the total remains visible and the complete-sale action stays accessible
 *   - POS permission/entitlement is unchanged (manage-pos still gating /pos)
 *   - no new routes or business-logic changes were introduced
 *
 * Assertions favor semantic markers (data-testid, handlers, routes) over
 * brittle Tailwind-class-only checks.
 */
class MobilePosUxTest extends TestCase
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

    private function posSource(): string
    {
        return file_get_contents(__DIR__.'/../../resources/js/pages/pos/index.tsx');
    }

    private function companyUser(): User
    {
        $plan = Plan::factory()->create(['name' => 'MPOS-'.uniqid(), 'price' => 99, 'themes' => ['all'], 'max_stores' => 10, 'max_products_per_store' => 1000]);
        $user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
        ]);
        $store = Store::factory()->create(['user_id' => $user->id, 'currency' => 'ILS']);
        $user->forceFill(['current_store' => $store->id])->save();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
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

    private function makeProduct(Store $store, array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $store->id,
            'is_active' => true,
            'price' => 100,
            'stock' => 8,
            'track_inventory' => true,
            'allow_backorder' => false,
            'inventory_mode' => 'product',
            'variant_combinations' => [],
        ], $overrides));
    }

    /* ───────────────────────── mobile representation ───────────────────────── */

    public function test_mobile_representation_is_marked(): void
    {
        $source = $this->posSource();
        $this->assertStringContainsString('data-testid="pos-cart-lines"', $source, 'cart line list must be marked');
        $this->assertStringContainsString('data-testid="pos-product"', $source, 'product add target must be marked');
        $this->assertStringContainsString('data-testid="pos-search"', $source, 'product search must be marked');
        $this->assertStringContainsString('data-testid="pos-total"', $source, 'total must be marked');
        $this->assertStringContainsString('data-testid="pos-complete-sale"', $source, 'complete-sale CTA must be marked');
    }

    public function test_mobile_stacked_pattern_reuses_desktop_grid_breakpoint(): void
    {
        $source = $this->posSource();
        $this->assertStringContainsString('lg:grid-cols-3', $source, 'desktop multi-column shell must remain');
        // Below lg the same shell stacks columns; no second POS layout was added.
        $this->assertStringContainsString('lg:col-span-2', $source, 'product browsing pane stays inside the shared grid');
    }

    /* ───────────────────────── search + add ───────────────────────── */

    public function test_product_search_endpoint_serves_rows(): void
    {
        $user = $this->companyUser();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $store = Store::find($user->current_store);
        $this->makeProduct($store, ['name' => 'POS Glass Widget', 'sku' => 'POS-GLASS', 'price' => 25, 'stock' => 4]);

        $res = $this->actingAs($user)->getJson(route('pos.search', ['q' => 'Glass']));
        $res->assertOk();
        $this->assertTrue($res->json('success'));
        $this->assertCount(1, $res->json('rows'));
        $this->assertSame('POS Glass Widget', $res->json('rows.0.name'));
    }

    public function test_add_to_cart_handler_and_label_remain(): void
    {
        $source = $this->posSource();
        $this->assertStringContainsString('addToCart', $source, 'add-to-cart handler must remain');
        $this->assertStringContainsString("t('Add to cart')", $source, 'add action must keep an accessible label');
    }

    /* ───────────────────────── cart line + quantity + remove ───────────────────────── */

    public function test_cart_line_exposes_product_name_and_controls(): void
    {
        $source = $this->posSource();
        $this->assertStringContainsString('{l.name}', $source, 'cart line must render the product name');
        $this->assertStringContainsString('changeQty(l.key, -1)', $source, 'decrement control must remain');
        $this->assertStringContainsString('changeQty(l.key, 1)', $source, 'increment control must remain');
    }

    public function test_quantity_controls_are_touch_friendly(): void
    {
        $source = $this->posSource();
        $this->assertStringContainsString('h-9 w-9', $source, 'quantity buttons must be at least 36px touch targets');
        $this->assertStringContainsString("aria-label={t('Decrease')}", $source, 'decrement must be accessible-labelled');
        $this->assertStringContainsString("aria-label={t('Increase')}", $source, 'increment must be accessible-labelled');
    }

    public function test_remove_and_clear_remain_available(): void
    {
        $source = $this->posSource();
        // Decrement-to-zero removes the line; Clear Cart empties it.
        $this->assertStringContainsString('if (qty <= 0) return [];', $source, 'decrement-to-remove must remain');
        $this->assertStringContainsString("t('Clear Cart')", $source, 'clear-cart action must remain');
    }

    /* ───────────────────────── totals + complete-sale ───────────────────────── */

    public function test_total_stays_visible_on_mobile(): void
    {
        $source = $this->posSource();
        $this->assertStringContainsString('data-testid="pos-total"', $source, 'final total must remain visible/marked');
        $this->assertStringContainsString('fmt(totals.total)', $source, 'total must use the existing totals computation');
    }

    public function test_complete_sale_cta_remains_accessible(): void
    {
        $source = $this->posSource();
        $this->assertStringContainsString('data-testid="pos-complete-sale"', $source, 'complete-sale CTA must be marked/accessible');
        $this->assertStringContainsString('submitSale', $source, 'complete-sale handler must remain');
        $this->assertStringContainsString("route('pos.sale')", $source, 'complete sale must still target the existing POS sale route');
    }

    /* ───────────────────────── permission / entitlement unchanged ───────────────────────── */

    public function test_pos_permission_and_entitlement_unchanged(): void
    {
        $user = $this->companyUser();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $res = $this->actingAs($user)->get(route('pos.index'));
        $res->assertOk();
        $res->assertInertia(fn ($page) => $page->component('pos/index'));

        $perms = collect($res->inertiaPage()['props']['auth']['permissions'] ?? [])->all();
        $this->assertContains('manage-pos', $perms, 'manage-pos entitlement must still gate /pos');
        $this->assertTrue($user->can('manage-pos'), 'POS permission must still be granted to the owner');
    }

    /* ───────────────────────── no routes / no logic drift ───────────────────────── */

    public function test_no_new_routes_introduced(): void
    {
        $source = $this->posSource();
        // Only the pre-existing POS endpoints may be referenced, each once.
        $this->assertSame(1, substr_count($source, "route('pos.search'"), 'search endpoint referenced once');
        $this->assertSame(1, substr_count($source, "route('pos.customers'"), 'customers endpoint referenced once');
        $this->assertSame(1, substr_count($source, "route('pos.sale'"), 'sale endpoint referenced once');
        $this->assertSame(1, substr_count($source, "route('pos.receipt'"), 'receipt endpoint referenced once');
        $this->assertSame(0, preg_match("/route\('pos\.[a-z_.-]+'/", str_replace([
            "route('pos.search'", "route('pos.customers'", "route('pos.sale'", "route('pos.receipt'",
        ], '', $source)), 'no other POS route references were added');
    }

    /* ───────────────────────── desktop preserved ───────────────────────── */

    public function test_desktop_pos_shell_preserved(): void
    {
        $source = $this->posSource();
        $this->assertStringContainsString('lg:grid-cols-3', $source, 'desktop 3-column POS must remain');
        $this->assertStringContainsString('sm:grid-cols-3', $source, 'larger product grid tiers must remain');
        $this->assertStringContainsString('xl:grid-cols-4', $source, 'desktop product grid tier must remain');
    }
}