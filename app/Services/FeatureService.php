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
        'customer_accounts_enabled',
        'enable_customer_login',
        'customer_registration_enabled',
        'enable_customer_registration', // legacy alias — mapped to customer_registration_enabled
    ];

    /** Enum-like verification method values */
    public const VERIFICATION_METHODS = ['none', 'email'];
    public const VERIFICATION_DEFAULT = 'email';

    /**
     * Advanced checkout/store settings toggles (Phase 5):
     * multi-currency pricing, guest checkout and automatic VAT calculation.
     * Stored in store_configurations like every other toggle here.
     */
    public const SETTINGS_FEATURES = [
        'multi_currency',
        'guest_checkout',
        'vat_calculation',
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
        'customer_accounts_enabled' => true,
        'guest_checkout' => true,
        'enable_customer_login' => true,
        'enable_customer_registration' => true,
        'customer_registration_enabled' => true,
    ];

    /** Payment gateways catalog (method => label). */
    public const PAYMENT_METHODS = [
        // --- Global / universal ---
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

        // --- Palestine ---
        'jawwal_pay' => 'جوال باي (Jawwal Pay)',
        'pal_pay' => 'PalPay',
        'zain_cash' => 'زين كاش (فلسطين)',
        'orange_money' => 'أورنج موني (فلسطين)',
        'bank_palestine' => 'بنك فلسطين — تحويل',
        'al_quds_bank' => 'بنك القدس',
        'arab_islamic_bank' => 'البنك العربي الإسلامي',
        'cairo_amman_bank' => 'بنك القاهرة عمان (فلسطين)',
        'housing_bank' => 'بنك الإسكان (فلسطين)',
        'safad_bank' => 'بنك صفد (فلسطين)',

        // --- Jordan ---
        'cliq' => 'CliQ — کلیک (الأردن)',
        'zain_cash_jo' => 'زين كاش (الأردن)',
        'orange_money_jo' => 'أورنج موني (الأردن)',
        'etihad_wallet' => 'محفظة اتحاد (Etihad Wallet)',
        'dinar_pay' => 'دينار باي (DinarPay)',
        'jordan_kuwait_bank' => 'بنك الأردن الكويتي',
        'arab_bank' => 'البنك العربي (الأردن)',
        'housing_bank_jo' => 'بنك الإسكان (الأردن)',
        'cairo_amman_bank_jo' => 'بنك القاهرة عمان (الأردن)',
        'safad_bank_jo' => 'بنك صفد (الأردن)',

        // --- Israel (1948 areas) ---
        'bit' => 'Bit — بيت',
        'paybox' => 'PayBox — بايبوكس',

        // --- Crypto ---
        'usdt_trc20' => 'USDT (TRC20)',
        'usdt_erc20' => 'USDT (ERC20)',
        'usdt_bep20' => 'USDT (BEP20)',
        'usdt_polygon' => 'USDT (Polygon)',
        'usdt_solana' => 'USDT (Solana)',
    ];

    /**
     * Regional payment groups for the payments page tabs (Phase 5).
     * Methods not listed in any group fall under the "global" tab.
     */
    public const PAYMENT_METHOD_GROUPS = [
        'palestine' => [
            'label' => 'فلسطين',
            'icon' => 'map-pin',
            'methods' => [
                'jawwal_pay', 'pal_pay', 'zain_cash', 'orange_money', 'bank_palestine',
                'al_quds_bank', 'arab_islamic_bank', 'cairo_amman_bank', 'housing_bank', 'safad_bank',
            ],
        ],
        'jordan' => [
            'label' => 'الأردن',
            'icon' => 'map-pin',
            'methods' => [
                'cliq', 'zain_cash_jo', 'orange_money_jo', 'etihad_wallet', 'dinar_pay',
                'jordan_kuwait_bank', 'arab_bank', 'housing_bank_jo', 'cairo_amman_bank_jo', 'safad_bank_jo',
            ],
        ],
        'israel' => [
            'label' => 'الداخل / إسرائيل',
            'icon' => 'map-pin',
            'methods' => ['bit', 'paybox'],
        ],
        'crypto' => [
            'label' => 'العملات الرقمية',
            'icon' => 'coins',
            'methods' => ['usdt_trc20', 'usdt_erc20', 'usdt_bep20', 'usdt_polygon', 'usdt_solana', 'coingate'],
        ],
        'global' => [
            'label' => 'عالمي وأخرى',
            'icon' => 'globe',
            'methods' => [], // computed: everything else
        ],
    ];

    /** Manual payment methods that show customer-facing instructions. */
    public const MANUAL_PAYMENT_METHODS = [
        'cod', 'bank', 'whatsapp', 'telegram',
        'jawwal_pay', 'pal_pay', 'zain_cash', 'orange_money', 'bank_palestine',
        'al_quds_bank', 'arab_islamic_bank', 'cairo_amman_bank', 'housing_bank', 'safad_bank',
        'cliq', 'zain_cash_jo', 'orange_money_jo', 'etihad_wallet', 'dinar_pay',
        'jordan_kuwait_bank', 'arab_bank', 'housing_bank_jo', 'cairo_amman_bank_jo', 'safad_bank_jo',
        'bit', 'paybox',
    ];

    /**
     * Feature tree for the UI. Only UI/UX toggles live here.
     * Also exposes customer_verification_method as enum-like setting.
     */
    public static function getFeatures(Store $store, ?int $ownerId = null): array
    {
        $config = StoreConfiguration::getConfiguration($store->id);

        $behavior = [];
        foreach (self::BEHAVIOR_FEATURES as $key) {
            $default = self::DEFAULT_ON[$key] ?? false;
            // Deduplicate alias: only emit canonical customer_registration_enabled
            if ($key === 'enable_customer_registration') continue;
            $behavior[] = self::item($key, self::labelFor($key), self::descFor($key), StoreConfiguration::toBool($config[$key] ?? null, $default));
        }
        // Append verification method as a selectable enum item (not a boolean toggle)
        $verificationMethod = $config['customer_verification_method'] ?? self::VERIFICATION_DEFAULT;
        $behavior[] = [
            'key' => 'customer_verification_method',
            'label' => self::labelFor('customer_verification_method'),
            'description' => self::descFor('customer_verification_method'),
            'enabled' => $verificationMethod === 'email',
            'value' => $verificationMethod,
            'locked' => false,
            'lockReason' => '',
        ];

        $settings = [];
        foreach (self::SETTINGS_FEATURES as $key) {
            $default = self::DEFAULT_ON[$key] ?? false;
            $settings[] = self::item($key, self::labelFor($key), self::descFor($key), StoreConfiguration::toBool($config[$key] ?? null, $default));
        }

        return [
            ['id' => 'storefront', 'label' => 'واجهة المتجر', 'description' => 'أزرار ووظائف الواجهة الأمامية — تفعيل أو إيقاف بضغطة واحدة.', 'features' => $behavior],
            ['id' => 'checkout_settings', 'label' => 'إعدادات الدفع والسلة', 'description' => 'خيارات متقدمة للدفع والعملات والضرائب.', 'features' => $settings],
        ];
    }

    public static function getCustomerVerificationMethod(Store $store): string
    {
        $config = StoreConfiguration::getConfiguration($store->id);
        $raw = strtolower(trim((string)($config['customer_verification_method'] ?? self::VERIFICATION_DEFAULT)));
        return in_array($raw, self::VERIFICATION_METHODS, true) ? $raw : self::VERIFICATION_DEFAULT;
    }

    public static function setCustomerVerificationMethod(Store $store, string $method): bool
    {
        $method = strtolower(trim($method));
        if (!in_array($method, self::VERIFICATION_METHODS, true)) return false;
        // Gate email verification behind connected mail
        if ($method === 'email' && !\App\Services\StoreMailService::isConnected($store)) {
            return false;
        }
        StoreConfiguration::setConfiguration($store->id, 'customer_verification_method', $method);
        return true;
    }

    /**
     * Set a single UI/UX toggle. Returns true on success; false when the key
     * is unknown or locked by the plan.
     * Handles canonical alias for registration: both keys map to same storage.
     */
    public static function setFeature(Store $store, string $key, bool $enabled): bool
    {
        // Registration alias: both map to canonical customer_registration_enabled
        if (in_array($key, ['customer_registration_enabled','enable_customer_registration'], true)) {
            StoreConfiguration::setConfiguration($store->id, 'customer_registration_enabled', $enabled ? 'true' : 'false');
            StoreConfiguration::setConfiguration($store->id, 'enable_customer_registration', $enabled ? 'true' : 'false');
            return true;
        }
        // Verification method is enum — not handled via boolean
        if ($key === 'customer_verification_method') {
            return false;
        }
        // Storefront behavior toggles
        if (in_array($key, self::BEHAVIOR_FEATURES, true)) {
            StoreConfiguration::setConfiguration($store->id, $key, $enabled ? 'true' : 'false');
            return true;
        }

        // Advanced checkout/store settings (multi_currency, guest_checkout, vat_calculation)
        if (in_array($key, self::SETTINGS_FEATURES, true)) {
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
            ['key' => 'sms', 'label' => 'الرسائل النصية (SMS)', 'enabled' => false, 'status' => 'تُدار من إعدادات المنصة (المشرف العام)'],
            ['key' => 'cloud', 'label' => 'التخزين السحابي', 'enabled' => false, 'status' => 'تُدار من إعدادات المنصة (المشرف العام)'],
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
            'customer_registration_enabled' => 'تسجيل عملاء جدد',
            'enable_customer_registration' => 'تسجيل عملاء جدد',
            'require_login_checkout' => 'إلزام الدخول قبل الدفع',
            'customer_accounts_enabled' => 'حسابات العملاء',
            'customer_verification_method' => 'تفعيل الحسابات الجديدة',
            'whatsapp_widget_enabled' => 'زر واتساب العائم',
            'whatsapp_widget_show_on_mobile' => 'إظهار في الجوال',
            'whatsapp_widget_show_on_desktop' => 'إظهار في الكمبيوتر',
            'multi_currency' => 'عملات متعددة',
            'guest_checkout' => 'الدفع كزائر',
            'vat_calculation' => 'احتساب ضريبة القيمة المضافة',
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
            'customer_registration_enabled' => 'السماح بإنشاء حسابات عملاء جديدة.',
            'enable_customer_registration' => 'السماح بإنشاء حسابات عملاء جديدة.',
            'require_login_checkout' => 'يتطلب تسجيل الدخول قبل إتمام الطلب.',
            'customer_accounts_enabled' => 'تفعيل نظام حسابات العملاء بالكامل — عند الإيقاف يختفي زر الدخول ويمنع التسجيل.',
            'customer_verification_method' => 'كيف تريد تفعيل حساب العميل بعد التسجيل؟ بدون تحقق أو برمز عبر البريد.',
            'whatsapp_widget_enabled' => 'زر واتساب العائم في زاوية المتجر.',
            'whatsapp_widget_show_on_mobile' => 'إظهار الزر العائم على شاشات الجوال.',
            'whatsapp_widget_show_on_desktop' => 'إظهار الزر العائم على شاشات الكمبيوتر.',
            'multi_currency' => 'السماح للعملاء بالدفع بعملات متعددة مع تحويل تلقائي.',
            'guest_checkout' => 'إتمام الطلب دون الحاجة لإنشاء حساب.',
            'vat_calculation' => 'احتساب ضريبة القيمة المضافة تلقائياً على الطلبات.',
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