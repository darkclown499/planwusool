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
 * P2D-03 — merchant Products mobile UX.
 *
 * The desktop products list stays on its existing server data / props, while a
 * separate compact mobile representation (product cards) is delivered using
 * that same data. This test locks the PRODUCTS-specific mobile contract:
 *   - mobile product representation exists and shows name / price / status
 *   - the primary edit action resolves to the edit route
 *   - search + filter controls remain present behind the same props
 *   - first-use / search-no-result / limit-reached states stay distinct
 *   - limit + create CTA remain server-driven (planLimits.can_create)
 *   - desktop representation remains available
 *   - no hardcoded product-limit literals were introduced
 */
class MobileProductsUxTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Plan $plan;
    private Store $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->plan = Plan::factory()->create([
            'name' => 'MobilePx-' . uniqid(),
            'price' => 299,
            'max_stores' => 2,
            'max_products_per_store' => 5,
            'max_users_per_store' => 20,
            'is_default' => false,
            'is_plan_enable' => 'on',
        ]);
        $this->user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'plan_id' => $this->plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
            'onboarded_at' => now(),
        ]);
        $this->store = Store::factory()->create(['user_id' => $this->user->id, 'slug' => 'mobilepx-' . uniqid()]);
        $this->user->forceFill(['current_store' => $this->store->id])->save();

        $role = \App\Models\Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label' => 'Company']);
        $role->syncPermissions(\Spatie\Permission\Models\Permission::all());
        $this->user->assignRole($role);
        $this->user->givePermissionTo(\Spatie\Permission\Models\Permission::all());
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->actingAs($this->user->fresh());
    }

    private function setLimit(int $max): void
    {
        $user = \Auth::user();
        $user->plan->update(['max_products_per_store' => $max]);
        $user->unsetRelation('plan');
    }

    private function makeProduct(string $name, array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $this->store->id,
            'name' => $name,
            'is_active' => true,
            'price' => 50,
            'stock' => 10,
            'inventory_mode' => 'product',
            'variants' => [],
            'variant_combinations' => [],
        ], $overrides));
    }

    /* ---------------- mobile representation exists ---------------- */

    public function test_mobile_product_representation_exists_in_source(): void
    {
        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString('data-testid="mobile-product-card"', $source, 'mobile product card is not marked');
        $this->assertStringContainsString('md:hidden', $source, 'mobile representation must be mobile-only');
    }

    public function test_desktop_table_representation_remains(): void
    {
        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString('hidden md:block', $source, 'desktop table must stay available');
        $this->assertStringContainsString('<Table', $source, 'desktop table primitive must remain');
    }

    public function test_products_serve_rows_for_mobile_and_desktop(): void
    {
        $this->setLimit(10);
        $this->makeProduct('Lamp');
        $this->makeProduct('Desk');

        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('products/index')
                ->has('products.data', 2)
                ->where('stats.total', 2)
            );
    }

    /* ---------------- name / price / status visible ---------------- */

    public function test_product_props_carry_name_price_status_stock(): void
    {
        $this->setLimit(10);
        $this->makeProduct('Golden Lamp', ['price' => 120, 'stock' => 4, 'is_active' => true]);

        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('products/index')
                ->where('products.data.0.name', 'Golden Lamp')
                ->where('products.data.0.is_active', true)
                ->where('products.data.0.stock', 4)
                ->where('products.data.0.sale_price', null)
            );

        // Price is formatted for display with the existing currency helper.
        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString('formatCurrency(product.sale_price || product.price)', $source, 'mobile + desktop must render the price via the existing formatter');
    }

    public function test_inactive_product_is_distinguishable_via_label(): void
    {
        $this->setLimit(10);
        $this->makeProduct('Hidden Item', ['is_active' => false]);

        $this->get(route('products.index'))
            ->assertInertia(fn ($page) => $page
                ->where('products.data.0.is_active', false)
            );

        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString("t('Inactive')", $source, 'inactive label must be shown, not color-only');
        $this->assertStringContainsString("t('Active')", $source, 'active label must be shown');
    }

    /* ---------------- primary edit action ---------------- */

    public function test_edit_action_resolves_to_edit_route(): void
    {
        $this->setLimit(10);
        $product = $this->makeProduct('Editable Thing');

        $this->get(route('products.index'))
            ->assertInertia(fn ($page) => $page->where('products.data.0.id', $product->id));

        // The mobile card offers an explicit Edit button bound to the existing
        // edit router action (route products.edit).
        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString("'edit'", $source, 'edit action must be exposed');
        $this->assertStringContainsString("route('products.edit'", $source, 'edit must target the edit route');
    }

    /* ---------------- search + filters remain ---------------- */

    public function test_search_control_remains(): void
    {
        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString("t('Search by name or SKU...')", $source, 'search input must remain');
        $this->assertStringContainsString('searchInput', $source, 'search state must remain');
    }

    public function test_filter_controls_remain(): void
    {
        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString("t('Filter by category')", $source, 'category filter must remain');
        $this->assertStringContainsString("t('Filter by status')", $source, 'status filter must remain');
    }

    public function test_filters_served_from_server_props(): void
    {
        $this->setLimit(10);
        $this->makeProduct('Lamp');

        $category = \App\Models\Category::factory()->create([
            'store_id' => $this->store->id,
            'is_active' => true,
            'name' => 'Lighting',
        ]);

        $this->get(route('products.index', ['category_id' => $category->id, 'status' => 'active']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('filters.category_id', $category->id)
                ->where('filters.status', 'active')
            );
    }

    /* ---------------- empty states preserved + distinct ---------------- */

    public function test_first_use_empty_state_preserved(): void
    {
        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString('data-testid="products-empty-first-use"', $source);

        $this->get(route('products.index'))
            ->assertInertia(fn ($page) => $page
                ->where('stats.total', 0)
                ->where('planLimits.can_create', true)
                ->has('products.data', 0)
            );
    }

    public function test_search_no_result_state_remains_distinct(): void
    {
        $this->setLimit(10);
        $this->makeProduct('Lamp');

        $this->get(route('products.index', ['search' => 'zzz-no-match']))
            ->assertInertia(fn ($page) => $page
                ->where('stats.total', 1)
                ->has('products.data', 0)
                ->where('filters.search', 'zzz-no-match')
            );

        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString('data-testid="products-empty-search"', $source);
        $this->assertStringContainsString("t('Clear search and filters')", $source);
    }

    /* ---------------- limit-reached state server-driven ---------------- */

    public function test_limit_reached_state_remains_server_driven(): void
    {
        $this->setLimit(2);
        $this->makeProduct('Lamp');
        $this->makeProduct('Desk');

        $this->get(route('products.index'))
            ->assertInertia(fn ($page) => $page
                ->where('planLimits.current_products', 2)
                ->where('planLimits.max_products', 2)
                ->where('planLimits.can_create', false)
            );

        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString('data-testid="products-empty-limit"', $source);
        $this->assertStringContainsString('planLimits.can_create === false', $source);
    }

    /* ---------------- create CTA obeys permission / can_create ---------------- */

    public function test_create_cta_obeys_permission_and_can_create(): void
    {
        $this->setLimit(5);
        $this->makeProduct('Lamp');

        $this->get(route('products.index'))
            ->assertInertia(fn ($page) => $page->where('planLimits.can_create', true));

        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString("hasPermission('create-products')", $source, 'create CTA must honor create permission');
        $this->assertStringContainsString('planLimits?.can_create !== false', $source, 'create CTA must honor server cap');
    }

    /* ---------------- no hardcoded limits introduced ---------------- */

    public function test_no_hardcoded_product_limit_literals(): void
    {
        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringNotContainsString('18 products', $source);
        $this->assertStringNotContainsString('500 products', $source);
        $this->assertStringNotContainsString('10000 products', $source);
        $this->assertStringNotContainsString('max_products === 18', $source);
        $this->assertStringNotContainsString('max_products === 500', $source);
        $this->assertStringNotContainsString('max_products === 10000', $source);
        $this->assertStringNotContainsString('10000', $source, 'no hardcoded professional cap');
    }
}
