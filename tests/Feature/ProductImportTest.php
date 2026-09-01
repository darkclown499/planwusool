<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductImportBatch;
use App\Models\Store;
use App\Models\User;
use App\Services\ProductImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ProductImportTest extends TestCase
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
        $this->store = Store::factory()->create(['user_id' => $this->user->id, 'slug' => 'import-store-' . uniqid()]);
        $this->storeB = Store::factory()->create(['user_id' => $this->user->id, 'slug' => 'import-store-b-' . uniqid()]);
        $this->user->forceFill(['current_store' => $this->store->id])->save();

        $role = \App\Models\Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web'], ['label' => 'Company']);
        $role->syncPermissions(\Spatie\Permission\Models\Permission::all());
        $this->user->assignRole($role);
        $this->user->givePermissionTo(\Spatie\Permission\Models\Permission::all());
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->actingAs($this->user->fresh());
    }

    /* ---------------------------- helpers ---------------------------- */

    private function csvFile(string $content, string $name = 'products.csv'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, $content);
    }

    private function xlsxFile(array $rows): UploadedFile
    {
        $tmp = tempnam(sys_get_temp_dir(), 'import') . '.xlsx';
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $i = 1;
        foreach ($rows as $row) {
            $col = 1;
            foreach ($row as $value) {
                $cell = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($col) . $i;
                $sheet->setCellValueExplicit($cell, (string) $value, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                $col++;
            }
            $i++;
        }
        (new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet))->save($tmp);
        $spreadsheet->disconnectWorksheets();

        return new UploadedFile($tmp, 'products.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
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

    private function simpleCsv(): UploadedFile
    {
        return $this->csvFile(
            "name,sku,price,stock,status\nقميص أحمر,SKU-1,89.90,25,active\nبنطال أسود,SKU-2,120.00,12,active\n"
        );
    }

    private function simpleMapping(): array
    {
        return ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'stock' => 'stock', 'status' => 'status'];
    }

    /* ---------------------------- endpoints ---------------------------- */

    public function test_template_downloads_valid_csv(): void
    {
        $res = $this->get(route('products.import.template'));
        $this->assertEquals(200, $res->getStatusCode());
        $this->assertStringContainsString('text/csv', $res->headers->get('Content-Type'));
        $this->assertStringContainsString('name,sku,barcode', substr($res->streamedContent(), 0, 200));
    }

    public function test_parse_returns_headers_and_suggested_mapping(): void
    {
        $res = $this->post(route('products.import.parse'), ['file' => $this->simpleCsv()]);
        $this->assertEquals(200, $res->status());
        $body = $res->json();
        $this->assertSame('csv', $body['file_type']);
        $this->assertContains('name', $body['headers']);
        $this->assertSame('name', $body['suggested_mapping']['name'] ?? null);
        $this->assertSame('price', $body['suggested_mapping']['price'] ?? null);
        $this->assertSame('sku', $body['suggested_mapping']['sku'] ?? null);
    }

    public function test_import_page_lists_own_history_only(): void
    {
        $this->productInStore($this->store, ['sku' => 'H1']);

        // Batch created for store A (via a preview).
        $this->importAndConfirm($this->simpleCsv(), $this->simpleMapping());

        ProductImportBatch::create([
            'store_id' => $this->storeB->id,
            'user_id' => $this->user->id,
            'original_filename' => 'other-store.csv',
            'file_type' => 'csv',
            'status' => 'previewed',
            'strategy' => 'create_only',
            'mapping' => [],
            'options' => [],
            'total_rows' => 1,
            'valid_rows' => 0,
            'warning_rows' => 0,
            'error_rows' => 1,
            'data' => '[]',
            'results' => '{}',
        ]);

        $res = $this->get(route('products.import'));
        $this->assertEquals(200, $res->status());
        $props = $res->viewData('page')['props'] ?? [];
        $filenames = array_column($props['history'], 'original_filename');
        $this->assertContains('products.csv', $filenames);
        $this->assertNotContains('other-store.csv', $filenames);
    }

    public function test_unauthorized_staff_blocked(): void
    {
        $staff = User::factory()->create([
            'type' => 'staff',
            'created_by' => $this->user->id,
            'current_store' => $this->store->id,
            'email_verified_at' => now(),
            'onboarded_at' => now(),
        ]);
        $roleName = 'staff_' . uniqid();
        $role = \App\Models\Role::create(['name' => $roleName, 'guard_name' => 'web', 'label' => 'Staff', 'created_by' => $this->user->id]);
        $role->syncPermissions([]);
        $staff->assignRole($role);
        $staff->forceFill(['type' => $roleName])->save();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->actingAs($staff->fresh());
        $res = $this->get(route('products.import'));
        $this->assertTrue(in_array($res->status(), [403, 302], true));

        $res2 = $this->post(route('products.import.preview'), ['file' => $this->simpleCsv(), 'mapping' => '{}']);
        $this->assertTrue(in_array($res2->status(), [403, 302], true));
    }

    /* ---------------------------- validation ---------------------------- */

    public function test_valid_csv_preview(): void
    {
        [$res, $body] = $this->preview($this->simpleCsv(), $this->simpleMapping());
        $this->assertEquals(200, $res->status());
        $this->assertEquals(2, $body['summary']['total']);
        $this->assertEquals(2, $body['summary']['valid']);
        $this->assertEquals(0, $body['summary']['errors']);
        $this->assertNotNull($body['batch_id']);
        $this->assertDatabaseHas('product_import_batches', ['store_id' => $this->store->id, 'status' => 'previewed']);
    }

    public function test_valid_xlsx_preview(): void
    {
        $rows = [[
            'name', 'sku', 'price', 'stock',
        ], [
            'منتج من إكسل', 'X1', '49.50', '8',
        ]];
        $file = $this->xlsxFile($rows);
        [$res, $body] = $this->preview($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'stock' => 'stock']);
        $this->assertEquals(200, $res->status());
        $this->assertEquals(1, $body['summary']['total']);
        $this->assertEquals(1, $body['summary']['valid']);

        // Full confirm round trip.
        [$confirmRes] = $this->confirm((int) $res->json('batch_id'), 'create_only');
        $this->assertEquals(200, $confirmRes->status());
        $this->assertDatabaseHas('products', ['store_id' => $this->store->id, 'sku' => 'X1', 'name' => 'منتج من إكسل']);
    }

    public function test_invalid_file_extension_rejected(): void
    {
        $file = $this->csvFile("name,price\nقلم,10\n", 'products.txt');
        [$res] = $this->preview($file, []);
        $this->assertEquals(422, $res->status());
        $this->assertStringContainsString('غير مدعومة', $res->json('error'));
        $this->assertDatabaseMissing('product_import_batches', ['store_id' => $this->store->id]);
    }

    public function test_oversized_file_rejected(): void
    {
        $file = UploadedFile::fake()->create('products.csv', 20481); // > 20 MB
        [$res] = $this->preview($file, []);
        $this->assertEquals(422, $res->status());
    }

    public function test_missing_name_reported(): void
    {
        $file = $this->csvFile("name,price\n,30\n");
        [$res, $body] = $this->preview($file, ['name' => 'name', 'price' => 'price']);
        $this->assertEquals(200, $res->status());
        $this->assertEquals(1, $body['summary']['errors']);
        $this->assertStringContainsString('اسم المنتج مطلوب', collect($body['errors'][0]['errors'] ?? [])->pluck('reason')->implode(' '));
    }

    public function test_invalid_price_reported(): void
    {
        $file = $this->csvFile("name,price\nقلم,abc\n");
        [$res, $body] = $this->preview($file, ['name' => 'name', 'price' => 'price']);
        $this->assertEquals(200, $res->status());
        $this->assertEquals(1, $body['summary']['errors']);
        $this->assertStringContainsString('السعر', collect($body['errors'][0]['errors'] ?? [])->pluck('reason')->implode(' '));
    }

    public function test_invalid_stock_reported(): void
    {
        $file = $this->csvFile("name,price,stock\nقلم,10,سالب\n");
        [$res, $body] = $this->preview($file, ['name' => 'name', 'price' => 'price', 'stock' => 'stock']);
        $this->assertEquals(200, $res->status());
        $this->assertEquals(1, $body['summary']['errors']);
        $this->assertStringContainsString('المخزون', collect($body['errors'][0]['errors'] ?? [])->pluck('reason')->implode(' '));
    }

    public function test_duplicate_sku_in_flight_reported(): void
    {
        $file = $this->csvFile("name,sku,price\nقلم,SKU-X,10\nدفتر,SKU-X,20\n");
        [$res, $body] = $this->preview($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price']);
        $this->assertEquals(200, $res->status());
        $this->assertEquals(1, $body['summary']['errors']);
        $this->assertContains('SKU-X', $body['summary']['duplicates']);
        $this->assertStringContainsString('SKU مكرر', collect($body['errors'][0]['errors'] ?? [])->pluck('reason')->implode(' '));
    }

    public function test_price_optional_in_update_by_sku(): void
    {
        $existing = $this->productInStore($this->store, ['sku' => 'UP-1', 'price' => 10, 'stock' => 3]);
        $file = $this->csvFile("name,sku,stock\nمنتج محدث,UP-1,40\n");
        [$res, $body] = $this->preview($file, ['name' => 'name', 'sku' => 'sku', 'stock' => 'stock'], ['strategy' => 'update_by_sku']);
        $this->assertEquals(200, $res->status());
        $this->assertEquals(0, $body['summary']['errors']);
        $this->assertEquals(1, $body['summary']['valid']);

        $this->confirm((int) $res->json('batch_id'), 'update_by_sku');
        $existing->refresh();
        $this->assertEquals(40, (int) $existing->stock);
        $this->assertEquals(10, (float) $existing->price, 'unmapped price must stay untouched');
    }

    /* ---------------------------- create path ---------------------------- */

    public function test_simple_import_creates_products(): void
    {
        $result = $this->importAndConfirm($this->simpleCsv(), $this->simpleMapping());
        $this->assertEquals(2, $result['created']);
        $this->assertEquals(0, $result['failed']);
        $this->assertSame('completed', $result['status']);
        $this->assertEquals(2, Product::where('store_id', $this->store->id)->count());

        $product = Product::where('store_id', $this->store->id)->where('sku', 'SKU-1')->first();
        $this->assertNotNull($product);
        $this->assertEquals('قميص أحمر', $product->name);
        $this->assertEquals(89.9, (float) $product->price);
        $this->assertEquals(25, (int) $product->stock);
        $this->assertSame('product', $product->inventory_mode);
        $this->assertTrue((bool) $product->is_active);
        $this->assertDatabaseHas('product_import_batches', ['store_id' => $this->store->id, 'status' => 'completed']);
    }

    public function test_create_only_never_overwrites_existing_sku(): void
    {
        $existing = $this->productInStore($this->store, ['sku' => 'SKU-1', 'name' => 'منتج موجود', 'price' => 500, 'stock' => 99]);
        $this->assertSame(1, Product::where('store_id', $this->store->id)->count());

        $result = $this->importAndConfirm($this->simpleCsv(), $this->simpleMapping());
        $this->assertEquals(1, $result['created']);
        $this->assertEquals(0, $result['failed'], 'conflicts with existing SKUs are filtered at preview');
        $this->assertSame('completed', $result['status']);

        $existing->refresh();
        $this->assertSame('منتج موجود', $existing->name, 'existing product must not be overwritten');
        $this->assertEquals(500, (float) $existing->price);
        $this->assertEquals(2, Product::where('store_id', $this->store->id)->count(), 'existing product + newly created SKU-2');
    }

    public function test_variant_import_groups_by_sku_and_builds_combinations(): void
    {
        $file = $this->csvFile(
            "sku,name,price,option1_name,option1_value,variant_sku,variant_price,variant_stock\n" .
            "SH-9,قميص رياضي,100,اللون,أحمر,SH-9-RED,110,5\n" .
            "SH-9,قميص رياضي,100,اللون,أزرق,SH-9-BLUE,120,3\n"
        );
        $mapping = [
            'sku' => 'sku', 'name' => 'name', 'price' => 'price',
            'option1_name' => 'option1_name', 'option1_value' => 'option1_value',
            'variant_sku' => 'variant_sku', 'variant_price' => 'variant_price', 'variant_stock' => 'variant_stock',
        ];

        $result = $this->importAndConfirm($file, $mapping);
        $this->assertEquals(1, $result['created']);
        $this->assertEquals(0, $result['failed']);

        $product = Product::where('store_id', $this->store->id)->where('sku', 'SH-9')->first();
        $this->assertNotNull($product);
        $this->assertSame('variant', $product->inventory_mode);
        $this->assertCount(1, $product->variants);
        $this->assertSame('اللون', $product->variants[0]['name']);
        $this->assertCount(2, $product->variant_combinations);
        $this->assertEquals(8, (int) $product->stock, 'variant product stock sums the combos');
        $this->assertContains('SH-9-RED', array_column($product->variant_combinations, 'sku'));
        $this->assertContains('SH-9-BLUE', array_column($product->variant_combinations, 'sku'));
    }

    public function test_variant_import_keeps_combo_stock(): void
    {
        $file = $this->csvFile(
            "sku,name,price,option1_name,option1_value,variant_stock\n" .
            "P-1,تيشيرت,60,المقاس,S,10\n" .
            "P-1,تيشيرت,60,المقاس,L,2\n"
        );
        $mapping = [
            'sku' => 'sku', 'name' => 'name', 'price' => 'price',
            'option1_name' => 'option1_name', 'option1_value' => 'option1_value', 'variant_stock' => 'variant_stock',
        ];
        $this->importAndConfirm($file, $mapping);

        $product = Product::where('store_id', $this->store->id)->where('sku', 'P-1')->first();
        $stocks = array_column($product->variant_combinations, 'stock');
        $this->assertEquals(['2', '10'], $stocks, 'combo stock must be preserved exactly');
    }

    /* ---------------------------- update path ---------------------------- */

    public function test_update_by_sku_updates_mapped_fields_only(): void
    {
        $existing = $this->productInStore($this->store, [
            'sku' => 'UP-9',
            'name' => 'قديم',
            'price' => 10,
            'stock' => 5,
            'barcode' => '6291041500213',
            'is_active' => false,
        ]);

        $file = $this->csvFile("name,sku,price,stock\nاسم محدث,UP-9,77.50,14\n");
        $result = $this->importAndConfirm($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price', 'stock' => 'stock'], ['strategy' => 'update_by_sku']);

        $this->assertEquals(0, $result['created']);
        $this->assertEquals(1, $result['updated']);
        $this->assertEquals(0, $result['failed']);

        $existing->refresh();
        $this->assertSame('اسم محدث', $existing->name);
        $this->assertEquals(77.5, (float) $existing->price);
        $this->assertEquals(14, (int) $existing->stock);
        $this->assertSame('6291041500213', $existing->barcode, 'unmapped barcode must survive');
        $this->assertFalse((bool) $existing->is_active, 'unmapped status must not flip product');
    }

    public function test_update_by_sku_with_status_maps_status(): void
    {
        $existing = $this->productInStore($this->store, ['sku' => 'UP-S', 'is_active' => false]);
        $file = $this->csvFile("name,sku,status\nمنتج مفعل,UP-S,inactive\n");
        $this->importAndConfirm($file, ['name' => 'name', 'sku' => 'sku', 'status' => 'status'], ['strategy' => 'update_by_sku']);

        $this->assertFalse((bool) $existing->fresh()->is_active);

        $file2 = $this->csvFile("name,sku,status\nمنتج مفعل,UP-S,active\n");
        $this->importAndConfirm($file2, ['name' => 'name', 'sku' => 'sku', 'status' => 'status'], ['strategy' => 'update_by_sku']);
        $this->assertTrue((bool) $existing->fresh()->is_active);
    }

    public function test_update_by_sku_cannot_touch_other_store(): void
    {
        $otherCat = Category::factory()->create(['store_id' => $this->storeB->id, 'is_active' => true]);
        $otherProduct = Product::factory()->create([
            'store_id' => $this->storeB->id,
            'category_id' => $otherCat->id,
            'sku' => 'B-ONLY',
            'name' => 'منتج المتجر الآخر',
            'price' => 5,
            'stock' => 1,
            'is_active' => true,
            'inventory_mode' => 'product',
            'variants' => [],
            'variant_combinations' => [],
        ]);

        $file = $this->csvFile("name,sku,price\nمخترق,B-ONLY,999\n");
        $result = $this->importAndConfirm($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price'], ['strategy' => 'update_by_sku']);

        $this->assertEquals(0, $result['updated']);
        $this->assertEquals(1, $result['failed']);
        $otherProduct->refresh();
        $this->assertEquals(5, (float) $otherProduct->price, 'other store product must be untouched');
        $this->assertSame('منتج المتجر الآخر', $otherProduct->name);
    }

    public function test_confirm_rejects_batch_from_another_store(): void
    {
        $foreign = ProductImportBatch::create([
            'store_id' => $this->storeB->id,
            'user_id' => $this->user->id,
            'original_filename' => 'foreign.csv',
            'file_type' => 'csv',
            'status' => 'previewed',
            'strategy' => 'create_only',
            'mapping' => [],
            'options' => [],
            'total_rows' => 1,
            'valid_rows' => 1,
            'warning_rows' => 0,
            'error_rows' => 0,
            'data' => '[]',
            'results' => '{}',
        ]);

        $res = $this->post(route('products.import.confirm'), ['batch_id' => $foreign->id, 'strategy' => 'create_only']);
        $this->assertEquals(404, $res->status());
    }

    /* ---------------------------- idempotency ---------------------------- */

    public function test_confirm_is_idempotent(): void
    {
        [$previewRes] = $this->preview($this->simpleCsv(), $this->simpleMapping());
        $batchId = (int) $previewRes->json('batch_id');

        $first = $this->confirm($batchId, 'create_only');
        $this->assertSame('completed', $first[1]['status']);
        $this->assertEquals(2, Product::where('store_id', $this->store->id)->count());

        $second = $this->confirm($batchId, 'create_only');
        $this->assertSame('completed', $second[1]['status']);
        $this->assertEquals(2, $second[1]['created'], 'result reflects the persisted first-run counts');
        $this->assertEquals(2, Product::where('store_id', $this->store->id)->count(), 'second confirm must not create anything');
        $this->assertDatabaseHas('product_import_batches', ['id' => $batchId, 'status' => 'completed']);
    }

    /* ---------------------------- categories ---------------------------- */

    public function test_category_cross_store_isolation_and_auto_create(): void
    {
        Category::factory()->create(['store_id' => $this->storeB->id, 'name' => 'ملابس', 'is_active' => true]);

        // Store A does not have "ملابس" and auto-create is off -> row error.
        $file = $this->csvFile("name,price,category\nقميص,50,ملابس\n");
        [$res, $body] = $this->preview($file, ['name' => 'name', 'price' => 'price', 'category' => 'category']);
        $this->assertEquals(200, $res->status());
        $this->assertEquals(1, $body['summary']['errors']);

        // With auto-create on, the category is created in store A only.
        $result = $this->importAndConfirm($file, ['name' => 'name', 'price' => 'price', 'category' => 'category'], ['create_categories' => true]);
        $this->assertEquals(1, $result['created']);
        $created = Category::where('store_id', $this->store->id)->where('name', 'ملابس')->first();
        $this->assertNotNull($created);
        $product = Product::where('store_id', $this->store->id)->first();
        $this->assertEquals($created->id, $product->category_id);
        $this->assertFalse(Category::where('store_id', $this->store->id)->where('name', 'ملابس')->count() > 1);
    }

    public function test_existing_category_in_same_store_matches(): void
    {
        $cat = Category::factory()->create(['store_id' => $this->store->id, 'name' => 'إلكترونيات', 'is_active' => true]);
        $file = $this->csvFile("name,price,category\nموبايل,899,إلكترونيات\n");
        $result = $this->importAndConfirm($file, ['name' => 'name', 'price' => 'price', 'category' => 'category']);
        $this->assertEquals(1, $result['created']);
        $product = Product::where('store_id', $this->store->id)->first();
        $this->assertEquals($cat->id, $product->category_id);
    }

    /* ---------------------------- plan capacity ---------------------------- */

    public function test_plan_product_limit_enforced_at_import_time(): void
    {
        $this->user->plan->update(['max_products_per_store' => 1]);
        $result = $this->importAndConfirm($this->simpleCsv(), $this->simpleMapping());
        $this->assertSame('completed_with_errors', $result['status']);
        $this->assertEquals(1, $result['created']);
        $this->assertEquals(1, $result['failed']);
        $this->assertEquals(1, Product::where('store_id', $this->store->id)->count());
    }

    /* ---------------------------- error report ---------------------------- */

    public function test_error_report_cross_store_blocked(): void
    {
        $batch = ProductImportBatch::create([
            'store_id' => $this->storeB->id,
            'user_id' => $this->user->id,
            'original_filename' => 'foreign.csv',
            'file_type' => 'csv',
            'status' => 'completed_with_errors',
            'strategy' => 'create_only',
            'mapping' => [],
            'options' => [],
            'total_rows' => 1,
            'valid_rows' => 0,
            'warning_rows' => 0,
            'error_rows' => 1,
            'data' => '[]',
            'results' => '{}',
        ]);
        $res = $this->get(route('products.import.errors', $batch->id));
        $this->assertEquals(404, $res->status());
    }

    public function test_error_report_streams_safe_csv(): void
    {
        // Batch with an import-time failure (update_by_sku + missing SKU).
        $file = $this->csvFile("name,sku,price\nمنتج مفقود,NOT-HERE-1,10\n");
        $result = $this->importAndConfirm($file, ['name' => 'name', 'sku' => 'sku', 'price' => 'price'], ['strategy' => 'update_by_sku']);
        $this->assertEquals(1, $result['failed']);

        $batchId = ProductImportBatch::where('store_id', $this->store->id)->first()->id;
        $res = $this->get(route('products.import.errors', $batchId));
        $this->assertEquals(200, $res->getStatusCode());
        $this->assertStringContainsString('text/csv', $res->headers->get('Content-Type'));
        $content = $res->streamedContent();
        $this->assertStringContainsString('رقم الصف', $content);
        $this->assertStringContainsString('لا يوجد منتج بهذا SKU في متجرك', $content);
    }

    public function test_csv_safe_prefixes_formula_cells(): void
    {
        $service = new ProductImportService();
        $method = new \ReflectionMethod($service, 'csvSafe');
        $method->setAccessible(true);
        $this->assertSame("'=SUM(A1)", $method->invoke($service, '=SUM(A1)'));
        $this->assertSame("'+123", $method->invoke($service, '+123'));
        $this->assertSame("'-5", $method->invoke($service, '-5'));
        $this->assertSame("'@cmd", $method->invoke($service, '@cmd'));
        $this->assertSame('plain', $method->invoke($service, 'plain'));
    }
}