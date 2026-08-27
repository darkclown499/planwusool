<?php

namespace App\Services\Payment;

use App\Services\FeatureService;

/**
 * Canonical Payment Provider Catalog — Phase 1 Payment Hub.
 *
 * Single source of truth for every provider's classification.
 * Capability comes from HERE, not duplicated React arrays.
 *
 * Types:
 *  CONNECTED     — real wired adapter exists (store has SDK/server call today)
 *  PARTNER       — needs merchant contract + provider credentials; no fake form until docs
 *  MANUAL        — transfer/wallet instructions + proof, never auto-paid
 *  INTERNATIONAL — existing legitimate foreign gateways (preserved)
 *
 * Status vocab (Arabic):
 *  متصل / غير متصل / يدوي / يتطلب عقداً / غير مفعّل
 */
class PaymentProviderCatalog
{
    public const TYPE_CONNECTED = 'connected';
    public const TYPE_PARTNER = 'partner';
    public const TYPE_MANUAL = 'manual';
    public const TYPE_INTERNATIONAL = 'international';

    /**
     * Hub sections — order matters for UI.
     */
    public const SECTIONS = [
        'connected' => ['id' => 'connected', 'label' => 'متصلة', 'description' => 'بوابات مربوطة فعلياً — يتم التحقق عبر المزود.'],
        'partner' => ['id' => 'partner', 'label' => 'تحتاج عقداً مع المزود', 'description' => 'يتطلب حساب تاجر وبيانات ربط من المزود. لا يوجد نموذج ربط وهمي.'],
        'manual' => ['id' => 'manual', 'label' => 'تحويل ومحافظ يدوية', 'description' => 'تحويل يدوي — يقدّم التاجر التعليمات ويؤكد الدفع يدوياً بعد مراجعة الإثبات.'],
        'international' => ['id' => 'international', 'label' => 'بوابات دولية', 'description' => 'بوابات دولية قائمة — محفوظة كما هي.'],
    ];

    /**
     * Region grouping for discovery filter (presentation only).
     * Security/capability never depends on region.
     */
    public const REGIONS = [
        'palestine' => ['label' => 'فلسطين', 'icon' => 'map-pin'],
        'jordan' => ['label' => 'الأردن', 'icon' => 'map-pin'],
        'israel' => ['label' => 'إسرائيل', 'icon' => 'map-pin'],
        'international' => ['label' => 'دولي', 'icon' => 'globe'],
        'crypto' => ['label' => 'العملات الرقمية', 'icon' => 'coins'],
    ];

