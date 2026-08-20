<?php

namespace App\Services;

use App\Models\PaymentSetting;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\StoreErpConfig;

/**
 * Unified Features Hub — storefront UI/UX toggles only.
 *
 * Concerns are strictly separated:
 *   - Store status / maintenance        → General settings (store_configurations)
 *   - Payment enable + API keys         → Dedicated "الدفع" page (payment_settings)
 *   - UI/UX toggles (cart/search/login/whatsapp) → THIS hub (store_configurations)
 *
 * Every toggle below is written to store_configurations, which the storefront
 * (ThemeController / behavior) reads live, so flipping a switch has an
 * immediate effect. Writes use setConfiguration (single key), never the
 * array-only updateConfiguration().
 */
class FeatureService
{
    /** Storefront UI/UX behavior keys shown on the features page. */
    public const BEHAVIOR_FEATURES = [
        'show_cart',
        'show_search',
        'show_auth_button',
        'show_whatsapp_order_button',
    ];

    /** WhatsApp widget toggles — advanced plan features (kept for compat). */
    public const WHATSAPP_FEATURES = [
        'whatsapp_widget_enabled',
        'whatsapp_widget_show_on_mobile',
        'whatsapp_widget_show_on_desktop',
    ];

    /** Default-on behavior keys (identical to StoreConfiguration defaults). */
    public const DEFAULT_ON = [
        'show_cart' => true,
        'show_search' => true,
        'show_auth_button' => true,
        'show_whatsapp_order_button' => true,
        'whatsapp_widget_enabled' => true,
        'whatsapp_widget_show_on_mobile' => true,
        'whatsapp_widget_show_on_desktop' => true,
    ];

    /** Payment gateways catalog (method => label). */
    public const PAYMENT_METHODS = [
        'cod' => 'الدفع عند الاستلام',
        'bank' => 'تحويل بنكي',
        'stripe' => 'Stripe',
        'paypal' => 'PayPal',
        'razorpay' => 'Razorpay',
        'whatsapp' => 'الطلب عبر واتساب',
        'telegram' => 'الطلب عبر تيليجرام',
        'mercadopago' => 'MercadoPago',
        'paystack' => 'Paystack',
        'flutterwave' => 'Flutterwave',
        'paytabs' => 'PayTabs',
        'skrill' => 'Skrill',
        'coingate' => 'CoinGate',
        'payfast' => 'PayFast',
        'tap' => 'Tap',
        'xendit' => 'Xendit',
        'paytr' => 'PayTR',
        'mollie' => 'Mollie',
        'toyyibpay' => 'ToyyibPay',
        'benefit' => 'Benefit',
        'iyzipay' => 'iyzico',
        'cashfree' => 'Cashfree',
        'midtrans' => 'Midtrans',
        'yookassa' => 'YooKassa',
        'nepalste' => 'Nepalste',
        'paiement' => 'Paiement Pro',
        'cinetpay' => 'CinetPay',
        'payhere' => 'PayHere',
        'fedapay' => 'FedaPay',
        'authorizenet' => 'Authorize.Net',
        'khalti' => 'Khalti',
        'easebuzz' => 'Easebuzz',
        'ozow' => 'Ozow',
        'aamarpay' => 'Aamarpay',
        'usdt_trc20' => 'USDT (TRC20)',
    ];

    /**
     * Feature tree for the UI. Only UI/UX toggles live here.
     */
    public static function getFeatures(Store $store, ?int $ownerId = null): array
    {
        $config = StoreConfiguration::getConfiguration($store->id);

        $behavior = [];
        foreach (self::BEHAVIOR_FEATURES as $key) {
            $default = self::DEFAULT_ON[$key] ?? false;
            $behavior[] = self::item($key, self::labelFor($key), self::descFor($key), (bool) ($config[$key] ?? $default));
        }

        return [
            ['id' => 'storefront', 'label' => 'واجهة المتجر', 'description' => 'أزرار ووظائف الواجهة الأمامية — تفعيل أو إيقاف بضغطة واحدة.', 'features' => $behavior],
        ];
    }

