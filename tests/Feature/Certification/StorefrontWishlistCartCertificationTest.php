<?php

namespace Tests\Feature\Certification;

use App\Models\CartItem;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Models\WishlistItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * CERTIFICATION: Wishlist + Cart storefront behavioral contracts.
 *
 * Wishlist:
 *  - logged-in (customer guard) toggle add / index / toggle remove is deterministic
 *  - multiple favorites listed
 *  - guest toggle persists a wishlist row for the session
 *  - storefront surfaces wishlist state via the shared accessor
 *  - store isolation: a product of store B cannot be added/toggled under store A;
 *    the request is rejected (422) and no cross-store row is persisted (add/toggle,
 *    logged-in + guest).
 *
 * Cart:
 *  - simple product add / read / quantity update / remove
 *  - out-of-stock rejection
 *  - variant add resolves the exact combination (price + stock + id)
 *  - store isolation: cross-store product rejected on add
 *
 * NOTE ON SESSIONS: the array session driver in the test environment does not
 * persist a session cookie across separate HTTP requests, so guest multi-step
 * flows are covered at single-request granularity; multi-step state flows use
 * the deterministic customer guard (customer_id scoping).
 */
class StorefrontWishlistCartCertificationTest extends TestCase
{
    use RefreshDatabase;

