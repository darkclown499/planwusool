<?php

namespace App\Services\Payment;

use App\Models\PaymentSetting;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class PaymentSettingsService
{
    public const SETTINGS_CACHE_TTL = 300; // 5 minutes
    public const SETTINGS_CACHE_PREFIX = 'payment_settings';

    /**
     * Get payment settings for a user
     */
    public function getPaymentSettings(?int $userId = null, ?int $storeId = null): array
    {
        if (is_null($userId)) {
            if (auth()->check()) {
                $userId = auth()->id();
                if (auth()->user()->type === 'company' && is_null($storeId)) {
                    $storeId = getCurrentStoreId(auth()->user());
                }
            } else {
                $user = User::where('type', 'superadmin')->first();
                $userId = $user?->id;
            }
        }

        if (!$userId) {
            return [];
        }

        $cacheKey = 'payment_settings.' . $userId . '.' . ($storeId ?? 'global');

        return Cache::remember($cacheKey, 300, function () use ($userId, $storeId) {
            // Use get() so value accessor decrypts sensitive keys; pluck bypasses accessor
            return PaymentSetting::where('user_id', $userId)
                ->where('store_id', $storeId)
                ->get(['key', 'value'])
                ->pluck('value', 'key')
                ->toArray();
        });
    }

    /**
     * Update or create a payment setting
     */
    public function updatePaymentSetting(string $key, $value, ?int $userId = null, ?int $storeId = null)
    {
        if (is_null($userId)) {
            $userId = auth()->id();
            if (auth()->user()->type === 'company' && is_null($storeId)) {
                $storeId = getCurrentStoreId(auth()->user());
            }
        }

        return PaymentSetting::updateOrCreate(
            ['user_id' => $userId, 'store_id' => $storeId, 'key' => $key],
            ['value' => $value]
        );
    }

    /**
     * Check if a payment method is enabled
     */
    public function isPaymentMethodEnabled(string $method, ?int $userId = null, ?int $storeId = null): bool
    {
        $settings = $this->getPaymentSettings($userId, $storeId);
        $key = "is_{$method}_enabled";

        return isset($settings[$key]) && ($settings[$key] === true || $settings[$key] === '1');
    }

    /**
     * Get configuration for a specific payment method
     */
    public function getPaymentMethodConfig(string $method, ?int $userId = null, ?int $storeId = null): array
    {
        $settings = $this->getPaymentSettings($userId, $storeId);

        return match ($method) {
            'stripe' => [
                'enabled' => $this->isPaymentMethodEnabled('stripe', $userId, $storeId),
                'key' => $settings['stripe_key'] ?? null,
                'secret' => $settings['stripe_secret'] ?? null,
            ],
            'paypal' => [
                'enabled' => $this->isPaymentMethodEnabled('paypal', $userId, $storeId),
                'mode' => $settings['paypal_mode'] ?? 'sandbox',
                'client_id' => $settings['paypal_client_id'] ?? null,
                'secret' => $settings['paypal_secret_key'] ?? null,
            ],
            'razorpay' => [
                'enabled' => $this->isPaymentMethodEnabled('razorpay', $userId, $storeId),
                'key' => $settings['razorpay_key'] ?? null,
                'secret' => $settings['razorpay_secret'] ?? null,
            ],
            'mercadopago' => [
                'enabled' => $this->isPaymentMethodEnabled('mercadopago', $userId, $storeId),
                'mode' => $settings['mercadopago_mode'] ?? 'sandbox',
                'access_token' => $settings['mercadopago_access_token'] ?? null,
            ],
            'paystack' => [
                'enabled' => $this->isPaymentMethodEnabled('paystack', $userId, $storeId),
                'public_key' => $settings['paystack_public_key'] ?? null,
                'secret_key' => $settings['paystack_secret_key'] ?? null,
            ],
            'flutterwave' => [
                'enabled' => $this->isPaymentMethodEnabled('flutterwave', $userId, $storeId),
                'public_key' => $settings['flutterwave_public_key'] ?? null,
                'secret_key' => $settings['flutterwave_secret_key'] ?? null,
            ],
            'cod' => [
                'enabled' => $this->isPaymentMethodEnabled('cod', $userId, $storeId),
            ],
            'bank' => [
                'enabled' => $this->isPaymentMethodEnabled('bank', $userId, $storeId),
                'details' => $settings['bank_detail'] ?? null,
            ],
            'paytabs' => [
                'enabled' => $this->isPaymentMethodEnabled('paytabs', $userId, $storeId),
                'mode' => $settings['paytabs_mode'] ?? 'sandbox',
                'profile_id' => $settings['paytabs_profile_id'] ?? null,
                'server_key' => $settings['paytabs_server_key'] ?? null,
                'region' => $settings['paytabs_region'] ?? 'ARE',
            ],
            'skrill' => [
                'enabled' => $this->isPaymentMethodEnabled('skrill', $userId, $storeId),
                'merchant_id' => $settings['skrill_merchant_id'] ?? null,
                'secret_word' => $settings['skrill_secret_word'] ?? null,
            ],
            'coingate' => [
                'enabled' => $this->isPaymentMethodEnabled('coingate', $userId, $storeId),
                'mode' => $settings['coingate_mode'] ?? 'sandbox',
                'api_token' => $settings['coingate_api_token'] ?? null,
            ],
            'payfast' => [
                'enabled' => $this->isPaymentMethodEnabled('payfast', $userId, $storeId),
                'mode' => $settings['payfast_mode'] ?? 'sandbox',
                'merchant_id' => $settings['payfast_merchant_id'] ?? null,
                'merchant_key' => $settings['payfast_merchant_key'] ?? null,
                'passphrase' => $settings['payfast_passphrase'] ?? null,
            ],
            'tap' => [
                'enabled' => $this->isPaymentMethodEnabled('tap', $userId, $storeId),
                'secret_key' => $settings['tap_secret_key'] ?? null,
            ],
            'xendit' => [
                'enabled' => $this->isPaymentMethodEnabled('xendit', $userId, $storeId),
                'api_key' => $settings['xendit_api_key'] ?? null,
            ],
            'paytr' => [
                'enabled' => $this->isPaymentMethodEnabled('paytr', $userId, $storeId),
                'merchant_id' => $settings['paytr_merchant_id'] ?? null,
                'merchant_key' => $settings['paytr_merchant_key'] ?? null,
                'merchant_salt' => $settings['paytr_merchant_salt'] ?? null,
            ],
            'mollie' => [
                'enabled' => $this->isPaymentMethodEnabled('mollie', $userId, $storeId),
                'api_key' => $settings['mollie_api_key'] ?? null,
            ],
            'toyyibpay' => [
                'enabled' => $this->isPaymentMethodEnabled('toyyibpay', $userId, $storeId),
                'category_code' => $settings['toyyibpay_category_code'] ?? null,
                'secret_key' => $settings['toyyibpay_secret_key'] ?? null,
                'mode' => $settings['toyyibpay_mode'] ?? 'sandbox',
            ],
            'cashfree' => [
                'enabled' => $this->isPaymentMethodEnabled('cashfree', $userId, $storeId),
                'mode' => $settings['cashfree_mode'] ?? 'sandbox',
                'public_key' => $settings['cashfree_public_key'] ?? null,
                'secret_key' => $settings['cashfree_secret_key'] ?? null,
            ],
            'iyzipay' => [
                'enabled' => $this->isPaymentMethodEnabled('iyzipay', $userId, $storeId),
                'mode' => $settings['iyzipay_mode'] ?? 'sandbox',
                'public_key' => $settings['iyzipay_public_key'] ?? null,
                'secret_key' => $settings['iyzipay_secret_key'] ?? null,
            ],
            'benefit' => [
                'enabled' => $this->isPaymentMethodEnabled('benefit', $userId, $storeId),
                'mode' => $settings['benefit_mode'] ?? 'sandbox',
                'public_key' => $settings['benefit_public_key'] ?? null,
                'secret_key' => $settings['benefit_secret_key'] ?? null,
            ],
            'ozow' => [
                'enabled' => $this->isPaymentMethodEnabled('ozow', $userId, $storeId),
                'mode' => $settings['ozow_mode'] ?? 'sandbox',
                'site_key' => $settings['ozow_site_key'] ?? null,
                'private_key' => $settings['ozow_private_key'] ?? null,
                'api_key' => $settings['ozow_api_key'] ?? null,
            ],
            'easebuzz' => [
                'enabled' => $this->isPaymentMethodEnabled('easebuzz', $userId, $storeId),
                'merchant_key' => $settings['easebuzz_merchant_key'] ?? null,
                'salt_key' => $settings['easebuzz_salt_key'] ?? null,
                'environment' => $settings['easebuzz_environment'] ?? 'test',
            ],
            'khalti' => [
                'enabled' => $this->isPaymentMethodEnabled('khalti', $userId, $storeId),
                'public_key' => $settings['khalti_public_key'] ?? null,
                'secret_key' => $settings['khalti_secret_key'] ?? null,
            ],
            'authorizenet' => [
                'enabled' => $this->isPaymentMethodEnabled('authorizenet', $userId, $storeId),
                'mode' => $settings['authorizenet_mode'] ?? 'sandbox',
                'merchant_id' => $settings['authorizenet_merchant_id'] ?? null,
                'transaction_key' => $settings['authorizenet_transaction_key'] ?? null,
                'supported_countries' => ['US', 'CA', 'GB', 'AU'],
                'supported_currencies' => ['USD', 'CAD', 'CHF', 'DKK', 'EUR', 'GBP', 'NOK', 'PLN', 'SEK', 'AUD', 'NZD'],
            ],
            'fedapay' => [
                'enabled' => $this->isPaymentMethodEnabled('fedapay', $userId, $storeId),
                'mode' => $settings['fedapay_mode'] ?? 'sandbox',
                'public_key' => $settings['fedapay_public_key'] ?? null,
                'secret_key' => $settings['fedapay_secret_key'] ?? null,
            ],
            'payhere' => [
                'enabled' => $this->isPaymentMethodEnabled('payhere', $userId, $storeId),
                'mode' => $settings['payhere_mode'] ?? 'sandbox',
                'merchant_id' => $settings['payhere_merchant_id'] ?? null,
                'merchant_secret' => $settings['payhere_merchant_secret'] ?? null,
                'app_id' => $settings['payhere_app_id'] ?? null,
                'app_secret' => $settings['payhere_app_secret'] ?? null,
            ],
            'cinetpay' => [
                'enabled' => $this->isPaymentMethodEnabled('cinetpay', $userId, $storeId),
                'site_id' => $settings['cinetpay_site_id'] ?? null,
                'api_key' => $settings['cinetpay_api_key'] ?? null,
                'secret_key' => $settings['cinetpay_secret_key'] ?? null,
            ],
            'midtrans' => [
                'enabled' => $this->isPaymentMethodEnabled('midtrans', $userId, $storeId),
                'mode' => $settings['midtrans_mode'] ?? 'sandbox',
                'client_key' => $settings['midtrans_client_key'] ?? null,
                'secret_key' => $settings['midtrans_secret_key'] ?? null,
            ],
            'yookassa' => [
                'enabled' => $this->isPaymentMethodEnabled('yookassa', $userId, $storeId),
                'shop_id' => $settings['yookassa_shop_id'] ?? null,
                'secret_key' => $settings['yookassa_secret_key'] ?? null,
            ],
            'whatsapp' => [
                'enabled' => $this->isPaymentMethodEnabled('whatsapp', $userId, $storeId),
                'number' => $settings['whatsapp_number'] ?? null,
                'display_name' => 'WhatsApp',
                'description' => 'Send order confirmation via WhatsApp',
            ],
            'telegram' => [
                'enabled' => $this->isPaymentMethodEnabled('telegram', $userId, $storeId),
                'bot_token' => $settings['telegram_bot_token'] ?? null,
                'chat_id' => $settings['telegram_chat_id'] ?? null,
                'display_name' => 'Telegram',
                'description' => 'Send order confirmation via Telegram',
            ],
            default => [],
        };
    }

    /**
     * Get all enabled payment methods
     */
    public function getEnabledPaymentMethods(?int $userId = null, ?int $storeId = null): array
    {
        $methods = [
            'stripe', 'paypal', 'razorpay', 'mercadopago', 'paystack', 'flutterwave',
            'bank', 'paytabs', 'skrill', 'coingate', 'payfast', 'tap', 'xendit',
            'paytr', 'mollie', 'toyyibpay', 'cashfree', 'iyzipay', 'benefit',
            'ozow', 'easebuzz', 'khalti', 'authorizenet', 'fedapay', 'payhere',
            'cinetpay', 'midtrans', 'yookassa', 'aamarpay', 'midtrans',
            'paytr', 'bank', 'razorpay', 'cashfree', 'paypal',
        ];

        if ($userId) {
            $user = \App\Models\User::find($userId);
            if ($user && $user->type === 'company') {
                array_unshift($methods, 'cod');
                $methods[] = 'whatsapp';
                $methods[] = 'telegram';
            }
        }

        $enabled = [];
        foreach ($methods as $method) {
            if ($this->isPaymentMethodEnabled($method, $userId, $storeId)) {
                $enabled[$method] = $this->getPaymentMethodConfig($method, $userId, $storeId);
            }
        }

        return $enabled;
    }
}