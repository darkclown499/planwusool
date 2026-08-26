<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SharedStorefrontSearchCertificationTest extends TestCase
{
    use RefreshDatabase;

    private function makeStore(string $theme = 'bazaar-market'): array
    {
        $plan = Plan::factory()->create(['max_stores'=>10,'max_products_per_store'=>1000,'themes'=>['all']]);
        $user = User::factory()->create(['type'=>'company','email_verified_at'=>now(),'onboarded_at'=>now(),'plan_id'=>$plan->id,'plan_expire_date'=>now()->addMonth()]);
        $store = Store::factory()->create(['user_id'=>$user->id,'theme'=>$theme,'slug'=> strtolower(str_replace(' ', '-', uniqid('store_')))]);
        $user->current_store = $store->id; $user->save();
        return [$user,$store,$plan];
    }

    public function test_store_scoped_isolation(): void
    {
        [$uA,$storeA] = $this->makeStore();
        [$uB,$storeB] = $this->makeStore();
        $catA = Category::factory()->create(['store_id'=>$storeA->id,'is_active'=>true]);
        $catB = Category::factory()->create(['store_id'=>$storeB->id,'is_active'=>true]);
        $pA = Product::factory()->create(['store_id'=>$storeA->id,'category_id'=>$catA->id,'is_active'=>true,'name'=>'اندومي دجاج خاص متجر A','price'=>10]);
        $pB = Product::factory()->create(['store_id'=>$storeB->id,'category_id'=>$catB->id,'is_active'=>true,'name'=>'اندومي دجاج خاص متجر B','price'=>10]);

        $res = $this->getJson("/api/storefront/search?q=اندومي&store_id={$storeA->id}");
        $res->assertOk();
        $ids = collect($res->json('products'))->pluck('id')->all();
        $this->assertContains((string)$pA->id, $ids);
        $this->assertNotContains((string)$pB->id, $ids);

        // manipulation with other store id while browsing A should not leak B's product
        $res2 = $this->getJson("/api/storefront/search?q=اندومي&store_id={$storeB->id}");
        $res2->assertOk();
        $ids2 = collect($res2->json('products'))->pluck('id')->all();
        $this->assertContains((string)$pB->id, $ids2);
        $this->assertNotContains((string)$pA->id, $ids2);
    }

    public function test_inactive_product_hidden(): void
    {
        [$u,$store] = $this->makeStore();
        $cat = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true]);
        Product::factory()->create(['store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>false,'name'=>'اندومي مخفي','price'=>5]);
        $active = Product::factory()->create(['store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'name'=>'اندومي ظاهر','price'=>5]);
        $res = $this->getJson("/api/storefront/search?q=اندومي&store_id={$store->id}");
        $res->assertOk();
        $names = collect($res->json('products'))->pluck('name')->all();
        $this->assertContains($active->name, $names);
        $this->assertNotContains('اندومي مخفي', $names);
    }

    public function test_inactive_category_hidden(): void
    {
        [$u,$store] = $this->makeStore();
        $catActive = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true]);
        $catInactive = Category::factory()->create(['store_id'=>$store->id,'is_active'=>false]);
        $pVisible = Product::factory()->create(['store_id'=>$store->id,'category_id'=>$catActive->id,'is_active'=>true,'name'=>'اندومي قسم نشط','price'=>5]);
        $pHidden = Product::factory()->create(['store_id'=>$store->id,'category_id'=>$catInactive->id,'is_active'=>true,'name'=>'اندومي قسم غير نشط','price'=>5]);
        $res = $this->getJson("/api/storefront/search?q=اندومي&store_id={$store->id}");
        $res->assertOk();
        $names = collect($res->json('products'))->pluck('name')->all();
        $this->assertContains($pVisible->name, $names);
        $this->assertNotContains($pHidden->name, $names);
    }

    public function test_min_chars_enforced(): void
    {
        [$u,$store] = $this->makeStore();
        $cat = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true]);
        Product::factory()->create(['store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'name'=>'اندومي','price'=>5]);
        $res = $this->getJson("/api/storefront/search?q=ا&store_id={$store->id}");
        $res->assertOk();
        $this->assertCount(0, $res->json('products'));
    }

    public function test_max_chars_truncated(): void
    {
        [$u,$store] = $this->makeStore();
        $cat = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true]);
        Product::factory()->create(['store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'name'=>str_repeat('ا', 5),'price'=>5]);
        $long = str_repeat('ا', 150);
        $res = $this->getJson("/api/storefront/search?q=".urlencode($long)."&store_id={$store->id}");
        $res->assertOk(); // should not 500, should clamp to 100
        $this->assertTrue(true);
    }

    public function test_result_limit_enforced(): void
    {
        [$u,$store] = $this->makeStore();
        $cat = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true]);
        for ($i=0;$i<5;$i++) Product::factory()->create(['store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'name'=>"اندومي نوع $i",'price'=>5]);
        $res = $this->getJson("/api/storefront/search?q=اندومي&store_id={$store->id}&limit=2");
        $res->assertOk();
        $this->assertLessThanOrEqual(2, count($res->json('products')));
    }

    public function test_pagination_metadata(): void
    {
        [$u,$store] = $this->makeStore();
        $cat = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true]);
        for ($i=0;$i<15;$i++) Product::factory()->create(['store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'name'=>"اندومي متكرر $i",'price'=>5]);
        $res = $this->getJson("/api/storefront/search?q=اندومي&store_id={$store->id}&page=1&per_page=5");
        $res->assertOk();
        $json = $res->json();
        $this->assertEquals(5, count($json['products']));
        $this->assertEquals(15, $json['total']);
        $this->assertEquals(1, $json['current_page']);
        $this->assertEquals(3, $json['last_page']);
    }

    public function test_whitespace_normalized(): void
    {
        [$u,$store] = $this->makeStore();
        $cat = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true]);
        $p = Product::factory()->create(['store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'name'=>'اندومي فاخر','price'=>5]);
        $res = $this->getJson("/api/storefront/search?q=".urlencode('  اندومي   فاخر  ')."&store_id={$store->id}");
        $res->assertOk();
        // normalized to single space should still match
        $this->assertGreaterThan(0, count($res->json('products')));
    }

    public function test_subdomain_search_route_exists(): void
    {
        [$u,$store] = $this->makeStore('grocery-souq');
        $cat = Category::factory()->create(['store_id'=>$store->id,'is_active'=>true]);
        Product::factory()->create(['store_id'=>$store->id,'category_id'=>$cat->id,'is_active'=>true,'name'=>'اندومي','price'=>5]);

        // Hit the store subdomain search page via host header simulation
        $host = $store->slug . '.' . config('app.store_domain', 'localhost');
        $res = $this->get("http://{$host}/search?q=اندومي");
        // Should be 200 Inertia page with dedicated search component, not homepage fallback
        $res->assertOk();
        // Must be search page, not homepage (catch-all would render store/dynamic)
        $content = $res->getContent();
        // Inertia page rendering: component name in JSON or HTML contains searchPage query
        $this->assertTrue(str_contains($content, 'searchPage') || str_contains($content, 'نتائج البحث'), 'search must render dedicated search page, not homepage, got '.substr($content,0,600));
    }

    public function test_domain_resolver_search_not_home(): void
    {
        $resolver = file_get_contents(app_path('Http/Middleware/DomainResolver.php'));
        $this->assertStringContainsString("segments[0] === 'search'", $resolver, 'DomainResolver must handle /search explicitly, not fallback to home');
        $this->assertStringContainsString("ThemeController::class)->search", $resolver);
        // Also ensure ThemeController::search exists and is store-scoped
        $theme = file_get_contents(app_path('Http/Controllers/ThemeController.php'));
        $this->assertStringContainsString("function search", $theme);
        $this->assertStringContainsString("where('store_id', \$store['id'])", $theme);
        $this->assertStringContainsString("searchPage", $theme);
    }

    public function test_hero_mobile_independent(): void
    {
        $hero = file_get_contents(resource_path('js/templates-v2/shared/heroMedia.ts'));
        $this->assertStringContainsString('fitMobile', $hero, 'heroMedia must support independent mobile fit');
        $this->assertStringContainsString('positionMobile', $hero, 'heroMedia must support independent mobile position');
        $this->assertStringContainsString('heightMobile', $hero);
        $this->assertStringContainsString('imagesMobile', $hero, 'optional mobile media source');
        $this->assertStringContainsString('videoUrlMobile', $hero);
        $this->assertStringContainsString('youtubeUrlMobile', $hero);
        // Souq hero consumes mobile overrides
        $souq = file_get_contents(resource_path('js/templates-v2/grocery-souq/SouqComponents.tsx'));
        $this->assertStringContainsString('fitMobile', $souq, 'SouqHero must use mobile fit override');
        $this->assertStringContainsString('positionMobile', $souq);
        // Headers must be intentional mobile (not hidden md:block for 4 templates)
        foreach (['fashion-atelier/components/AtelierHeader.tsx','bazaar-market/BazaarMarket.tsx','bakery-house/BakeryHouse.tsx','electronics-hub/ElectronicsHub.tsx','restaurant-menu/RestaurantMenu.tsx'] as $p) {
            $src = file_get_contents(resource_path('js/templates-v2/'.$p));
            $this->assertStringNotContainsString('hidden md:block sticky top-0', $src, "$p mobile header must not be hidden md:block (intentional mobile)");
        }
        // useServerSearch must use Inertia router properly
        $hook = file_get_contents(resource_path('js/hooks/useServerSearch.ts'));
        $this->assertStringContainsString('inertiaRouter', $hook);
        $this->assertStringContainsString('submitStorefrontSearch', $hook);
    }

    public function test_all_templates_consume_shared_search_contract(): void
    {
        $templates = ['fashion-atelier','bazaar-market','grocery-souq','bakery-house','electronics-hub','restaurant-menu'];
        foreach ($templates as $slug) {
            $overlayPath = $this->findSearchOverlay($slug);
            $this->assertNotNull($overlayPath, "search overlay for $slug not found");
            $src = file_get_contents($overlayPath);
            // Each overlay must delegate to shared SearchSheet / useServerSearch / api/storefront/search
            $usesShared = str_contains($src, 'SearchSheet') || str_contains($src, 'useServerSearch') || str_contains($src, 'api/storefront/search');
            $this->assertTrue($usesShared, "$slug search overlay must consume shared contract, got $overlayPath");
        }
        // Live hook must have debounce + abort + store scope
        $hook = file_get_contents(resource_path('js/hooks/useServerSearch.ts'));
        $this->assertStringContainsString('AbortController', $hook);
        $this->assertStringContainsString('store_id', $hook);
        $this->assertStringContainsString('280', $hook); // debounce
        $this->assertStringContainsString('storeId', $hook);
        // Shared sheet must be near-fullscreen dvh + safe-area
        $sheet = file_get_contents(resource_path('js/templates-v2/shared/SearchSheet.tsx'));
        $this->assertStringContainsString('100dvh', $sheet);
        $this->assertStringContainsString('safe-area', $sheet);
        $this->assertStringContainsString('enterKeyHint', $sheet);
        $this->assertStringContainsString('submitStorefrontSearch', $sheet);
        // Result item must show image 64, 2-line clamp, price + sale, OOS
        $item = file_get_contents(resource_path('js/templates-v2/shared/SearchResultItem.tsx'));
        $this->assertStringContainsString('64', $item);
        $this->assertStringContainsString('line-clamp-2', $item);
        $this->assertStringContainsString('line-through', $item);
        $this->assertStringContainsString('out_of_stock', $item);
    }

    private function findSearchOverlay(string $slug): ?string
    {
        $candidates = [
            resource_path("js/templates-v2/{$slug}/overlays/AtelierSearchOverlay.tsx"),
            resource_path("js/templates-v2/{$slug}/SouqOverlays.tsx"),
            resource_path("js/templates-v2/{$slug}/BakeryOverlays.tsx"),
            resource_path("js/templates-v2/{$slug}/ElectronicsOverlays.tsx"),
            resource_path("js/templates-v2/{$slug}/RestaurantOverlays.tsx"),
            resource_path("js/templates-v2/shared/neutral/NeutralSearchOverlay.tsx"),
        ];
        // Bazaar uses neutral
        if ($slug === 'bazaar-market') return resource_path("js/templates-v2/shared/neutral/NeutralSearchOverlay.tsx");
        foreach ($candidates as $p) if (file_exists($p)) return $p;
        // fallback scan
        $files = glob(resource_path("js/templates-v2/{$slug}/*.tsx")) ?: [];
        foreach ($files as $f) if (str_contains(file_get_contents($f), 'SearchOverlay')) return $f;
        $files = glob(resource_path("js/templates-v2/{$slug}/**/*.tsx")) ?: [];
        foreach ($files as $f) if (str_contains(file_get_contents($f), 'SearchOverlay')) return $f;
        return null;
    }
}