    private function makeStore(): array
    {
        $plan = Plan::factory()->create(['max_stores' => 10, 'max_products_per_store' => 1000, 'themes' => ['all']]);
        $user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
        ]);
        $store = Store::factory()->create(['user_id' => $user->id, 'slug' => 'st-' . uniqid()]);
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store];
    }

    private function customerFor(Store $store): Customer
    {
        return Customer::create([
            'store_id' => $store->id,
            'first_name' => 'Shopper',
            'last_name' => 'Test',
            'email' => 'shopper-' . uniqid() . '@example.com',
            'password' => bcrypt('secret'),
            'is_active' => true,
        ]);
    }

    private function product(Store $store, array $over = []): Product
    {
        $cat = Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
        return Product::factory()->create(array_merge([
            'store_id' => $store->id,
            'category_id' => $cat->id,
            'is_active' => true,
            'price' => 100,
            'stock' => 10,
            'track_inventory' => true,
            'allow_backorder' => false,
            'inventory_mode' => 'product',
            'variants' => [],
            'variant_combinations' => [],
        ], $over));
    }

    private function variantProduct(Store $store): Product
    {
        return $this->product($store, [
            'inventory_mode' => 'variant',
            'variants' => [
                ['name' => 'Color', 'values' => ['Black', 'White']],
                ['name' => 'Size', 'values' => ['M', 'L']],
            ],
            'variant_combinations' => [
                ['id' => 'Black‖M', 'values' => ['Black', 'M'], 'label' => 'Black / M', 'price' => '120', 'stock' => '5', 'sku' => 'BLK-M', 'image' => ''],
                ['id' => 'Black‖L', 'values' => ['Black', 'L'], 'label' => 'Black / L', 'price' => '130', 'stock' => '2', 'sku' => 'BLK-L', 'image' => ''],
            ],
        ]);
    }

    // ---------------- WISHLIST ----------------
    public function test_wishlist_customer_toggle_add_index_remove(): void
    {
        [, $store] = $this->makeStore();
        $customer = $this->customerFor($store);
        $this->actingAs($customer, 'customer');
        $p = $this->product($store);

        $add = $this->postJson('/api/wishlist/toggle', ['store_id' => $store->id, 'product_id' => $p->id]);
        $add->assertOk();
        $this->assertSame('added', $add->json('action'));

        $idx = $this->getJson("/api/wishlist?store_id={$store->id}")->assertOk();
        $this->assertSame(1, $idx->json('count'));
        $this->assertSame((string) $p->id, (string) collect($idx->json('items'))->first()['product_id']);

        $remove = $this->postJson('/api/wishlist/toggle', ['store_id' => $store->id, 'product_id' => $p->id]);
        $remove->assertOk();
        $this->assertSame('removed', $remove->json('action'));
        $this->assertSame(0, WishlistItem::where('store_id', $store->id)->count());
    }

    public function test_wishlist_customer_multiple_favorites(): void
    {
        [, $store] = $this->makeStore();
        $customer = $this->customerFor($store);
        $this->actingAs($customer, 'customer');
        $p1 = $this->product($store);
        $p2 = $this->product($store);

        $this->postJson('/api/wishlist/toggle', ['store_id' => $store->id, 'product_id' => $p1->id])->assertOk();
        $this->postJson('/api/wishlist/toggle', ['store_id' => $store->id, 'product_id' => $p2->id])->assertOk();

        $idx = $this->getJson("/api/wishlist?store_id={$store->id}")->assertOk();
        $this->assertSame(2, $idx->json('count'));
        $ids = collect($idx->json('items'))->pluck('product_id')->map(fn ($v) => (string) $v)->all();
        $this->assertContains((string) $p1->id, $ids);
        $this->assertContains((string) $p2->id, $ids);
    }

    public function test_wishlist_guest_toggle_persists_session_row(): void
    {
        [, $store] = $this->makeStore();
        $p = $this->product($store);
        $res = $this->postJson('/api/wishlist/toggle', ['store_id' => $store->id, 'product_id' => $p->id]);
        $res->assertOk();
        $this->assertSame('added', $res->json('action'));
        $this->assertDatabaseHas('wishlist_items', ['store_id' => $store->id, 'product_id' => $p->id]);
    }

    public function test_wishlist_badge_card_detail_search_surfaces_state(): void
    {
        $context = file_get_contents(resource_path('js/templates-v2/shared/contexts.ts'));
        $this->assertStringContainsString('wishlist', $context, 'templates must access wishlist via shared accessor');
        foreach (['AtelierHeader.tsx', 'AtelierProductCard.tsx'] as $f) {
            $p = resource_path('js/templates-v2/fashion-atelier/components/' . $f);
            if (file_exists($p)) {
                $src = file_get_contents($p);
                $this->assertStringContainsString('wishlist', $src, "$f must surface wishlist state");
            }
        }
        $result = file_get_contents(resource_path('js/templates-v2/shared/SearchResultItem.tsx'));
        $this->assertStringContainsString('wishlist', $result, 'search result must surface wishlist state');
    }

    public function test_wishlist_cross_store_product_is_rejected(): void
    {
        // Logged-in customer of store A mutating a store B product must be rejected;
        // no cross-store row may be persisted (add() and toggle()).
        [, $storeA] = $this->makeStore();
        [, $storeB] = $this->makeStore();
        $customer = $this->customerFor($storeA);
        $this->actingAs($customer, 'customer');
        $pB = $this->product($storeB);

        $res = $this->postJson('/api/wishlist/toggle', ['store_id' => $storeA->id, 'product_id' => $pB->id]);
        $res->assertStatus(422);
        $this->assertSame(0, WishlistItem::where('store_id', $storeA->id)->count());

        $resAdd = $this->postJson('/api/wishlist/add', ['store_id' => $storeA->id, 'product_id' => $pB->id]);
        $resAdd->assertStatus(422);
        $this->assertSame(0, WishlistItem::where('product_id', $pB->id)->where('store_id', $storeA->id)->count());
    }

    public function test_wishlist_guest_cross_store_product_is_rejected(): void
    {
        [, $storeA] = $this->makeStore();
        [, $storeB] = $this->makeStore();
        $pB = $this->product($storeB);

        $res = $this->postJson('/api/wishlist/toggle', ['store_id' => $storeA->id, 'product_id' => $pB->id]);
        $res->assertStatus(422);
        $this->assertSame(0, WishlistItem::where('store_id', $storeA->id)->count());
        $this->assertSame(0, WishlistItem::where('product_id', $pB->id)->where('store_id', $storeA->id)->count());
    }

    public function test_wishlist_cross_store_rejection_leaves_own_store_state_intact(): void
    {
        [, $storeA] = $this->makeStore();
        [, $storeB] = $this->makeStore();
        $customer = $this->customerFor($storeA);
        $this->actingAs($customer, 'customer');
        $pB = $this->product($storeB);
        $own = $this->product($storeA);

        $this->postJson('/api/wishlist/toggle', ['store_id' => $storeA->id, 'product_id' => $own->id])->assertOk();

        $this->postJson('/api/wishlist/toggle', ['store_id' => $storeA->id, 'product_id' => $pB->id])->assertStatus(422);
        $this->postJson('/api/wishlist/add', ['store_id' => $storeA->id, 'product_id' => $pB->id])->assertStatus(422);

        $this->assertSame(1, WishlistItem::where('store_id', $storeA->id)->count());
        $this->assertSame((string) $own->id, (string) WishlistItem::where('store_id', $storeA->id)->first()->product_id);

        $this->postJson('/api/wishlist/toggle', ['store_id' => $storeA->id, 'product_id' => $own->id])->assertOk();
        $this->assertSame(0, WishlistItem::where('store_id', $storeA->id)->count());
    }

    // ---------------- CART ----------------
    public function test_cart_simple_product_add_read_update_remove(): void
    {
        [, $store] = $this->makeStore();
        $customer = $this->customerFor($store);
        $this->actingAs($customer, 'customer');
        $p = $this->product($store, ['price' => 50]);

        $this->postJson('/api/cart/add', ['store_id' => $store->id, 'product_id' => $p->id, 'quantity' => 2])->assertOk();

        $idx = $this->getJson("/api/cart?store_id={$store->id}")->assertOk();
        $this->assertSame(2, $idx->json('count'));
        $item = collect($idx->json('items'))->firstWhere('product_id', (string) $p->id);
        $this->assertNotNull($item);
        $this->assertSame(2, $item['quantity']);
        $this->assertSame(50, (int) $item['price']);

        $this->putJson('/api/cart/' . $item['id'], ['quantity' => 3, 'store_id' => $store->id])->assertStatus(200);
        $this->deleteJson('/api/cart/' . $item['id'] . '?store_id=' . $store->id)->assertStatus(200);
        $this->assertSame(0, CartItem::where('store_id', $store->id)->count());
    }

    public function test_cart_guest_add_persists_row(): void
    {
        [, $store] = $this->makeStore();
        $p = $this->product($store, ['price' => 50]);
        $this->postJson('/api/cart/add', ['store_id' => $store->id, 'product_id' => $p->id, 'quantity' => 1])->assertOk();
        $this->assertDatabaseHas('cart_items', ['store_id' => $store->id, 'product_id' => $p->id, 'quantity' => 1]);
    }

    public function test_cart_out_of_stock_simple_rejected(): void
    {
        [, $store] = $this->makeStore();
        $p = $this->product($store, ['stock' => 0]);
        $res = $this->postJson('/api/cart/add', ['store_id' => $store->id, 'product_id' => $p->id, 'quantity' => 1]);
        $this->assertTrue(in_array($res->status(), [400, 422]));
        $this->assertSame(0, CartItem::where('store_id', $store->id)->count());
    }

    public function test_cart_variant_add_resolves_exact_combination(): void
    {
        [, $store] = $this->makeStore();
        $customer = $this->customerFor($store);
        $this->actingAs($customer, 'customer');
        $p = $this->variantProduct($store);

        $this->postJson('/api/cart/add', [
            'store_id' => $store->id,
            'product_id' => $p->id,
            'quantity' => 1,
            'variants' => ['Color' => 'Black', 'Size' => 'L'],
        ])->assertOk();

        $cart = $this->getJson("/api/cart?store_id={$store->id}")->assertOk();
        $item = collect($cart->json('items'))->firstWhere('product_id', (string) $p->id);
        $this->assertNotNull($item);
        $this->assertSame('Black‖L', $item['variantCombinationId']);
        $this->assertSame(130, (int) $item['price']);
        $this->assertSame(2, $item['stockQuantity']);
        $this->assertEquals(['Color' => 'Black', 'Size' => 'L'], $item['variants']);
    }

    public function test_cart_fake_variant_rejected(): void
    {
        [, $store] = $this->makeStore();
        $customer = $this->customerFor($store);
        $this->actingAs($customer, 'customer');
        $p = $this->product($store, [
            'inventory_mode' => 'variant',
            'variants' => [['name' => 'Size', 'values' => ['M', 'L']]],
            'variant_combinations' => [
                ['id' => 'L', 'values' => ['L'], 'label' => 'L', 'price' => '120', 'stock' => '5', 'sku' => 'L', 'image' => ''],
                ['id' => 'M', 'values' => ['M'], 'label' => 'M', 'price' => '100', 'stock' => '5', 'sku' => 'M', 'image' => ''],
            ],
        ]);
        $res = $this->postJson('/api/cart/add', [
            'store_id' => $store->id,
            'product_id' => $p->id,
            'quantity' => 1,
            'variants' => ['Size' => 'Fake'],
        ]);
        $this->assertSame(422, $res->status());
    }

    public function test_cart_cross_store_product_rejected_with_422(): void
    {
        [, $storeA] = $this->makeStore();
        [, $storeB] = $this->makeStore();
        $customer = $this->customerFor($storeA);
        $this->actingAs($customer, 'customer');
        $pB = $this->product($storeB);

        $res = $this->postJson('/api/cart/add', ['store_id' => $storeA->id, 'product_id' => $pB->id, 'quantity' => 1]);
        $res->assertStatus(422);
        $this->assertSame(0, CartItem::where('store_id', $storeA->id)->count());
    }
}