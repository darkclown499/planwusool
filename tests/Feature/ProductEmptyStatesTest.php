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
 * P2B-02 — merchant product empty states + primary actions.
 *
 * Covers the three distinct empty views on the products index:
 *  1. first-use  (store has no products yet)
 *  2. search     (products exist, but the active search/filters match none)
 *  3. limit      (the server-driven plan cap has been reached)
 *
 * The product cap values always come from the authoritative Plan source
 * delivered in P2A-04 (planLimits) — never from a hardcoded frontend literal.
 */
class ProductEmptyStatesTest extends TestCase
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
            'name' => 'EmptyState-' . uniqid(),
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
        $this->store = Store::factory()->create(['user_id' => $this->user->id, 'slug' => 'emptystate-' . uniqid()]);
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

    private function makeProduct(string $name): Product
    {
        return Product::factory()->create([
            'store_id' => $this->store->id,
            'name' => $name,
            'is_active' => true,
            'price' => 50,
            'stock' => 10,
            'inventory_mode' => 'product',
            'variants' => [],
            'variant_combinations' => [],
        ]);
    }

    private function emptyStateKeys(): array
    {
        return [
            'No products yet',
            'Add First Product',
            'Clear search and filters',
            'Product limit reached',
            'Add a category first to organize your products, then add items inside it.',
        ];
    }

    /* ---------------- first-use empty state ---------------- */

    public function test_no_products_serves_first_use_state_props(): void
    {
        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('products/index')
                ->where('stats.total', 0)
                ->where('planLimits.current_products', 0)
                ->where('planLimits.can_create', true)
                ->has('products.data', 0)
            );
    }

    public function test_first_use_empty_state_exists_and_is_translated(): void
    {
        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString('data-testid="products-empty-first-use"', $source, 'first-use empty state must be present');
        $this->assertStringContainsString("t('No products yet')", $source, 'first-use headline must be translated');
        $this->assertStringContainsString("t('Add First Product')", $source, 'first-use primary CTA must be translated');
        $this->assertStringNotContainsString('لم نجد نتائج مطابقة', $source, 'no hardcoded search-empty Arabic');
        $this->assertStringNotContainsString('لا توجد منتجات بعد', $source, 'no hardcoded first-use Arabic');
    }

    /* ---------------- search/filter empty state ---------------- */

    public function test_search_with_no_matches_serves_search_empty_props(): void
    {
        $this->setLimit(10);
        $this->makeProduct('Lamp');
        $this->makeProduct('Desk');

        $this->get(route('products.index', ['search' => 'zzz-no-match']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('products/index')
                ->where('stats.total', 2)
                ->where('planLimits.can_create', true)
                ->has('products.data', 0)
                ->where('filters.search', 'zzz-no-match')
            );
    }

    public function test_category_filter_with_no_matches_serves_search_empty_props(): void
    {
        $this->setLimit(10);
        $this->makeProduct('Lamp');

        $emptyCategory = \App\Models\Category::factory()->create([
            'store_id' => $this->store->id,
            'is_active' => true,
            'name' => 'Empty Category',
        ]);

        $this->get(route('products.index', ['category_id' => $emptyCategory->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('products/index')
                ->where('stats.total', 1)
                ->has('products.data', 0)
            );
    }

    public function test_search_empty_state_exists_and_is_translated(): void
    {
        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString('data-testid="products-empty-search"', $source, 'search empty state must be present');
        $this->assertStringContainsString("t('Clear search and filters')", $source, 'search empty CTA must be translated');
        $this->assertStringContainsString("t('No products found')", $source, 'search empty headline must be translated');
    }

    /* ---------------- limit-reached state ---------------- */

    public function test_at_limit_serves_can_create_false_and_banner_props(): void
    {
        $this->setLimit(2);
        $this->makeProduct('Lamp');
        $this->makeProduct('Desk');

        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('products/index')
                ->where('planLimits.current_products', 2)
                ->where('planLimits.max_products', 2)
                ->where('planLimits.can_create', false)
            );
    }

    public function test_limit_reached_banner_is_present_and_server_driven(): void
    {
        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString('data-testid="products-limit-banner"', $source, 'limit banner must be present');
        $this->assertStringContainsString('planLimits.can_create === false', $source, 'banner must be driven by server cap');
        $this->assertStringContainsString('planLimits.current_products', $source, 'banner must use server count');
        $this->assertStringContainsString('planLimits.max_products', $source, 'banner must use server max');
        $this->assertStringContainsString("{{current}}/{{max}}", $source, 'capacity must be rendered via interpolation');
    }

    /* ---------------- below-limit CTA ---------------- */

    public function test_below_limit_allows_create_and_add_cta(): void
    {
        $this->setLimit(5);
        $this->makeProduct('Lamp');

        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('products/index')
                ->where('planLimits.current_products', 1)
                ->where('planLimits.max_products', 5)
                ->where('planLimits.can_create', true)
            );

        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringContainsString("planLimits?.can_create !== false", $source, 'add CTA must be gated on the server cap');
    }

    /* -------------- server-driven, never hardcoded -------------- */

    public function test_plan_cap_changes_flow_into_page_props(): void
    {
        $this->setLimit(3);
        $this->makeProduct('Lamp');

        $this->get(route('products.index'))
            ->assertInertia(fn ($page) => $page->where('planLimits.max_products', 3));

        $this->setLimit(7);
        $this->get(route('products.index'))
            ->assertInertia(fn ($page) => $page->where('planLimits.max_products', 7));
    }

    public function test_no_hardcoded_limit_literals_in_products_page(): void
    {
        $source = file_get_contents(__DIR__.'/../../resources/js/pages/products/index.tsx');
        $this->assertStringNotContainsString('10000', $source, 'no Professional hardcoded cap');
        $this->assertStringNotContainsString('18 products', $source, 'no Starter hardcoded cap copy');
        $this->assertStringNotContainsString('500 products', $source, 'no Growth hardcoded cap copy');
        $this->assertStringNotContainsString('max_products === 18', $source, 'no numeric cap comparisons');
        $this->assertStringNotContainsString('max_products === 500', $source, 'no numeric cap comparisons');
        $this->assertStringNotContainsString('max_products === 10000', $source, 'no numeric cap comparisons');
    }

    /* ------------------ i18n parity for new keys ------------------ */

    public function test_new_empty_state_keys_exist_in_en_and_ar(): void
    {
        $en = json_decode(file_get_contents(__DIR__.'/../../resources/lang/en.json'), true);
        $ar = json_decode(file_get_contents(__DIR__.'/../../resources/lang/ar.json'), true);

        foreach ($this->emptyStateKeys() as $key) {
            $this->assertArrayHasKey($key, $en, "en.json missing $key");
            $this->assertArrayHasKey($key, $ar, "ar.json missing $key");
            $this->assertNotSame('', trim($en[$key]), "en.json $key must not be empty");
            $this->assertNotSame('', trim($ar[$key]), "ar.json $key must not be empty");
        }
    }

    /* ---------------- normal table is preserved ---------------- */

    public function test_existing_products_render_table_via_pagination_props(): void
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
}