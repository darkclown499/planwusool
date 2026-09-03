<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\PointOfSaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Production bug reproduction + regression coverage for the merchant
 * /inventory/movements page.
 *
 * Production observed the frontend error boundary ("حدث خطأ غير متوقع") when a
 * merchant with real movement records opened the page, while /inventory worked.
 *
 * Root cause candidate: InventoryMovement::$timestamps = false means created_at
 * is NOT cast to a Carbon, so InventoryController::movements() calling
 * `$m->created_at?->toISOString()` throws "Call to a member function
 * toISOString() on string" the moment at least one movement row exists.
 */
class InventoryMovementsPageProductionBugTest extends TestCase
{
    use RefreshDatabase;

    private function merchantWithStore(): array
    {
        $plan = Plan::factory()->create([
            'name' => 'POS-'.uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_products_per_store' => 1000,
            'max_stores' => 10,
        ]);
        $user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
        ]);
        $store = Store::factory()->create(['user_id' => $user->id, 'currency' => 'ILS']);
        $user->current_store = $store->id;
        $user->save();
        try {
            $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'pos-'.uniqid(), 'guard_name' => 'web']);
            $perms = \Spatie\Permission\Models\Permission::whereIn('name', ['manage-pos'])->get();
            if ($perms->count() > 0) {
                $role->syncPermissions($perms);
                $user->assignRole($role);
            } else {
                $user->type = 'superadmin';
                $user->save();
            }
        } catch (\Throwable $e) {
            $user->type = 'superadmin';
            $user->save();
        }
        return [$user, $store];
    }

    private function category(Store $store): Category
    {
        return Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
    }

    private function product(Store $store, Category $cat, array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $store->id,
            'category_id' => $cat->id,
            'is_active' => true,
            'price' => 100,
            'stock' => 50,
            'track_inventory' => true,
            'allow_backorder' => false,
            'inventory_mode' => 'product',
            'variants' => [],
            'variant_combinations' => [],
        ], $overrides));
    }

    /**
     * REPRODUCTION - FAILS on certified base.
     * A merchant with a real POS sale movement must be able to open
     * /inventory/movements (this crashes with a 500 on base because
     * `created_at` is a string, not a Carbon, and ->toISOString() is called).
     */
    public function test_merchant_with_real_movement_can_open_movements_page(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 10, 'sku' => 'PROD-1']);

        app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 2]], 'cash');

        $this->assertSame(
            1,
            (int) InventoryMovement::where('store_id', $store->id)->where('product_id', $p->id)->count()
        );

        $res = $this->get(route('inventory.movements'));
        $res->assertStatus(200);
    }

    /**
     * Every movement type must be viewable, including the signed delta and
     * movement label, and the GET must never mutate stock.
     */
    public function test_all_supported_movement_types_render_without_mutating_stock(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 20]);

        app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 2]], 'cash');
        \App\Services\InventoryService::adjustStock($p, 5, $store->id, null, null, 'restock shelf', $user->id);
        $p->refresh();
        $this->assertSame(23, (int) $p->stock);

        $before = (int) $p->stock;
        $res = $this->get(route('inventory.movements'));
        $res->assertStatus(200);

        $p->refresh();
        $this->assertSame($before, (int) $p->stock, 'GET movements must have zero inventory side effects');
        $this->assertSame(2, (int) InventoryMovement::where('store_id', $store->id)->count());
    }

    /**
     * A movement whose product was deleted afterwards must still render
     * (null-safe product relation), not crash.
     */
    public function test_movement_with_deleted_product_still_renders(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 10]);

        app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 1]], 'cash');

        $movement = InventoryMovement::where('store_id', $store->id)->first();
        $this->assertNotNull($movement);
        // Product hard-deleted after the movement was recorded (products have no
        // soft-delete column; inventory_movements.product_id is a plain nullable
        // int with no FK, so the ledger row legitimately survives).
        $p->delete();

        $res = $this->get(route('inventory.movements'));
        $res->assertStatus(200);
        $res->assertInertia(fn ($page) => $page
            ->component('inventory/movements')
            ->where('movements.0.product_name', null));
    }

    /**
     * Store isolation: Store A must never see Store B movements on the page.
     */
    public function test_movements_page_is_strictly_store_scoped(): void
    {
        [$user, $store] = $this->merchantWithStore();
        [, $otherStore] = $this->merchantWithStore();
        $this->actingAs($user);

        $cat = $this->category($store);
        $mine = $this->product($store, $cat, ['stock' => 10, 'sku' => 'MINE']);
        app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $mine->id, 'quantity' => 1]], 'cash');

        $otherCat = $this->category($otherStore);
        $other = $this->product($otherStore, $otherCat, ['stock' => 10, 'sku' => 'THEIRS']);
        app(PointOfSaleService::class)->createPosSale($otherStore->id, [['product_id' => $other->id, 'quantity' => 1]], 'cash');

        $res = $this->get(route('inventory.movements'));
        $res->assertStatus(200);
        $res->assertInertia(fn ($page) => $page
            ->component('inventory/movements')
            ->where('pagination.total', 1));
    }

    /**
     * Unauthorized (no manage-pos) user remains blocked.
     */
    public function test_unauthorized_user_remains_blocked(): void
    {
        $plan = Plan::factory()->create(['name' => 'NO-POS-'.uniqid(), 'price' => 99, 'themes' => ['all'], 'max_products_per_store' => 1000, 'max_stores' => 10]);
        $user = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'onboarded_at' => now(), 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth()]);
        $store = Store::factory()->create(['user_id' => $user->id]);
        $user->current_store = $store->id;
        $user->save();

        $this->actingAs($user);
        $this->get(route('inventory.movements'))->assertForbidden();
    }

    /**
     * Empty movement history renders cleanly (not an error).
     */
    public function test_empty_movement_history_renders_cleanly(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);

        $res = $this->get(route('inventory.movements'));
        $res->assertStatus(200);
        $res->assertInertia(fn ($page) => $page
            ->component('inventory/movements')
            ->where('pagination.total', 0));
    }

    /**
     * Quantity direction is truthful: POS sale decrements are negative.
     */
    public function test_delta_direction_is_truthful(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 10]);

        app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'quantity' => 3]], 'cash');

        $res = $this->get(route('inventory.movements'));
        $res->assertStatus(200);

        $res->assertInertia(fn ($page) => $page
            ->has('movements', 1)
            ->where('movements.0.type', 'POS_SALE')
            ->where('movements.0.delta', -3)
            ->where('movements.0.before', 10)
            ->where('movements.0.after', 7));
    }

    /**
     * A variant inventory movement renders with its variant identifier and does
     * not crash when the product still exists.
     */
    public function test_variant_movement_renders_variant_identifier(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);
        $combos = [
            ['id' => 'Red‖S', 'uuid' => 'uuid-red-s', 'values' => ['Red', 'S'], 'label' => 'Red / S', 'price' => '100', 'stock' => '5', 'sku' => 'RED-S', 'image' => ''],
        ];
        $p = $this->product($store, $cat, [
            'inventory_mode' => 'variant',
            'variants' => [['name' => 'Color', 'values' => ['Red']], ['name' => 'Size', 'values' => ['S']]],
            'variant_combinations' => $combos,
        ]);

        app(PointOfSaleService::class)->createPosSale($store->id, [['product_id' => $p->id, 'variant_id' => 'Red‖S', 'quantity' => 1]], 'cash');

        $res = $this->get(route('inventory.movements'));
        $res->assertStatus(200);
        $res->assertInertia(fn ($page) => $page
            ->where('movements.0.type', 'POS_SALE')
            ->where('movements.0.variant_label', 'uuid-red-s'));
    }
}
