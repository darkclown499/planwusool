<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Currency;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\ProductSlugService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * FIX PACK 01 — Arabic product slug contract.
 * Arabic names must auto-produce valid URL-safe slugs without merchant SEO work.
 */
class MerchantFrictionFix01ArabicSlugTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Currency::create(['name' => 'Israeli Shekel', 'code' => 'ILS', 'symbol' => '₪']);
        $this->seed([\Database\Seeders\PermissionSeeder::class, \Database\Seeders\RoleSeeder::class]);
    }

    private function merchant(): array
    {
        $user = User::factory()->create(['type' => 'company', 'onboarded_at' => now()]);
        $plan = Plan::factory()->create([
            'max_stores' => 5,
            'max_products_per_store' => 100,
            'enable_custdomain' => 'off',
            'enable_custsubdomain' => 'off',
            'template_editor_level' => 'none',
            'enable_shipping_method' => 'off',
        ]);
        $user->plan_id = $plan->id;
        $user->plan_is_active = 1;
        $user->save();
        $store = Store::forceCreate([
            'name' => 'Slug Store',
            'slug' => 'slug-' . uniqid(),
            'theme' => Store::DEFAULT_TEMPLATE,
            'user_id' => $user->id,
        ]);
        $user->current_store = $store->id;
        $user->save();
        $user->givePermissionTo(['create-products', 'edit-products', 'view-products', 'manage-products']);
        $cat = Category::create(['name' => 'Cat', 'slug' => 'cat-' . $store->id . '-' . uniqid(), 'store_id' => $store->id, 'is_active' => true]);

        return [$user->fresh(), $store, $cat];
    }

    private function payload(Category $cat, array $over = []): array
    {
        return array_merge([
            'name' => 'بن عربي فاخر',
            'price' => 25,
            'stock' => 10,
            'images' => '/tmp/a.jpg',
            'category_id' => $cat->id,
            'is_active' => true,
        ], $over);
    }

    public function test_arabic_name_with_no_slug_creates_valid_slug(): void
    {
        [$user, $store, $cat] = $this->merchant();
        $res = $this->actingAs($user)->post(route('products.store'), $this->payload($cat));
        $res->assertRedirect(route('products.index'));

        $product = Product::where('store_id', $store->id)->latest('id')->first();
        $this->assertNotNull($product);
        $this->assertNotEmpty($product->seo_url_slug);
        $this->assertMatchesRegularExpression('/^[a-z0-9\-_]+$/i', $product->seo_url_slug);
    }

    public function test_generated_slug_passes_backend_validation(): void
    {
        $slug = ProductSlugService::generate('بن عربي فاخر', 999999);
        $this->assertMatchesRegularExpression('/^[a-z0-9\-_]+$/i', $slug);
        $this->assertLessThanOrEqual(191, strlen($slug));
    }

    public function test_product_publishes_successfully(): void
    {
        [$user, $store, $cat] = $this->merchant();
        $res = $this->actingAs($user)->post(route('products.store'), $this->payload($cat));
        $res->assertRedirect(route('products.index'));
        $product = Product::where('store_id', $store->id)->latest('id')->first();
        $this->assertTrue((bool) $product->is_active);
    }

    public function test_storefront_route_resolves(): void
    {
        [$user, $store, $cat] = $this->merchant();
        $this->actingAs($user)->post(route('products.store'), $this->payload($cat));
        $product = Product::where('store_id', $store->id)->latest('id')->first();

        // Mirrors StorefrontSeoService::resolveProduct() contract:
        // store-scoped seo_url_slug lookup for active products.
        $resolved = Product::where('store_id', $store->id)
            ->where('is_active', true)
            ->where('seo_url_slug', $product->seo_url_slug)
            ->first();
        $this->assertNotNull($resolved);
        $this->assertSame($product->id, $resolved->id);
    }

    public function test_duplicate_arabic_names_get_unique_slugs(): void
    {
        [$user, $store, $cat] = $this->merchant();
        $this->actingAs($user)->post(route('products.store'), $this->payload($cat));
        $this->actingAs($user)->post(route('products.store'), $this->payload($cat));

        $slugs = Product::where('store_id', $store->id)->orderBy('id')->pluck('seo_url_slug')->all();
        $this->assertCount(2, $slugs);
        $this->assertNotSame($slugs[0], $slugs[1]);
        foreach ($slugs as $slug) {
            $this->assertMatchesRegularExpression('/^[a-z0-9\-_]+$/i', $slug);
        }
    }

    public function test_manual_valid_slug_respected(): void
    {
        [$user, $store, $cat] = $this->merchant();
        $this->actingAs($user)->post(route('products.store'), $this->payload($cat, ['seo_url_slug' => 'my-fine-coffee']));
        $product = Product::where('store_id', $store->id)->latest('id')->first();
        $this->assertSame('my-fine-coffee', $product->seo_url_slug);
    }

    public function test_invalid_manual_slug_rejected(): void
    {
        [$user, $store, $cat] = $this->merchant();
        $res = $this->actingAs($user)
            ->from(route('products.create'))
            ->post(route('products.store'), $this->payload($cat, ['seo_url_slug' => 'bad slug!!']));
        $res->assertRedirect();
        $res->assertSessionHasErrors('seo_url_slug');
        $this->assertSame(0, Product::where('store_id', $store->id)->count());
    }

    public function test_slug_isolation_across_stores(): void
    {
        [$userA, $storeA, $catA] = $this->merchant();
        [$userB] = $this->merchant();
        $storeB = Store::forceCreate([
            'name' => 'Slug B', 'slug' => 'slugb-' . uniqid(),
            'theme' => Store::DEFAULT_TEMPLATE, 'user_id' => $userB->id,
        ]);
        $userB->current_store = $storeB->id;
        $userB->save();
        $userB = $userB->fresh();
        $catB = Category::create(['name' => 'CatB', 'slug' => 'catb-' . $storeB->id . '-' . uniqid(), 'store_id' => $storeB->id, 'is_active' => true]);

        $this->actingAs($userA)->post(route('products.store'), $this->payload($catA, ['seo_url_slug' => 'shared-slug']));
        $res = $this->actingAs($userB)->post(route('products.store'), [
            'name' => 'منتج آخر', 'price' => 10, 'stock' => 1, 'images' => '/tmp/b.jpg',
            'category_id' => $catB->id, 'is_active' => true, 'seo_url_slug' => 'shared-slug',
        ]);
        $res->assertRedirect(route('products.index'));
        $this->assertSame('shared-slug', Product::where('store_id', $storeB->id)->latest('id')->first()->seo_url_slug);
    }

    public function test_existing_slug_preserved_on_normal_edit(): void
    {
        [$user, $store, $cat] = $this->merchant();
        $this->actingAs($user)->post(route('products.store'), $this->payload($cat, ['seo_url_slug' => 'original-slug']));
        $product = Product::where('store_id', $store->id)->latest('id')->first();

        $this->actingAs($user)->put(route('products.update', $product->id), $this->payload($cat, [
            'name' => 'اسم محدث جديد',
            'seo_url_slug' => 'بن عربي فاخر',
        ]));
        // Arabic auto-derived slug on edit must not clobber the live URL.
        $this->assertSame('original-slug', $product->fresh()->seo_url_slug);
    }

    public function test_frontend_omission_still_works_via_backend(): void
    {
        [$user, $store, $cat] = $this->merchant();
        $data = $this->payload($cat);
        unset($data['seo_url_slug']);
        $res = $this->actingAs($user)->post(route('products.store'), $data);
        $res->assertRedirect(route('products.index'));
        $product = Product::where('store_id', $store->id)->latest('id')->first();
        $this->assertMatchesRegularExpression('/^[a-z0-9\-_]+$/i', $product->seo_url_slug);
    }
}
