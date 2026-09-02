<?php

namespace Tests\Feature;

use App\Models\AdvancedCoupon;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Customer;
use App\Models\DeliveryDriver;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductReview;
use App\Models\Store;
use App\Models\User;
use App\Models\WhatsAppTemplate;
use App\Models\StoreConfiguration;
use App\Services\AdvancedCouponService;
use App\Services\AnalyticsService;
use App\Services\CartCalculationService;
use App\Services\CustomerDirectoryService;
use App\Services\InventoryMovementService;
use App\Services\InventoryService;
use App\Services\PointOfSaleService;
use App\Services\PromotionEngineService;
use App\Services\StorefrontSeoService;
use App\Services\WhatsAppCommerceService;
use App\Support\AnalyticsPeriod;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Cross-feature integration certification for the Growth Suite phase 1.
 * Sections A-K verify that independently-developed features behave
 * correctly when wired together in one deployable build.
 */
class GrowthSuiteIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
        $this->seed(RoleSeeder::class);
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
        StoreConfiguration::flushRequestCache();
        \Illuminate\Support\Facades\Cache::flush();
    }

    private function companyWithStore(): array
    {
        $plan = Plan::factory()->create([
            'name' => 'Pro-'.uniqid(),
            'price' => 99,
            'themes' => ['all'],
            'max_stores' => 10,
            'max_products_per_store' => 1000,
            'max_users_per_store' => 20,
        ]);
        $user = User::factory()->create([
            'type' => 'company',
            'email_verified_at' => now(),
            'onboarded_at' => now(),
            'plan_id' => $plan->id,
            'plan_expire_date' => now()->addYear(),
            'plan_is_active' => 1,
        ]);
        $store = Store::factory()->create(['user_id' => $user->id]);
        $user->forceFill(['current_store' => $store->id])->save();

        $role = \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'company', 'guard_name' => 'web']);
        try {
            $role->syncPermissions(\Spatie\Permission\Models\Permission::all());
        } catch (\Throwable $e) {
        }
        try {
            $user->assignRole($role);
        } catch (\Throwable $e) {
        }
        foreach (\Spatie\Permission\Models\Permission::all() as $p) {
            try {
                $user->givePermissionTo($p);
            } catch (\Throwable $e) {
            }
        }

        return [$user->fresh(), $store, $plan];
    }

    private function category(Store $store): Category
    {
        return Category::factory()->create(['store_id' => $store->id, 'is_active' => true]);
    }

    private function product(Store $store, Category $cat, array $overrides = []): Product
    {
        return Product::factory()->create(array_merge([
            'store_id' => $store->id,
            'category_id' => $cat->id,
            'is_active' => true,
            'price' => 100,
            'stock' => 50,
            'track_inventory' => true,
            'allow_backorder' => false,
            'inventory_mode' => 'product',
            'variants' => [],
            'variant_combinations' => [],
        ], $overrides));
    }

    private function makeOrder(Store $store, array $overrides = []): Order
    {
        return Order::forceCreate(array_merge([
            'order_number' => Order::generateOrderNumber(),
            'store_id' => $store->id,
            'session_id' => 'sess-'.uniqid(),
            'status' => 'delivered',
            'payment_status' => 'paid',
            'paid_at' => now(),
            'customer_email' => 'totest@example.com',
            'customer_phone' => '0592000000',
            'customer_first_name' => 'Test',
            'customer_last_name' => 'Buyer',
            'shipping_address' => 'addr',
            'shipping_city' => 'Nablus',
            'shipping_state' => 'WB',
            'shipping_country' => 'PS',
            'billing_address' => 'addr',
            'billing_city' => 'N',
            'billing_state' => 'W',
            'billing_country' => 'PS',
            'subtotal' => 100,
            'shipping_amount' => 0,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'total_amount' => 100,
            'currency' => 'ILS',
            'payment_method' => 'cod',
            'order_source' => 'storefront',
        ], $overrides));
    }

    private function makeCoupon(Store $store, array $overrides = []): AdvancedCoupon
    {
        return AdvancedCoupon::create(array_merge([
            'store_id' => $store->id,
            'name' => 'Promo',
            'code_type' => 'manual',
            'code' => strtoupper('C'.uniqid()),
            'discount_type' => 'free_shipping',
            'discount_value' => 0,
            'status' => true,
        ], $overrides));
    }

    private function storeUrl(Store $store): string
    {
        return 'http://'.$store->slug.'.'.config('app.store_domain');
    }

    private function fetchGoogleFeed(Store $store)
    {
        return $this->get($this->storeUrl($store).'/feeds/google.xml');
    }

    private function canonicalProductUrl(Store $store, Product $product): string
    {
        $slug = $product->seo_url_slug ?: (string) $product->id;
        return $this->storeUrl($store).'/product/'.$slug;
    }

    /* ===== A. Delivery fee applied BEFORE promotion shipping discount ===== */

    public function test_delivery_zone_fee_is_base_shipping_before_promotion(): void
    {
        [$user, $store] = $this->companyWithStore();
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['price' => 100]);
        $session = 'sess-'.uniqid();
        CartItem::create(['store_id' => $store->id, 'session_id' => $session, 'product_id' => $p->id, 'quantity' => 2, 'price' => 100]);

        $zone = DeliveryZone::create(['store_id' => $store->id, 'name' => 'Central', 'fee' => 15, 'is_active' => true, 'sort_order' => 0]);

        $calc = CartCalculationService::calculateCartTotals($store->id, $session, null, null, $zone->id);
        $this->assertEquals((float) 15, (float) $calc['shipping'], 'base shipping must equal the active zone fee');
        $this->assertEquals((float) 15, (float) ($calc['delivery_zone']['fee'] ?? 0));

        $coupon = $this->makeCoupon($store);
        $out = app(PromotionEngineService::class)->applyShippingDiscount((float) $calc['shipping'], $coupon);
        $this->assertEquals(15, (float) $out['shipping_discount'], 'shipping discount is separate and capped at base fee');
        $this->assertEquals(0, (float) $out['shipping_payable']);
    }

    public function test_free_shipping_promotion_zeroes_shipping_without_mutating_zone_fee(): void
    {
        [$user, $store] = $this->companyWithStore();
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['price' => 100]);
        $session = 'sess-'.uniqid();
        CartItem::create(['store_id' => $store->id, 'session_id' => $session, 'product_id' => $p->id, 'quantity' => 1, 'price' => 100]);

        $zone = DeliveryZone::create(['store_id' => $store->id, 'name' => 'Central', 'fee' => 15, 'is_active' => true, 'sort_order' => 0]);

        $coupon = $this->makeCoupon($store, ['code_type' => 'manual']);

        $calcNoPromo = CartCalculationService::calculateCartTotals($store->id, $session, null, null, $zone->id);
        $this->assertEquals(15, (float) $calcNoPromo['shipping']);

        $calcWithPromo = CartCalculationService::calculateCartTotals($store->id, $session, $coupon->code, null, $zone->id);
        $this->assertEquals(0, (float) $calcWithPromo['shipping'], 'free-shipping promotion applies after the zone fee');
        $this->assertTrue((bool) ($calcWithPromo['free_shipping_applied'] ?? false), 'free shipping flag set');
    }

    /* ===== B. Normal POS sale does NOT require a delivery zone ===== */

    public function test_pos_sale_never_requires_delivery_zone(): void
    {
        [$user, $store] = $this->companyWithStore();
        $store->currency = 'ILS';
        $store->save();
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 10]);

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 2]],
            'cash'
        );

        $this->assertSame('pos', $order->order_source);
        $this->assertNull($order->delivery_zone_id, 'POS sale carries no delivery zone');
        $this->assertEquals((float) 0, (float) $order->delivery_fee);
        $this->assertEquals('In-Store', $order->shipping_address);
    }

    /* ===== C. POS payment semantics + single inventory movement ===== */

    public function test_pos_cash_collected_is_paid_and_creates_exactly_one_movement(): void
    {
        [$user, $store] = $this->companyWithStore();
        $store->currency = 'ILS';
        $store->save();
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 10]);

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 3]],
            'cash',
            null,
            null,
            true
        );

        $this->assertSame('delivered', $order->status);
        $this->assertSame('paid', $order->payment_status, 'cash + markCollected => paid');
        $this->assertNotNull($order->paid_at);
        $this->assertEquals(7, $p->fresh()->stock, 'stock decremented exactly once by qty');

        $movements = \App\Models\InventoryMovement::where('store_id', $store->id)
            ->where('reference_type', 'order')
            ->where('reference_id', $order->id)
            ->get();
        $this->assertCount(1, $movements, 'exactly ONE inventory movement per mutation');
        $this->assertSame('POS_SALE', $movements->first()->movement_type);
        $this->assertEquals(-3, $movements->first()->quantity_delta);
    }

    public function test_pos_bank_and_bank_transfer_stay_pending_until_confirmed(): void
    {
        [$user, $store] = $this->companyWithStore();
        $store->currency = 'ILS';
        $store->save();
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 10]);

        foreach (['bank', 'bank_transfer'] as $method) {
            $order = app(PointOfSaleService::class)->createPosSale(
                $store->id,
                [['product_id' => $p->id, 'quantity' => 1]],
                $method,
                null,
                null,
                true
            );
            $this->assertSame('pending', $order->payment_status, "$method must stay pending");
            $this->assertNull($order->paid_at);
        }
    }

    public function test_pos_rejects_cod(): void
    {
        [$user, $store] = $this->companyWithStore();
        $store->currency = 'ILS';
        $store->save();
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 10]);

        $this->expectException(\Exception::class);
        app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cod'
        );
    }

    /* ===== D. POS inventory decrement reflects in product feed availability ===== */

    public function test_pos_sale_drains_stock_and_feed_reports_out_of_stock(): void
    {
        [$user, $store] = $this->companyWithStore();
        $store->currency = 'ILS';
        $store->save();
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['stock' => 1, 'seo_url_slug' => 'pos-drained', 'name' => 'DrainedOnce']);

        $this->assertSame('in_stock', InventoryService::productAvailability($p->fresh()));

        app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash'
        );

        $p->refresh();
        $this->assertEquals(0, $p->stock);
        $this->assertSame('out_of_stock', InventoryService::productAvailability($p));

        $res = $this->fetchGoogleFeed($store);
        $res->assertOk();
        $this->assertStringContainsString('out_of_stock', $res->streamedContent(), 'feed reports the POS-drained product out of stock');
    }

    /* ===== E. Analytics includes POS sales (GMV + collected) ===== */

    public function test_pos_sales_flow_into_analytics_overview(): void
    {
        [$user, $store] = $this->companyWithStore();
        $store->currency = 'ILS';
        $store->save();
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['price' => 200, 'stock' => 5]);

        $order = app(PointOfSaleService::class)->createPosSale(
            $store->id,
            [['product_id' => $p->id, 'quantity' => 1]],
            'cash'
        );

        $this->assertSame('paid', $order->payment_status);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = app(AnalyticsService::class)->overview($store->id, $period, 'ILS');

        $this->assertGreaterThanOrEqual(200, (float) $o['metrics']['gmv']['primary'], 'POS sale contributes to GMV');
        $this->assertGreaterThanOrEqual(200, (float) $o['metrics']['collected']['primary'], 'paid POS sale contributes to collected');
    }

    /* ===== F. CRM + analytics: cancelled orders never count as valid ===== */

    public function test_cancelled_orders_do_not_count_toward_repeat_customer(): void
    {
        [$user, $store] = $this->companyWithStore();

        // 2 valid orders => repeat customer
        $this->makeOrder($store, ['customer_phone' => '0592000000', 'status' => 'delivered', 'payment_status' => 'paid', 'created_at' => now()->subDays(45)]);
        $this->makeOrder($store, ['customer_phone' => '0592000000', 'status' => 'delivered', 'payment_status' => 'paid', 'created_at' => now()]);

        // 1 valid + 1 cancelled => NOT repeat, cancelled must not count
        $this->makeOrder($store, ['customer_phone' => '0592111111', 'status' => 'delivered', 'payment_status' => 'paid', 'created_at' => now()]);
        $this->makeOrder($store, ['customer_phone' => '0592111111', 'status' => 'cancelled', 'payment_status' => 'pending', 'created_at' => now()]);

        $period = (new AnalyticsPeriod('Asia/Hebron', now()))->resolve('last_30_days');
        $o = app(AnalyticsService::class)->overview($store->id, $period, 'ILS');

        $this->assertEquals(1, $o['metrics']['repeat_customers']['current'], 'repeat = identity with >= 2 valid (non-cancelled) orders');
        $this->assertEquals(2, $o['metrics']['total_customers']['current']);
        $this->assertEquals(1, $o['new_vs_returning']['returning_customers']);
        $this->assertEquals(1, $o['new_vs_returning']['new_customers']);
    }

    /* ===== G. Verified-purchase review coexists with product SEO resolution ===== */

    public function test_verified_purchase_review_and_seo_product_resolution_coexist(): void
    {
        [$user, $store] = $this->companyWithStore();
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['seo_url_slug' => 'reviewed-seo-product', 'name' => 'Reviewed']);

        $customer = Customer::create(['store_id' => $store->id, 'first_name' => 'A', 'last_name' => 'B', 'email' => 'r@'.uniqid().'.com', 'is_active' => true]);
        ProductReview::create([
            'product_id' => $p->id,
            'store_id' => $store->id,
            'customer_id' => $customer->id,
            'order_id' => null,
            'order_item_id' => null,
            'rating' => 5,
            'title' => 'Great',
            'comment' => 'Love it',
            'is_approved' => true,
            'is_rejected' => false,
            'is_verified_purchase' => true,
        ]);

        $seo = app(StorefrontSeoService::class);
        $seo->setStore($store);
        $resolved = $seo->resolveProduct('reviewed-seo-product');
        $this->assertNotNull($resolved, 'SEO resolves product by seo_url_slug');
        $this->assertEquals($p->id, $resolved->id);

        $review = ProductReview::where('product_id', $p->id)
            ->where('store_id', $store->id)
            ->where('is_verified_purchase', true)
            ->where('is_approved', true)
            ->first();
        $this->assertNotNull($review, 'approved verified purchase review present');
        $this->assertEquals(5, (int) $review->rating);
    }

    /* ===== H. Feed g:link equals the SEO canonical product URL ===== */

    public function test_feed_g_link_matches_canonical_seo_product_url(): void
    {
        [$user, $store] = $this->companyWithStore();
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['seo_url_slug' => 'feed-seo-equal', 'name' => 'FeedEqual', 'price' => 49.99]);

        $res = $this->fetchGoogleFeed($store);
        $res->assertOk();

        $expected = $this->canonicalProductUrl($store, $p);
        $this->assertStringContainsString('<g:link>'.$expected.'</g:link>', $res->streamedContent(), 'feed g:link equals the canonical product URL');
    }

    /* ===== I. WhatsApp + CRM data isolation ===== */

    public function test_whatsapp_surface_never_exposes_crm_metrics(): void
    {
        $crmMetrics = ['orders_count', 'valid_count', 'cancelled_count', 'total_value', 'is_repeat', 'tags', 'notes', 'customer_group'];
        foreach ($crmMetrics as $metric) {
            $this->assertNotContains($metric, WhatsAppCommerceService::PLACEHOLDERS, "CRM metric $metric must not be a WhatsApp placeholder");
        }
    }

    public function test_whatsapp_templates_are_store_isolated_from_crm_edits(): void
    {
        [$userA, $storeA] = $this->companyWithStore();
        [$userB, $storeB] = $this->companyWithStore();

        WhatsAppTemplate::create([
            'store_id' => $storeA->id,
            'key' => 'order_confirmed',
            'locale' => 'en',
            'body' => 'A-ONLY custom confirmed body',
        ]);

        $svc = app(WhatsAppCommerceService::class);
        $this->assertSame('A-ONLY custom confirmed body', $svc->templateUrlForStore($storeA->id, 'order_confirmed', 'en'));
        $this->assertStringNotContainsString('A-ONLY', (string) $svc->templateUrlForStore($storeB->id, 'order_confirmed', 'en'), 'store B must not inherit store A template edit');
    }

    /* ===== J. Merchant navigation exposes Partner Program + Product Feeds ===== */

    public function test_merchant_navigation_has_partner_and_product_feeds_entries(): void
    {
        $nav = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        $this->assertStringContainsString('Product Feeds', $nav);
        $this->assertStringContainsString('product-feeds.index', $nav);
        $this->assertStringContainsString('Partner Program', $nav);
        $this->assertStringContainsString('partner.dashboard', $nav);

        $ar = file_get_contents(resource_path('lang/ar.json'));
        $this->assertStringContainsString('خلاصات المنتجات', $ar);
        $this->assertStringContainsString('برنامج الشركاء', $ar);
    }

    /* ===== K. Server-authoritative checkout ignores client-side totals ===== */

    public function test_checkout_total_is_recomputed_server_side_and_ignores_tampering(): void
    {
        [$user, $store] = $this->companyWithStore();
        $cat = $this->category($store);
        $p = $this->product($store, $cat, ['price' => 100]);

        // client submits a tampered unit price of 1 on the cart line
        $session = 'sess-'.uniqid();
        CartItem::create(['store_id' => $store->id, 'session_id' => $session, 'product_id' => $p->id, 'quantity' => 2, 'price' => 1]);

        $calc = CartCalculationService::calculateCartTotals($store->id, $session);
        $this->assertEquals(200, (float) $calc['subtotal'], 'subtotal recomputed from the persisted product price, not the tampered cart price');
        $this->assertEquals(200, (float) $calc['total']);
    }
}
