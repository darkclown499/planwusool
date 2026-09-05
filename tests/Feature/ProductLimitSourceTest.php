<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * P2A-04 — product limit source of truth.
 *
 * Proves that the merchant-facing product limit (products index / create /
 * import pages and the upgrade modal) flows from the authoritative backend
 * Plan.max_products_per_store column — never from a hardcoded frontend
 * literal (18 / 500 / 10000).
 */
class ProductLimitSourceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Plan $plan;
    private Store $store;
    private Store $storeB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->plan = Plan::factory()->create([
            'name' => 'Growth-' . uniqid(),
            'price' => 299,
            'max_stores' => 2,
            'max_products_per_store' => 500,
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
        $this->store = Store::factory()->create(['user_id' => $this->user->id, 'slug' => 'limit-store-' . uniqid()]);
        $this->storeB = Store::factory()->create(['user_id' => $this->user->id, 'slug' => 'limit-store-b-' . uniqid()]);
        $this->user->forceFill(['current_store' => $this->store->id])->save();

        $role = \App\Models\Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label' => 'Company']);
        $role->syncPermissions(\Spatie\Permission\Models\Permission::all());
        $this->user->assignRole($role);
        $this->user->givePermissionTo(\Spatie\Permission\Models\Permission::all());
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->actingAs($this->user->fresh());
    }

    /* ---------------------------- helpers ---------------------------- */

    private function setLimit(int $max): void
    {
        // Mutate through the exact instance the guard holds (Auth::user()),
        // then drop the cached `plan` relationship so the next request re-reads
        // the authoritative value from the DB.
        $user = \Auth::user();
        $user->plan->update(['max_products_per_store' => $max]);
        $user->unsetRelation('plan');
    }

    private function switchStore(Store $store): void
    {
        // forceFill/save on the guard-held instance so getCurrentStoreId()
        // observed inside the request sees the new current_store.
        \Auth::user()->forceFill(['current_store' => $store->id])->save();
    }

    private function productInStore(Store $store, array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $store->id,
            'is_active' => true,
            'price' => 50,
            'stock' => 10,
            'inventory_mode' => 'product',
            'variants' => [],
            'variant_combinations' => [],
        ], $overrides));
    }

    private function payloadFor(array $tier): array
    {
        return ['name' => $tier['name'], 'max_products_per_store' => $tier['max_products'], 'is_default' => false];
    }

    private function preview(UploadedFile $file, array $mapping, array $options = []): array
    {
        $response = $this->post(route('products.import.preview'), [
            'file' => $file,
            'mapping' => json_encode($mapping),
            'options' => json_encode($options),
        ]);

        return [$response, $response->json()];
    }

    private function confirm(int $batchId, string $strategy): array
    {
        $response = $this->post(route('products.import.confirm'), [
            'batch_id' => $batchId,
            'strategy' => $strategy,
        ]);

        return [$response, $response->json()];
    }

    private function importAndConfirm(UploadedFile $file, array $mapping, array $options = []): array
    {
        [$previewRes, $preview] = $this->preview($file, $mapping, $options);
        $this->assertSame(200, $previewRes->status(), 'preview should succeed');
        $batchId = (int) $previewRes->json('batch_id');
        [$confirmRes] = $this->confirm($batchId, $options['strategy'] ?? 'create_only');
        $this->assertSame(200, $confirmRes->status());

        return $confirmRes->json();
    }

    /* ---------------- configured tiers served from backend ---------------- */

    public function test_starter_like_limit_served_from_backend(): void
    {
        $this->setLimit(18);
        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('products/index')
                ->where('planLimits.max_products', 18)
                ->where('planLimits.current_products', 0)
                ->where('planLimits.can_create', true)
            );
    }

    public function test_growth_like_limit_served_from_backend(): void
    {
        $this->setLimit(500);
        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('planLimits.max_products', 500));
    }

    public function test_professional_like_limit_served_from_backend(): void
    {
        $this->setLimit(10000);
        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('planLimits.max_products', 10000));
    }

    /* -------------------- dynamic value, not a literal -------------------- */

    public function test_dynamic_limit_37_replaces_any_hardcoded_fallback(): void
    {
        $this->setLimit(37);
        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('planLimits.max_products', 37)
                ->where('planLimits.can_create', true)
            );

        $this->get(route('products.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('planLimits.max_products', 37));

        $this->get(route('products.import'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('planLimits.max_products', 37));
    }

    public function test_plan_limit_change_flows_into_page_prop_without_frontend_change(): void
    {
        $this->setLimit(37);
        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('planLimits.max_products', 37));

        $this->setLimit(41);
        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('planLimits.max_products', 41));
    }

    /* ------------------------- store-correct count ------------------------ */

    public function test_product_count_is_store_correct(): void
    {
        $this->setLimit(10);
        Product::factory()->count(4)->create(['store_id' => $this->store->id]);
        Product::factory()->count(6)->create(['store_id' => $this->storeB->id]);

        $this->switchStore($this->store);
        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('planLimits.current_products', 4)
                ->where('planLimits.can_create', true)
            );

        $this->switchStore($this->storeB);
        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('planLimits.current_products', 6)
                ->where('planLimits.can_create', true)
            );
    }

    public function test_limit_applies_per_store_not_across_other_stores(): void
    {
        $this->setLimit(3);
        Product::factory()->count(3)->create(['store_id' => $this->store->id]);

        $this->switchStore($this->store);
        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('planLimits.current_products', 3)
                ->where('planLimits.can_create', false)
            );

        $this->switchStore($this->storeB);
        $this->get(route('products.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('planLimits.current_products', 0)
                ->where('planLimits.can_create', true)
            );
    }

    /* --------------------------- enforcement --------------------------- */

    public function test_below_limit_create_allowed(): void
    {
        $this->setLimit(18);
        $this->productInStore($this->store);
        $category = \App\Models\Category::factory()->create(['store_id' => $this->store->id, 'is_active' => true]);

        $res = $this->post(route('products.store'), [
            'name' => 'Allowed Product A',
            'price' => 20,
            'stock' => 5,
            'images' => 'products/test-cover.jpg',
            'category_id' => $category->id,
        ]);
        $res->assertRedirect(route('products.index'));
        $this->assertSame(2, Product::where('store_id', $this->store->id)->count());
    }

    public function test_at_limit_create_rejected_server_side(): void
    {
        $this->setLimit(3);
        Product::factory()->count(3)->create(['store_id' => $this->store->id]);

        $this->get(route('products.index'));
        $res = $this->post(route('products.store'), ['name' => 'Should Not Persist']);
        $res->assertRedirect();
        $this->assertNotNull(session('error'));
        $this->assertSame(3, Product::where('store_id', $this->store->id)->count());
    }

    public function test_direct_post_cannot_bypass_limit(): void
    {
        $this->setLimit(2);
        Product::factory()->count(2)->create(['store_id' => $this->store->id]);

        $res = $this->post(route('products.store'), ['name' => 'Raw Bypass Attempt']);
        $res->assertRedirect();
        $this->assertNotNull(session('error'));
        $this->assertSame(2, Product::where('store_id', $this->store->id)->count());
    }

    public function test_import_respects_remaining_capacity(): void
    {
        $this->setLimit(18);
        Product::factory()->count(17)->create(['store_id' => $this->store->id]);

        $result = $this->importAndConfirm(
            UploadedFile::fake()->createWithContent(
                'products.csv',
                "name,sku,price,stock,status\nأحمر L-1,SKU-L1,10,5,active\nأسود L-2,SKU-L2,20,5,active\n"
            ),
            ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'stock' => 'stock', 'status' => 'status']
        );

        $this->assertSame('completed_with_errors', $result['status']);
        $this->assertEquals(1, $result['created']);
        $this->assertEquals(1, $result['failed']);
        $this->assertEquals(18, Product::where('store_id', $this->store->id)->count());
    }

    /* ------------------- upgrade modal tiers (server) ------------------- */

    public function test_upgrade_modal_tiers_are_server_sourced(): void
    {
        $growthTier = Plan::factory()->create($this->payloadFor(['name' => 'GrowthUp-' . uniqid(), 'max_products' => 500]));
        $proTier = Plan::factory()->create($this->payloadFor(['name' => 'ProUp-' . uniqid(), 'max_products' => 10000]));
        $this->setLimit(18);

        $res = $this->get(route('products.index'))->assertOk();
        $res->assertInertia(fn ($page) => $page
            ->has('planTiers', 2)
            ->where('planTiers.0.name', $growthTier->name)
            ->where('planTiers.0.max_products', 500)
            ->where('planTiers.1.name', $proTier->name)
            ->where('planTiers.1.max_products', 10000)
        );

        // Changing the authoritative value changes the modal data immediately —
        // no frontend code change involved.
        $proTier->update(['max_products_per_store' => 12345]);
        $this->get(route('products.index'))
            ->assertInertia(fn ($page) => $page->where('planTiers.1.max_products', 12345));
    }
}