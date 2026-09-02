<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ProductReviewsVerifiedPurchaseTest extends TestCase
{
    use RefreshDatabase;

    private function ownerWithStore(): array
    {
        $plan = Plan::factory()->create(['name' => 'Pro-' . uniqid(), 'price' => 99, 'themes' => ['all']]);
        $user = User::factory()->create([
            'type' => 'superadmin',
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addMonth(),
            'onboarded_at' => now(),
            'email_verified_at' => now(),
        ]);
        $store = new Store();
        $store->user_id = $user->id;
        $store->name = 'Test';
        $store->slug = 'test-' . uniqid();
        $store->theme = 'bazaar-market';
        $store->email = 's@e.com';
        $store->save();
        $user->current_store = $store->id;
        $user->save();

        return [$user, $store];
    }

    private function makeCustomer(Store $store, string $email): Customer
    {
        return Customer::create([
            'store_id' => $store->id,
            'first_name' => 'Salma',
            'last_name' => 'Ghosheh',
            'email' => $email,
            'password' => bcrypt('password'),
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
    }

    private function makeProduct(Store $store): Product
    {
        return Product::factory()->create([
            'store_id' => $store->id,
            'name' => 'Test Product ' . uniqid(),
            'price' => 99.00,
            'is_active' => true,
        ]);
    }

    private function makeOrder(Store $store, Customer $customer, string $status): Order
    {
        return Order::forceCreate([
            'order_number' => Order::generateOrderNumber(),
            'store_id' => $store->id,
            'customer_id' => $customer->id,
            'session_id' => 's' . uniqid(),
            'status' => $status,
            'payment_status' => 'paid',
            'customer_email' => $customer->email,
            'customer_first_name' => $customer->first_name,
            'customer_last_name' => $customer->last_name,
            'customer_phone' => '0590000000',
            'shipping_address' => 'addr',
            'shipping_city' => 'Ramallah',
            'shipping_state' => 'WB',
            'shipping_country' => 'PS',
            'billing_address' => 'addr',
            'billing_city' => 'R',
            'billing_state' => 'W',
            'billing_country' => 'PS',
            'subtotal' => 99,
            'total_amount' => 99,
            'payment_method' => 'cod',
            'shipping_amount' => 0,
        ]);
    }

    private function addOrderItem(Order $order, Product $product): OrderItem
    {
        return OrderItem::create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'product_sku' => $product->sku ?? 'SKU-' . $product->id,
            'product_price' => 99,
            'quantity' => 1,
            'unit_price' => 99,
            'total_price' => 99,
        ]);
    }

    private function submitReview(Customer $customer, array $payload): array
    {
        $response = $this->actingAs($customer, 'customer')->postJson(route('api.reviews.store'), $payload);
        return [$response, $response->json()];
    }

    private function visibleReview(Store $store, Product $product, Customer $customer): ProductReview
    {
        return ProductReview::create([
            'product_id' => $product->id,
            'store_id' => $store->id,
            'customer_id' => $customer->id,
            'order_id' => null,
            'order_item_id' => null,
            'rating' => 5,
            'title' => 'Great',
            'comment' => 'Love it',
            'is_approved' => true,
            'is_rejected' => false,
            'hide_reason' => null,
            'is_verified_purchase' => true,
        ]);
    }

    public function test_guest_review_submission_is_blocked(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);

        $response = $this->postJson(route('api.reviews.store'), [
            'product_id' => $product->id,
            'store_id' => $store->id,
            'order_id' => 1,
            'rating' => 5,
        ]);

        $response->assertStatus(401);
    }

    public function test_customer_without_a_purchase_cant_review(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'a@' . uniqid() . '.com');

        $otherCustomer = $this->makeCustomer($store, 'b@' . uniqid() . '.com');
        $otherOrder = $this->makeOrder($store, $otherCustomer, 'delivered');
        $this->addOrderItem($otherOrder, $product);

        [$response] = $this->submitReview($customer, [
            'product_id' => $product->id,
            'store_id' => $store->id,
            'order_id' => $otherOrder->id,
            'rating' => 5,
            'comment' => 'Not mine',
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('product_reviews', ['customer_id' => $customer->id]);
    }

    public function test_customer_cannot_review_product_not_in_their_order(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $otherProduct = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'c@' . uniqid() . '.com');

        $order = $this->makeOrder($store, $customer, 'delivered');
        $this->addOrderItem($order, $otherProduct);

        [$response] = $this->submitReview($customer, [
            'product_id' => $product->id,
            'store_id' => $store->id,
            'order_id' => $order->id,
            'rating' => 5,
        ]);

        $response->assertStatus(403);
    }

    public function test_customer_cannot_review_with_order_from_another_store(): void
    {
        [, $storeA] = $this->ownerWithStore();
        [, $storeB] = $this->ownerWithStore();
        $productA = $this->makeProduct($storeA);
        $productB = $this->makeProduct($storeB);
        $customerB = $this->makeCustomer($storeB, 'd@' . uniqid() . '.com');

        $orderB = $this->makeOrder($storeB, $customerB, 'delivered');
        $this->addOrderItem($orderB, $productB);

        // Review store-A product using a store-B order.
        $customerA = $this->makeCustomer($storeA, 'e@' . uniqid() . '.com');
        [$response] = $this->submitReview($customerA, [
            'product_id' => $productA->id,
            'store_id' => $storeA->id,
            'order_id' => $orderB->id,
            'rating' => 5,
        ]);

        $response->assertStatus(403);
    }

    public function test_cross_store_product_id_is_rejected(): void
    {
        [, $storeA] = $this->ownerWithStore();
        [, $storeB] = $this->ownerWithStore();
        $productB = $this->makeProduct($storeB);

        $customerA = $this->makeCustomer($storeA, 'f@' . uniqid() . '.com');
        [$response] = $this->submitReview($customerA, [
            'product_id' => $productB->id,
            'store_id' => $storeA->id,
            'order_id' => 1,
            'rating' => 5,
        ]);

        $response->assertStatus(422);
    }

    public function test_non_reviewable_order_statuses_are_blocked(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'g@' . uniqid() . '.com');

        foreach (['pending', 'confirmed', 'processing', 'shipped', 'cancelled', 'failed', 'refunded', 'returned'] as $status) {
            $order = $this->makeOrder($store, $customer, $status);
            $this->addOrderItem($order, $product);

            [$response] = $this->submitReview($customer, [
                'product_id' => $product->id,
                'store_id' => $store->id,
                'order_id' => $order->id,
                'rating' => 4,
            ]);

            $response->assertStatus(403);
            $this->assertDatabaseMissing('product_reviews', ['order_id' => $order->id]);
        }
    }

    public function test_reviewable_order_statuses_are_accepted(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'h@' . uniqid() . '.com');

        foreach (['delivered'] as $status) {
            $order = $this->makeOrder($store, $customer, $status);
            $this->addOrderItem($order, $product);

            [$response] = $this->submitReview($customer, [
                'product_id' => $product->id,
                'store_id' => $store->id,
                'order_id' => $order->id,
                'rating' => 4,
            ]);

            $response->assertStatus(200);
            $response->assertJsonPath('success', true);
        }
    }

    public function test_verified_badge_is_server_computed_and_anchored_to_line_item(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'i@' . uniqid() . '.com');
        $order = $this->makeOrder($store, $customer, 'delivered');
        $item = $this->addOrderItem($order, $product);

        [$response] = $this->submitReview($customer, [
            'product_id' => $product->id,
            'store_id' => $store->id,
            'order_id' => $order->id,
            'rating' => 5,
            'comment' => 'Verified!',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('review.is_verified_purchase', true);

        $review = ProductReview::where('store_id', $store->id)->first();
        $this->assertNotNull($review);
        $this->assertEquals($item->id, $review->order_item_id);
        $this->assertEquals($order->id, $review->order_id);
        $this->assertTrue($review->is_verified_purchase);
        $this->assertTrue($review->is_approved);
        $this->assertFalse($review->is_rejected);
        $this->assertNull($review->hide_reason);
    }

    public function test_valid_review_auto_publishes_and_is_immediately_visible(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'j@' . uniqid() . '.com');
        $order = $this->makeOrder($store, $customer, 'delivered');
        $this->addOrderItem($order, $product);

        [$response] = $this->submitReview($customer, [
            'product_id' => $product->id,
            'store_id' => $store->id,
            'order_id' => $order->id,
            'rating' => 5,
        ]);
        $response->assertStatus(200);

        $public = $this->getJson(route('api.reviews.product', ['productId' => $product->id]));
        $public->assertStatus(200);
        $public->assertJsonCount(1, 'reviews.data');
        $public->assertJsonPath('reviews.data.0.customer.first_name', 'Salma');
    }

    public function test_one_review_per_customer_product_updates_in_place(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'k@' . uniqid() . '.com');
        $order = $this->makeOrder($store, $customer, 'delivered');
        $this->addOrderItem($order, $product);

        [$first] = $this->submitReview($customer, [
            'product_id' => $product->id,
            'store_id' => $store->id,
            'order_id' => $order->id,
            'rating' => 3,
            'comment' => 'First take',
        ]);
        $first->assertStatus(200);
        $firstId = $first->json('review.id');

        [$second] = $this->submitReview($customer, [
            'product_id' => $product->id,
            'store_id' => $store->id,
            'order_id' => $order->id,
            'rating' => 5,
            'comment' => 'Changed my mind',
        ]);
        $second->assertStatus(200);
        $second->assertJsonPath('updated', true);
        $second->assertJsonPath('review.id', $firstId);

        $this->assertDatabaseCount('product_reviews', 1);
        $this->assertEquals('Changed my mind', ProductReview::where('store_id', $store->id)->value('comment'));
    }

    public function test_rating_validation_rejects_zero_six_and_non_integer(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'l@' . uniqid() . '.com');
        $order = $this->makeOrder($store, $customer, 'delivered');
        $this->addOrderItem($order, $product);

        foreach ([0, 6, 'great'] as $badRating) {
            [$response] = $this->submitReview($customer, [
                'product_id' => $product->id,
                'store_id' => $store->id,
                'order_id' => $order->id,
                'rating' => $badRating,
            ]);
            $response->assertStatus(422);
        }

        $this->assertDatabaseCount('product_reviews', 0);
    }

    public function test_comment_longer_than_limit_is_rejected(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'm@' . uniqid() . '.com');
        $order = $this->makeOrder($store, $customer, 'delivered');
        $this->addOrderItem($order, $product);

        [$response] = $this->submitReview($customer, [
            'product_id' => $product->id,
            'store_id' => $store->id,
            'order_id' => $order->id,
            'rating' => 5,
            'comment' => str_repeat('x', 5001),
        ]);

        $response->assertStatus(422);
    }

    public function test_html_and_scripts_are_stripped_from_review_text(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'n@' . uniqid() . '.com');
        $order = $this->makeOrder($store, $customer, 'delivered');
        $this->addOrderItem($order, $product);

        [$response] = $this->submitReview($customer, [
            'product_id' => $product->id,
            'store_id' => $store->id,
            'order_id' => $order->id,
            'rating' => 5,
            'title' => '<b>Bold</b> title',
            'comment' => '<script>alert(1)</script>منتج <i>جيد</i>',
        ]);

        $response->assertStatus(200);

        $review = ProductReview::where('store_id', $store->id)->where('customer_id', $customer->id)->first();
        $this->assertStringNotContainsString('<', $review->title);
        $this->assertStringNotContainsString('>', $review->title);
        $this->assertStringNotContainsString('<', $review->comment);
        $this->assertStringNotContainsString('>', $review->comment);
        $this->assertStringContainsString('جيد', $review->comment);
    }

    public function test_public_api_returns_only_visible_reviews(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);

        $approved = $this->makeCustomer($store, 'o@' . uniqid() . '.com');
        $pending = $this->makeCustomer($store, 'p@' . uniqid() . '.com');
        $rejected = $this->makeCustomer($store, 'q@' . uniqid() . '.com');
        $hidden = $this->makeCustomer($store, 'r@' . uniqid() . '.com');

        $this->visibleReview($store, $product, $approved);
        ProductReview::create([
            'product_id' => $product->id, 'store_id' => $store->id, 'customer_id' => $pending->id,
            'rating' => 2, 'comment' => 'pending', 'is_approved' => false, 'is_rejected' => false,
        ]);
        ProductReview::create([
            'product_id' => $product->id, 'store_id' => $store->id, 'customer_id' => $rejected->id,
            'rating' => 1, 'comment' => 'rejected', 'is_approved' => true, 'is_rejected' => true,
        ]);
        ProductReview::create([
            'product_id' => $product->id, 'store_id' => $store->id, 'customer_id' => $hidden->id,
            'rating' => 5, 'comment' => 'hidden', 'is_approved' => false, 'is_rejected' => false, 'hide_reason' => 'spam',
        ]);

        $public = $this->getJson(route('api.reviews.product', ['productId' => $product->id]));
        $public->assertStatus(200);
        $public->assertJsonCount(1, 'reviews.data');
        $public->assertJsonPath('stats.total_reviews', 1);
    }

    public function test_public_api_masks_customer_identity_and_never_leaks_email(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'masked@' . uniqid() . '.com');
        $order = $this->makeOrder($store, $customer, 'delivered');
        $this->addOrderItem($order, $product);

        [$response] = $this->submitReview($customer, [
            'product_id' => $product->id,
            'store_id' => $store->id,
            'order_id' => $order->id,
            'rating' => 5,
        ]);
        $response->assertStatus(200);

        $json = $response->json('review.customer');
        $this->assertArrayNotHasKey('email', $json);
        $this->assertArrayNotHasKey('phone', $json);
        $this->assertArrayNotHasKey('last_name', $json);
        $this->assertEquals('Salma', $json['first_name']);
        $this->assertStringContainsString('Salma', $json['display_name']);
        $this->assertStringNotContainsString('Ghosheh', $json['display_name']);
        $this->assertStringContainsString('G.', $json['display_name']);
    }

    public function test_public_product_reviews_endpoint_enforces_store_isolation(): void
    {
        [, $storeA] = $this->ownerWithStore();
        [, $storeB] = $this->ownerWithStore();
        $product = $this->makeProduct($storeA);
        $this->visibleReview($storeA, $product, $this->makeCustomer($storeA, 's@' . uniqid() . '.com'));

        $good = $this->getJson(route('api.reviews.product', ['productId' => $product->id]) . '?store_id=' . $storeA->id);
        $good->assertStatus(200);

        $bad = $this->getJson(route('api.reviews.product', ['productId' => $product->id]) . '?store_id=' . $storeB->id);
        $bad->assertStatus(403);
    }

    public function test_merchant_hide_removes_review_from_public_and_requires_reason(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 't@' . uniqid() . '.com');
        $review = $this->visibleReview($store, $product, $customer);

        $this->actingAs($user)->from('/merchant/product-reviews')
            ->post(route('product-reviews.hide', $review))
            ->assertSessionHasErrors('hide_reason');

        $this->actingAs($user)->from('/merchant/product-reviews')
            ->post(route('product-reviews.hide', $review), ['hide_reason' => 'abusive'])
            ->assertRedirect('/merchant/product-reviews')
            ->assertSessionHas('success');

        $review->refresh();
        $this->assertEquals('abusive', $review->hide_reason);
        $this->assertFalse($review->is_approved);

        $public = $this->getJson(route('api.reviews.product', ['productId' => $product->id]));
        $public->assertJsonCount(0, 'reviews.data');
        $public->assertJsonPath('stats.total_reviews', 0);
    }

    public function test_merchant_show_restores_hidden_review_to_public(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'u@' . uniqid() . '.com');
        $review = $this->visibleReview($store, $product, $customer);
        $review->update(['hide_reason' => 'unrelated', 'is_approved' => false]);

        $this->actingAs($user)->from('/merchant/product-reviews')
            ->post(route('product-reviews.show', $review))
            ->assertRedirect('/merchant/product-reviews');

        $review->refresh();
        $this->assertNull($review->hide_reason);
        $this->assertTrue($review->is_approved);

        $public = $this->getJson(route('api.reviews.product', ['productId' => $product->id]));
        $public->assertJsonCount(1, 'reviews.data');
    }

    public function test_reject_excludes_review_from_public_aggregates(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'v@' . uniqid() . '.com');
        $review = $this->visibleReview($store, $product, $customer);

        $this->actingAs($user)->from('/merchant/product-reviews')
            ->post(route('product-reviews.reject', $review))
            ->assertRedirect('/merchant/product-reviews');

        $review->refresh();
        $this->assertTrue($review->is_rejected);

        $public = $this->getJson(route('api.reviews.product', ['productId' => $product->id]));
        $public->assertJsonCount(0, 'reviews.data');
        $public->assertJsonPath('stats.average_rating', 0);
    }

    public function test_merchant_approve_republishes_legacy_pending_review(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'w@' . uniqid() . '.com');
        $review = ProductReview::create([
            'product_id' => $product->id, 'store_id' => $store->id, 'customer_id' => $customer->id,
            'rating' => 4, 'comment' => 'old', 'is_approved' => false, 'is_rejected' => true,
        ]);

        $this->actingAs($user)->from('/merchant/product-reviews')
            ->post(route('product-reviews.approve', $review))
            ->assertRedirect('/merchant/product-reviews');

        $review->refresh();
        $this->assertTrue($review->is_approved);
        $this->assertFalse($review->is_rejected);
        $this->assertNull($review->hide_reason);

        $public = $this->getJson(route('api.reviews.product', ['productId' => $product->id]));
        $public->assertJsonCount(1, 'reviews.data');
    }

    public function test_merchant_reply_sets_timestamp_and_appears_publicly(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'x@' . uniqid() . '.com');
        $review = $this->visibleReview($store, $product, $customer);

        $this->actingAs($user)->from('/merchant/product-reviews')
            ->post(route('product-reviews.reply', $review), ['admin_reply' => '<b>Thank you</b> for your feedback'])
            ->assertRedirect('/merchant/product-reviews');

        $review->refresh();
        $this->assertNotNull($review->merchant_replied_at);
        $this->assertStringNotContainsString('<', $review->admin_reply);

        $public = $this->getJson(route('api.reviews.product', ['productId' => $product->id]));
        $public->assertJsonPath('reviews.data.0.admin_reply', 'Thank you for your feedback');
    }

    public function test_cross_store_merchant_mutations_are_blocked(): void
    {
        [, $storeA] = $this->ownerWithStore();
        [$userB, $storeB] = $this->ownerWithStore();
        $product = $this->makeProduct($storeB);
        $customer = $this->makeCustomer($storeB, 'y@' . uniqid() . '.com');
        $review = $this->visibleReview($storeB, $product, $customer);

        // userB owns storeB, so storeA must have a DIFFERENT merchant (userA).
        $userB->current_store = $storeA->id;
        $userB->save();
        $this->assertEquals($storeA->id, (int) $userB->current_store);
        $this->assertNotEquals($storeA->id, $review->store_id);

        $this->actingAs($userB)->post(route('product-reviews.approve', $review))->assertForbidden();
        $this->actingAs($userB)->post(route('product-reviews.reject', $review))->assertForbidden();
        $this->actingAs($userB)->post(route('product-reviews.hide', $review), ['hide_reason' => 'spam'])->assertForbidden();
        $this->actingAs($userB)->post(route('product-reviews.show', $review))->assertForbidden();
        $this->actingAs($userB)->post(route('product-reviews.reply', $review), ['admin_reply' => 'x'])->assertForbidden();
        $this->actingAs($userB)->delete(route('product-reviews.destroy', $review))->assertForbidden();

        $this->assertDatabaseHas('product_reviews', ['id' => $review->id]);
    }

    public function test_merchant_index_stats_include_hidden_and_needs_response(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);

        $c1 = $this->makeCustomer($store, 's1@' . uniqid() . '.com');
        $c2 = $this->makeCustomer($store, 's2@' . uniqid() . '.com');
        $c3 = $this->makeCustomer($store, 's3@' . uniqid() . '.com');
        $c4 = $this->makeCustomer($store, 's4@' . uniqid() . '.com');
        $c5 = $this->makeCustomer($store, 's5@' . uniqid() . '.com');

        $this->visibleReview($store, $product, $c1); // approved + needs response
        ProductReview::create([
            'product_id' => $product->id, 'store_id' => $store->id, 'customer_id' => $c2->id,
            'rating' => 3, 'comment' => 'pending', 'is_approved' => false, 'is_rejected' => false,
        ]);
        ProductReview::create([
            'product_id' => $product->id, 'store_id' => $store->id, 'customer_id' => $c3->id,
            'rating' => 3, 'comment' => 'hidden', 'is_approved' => false, 'is_rejected' => false, 'hide_reason' => 'spam',
        ]);
        ProductReview::create([
            'product_id' => $product->id, 'store_id' => $store->id, 'customer_id' => $c4->id,
            'rating' => 3, 'comment' => 'rejected', 'is_approved' => true, 'is_rejected' => true,
        ]);
        ProductReview::create([
            'product_id' => $product->id, 'store_id' => $store->id, 'customer_id' => $c5->id,
            'rating' => 4, 'comment' => 'replied', 'is_approved' => true, 'is_rejected' => false,
            'admin_reply' => 'thanks', 'merchant_replied_at' => now(),
        ]);

        $response = $this->actingAs($user)->get(route('product-reviews.index'));
        $response->assertOk();

        $stats = $response->inertiaPage()['props']['stats'];
        $this->assertEquals(5, $stats['total']);
        $this->assertEquals(2, $stats['approved']);
        $this->assertEquals(1, $stats['pending']);
        $this->assertEquals(1, $stats['rejected']);
        $this->assertEquals(1, $stats['hidden']);
        $this->assertEquals(1, $stats['needs_response']);
    }

    public function test_export_csv_includes_verified_purchase_and_hide_reason_columns(): void
    {
        [$user, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'z@' . uniqid() . '.com');
        $this->visibleReview($store, $product, $customer);

        $response = $this->actingAs($user)->get(route('product-reviews.export'));
        $response->assertOk();

        $csv = $response->streamedContent();
        $this->assertStringContainsString('Verified Purchase', $csv);
        $this->assertStringContainsString('Hide Reason', $csv);
        $this->assertStringContainsString('Yes', $csv);
    }

    public function test_deleting_order_item_sets_review_order_item_to_null(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'aa@' . uniqid() . '.com');
        $order = $this->makeOrder($store, $customer, 'delivered');
        $item = $this->addOrderItem($order, $product);

        $review = $this->visibleReview($store, $product, $customer);
        $review->update(['order_id' => $order->id, 'order_item_id' => $item->id]);

        $item->delete();

        $review->refresh();
        $this->assertNull($review->order_item_id);
        $this->assertNotNull(ProductReview::find($review->id));
        $this->assertTrue($review->is_verified_purchase);
    }

    public function test_review_save_and_delete_invalidate_storefront_catalog_cache(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'bb@' . uniqid() . '.com');

        Cache::put("store_catalog.{$store->id}", ['cached'], 60);
        Cache::put("store_catalog.{$store->id}.theme_bazaar-market.locale_ar.active_1", ['cached'], 60);

        $review = $this->visibleReview($store, $product, $customer);

        $this->assertFalse(Cache::has("store_catalog.{$store->id}"));
        $this->assertFalse(Cache::has("store_catalog.{$store->id}.theme_bazaar-market.locale_ar.active_1"));

        Cache::put("store_catalog.{$store->id}", ['cached'], 60);
        $review->delete();
        $this->assertFalse(Cache::has("store_catalog.{$store->id}"));
    }

    public function test_model_stats_for_products_aggregate_across_multiple_products(): void
    {
        [, $store] = $this->ownerWithStore();
        $productA = $this->makeProduct($store);
        $productB = $this->makeProduct($store);

        $c1 = $this->makeCustomer($store, 'c1@' . uniqid() . '.com');
        $c2 = $this->makeCustomer($store, 'c2@' . uniqid() . '.com');
        $c3 = $this->makeCustomer($store, 'c3@' . uniqid() . '.com');
        $c4 = $this->makeCustomer($store, 'c4@' . uniqid() . '.com');

        // productA: 5 + 3 = avg 4.0 (2 reviews)
        $this->visibleReview($store, $productA, $c1)->update(['rating' => 5]);
        $this->visibleReview($store, $productA, $c2)->update(['rating' => 3]);
        // productA: one hidden review excluded
        ProductReview::create([
            'product_id' => $productA->id, 'store_id' => $store->id, 'customer_id' => $c3->id,
            'rating' => 1, 'comment' => 'hidden', 'is_approved' => false, 'is_rejected' => false, 'hide_reason' => 'spam',
        ]);
        // productB: single 4
        $this->visibleReview($store, $productB, $c4)->update(['rating' => 4]);

        $stats = ProductReview::statsForProducts((int) $store->id, [(int) $productA->id, (int) $productB->id]);

        $this->assertEquals(4.0, $stats[(int) $productA->id]['average_rating']);
        $this->assertEquals(2, $stats[(int) $productA->id]['review_count']);
        $this->assertEquals([1 => 0, 2 => 0, 3 => 1, 4 => 0, 5 => 1], $stats[(int) $productA->id]['rating_distribution']);
        $this->assertEquals(4.0, $stats[(int) $productB->id]['average_rating']);
        $this->assertEquals(1, $stats[(int) $productB->id]['review_count']);
    }

    public function test_stats_exclude_hidden_rejected_and_pending_reviews(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);

        $c1 = $this->makeCustomer($store, 'd1@' . uniqid() . '.com');
        $c2 = $this->makeCustomer($store, 'd2@' . uniqid() . '.com');
        $c3 = $this->makeCustomer($store, 'd3@' . uniqid() . '.com');
        $c4 = $this->makeCustomer($store, 'd4@' . uniqid() . '.com');

        $this->visibleReview($store, $product, $c1)->update(['rating' => 5]);
        $this->visibleReview($store, $product, $c2)->update(['rating' => 3]);
        ProductReview::create([
            'product_id' => $product->id, 'store_id' => $store->id, 'customer_id' => $c3->id,
            'rating' => 1, 'comment' => 'rejected', 'is_approved' => true, 'is_rejected' => true,
        ]);
        ProductReview::create([
            'product_id' => $product->id, 'store_id' => $store->id, 'customer_id' => $c4->id,
            'rating' => 2, 'comment' => 'pending', 'is_approved' => false, 'is_rejected' => false,
        ]);

        $public = $this->getJson(route('api.reviews.product', ['productId' => $product->id]));
        $public->assertJsonPath('stats.total_reviews', 2);
        $public->assertJsonPath('stats.average_rating', 4);
        $this->assertEquals(
            [1 => 0, 2 => 0, 3 => 1, 4 => 0, 5 => 1],
            $public->json('stats.rating_distribution')
        );
    }

    public function test_inactive_products_cannot_be_reviewed(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = Product::factory()->create([
            'store_id' => $store->id,
            'name' => 'Inactive ' . uniqid(),
            'is_active' => false,
        ]);
        $customer = $this->makeCustomer($store, 'inac@' . uniqid() . '.com');
        $order = $this->makeOrder($store, $customer, 'delivered');
        $this->addOrderItem($order, $product);

        [$response] = $this->submitReview($customer, [
            'product_id' => $product->id,
            'store_id' => $store->id,
            'order_id' => $order->id,
            'rating' => 5,
        ]);

        $response->assertStatus(422);
    }

    public function test_new_review_created_flag_and_message_shape(): void
    {
        [, $store] = $this->ownerWithStore();
        $product = $this->makeProduct($store);
        $customer = $this->makeCustomer($store, 'flag@' . uniqid() . '.com');
        $order = $this->makeOrder($store, $customer, 'delivered');
        $this->addOrderItem($order, $product);

        [$response] = $this->submitReview($customer, [
            'product_id' => $product->id,
            'store_id' => $store->id,
            'order_id' => $order->id,
            'rating' => 5,
        ]);

        $response->assertJsonPath('updated', false);
        $response->assertJsonPath('message', 'تم نشر تقييمك، شكراً لتعليقك.');
    }
}