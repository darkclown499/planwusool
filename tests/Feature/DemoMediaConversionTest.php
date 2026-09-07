<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\MediaItem;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use App\Services\DemoStoreService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

/**
 * Guards the demo-storefront media contract end-to-end: the demo placeholder
 * SVGs are final art written directly to the public disk and must be served as
 * originals — the storefront must never rewrite a /storage/demo/* path into a
 * /conversions/ subpath that cannot exist. Real Spatie media uploads (numeric
 * ids under /storage/media/{id}/...) keep deriving conversion URLs.
 */
class DemoMediaConversionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Cache::flush();
        StoreConfiguration::flushRequestCache();
        $this->withoutVite();
    }

    /**
     * Create the demo store exactly like production: superadmin owner +
     * DemoStoreService::ensureDemoStore() (writes SVGs + seeds the catalog).
     */
    private function seedDemoStore(): Store
    {
        User::factory()->create(['type' => 'superadmin']);
        $store = (new DemoStoreService())->ensureDemoStore();
        $this->assertNotNull($store, 'Demo store could not be created');

        return $store;
    }

    private function storeUrl(Store $store): string
    {
        return "http://{$store->slug}." . config('app.store_domain');
    }

    /**
     * Mirror of the storefront conversion-derivation guard in
     * resources/js/utils/image-helper.ts: conversion URLs are only derived for
     * real Spatie media originals (/storage/media/{id}/... or legacy
     * /storage/{id}/...), never for non-media storage roots like /storage/demo/.
     */
    private function storefrontDerivesConversionUrl(string $storagePath): bool
    {
        $path = parse_url($storagePath, PHP_URL_PATH) ?? $storagePath;
        if (!str_starts_with($path, '/storage')) {
            return false;
        }
        if (str_contains($path, '/conversions/')) {
            return true;
        }

        return (bool) preg_match('#^/(?:storage/)?media/\d+/#', $path)
            || (bool) preg_match('#^/storage/\d+/#', $path);
    }

    public function test_demo_svg_sources_are_written_as_valid_svg(): void
    {
        (new DemoStoreService())->writeSvgImages();

        foreach (['p1', 'p4', 'cat-fashion', 'cat-electronics'] as $slug) {
            $this->assertTrue(
                Storage::disk('public')->exists("demo/{$slug}.svg"),
                "demo/{$slug}.svg was not written"
            );
            $this->assertStringStartsWith('<svg', (string) Storage::disk('public')->get("demo/{$slug}.svg"));
        }
    }

    public function test_every_demo_catalog_image_reference_resolves_to_a_real_file(): void
    {
        $store = $this->seedDemoStore();

        $products = Product::where('store_id', $store->id)->get();
        $this->assertNotEmpty($products, 'Demo catalog was not seeded');

        foreach ($products as $product) {
            $cover = $product->cover_image;
            $this->assertNotNull($cover, "Product [{$product->name}] has no cover image");
            $this->assertTrue(
                str_starts_with($cover, '/storage/demo/') || str_starts_with($cover, '/themes/'),
                "Unexpected demo cover root: [$cover]"
            );
            $this->assertStringNotContainsString('/conversions/', $cover);

            if (str_starts_with($cover, '/storage/demo/')) {
                $relative = substr($cover, strlen('/storage/'));
                $this->assertTrue(
                    Storage::disk('public')->exists($relative),
                    "Demo product image is missing on the public disk: [$cover]"
                );
            } else {
                // Real template photography shipped under public/themes/...
                $this->assertTrue(file_exists(public_path($cover)), "Missing public asset: [$cover]");
            }
        }

        $categories = Category::where('store_id', $store->id)->get();
        $this->assertNotEmpty($categories, 'Demo categories were not seeded');

        foreach ($categories as $category) {
            $image = $category->image;
            $this->assertNotNull($image, "Category [{$category->name}] has no image");
            $this->assertStringStartsWith('/storage/demo/', $image);
            $this->assertStringNotContainsString('/conversions/', $image);

            $relative = substr($image, strlen('/storage/'));
            $this->assertTrue(
                Storage::disk('public')->exists($relative),
                "Demo category image is missing on the public disk: [$image]"
            );
        }
    }

    public function test_demo_storefront_payload_contains_only_resolvable_media_no_conversion_subpaths(): void
    {
        $store = $this->seedDemoStore();

        $response = $this->get($this->storeUrl($store) . '/');
        $response->assertStatus(200);
        $content = (string) $response->getContent();

        // The full payload must never reference a conversion subpath for demo art.
        $this->assertStringNotContainsString('storage/demo/conversions', $content);

        // Decode the Inertia payload and validate every demo image reference
        // resolves to a real file on the public disk — the reported 404 root cause.
        $this->assertMatchesRegularExpression('#data-page="(.*?)"#s', $content);
        preg_match('#data-page="(.*?)"#s', $content, $matches);
        $payload = json_decode(html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('store/dynamic', $payload['component']);

        $references = [];
        foreach (($payload['props']['products'] ?? []) as $product) {
            if (!empty($product['image'])) {
                $references[] = $product['image'];
            }
            foreach (($product['images'] ?? []) as $galleryImage) {
                if (!empty($galleryImage)) {
                    $references[] = $galleryImage;
                }
            }
        }
        foreach (($payload['props']['categories'] ?? []) as $category) {
            if (!empty($category['image'])) {
                $references[] = $category['image'];
            }
        }

        $demoRefs = array_values(array_filter(
            $references,
            fn (string $url) => str_starts_with($url, '/storage/demo/')
        ));
        $this->assertNotEmpty($demoRefs, 'Storefront payload carries no demo placeholder images');

        foreach (array_unique($demoRefs) as $demoRef) {
            $this->assertStringNotContainsString('/conversions/', $demoRef);
            $relative = substr($demoRef, strlen('/storage/'));
            $this->assertTrue(
                Storage::disk('public')->exists($relative),
                "Storefront payload references missing public file: [$demoRef]"
            );
        }
    }

    public function test_demo_seeding_is_tenant_isolated(): void
    {
        $merchant = User::factory()->create(['type' => 'company', 'onboarded_at' => now()]);
        $otherStore = Store::factory()->create(['user_id' => $merchant->id]);
        $otherCategory = Category::factory()->create(['store_id' => $otherStore->id, 'is_active' => true]);
        $otherProduct = Product::factory()->create([
            'store_id' => $otherStore->id,
            'category_id' => $otherCategory->id,
            'cover_image' => '/storage/media/4242/original.jpg',
            'images' => '/storage/media/4242/original.jpg',
            'is_active' => true,
        ]);

        $store = $this->seedDemoStore();

        $this->assertNotEquals($store->id, $otherStore->id);
        $this->assertNotContains($otherProduct->id, Product::where('store_id', $store->id)->pluck('id')->all());
        $this->assertEquals([$store->id], Category::where('store_id', $store->id)->pluck('store_id')->unique()->values()->all());

        // The merchant store is untouched by demo seeding — media path preserved.
        $otherProduct->refresh();
        $this->assertEquals('/storage/media/4242/original.jpg', $otherProduct->cover_image);
    }

    public function test_normal_merchant_media_path_unchanged_conversion_contract_kept(): void
    {
        $store = $this->seedDemoStore();

        $merchant = User::factory()->create(['type' => 'company', 'onboarded_at' => now()]);
        $merchantStore = Store::factory()->create(['user_id' => $merchant->id]);

        $item = MediaItem::create(['name' => 'Merchant Image']);
        $item->store_id = $merchantStore->id;
        $item->save();

        Media::create([
            'model_type' => MediaItem::class,
            'model_id' => $item->id,
            'collection_name' => 'images',
            'name' => 'product',
            'file_name' => 'product.jpg',
            'mime_type' => 'image/jpeg',
            'disk' => 'public',
            'conversions_disk' => 'public',
            'size' => 1024,
            'manipulations' => [],
            'custom_properties' => [],
            'generated_conversions' => [],
            'responsive_images' => [],
            'store_id' => $merchantStore->id,
            'user_id' => $merchant->id,
        ]);

        $file = 'media/' . $item->id . '/product.jpg';
        Storage::disk('public')->put($file, 'fake-jpeg');
        $canonical = '/storage/' . $file;

        $this->assertTrue(Storage::disk('public')->exists($file));
        $this->assertMatchesRegularExpression('#^/storage/media/\d+/#', $canonical);

        // Merchant uploads keep deriving conversion URLs (thumb/small/medium).
        $this->assertTrue($this->storefrontDerivesConversionUrl($canonical));
        // Demo placeholder art never does.
        $this->assertFalse($this->storefrontDerivesConversionUrl('/storage/demo/p1.svg'));
        $this->assertFalse($this->storefrontDerivesConversionUrl('/storage/demo/cat-fashion.svg'));

        // Seeding the demo store never rewrote merchant records.
        $this->assertEquals([], Store::where('id', $merchantStore->id)->where('slug', 'demo')->pluck('id')->all());
    }

    public function test_demo_media_contains_no_hardcoded_machine_paths(): void
    {
        $store = $this->seedDemoStore();

        $svg = (string) Storage::disk('public')->get('demo/p1.svg');
        foreach (['localhost', 'C:\\', 'C:/', '\\'] as $forbidden) {
            $this->assertStringNotContainsString($forbidden, $svg, "Demo SVG leaks [$forbidden]");
        }

        foreach (Product::where('store_id', $store->id)->pluck('cover_image') as $cover) {
            $path = parse_url($cover, PHP_URL_PATH) ?? $cover;
            $this->assertSame($path, $cover, "Demo cover leaked a full URL: [$cover]");
            $this->assertStringStartsWith('/', $cover);
            // Placeholder art ships either as public-disk SVGs or real template
            // photography under public/themes/ — never an absolute machine origin.
            $this->assertTrue(
                str_starts_with($cover, '/storage/demo/') || str_starts_with($cover, '/themes/'),
                "Unexpected demo cover root: [$cover]"
            );
            $this->assertStringNotContainsString('localhost', $cover);
        }

        foreach (Category::where('store_id', $store->id)->pluck('image') as $image) {
            $path = parse_url($image, PHP_URL_PATH) ?? $image;
            $this->assertSame($path, $image, "Demo category image leaked a full URL: [$image]");
        }
    }

    public function test_missing_optional_demo_media_degrades_gracefully(): void
    {
        $store = $this->seedDemoStore();

        $category = Category::where('store_id', $store->id)->first();
        Product::create([
            'name' => 'Demo Product Without Media',
            'price' => 10,
            'stock' => 5,
            'cover_image' => null,
            'images' => '',
            'category_id' => $category->id,
            'store_id' => $store->id,
            'is_active' => true,
        ]);

        $preview = (new DemoStoreService())->demoStorePreview(200, 10);
        $this->assertSame('بوتيك ماسة', $preview['name']);
        $this->assertContains(null, array_column($preview['products'], 'image'));

        $response = $this->get($this->storeUrl($store) . '/');
        $response->assertStatus(200);
    }
}