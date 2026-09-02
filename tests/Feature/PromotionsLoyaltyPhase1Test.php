<?php

namespace Tests\Feature;

use App\Models\AdvancedCoupon;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Customer;
use App\Models\LoyaltySetting;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\User;
use App\Services\AdvancedCouponService;
use App\Services\CartCalculationService;
use App\Services\LoyaltyService;
use App\Services\PromotionAnalyticsService;
use App\Services\PromotionEngineService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PromotionsLoyaltyPhase1Test extends TestCase
{
    use RefreshDatabase;

    private function store(array $overrides = []): array
    {
        $plan = Plan::factory()->create(['max_stores' => 10, 'max_products_per_store' => 1000, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'onboarded_at' => now(), 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth()]);
        $store = Store::factory()->create(array_merge(['user_id' => $user->id], $overrides));
        $user->current_store = $store->id; $user->save();
        return [$user, $store];
    }

    private function customer(Store $store, ?string $email = null): Customer
    {
        return Customer::create([
            'store_id' => $store->id, 'first_name' => 'F', 'last_name' => 'L',
            'email' => $email ?? 'c' . uniqid() . '@t.test', 'password' => bcrypt('x'),
            'email_verified_at' => now(), 'is_active' => true,
        ]);
    }

    private function product(Store $store, ?Category $cat = null, float $price = 100, int $stock = 500): Product
    {
        $c = $cat ?? Category::factory()->create(['store_id' => $store->id]);
        return Product::create([
            'store_id' => $store->id, 'category_id' => $c->id, 'name' => 'P' . uniqid(),
            'price' => $price, 'stock' => $stock, 'is_active' => true,
            'images' => '/a.jpg', 'cover_image' => '/a.jpg',
        ]);
    }

    private function cartItem(Store $store, Product $product, int $quantity = 1, ?Customer $customer = null): CartItem
    {
        return CartItem::create([
            'store_id' => $store->id, 'customer_id' => $customer?->id, 'session_id' => session()->getId(),
            'product_id' => $product->id, 'quantity' => $quantity, 'price' => (float) $product->sale_price ?? (float) $product->price,
            'variants' => null,
        ]);
    }

    private function order(Store $store, Customer $customer, float $subtotal = 100, string $status = 'delivered', string $ps = 'paid'): Order
    {
        $o = new Order();
        $o->store_id = $store->id; $o->customer_id = $customer->id;
        $o->order_number = Order::generateOrderNumber();
        $o->status = $status; $o->payment_status = $ps;
        $o->subtotal = $subtotal; $o->discount_amount = 0; $o->shipping_amount = 0; $o->tax_amount = 0; $o->total_amount = $subtotal;
        $o->customer_email = $customer->email; $o->customer_first_name = $customer->first_name; $o->customer_last_name = $customer->last_name;
        $o->shipping_address = 'addr'; $o->shipping_city = 'city'; $o->shipping_state = 'st'; $o->shipping_country = 'PS';
        $o->billing_address = 'addr'; $o->billing_city = 'city'; $o->billing_state = 'st'; $o->billing_country = 'PS';
        $o->payment_method = 'cod';
        $o->save();
        return $o->fresh();
    }

    private function coupon(array $overrides = []): AdvancedCoupon
    {
        return AdvancedCoupon::create(array_merge([
            'store_id' => 1,
            'name' => 'Promo',
            'code_type' => 'manual',
            'code' => strtoupper('C' . uniqid()),
            'discount_type' => 'percentage',
            'discount_value' => 10,
            'status' => true,
        ], $overrides));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PERCENTAGE / FIXED / CAP
    // ─────────────────────────────────────────────────────────────────────────

    public function test_percentage_coupon(): void
    {
        [$u, $s] = $this->store();
        $p = $this->product($s, null, 1000);
        $this->cartItem($s, $p, 1);
        $c = $this->coupon(['store_id' => $s->id, 'discount_type' => 'percentage', 'discount_value' => 10]);
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 1000, 0, [['product_id' => $p->id, 'quantity' => 1, 'unit_price' => 1000, 'category_id' => $p->category_id]]);
        $this->assertTrue($r['applied']);
        $this->assertEquals(100.0, (float) $r['discount_amount']);
    }

    public function test_fixed_coupon(): void
    {
        [$u, $s] = $this->store();
        $p = $this->product($s, null, 1000);
        $c = $this->coupon(['store_id' => $s->id, 'discount_type' => 'fixed', 'discount_value' => 20]);
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 1000, 0, [['product_id' => $p->id, 'quantity' => 1, 'unit_price' => 1000, 'category_id' => $p->category_id]]);
        $this->assertTrue($r['applied']);
        $this->assertEquals(20.0, (float) $r['discount_amount']);
    }

    public function test_max_discount_cap(): void
    {
        [$u, $s] = $this->store();
        $p = $this->product($s, null, 1000);
        # 20% of 1000 = 200, cap at 50
        $c = $this->coupon(['store_id' => $s->id, 'discount_type' => 'percentage', 'discount_value' => 20, 'max_discount_amount' => 50]);
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 1000, 0, [['product_id' => $p->id, 'quantity' => 1, 'unit_price' => 1000, 'category_id' => $p->category_id]]);
        $this->assertEquals(50.0, (float) $r['discount_amount']);
    }

    public function test_discount_never_exceeds_eligible_amount(): void
    {
        [$u, $s] = $this->store();
        $c = $this->coupon(['store_id' => $s->id, 'discount_type' => 'fixed', 'discount_value' => 5000]);
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 100, 0, []);
        # discount capped to subtotal
        $this->assertLessThanOrEqual(100.0, (float) $r['discount_amount']);
    }

    public function test_final_total_cannot_become_negative(): void
    {
        [$u, $s] = $this->store();
        $p = $this->product($s, null, 30);
        $this->cartItem($s, $p, 1);
        $c = $this->coupon(['store_id' => $s->id, 'discount_type' => 'fixed', 'discount_value' => 100]);
        $calc = CartCalculationService::calculateCartTotals($s->id, session()->getId(), $c->code, null);
        $this->assertGreaterThanOrEqual(0, (float) $calc['total']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ELIGIBILITY / TIMING
    // ─────────────────────────────────────────────────────────────────────────

    public function test_minimum_subtotal_not_reached(): void
    {
        [$u, $s] = $this->store();
        $p = $this->product($s, null, 50);
        $c = $this->coupon(['store_id' => $s->id, 'minimum_order_amount' => 100]);
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 50, 0, [['product_id' => $p->id, 'quantity' => 1, 'unit_price' => 50, 'category_id' => $p->category_id]]);
        $this->assertFalse($r['applied']);
        $this->assertContains('coupon_minimum_not_met', $r['errors']);
    }

    public function test_expired_coupon(): void
    {
        [$u, $s] = $this->store();
        $c = $this->coupon(['store_id' => $s->id, 'expires_at' => now()->subDay()]);
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 500, 0, []);
        $this->assertFalse($r['applied']);
        $this->assertContains('coupon_inactive_period', $r['errors']);
    }

    public function test_not_started_coupon(): void
    {
        [$u, $s] = $this->store();
        $c = $this->coupon(['store_id' => $s->id, 'starts_at' => now()->addDay()]);
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 500, 0, []);
        $this->assertFalse($r['applied']);
        $this->assertContains('coupon_inactive_period', $r['errors']);
    }

    public function test_inactive_promotion(): void
    {
        [$u, $s] = $this->store();
        $c = $this->coupon(['store_id' => $s->id, 'status' => false]);
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 500, 0, []);
        $this->assertFalse($r['applied']);
        $this->assertContains('coupon_disabled', $r['errors']);
    }

    public function test_usage_limit_exceeded(): void
    {
        [$u, $s] = $this->store();
        $c = $this->coupon(['store_id' => $s->id, 'usage_limit' => 1, 'used_count' => 1]);
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 500, 0, []);
        $this->assertFalse($r['applied']);
        $this->assertContains('coupon_usage_limit_exceeded', $r['errors']);
    }

    public function test_wrong_store_coupon(): void
    {
        [$uA, $sA] = $this->store();
        [$uB, $sB] = $this->store();
        $c = $this->coupon(['store_id' => $sA->id, 'code' => 'AAAA']);
        # Trying to use store A coupon at store B -> not found
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $sB->id, 500, 0, []);
        $this->assertFalse($r['applied']);
        $this->assertContains('coupon_not_found', $r['errors']);
    }

    public function test_product_specific_discount(): void
    {
        [$u, $s] = $this->store();
        $catA = Category::factory()->create(['store_id' => $s->id]);
        $catB = Category::factory()->create(['store_id' => $s->id]);
        $pA = $this->product($s, $catA, 100);
        $pB = $this->product($s, $catB, 100);
        $c = $this->coupon(['store_id' => $s->id, 'discount_type' => 'percentage', 'discount_value' => 10]);
        $c->products()->sync([$pA->id]);
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 200, 0, [
            ['product_id' => $pB->id, 'quantity' => 1, 'unit_price' => 100, 'category_id' => $pB->category_id],
        ]);
        # Only A-bound promotion, cart has B -> invalid for some items
        $this->assertFalse($r['applied']);
        $this->assertContains('coupon_not_valid_for_some_items', $r['errors']);
    }

    public function test_category_specific_discount(): void
    {
        [$u, $s] = $this->store();
        $cat = Category::factory()->create(['store_id' => $s->id]);
        $p = $this->product($s, $cat, 100);
        $c = $this->coupon(['store_id' => $s->id, 'discount_type' => 'percentage', 'discount_value' => 10]);
        $c->categories()->sync([$cat->id]);
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 100, 0, [['product_id' => $p->id, 'quantity' => 1, 'unit_price' => 100, 'category_id' => $p->category_id]]);
        $this->assertTrue($r['applied']);
        $this->assertEquals(10.0, (float) $r['discount_amount']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // QUANTITY DISCOUNT
    // ─────────────────────────────────────────────────────────────────────────

    public function test_quantity_discount_tier(): void
    {
        [$u, $s] = $this->store();
        $p = $this->product($s, null, 100);
        $c = $this->coupon([
            'store_id' => $s->id, 'discount_type' => 'quantity',
            'quantity_tiers' => [['min_qty' => 2, 'discount_value' => 5], ['min_qty' => 3, 'discount_value' => 10]],
        ]);
        # buy 3x100 = 300 -> 10% = 30
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 300, 0, [['product_id' => $p->id, 'quantity' => 3, 'unit_price' => 100, 'category_id' => $p->category_id, 'parent_product_id' => $p->id]]);
        $this->assertTrue($r['applied']);
        $this->assertEquals(30.0, (float) $r['discount_amount']);
    }

    public function test_quantity_discount_not_reached(): void
    {
        [$u, $s] = $this->store();
        $p = $this->product($s, null, 100);
        $c = $this->coupon([
            'store_id' => $s->id, 'discount_type' => 'quantity',
            'quantity_tiers' => [['min_qty' => 2, 'discount_value' => 5]],
        ]);
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 100, 0, [['product_id' => $p->id, 'quantity' => 1, 'unit_price' => 100, 'category_id' => $p->category_id]]);
        $this->assertTrue($r['applied']);
        $this->assertEquals(0.0, (float) $r['discount_amount']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUY X GET Y
    // ─────────────────────────────────────────────────────────────────────────

    public function test_buy_x_get_y(): void
    {
        [$u, $s] = $this->store();
        $p = $this->product($s, null, 100);
        $c = $this->coupon(['store_id' => $s->id, 'discount_type' => 'buy_one_get_one', 'bogo_quantity' => 2, 'bogo_free_quantity' => 1]);
        # buy 3 (2 + 1 free) x100 -> discount 100
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 300, 0, [['product_id' => $p->id, 'quantity' => 3, 'unit_price' => 100, 'category_id' => $p->category_id]]);
        $this->assertTrue($r['applied']);
        $this->assertEquals(100.0, (float) $r['discount_amount']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FREE SHIPPING PROMOTION (Section C)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_free_shipping_promotion(): void
    {
        [$u, $s] = $this->store();
        $c = $this->coupon(['store_id' => $s->id, 'discount_type' => 'free_shipping']);
        $r = app(AdvancedCouponService::class)->applyCouponToCart($c->code, $s->id, 300, 25, []);
        $this->assertTrue($r['applied']);
        $this->assertEquals('free_shipping', $r['discount_type']);
        # shipping discount path caps to the base shipping cost
        $out = app(PromotionEngineService::class)->applyShippingDiscount(25, $c);
        $this->assertEquals(25, (float) $out['shipping_discount']);
        $this->assertEquals(0, (float) $out['shipping_payable']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // AUTOMATIC PROMOTIONS + DETERMINISTIC BEST (Sections 5, 8)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_best_automatic_promotion_is_selected(): void
    {
        [$u, $s] = $this->store();
        $this->coupon(['store_id' => $s->id, 'code_type' => 'auto', 'code' => 'AUTO1', 'discount_value' => 10]); // 10% of 1000 = 100
        $this->coupon(['store_id' => $s->id, 'code_type' => 'auto', 'code' => 'AUTO2', 'discount_value' => 25]); // 25% = 250
        $engine = app(PromotionEngineService::class);
        $r = $engine->resolveAutomaticPromotion($s->id, ['subtotal' => 1000, 'items' => []]);
        $this->assertTrue($r['applied']);
        $this->assertEquals('AUTO2', $r['coupon']->code);
        $this->assertEquals(250.0, (float) $r['discount_amount']);
    }

    public function test_automatic_promotion_applied_without_code_in_cart(): void
    {
        [$u, $s] = $this->store();
        $p = $this->product($s, null, 1000);
        $this->cartItem($s, $p, 1);
        $this->coupon(['store_id' => $s->id, 'code_type' => 'auto', 'discount_value' => 10]);
        $calc = CartCalculationService::calculateCartTotals($s->id, session()->getId(), null, null);
        $this->assertTrue($calc['applied_advanced_coupon']);
        $this->assertEquals(100.0, (float) $calc['discount']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FORGED CLIENT DISCOUNT IGNORED (server-side recalc canonical)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_forged_client_discount_ignored(): void
    {
        [$u, $s] = $this->store();
        $p = $this->product($s, null, 100);
        $this->cartItem($s, $p, 1);
        # Even if a bogus coupon code is provided, cart calc ignores it
        $calc = CartCalculationService::calculateCartTotals($s->id, session()->getId(), 'NOT_A_REAL_CODE', null);
        $this->assertEquals(0, (float) $calc['discount']);
        $this->assertEquals(100.0, (float) $calc['total']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ORDER SNAPSHOT (Section 10)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_order_promotion_snapshot_is_immutable(): void
    {
        [$u, $s] = $this->store();
        $c = $this->customer($s);
        $o = $this->order($s, $c, 100);
        $o->forceFill([
            'promotion_type' => 'percentage',
            'promotion_name' => 'Promo',
            'promotion_id' => 55,
            'promotion_snapshot' => ['id' => 55, 'name' => 'Promo', 'code' => 'PROMO', 'discount_type' => 'percentage', 'discount_amount' => 10, 'currency' => 'ILS'],
        ])->save();
        $fresh = $o->fresh();
        $this->assertEquals('percentage', $fresh->promotion_type);
        $this->assertIsArray($fresh->promotion_snapshot);
        $this->assertEquals('Promo', $fresh->promotion_snapshot['name']);
    }

    public function test_replicate_duplicates_promotion_settings(): void
    {
        [$u, $s] = $this->store();
        $c = $this->coupon(['store_id' => $s->id, 'discount_type' => 'quantity', 'quantity_tiers' => [['min_qty' => 2, 'discount_value' => 5]], 'code_type' => 'auto', 'used_count' => 4]);
        $copy = $c->replicateForDuplication();
        $this->assertNull($copy->id);
        $this->assertEquals($c->discount_type, $copy->discount_type);
        $this->assertEquals($c->quantity_tiers, $copy->quantity_tiers);
        $this->assertEquals($c->code_type, $copy->code_type);
        $this->assertEquals(0, $copy->used_count);
        $this->assertFalse($copy->status);
        $copy->store_id = $s->id;
        $copy->save();
        $this->assertNotNull($copy->id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PROMOTION ANALYTICS (Section 18)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_promotion_analytics_excludes_cancelled_orders(): void
    {
        [$u, $s] = $this->store();
        $c = $this->coupon(['store_id' => $s->id, 'code_type' => 'manual']);
        $cust = $this->customer($s);
        $delivered = $this->order($s, $cust, 100, 'delivered', 'paid');
        $cancelled = $this->order($s, $cust, 200, 'cancelled', 'failed');
        $c->recordUsage(['order_id' => $delivered->id, 'customer_id' => $cust->id, 'customer_identifier' => $cust->email, 'discount_amount' => 10]);
        $c->recordUsage(['order_id' => $cancelled->id, 'customer_id' => $cust->id, 'customer_identifier' => $cust->email, 'discount_amount' => 20]);
        $m = app(PromotionAnalyticsService::class)->forPromotion($c->fresh());
        # Only the delivered (valid) order counts
        $this->assertEquals(1, $m['uses']);
        $this->assertEquals(10.0, (float) $m['total_discount_granted']);
        $this->assertEquals(100.0, (float) $m['valid_order_value']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LOYALTY — DELIVERED ONLY EARNS (Section 20)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_delivered_order_earns_points(): void
    {
        [$u, $s] = $this->store();
        LoyaltySetting::forStore($s->id)->update(['is_enabled' => true, 'points_per_currency' => 1]);
        $c = $this->customer($s);
        $o = $this->order($s, $c, 200, 'delivered', 'paid');
        app(LoyaltyService::class)->earnPointsForOrder($o);
        $this->assertEquals(200, LoyaltyTransaction::balanceFor($s->id, $c->id));
    }

    public function test_created_order_earns_zero(): void
    {
        [$u, $s] = $this->store();
        LoyaltySetting::forStore($s->id)->update(['is_enabled' => true]);
        $c = $this->customer($s);
        $o = $this->order($s, $c, 200, 'pending', 'pending');
        app(LoyaltyService::class)->earnPointsForOrder($o);
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($s->id, $c->id));
    }

    public function test_shipped_and_cancelled_earn_zero(): void
    {
        [$u, $s] = $this->store();
        LoyaltySetting::forStore($s->id)->update(['is_enabled' => true]);
        $c = $this->customer($s);
        app(LoyaltyService::class)->earnPointsForOrder($this->order($s, $c, 200, 'shipped', 'paid'));
        app(LoyaltyService::class)->earnPointsForOrder($this->order($s, $c, 200, 'cancelled', 'failed'));
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($s->id, $c->id));
    }

    public function test_duplicate_earn_does_not_double_award(): void
    {
        [$u, $s] = $this->store();
        LoyaltySetting::forStore($s->id)->update(['is_enabled' => true, 'points_per_currency' => 1]);
        $c = $this->customer($s);
        $o = $this->order($s, $c, 100, 'delivered', 'paid');
        app(LoyaltyService::class)->earnPointsForOrder($o);
        app(LoyaltyService::class)->earnPointsForOrder($o->fresh());
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($s->id, $c->id));
    }

    public function test_refund_reverses_points(): void
    {
        [$u, $s] = $this->store();
        LoyaltySetting::forStore($s->id)->update(['is_enabled' => true, 'points_per_currency' => 1]);
        $c = $this->customer($s);
        $o = $this->order($s, $c, 100, 'delivered', 'paid');
        app(LoyaltyService::class)->earnPointsForOrder($o);
        app(LoyaltyService::class)->reversePointsForOrder($o->fresh());
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($s->id, $c->id));
    }

    public function test_loyalty_balance_isolation_between_stores(): void
    {
        [$uA, $sA] = $this->store();
        [$uB, $sB] = $this->store();
        LoyaltySetting::forStore($sA->id)->update(['is_enabled' => true, 'points_per_currency' => 1]);
        LoyaltySetting::forStore($sB->id)->update(['is_enabled' => true, 'points_per_currency' => 1]);
        $ca = $this->customer($sA);
        $cb = $this->customer($sB);
        app(LoyaltyService::class)->earnPointsForOrder($this->order($sA, $ca, 150, 'delivered'));
        app(LoyaltyService::class)->earnPointsForOrder($this->order($sB, $cb, 50, 'delivered'));
        $this->assertEquals(150, LoyaltyTransaction::balanceFor($sA->id, $ca->id));
        $this->assertEquals(50, LoyaltyTransaction::balanceFor($sB->id, $cb->id));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STOREFRONT VALIDATION ENDPOINTS — SERVER IS AUTHORITATIVE
    // ─────────────────────────────────────────────────────────────────────────

    public function test_legacy_coupon_validate_is_advanced_aware(): void
    {
        [$u, $s] = $this->store();
        $c = $this->coupon(['store_id' => $s->id, 'discount_type' => 'percentage', 'discount_value' => 10, 'code' => 'ADVFIX10']);

        $res = $this->postJson(route('api.coupon.validate'), [
            'code' => $c->code,
            'store_id' => $s->id,
            'subtotal' => 1000,
        ]);

        $res->assertOk()
            ->assertJson(['valid' => true])
            ->assertJsonPath('coupon.code', $c->code)
            ->assertJsonPath('coupon.discount', 100);
    }

    public function test_legacy_coupon_validate_rejects_advanced_coupon_below_minimum(): void
    {
        [$u, $s] = $this->store();
        $c = $this->coupon(['store_id' => $s->id, 'discount_type' => 'percentage', 'discount_value' => 10, 'minimum_order_amount' => 100, 'code' => 'ADVMIN10']);

        $res = $this->postJson(route('api.coupon.validate'), [
            'code' => $c->code,
            'store_id' => $s->id,
            'subtotal' => 50,
        ]);

        $res->assertStatus(400)->assertJson(['valid' => false]);
    }

    public function test_advanced_coupon_validation_is_authoritative_for_cart_mutation(): void
    {
        [$u, $s] = $this->store();
        $p = $this->product($s, null, 100);
        $c = $this->coupon(['store_id' => $s->id, 'discount_type' => 'percentage', 'discount_value' => 10, 'minimum_order_amount' => 100, 'code' => 'MUT100']);

        // Valid context: cart subtotal meets the minimum.
        $valid = $this->postJson(route('api.advanced-coupon.validate'), [
            'code' => $c->code,
            'store_id' => $s->id,
            'subtotal' => 200,
            'items' => [['product_id' => $p->id, 'quantity' => 2, 'unit_price' => 100, 'category_id' => $p->category_id]],
        ]);
        $valid->assertOk()->assertJson(['valid' => true]);

        // Simulated cart mutation: quantity reduced so subtotal drops below the
        // minimum. The server (not the browser) rejects the stale discount.
        $invalid = $this->postJson(route('api.advanced-coupon.validate'), [
            'code' => $c->code,
            'store_id' => $s->id,
            'subtotal' => 50,
            'items' => [['product_id' => $p->id, 'quantity' => 1, 'unit_price' => 50, 'category_id' => $p->category_id]],
        ]);
        $invalid->assertOk()->assertJson(['valid' => false]);
    }

    public function test_advanced_coupon_validation_handles_quantity_tiers(): void
    {
        [$u, $s] = $this->store();
        $p = $this->product($s, null, 100);
        $c = $this->coupon([
            'store_id' => $s->id,
            'discount_type' => 'quantity',
            'discount_value' => 0,
            'quantity_tiers' => [['min_qty' => 2, 'discount_value' => 10, 'max_discount_amount' => null]],
            'code' => 'QTY2',
        ]);

        // One unit: no tier reached, discount 0 but coupon still applies.
        $one = $this->postJson(route('api.advanced-coupon.validate'), [
            'code' => $c->code,
            'store_id' => $s->id,
            'subtotal' => 100,
            'items' => [['product_id' => $p->id, 'quantity' => 1, 'unit_price' => 100, 'category_id' => $p->category_id]],
        ]);
        $one->assertOk()->assertJson(['valid' => true, 'discount_amount' => 0]);

        // Two units: tier reached -> 10% of 200 = 20.
        $two = $this->postJson(route('api.advanced-coupon.validate'), [
            'code' => $c->code,
            'store_id' => $s->id,
            'subtotal' => 200,
            'items' => [['product_id' => $p->id, 'quantity' => 2, 'unit_price' => 100, 'category_id' => $p->category_id]],
        ]);
        $two->assertOk()->assertJson(['valid' => true, 'discount_amount' => 20]);
    }
}
