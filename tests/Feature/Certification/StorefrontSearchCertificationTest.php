<?php

namespace Tests\Feature\Certification;

use App\Models\Category;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * CERTIFICATION: Canonical storefront search + wishlist + cart contracts.
 *
 * Shared behavioral tests that do not depend on which template owns the
 * search sheet — they verify the shared SearchSheet consumes useServerSearch,
 * the search endpoint is store-scoped, and results map correctly with no
 * cross-store leakage.
 */
class StorefrontSearchCertificationTest extends TestCase
{
    use RefreshDatabase;

    private function makeStore(string $theme = 'bazaar-market'): array
    {
        $plan = Plan::factory()->create(['max_stores' => 10, 'max_products_per_store' => 1000, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'onboarded_at' => now(), 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth()]);
        $store = Store::factory()->create(['user_id' => $user->id, 'theme' => $theme, 'slug' => strtolower(str_replace(' ', '-', uniqid('store_')))]);
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store, $plan];
    }

    private function product(Store $store, string $name, bool $active = true, float $price = 10): Product
    {
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        return Product::factory()->create([
            'store_id' => $store->id,
            'category_id' => $cat->id,
            'is_active' => $active,
            'name' => $name,
            'price' => $price,
        ]);
    }

    public function test_shared_search_sheet_owns_server_search(): void
    {
        // Shared SearchSheet is the canonical integration point for useServerSearch.
        $sheet = file_get_contents(resource_path('js/templates-v2/shared/SearchSheet.tsx'));
        $this->assertStringContainsString('useServerSearch', $sheet);
        $this->assertStringContainsString('submitStorefrontSearch', $sheet);

        $hook = file_get_contents(resource_path('js/hooks/useServerSearch.ts'));
        $this->assertStringContainsString('api/storefront/search', $hook);
        $this->assertStringContainsString('store_id', $hook, 'search hook must enforce store scope');
    }

    public function test_search_endpoint_reachable_and_store_scoped(): void
    {
        [$uA, $storeA] = $this->makeStore();
        [$uB, $storeB] = $this->makeStore();
        $pA = $this->product($storeA, 'اندومي متجر A');
        $pB = $this->product($storeB, 'اندومي متجر B');

        $res = $this->getJson("/api/storefront/search?q=اندومي&store_id={$storeA->id}");
        $res->assertOk();
        $ids = collect($res->json('products'))->pluck('id')->all();
        $this->assertContains((string) $pA->id, $ids);
        $this->assertNotContains((string) $pB->id, $ids, 'no cross-store result leakage');
    }

    public function test_no_cross_store_leakage_when_query_shared(): void
    {
        [$uA, $storeA] = $this->makeStore();
        [$uB, $storeB] = $this->makeStore();
        $pA = $this->product($storeA, 'سمايل مشترك X');
        $pB = $this->product($storeB, 'سمايل مشترك X');

        $resA = $this->getJson("/api/storefront/search?q=سمايل&store_id={$storeA->id}");
        $this->assertContains((string) $pA->id, collect($resA->json('products'))->pluck('id')->all());
        $this->assertNotContains((string) $pB->id, collect($resA->json('products'))->pluck('id')->all());

        $resB = $this->getJson("/api/storefront/search?q=سمايل&store_id={$storeB->id}");
        $this->assertContains((string) $pB->id, collect($resB->json('products'))->pluck('id')->all());
        $this->assertNotContains((string) $pA->id, collect($resB->json('products'))->pluck('id')->all());
    }

    public function test_search_results_map_correct_fields(): void
    {
        [$u, $store] = $this->makeStore();
        $p = $this->product($store, 'اندومي خريطة');
        $res = $this->getJson("/api/storefront/search?q=خريطة&store_id={$store->id}");
        $res->assertOk();
        $first = collect($res->json('products'))->firstWhere('id', (string) $p->id);
        $this->assertNotNull($first);
        $this->assertArrayHasKey('name', $first);
        $this->assertArrayHasKey('price', $first);
        $this->assertArrayHasKey('slug', $first);
    }
}
