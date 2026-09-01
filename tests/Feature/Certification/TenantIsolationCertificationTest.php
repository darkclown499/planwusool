<?php

namespace Tests\Feature\Certification;

use App\Models\Category;
use App\Models\MediaItem;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Tests\TestCase;

/**
 * CERTIFICATION: Tenant isolation and Designer authorization.
 *
 * Merchant A owns Store A, Merchant B owns Store B.
 * A attempting Store B resources must get 403/404 (no IDOR).
 *
 * Designer:
 *  - Merchant can update own store Designer
 *  - Merchant cannot update another merchant's store
 *  - Media IDs cannot be attached cross-tenant if backend resolves ownership
 */
class TenantIsolationCertificationTest extends TestCase
{
    use RefreshDatabase;

    private function merchant(): array
    {
        $plan = Plan::factory()->create(['name' => 'T-' . uniqid(), 'themes' => ['all'], 'max_stores' => 10, 'max_products_per_store' => 100]);
        $user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addYear(),
        ]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'Store ' . uniqid();
        $store->slug = 's-' . uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 's@' . uniqid() . '.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function makeOrder(Store $store): Order
    {
        return Order::forceCreate([
            'order_number' => Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 'sess-' . uniqid(),
            'status' => 'pending',
            'payment_status' => 'pending',
            'customer_email' => 'c@' . uniqid() . '.com',
            'customer_first_name' => 'A',
            'customer_last_name' => 'B',
            'customer_phone' => '059' . rand(1000000, 9999999),
            'shipping_address' => 'addr',
            'shipping_city' => 'N',
            'shipping_state' => 'WB',
            'shipping_country' => 'PS',
            'billing_address' => 'addr',
            'billing_city' => 'N',
            'billing_state' => 'WB',
            'billing_country' => 'PS',
            'subtotal' => 100,
            'total_amount' => 100,
            'payment_method' => 'cod',
        ]);
    }

    private function createOwnedMedia(Store $store, string $name, string $fileName): string
    {
        $item = MediaItem::create(['name' => $name]);
        $item->store_id = $store->id;
        $item->save();
        Media::create([
            'model_type' => MediaItem::class,
            'model_id' => $item->id,
            'collection_name' => 'images',
            'name' => pathinfo($fileName, PATHINFO_FILENAME),
            'file_name' => $fileName,
            'mime_type' => 'image/jpeg',
            'disk' => 'public',
            'conversions_disk' => 'public',
            'size' => 1024,
            'manipulations' => [],
            'custom_properties' => [],
            'generated_conversions' => [],
            'responsive_images' => [],
            'store_id' => $store->id,
            'user_id' => $store->user_id,
        ]);
        return '/storage/media/' . $item->id . '/' . $fileName;
    }

    private function assertBlocked($response): void
    {
        $this->assertTrue(in_array($response->status(), [403, 404]), 'Expected 403/404, got ' . $response->status());
    }

    public function test_merchant_a_cannot_access_store_b_product(): void
    {
        [$userA, $storeA] = $this->merchant();
        [, $storeB] = $this->merchant();
        $catB = Category::factory()->create(['store_id' => $storeB->id, 'is_active' => true]);
        $prodB = Product::factory()->create(['store_id' => $storeB->id, 'category_id' => $catB->id, 'is_active' => true]);
        $this->actingAs($userA);
        $this->assertBlocked($this->get(route('products.show', $prodB->id)));
        $this->assertBlocked($this->put(route('products.update', $prodB->id), ['name' => 'H', 'price' => 1]));
        $this->assertEquals($prodB->name, $prodB->fresh()->name);
    }

    public function test_merchant_a_cannot_access_store_b_order(): void
    {
        [$userA, $storeA] = $this->merchant();
        [, $storeB] = $this->merchant();
        $orderB = $this->makeOrder($storeB);
        $this->actingAs($userA);
        $this->assertBlocked($this->get(route('orders.show', $orderB->id)));
        $this->assertBlocked($this->put(route('orders.update', $orderB->id), ['status' => 'shipped']));
        $this->assertEquals('pending', $orderB->fresh()->status);
    }

    public function test_store_content_and_settings_isolated(): void
    {
        [$userA, $storeA] = $this->merchant();
        [, $storeB] = $this->merchant();
        $this->actingAs($userA);
        $this->assertBlocked($this->putJson("/api/stores/{$storeB->id}/designer", ['theme' => 'bazaar-market']));
        $this->assertBlocked($this->putJson("/api/stores/{$storeB->id}/content", ['announcement' => ['text' => 'hacked']]));
        $this->assertBlocked($this->getJson(route('api.store-designer.show', $storeB->id)));
    }

    public function test_designer_own_store_update_allowed(): void
    {
        [$user, $store] = $this->merchant();
        $this->actingAs($user);
        $this->putJson(route('api.store-designer.update', $store->id), [
            'design_tokens' => ['colors' => ['primary' => '#123456']],
        ])->assertOk();
        $store->refresh();
        $this->assertSame('#123456', $store->design_tokens['colors']['primary']);
    }

    public function test_designer_cross_tenant_media_attachment_rejected(): void
    {
        [$userA, $storeA] = $this->merchant();
        [, $storeB] = $this->merchant();
        // foreign media belongs to store B
        $foreignPath = $this->createOwnedMedia($storeB, 'Foreign', 'foreign.jpg');

        $this->actingAs($userA);
        $this->putJson(route('api.store-designer.update', $storeA->id), [
            'content' => ['hero_banner.media' => [['id' => 'foreign', 'type' => 'image', 'src' => $foreignPath]]],
        ])->assertOk();

        $storeA->refresh();
        $saved = $storeA->store_content['hero_banner']['media'] ?? [];
        $this->assertCount(0, $saved, 'cross-tenant media src must be rejected');
    }
}
