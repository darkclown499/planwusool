<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use App\Models\Store;
use App\Services\FeatureService;
use App\Services\Payment\PaymentProviderCatalog;
use Illuminate\Http\Request;

/**
 * Store payment settings — ONE dedicated place for payment configuration:
 * the enable/disable toggle AND the API keys for every gateway, scoped to the
 * store (payment_settings rows use user_id + store_id, exactly what the
 * storefront getEnabledPaymentMethods() reads).
 */
class StorePaymentController extends Controller
{
    public function index(Request $request, Store $store)
    {
        if (!$this->authorize($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $settings = PaymentSetting::getUserSettings($store->user_id, $store->id);

        $methods = [];
        foreach (FeatureService::PAYMENT_METHODS as $method => $label) {
            $enabled = (bool) ($settings['is_' . $method . '_enabled'] ?? false);

            $catalog = PaymentProviderCatalog::get($method);
            $fieldDefs = self::credentialFields()[$method] ?? [];
            // Partner: no fake connect form — fields intentionally empty until real adapter
            if ($catalog && $catalog['type'] === PaymentProviderCatalog::TYPE_PARTNER) {
                $fieldDefs = [];
            }
            $fields = [];
            foreach ($fieldDefs as $def) {
                $saved = $settings[$def['key']] ?? null;
                $fields[] = [
                    'key' => $def['key'],
                    'label' => $def['label'],
                    'type' => $def['type'] ?? 'text',
                    'placeholder' => $def['placeholder'] ?? '',
                    'value' => self::maskValue($def['key'], $saved),
                ];
            }

            $badge = PaymentProviderCatalog::statusBadge($method, $enabled);

            $methods[] = [
                'method' => $method,
                'label' => $catalog['label'] ?? $label,
                'enabled' => $enabled,
                'fields' => $fields,
                'type' => $catalog['type'] ?? 'international',
                'section' => $catalog['section'] ?? 'international',
                'region' => $catalog['region'] ?? 'international',
                'currencies' => $catalog['currencies'] ?? [],
                'catalog_desc' => $catalog['desc'] ?? '',
                'badge_label' => $badge['label'],
                'badge_variant' => $badge['variant'],
                'is_partner' => ($catalog['type'] ?? '') === PaymentProviderCatalog::TYPE_PARTNER,
                'configured' => self::isConfigured($settings, $fieldDefs),
                'status' => self::methodStatus($enabled, self::isConfigured($settings, $fieldDefs), $catalog['type'] ?? 'international'),
            ];
        }

        // Partner catalog entries not in PAYMENT_METHODS (BoP gateway etc.) — expose as disabled partner cards
        foreach (PaymentProviderCatalog::PROVIDERS as $pid => $p) {
            if (!isset(FeatureService::PAYMENT_METHODS[$pid])) {
                $badge = PaymentProviderCatalog::statusBadge($pid, false);
                $methods[] = [
                    'method' => $pid,
                    'label' => $p['label'],
                    'enabled' => false,
                    'fields' => [],
                    'type' => $p['type'],
                    'section' => $p['section'],
                    'region' => $p['region'],
                    'currencies' => $p['currencies'] ?? [],
                    'catalog_desc' => $p['desc'] ?? '',
                    'badge_label' => $badge['label'],
                    'badge_variant' => $badge['variant'],
                    'is_partner' => $p['type'] === PaymentProviderCatalog::TYPE_PARTNER,
                    'configured' => false,
                    'status' => self::methodStatus(false, false, $p['type']),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'methods' => $methods,
            'groups' => self::methodGroups($methods),
            'sections' => PaymentProviderCatalog::SECTIONS,
            'catalog' => PaymentProviderCatalog::PROVIDERS,
        ]);
    }

    /**
     * Group payment methods by region for the UI tabs (Phase 5).
     * Anything not mapped in a regional group lands in the global tab.
     */
    public static function methodGroups(array $methods): array
    {
        $grouped = [];
        foreach (FeatureService::PAYMENT_METHOD_GROUPS as $id => $group) {
            $grouped[$id] = ['label' => $group['label'], 'methods' => []];
        }

        foreach ($methods as $m) {
            $placed = false;
            foreach (FeatureService::PAYMENT_METHOD_GROUPS as $id => $group) {
                if (!empty($group['methods']) && in_array($m['method'], $group['methods'], true)) {
                    $grouped[$id]['methods'][] = $m;
                    $placed = true;
                    break;
                }
            }
            if (!$placed) {
                $grouped['global']['methods'][] = $m;
            }
        }

        return array_map(function ($id, $g) {
            return [
                'id' => $id,
                'label' => $g['label'],
                'methods' => array_values($g['methods']),
            ];
        }, array_keys($grouped), array_values($grouped));
    }

    /**
     * Credential field definitions per gateway. The keys here MATCH exactly
     * what getPaymentMethodConfig()/the runtime adapters read, so what the
     * merchant enters in the UI is exactly what the checkout engine consumes.
     *
     * PHASE 1 — Payment Hub: fake regional api_key fields removed.
     * Manual methods expose ONLY phone_number/merchant_name/instructions/wallet_address.
     * Partner methods expose NO form until real adapter exists (explained in UI).
     */
    public static function credentialFields(): array
    {
        $fields = [
            'stripe' => [
                ['key' => 'stripe_key', 'label' => 'المفتاح العام (Publishable Key)', 'type' => 'text'],
                ['key' => 'stripe_secret', 'label' => 'المفتاح السري (Secret Key)', 'type' => 'password'],
                ['key' => 'stripe_webhook_secret', 'label' => 'سر الـ Webhook (اختياري)', 'type' => 'password'],
            ],
            'paypal' => [
                ['key' => 'paypal_mode', 'label' => 'الوضع (sandbox/live)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'paypal_client_id', 'label' => 'Client ID', 'type' => 'text'],
                ['key' => 'paypal_secret_key', 'label' => 'Secret Key', 'type' => 'password'],
                ['key' => 'paypal_webhook_id', 'label' => 'Webhook ID (للإشعارات التلقائية)', 'type' => 'text'],
            ],
            'razorpay' => [
                ['key' => 'razorpay_key', 'label' => 'Key ID', 'type' => 'text'],
                ['key' => 'razorpay_secret', 'label' => 'Key Secret', 'type' => 'password'],
            ],
            'mercadopago' => [
                ['key' => 'mercadopago_mode', 'label' => 'الوضع (sandbox/live)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'mercadopago_access_token', 'label' => 'Access Token', 'type' => 'password'],
            ],
            'paystack' => [
                ['key' => 'paystack_public_key', 'label' => 'Public Key', 'type' => 'text'],
                ['key' => 'paystack_secret_key', 'label' => 'Secret Key', 'type' => 'password'],
            ],
            'flutterwave' => [
                ['key' => 'flutterwave_public_key', 'label' => 'Public Key', 'type' => 'text'],
                ['key' => 'flutterwave_secret_key', 'label' => 'Secret Key', 'type' => 'password'],
            ],
            'paytabs' => [
                ['key' => 'paytabs_mode', 'label' => 'الوضع (sandbox/live)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'paytabs_profile_id', 'label' => 'Profile ID', 'type' => 'text'],
                ['key' => 'paytabs_server_key', 'label' => 'Server Key', 'type' => 'password'],
                ['key' => 'paytabs_region', 'label' => 'المنطقة (Region)', 'type' => 'text', 'placeholder' => 'ARE'],
            ],
            'skrill' => [
                ['key' => 'skrill_merchant_id', 'label' => 'Merchant ID', 'type' => 'text'],
                ['key' => 'skrill_secret_word', 'label' => 'Secret Word', 'type' => 'password'],
            ],
            'coingate' => [
                ['key' => 'coingate_mode', 'label' => 'الوضع (sandbox/live)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'coingate_api_token', 'label' => 'API Token', 'type' => 'password'],
            ],
            'payfast' => [
                ['key' => 'payfast_mode', 'label' => 'الوضع (sandbox/live)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'payfast_merchant_id', 'label' => 'Merchant ID', 'type' => 'text'],
                ['key' => 'payfast_merchant_key', 'label' => 'Merchant Key', 'type' => 'text'],
                ['key' => 'payfast_passphrase', 'label' => 'Passphrase', 'type' => 'password'],
            ],
            'tap' => [
                ['key' => 'tap_secret_key', 'label' => 'Secret Key', 'type' => 'password'],
            ],
            'xendit' => [
                ['key' => 'xendit_api_key', 'label' => 'API Key', 'type' => 'password'],
            ],
            'paytr' => [
                ['key' => 'paytr_merchant_id', 'label' => 'Merchant ID', 'type' => 'text'],
                ['key' => 'paytr_merchant_key', 'label' => 'Merchant Key', 'type' => 'password'],
                ['key' => 'paytr_merchant_salt', 'label' => 'Merchant Salt', 'type' => 'password'],
            ],
            'mollie' => [
                ['key' => 'mollie_api_key', 'label' => 'API Key', 'type' => 'password'],
            ],
            'toyyibpay' => [
                ['key' => 'toyyibpay_mode', 'label' => 'الوضع (sandbox/live)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'toyyibpay_category_code', 'label' => 'Category Code', 'type' => 'text'],
                ['key' => 'toyyibpay_secret_key', 'label' => 'Secret Key', 'type' => 'password'],
            ],
            'cashfree' => [
                ['key' => 'cashfree_mode', 'label' => 'الوضع (sandbox/production)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'cashfree_public_key', 'label' => 'Public / Client ID', 'type' => 'text'],
                ['key' => 'cashfree_secret_key', 'label' => 'Secret / Client Secret', 'type' => 'password'],
            ],
            'iyzipay' => [
                ['key' => 'iyzipay_mode', 'label' => 'الوضع (sandbox/live)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'iyzipay_public_key', 'label' => 'API Key', 'type' => 'text'],
                ['key' => 'iyzipay_secret_key', 'label' => 'Secret Key', 'type' => 'password'],
            ],
            'benefit' => [
                ['key' => 'benefit_mode', 'label' => 'الوضع (sandbox/live)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'benefit_public_key', 'label' => 'Public Key', 'type' => 'text'],
                ['key' => 'benefit_secret_key', 'label' => 'Secret Key', 'type' => 'password'],
            ],
            'ozow' => [
                ['key' => 'ozow_mode', 'label' => 'الوضع (sandbox/live)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'ozow_site_key', 'label' => 'Site Code', 'type' => 'text'],
                ['key' => 'ozow_private_key', 'label' => 'Private Key', 'type' => 'password'],
                ['key' => 'ozow_api_key', 'label' => 'API Key', 'type' => 'password'],
            ],
            'easebuzz' => [
                ['key' => 'easebuzz_environment', 'label' => 'البيئة (test/prod)', 'type' => 'text', 'placeholder' => 'test'],
                ['key' => 'easebuzz_merchant_key', 'label' => 'Merchant Key', 'type' => 'text'],
                ['key' => 'easebuzz_salt_key', 'label' => 'Salt Key', 'type' => 'password'],
            ],
            'khalti' => [
                ['key' => 'khalti_public_key', 'label' => 'Public Key', 'type' => 'text'],
                ['key' => 'khalti_secret_key', 'label' => 'Secret Key', 'type' => 'password'],
            ],
            'authorizenet' => [
                ['key' => 'authorizenet_mode', 'label' => 'الوضع (sandbox/live)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'authorizenet_merchant_id', 'label' => 'API Login ID', 'type' => 'text'],
                ['key' => 'authorizenet_transaction_key', 'label' => 'Transaction Key', 'type' => 'password'],
            ],
            'fedapay' => [
                ['key' => 'fedapay_mode', 'label' => 'الوضع (sandbox/live)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'fedapay_public_key', 'label' => 'Public Key', 'type' => 'text'],
                ['key' => 'fedapay_secret_key', 'label' => 'Secret Key', 'type' => 'password'],
            ],
            'payhere' => [
                ['key' => 'payhere_mode', 'label' => 'الوضع (sandbox/live)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'payhere_merchant_id', 'label' => 'Merchant ID', 'type' => 'text'],
                ['key' => 'payhere_merchant_secret', 'label' => 'Merchant Secret', 'type' => 'password'],
            ],
            'cinetpay' => [
                ['key' => 'cinetpay_site_id', 'label' => 'Site ID', 'type' => 'text'],
                ['key' => 'cinetpay_api_key', 'label' => 'API Key', 'type' => 'password'],
                ['key' => 'cinetpay_secret_key', 'label' => 'Secret Key (اختياري)', 'type' => 'password'],
            ],
            'midtrans' => [
                ['key' => 'midtrans_mode', 'label' => 'الوضع (sandbox/production)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'midtrans_client_key', 'label' => 'Client Key', 'type' => 'text'],
                ['key' => 'midtrans_secret_key', 'label' => 'Server Key', 'type' => 'password'],
            ],
            'yookassa' => [
                ['key' => 'yookassa_shop_id', 'label' => 'Shop ID', 'type' => 'text'],
                ['key' => 'yookassa_secret_key', 'label' => 'Secret Key', 'type' => 'password'],
            ],
            'nepalste' => [
                ['key' => 'nepalste_mode', 'label' => 'الوضع (sandbox/live)', 'type' => 'text', 'placeholder' => 'sandbox'],
                ['key' => 'nepalste_public_key', 'label' => 'Consumer Key', 'type' => 'text'],
                ['key' => 'nepalste_secret_key', 'label' => 'Consumer Secret', 'type' => 'password'],
            ],
            'paiement' => [
                ['key' => 'paiement_merchant_id', 'label' => 'Merchant ID', 'type' => 'text'],
                ['key' => 'paiement_merchant_secret', 'label' => 'Merchant Secret (اختياري)', 'type' => 'password'],
            ],
            'aamarpay' => [
                ['key' => 'aamarpay_store_id', 'label' => 'Store ID', 'type' => 'text'],
                ['key' => 'aamarpay_signature', 'label' => 'Signature Key', 'type' => 'password'],
            ],
            'whatsapp' => [
                ['key' => 'whatsapp_number', 'label' => 'رقم واتساب', 'type' => 'text'],
                ['key' => 'whatsapp_instructions', 'label' => 'تعليمات العميل', 'type' => 'textarea'],
            ],
            'telegram' => [
                ['key' => 'telegram_bot_token', 'label' => 'Bot Token', 'type' => 'password'],
                ['key' => 'telegram_chat_id', 'label' => 'Chat ID', 'type' => 'text'],
                ['key' => 'telegram_instructions', 'label' => 'تعليمات العميل', 'type' => 'textarea'],
            ],
        ];

        /*
         * Phase 5 — manual payment methods. The keys match exactly what
         * getPaymentMethodConfig() reads ({method}_phone_number, {method}_merchant_name,
         * {method}_instructions) so checkout renders them out of the box.
         */
        $walletMethods = [
            'jawwal_pay', 'pal_pay', 'zain_cash', 'orange_money',
            'cliq', 'zain_cash_jo', 'orange_money_jo', 'etihad_wallet', 'dinar_pay',
        ];
        foreach ($walletMethods as $m) {
            $fields[$m] = [
                ['key' => $m . '_phone_number', 'label' => 'رقم المحفظة / الهاتف', 'type' => 'text'],
                ['key' => $m . '_merchant_name', 'label' => 'اسم صاحب الحساب / المستفيد', 'type' => 'text'],
                ['key' => $m . '_instructions', 'label' => 'تعليمات الدفع (تظهر للعميل عند الطلب)', 'type' => 'textarea'],
            ];
        }

        $bankMethods = [
            'bank_palestine', 'al_quds_bank', 'arab_islamic_bank', 'cairo_amman_bank', 'housing_bank', 'safad_bank',
            'jordan_kuwait_bank', 'arab_bank', 'housing_bank_jo', 'cairo_amman_bank_jo', 'safad_bank_jo',
        ];
        foreach ($bankMethods as $m) {
            $fields[$m] = [
                ['key' => $m . '_phone_number', 'label' => 'رقم التواصل (واتساب/هاتف)', 'type' => 'text'],
                ['key' => $m . '_merchant_name', 'label' => 'اسم المستفيد في الحوالة', 'type' => 'text'],
                ['key' => $m . '_instructions', 'label' => 'تعليمات التحويل (اسم البنك، رقم الحساب، IBAN...)', 'type' => 'textarea'],
            ];
        }

        // Israel-area manual wallets
        $fields['bit'] = [
            ['key' => 'bit_phone_number', 'label' => 'رقم Bit', 'type' => 'text'],
            ['key' => 'bit_merchant_name', 'label' => 'اسم صاحب الحساب', 'type' => 'text'],
            ['key' => 'bit_instructions', 'label' => 'تعليمات الدفع (تظهر للعميل)', 'type' => 'textarea'],
        ];
        $fields['paybox'] = [
            ['key' => 'paybox_phone_number', 'label' => 'رقم PayBox', 'type' => 'text'],
            ['key' => 'paybox_merchant_name', 'label' => 'اسم صاحب الحساب', 'type' => 'text'],
            ['key' => 'paybox_instructions', 'label' => 'تعليمات الدفع (تظهر للعميل)', 'type' => 'textarea'],
        ];

        // Crypto — wallet address + network + memo
        $cryptoMethods = ['usdt_trc20', 'usdt_erc20', 'usdt_bep20', 'usdt_polygon', 'usdt_solana'];
        foreach ($cryptoMethods as $m) {
            $network = strtoupper(str_replace('usdt_', '', $m));
            $fields[$m] = [
                ['key' => $m . '_wallet_address', 'label' => "عنوان المحفظة ($network)", 'type' => 'text'],
                ['key' => $m . '_memo', 'label' => 'Memo / Tag (إن وُجد)', 'type' => 'text'],
                ['key' => $m . '_instructions', 'label' => 'تعليمات إضافية للعميل', 'type' => 'textarea'],
            ];
        }

        // COD + classic bank transfer instructions
        $fields['cod'] = [
            ['key' => 'cod_instructions', 'label' => 'تعليمات الدفع عند الاستلام', 'type' => 'textarea'],
        ];
        $fields['bank'] = [
            ['key' => 'bank_detail', 'label' => 'بيانات الحساب البنكي (تظهر للعميل)', 'type' => 'textarea'],
            ['key' => 'bank_instructions', 'label' => 'تعليمات إضافية للتحويل', 'type' => 'textarea'],
        ];

        return $fields;
    }

    public function update(Request $request, Store $store)
    {
        if (!$this->authorize($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $allIds = array_unique(array_merge(array_keys(FeatureService::PAYMENT_METHODS), array_keys(PaymentProviderCatalog::PROVIDERS)));
        $validated = $request->validate([
            'method' => ['required', 'string', 'in:' . implode(',', $allIds)],
        ]);

        $method = $validated['method'];
        $userId = $store->user_id;

        // Toggle enable/disable
        if ($request->has('enabled')) {
            $enabled = filter_var($request->input('enabled'), FILTER_VALIDATE_BOOLEAN);
            PaymentSetting::updateOrCreateSetting($userId, 'is_' . $method . '_enabled', $enabled ? '1' : '0', $store->id);
            return response()->json(['success' => true, 'method' => $method, 'enabled' => $enabled]);
        }

        // Save credentials (empty values are ignored → keep existing)
        $config = $request->input('config', []);
        $prefix = $method . '_';
        foreach ($config as $key => $value) {
            $key = (string) $key;
            if (!str_starts_with($key, $prefix) || $key === 'is_' . $method . '_enabled') {
                continue;
            }
            if (trim((string) $value) === '') {
                continue;
            }
            PaymentSetting::updateOrCreateSetting($userId, $key, $value, $store->id);
        }

        return $this->index($request, $store);
    }

    /** Pretty Arabic-ish label for a credential key, e.g. stripe_secret_key. */
    public static function credentialLabel(string $key): string
    {
        $labels = [
            'stripe_publishable_key' => 'المفتاح العام (Publishable)',
            'stripe_secret_key' => 'المفتاح السري (Secret)',
            'stripe_webhook_secret' => 'سر الـ Webhook',
            'paypal_client_id' => 'Client ID',
            'paypal_secret_key' => 'Secret Key',
            'paypal_mode' => 'الوضع (sandbox/live)',
            'razorpay_key_id' => 'Key ID',
            'razorpay_key_secret' => 'Key Secret',
            'cod_bank_name' => 'اسم البنك',
            'cod_bank_account' => 'رقم الحساب',
            'cod_bank_iban' => 'IBAN',
            'cod_owner_name' => 'اسم صاحب الحساب',
            'bank_bank_name' => 'اسم البنك',
            'bank_bank_account' => 'رقم الحساب',
            'bank_bank_iban' => 'IBAN',
            'bank_owner_name' => 'اسم صاحب الحساب',
            'whatsapp_number' => 'رقم واتساب',
            'telegram_bot_token' => 'Bot Token',
            'telegram_chat_id' => 'Chat ID',
            'mollie_api_key' => 'API Key',
            'paystack_secret_key' => 'Secret Key',
            'paystack_public_key' => 'Public Key',
            'flutterwave_secret_key' => 'Secret Key',
            'flutterwave_public_key' => 'Public Key',
            'paytabs_server_key' => 'Server Key',
            'paytabs_profile_id' => 'Profile ID',
            'paytabs_region' => 'المنطقة (Region)',
            'tap_secret_key' => 'Secret Key',
            'xendit_api_key' => 'API Key',
            'mercadopago_access_token' => 'Access Token',
            'coingate_api_token' => 'API Token',
            'skrill_merchant_id' => 'Merchant ID',
            'skrill_secret_word' => 'Secret Word',
            'payfast_merchant_id' => 'Merchant ID',
            'payfast_merchant_key' => 'Merchant Key',
            'payfast_passphrase' => 'Passphrase',
            'cashfree_secret_key' => 'Secret Key',
            'cashfree_public_key' => 'Public Key',
            'iyzipay_secret_key' => 'Secret Key',
            'iyzipay_public_key' => 'Public Key',
            'midtrans_secret_key' => 'Server Key',
            'yookassa_secret_key' => 'Secret Key',
            'authorizenet_api_login_id' => 'API Login ID',
            'authorizenet_transaction_key' => 'Transaction Key',
            'khalti_secret_key' => 'Secret Key',
            'khalti_public_key' => 'Public Key',
            'easebuzz_merchant_key' => 'Merchant Key',
            'easebuzz_salt_key' => 'Salt Key',
            'ozow_api_key' => 'API Key',
            'ozow_private_key' => 'Private Key',
            'benefit_secret_key' => 'Secret Key',
            'benefit_public_key' => 'Public Key',
            'aamarpay_signature' => 'Signature Key',
            'payhere_merchant_id' => 'Merchant ID',
            'payhere_merchant_secret' => 'Merchant Secret',
            'fedapay_secret_key' => 'Secret Key',
            'fedapay_public_key' => 'Public Key',
            'paytr_merchant_key' => 'Merchant Key',
            'paytr_merchant_salt' => 'Merchant Salt',
            'toyyibpay_secret_key' => 'Secret Key',
            'nepalste_secret_key' => 'Secret Key',
            'cinetpay_api_key' => 'API Key',
            'paiement_*' => 'إعدادات البوابة',
        ];

        if (isset($labels[$key])) {
            return $labels[$key];
        }

        return ucwords(str_replace('_', ' ', $key));
    }

    /**
     * Abstract configuration presence for a method — true when at least one of
     * its credential/instruction fields has a saved non-empty value. This is
     * informational only; it never carries the value itself.
     */
    protected static function isConfigured(array $settings, array $fieldDefs): bool
    {
        foreach ($fieldDefs as $def) {
            if (!empty($settings[$def['key']])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Truthful per-method status for the merchant UI, derived only from server
     * state (enabled flag + configured presence):
     *   active     — enabled and usable per current backend behavior
     *   incomplete — enabled but a real gateway has no saved credentials yet
     *   inactive   — disabled (or contract-only partner, not connectable here)
     * Manual methods stay 'active' when enabled because that matches the
     * checkout engine; no invented third state for them.
     */
    protected static function methodStatus(bool $enabled, bool $configured, string $type): string
    {
        if (!$enabled) {
            return 'inactive';
        }
        if (!$configured && ($type === PaymentProviderCatalog::TYPE_CONNECTED || $type === PaymentProviderCatalog::TYPE_INTERNATIONAL)) {
            return 'incomplete';
        }
        return 'active';
    }

    /** Mask a secret for the UI while keeping a sense of its presence. */
    protected static function maskValue(string $key, $value): string
    {
        if ($value === null || $value === '') {
            return '';
        }
        $s = (string) $value;
        $len = strlen($s);
        if ($len <= 4) {
            return '••••••••';
        }
        return '••••••••' . substr($s, -4);
    }

    protected function authorize(Request $request, Store $store): bool
    {
        $user = $request->user();
        if (!$user) return false;
        if ($user->isSuperAdmin() || $user->isAdmin()) return true;
        // Direct owner — preserve access (do not weaken)
        if ((int) $store->user_id === (int) $user->id) return true;
        // Delegated staff via current_store — require explicit payment permission
        if ((int) $store->id === (int) ($user->current_store ?? 0)) {
            try { return $user->hasPermissionTo('manage-payment-settings') || $user->hasPermissionTo('manage-settings'); } catch (\Throwable $e) { return false; }
        }
        return false;
    }
}