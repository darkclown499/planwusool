<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ProductRoundtripTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Store $store;
    private Store $storeB;

    protected function setUp(): void
    {
        parent::setUp();
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
        $this->store = Store::factory()->create(['user_id' => $this->user->id, 'slug' => 'roundtrip-store-' . uniqid()]);
        $this->storeB = Store::factory()->create(['user_id' => $this->user->id, 'slug' => 'roundtrip-store-b-' . uniqid()]);
        $this->user->forceFill(['current_store' => $this->store->id])->save();

        $role = \App\Models\Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label' => 'Company']);
        $role->syncPermissions(\Spatie\Permission\Models\Permission::all());
        $this->user->assignRole($role);
        $this->user->givePermissionTo(\Spatie\Permission\Models\Permission::all());
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->actingAs($this->user->fresh());
    }

    private function csvFile(string $content, string $name = 'products.csv'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, $content);
    }

    private function productInStore(array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $this->store->id,
            'is_active' => true,
            'price' => 50,
            'stock' => 10,
            'inventory_mode' => 'product',
            'variants' => [],
            'variant_combinations' => [],
            'cover_image' => null,
            'images' => null,
        ], $overrides));
    }

    private function exportCsv(): string
    {
        $res = $this->get(route('products.export'));
        $this->assertEquals(200, $res->getStatusCode());
        $content = $res->streamedContent();
        // Strip BOM for easier assertion
        return preg_replace('/^\xEF\xBB\xBF/', '', $content);
    }

    private function importCsv(string $csvContent, string $strategy = 'update_by_sku'): array
    {
        $file = $this->csvFile($csvContent);
        // Parse headers to build mapping
        $lines = explode("\n", trim($csvContent));
        $headers = str_getcsv(array_shift($lines));
        // Map each header to itself (canonical field name)
        $mapping = [];
        foreach ($headers as $h) {
            $mapping[$h] = $h;
        }

        // Preview
        $previewRes = $this->post(route('products.import.preview'), [
            'file' => $file,
            'mapping' => json_encode($mapping),
            'options' => json_encode(['strategy' => $strategy, 'create_categories' => true]),
        ]);
        if ($previewRes->status() !== 200) {
            return ['success' => false, 'preview' => $previewRes->json()];
        }
        $batchId = (int) $previewRes->json('batch_id');

        // Confirm
        $confirmRes = $this->post(route('products.import.confirm'), [
            'batch_id' => $batchId,
            'strategy' => $strategy,
        ]);

        return ['success' => $confirmRes->status() === 200, 'result' => $confirmRes->json()];
    }

    /* ---------------------------- tests ---------------------------- */

    public function test_simple_product_export_import_roundtrip(): void
    {
        $this->productInStore([
            'sku' => 'RT-001',
            'name' => 'تيشيرت قطني',
            'price' => 89.90,
            'stock' => 25,
            'is_active' => true,
            'barcode' => '6250001234567',
            'description' => 'تيشيرت مريح للاستخدام اليومي',
        ]);

        $csv = $this->exportCsv();
        $this->assertStringContainsString('name,sku,barcode', $csv);
        $this->assertStringContainsString('RT-001', $csv);
        $this->assertStringContainsString('89.90', $csv);
        $this->assertStringContainsString('active', $csv);

        // Re-import with update_by_sku
        $result = $this->importCsv($csv, 'update_by_sku');
        $this->assertTrue($result['success']);
        $this->assertEquals(1, $result['result']['updated'] ?? 0);

        // Verify no data loss
        $product = Product::where('store_id', $this->store->id)->where('sku', 'RT-001')->first();
        $this->assertNotNull($product);
        $this->assertEquals('تيشيرت قطني', $product->name);
        $this->assertEquals(89.90, (float) $product->price);
        $this->assertEquals(25, (int) $product->stock);
        $this->assertTrue((bool) $product->is_active);
        $this->assertSame('6250001234567', $product->barcode);
        $this->assertSame('تيشيرت مريح للاستخدام اليومي', $product->description);
    }

    public function test_price_exactness_roundtrip(): void
    {
        $this->productInStore(['sku' => 'P-EXACT', 'price' => 1234.56, 'sale_price' => 999.99]);

        $csv = $this->exportCsv();
        $this->assertStringContainsString('1234.56', $csv);
        $this->assertStringContainsString('999.99', $csv);

        $result = $this->importCsv($csv, 'update_by_sku');
        $this->assertTrue($result['success']);

        $product = Product::where('store_id', $this->store->id)->where('sku', 'P-EXACT')->first();
        $this->assertEquals(1234.56, (float) $product->price);
        $this->assertEquals(999.99, (float) $product->sale_price);
    }

    public function test_null_sale_price_roundtrip(): void
    {
        $this->productInStore(['sku' => 'P-NO-SALE', 'price' => 50.00, 'sale_price' => null]);

        $csv = $this->exportCsv();
        $lines = explode("\n", trim($csv));
        $header = str_getcsv($lines[0]);
        $data = str_getcsv($lines[1]);
        $saleIdx = array_search('compare_at_price', $header);
        $this->assertNotFalse($saleIdx);
        $this->assertSame('', $data[$saleIdx], 'null sale_price must export as empty');

        $result = $this->importCsv($csv, 'update_by_sku');
        $this->assertTrue($result['success']);

        $product = Product::where('store_id', $this->store->id)->where('sku', 'P-NO-SALE')->first();
        $this->assertNull($product->sale_price);
    }

    public function test_status_roundtrip(): void
    {
        $this->productInStore(['sku' => 'S-ACT', 'is_active' => true]);
        $this->productInStore(['sku' => 'S-INACT', 'is_active' => false]);

        $csv = $this->exportCsv();
        $this->assertStringContainsString('active', $csv);
        $this->assertStringContainsString('inactive', $csv);
        $this->assertStringNotContainsString('Active', $csv);
        $this->assertStringNotContainsString('Inactive', $csv);

        $result = $this->importCsv($csv, 'update_by_sku');
        $this->assertTrue($result['success']);

        $this->assertTrue((bool) Product::where('store_id', $this->store->id)->where('sku', 'S-ACT')->first()->is_active);
        $this->assertFalse((bool) Product::where('store_id', $this->store->id)->where('sku', 'S-INACT')->first()->is_active);
    }

    public function test_barcode_roundtrip(): void
    {
        $this->productInStore(['sku' => 'BC-1', 'barcode' => '6291041500213']);
        $this->productInStore(['sku' => 'BC-2', 'barcode' => null]);

        $csv = $this->exportCsv();
        $this->assertStringContainsString('6291041500213', $csv);

        $result = $this->importCsv($csv, 'update_by_sku');
        $this->assertTrue($result['success']);

        $this->assertSame('6291041500213', Product::where('store_id', $this->store->id)->where('sku', 'BC-1')->first()->barcode);
        $this->assertNull(Product::where('store_id', $this->store->id)->where('sku', 'BC-2')->first()->barcode);
    }

    public function test_description_with_special_chars_roundtrip(): void
    {
        $desc = "Product, with commas\nand newlines\r\nand \"quotes\"";
        $this->productInStore(['sku' => 'DESC-1', 'description' => $desc]);

        $csv = $this->exportCsv();
        // Verify CSV quoting preserved the description
        $this->assertStringContainsString('DESC-1', $csv);

        $result = $this->importCsv($csv, 'update_by_sku');
        $this->assertTrue($result['success']);

        $product = Product::where('store_id', $this->store->id)->where('sku', 'DESC-1')->first();
        // CSV parsing normalises \r\n to \n — this is standard CSV behaviour, not data loss
        $this->assertSame(str_replace("\r\n", "\n", $desc), str_replace("\r\n", "\n", $product->description));
    }

    public function test_variants_roundtrip(): void
    {
        $this->productInStore([
            'sku' => 'V-1',
            'name' => 'قميص رياضي',
            'price' => 100,
            'inventory_mode' => 'variant',
            'variants' => [['name' => 'اللون', 'values' => ['أحمر', 'أزرق']]],
            'variant_combinations' => [
                ['uuid' => 'v1', 'values' => ['أحمر'], 'sku' => 'V-1-RED', 'price' => '110', 'stock' => '5'],
                ['uuid' => 'v2', 'values' => ['أزرق'], 'sku' => 'V-1-BLUE', 'price' => '120', 'stock' => '3'],
            ],
            'stock' => 8,
        ]);

        $csv = $this->exportCsv();
        $lines = explode("\n", trim($csv));
        // Should have header + 2 variant rows
        $this->assertCount(3, $lines);

        $result = $this->importCsv($csv, 'update_by_sku');
        $this->assertTrue($result['success']);

        $product = Product::where('store_id', $this->store->id)->where('sku', 'V-1')->first();
        $this->assertSame('variant', $product->inventory_mode);
        $this->assertCount(2, $product->variant_combinations);

        $skus = array_column($product->variant_combinations, 'sku');
        $this->assertContains('V-1-RED', $skus);
        $this->assertContains('V-1-BLUE', $skus);
    }

    public function test_variant_detail_roundtrip(): void
    {
        $this->productInStore([
            'sku' => 'VD-1',
            'price' => 60,
            'inventory_mode' => 'variant',
            'variants' => [['name' => 'المقاس', 'values' => ['S', 'L']]],
            'variant_combinations' => [
                ['uuid' => 'vd1', 'values' => ['S'], 'sku' => 'VD-1-S', 'price' => '60', 'stock' => '10'],
                ['uuid' => 'vd2', 'values' => ['L'], 'sku' => 'VD-1-L', 'price' => '65', 'stock' => '2'],
            ],
            'stock' => 12,
        ]);

        $csv = $this->exportCsv();
        $result = $this->importCsv($csv, 'update_by_sku');
        $this->assertTrue($result['success']);

        $product = Product::where('store_id', $this->store->id)->where('sku', 'VD-1')->first();
        $combos = $product->variant_combinations;
        $this->assertCount(2, $combos);

        $sCombo = collect($combos)->firstWhere('sku', 'VD-1-S');
        $this->assertEquals('60', $sCombo['price']);
        $this->assertEquals('10', $sCombo['stock']);

        $lCombo = collect($combos)->firstWhere('sku', 'VD-1-L');
        $this->assertEquals('65', $lCombo['price']);
        $this->assertEquals('2', $lCombo['stock']);
    }

    public function test_no_duplicate_on_reimport(): void
    {
        $this->productInStore(['sku' => 'DUP-1', 'name' => 'أصلي', 'price' => 50]);

        $csv = $this->exportCsv();
        $countBefore = Product::where('store_id', $this->store->id)->count();

        $result = $this->importCsv($csv, 'update_by_sku');
        $this->assertTrue($result['success']);

        $countAfter = Product::where('store_id', $this->store->id)->count();
        $this->assertEquals($countBefore, $countAfter, 're-import must not create duplicates');
    }

    public function test_csv_injection_safety(): void
    {
        $this->productInStore(['sku' => '=SUM(A1)', 'name' => '+cmd', 'barcode' => '-5']);
        $this->productInStore(['sku' => '@RC', 'name' => 'normal']);

        $csv = $this->exportCsv();
        // Dangerous prefixes must be escaped with single quote
        $this->assertStringContainsString("'=SUM(A1)", $csv);
        $this->assertStringContainsString("'+cmd", $csv);
        $this->assertStringContainsString("'-5", $csv);
        $this->assertStringContainsString("'@RC", $csv);

        // Re-import must not execute formulas
        $result = $this->importCsv($csv, 'update_by_sku');
        $this->assertTrue($result['success']);
    }

    public function test_tenant_media_isolation(): void
    {
        // Create product with store-owned media reference
        $this->productInStore([
            'sku' => 'MEDIA-1',
            'cover_image' => 'products/' . $this->store->id . '/test.jpg',
            'images' => 'products/' . $this->store->id . '/test.jpg',
        ]);

        $csv = $this->exportCsv();
        $this->assertStringContainsString('products/' . $this->store->id . '/test.jpg', $csv);

        // Re-import with store-owned ref succeeds and retains the path
        $result = $this->importCsv($csv, 'update_by_sku');
        $this->assertTrue($result['success']);
        $product = Product::where('store_id', $this->store->id)->where('sku', 'MEDIA-1')->first();
        $this->assertNotNull($product);
        $this->assertSame('products/' . $this->store->id . '/test.jpg', $product->cover_image);

        // Foreign store reference in CSV must be rejected
        $foreignRef = 'products/' . $this->storeB->id . '/foreign.jpg';
        $lines = explode("\n", trim($csv));
        $header = str_getcsv($lines[0]);
        $data = str_getcsv($lines[1]);
        $imgIdx = array_search('image_url', $header);
        $data[$imgIdx] = $foreignRef;
        $tamperedCsv = implode("\n", [implode(',', $header), implode(',', $data)]);

        $result2 = $this->importCsv($tamperedCsv, 'update_by_sku');

        // TENANT-SAFETY INVARIANT: foreign ref must NOT be applied to the product
        $product = Product::where('store_id', $this->store->id)->where('sku', 'MEDIA-1')->first();
        $this->assertNotNull($product);
        $this->assertSame('products/' . $this->store->id . '/test.jpg', $product->cover_image);
        $this->assertStringNotContainsString((string) $this->storeB->id, (string) $product->cover_image);
    }

    public function test_category_roundtrip(): void
    {
        $cat = Category::factory()->create(['store_id' => $this->store->id, 'name' => 'إلكترونيات', 'is_active' => true]);
        $this->productInStore(['sku' => 'CAT-1', 'category_id' => $cat->id]);

        $csv = $this->exportCsv();
        $this->assertStringContainsString('إلكترونيات', $csv);

        $result = $this->importCsv($csv, 'update_by_sku');
        $this->assertTrue($result['success']);

        $product = Product::where('store_id', $this->store->id)->where('sku', 'CAT-1')->first();
        $this->assertEquals($cat->id, $product->category_id);
    }

    public function test_export_headers_match_import_template(): void
    {
        $res = $this->get(route('products.import.template'));
        $templateContent = preg_replace('/^\xEF\xBB\xBF/', '', $res->streamedContent());
        $templateHeaders = str_getcsv(explode("\n", $templateContent)[0]);

        $exportCsv = $this->exportCsv();
        $exportHeaders = str_getcsv(explode("\n", $exportCsv)[0]);

        $this->assertEquals($templateHeaders, $exportHeaders, 'Export headers must exactly match import template');
    }

    public function test_export_no_localized_strings(): void
    {
        $this->productInStore(['sku' => 'LOC-1', 'is_active' => true, 'sale_price' => null]);

        $csv = $this->exportCsv();
        // Must NOT contain localized UI strings
        $this->assertStringNotContainsString('Active', $csv);
        $this->assertStringNotContainsString('Inactive', $csv);
        $this->assertStringNotContainsString('Not set', $csv);
        $this->assertStringNotContainsString('Uncategorized', $csv);
        $this->assertStringNotContainsString('No variants', $csv);
        // Must NOT contain currency symbols
        $this->assertStringNotContainsString('₪', $csv);
        $this->assertStringNotContainsString('$', $csv);
    }
}
