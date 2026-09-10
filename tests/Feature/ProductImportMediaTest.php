<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Product bulk import media ingestion: remote image URLs are downloaded
 * SSRF-safely at confirm time and persisted as local, store-scoped files.
 * All remote fetches are HTTP faked — no uncontrolled internet calls.
 */
class ProductImportMediaTest extends TestCase
{
    use RefreshDatabase;

    /** 1x1 transparent PNG — real PNG signature accepted by the downloader. */
    private const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    private User $user;
    private Store $store;
    private Store $storeB;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->seed(\Database\Seeders\PermissionSeeder::class);
        $this->seed(\Database\Seeders\RoleSeeder::class);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $plan = Plan::factory()->create(['max_stores' => 2, 'max_products_per_store' => 500, 'max_users_per_store' => 20]);
        $this->user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'plan_id' => $plan->id,
            'plan_is_active' => 1,
            'plan_expire_date' => now()->addYear(),
            'onboarded_at' => now(),
        ]);
        $this->store = Store::factory()->create(['user_id' => $this->user->id, 'slug' => 'media-store-' . uniqid()]);
        $this->storeB = Store::factory()->create(['user_id' => $this->user->id, 'slug' => 'media-store-b-' . uniqid()]);
        $this->user->forceFill(['current_store' => $this->store->id])->save();

        $role = \App\Models\Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label' => 'Company']);
        $role->syncPermissions(\Spatie\Permission\Models\Permission::all());
        $this->user->assignRole($role);
        $this->user->givePermissionTo(\Spatie\Permission\Models\Permission::all());
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->actingAs($this->user->fresh());
    }

    private function pngBody(): string
    {
        return base64_decode(self::PNG_B64, true);
    }

    /** Register fake responses for the given remote image URLs (silent on others). */
    private function fakeImages(array $urls, string $body = null): void
    {
        $map = [];
        foreach ($urls as $url) {
            $map[$url] = Http::response($body ?? $this->pngBody(), 200, ['Content-Type' => 'image/png']);
        }
        Http::fake($map);
    }

    private function csvFile(string $content): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('products.csv', $content);
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
        $strategy = $options['strategy'] ?? 'create_only';
        [$confirmRes, $body] = $this->confirm($batchId, $strategy);
        $this->assertSame(200, $confirmRes->status());

        return $body;
    }

    private function storeFiles(int $storeId): array
    {
        return Storage::disk('public')->files('products/' . $storeId);
    }

    private function firstProduct(string $sku): Product
    {
        return Product::where('store_id', $this->store->id)->where('sku', $sku)->firstOrFail();
    }

    /** Assert a source URL was fetched exactly once across the whole flow. */
    private function assertSingleFetch(string $url): void
    {
        $count = collect(Http::recorded())->filter(fn ($pair) => $pair[0]->url() === $url)->count();
        $this->assertSame(1, $count, "expected exactly one fetch of {$url}");
    }

    /* ----------------------- cover + gallery create ----------------------- */

    public function test_import_ingests_cover_image_as_local_store_scoped_file(): void
    {
        $url = 'https://cdn.example/main.png';
        $this->fakeImages([$url]);

        $file = $this->csvFile("name,sku,price,image_url\nقميص أحمر,MC-1,89.90,{$url}\n");
        $result = $this->importAndConfirm($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url']);

        $this->assertSame('completed', $result['status']);
        $this->assertEquals(1, $result['created']);
        $this->assertEquals(0, $result['failed']);
        $this->assertEquals(0, $result['media_warnings']);

        $product = $this->firstProduct('MC-1');
        $this->assertStringStartsWith('products/' . $this->store->id . '/', $product->cover_image, 'cover must be local, store-scoped');
        $this->assertStringNotContainsString('cdn.example', $product->cover_image, 'remote URL must never be persisted');
        $this->assertSame($product->cover_image, $product->images);
        $this->assertTrue(Storage::disk('public')->exists($product->cover_image));
        $this->assertSame($this->pngBody(), Storage::disk('public')->get($product->cover_image));
        $this->assertSingleFetch($url);
    }

    public function test_gallery_images_ingested_in_order_after_cover(): void
    {
        $cover = 'https://cdn.example/cover.png';
        $g1 = 'https://cdn.example/gallery-1.png';
        $g2 = 'https://cdn.example/gallery-2.png';
        $this->fakeImages([$cover, $g1, $g2]);

        $file = $this->csvFile("name,sku,price,image_url,gallery_images\nقميص,MC-2,50,{$cover},{$g1}|{$g2}\n");
        $result = $this->importAndConfirm($file, [
            'name' => 'name', 'sku' => 'sku', 'price' => 'price',
            'image_url' => 'image_url', 'gallery_images' => 'gallery_images',
        ]);

        $this->assertEquals(0, $result['media_warnings']);
        $product = $this->firstProduct('MC-2');
        $parts = explode(',', $product->images);

        $this->assertCount(3, $parts);
        $this->assertSame($product->cover_image, $parts[0], 'cover is always the first image');
        $this->assertStringStartsWith('products/' . $this->store->id . '/', $parts[0]);
        $this->assertStringStartsWith('products/' . $this->store->id . '/', $parts[1]);
        $this->assertStringStartsWith('products/' . $this->store->id . '/', $parts[2]);
        $this->assertNotSame($parts[0], $parts[1]);
        $this->assertNotSame($parts[1], $parts[2]);
        foreach ($parts as $p) {
            $this->assertTrue(Storage::disk('public')->exists($p));
        }
        $this->assertSingleFetch($cover);
        $this->assertSingleFetch($g1);
        $this->assertSingleFetch($g2);
    }

    public function test_gallery_url_duplicated_with_cover_is_fetched_once(): void
    {
        $cover = 'https://cdn.example/main.png';
        // The same URL appears as cover AND twice as gallery entries.
        $this->fakeImages([$cover]);

        $file = $this->csvFile("name,sku,price,image_url,gallery_images\nقميص,MC-3,50,{$cover},{$cover}|{$cover}\n");
        $result = $this->importAndConfirm($file, [
            'name' => 'name', 'sku' => 'sku', 'price' => 'price',
            'image_url' => 'image_url', 'gallery_images' => 'gallery_images',
        ]);

        // Duplicated gallery entries collapse into the single cover image.
        $this->assertEquals(0, $result['media_warnings']);
        $product = $this->firstProduct('MC-3');
        $this->assertCount(1, explode(',', $product->images));
        $this->assertSame($product->cover_image, explode(',', $product->images)[0]);
        $this->assertTrue(Storage::disk('public')->exists($product->cover_image));
        $this->assertSingleFetch($cover);
    }

    /* ----------------------- variant images ----------------------- */

    public function test_variant_image_attached_to_correct_combination(): void
    {
        $red = 'https://cdn.example/v-red.png';
        $blue = 'https://cdn.example/v-blue.png';
        $this->fakeImages([$red, $blue]);

        $file = $this->csvFile(
            "sku,name,price,option1_name,option1_value,variant_sku,variant_price,variant_stock,variant_image\n" .
            "VP-1,قميص,100,اللون,أحمر,VP-1-RED,110,5,{$red}\n" .
            "VP-1,قميص,100,اللون,أزرق,VP-1-BLUE,120,3,{$blue}\n"
        );
        $result = $this->importAndConfirm($file, [
            'sku' => 'sku', 'name' => 'name', 'price' => 'price',
            'option1_name' => 'option1_name', 'option1_value' => 'option1_value',
            'variant_sku' => 'variant_sku', 'variant_price' => 'variant_price',
            'variant_stock' => 'variant_stock', 'variant_image' => 'variant_image',
        ]);

        $this->assertEquals(1, $result['created']);
        $this->assertEquals(0, $result['failed']);
        $this->assertEquals(0, $result['media_warnings']);

        $product = $this->firstProduct('VP-1');
        $this->assertSame('variant', $product->inventory_mode);
        $this->assertCount(2, $product->variant_combinations);
        foreach ($product->variant_combinations as $combo) {
            $this->assertArrayHasKey('uuid', $combo);
            $this->assertArrayHasKey('image', $combo, 'imported variant combo must carry a local image');
            $this->assertStringStartsWith('products/' . $this->store->id . '/', $combo['image']);
            $this->assertStringNotContainsString('cdn.example', $combo['image'], 'variant image must be local, not the source URL');
            $this->assertArrayNotHasKey('image_url', $combo, 'source URL must never be persisted in the combo');
            $this->assertTrue(Storage::disk('public')->exists($combo['image']));
        }
        $this->assertSingleFetch($red);
        $this->assertSingleFetch($blue);
    }

    /* ----------------------- non-blocking failures ----------------------- */

    public function test_unavailable_cover_is_warning_and_product_imports_without_image(): void
    {
        $cover = 'https://cdn.example/missing.png';
        Http::fake([
            $cover => Http::response('Not Found', 404),
        ]);

        $file = $this->csvFile("name,sku,price,image_url\nقميص,MC-4,10,{$cover}\n");
        $result = $this->importAndConfirm($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url']);

        $this->assertSame('completed', $result['status'], 'media failure must not fail the row');
        $this->assertEquals(1, $result['created']);
        $this->assertEquals(1, $result['media_warnings']);

        $product = $this->firstProduct('MC-4');
        $this->assertSame('', $product->cover_image, 'failed import must never persist the remote URL');
        $this->assertSame('', $product->images);
    }

    public function test_blocked_url_is_never_requested_and_warns(): void
    {
        $evil = 'http://127.0.0.1/steal.png';
        Http::fake([$evil => Http::response($this->pngBody(), 200, ['Content-Type' => 'image/png'])]);

        $file = $this->csvFile("name,sku,price,image_url\nقميص,MC-5,10,{$evil}\n");
        $result = $this->importAndConfirm($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url']);

        $this->assertEquals(1, $result['created']);
        $this->assertEquals(1, $result['media_warnings']);
        Http::assertNotSent(fn ($request) => str_contains($request->url(), '127.0.0.1'));

        $product = $this->firstProduct('MC-5');
        $this->assertSame('', $product->cover_image);
    }

    public function test_partial_gallery_failure_keeps_successful_images(): void
    {
        $cover = 'https://cdn.example/cover.png';
        $good = 'https://cdn.example/good.png';
        $bad = 'https://cdn.example/bad.png';
        Http::fake([
            $cover => Http::response($this->pngBody(), 200, ['Content-Type' => 'image/png']),
            $good => Http::response($this->pngBody(), 200, ['Content-Type' => 'image/png']),
            $bad => Http::response('Not Found', 404),
        ]);

        $file = $this->csvFile("name,sku,price,image_url,gallery_images\nقميص,MC-6,10,{$cover},{$good}|{$bad}\n");
        $result = $this->importAndConfirm($file, [
            'name' => 'name', 'sku' => 'sku', 'price' => 'price',
            'image_url' => 'image_url', 'gallery_images' => 'gallery_images',
        ]);

        $this->assertEquals(1, $result['created']);
        $this->assertEquals(1, $result['media_warnings']);

        $product = $this->firstProduct('MC-6');
        $this->assertCount(2, explode(',', $product->images), 'cover + good image survive the bad one');
        $this->assertEquals($product->cover_image, explode(',', $product->images)[0]);
        $this->assertTrue(Storage::disk('public')->exists(explode(',', $product->images)[1]));
    }

    /* ----------------------- preview must not download ----------------------- */

    public function test_preview_does_not_download_or_store_media(): void
    {
        $cover = 'https://cdn.example/main.png';
        $this->fakeImages([$cover]);

        $file = $this->csvFile("name,sku,price,image_url\nقميص,MC-7,10,{$cover}\n");
        [$res, $body] = $this->preview($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url']);

        $this->assertSame(200, $res->status());
        $this->assertEquals(1, $body['summary']['valid']);
        Http::assertNothingSent('preview must never fetch remote media');
        $this->assertCount(0, $this->storeFiles($this->store->id));
        $this->assertEquals(0, Product::where('store_id', $this->store->id)->count());
    }

    /* ----------------------- idempotency / retry ----------------------- */

    public function test_reconfirm_does_not_redownload_and_keeps_same_files(): void
    {
        $cover = 'https://cdn.example/cover.png';
        $g1 = 'https://cdn.example/g1.png';
        $this->fakeImages([$cover, $g1]);

        $file = $this->csvFile("name,sku,price,image_url,gallery_images\nقميص,MC-8,10,{$cover},{$g1}\n");

        [$previewRes] = $this->preview($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url', 'gallery_images' => 'gallery_images']);
        $batchId = (int) $previewRes->json('batch_id');

        [$firstRes, $first] = $this->confirm($batchId, 'create_only');
        $this->assertSame(200, $firstRes->status());
        $this->assertEquals(1, $first['created']);

        $product = $this->firstProduct('MC-8');
        $expectedImages = explode(',', $product->images);

        [$secondRes, $second] = $this->confirm($batchId, 'create_only');
        $this->assertSame(200, $secondRes->status());
        $this->assertEquals(1, $second['created'], 'idempotent second confirm reports persisted first-run counts');
        $this->assertEquals(0, $second['media_warnings']);

        $this->assertSame($expectedImages, explode(',', $this->firstProduct('MC-8')->images), 'images must not be re-ingested');
        $this->assertSingleFetch($cover);
        $this->assertSingleFetch($g1);
        $this->assertCount(2, $this->storeFiles($this->store->id), 'no duplicate files on retry');
    }

    /* ----------------------- update_by_sku semantics ----------------------- */

    public function test_update_by_sku_replaces_media_on_success_and_keeps_on_failure(): void
    {
        $previous = 'products/' . $this->store->id . '/previous.png';
        $this->productInStore('UP-M', ['cover_image' => $previous, 'images' => $previous]);

        // Success: a new valid URL replaces the old local media.
        // Failure: an unavailable URL must keep the previously-valid media
        // and must never store the remote URL string. Both are faked up
        // front because re-calling Http::fake() wipes recorded transactions.
        $newUrl = 'https://cdn.example/new.png';
        $badUrl = 'https://cdn.example/gone.png';
        Http::fake([
            $newUrl => Http::response($this->pngBody(), 200, ['Content-Type' => 'image/png']),
            $badUrl => Http::response('Not Found', 404),
        ]);
        $file = $this->csvFile("name,sku,image_url\nمنتج محدث,UP-M,{$newUrl}\n");
        $result = $this->importAndConfirm($file, ['name' => 'name', 'sku' => 'sku', 'image_url' => 'image_url'], ['strategy' => 'update_by_sku']);

        $this->assertEquals(0, $result['created']);
        $this->assertEquals(1, $result['updated']);
        $this->assertEquals(0, $result['media_warnings']);

        $product = $this->firstProduct('UP-M');
        $this->assertSame('منتج محدث', $product->name);
        $this->assertNotSame($previous, $product->cover_image, 'new media must replace the old');
        $this->assertStringStartsWith('products/' . $this->store->id . '/', $product->cover_image);
        $this->assertTrue(Storage::disk('public')->exists($product->cover_image));
        $afterFirstUpdate = $product->cover_image;

        $file2 = $this->csvFile("name,sku,image_url\nمنتج محدث,UP-M,{$badUrl}\n");
        $result2 = $this->importAndConfirm($file2, ['name' => 'name', 'sku' => 'sku', 'image_url' => 'image_url'], ['strategy' => 'update_by_sku']);

        $this->assertEquals(1, $result2['updated']);
        $this->assertEquals(1, $result2['media_warnings']);

        $product->refresh();
        $this->assertNotSame($badUrl, $product->cover_image, 'remote URL must never be persisted on update');
        $this->assertSame($afterFirstUpdate, $product->cover_image, 'existing valid media kept when the new one fails');
        $this->assertStringStartsWith('products/' . $this->store->id . '/', $product->cover_image);
        $this->assertSingleFetch($newUrl);
        $this->assertSingleFetch($badUrl);
    }

    /* ----------------------- validation ----------------------- */

    public function test_gallery_over_limit_reported_at_preview(): void
    {
        $urls = [];
        for ($i = 1; $i <= 11; $i++) {
            $urls[] = "https://cdn.example/g{$i}.png";
        }
        $file = $this->csvFile("name,sku,price,gallery_images\nقميص,MC-9,10," . implode('|', $urls) . "\n");
        [$res, $body] = $this->preview($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'gallery_images' => 'gallery_images']);

        $this->assertSame(200, $res->status());
        $this->assertEquals(1, $body['summary']['errors']);
        $reasons = collect($body['errors'][0]['errors'] ?? [])->pluck('reason')->implode(' ');
        $this->assertStringContainsString('10 صور', $reasons);
        Http::assertNothingSent();
    }

    /* ----------------------- compatibility ----------------------- */

    public function test_simple_import_without_media_columns_unchanged(): void
    {
        $file = $this->csvFile("name,sku,price,stock\nقميص,MC-10,40,7\n");
        $result = $this->importAndConfirm($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'stock' => 'stock']);

        $this->assertSame('completed', $result['status']);
        $this->assertEquals(1, $result['created']);
        $this->assertEquals(0, $result['media_warnings']);
        Http::assertNothingSent('no media columns must not trigger any fetch');

        $product = $this->firstProduct('MC-10');
        $this->assertSame('', $product->cover_image);
        $this->assertSame('', $product->images);
        $this->assertEquals(7, (int) $product->stock);
    }

    /* ----------------------- tenant isolation ----------------------- */

    public function test_media_is_stored_only_under_own_store_path(): void
    {
        $urlA = 'https://cdn.example/a.png';
        $urlB = 'https://cdn.example/b.png';
        $this->fakeImages([$urlA, $urlB]);

        $fileA = $this->csvFile("name,sku,price,image_url\nمنتج أ,ISO-A,10,{$urlA}\n");
        $this->importAndConfirm($fileA, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url']);

        $productA = $this->firstProduct('ISO-A');
        $this->assertStringStartsWith('products/' . $this->store->id . '/', $productA->cover_image);
        $this->assertCount(1, $this->storeFiles($this->store->id));
        $this->assertCount(0, $this->storeFiles($this->storeB->id), 'no cross-store file bleed');

        // Second store imports its own image under its own path.
        $this->user->forceFill(['current_store' => $this->storeB->id])->save();
        $this->actingAs($this->user->fresh());
        $fileB = $this->csvFile("name,sku,price,image_url\nمنتج ب,ISO-B,20,{$urlB}\n");
        [$previewRes] = $this->preview($fileB, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url']);
        $this->confirm((int) $previewRes->json('batch_id'), 'create_only');

        $productB = Product::where('store_id', $this->storeB->id)->where('sku', 'ISO-B')->firstOrFail();
        $this->assertStringStartsWith('products/' . $this->storeB->id . '/', $productB->cover_image);
        $this->assertCount(1, $this->storeFiles($this->storeB->id));
        $this->assertCount(1, $this->storeFiles($this->store->id), 'store A files untouched by store B import');
    }

    /* ----------------------- local store-owned media references ----------------------- */

    public function test_same_store_existing_local_image_accepted_with_zero_http(): void
    {
        $ref = 'products/' . $this->store->id . '/existing.png';
        Storage::disk('public')->put($ref, $this->pngBody());
        Http::fake();

        $file = $this->csvFile("name,sku,price,image_url\nقميص,LC-1,20,{$ref}\n");
        $result = $this->importAndConfirm($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url']);

        $this->assertSame('completed', $result['status']);
        $this->assertEquals(1, $result['created']);
        $this->assertEquals(0, $result['media_warnings']);

        $product = $this->firstProduct('LC-1');
        $this->assertSame($ref, $product->cover_image, 'existing local image must be referenced as-is');
        $this->assertSame($ref, $product->images);
        Http::assertNothingSent('an existing local reference must never be downloaded');
    }

    public function test_same_store_missing_local_image_warns_and_is_not_persisted(): void
    {
        $ref = 'products/' . $this->store->id . '/missing.png';
        Storage::fake('public'); // nothing exists on the fake disk
        Http::fake();

        $file = $this->csvFile("name,sku,price,image_url\nقميص,LC-2,20,{$ref}\n");
        $result = $this->importAndConfirm($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url']);

        $this->assertSame('completed', $result['status'], 'media failure must not fail the row');
        $this->assertEquals(1, $result['created']);
        $this->assertEquals(1, $result['media_warnings']);

        $product = $this->firstProduct('LC-2');
        $this->assertSame('', $product->cover_image, 'a missing local reference must never be persisted as media');
        $this->assertSame('', $product->images);
        Http::assertNothingSent('a missing local reference must never trigger a remote fetch');
    }

    public function test_foreign_store_local_reference_rejected_at_preview(): void
    {
        $ref = 'products/' . $this->storeB->id . '/evil.png';
        Http::fake();

        $file = $this->csvFile("name,sku,price,image_url\nقميص,LC-3,20,{$ref}\n");
        [$res, $body] = $this->preview($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url']);

        $this->assertSame(200, $res->status());
        $this->assertEquals(1, $body['summary']['errors']);
        $reasons = collect($body['errors'][0]['errors'] ?? [])->pluck('reason')->implode(' ');
        $this->assertStringContainsString('رابط الصورة غير صالح', $reasons);
        Http::assertNothingSent();
    }

    public function test_local_dotdot_traversal_rejected_at_preview(): void
    {
        $ref = 'products/' . $this->store->id . '/../../outside.png';
        Http::fake();

        $file = $this->csvFile("name,sku,price,image_url\nقميص,LC-4,20,{$ref}\n");
        [$res, $body] = $this->preview($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url']);

        $this->assertSame(200, $res->status());
        $this->assertEquals(1, $body['summary']['errors']);
        $this->assertCount(0, $this->storeFiles($this->store->id));
        Http::assertNothingSent();
    }

    public function test_encoded_path_abuse_warns_and_never_persists_media(): void
    {
        // %2e%2e is not a literal '..' so the string check passes, but the file
        // does not exist on the canonical disk — fail closed, never persisted.
        $ref = 'products/' . $this->store->id . '/%2e%2e/evil.png';
        Http::fake();

        $file = $this->csvFile("name,sku,price,image_url\nقميص,LC-5,20,{$ref}\n");
        $result = $this->importAndConfirm($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url']);

        $this->assertEquals(1, $result['created']);
        $this->assertEquals(1, $result['media_warnings']);

        $product = $this->firstProduct('LC-5');
        $this->assertSame('', $product->cover_image);
        $this->assertSame('', $product->images);
        Http::assertNothingSent();
    }

    public function test_absolute_filesystem_path_rejected_at_preview(): void
    {
        $ref = 'C:\\Windows\\system32\\evil.png';
        Http::fake();

        $file = $this->csvFile("name,sku,price,image_url\nقميص,LC-6,20,{$ref}\n");
        [$res, $body] = $this->preview($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url']);

        $this->assertSame(200, $res->status());
        $this->assertEquals(1, $body['summary']['errors']);
        Http::assertNothingSent();
    }

    public function test_separator_and_drive_path_rejected_at_preview(): void
    {
        $ref = '/etc/passwd';
        Http::fake();

        $file = $this->csvFile("name,sku,price,gallery_images\nقميص,LC-7,20,{$ref}\n");
        [$res, $body] = $this->preview($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'gallery_images' => 'gallery_images']);

        $this->assertSame(200, $res->status());
        $this->assertEquals(1, $body['summary']['errors']);
        $reasons = collect($body['errors'][0]['errors'] ?? [])->pluck('reason')->implode(' ');
        $this->assertStringContainsString('أحد روابط صور المعرض غير صالح', $reasons);
        Http::assertNothingSent();
    }

    public function test_local_gallery_media_roundtrip(): void
    {
        $cover = 'products/' . $this->store->id . '/cover.png';
        $g1 = 'products/' . $this->store->id . '/g1.png';
        $g2 = 'products/' . $this->store->id . '/g2.png';
        Storage::disk('public')->put($cover, $this->pngBody());
        Storage::disk('public')->put($g1, $this->pngBody());
        Storage::disk('public')->put($g2, $this->pngBody());
        Http::fake();

        $file = $this->csvFile("name,sku,price,image_url,gallery_images\nقميص,LC-8,20,{$cover},{$g1}|{$g2}\n");
        $result = $this->importAndConfirm($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url', 'gallery_images' => 'gallery_images']);

        $this->assertEquals(0, $result['media_warnings']);
        $product = $this->firstProduct('LC-8');
        $parts = explode(',', $product->images);
        $this->assertSame([$cover, $g1, $g2], $parts);
        $this->assertSame($cover, $product->cover_image);
        Http::assertNothingSent();
    }

    public function test_local_variant_image_roundtrip(): void
    {
        $img = 'products/' . $this->store->id . '/variant.png';
        Storage::disk('public')->put($img, $this->pngBody());
        Http::fake();

        $file = $this->csvFile(
            "sku,name,price,option1_name,option1_value,variant_sku,variant_price,variant_stock,variant_image\n" .
            "LV-1,قميص,100,اللون,أحمر,LV-1-RED,110,5,{$img}\n"
        );
        $result = $this->importAndConfirm($file, [
            'sku' => 'sku', 'name' => 'name', 'price' => 'price',
            'option1_name' => 'option1_name', 'option1_value' => 'option1_value',
            'variant_sku' => 'variant_sku', 'variant_price' => 'variant_price',
            'variant_stock' => 'variant_stock', 'variant_image' => 'variant_image',
        ]);

        $this->assertEquals(1, $result['created']);
        $this->assertEquals(0, $result['media_warnings']);
        $product = $this->firstProduct('LV-1');
        $this->assertCount(1, $product->variant_combinations);
        $this->assertSame($img, $product->variant_combinations[0]['image'] ?? null);
        Http::assertNothingSent();
    }

    public function test_no_duplicate_media_after_repeated_update_by_sku(): void
    {
        $ref = 'products/' . $this->store->id . '/existing.png';
        Storage::disk('public')->put($ref, $this->pngBody());
        Http::fake();
        $this->productInStore('LC-9');

        $file = $this->csvFile("name,sku,price,image_url\nقميص,LC-9,20,{$ref}\n");
        $mapping = ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'image_url' => 'image_url'];

        $first = $this->importAndConfirm($file, $mapping, ['strategy' => 'update_by_sku']);
        $this->assertEquals(1, $first['updated']);
        $this->assertEquals(0, $first['media_warnings']);
        $imagesAfterFirst = $this->firstProduct('LC-9')->images;

        $second = $this->importAndConfirm($file, $mapping, ['strategy' => 'update_by_sku']);
        $this->assertEquals(1, $second['updated']);
        $this->assertEquals(0, $second['media_warnings']);

        $product = $this->firstProduct('LC-9');
        $this->assertSame($imagesAfterFirst, $product->images, 'repeated update_by_sku must keep the same media reference');
        $this->assertCount(1, $this->storeFiles($this->store->id), 'no duplicate files may be created on re-import');
        Http::assertNothingSent();
    }

    private function productInStore(string $sku, array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $this->store->id,
            'sku' => $sku,
            'name' => 'منتج ' . $sku,
            'price' => 50,
            'stock' => 10,
            'inventory_mode' => 'product',
            'cover_image' => '',
            'images' => '',
            'variants' => [],
            'variant_combinations' => [],
        ], $overrides));
    }
}