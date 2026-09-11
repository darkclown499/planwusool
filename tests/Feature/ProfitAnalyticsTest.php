<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfitAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function merchantWithStore(): array
    {
        $this->seed(\Database\Seeders\RoleSeeder::class);
        $plan = Plan::factory()->create(['name' => 'Pro-' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create([
            'type' => 'company',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $store = Store::factory()->create(['user_id' => $user->id, 'currency' => 'ILS']);
        $user->current_store = $store->id;
        $user->save();

        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label' => 'Company']);
        $perms = \Spatie\Permission\Models\Permission::whereIn('name', ['manage-analytics', 'manage-orders', 'create-orders', 'view-orders'])->get();
        if ($perms->count() > 0) {
            $role->syncPermissions($perms);
            $user->assignRole($role);
        } else {
            $user->type = 'superadmin';
            $user->save();
        }
        return [$user, $store];
    }

    protected function category(Store $store): Category
    {
        return Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
    }

    protected function product(Store $store, array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $store->id,
            'category_id' => $this->category($store)->id,
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

    protected function variantProduct(Store $store, array $overrides = []): Product
    {
        return $this->product($store, array_merge([
            'inventory_mode' => 'variant',
            'price' => 100,
            'variants' => [['name' => 'Color', 'values' => ['Red']], ['name' => 'Size', 'values' => ['S', 'M']]],
            'variant_combinations' => [
                ['id' => 'Red‖S', 'uuid' => 'uuid-red-s', 'values' => ['Red', 'S'], 'label' => 'Red / S', 'price' => '100', 'stock' => '5', 'sku' => 'RED-S', 'image' => '', 'cost_price' => '40'],
                ['id' => 'Red‖M', 'uuid' => 'uuid-red-m', 'values' => ['Red', 'M'], 'label' => 'Red / M', 'price' => '110', 'stock' => '10', 'sku' => 'RED-M', 'image' => '', 'cost_price' => '45'],
            ],
            'stock' => 999,
        ], $overrides));
    }

    public function test_product_cost_price_is_nullable_and_rejects_negative(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $this->actingAs($user);
        $cat = $this->category($store);

        $valid = fn (array $extra = []) => array_merge([
            'name' => 'Cost Product',
            'price' => 50,
            'stock' => 10,
            'images' => 'path/to/img.jpg',
            'category_id' => $cat->id,
        ], $extra);

        $this->post(route('products.store'), $valid(['name' => 'No Cost', 'cost_price' => null]))
            ->assertSessionHasNoErrors();

        $this->from(route('products.create'))->post(route('products.store'), $valid(['name' => 'Bad Cost', 'cost_price' => -1]))
            ->assertSessionHasErrors('cost_price');
    }

    public function test_cost_price_for_variant_returns_product_cost_when_no_selection(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $p = $this->product($store, ['cost_price' => 30]);
        $this->assertSame(30.0, $p->costPriceForVariant(null));

        $noCost = $this->product($store, ['cost_price' => null]);
        $this->assertNull($noCost->costPriceForVariant(null));
    }

    public function test_variant_combo_cost_wins_then_product_cost_then_null(): void
    {
        [$user, $store] = $this->merchantWithStore();

        $p = $this->variantProduct($store, ['cost_price' => 33]);
        $this->assertSame(45.0, $p->costPriceForVariant('Red‖M'), 'combo cost wins');
        $this->assertSame(40.0, $p->costPriceForVariant('Red‖S'), 'combo cost wins');

        // combo exists but has no cost -> product cost
        $p2 = $this->variantProduct($store, [
            'cost_price' => 33,
            'variant_combinations' => [
                ['id' => 'Red‖S', 'uuid' => 'u-s', 'values' => ['Red', 'S'], 'label' => 'Red / S', 'price' => '100', 'stock' => '5', 'sku' => 'RED-S', 'image' => ''],
            ],
        ]);
        $this->assertSame(33.0, $p2->costPriceForVariant('Red‖S'), 'falls back to product cost');

        // neither cost present -> null
        $p3 = $this->variantProduct($store, [
            'cost_price' => null,
            'variant_combinations' => [
                ['id' => 'Red‖S', 'uuid' => 'u-s', 'values' => ['Red', 'S'], 'label' => 'Red / S', 'price' => '100', 'stock' => '5', 'sku' => 'RED-S', 'image' => ''],
            ],
        ]);
        $this->assertNull($p3->costPriceForVariant('Red‖S'));
    }
}