    /**
     * Set a single UI/UX toggle. Returns true on success; false when the key
     * is unknown or locked by the plan.
     */
    public static function setFeature(Store $store, string $key, bool $enabled): bool
    {
        // Storefront behavior toggles
        if (in_array($key, self::BEHAVIOR_FEATURES, true)) {
            StoreConfiguration::setConfiguration($store->id, $key, $enabled ? 'true' : 'false');
            return true;
        }

        // WhatsApp widget (plan-gated, backward compatible)
        if (in_array($key, self::WHATSAPP_FEATURES, true)) {
            if (self::planLevel($store) === 'none') {
                return false;
            }
            StoreConfiguration::setConfiguration($store->id, $key, $enabled ? 'true' : 'false');
            return true;
        }

        // Payment gateways (backward compatible; primary editor is the payments page)
        if (str_starts_with($key, 'payment_')) {
            $method = substr($key, strlen('payment_'));
            if (!array_key_exists($method, self::PAYMENT_METHODS)) {
                return false;
            }
            PaymentSetting::updateOrCreateSetting($store->user_id, 'is_' . $method . '_enabled', $enabled ? '1' : '0', $store->id);
            return true;
        }

        return false;
    }

    /**
     * Integration/status snapshots for the "التكاملات" area.
     */
    public static function integrations(Store $store): array
    {
        $erp = StoreErpConfig::where('store_id', $store->id)->where('is_active', true)->first();

        return [
            ['key' => 'erp', 'label' => 'ربط المحاسبة والمخزون (ERP)', 'enabled' => (bool) $erp, 'status' => $erp ? 'فعال — ' . ($erp->name ?? $erp->providerLabel()) : 'غير مفعّل'],
            ['key' => 'sms', 'label' => 'الرسائل النصية (SMS)', 'enabled' => false, 'status' => 'من صفحة الإعدادات العامة'],
            ['key' => 'cloud', 'label' => 'التخزين السحابي', 'enabled' => false, 'status' => 'من صفحة الإعدادات العامة'],
            ['key' => 'whatsapp_cloud', 'label' => 'WhatsApp Cloud API', 'enabled' => false, 'status' => 'قريباً'],
        ];
    }

    private static function item(string $key, string $label, string $description, bool $enabled, bool $locked = false, string $lockReason = ''): array
    {
        return compact('key', 'label', 'description', 'enabled', 'locked', 'lockReason');
    }

    private static function labelFor(string $key): string
    {
        return [
            'show_cart' => 'سلة التسوق',
            'show_search' => 'البحث في المتجر',
            'show_auth_button' => 'تسجيل الدخول',
            'show_whatsapp_order_button' => 'الطلب عبر واتساب',
            'enable_customer_login' => 'تسجيل دخول العملاء',
            'enable_customer_registration' => 'تسجيل عملاء جدد',
            'require_login_checkout' => 'إلزام الدخول قبل الدفع',
            'whatsapp_widget_enabled' => 'زر واتساب العائم',
            'whatsapp_widget_show_on_mobile' => 'إظهار في الجوال',
            'whatsapp_widget_show_on_desktop' => 'إظهار في الكمبيوتر',
        ][$key] ?? $key;
    }

    private static function descFor(string $key): string
    {
        return [
            'show_cart' => 'إظهار سلة التسوق وزر إضافة للطلب.',
            'show_search' => 'شريط بحث عن المنتجات في الواجهة.',
            'show_auth_button' => 'زر تسجيل الدخول/الحساب للعملاء.',
            'show_whatsapp_order_button' => 'زر إتمام الطلب عبر واتساب.',
            'enable_customer_login' => 'السماح للعملاء بتسجيل الدخول ومتابعة طلباتهم.',
            'enable_customer_registration' => 'السماح بإنشاء حسابات عملاء جديدة.',
            'require_login_checkout' => 'يتطلب تسجيل الدخول قبل إتمام الطلب.',
            'whatsapp_widget_enabled' => 'زر واتساب العائم في زاوية المتجر.',
            'whatsapp_widget_show_on_mobile' => 'إظهار الزر العائم على شاشات الجوال.',
            'whatsapp_widget_show_on_desktop' => 'إظهار الزر العائم على شاشات الكمبيوتر.',
        ][$key] ?? '';
    }

    /** Growth/Professional = 'limited'/'full'; Starter = 'none'. */
    private static function planLevel(Store $store): string
    {
        $user = $store->user;
        $plan = $user ? ($user->plan ?? ($user->creator->plan ?? null)) : null;
        return $plan && !empty($plan->template_editor_level) ? $plan->template_editor_level : 'none';
    }
}