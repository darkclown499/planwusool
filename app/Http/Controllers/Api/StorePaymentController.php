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

            $credentials = [];
            foreach ($settings as $key => $value) {
                if ($key === 'is_' . $method . '_enabled') {
                    continue;
                }
                if (str_starts_with((string) $key, $method . '_')) {
                    $credentials[] = [
                        'key' => (string) $key,
                        'label' => self::credentialLabel((string) $key),
                        'value' => self::maskValue((string) $key, $value),
                    ];
                }
            }

            $methods[] = [
                'method' => $method,
                'label' => $label,
                'enabled' => $enabled,
                'credentials' => $credentials,
            ];
        }

        return response()->json(['success' => true, 'methods' => $methods]);
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