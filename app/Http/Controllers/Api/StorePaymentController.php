<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use App\Models\Store;
use App\Services\FeatureService;
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

            // ALWAYS expose the input fields for each gateway, whether or not
            // a record already exists — the merchant must be able to add the
            // API keys the very first time without touching the legacy page.
            $fieldDefs = self::credentialFields()[$method] ?? [];
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

            $methods[] = [
                'method' => $method,
                'label' => $label,
                'enabled' => $enabled,
                'fields' => $fields,
            ];
        }

        return response()->json(['success' => true, 'methods' => $methods]);
    }

    /**
     * Credential field definitions per gateway. The keys here MATCH exactly
     * what getPaymentMethodConfig()/the runtime adapters read, so what the
     * merchant enters in the UI is exactly what the checkout engine consumes.
     */
    public static function credentialFields(): array
    {
        return [
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
            ],
            'telegram' => [
                ['key' => 'telegram_bot_token', 'label' => 'Bot Token', 'type' => 'password'],
                ['key' => 'telegram_chat_id', 'label' => 'Chat ID', 'type' => 'text'],
            ],
        ];
    }

    public function update(Request $request, Store $store)
    {
        if (!$this->authorize($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'method' => ['required', 'string', 'in:' . implode(',', array_keys(FeatureService::PAYMENT_METHODS))],
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
        if (!$user) {
            return false;
        }
        if ($user->isSuperAdmin() || $user->isAdmin()) {
            return true;
        }
        return (int) $store->user_id === (int) $user->id
            || (int) $store->id === (int) ($user->current_store ?? 0);
    }
}