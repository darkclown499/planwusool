<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * P2A-01 — canonical merchant-facing Arabic terminology.
 *
 * The mapping below is the source of truth for the merchant UI. Tests are
 * semantic (assert the shipped translation source values) rather than brittle
 * against markup.
 */
class ArabicTerminologyTest extends TestCase
{
    private function ar(): array
    {
        return json_decode(file_get_contents(resource_path('lang/ar.json')), true);
    }

    public function test_canonical_module_area_terms(): void
    {
        $ar = $this->ar();
        $required = [
            'Dashboard' => 'لوحة التحكم',
            'Delivery' => 'التوصيل',
            'Payments' => 'المدفوعات',
            'Sales' => 'المبيعات',
            'Inventory' => 'المخزون',
            'Analytics & Reporting' => 'التقارير',
            'Returns' => 'المرتجعات',
            'Abandoned Carts' => 'السلال المتروكة',
            'Referral Program' => 'برنامج الإحالة',
            'Loyalty Points' => 'نقاط الولاء',
            'Transaction History' => 'سجل المعاملات',
            'Coupon System' => 'قواعد الخصم',
            'Coupons' => 'قواعد الخصم',
            'Delivery Method' => 'طريقة التوصيل',
        ];

        foreach ($required as $key => $expected) {
            $this->assertArrayHasKey($key, $ar, "Missing ar key $key");
            $this->assertSame($expected, $ar[$key], "Canonical value for $key");
        }
    }

    public function test_order_status_labels_are_canonical(): void
    {
        $ar = $this->ar();
        $this->assertArrayHasKey('Shipped', $ar);
        $this->assertSame('تم الشحن', $ar['Shipped'], 'shipped status must render تم الشحن');
        $this->assertArrayHasKey('Delivered', $ar);
        $this->assertSame('تم التسليم', $ar['Delivered'], 'delivered status must render تم التسليم');

        $source = file_get_contents(resource_path('js/utils/order-status.ts'));
        $this->assertStringContainsString("shipped: 'تم الشحن'", $source, 'orderStatusAr shipped');
        $this->assertStringContainsString("delivered: 'تم التسليم'", $source, 'orderStatusAr delivered');
        $this->assertStringContainsString("shipped: { label: 'تم الشحن', next: 'delivered' }", $source, 'primary action for shipped must be تم الشحن');
        $this->assertStringNotContainsString("label: 'تم التسليم'}, next: 'delivered'", $source, 'shipped action must not reuse delivered label');
    }

    public function test_orders_list_uses_delivered_not_done(): void
    {
        $source = file_get_contents(resource_path('js/pages/orders/index.tsx'));
        $this->assertStringContainsString("{ key: 'shipped', label: 'تم الشحن' }", $source);
        $this->assertStringContainsString("{ key: 'delivered', label: 'تم التسليم' }", $source);
        $this->assertStringNotContainsString("{ key: 'delivered', label: 'مكتمل' }", $source, 'delivered tab must not be labeled مكتمل');
    }

    public function test_orders_show_delivered_badge_is_canonical(): void
    {
        $source = file_get_contents(resource_path('js/pages/orders/show.tsx'));
        $this->assertStringContainsString('طريقة التوصيل', $source, 'fulfillment method row label');
        $this->assertStringNotContainsString('طريقة الشحن', $source, 'no stale shipping-method label in order detail');
        $this->assertStringContainsString('تم التسليم', $source, 'terminal delivered badge');
        $this->assertStringNotContainsString('> مكتمل<', $source, 'no delivered badge rendered as مكتمل');
    }

    public function test_dashboard_nav_fallback_is_canonical(): void
    {
        $nav = file_get_contents(resource_path('js/config/merchant-navigation.ts'));
        $this->assertStringContainsString("labelKey: 'Dashboard', labelAr: 'لوحة التحكم'", $nav, 'dashboard labelAr must be لوحة التحكم');
        $this->assertStringNotContainsString("labelAr: 'الرئيسية'", $nav, 'no الرئيسية dashboard fallback');

        foreach (['stores/index.tsx', 'stores/view.tsx'] as $storePage) {
            $page = file_get_contents(resource_path("js/pages/$storePage"));
            $this->assertStringNotContainsString("{ title: 'الرئيسية', href: route('dashboard') }", $page, "no الرئيسية breadcrumb in $storePage");
        }
    }

    public function test_permission_translations_use_canonical_terms(): void
    {
        $source = file_get_contents(resource_path('js/utils/permission-translations.ts'));
        $this->assertStringContainsString("abandoned_carts: 'السلال المتروكة'", $source, 'abandoned carts spelling');
        $this->assertStringNotContainsString('السلات', $source, 'misspelled سلات must be removed');
        $this->assertStringContainsString("pos: 'نقطة البيع'", $source);
        $this->assertStringContainsString("analytics: 'التقارير'", $source);
        $this->assertStringContainsString("coupon_system: 'قواعد الخصم'", $source, 'coupon module label must be canonical');
    }

    public function test_notification_pages_are_arabic(): void
    {
        foreach (['pages/notifications/index.tsx', 'pages/notifications/show.tsx'] as $file) {
            $source = file_get_contents(resource_path("js/$file"));
            $this->assertStringContainsString("order_shipped: 'تم الشحن'", $source, "$file shipped label");
            $this->assertStringContainsString("order_delivered: 'تم التسليم'", $source, "$file delivered label");
            $this->assertStringNotContainsString('Order Shipped', $source, "$file must not be raw English");
            $this->assertStringNotContainsString('Order Delivered', $source, "$file must not be raw English");
        }
    }

    public function test_dashboard_recent_orders_use_translated_status(): void
    {
        $source = file_get_contents(resource_path('js/pages/dashboard.tsx'));
        $this->assertStringContainsString("import { tOrderStatus } from '@/utils/order-status';", $source, 'recent orders must translate status via shared util');
        $this->assertStringContainsString('{tOrderStatus(order.status)}', $source, 'recent order rows must render canonical Arabic status');
        $this->assertStringNotContainsString('<p className="text-xs text-muted-foreground">{order.status}</p>', $source, 'no raw status text in recent orders');
    }

    public function test_coupon_module_labelled_discount_rules(): void
    {
        $ar = $this->ar();
        $this->assertSame('قواعد الخصم', $ar['Coupons']);
        $this->assertSame('قواعد الخصم', $ar['Coupon System']);
    }

    public function test_delivery_method_terminology_uses_delivery_not_shipping(): void
    {
        $delivery = file_get_contents(resource_path('js/pages/delivery/index.tsx'));
        $this->assertStringNotContainsString('طرق الشحن', $delivery, 'no طرق الشحن in merchant delivery hub');
        $this->assertStringNotContainsString('طريقة شحن', $delivery, 'no طريقة شحن in merchant delivery hub');

        $edit = file_get_contents(resource_path('js/pages/shipping/edit.tsx'));
        $this->assertStringContainsString('تعديل طريقة التوصيل', $edit);
        $this->assertStringContainsString('اسم طريقة التوصيل', $edit);
        $this->assertStringContainsString('مناطق التوصيل', $edit);
        $this->assertStringNotContainsString('طريقة الشحن', $edit, 'shipping method label must be توصيل');
    }
}