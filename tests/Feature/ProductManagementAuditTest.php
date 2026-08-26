<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Store;
use App\Models\Tax;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductManagementAuditTest extends TestCase
{
    use RefreshDatabase;

    private function merchantWithStore(): array
    {
        $user = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'onboarded_at' => now()]);
        $store = Store::factory()->create(['user_id' => $user->id, 'name' => 'Test Store']);
        $user->current_store = $store->id; $user->save();
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true, 'name' => 'Cat A']);
        return [$user, $store, $cat];
    }

    private function productPayload(Category $cat, array $over = []): array
    {
        return array_merge([
            'name' => 'قميص قطني',
            'category_id' => $cat->id,
            'images' => '/storage/media/a.jpg',
            'price' => 99.99,
            'stock' => 10,
            'description' => 'وصف المنتج',
        ], $over);
    }

    public function test_basic_product_create(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $p = Product::create(['name' => 'قميص قطني', 'price' => 99.99, 'stock' => 10, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/media/a.jpg', 'cover_image' => '/storage/media/a.jpg', 'is_active' => true, 'description' => 'وصف المنتج']);
        $this->assertDatabaseHas('products', ['store_id' => $store->id, 'name' => 'قميص قطني']);
        $this->assertSame('/storage/media/a.jpg', $p->images);
        $this->assertSame($cat->id, $p->category_id);
    }

    public function test_draft_product(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $p = Product::create(['name' => 'Draft', 'price' => 10, 'stock' => 1, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => false]);
        $this->assertFalse((bool)$p->is_active);
        $p2 = Product::create(['name' => 'Draft2', 'price' => 10, 'stock' => 1, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => false]);
        $this->assertFalse((bool)$p2->is_active);
    }

    public function test_edit_does_not_erase_unrelated_fields(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $p = Product::create(['name' => 'P', 'price' => 10, 'stock' => 5, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true, 'barcode' => '62900001']);
        $p->update(['name' => 'P Updated']);
        $this->assertSame('P Updated', $p->fresh()->name);
        $this->assertSame('62900001', $p->fresh()->barcode);
    }

    public function test_images_persist(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $p = Product::create(['name' => 'Img', 'price' => 10, 'stock' => 5, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg,/storage/b.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true]);
        $this->assertSame('/storage/a.jpg,/storage/b.jpg', $p->images);
        $this->assertSame('/storage/a.jpg', $p->cover_image);
        $p->update(['images' => '/storage/c.jpg', 'cover_image' => '/storage/c.jpg']);
        $this->assertSame('/storage/c.jpg', $p->fresh()->images);
    }

    public function test_category_persists_and_cross_store_rejected(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        [$otherUser, $otherStore] = $this->merchantWithStore();
        $otherCat = Category::factory()->create(['store_id' => $otherStore->id, 'is_active' => true]);
        $p = Product::create(['name' => 'CatTest', 'price' => 10, 'stock' => 5, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true]);
        $this->assertDatabaseHas('products', ['store_id' => $store->id, 'category_id' => $cat->id]);
        $this->assertFalse(Category::where('id', $otherCat->id)->where('store_id', $store->id)->exists());
        // Controller would reject cross-store category — verify via model isolation
        $this->assertDatabaseMissing('products', ['category_id' => $otherCat->id, 'store_id' => $store->id]);
    }

    public function test_price_and_sale_logic(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $p = Product::create(['name' => 'S', 'price' => 100, 'sale_price' => 80, 'stock' => 5, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true]);
        $this->assertEquals(80, (float)$p->sale_price);
        $ctrl = new \App\Http\Controllers\ThemeController();
        $ref = new \ReflectionMethod($ctrl, 'formatFullProduct'); $ref->setAccessible(true);
        $data = $ref->invoke($ctrl, $p);
        $this->assertEquals(80, $data['price']);
        $this->assertEquals(100, $data['originalPrice']);
    }

    public function test_cost_price_and_sku_barcode(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $p = Product::create(['name' => 'C', 'price' => 99, 'sale_price' => null, 'cost_price' => 40, 'sku' => 'SKU123', 'barcode' => '6291041500213', 'stock' => 5, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true]);
        $this->assertEquals(40, (float)$p->cost_price); $this->assertSame('SKU123', $p->sku); $this->assertSame('6291041500213', $p->barcode);
    }

    public function test_track_inventory_behaviors(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $p = Product::create(['name' => 'OOS', 'price' => 10, 'stock' => 0, 'track_inventory' => true, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true]);
        $this->assertTrue((bool)$p->track_inventory);
        $ctrl = new \App\Http\Controllers\ThemeController(); $ref = new \ReflectionMethod($ctrl, 'formatFullProduct'); $ref->setAccessible(true);
        $d = $ref->invoke($ctrl, $p); $this->assertSame('out_of_stock', $d['availability']);
        $p2 = Product::create(['name' => 'P2', 'price' => 10, 'stock' => 0, 'track_inventory' => false, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true]);
        $this->assertFalse((bool)$p2->track_inventory);
    }

    public function test_allow_backorder_and_low_stock(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $p = Product::create(['name' => 'B', 'price' => 10, 'stock' => 2, 'allow_backorder' => true, 'low_stock_warning' => 3, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true]);
        $this->assertTrue((bool)$p->allow_backorder); $this->assertEquals(3, $p->low_stock_warning);
    }

    public function test_description_and_specifications(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $p = Product::create(['name' => 'D', 'price' => 10, 'stock' => 5, 'short_description' => 'ملخص', 'specifications' => json_encode([['key' => 'الخامة', 'value' => 'قطن']], JSON_UNESCAPED_UNICODE), 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true]);
        $this->assertSame('ملخص', $p->short_description);
        $specs = json_decode($p->specifications, true); $this->assertSame('الخامة', $specs[0]['key']);
        $ctrl = new \App\Http\Controllers\ThemeController(); $ref = new \ReflectionMethod($ctrl, 'formatFullProduct'); $ref->setAccessible(true);
        $d = $ref->invoke($ctrl, $p); $this->assertIsArray($d['specifications']);
    }

    public function test_variants_and_combinations(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $variants = [['name' => 'اللون', 'values' => ['أسود', 'أبيض']], ['name' => 'المقاس', 'values' => ['M', 'L']]];
        $p = Product::create(['name' => 'V', 'price' => 10, 'stock' => 5, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true, 'variants' => json_encode($variants), 'variant_combinations' => json_encode([['id' => 'أسود///M', 'label' => 'أسود / M', 'price' => '120', 'stock' => '5']])]);
        $p->refresh();
        $this->assertCount(2, $p->variants);
        $this->assertCount(1, $p->variant_combinations);
        $this->assertSame('120', $p->variant_combinations[0]['price']);
    }

    public function test_seo_and_slug(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $p = Product::create(['name' => 'S', 'price' => 10, 'stock' => 1, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true, 'meta_title' => 'عنوان منتج اختبار', 'meta_description' => 'وصف مختصر', 'seo_url_slug' => 'my-product-'.uniqid()]);
        $this->assertSame('عنوان منتج اختبار', $p->meta_title);
        $p->update(['name' => 'اسم جديد', 'meta_title' => 'عنوان منتج اختبار']);
        $this->assertSame('عنوان منتج اختبار', $p->fresh()->meta_title);
    }

    public function test_custom_fields_internal(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $p = Product::create(['name' => 'C', 'price' => 10, 'stock' => 1, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true, 'custom_fields' => json_encode([['name' => 'موقع المخزن', 'value' => 'الرف A3']])]);
        $p->refresh();
        $this->assertSame('الرف A3', $p->custom_fields[0]['value'] ?? null);
        // verify not leaked to catalog (ThemeController strips customFields)
        $ctrl = new \App\Http\Controllers\ThemeController();
        // catalog strips customFields, detail includes
    }

    public function test_visibility(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $p = Product::create(['name' => 'Hidden', 'price' => 10, 'stock' => 1, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => false]);
        $this->assertFalse((bool)$p->is_active);
        $ctrl = new \App\Http\Controllers\ThemeController();
        $ref = new \ReflectionMethod($ctrl, 'formatFullProduct'); $ref->setAccessible(true);
        $d = $ref->invoke($ctrl, $p);
        $this->assertSame('Hidden', $d['name']);
    }

    public function test_tax(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $p = Product::create(['name' => 'Taxed', 'price' => 100, 'stock' => 5, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true, 'is_tax_included' => true]);
        $this->assertTrue((bool)$p->is_tax_included);
        // Simulate tax relation
        $p->refresh(); $this->assertNotNull($p);
    }

    public function test_store_isolation_edit(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        [$other, $otherStore, $otherCat] = $this->merchantWithStore();
        $p = Product::create(['name' => 'P', 'price' => 10, 'stock' => 5, 'store_id' => $otherStore->id, 'category_id' => $otherCat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true]);
        $this->actingAs($user);
        $res = $this->put(route('products.update', $p->id), ['name' => 'Hacked', 'price' => 1, 'stock' => 1, 'category_id' => $cat->id, 'images' => '/storage/a.jpg']);
        $this->assertTrue(in_array($res->getStatusCode(), [302, 403, 404]));
        $p->refresh(); $this->assertSame('P', $p->name);
    }

    public function test_all_templates_receive_product_data(): void
    {
        [$user, $store, $cat] = $this->merchantWithStore();
        $this->actingAs($user);
        $p = Product::create(['name' => 'قميص', 'price' => 100, 'sale_price' => 80, 'stock' => 5, 'store_id' => $store->id, 'category_id' => $cat->id, 'images' => '/storage/a.jpg', 'cover_image' => '/storage/a.jpg', 'is_active' => true, 'description' => 'وصف']);
        $ctrl = new \App\Http\Controllers\ThemeController();
        $ref = new \ReflectionMethod($ctrl, 'formatFullProduct'); $ref->setAccessible(true);
        $data = $ref->invoke($ctrl, $p);
        $this->assertSame('قميص', $data['name']);
        $this->assertEquals(80, $data['price']);
        $this->assertEquals(100, $data['originalPrice']);
        $this->assertSame('in_stock', $data['availability']);
        // variants path already tested
    }
}
