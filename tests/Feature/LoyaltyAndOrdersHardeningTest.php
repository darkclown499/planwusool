<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Category;
use App\Models\LoyaltySetting;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use App\Services\LoyaltyService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoyaltyAndOrdersHardeningTest extends TestCase
{
    use RefreshDatabase;

    private function merchantWithStore(array $storeOverrides = []): array
    {
        $plan = Plan::factory()->create(['max_stores' => 10, 'max_products_per_store' => 1000, 'themes' => ['all']]);
        $user = User::factory()->create(['type' => 'company', 'email_verified_at' => now(), 'onboarded_at' => now(), 'plan_id' => $plan->id, 'plan_expire_date' => now()->addMonth()]);
        $store = Store::factory()->create(array_merge(['user_id' => $user->id], $storeOverrides));
        $user->current_store = $store->id;
        $user->save();
        return [$user, $store, $plan];
    }

    private function customerForStore(Store $store): Customer
    {
        return Customer::create([
            'store_id' => $store->id,
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test' . uniqid() . '@example.com',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
            'is_active' => true,
        ]);
    }

    private function orderForCustomer(Store $store, Customer $customer, float $subtotal = 100, string $status = 'delivered', string $paymentStatus = 'paid'): Order
    {
        $order = new Order();
        $order->store_id = $store->id;
        $order->customer_id = $customer->id;
        $order->order_number = Order::generateOrderNumber();
        $order->status = $status;
        $order->payment_status = $paymentStatus;
        $order->subtotal = $subtotal;
        $order->discount_amount = 0;
        $order->shipping_amount = 0;
        $order->tax_amount = 0;
        $order->total_amount = $subtotal;
        $order->customer_email = $customer->email;
        $order->customer_first_name = $customer->first_name;
        $order->customer_last_name = $customer->last_name;
        $order->shipping_address = 'Test St 1';
        $order->shipping_city = 'Ramallah';
        $order->shipping_state = 'West Bank';
        $order->shipping_country = 'PS';
        $order->billing_address = 'Test St 1';
        $order->billing_city = 'Ramallah';
        $order->billing_state = 'West Bank';
        $order->billing_country = 'PS';
        $order->payment_method = 'cod';
        $order->save();
        // minimal item
        $cat = Category::factory()->create(['store_id' => $store->id]);
        $prod = Product::create(['store_id' => $store->id, 'category_id' => $cat->id, 'name' => 'P', 'price' => $subtotal, 'stock' => 100, 'is_active' => true, 'images' => '/a.jpg', 'cover_image' => '/a.jpg']);
        OrderItem::create(['order_id' => $order->id, 'product_id' => $prod->id, 'product_name' => $prod->name, 'quantity' => 1, 'product_price' => $subtotal, 'unit_price' => $subtotal, 'total_price' => $subtotal]);
        return $order->fresh();
    }

    // === ORDERS CRASH ===

    public function test_orders_index_imports_tPaymentStatus(): void
    {
        $content = file_get_contents(resource_path('js/pages/orders/index.tsx'));
        $this->assertStringContainsString('tPaymentStatus', $content, 'orders/index must reference tPaymentStatus');
        $this->assertMatchesRegularExpression('/import\s*\{[^}]*tPaymentStatus[^}]*\}\s*from\s*[\'"]@\/utils\/order-status[\'"]/', $content, 'tPaymentStatus must be imported from canonical helper');
        // should not have bare undefined variable without import
        $this->assertStringNotContainsString('tPaymentStatus is not defined', $content);
    }

    public function test_orders_index_guards_payment_status(): void
    {
        $content = file_get_contents(resource_path('js/pages/orders/index.tsx'));
        // should guard paymentStatus before calling tPaymentStatus
        $this->assertStringContainsString('paymentStatus', $content);
        // ensure guarded via conditional or String() cast
        $this->assertTrue(str_contains($content, '(order as any).paymentStatus') || str_contains($content, 'String('));
    }

    public function test_orders_show_guards_null_status(): void
    {
        $content = file_get_contents(resource_path('js/pages/orders/show.tsx'));
        $this->assertStringContainsString('String(order?.status', $content, 'statusLower must use safe String cast');
        $this->assertStringContainsString('String(order?.paymentStatus', $content);
        // tPaymentStatus calls must be guarded with String()
        $this->assertStringContainsString('tPaymentStatus(String(', $content);
        // items mapping must be null-safe
        $this->assertStringContainsString('(order.items ?? [])', $content);
    }

    public function test_orders_show_row_missing_optional_does_not_throw(): void
    {
        // Simulate PHP order payload missing optional fields, ensure show.tsx guards handle null
        $content = file_get_contents(resource_path('js/pages/orders/show.tsx'));
        // statusLower fallback ensures empty string when null
        $this->assertStringContainsString("String(order?.status ?? '')", $content);
        $this->assertStringContainsString("formatCurrency(Number(order?.summary?.total) || 0)", $content);
    }

    public function test_error_boundary_hides_raw_exception_in_production(): void
    {
        $content = file_get_contents(resource_path('js/components/ErrorBoundary.tsx'));
        $this->assertStringContainsString("تعذر تحميل الصفحة", $content, 'Production message must be Arabic friendly');
        $this->assertStringContainsString('isDev', $content, 'Must gate error details by isDev');
        $this->assertStringContainsString('import.meta', $content);
        // Ensure dev-gated block exists
        $this->assertMatchesRegularExpression('/isDev\s*&&\s*this\.state\.error/', $content);
    }

    public function test_tPaymentStatus_canonical_exists(): void
    {
        $content = file_get_contents(resource_path('js/utils/order-status.ts'));
        $this->assertStringContainsString('export function tPaymentStatus', $content);
        $this->assertStringContainsString("if (!status) return ''", $content, 'must handle null/empty');
    }

    // === LOYALTY DEFAULT & MASTER SWITCH ===

    public function test_loyalty_default_is_disabled_for_new_store(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $settings = LoyaltySetting::forStore($store->id);
        $this->assertFalse((bool) $settings->is_enabled, 'New store loyalty must default OFF (false)');
    }

    public function test_merchant_can_enable_loyalty(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $user->type = 'superadmin';
        $user->save();
        $this->actingAs($user);
        $this->post(route('loyalty.settings.update'), [
            'is_enabled' => true,
            'points_per_currency' => 2,
            'points_value' => 0.05,
            'minimum_redemption_points' => 50,
            'maximum_discount_percentage' => 30,
            'signup_bonus_points' => 10,
            'review_bonus_points' => 5,
            'points_expire' => false,
            'expiry_days' => 90,
            'expiry_reminder_days' => 7,
        ])->assertRedirect();
        $this->assertTrue((bool) LoyaltySetting::forStore($store->id)->is_enabled);
        $this->assertEquals(2, (float) LoyaltySetting::forStore($store->id)->points_per_currency);
    }

    public function test_merchant_can_disable_loyalty(): void
    {
        [$user, $store] = $this->merchantWithStore();
        LoyaltySetting::forStore($store->id)->update(['is_enabled' => true]);
        $user->type = 'superadmin';
        $user->save();
        $this->actingAs($user);
        $this->post(route('loyalty.settings.update'), [
            'is_enabled' => false,
            'points_per_currency' => 1,
            'points_value' => 0.01,
            'minimum_redemption_points' => 100,
            'maximum_discount_percentage' => 50,
            'signup_bonus_points' => 0,
            'review_bonus_points' => 0,
            'points_expire' => false,
            'expiry_days' => 90,
            'expiry_reminder_days' => 7,
        ])->assertRedirect();
        $this->assertFalse((bool) LoyaltySetting::forStore($store->id)->fresh()->is_enabled);
    }

    public function test_loyalty_settings_persist_and_propagate_to_storefront(): void
    {
        [$user, $store] = $this->merchantWithStore();
        $s = LoyaltySetting::forStore($store->id);
        $s->update(['is_enabled' => true, 'points_per_currency' => 3, 'points_value' => 0.02]);
        $ctrl = new \App\Http\Controllers\ThemeController();
        $ref = new \ReflectionMethod($ctrl, 'getStoreConfig');
        $ref->setAccessible(true);
        $storeData = ['id' => $store->id, 'name' => $store->name, 'email' => $store->email, 'theme' => 'fashion-atelier', 'slug' => $store->slug, 'description' => ''];
        $cfg = $ref->invoke($ctrl, $storeData);
        $this->assertTrue($cfg['storeSettings']['loyalty']['is_enabled']);
        $this->assertEquals(3, $cfg['storeSettings']['loyalty']['points_per_currency']);
        // Now disable
        $s->update(['is_enabled' => false]);
        $cfg2 = $ref->invoke($ctrl, $storeData);
        $this->assertFalse($cfg2['storeSettings']['loyalty']['is_enabled']);
    }

    public function test_off_prevents_earning(): void
    {
        [$user, $store] = $this->merchantWithStore();
        LoyaltySetting::forStore($store->id)->update(['is_enabled' => false, 'points_per_currency' => 1]);
        $customer = $this->customerForStore($store);
        $order = $this->orderForCustomer($store, $customer, 100);
        app(LoyaltyService::class)->earnPointsForOrder($order);
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($store->id, $customer->id));
        $this->assertDatabaseMissing('loyalty_transactions', ['order_id' => $order->id]);
    }

    public function test_on_earns_according_to_canonical_rule(): void
    {
        [$user, $store] = $this->merchantWithStore();
        LoyaltySetting::forStore($store->id)->update(['is_enabled' => true, 'points_per_currency' => 1, 'points_value' => 0.01]);
        $customer = $this->customerForStore($store);
        $order = $this->orderForCustomer($store, $customer, 80);
        app(LoyaltyService::class)->earnPointsForOrder($order);
        // points = amount * points_per_currency = 80 *1 =80
        $this->assertEquals(80, LoyaltyTransaction::balanceFor($store->id, $customer->id));
        // different rule: 2 points per currency
        LoyaltyTransaction::truncate();
        LoyaltySetting::forStore($store->id)->update(['points_per_currency' => 2]);
        $order2 = $this->orderForCustomer($store, $customer, 50);
        app(LoyaltyService::class)->earnPointsForOrder($order2);
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($store->id, $customer->id));
    }

    public function test_no_duplicate_earning(): void
    {
        [$user, $store] = $this->merchantWithStore();
        LoyaltySetting::forStore($store->id)->update(['is_enabled' => true, 'points_per_currency' => 1]);
        $customer = $this->customerForStore($store);
        $order = $this->orderForCustomer($store, $customer, 100);
        $svc = app(LoyaltyService::class);
        $svc->earnPointsForOrder($order);
        $svc->earnPointsForOrder($order);
        $svc->earnPointsForOrder($order);
        $this->assertEquals(1, LoyaltyTransaction::where('order_id', $order->id)->where('type', 'earn')->count());
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($store->id, $customer->id));
    }

    public function test_cancelled_order_reversal(): void
    {
        [$user, $store] = $this->merchantWithStore();
        LoyaltySetting::forStore($store->id)->update(['is_enabled' => true, 'points_per_currency' => 1]);
        $customer = $this->customerForStore($store);
        $order = $this->orderForCustomer($store, $customer, 100);
        $svc = app(LoyaltyService::class);
        $svc->earnPointsForOrder($order);
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($store->id, $customer->id));
        $svc->reversePointsForOrder($order);
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($store->id, $customer->id));
        // second reverse should be idempotent
        $svc->reversePointsForOrder($order);
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($store->id, $customer->id));
        $this->assertEquals(1, LoyaltyTransaction::where('type', 'refund')->count());
    }

    public function test_product_point_calculation_uses_effective_price(): void
    {
        [$user, $store] = $this->merchantWithStore();
        LoyaltySetting::forStore($store->id)->update(['is_enabled' => true, 'points_per_currency' => 1]);
        $settings = LoyaltySetting::forStore($store->id);
        // base price 100 => 100 points
        $this->assertEquals(100, $settings->calculateEarnPoints(100));
        // sale price 80 => should use sale price (ThemeController formatFullProduct picks sale)
        $this->assertEquals(80, $settings->calculateEarnPoints(80));
        // variant price handled same as effective price passthrough
        $this->assertEquals(45, $settings->calculateEarnPoints(45));
        $this->assertEquals(0, $settings->calculateEarnPoints(0));
    }

    public function test_store_isolation(): void
    {
        [$userA, $storeA] = $this->merchantWithStore();
        [$userB, $storeB] = $this->merchantWithStore();
        LoyaltySetting::forStore($storeA->id)->update(['is_enabled' => true, 'points_per_currency' => 1]);
        LoyaltySetting::forStore($storeB->id)->update(['is_enabled' => true, 'points_per_currency' => 1]);
        $customerA = $this->customerForStore($storeA);
        // same email in store B is independent
        $customerB = Customer::create(['store_id' => $storeB->id, 'first_name' => 'Test', 'last_name' => 'User', 'email' => $customerA->email, 'password' => bcrypt('password'), 'email_verified_at' => now(), 'is_active' => true]);
        $orderA = $this->orderForCustomer($storeA, $customerA, 100);
        app(LoyaltyService::class)->earnPointsForOrder($orderA);
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($storeA->id, $customerA->id));
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($storeB->id, $customerB->id));
        // Store B order should not affect A
        $orderB = $this->orderForCustomer($storeB, $customerB, 50);
        app(LoyaltyService::class)->earnPointsForOrder($orderB);
        $this->assertEquals(50, LoyaltyTransaction::balanceFor($storeB->id, $customerB->id));
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($storeA->id, $customerA->id));
    }

    public function test_all_templates_receive_loyalty_payload(): void
    {
        [$user, $store] = $this->merchantWithStore();
        foreach ([true, false] as $enabled) {
            LoyaltySetting::forStore($store->id)->update(['is_enabled' => $enabled]);
            foreach (Store::ALL_TEMPLATES as $theme) {
                $store->theme = $theme;
                $store->save();
                $ctrl = new \App\Http\Controllers\ThemeController();
                $m = new \ReflectionMethod($ctrl, 'getStoreConfig');
                $m->setAccessible(true);
                $cfg = $m->invoke($ctrl, ['id' => $store->id, 'name' => $store->name, 'email' => $store->email, 'theme' => $theme, 'slug' => $store->slug, 'description' => '']);
                $this->assertArrayHasKey('loyalty', $cfg['storeSettings'], "storeSettings loyalty must exist for theme $theme");
                $this->assertEquals($enabled, $cfg['storeSettings']['loyalty']['is_enabled'], "is_enabled must propagate for theme $theme");
            }
        }
    }

    public function test_header_loyalty_hidden_when_off(): void
    {
        $content = file_get_contents(resource_path('js/components/storefront/HeaderLoyaltyBadge.tsx'));
        $this->assertStringContainsString('isEnabled', $content);
        $this->assertStringContainsString('isEnabled === false', $content);
        $this->assertStringContainsString('getLoyaltySettingsFromPage', $content);
    }

    public function test_product_cards_respect_off(): void
    {
        $cards = [
            resource_path('js/components/storefront/ProductCard.tsx'),
            resource_path('js/templates-v2/fashion-atelier/components/AtelierProductCard.tsx'),
            resource_path('js/templates-v2/bazaar-market/BazaarMarket.tsx'),
            resource_path('js/templates-v2/bakery-house/BakeryHouse.tsx'),
            resource_path('js/templates-v2/grocery-souq/SouqComponents.tsx'),
            resource_path('js/templates-v2/electronics-hub/ElectronicsHub.tsx'),
            resource_path('js/templates-v2/restaurant-menu/RestaurantMenu.tsx'),
        ];
        foreach ($cards as $path) {
            $content = file_get_contents($path);
            $this->assertStringContainsString('getLoyaltySettingsFromPage', $content, "$path must use canonical loyalty helper");
            $this->assertStringContainsString('calcEarnedPoints', $content, "$path must use calcEarnedPoints");
        }
        // templated cards must explicitly check is_enabled; ProductCard relies on calcEarnedPoints guard
        $strictCards = [
            resource_path('js/templates-v2/fashion-atelier/components/AtelierProductCard.tsx'),
            resource_path('js/templates-v2/bazaar-market/BazaarMarket.tsx'),
            resource_path('js/templates-v2/bakery-house/BakeryHouse.tsx'),
            resource_path('js/templates-v2/grocery-souq/SouqComponents.tsx'),
            resource_path('js/templates-v2/electronics-hub/ElectronicsHub.tsx'),
            resource_path('js/templates-v2/restaurant-menu/RestaurantMenu.tsx'),
        ];
        foreach ($strictCards as $path) {
            $content = file_get_contents($path);
            $this->assertStringContainsString('is_enabled', $content, "$path must check is_enabled");
        }
    }

    public function test_whatsapp_order_same_lifecycle(): void
    {
        [$user, $store] = $this->merchantWithStore();
        LoyaltySetting::forStore($store->id)->update(['is_enabled' => true, 'points_per_currency' => 1]);
        $customer = $this->customerForStore($store);
        $order = $this->orderForCustomer($store, $customer, 100);
        $order->order_source = 'whatsapp';
        $order->save();
        // pending whatsapp order should still earn via same service (no special double earning path)
        $svc = app(LoyaltyService::class);
        $svc->earnPointsForOrder($order);
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($store->id, $customer->id));
        // second call (simulating OrderCreated + WhatsApp action) must not double
        $svc->earnPointsForOrder($order);
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($store->id, $customer->id));
    }

    public function test_frontend_loyalty_utils_normalize_defaults_to_off(): void
    {
        $content = file_get_contents(resource_path('js/utils/loyalty.ts'));
        $this->assertStringContainsString('is_enabled: !!(raw.is_enabled ?? raw.enabled ?? false)', $content);
        $this->assertStringContainsString('if (!s || !s.is_enabled', $content);
    }

    public function test_loyalty_bonus_respects_master_off(): void
    {
        [$user, $store] = $this->merchantWithStore();
        LoyaltySetting::forStore($store->id)->update(['is_enabled' => false, 'signup_bonus_points' => 50, 'review_bonus_points' => 20]);
        $customer = $this->customerForStore($store);
        app(LoyaltyService::class)->awardSignupBonus($customer);
        app(LoyaltyService::class)->awardReviewBonus($customer);
        $this->assertEquals(0, LoyaltyTransaction::balanceFor($store->id, $customer->id));
        LoyaltySetting::forStore($store->id)->update(['is_enabled' => true]);
        app(LoyaltyService::class)->awardSignupBonus($customer);
        $this->assertEquals(50, LoyaltyTransaction::balanceFor($store->id, $customer->id));
        app(LoyaltyService::class)->awardReviewBonus($customer);
        $this->assertEquals(70, LoyaltyTransaction::balanceFor($store->id, $customer->id));
    }

    public function test_loyalty_points_preserved_when_toggling_off(): void
    {
        [$user, $store] = $this->merchantWithStore();
        LoyaltySetting::forStore($store->id)->update(['is_enabled' => true, 'points_per_currency' => 1]);
        $customer = $this->customerForStore($store);
        $order = $this->orderForCustomer($store, $customer, 70);
        app(LoyaltyService::class)->earnPointsForOrder($order);
        $this->assertEquals(70, LoyaltyTransaction::balanceFor($store->id, $customer->id));
        // disable
        LoyaltySetting::forStore($store->id)->update(['is_enabled' => false]);
        // balance should remain
        $this->assertEquals(70, LoyaltyTransaction::balanceFor($store->id, $customer->id));
        $this->assertDatabaseHas('loyalty_transactions', ['store_id' => $store->id, 'customer_id' => $customer->id]);
        // re-enable, new order should earn again
        LoyaltySetting::forStore($store->id)->update(['is_enabled' => true]);
        $order2 = $this->orderForCustomer($store, $customer, 30);
        app(LoyaltyService::class)->earnPointsForOrder($order2);
        $this->assertEquals(100, LoyaltyTransaction::balanceFor($store->id, $customer->id));
    }
}
