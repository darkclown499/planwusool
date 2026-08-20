<?php

namespace App\Services;

use App\Models\PaymentSetting;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\StoreErpConfig;

/**
 * Unified Features Hub — one source of truth for every per-store on/off
 * toggle the merchant switches from the new "الميزات" page.
 *
 * Every feature points at the exact storage surface it already drives
 * on the storefront, so flipping a switch has an immediate real effect:
 *   - storefront behaviors   → store_configurations (read live by ThemeController)
 *   - payment gateways       → payment_settings (read live by getEnabledPaymentMethods)
 *   - WhatsApp widget        → store_configurations (plan-gated)
 */
class FeatureService
{
    /** Storefront behavior keys (Store::BEHAVIOR_KEYS) + store status. */
    public const BEHAVIOR_FEATURES = [
        'show_cart',
        'show_search',
        'show_auth_button',
        'show_whatsapp_order_button',
        'enable_customer_login',
        'enable_customer_registration',
        'require_login_checkout',
    ];

    /** WhatsApp widget toggles — advanced plan features. */
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
        'enable_customer_login' => true,
        'enable_customer_registration' => true,
        'whatsapp_widget_enabled' => true,
        'whatsapp_widget_show_on_mobile' => true,
        'whatsapp_widget_show_on_desktop' => true,
    ];

    /** Curated, storefront-relevant payment gateways (method => label). */
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
     * Full feature tree grouped for the UI.
     */
    public static function getFeatures(Store $store, ?int $ownerId = null): array
    {
        $config = StoreConfiguration::getConfiguration($store->id);
        $ownerId = $ownerId ?? $store->user_id;
        $payments = $ownerId ? PaymentSetting::getUserSettings($ownerId, $store->id) : [];
        $level = self::planLevel($store);

        $behavior = [];
        foreach (self::BEHAVIOR_FEATURES as $key) {
            $default = self::DEFAULT_ON[$key] ?? false;
            $behavior[] = self::item($key, self::labelFor($key), self::descFor($key), (bool) ($config[$key] ?? $default));
        }

        // Store status is a special high-level switch.
        $status = [
            ['key' => 'store_status', 'label' => 'تفعيل المتجر', 'description' => 'عند إيقافه، لن يكون المتجر متاحاً للزوار.', 'enabled' => (bool) ($config['store_status'] ?? true), 'locked' => false, 'lockReason' => ''],
            ['key' => 'maintenance_mode', 'label' => 'وضع الصيانة', 'description' => 'يعرض صفحة صيانة مؤقتة بدلاً من المتجر.', 'enabled' => (bool) ($config['maintenance_mode'] ?? false), 'locked' => false, 'lockReason' => ''],
        ];

        $whatsapp = [];
        $whatsappLocked = $level === 'none';
        foreach (self::WHATSAPP_FEATURES as $key) {
            $default = self::DEFAULT_ON[$key] ?? false;
            $whatsapp[] = self::item($key, self::labelFor($key), self::descFor($key), (bool) ($config[$key] ?? $default), $whatsappLocked, $whatsappLocked ? 'متاح في باقة النمو وما فوق.' : '');
        }

        $paymentFeatures = [];
        foreach (self::PAYMENT_METHODS as $method => $label) {
            $key = 'is_' . $method . '_enabled';
            $paymentFeatures[] = self::item(
                'payment_' . $method,
                $label,
                'طرق الدفع المتاحة للعملاء عند إتمام الطلب.',
                (bool) ($payments[$key] ?? false),
                false,
                ''
            );
        }

        return [
            ['id' => 'status', 'label' => 'حالة المتجر', 'description' => 'التحكم في توفر المتجر للزوار.', 'features' => $status],
            ['id' => 'storefront', 'label' => 'واجهة المتجر', 'description' => 'أزرار ووظائف الواجهة الأمامية.', 'features' => $behavior],
            ['id' => 'whatsapp', 'label' => 'واتساب', 'description' => 'أزرار وأدوات التواصل عبر واتساب.', 'features' => $whatsapp],
            ['id' => 'payments', 'label' => 'طرق الدفع', 'description' => 'فعّل أو أوقف كل بوابة دفع على حدة.', 'features' => $paymentFeatures],
        ];
    }

    /**
     * Set a single feature and write it to the right storage surface.
     * Returns true on success; false if the feature is locked by the plan.
     */
    public static function setFeature(Store $store, string $key, bool $enabled): bool
    {
        $config = StoreConfiguration::getConfiguration($store->id);
        $value = $enabled ? 'true' : 'false';

        // Store status / maintenance
        if ($key === 'store_status' || $key === 'maintenance_mode') {
            StoreConfiguration::updateConfiguration($store->id, $key, $value);
            StoreConfiguration::forgetConfiguration($store->id);
            return true;
        }

        // Storefront behavior toggles
        if (in_array($key, self::BEHAVIOR_FEATURES, true)) {
            StoreConfiguration::updateConfiguration($store->id, $key, $value);
            StoreConfiguration::forgetConfiguration($store->id);
            return true;
        }

        // WhatsApp widget (plan-gated)
        if (in_array($key, self::WHATSAPP_FEATURES, true)) {
            if (self::planLevel($store) === 'none') {
                return false;
            }
            StoreConfiguration::updateConfiguration($store->id, $key, $value);
            StoreConfiguration::forgetConfiguration($store->id);
            return true;
        }

        // Payment gateways
        if (str_starts_with($key, 'payment_')) {
            $method = substr($key, strlen('payment_'));
            if (!array_key_exists($method, self::PAYMENT_METHODS)) {
                return false;
            }
            $ownerId = $store->user_id;
            PaymentSetting::updateOrCreateSetting($ownerId, 'is_' . $method . '_enabled', $enabled ? '1' : '0', $store->id);
            return true;
        }

        return false;
    }

    /**
     * Integration/status snapshots for the "التكاملات" area of the hub.
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
            'show_auth_button' => 'زر تسجيل الدخول',
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