    /**
     * Canonical provider definitions.
     * Key = method id (matches payment_settings is_{id}_enabled).
     */
    public const PROVIDERS = [
        // ---- CONNECTED (real wired today — international + universal) ----
        'cod' => ['type' => 'manual', 'section' => 'manual', 'region' => 'international', 'label' => 'الدفع عند الاستلام', 'currencies' => ['ILS','JOD','USD'], 'status' => 'manual', 'desc' => 'الدفع عند الاستلام — يؤكد التاجر الاستلام.'],
        'bank' => ['type' => 'manual', 'section' => 'manual', 'region' => 'international', 'label' => 'تحويل بنكي', 'currencies' => ['ILS','JOD','USD'], 'status' => 'manual', 'desc' => 'تحويل بنكي يدوي — تعليمات التاجر + إثبات العميل.'],

        'stripe' => ['type' => 'connected', 'section' => 'connected', 'region' => 'international', 'label' => 'Stripe', 'currencies' => ['USD','EUR','ILS'], 'status' => 'connected', 'desc' => 'بطاقات عالمية — ربط API حقيقي.'],
        'paypal' => ['type' => 'connected', 'section' => 'connected', 'region' => 'international', 'label' => 'PayPal', 'currencies' => ['USD','EUR'], 'status' => 'connected', 'desc' => 'PayPal — ربط OAuth + Webhook.'],
        'razorpay' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Razorpay', 'currencies' => ['INR'], 'status' => 'connected', 'desc' => 'Razorpay — بوابة هندية.'],
        'paystack' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Paystack', 'currencies' => ['NGN','GHS'], 'status' => 'connected', 'desc' => 'Paystack — أفريقيا.'],
        'flutterwave' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Flutterwave', 'currencies' => ['NGN'], 'status' => 'connected', 'desc' => 'Flutterwave — أفريقيا.'],
        'paytabs' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'PayTabs', 'currencies' => ['SAR','AED','ILS'], 'status' => 'connected', 'desc' => 'PayTabs — الشرق الأوسط.'],
        'mollie' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Mollie', 'currencies' => ['EUR'], 'status' => 'connected', 'desc' => 'Mollie — أوروبا.'],
        'mercadopago' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'MercadoPago', 'currencies' => ['BRL','ARS'], 'status' => 'connected', 'desc' => 'MercadoPago — أمريكا اللاتينية.'],
        'skrill' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Skrill', 'currencies' => ['USD','EUR'], 'status' => 'connected', 'desc' => 'Skrill.'],
        'coingate' => ['type' => 'connected', 'section' => 'crypto', 'region' => 'crypto', 'label' => 'CoinGate', 'currencies' => ['USD'], 'status' => 'connected', 'desc' => 'CoinGate — عملات رقمية عبر بوابة.'],
        'payfast' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'PayFast', 'currencies' => ['ZAR'], 'status' => 'connected', 'desc' => 'PayFast.'],
        'tap' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Tap', 'currencies' => ['KWD','SAR'], 'status' => 'connected', 'desc' => 'Tap — الخليج.'],
        'xendit' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Xendit', 'currencies' => ['IDR','PHP'], 'status' => 'connected', 'desc' => 'Xendit.'],
        'paytr' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'PayTR', 'currencies' => ['TRY'], 'status' => 'connected', 'desc' => 'PayTR — تركيا.'],
        'toyyibpay' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'ToyyibPay', 'currencies' => ['MYR'], 'status' => 'connected', 'desc' => 'ToyyibPay — ماليزيا.'],
        'cashfree' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Cashfree', 'currencies' => ['INR'], 'status' => 'connected', 'desc' => 'Cashfree — الهند.'],
        'iyzipay' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'iyzico', 'currencies' => ['TRY'], 'status' => 'connected', 'desc' => 'iyzico — تركيا.'],
        'benefit' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Benefit', 'currencies' => ['BHD'], 'status' => 'connected', 'desc' => 'Benefit — البحرين.'],
        'ozow' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Ozow', 'currencies' => ['ZAR'], 'status' => 'connected', 'desc' => 'Ozow — جنوب أفريقيا.'],
        'easebuzz' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Easebuzz', 'currencies' => ['INR'], 'status' => 'connected', 'desc' => 'Easebuzz.'],
        'khalti' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Khalti', 'currencies' => ['NPR'], 'status' => 'connected', 'desc' => 'Khalti — نيبال.'],
        'authorizenet' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Authorize.Net', 'currencies' => ['USD'], 'status' => 'connected', 'desc' => 'Authorize.Net — أمريكا.'],
        'fedapay' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'FedaPay', 'currencies' => ['XOF'], 'status' => 'connected', 'desc' => 'FedaPay — أفريقيا.'],
        'payhere' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'PayHere', 'currencies' => ['LKR'], 'status' => 'connected', 'desc' => 'PayHere — سريلانكا.'],
        'cinetpay' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'CinetPay', 'currencies' => ['XOF'], 'status' => 'connected', 'desc' => 'CinetPay — غرب أفريقيا.'],
        'midtrans' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Midtrans', 'currencies' => ['IDR'], 'status' => 'connected', 'desc' => 'Midtrans — إندونيسيا.'],
        'yookassa' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'YooKassa', 'currencies' => ['RUB'], 'status' => 'connected', 'desc' => 'YooKassa — روسيا.'],
        'nepalste' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Nepalste', 'currencies' => ['NPR'], 'status' => 'connected', 'desc' => 'Nepalste.'],
        'paiement' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Paiement Pro', 'currencies' => ['XOF'], 'status' => 'connected', 'desc' => 'Paiement Pro.'],
        'aamarpay' => ['type' => 'connected', 'section' => 'international', 'region' => 'international', 'label' => 'Aamarpay', 'currencies' => ['BDT'], 'status' => 'connected', 'desc' => 'Aamarpay — بنغلاديش.'],

        // ---- PARTNER (needs contract, no fake form) ----
        // Palestine banks (gateway via BoP/MEPS)
        'bank_of_palestine_gateway' => ['type' => 'partner', 'section' => 'partner', 'region' => 'palestine', 'label' => 'بنك فلسطين — بوابة الدفع', 'currencies' => ['ILS','USD','JOD'], 'status' => 'partner', 'desc' => 'يتطلب حساب تاجر في بنك فلسطين + اتفاقية بوابة الدفع (PowerCARD). متعدد العملات.'],
        'palpay_gateway' => ['type' => 'partner', 'section' => 'partner', 'region' => 'palestine', 'label' => 'PalPay — بوابة إلكترونية', 'currencies' => ['ILS'], 'status' => 'partner', 'desc' => 'يتطلب عقد تاجر مع PalPay.'],
        // Jordan CliQ
        'cliq_gateway' => ['type' => 'partner', 'section' => 'partner', 'region' => 'jordan', 'label' => 'CliQ — عبر بنك الاتحاد', 'currencies' => ['JOD'], 'status' => 'partner', 'desc' => 'يتطلب حساب تاجر في بنك الاتحاد + OAuth2 + شهادة mTLS + تبييض IP. دفع فوري JOD.'],
        'network_international_jo' => ['type' => 'partner', 'section' => 'partner', 'region' => 'jordan', 'label' => 'Network International — الأردن', 'currencies' => ['JOD'], 'status' => 'partner', 'desc' => 'مُحصّل CliQ عبر الشبكة الدولية — يتطلب عقداً مع الشبكة.'],
        // Israel gateways — implementable but not yet wired, so partner until adapter exists
        'grow' => ['type' => 'partner', 'section' => 'partner', 'region' => 'israel', 'label' => 'Grow (Meshulam)', 'currencies' => ['ILS'], 'status' => 'partner', 'desc' => 'بوابة إسرائيلية — يتطلب userId/pageCode/x-api-key. قريباً كمتصل.'],
        'cardcom' => ['type' => 'partner', 'section' => 'partner', 'region' => 'israel', 'label' => 'CardCom', 'currencies' => ['ILS','USD'], 'status' => 'partner', 'desc' => 'بوابة إسرائيلية — TerminalNumber/ApiName. قريباً كمتصل.'],
        'tranzila' => ['type' => 'partner', 'section' => 'partner', 'region' => 'israel', 'label' => 'Tranzila', 'currencies' => ['ILS'], 'status' => 'partner', 'desc' => 'بوابة إسرائيلية — appKey/secret + tokenization. قريباً كمتصل.'],
        'hyp' => ['type' => 'partner', 'section' => 'partner', 'region' => 'israel', 'label' => 'Hyp (CreditGuard)', 'currencies' => ['ILS','USD'], 'status' => 'partner', 'desc' => 'بوابة إسرائيلية — terminalNumber/user/password. قريباً كمتصل.'],
        'pelecard' => ['type' => 'partner', 'section' => 'partner', 'region' => 'israel', 'label' => 'Pelecard', 'currencies' => ['ILS'], 'status' => 'partner', 'desc' => 'بوابة إسرائيلية — termNo/shopNo. قريباً كمتصل.'],

        // ---- MANUAL ----
        'whatsapp' => ['type' => 'manual', 'section' => 'manual', 'region' => 'international', 'label' => 'الطلب عبر واتساب', 'currencies' => ['ILS','JOD','USD'], 'status' => 'manual', 'desc' => 'الطلب عبر واتساب — يدوي.'],
        'telegram' => ['type' => 'manual', 'section' => 'manual', 'region' => 'international', 'label' => 'الطلب عبر تيليجرام', 'currencies' => ['ILS','JOD','USD'], 'status' => 'manual', 'desc' => 'الطلب عبر تيليجرام — يدوي.'],
        'jawwal_pay' => ['type' => 'manual', 'section' => 'manual', 'region' => 'palestine', 'label' => 'جوال باي (Jawwal Pay)', 'currencies' => ['ILS'], 'status' => 'manual', 'desc' => 'محفظة جوال باي — مسح QR أو تحويل، ILS فقط.'],
        'pal_pay' => ['type' => 'manual', 'section' => 'manual', 'region' => 'palestine', 'label' => 'PalPay', 'currencies' => ['ILS'], 'status' => 'manual', 'desc' => 'PalPay — محفظة فلسطينية، تحويل/Merchant QR.'],
        'zain_cash' => ['type' => 'manual', 'section' => 'manual', 'region' => 'palestine', 'label' => 'زين كاش (فلسطين)', 'currencies' => ['ILS','JOD'], 'status' => 'manual', 'desc' => 'زين كاش — محفظة، تعليمات يدوية.'],
        'orange_money' => ['type' => 'manual', 'section' => 'manual', 'region' => 'palestine', 'label' => 'أورنج موني (فلسطين)', 'currencies' => ['ILS','JOD'], 'status' => 'manual', 'desc' => 'أورنج موني — محفظة، تعليمات يدوية.'],
        'bank_palestine' => ['type' => 'manual', 'section' => 'manual', 'region' => 'palestine', 'label' => 'بنك فلسطين — تحويل', 'currencies' => ['ILS','JOD','USD'], 'status' => 'manual', 'desc' => 'تحويل يدوي — بنك فلسطين.'],
        'al_quds_bank' => ['type' => 'manual', 'section' => 'manual', 'region' => 'palestine', 'label' => 'بنك القدس', 'currencies' => ['ILS','JOD'], 'status' => 'manual', 'desc' => 'تحويل يدوي — بنك القدس.'],
        'arab_islamic_bank' => ['type' => 'manual', 'section' => 'manual', 'region' => 'palestine', 'label' => 'البنك العربي الإسلامي', 'currencies' => ['ILS','JOD'], 'status' => 'manual', 'desc' => 'تحويل يدوي.'],
        'cairo_amman_bank' => ['type' => 'manual', 'section' => 'manual', 'region' => 'palestine', 'label' => 'بنك القاهرة عمان (فلسطين)', 'currencies' => ['ILS','JOD'], 'status' => 'manual', 'desc' => 'تحويل يدوي.'],
        'housing_bank' => ['type' => 'manual', 'section' => 'manual', 'region' => 'palestine', 'label' => 'بنك الإسكان (فلسطين)', 'currencies' => ['ILS','JOD'], 'status' => 'manual', 'desc' => 'تحويل يدوي.'],
        'safad_bank' => ['type' => 'manual', 'section' => 'manual', 'region' => 'palestine', 'label' => 'بنك صفد (فلسطين)', 'currencies' => ['ILS','JOD'], 'status' => 'manual', 'desc' => 'تحويل يدوي.'],

        'cliq' => ['type' => 'manual', 'section' => 'manual', 'region' => 'jordan', 'label' => 'CliQ — کلیک (الأردن)', 'currencies' => ['JOD'], 'status' => 'manual', 'desc' => 'CliQ يدوي — Alias/QR بدون ربط API.'],
        'zain_cash_jo' => ['type' => 'manual', 'section' => 'manual', 'region' => 'jordan', 'label' => 'زين كاش (الأردن)', 'currencies' => ['JOD'], 'status' => 'manual', 'desc' => 'زين كاش الأردن — محفظة يدوية.'],
        'orange_money_jo' => ['type' => 'manual', 'section' => 'manual', 'region' => 'jordan', 'label' => 'أورنج موني (الأردن)', 'currencies' => ['JOD'], 'status' => 'manual', 'desc' => 'أورنج موني الأردن — يدوي.'],
        'etihad_wallet' => ['type' => 'manual', 'section' => 'manual', 'region' => 'jordan', 'label' => 'محفظة اتحاد (Etihad Wallet)', 'currencies' => ['JOD'], 'status' => 'manual', 'desc' => 'محفظة اتحاد — يدوي.'],
        'dinar_pay' => ['type' => 'manual', 'section' => 'manual', 'region' => 'jordan', 'label' => 'دينار باي (DinarPay)', 'currencies' => ['JOD'], 'status' => 'manual', 'desc' => 'دينار باي — يدوي.'],
        'jordan_kuwait_bank' => ['type' => 'manual', 'section' => 'manual', 'region' => 'jordan', 'label' => 'بنك الأردن الكويتي', 'currencies' => ['JOD'], 'status' => 'manual', 'desc' => 'تحويل يدوي.'],
        'arab_bank' => ['type' => 'manual', 'section' => 'manual', 'region' => 'jordan', 'label' => 'البنك العربي (الأردن)', 'currencies' => ['JOD'], 'status' => 'manual', 'desc' => 'تحويل يدوي.'],
        'housing_bank_jo' => ['type' => 'manual', 'section' => 'manual', 'region' => 'jordan', 'label' => 'بنك الإسكان (الأردن)', 'currencies' => ['JOD'], 'status' => 'manual', 'desc' => 'تحويل يدوي.'],
        'cairo_amman_bank_jo' => ['type' => 'manual', 'section' => 'manual', 'region' => 'jordan', 'label' => 'بنك القاهرة عمان (الأردن)', 'currencies' => ['JOD'], 'status' => 'manual', 'desc' => 'تحويل يدوي.'],
        'safad_bank_jo' => ['type' => 'manual', 'section' => 'manual', 'region' => 'jordan', 'label' => 'بنك صفد (الأردن)', 'currencies' => ['JOD'], 'status' => 'manual', 'desc' => 'تحويل يدوي.'],

        'bit' => ['type' => 'manual', 'section' => 'manual', 'region' => 'israel', 'label' => 'Bit — بيت', 'currencies' => ['ILS'], 'status' => 'manual', 'desc' => 'Bit — تحويل يدوي، ILS.'],
        'paybox' => ['type' => 'manual', 'section' => 'manual', 'region' => 'israel', 'label' => 'PayBox — بايبوكس', 'currencies' => ['ILS'], 'status' => 'manual', 'desc' => 'PayBox — تحويل يدوي، ILS.'],

        'usdt_trc20' => ['type' => 'manual', 'section' => 'manual', 'region' => 'crypto', 'label' => 'USDT (TRC20)', 'currencies' => ['USD'], 'status' => 'manual', 'desc' => 'USDT TRC20 — عنوان محفظة + Memo.'],
        'usdt_erc20' => ['type' => 'manual', 'section' => 'manual', 'region' => 'crypto', 'label' => 'USDT (ERC20)', 'currencies' => ['USD'], 'status' => 'manual', 'desc' => 'USDT ERC20 — يدوي.'],
        'usdt_bep20' => ['type' => 'manual', 'section' => 'manual', 'region' => 'crypto', 'label' => 'USDT (BEP20)', 'currencies' => ['USD'], 'status' => 'manual', 'desc' => 'USDT BEP20 — يدوي.'],
        'usdt_polygon' => ['type' => 'manual', 'section' => 'manual', 'region' => 'crypto', 'label' => 'USDT (Polygon)', 'currencies' => ['USD'], 'status' => 'manual', 'desc' => 'USDT Polygon — يدوي.'],
        'usdt_solana' => ['type' => 'manual', 'section' => 'manual', 'region' => 'crypto', 'label' => 'USDT (Solana)', 'currencies' => ['USD'], 'status' => 'manual', 'desc' => 'USDT Solana — يدوي.'],
    ];

    public static function get(string $method): ?array
    {
        return self::PROVIDERS[$method] ?? null;
    }

    public static function typeOf(string $method): string
    {
        return self::PROVIDERS[$method]['type'] ?? 'international';
    }

    public static function sectionOf(string $method): string
    {
        return self::PROVIDERS[$method]['section'] ?? 'international';
    }

    public static function isConnected(string $method): bool
    {
        return (self::PROVIDERS[$method]['type'] ?? null) === self::TYPE_CONNECTED;
    }

    public static function isPartner(string $method): bool
    {
        return (self::PROVIDERS[$method]['type'] ?? null) === self::TYPE_PARTNER;
    }

    public static function isManual(string $method): bool
    {
        $t = self::PROVIDERS[$method]['type'] ?? null;
        return $t === self::TYPE_MANUAL;
    }

    public static function supportsCurrency(string $method, string $currency): bool
    {
        $curr = self::PROVIDERS[$method]['currencies'] ?? null;
        if (!$curr) return true; // unknown = permissive, do not block
        return in_array(strtoupper($currency), array_map('strtoupper', $curr), true);
    }

    public static function statusBadge(string $method, bool $enabled): array
    {
        $p = self::PROVIDERS[$method] ?? null;
        if (!$p) return ['label' => $enabled ? 'مفعل' : 'غير مفعّل', 'variant' => $enabled ? 'connected' : 'inactive'];
        if (!$enabled) return ['label' => 'غير مفعّل', 'variant' => 'inactive'];
        return match ($p['status']) {
            'connected' => ['label' => 'متصل', 'variant' => 'connected'],
            'manual' => ['label' => 'يدوي', 'variant' => 'manual'],
            'partner' => ['label' => 'يتطلب عقداً', 'variant' => 'partner'],
            default => ['label' => 'مفعل', 'variant' => 'connected'],
        };
    }

    public static function getProvidersBySection(string $section): array
    {
        return array_filter(self::PROVIDERS, fn($p) => $p['section'] === $section);
    }

    public static function allMethodIds(): array
    {
        return array_keys(self::PROVIDERS);
    }

    /**
     * Merge with legacy FeatureService::PAYMENT_METHODS for backward compat:
     * any historic payment_method not in catalog degrades to international/manual.
     */
    public static function labelOf(string $method): string
    {
        if (isset(self::PROVIDERS[$method])) return self::PROVIDERS[$method]['label'];
        return FeatureService::PAYMENT_METHODS[$method] ?? ucfirst(str_replace('_', ' ', $method));
    }
}
