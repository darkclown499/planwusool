<?php

use App\Models\Setting;
use App\Models\User;
use App\Models\Currency;
use App\Models\Coupon;
use Carbon\Carbon;
use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\Role;
use App\Models\PaymentSetting;

if (!function_exists('getCacheSize')) {
    /**
     * Get the total cache size in MB
     *
     * @return string
     */
    function getCacheSize()
    {
        $file_size = 0;
        $framework_path = storage_path('framework');
        
        if (is_dir($framework_path)) {
            foreach (\File::allFiles($framework_path) as $file) {
                $file_size += $file->getSize();
            }
        }
        
        return number_format($file_size / 1000000, 2);
    }
}

if (! function_exists('settings')) {
    function settings($user_id = null, $store_id = null)
    {
        // Skip database queries during installation
        if (request()->is('install*') || request()->is('update*') || request()->is('installer*') || !file_exists(storage_path('installed'))) {
            return [];
        }

        if (is_null($user_id)) {
            if (auth()->user()) {
                if (!in_array(auth()->user()->type, ['superadmin', 'company'])) {
                    $user_id = auth()->user()->created_by;
                    // For company users, get current store if not specified
                    $company = $user_id ? User::find($user_id) : null;
                    if (is_null($store_id) && $company && $company->type === 'company') {
                        $store_id = getCurrentStoreId($company);
                    }
                } else {
                    $user_id = auth()->id();
                    // For company users, get current store if not specified
                    if (is_null($store_id) && auth()->user()->type === 'company') {
                        $store_id = getCurrentStoreId(auth()->user());
                    }
                }
            } else {
                $user = User::where('type', 'superadmin')->first();
                $user_id = $user ? $user->id : null;
            }
        }

        if (!$user_id) {
            return [];
        }

        return Setting::where('user_id', $user_id)
                     ->where('store_id', $store_id)
                     ->pluck('value', 'key')
                     ->toArray();
    }
}

if (! function_exists('formatDateTime')) {
    function formatDateTime($date, $includeTime = true)
    {
        if (!$date) {
            return null;
        }

        $settings = settings();

        $dateFormat = $settings['dateFormat'] ?? 'Y-m-d';
        $timeFormat = $settings['timeFormat'] ?? 'H:i';
        $timezone = $settings['defaultTimezone'] ?? config('app.timezone', 'UTC');

        $format = $includeTime ? "$dateFormat $timeFormat" : $dateFormat;

        return Carbon::parse($date)->timezone($timezone)->format($format);
    }
}



if (! function_exists('getSetting')) {
    function getSetting($key, $default = null, $user_id = null, $store_id = null)
    {
        // Check if this is a payment/messaging setting that should be retrieved from payment_settings table
        $paymentSettingKeys = [
            'is_whatsapp_enabled', 'whatsapp_number', 'messaging_message_template', 'messaging_item_template',
            'is_telegram_enabled', 'telegram_bot_token', 'telegram_chat_id', 'messaging_order_variables', 'messaging_item_variables'
        ];
        
        if (in_array($key, $paymentSettingKeys)) {
            $paymentSettings = getPaymentSettings($user_id, $store_id);
            return $paymentSettings[$key] ?? $default;
        }
        
        // Skip database queries during installation
        if (request()->is('install*') || request()->is('update*') || request()->is('installer*') || !file_exists(storage_path('installed'))) {
            $defaultSettings = defaultSettings();
            return $defaultSettings[$key] ?? $default;
        }

        // Determine user_id if not provided
        if (is_null($user_id)) {
            if (auth()->user()) {
                if (!in_array(auth()->user()->type, ['superadmin', 'company'])) {
                    $user_id = auth()->user()->created_by;
                } else {
                    $user_id = auth()->id();
                }
            } else {
                $user = User::where('type', 'superadmin')->first();
                $user_id = $user ? $user->id : null;
            }
        }

        if (!$user_id) {
            $defaultSettings = defaultSettings();
            return $defaultSettings[$key] ?? $default;
        }

        // For store-specific settings, use new method
        if ($store_id !== null) {
            return \App\Models\Setting::getSetting($key, $user_id, $store_id, $default);
        }
        
        $user = User::find($user_id);
        $settings = [];
        
        // For company users, check current store settings first
        if ($user && $user->type === 'company') {
            $currentStoreId = getCurrentStoreId($user);
            if ($currentStoreId) {
                // Special handling for favicon - check store_configuration first
                if ($key === 'favicon') {
                    $storeConfig = \App\Models\StoreConfiguration::getConfiguration($currentStoreId);
                    if (!empty($storeConfig['favicon'])) {
                        return $storeConfig['favicon'];
                    }
                }
                
                $settings = Setting::where('user_id', $user_id)
                                  ->where('store_id', $currentStoreId)
                                  ->pluck('value', 'key')
                                  ->toArray();
            }
        }
        
        // If not found, check global settings for this user
        if (!isset($settings[$key])) {
            $globalSettings = Setting::where('user_id', $user_id)
                                    ->whereNull('store_id')
                                    ->pluck('value', 'key')
                                    ->toArray();
            if (isset($globalSettings[$key])) {
                return $globalSettings[$key];
            }
        }
        
        // If still not found and user is company, try superadmin settings
        if (!isset($settings[$key]) && $user && $user->type === 'company') {
            $superAdmin = User::where('type', 'superadmin')->first();
            if ($superAdmin) {
                $superAdminSettings = Setting::where('user_id', $superAdmin->id)
                                            ->whereNull('store_id')
                                            ->pluck('value', 'key')
                                            ->toArray();
                if (isset($superAdminSettings[$key])) {
                    return $superAdminSettings[$key];
                }
            }
        }
        
        // If no value found and no default provided, try to get from defaultSettings
        if (!isset($settings[$key]) && $default === null) {
            $defaultSettings = defaultSettings();
            $default = $defaultSettings[$key] ?? null;
        }
        
        return $settings[$key] ?? $default;
    }
}

if (! function_exists('updateSetting')) {
    function updateSetting($key, $value, $user_id = null, $store_id = null)
    {
        // For store-specific settings, use new method
        if ($store_id !== null) {
            return \App\Models\Setting::setSetting($key, $value, $user_id ?: auth()->id(), $store_id);
        }
        
        // Legacy behavior for global settings
        if (is_null($user_id)) {
            if (auth()->user()) {
                if (!in_array(auth()->user()->type, ['superadmin', 'company'])) {
                    $user_id = auth()->user()->created_by;
                } else {
                    $user_id = auth()->id();
                }
            } else {
                $user = User::where('type', 'superadmin')->first();
                $user_id = $user ? $user->id : null;
            }
        }

        if (!$user_id) {
            return false;
        }

        return Setting::updateOrCreate(
            ['user_id' => $user_id, 'store_id' => null, 'key' => $key],
            ['value' => $value]
        );
    }
}

if (! function_exists('isLandingPageEnabled')) {
    function isLandingPageEnabled()
    {
        return getSetting('landingPageEnabled', true) === true || getSetting('landingPageEnabled', true) === '1';
    }
}

if (! function_exists('isRegistrationEnabled')) {
    function isRegistrationEnabled()
    {
        return getSetting('registrationEnabled', true) === true || getSetting('registrationEnabled', true) === '1';
    }
}

if (! function_exists('defaultRoleAndSetting')) {
    function defaultRoleAndSetting($user)
    {
        $companyRole = Role::where('name', 'company')->first();
            
        if ($companyRole) {
            $user->assignRole($companyRole);
        }
        
        // Create default settings for the user
        if ($user->type === 'superadmin') {
            createDefaultSettings($user->id);
        } elseif ($user->type === 'company') {
            copySettingsFromSuperAdmin($user->id, $user->current_store);
        }

        return true;
    }
}

if (! function_exists('getPaymentSettings')) {
    /**
     * Get payment settings for a user
     *
     * @param int|null $userId
     * @return array
     */
    function getPaymentSettings($userId = null, $storeId = null)
    {
        if (is_null($userId)) {
            if (auth()->check()) {
                $userId = auth()->id();
                // For company users, get current store ID
                if (auth()->user()->type === 'company' && is_null($storeId)) {
                    $storeId = getCurrentStoreId(auth()->user());
                }
            } else {
                $user = User::where('type', 'superadmin')->first();
                $userId = $user ? $user->id : null;
            }
        }

        return PaymentSetting::getUserSettings($userId, $storeId);
    }
}

if (! function_exists('updatePaymentSetting')) {
    /**
     * Update or create a payment setting
     *
     * @param string $key
     * @param mixed $value
     * @param int|null $userId
     * @return \App\Models\PaymentSetting
     */
    function updatePaymentSetting($key, $value, $userId = null, $storeId = null)
    {
        if (is_null($userId)) {
            $userId = auth()->id();
            // For company users, get current store ID
            if (auth()->user()->type === 'company' && is_null($storeId)) {
                $storeId = getCurrentStoreId(auth()->user());
            }
        }

        return PaymentSetting::updateOrCreateSetting($userId, $key, $value, $storeId);
    }
}

if (! function_exists('isPaymentMethodEnabled')) {
    /**
     * Check if a payment method is enabled
     *
     * @param string $method (stripe, paypal, razorpay, mercadopago, bank)
     * @param int|null $userId
     * @return bool
     */
    function isPaymentMethodEnabled($method, $userId = null, $storeId = null)
    {
        $settings = getPaymentSettings($userId, $storeId);
        $key = "is_{$method}_enabled";
        
        return isset($settings[$key]) && ($settings[$key] === true || $settings[$key] === '1');
    }
}

if (! function_exists('getPaymentMethodConfig')) {
    /**
     * Get configuration for a specific payment method
     *
     * @param string $method (stripe, paypal, razorpay, mercadopago)
     * @param int|null $userId
     * @return array
     */
    function getPaymentMethodConfig($method, $userId = null, $storeId = null)
    {
        $settings = getPaymentSettings($userId, $storeId);
        
        switch ($method) {
            case 'stripe':
                return [
                    'enabled' => isPaymentMethodEnabled('stripe', $userId, $storeId),
                    'key' => $settings['stripe_key'] ?? null,
                    'secret' => $settings['stripe_secret'] ?? null,
                ];
                
            case 'paypal':
                return [
                    'enabled' => isPaymentMethodEnabled('paypal', $userId, $storeId),
                    'mode' => $settings['paypal_mode'] ?? 'sandbox',
                    'client_id' => $settings['paypal_client_id'] ?? null,
                    'secret' => $settings['paypal_secret_key'] ?? null,
                ];
                
            case 'razorpay':
                return [
                    'enabled' => isPaymentMethodEnabled('razorpay', $userId, $storeId),
                    'key' => $settings['razorpay_key'] ?? null,
                    'secret' => $settings['razorpay_secret'] ?? null,
                ];
                
            case 'mercadopago':
                return [
                    'enabled' => isPaymentMethodEnabled('mercadopago', $userId, $storeId),
                    'mode' => $settings['mercadopago_mode'] ?? 'sandbox',
                    'access_token' => $settings['mercadopago_access_token'] ?? null,
                ];
                
            case 'paystack':
                return [
                    'enabled' => isPaymentMethodEnabled('paystack', $userId, $storeId),
                    'public_key' => $settings['paystack_public_key'] ?? null,
                    'secret_key' => $settings['paystack_secret_key'] ?? null,
                ];
                
            case 'flutterwave':
                return [
                    'enabled' => isPaymentMethodEnabled('flutterwave', $userId, $storeId),
                    'public_key' => $settings['flutterwave_public_key'] ?? null,
                    'secret_key' => $settings['flutterwave_secret_key'] ?? null,
                ];
                
            case 'cod':
                return [
                    'enabled' => isPaymentMethodEnabled('cod', $userId, $storeId),
                ];
                
            case 'bank':
                return [
                    'enabled' => isPaymentMethodEnabled('bank', $userId, $storeId),
                    'details' => $settings['bank_detail'] ?? null,
                ];
                
            case 'paytabs':
                return [
                    'enabled' => isPaymentMethodEnabled('paytabs', $userId, $storeId),
                    'mode' => $settings['paytabs_mode'] ?? 'sandbox',
                    'profile_id' => $settings['paytabs_profile_id'] ?? null,
                    'server_key' => $settings['paytabs_server_key'] ?? null,
                    'region' => $settings['paytabs_region'] ?? 'ARE',
                ];
                
            case 'skrill':
                return [
                    'enabled' => isPaymentMethodEnabled('skrill', $userId, $storeId),
                    'merchant_id' => $settings['skrill_merchant_id'] ?? null,
                    'secret_word' => $settings['skrill_secret_word'] ?? null,
                ];
                
            case 'coingate':
                return [
                    'enabled' => isPaymentMethodEnabled('coingate', $userId, $storeId),
                    'mode' => $settings['coingate_mode'] ?? 'sandbox',
                    'api_token' => $settings['coingate_api_token'] ?? null,
                ];
                
            case 'payfast':
                return [
                    'enabled' => isPaymentMethodEnabled('payfast', $userId, $storeId),
                    'mode' => $settings['payfast_mode'] ?? 'sandbox',
                    'merchant_id' => $settings['payfast_merchant_id'] ?? null,
                    'merchant_key' => $settings['payfast_merchant_key'] ?? null,
                    'passphrase' => $settings['payfast_passphrase'] ?? null,
                ];
                
            case 'tap':
                return [
                    'enabled' => isPaymentMethodEnabled('tap', $userId, $storeId),
                    'secret_key' => $settings['tap_secret_key'] ?? null,
                ];
                
            case 'xendit':
                return [
                    'enabled' => isPaymentMethodEnabled('xendit', $userId, $storeId),
                    'api_key' => $settings['xendit_api_key'] ?? null,
                ];
                
            case 'paytr':
                return [
                    'enabled' => isPaymentMethodEnabled('paytr', $userId, $storeId),
                    'merchant_id' => $settings['paytr_merchant_id'] ?? null,
                    'merchant_key' => $settings['paytr_merchant_key'] ?? null,
                    'merchant_salt' => $settings['paytr_merchant_salt'] ?? null,
                ];
                
            case 'mollie':
                return [
                    'enabled' => isPaymentMethodEnabled('mollie', $userId, $storeId),
                    'api_key' => $settings['mollie_api_key'] ?? null,
                ];
                
            case 'toyyibpay':
                return [
                    'enabled' => isPaymentMethodEnabled('toyyibpay', $userId, $storeId),
                    'category_code' => $settings['toyyibpay_category_code'] ?? null,
                    'secret_key' => $settings['toyyibpay_secret_key'] ?? null,
                    'mode' => $settings['toyyibpay_mode'] ?? 'sandbox',
                ];
                
            case 'cashfree':
                return [
                    'enabled' => isPaymentMethodEnabled('cashfree', $userId, $storeId),
                    'mode' => $settings['cashfree_mode'] ?? 'sandbox',
                    'public_key' => $settings['cashfree_public_key'] ?? null,
                    'secret_key' => $settings['cashfree_secret_key'] ?? null,
                ];
                
            case 'iyzipay':
                return [
                    'enabled' => isPaymentMethodEnabled('iyzipay', $userId, $storeId),
                    'mode' => $settings['iyzipay_mode'] ?? 'sandbox',
                    'public_key' => $settings['iyzipay_public_key'] ?? null,
                    'secret_key' => $settings['iyzipay_secret_key'] ?? null,
                ];
                
            case 'benefit':
                return [
                    'enabled' => isPaymentMethodEnabled('benefit', $userId, $storeId),
                    'mode' => $settings['benefit_mode'] ?? 'sandbox',
                    'public_key' => $settings['benefit_public_key'] ?? null,
                    'secret_key' => $settings['benefit_secret_key'] ?? null,
                ];
                
            case 'ozow':
                return [
                    'enabled' => isPaymentMethodEnabled('ozow', $userId, $storeId),
                    'mode' => $settings['ozow_mode'] ?? 'sandbox',
                    'site_key' => $settings['ozow_site_key'] ?? null,
                    'private_key' => $settings['ozow_private_key'] ?? null,
                    'api_key' => $settings['ozow_api_key'] ?? null,
                ];
                
            case 'easebuzz':
                return [
                    'enabled' => isPaymentMethodEnabled('easebuzz', $userId, $storeId),
                    'merchant_key' => $settings['easebuzz_merchant_key'] ?? null,
                    'salt_key' => $settings['easebuzz_salt_key'] ?? null,
                    'environment' => $settings['easebuzz_environment'] ?? 'test',
                ];
                
            case 'khalti':
                return [
                    'enabled' => isPaymentMethodEnabled('khalti', $userId, $storeId),
                    'public_key' => $settings['khalti_public_key'] ?? null,
                    'secret_key' => $settings['khalti_secret_key'] ?? null,
                ];
                
            case 'authorizenet':
                return [
                    'enabled' => isPaymentMethodEnabled('authorizenet', $userId, $storeId),
                    'mode' => $settings['authorizenet_mode'] ?? 'sandbox',
                    'merchant_id' => $settings['authorizenet_merchant_id'] ?? null,
                    'transaction_key' => $settings['authorizenet_transaction_key'] ?? null,
                    'supported_countries' => ['US', 'CA', 'GB', 'AU'],
                    'supported_currencies' => ['USD', 'CAD', 'CHF', 'DKK', 'EUR', 'GBP', 'NOK', 'PLN', 'SEK', 'AUD', 'NZD'],
                ];
                
            case 'fedapay':
                return [
                    'enabled' => isPaymentMethodEnabled('fedapay', $userId, $storeId),
                    'mode' => $settings['fedapay_mode'] ?? 'sandbox',
                    'public_key' => $settings['fedapay_public_key'] ?? null,
                    'secret_key' => $settings['fedapay_secret_key'] ?? null,
                ];
                
            case 'payhere':
                return [
                    'enabled' => isPaymentMethodEnabled('payhere', $userId, $storeId),
                    'mode' => $settings['payhere_mode'] ?? 'sandbox',
                    'merchant_id' => $settings['payhere_merchant_id'] ?? null,
                    'merchant_secret' => $settings['payhere_merchant_secret'] ?? null,
                    'app_id' => $settings['payhere_app_id'] ?? null,
                    'app_secret' => $settings['payhere_app_secret'] ?? null,
                ];
                
            case 'cinetpay':
                return [
                    'enabled' => isPaymentMethodEnabled('cinetpay', $userId, $storeId),
                    'site_id' => $settings['cinetpay_site_id'] ?? null,
                    'api_key' => $settings['cinetpay_api_key'] ?? null,
                    'secret_key' => $settings['cinetpay_secret_key'] ?? null,
                ];
                
            case 'midtrans':
                return [
                    'enabled' => isPaymentMethodEnabled('midtrans', $userId, $storeId),
                    'mode' => $settings['midtrans_mode'] ?? 'sandbox',
                    'client_key' => $settings['midtrans_client_key'] ?? null,
                    'secret_key' => $settings['midtrans_secret_key'] ?? null,
                ];

            case 'yookassa':
                return [
                    'enabled' => isPaymentMethodEnabled('yookassa', $userId, $storeId),
                    'shop_id' => $settings['yookassa_shop_id'] ?? null,
                    'secret_key' => $settings['yookassa_secret_key'] ?? null,
                ];
                
            case 'whatsapp':
                return [
                    'enabled' => isPaymentMethodEnabled('whatsapp', $userId, $storeId),
                    'number' => $settings['whatsapp_number'] ?? null,
                    'display_name' => 'WhatsApp',
                    'description' => 'Send order confirmation via WhatsApp',
                ];
                
            case 'telegram':
                return [
                    'enabled' => isPaymentMethodEnabled('telegram', $userId, $storeId),
                    'bot_token' => $settings['telegram_bot_token'] ?? null,
                    'chat_id' => $settings['telegram_chat_id'] ?? null,
                    'display_name' => 'Telegram',
                    'description' => 'Send order confirmation via Telegram',
                ];
                
            default:
                return [];
        }
    }
}

if (! function_exists('getEnabledPaymentMethods')) {
    /**
     * Get all enabled payment methods
     *
     * @param int|null $userId
     * @return array
     */
    function getEnabledPaymentMethods($userId = null, $storeId = null)
    {
        $methods = ['stripe', 'paypal', 'razorpay', 'mercadopago', 'paystack', 'flutterwave', 'bank', 'paytabs', 'skrill', 'coingate', 'payfast', 'tap', 'xendit', 'paytr', 'mollie', 'toyyibpay', 'cashfree', 'iyzipay', 'benefit', 'ozow', 'easebuzz', 'khalti', 'authorizenet', 'fedapay', 'payhere', 'cinetpay', 'midtrans', 'yookassa'];
        
        // Add COD, WhatsApp and Telegram only for company users (not superadmin)
        if ($userId) {
            $user = \App\Models\User::find($userId);
            if ($user && $user->type === 'company') {
                array_unshift($methods, 'cod'); // Add COD at beginning
                $methods[] = 'whatsapp'; // Add WhatsApp
                $methods[] = 'telegram'; // Add Telegram at end
            }
        }
        
        $enabled = [];
        
        foreach ($methods as $method) {
            if (isPaymentMethodEnabled($method, $userId, $storeId)) {
                $enabled[$method] = getPaymentMethodConfig($method, $userId, $storeId);
            }
        }
        
        return $enabled;
    }
}

if (! function_exists('validatePaymentMethodConfig')) {
    /**
     * Validate payment method configuration
     *
     * @param string $method
     * @param array $config
     * @return array [valid => bool, errors => array]
     */
    function validatePaymentMethodConfig($method, $config)
    {
        $errors = [];
        
        switch ($method) {
            case 'stripe':
                if (empty($config['key'])) {
                    $errors[] = 'Stripe publishable key is required';
                }
                if (empty($config['secret'])) {
                    $errors[] = 'Stripe secret key is required';
                }
                break;
                
            case 'paypal':
                if (empty($config['client_id'])) {
                    $errors[] = 'PayPal client ID is required';
                }
                if (empty($config['secret'])) {
                    $errors[] = 'PayPal secret key is required';
                }
                break;
                
            case 'razorpay':
                if (empty($config['key'])) {
                    $errors[] = 'Razorpay key ID is required';
                }
                if (empty($config['secret'])) {
                    $errors[] = 'Razorpay secret key is required';
                }
                break;
                
            case 'mercadopago':
                if (empty($config['access_token'])) {
                    $errors[] = 'MercadoPago access token is required';
                }
                break;
                
            case 'bank':
                if (empty($config['details'])) {
                    $errors[] = 'Bank details are required';
                }
                break;
                
            case 'paytabs':
                if (empty($config['server_key'])) {
                    $errors[] = 'PayTabs server key is required';
                }
                if (empty($config['profile_id'])) {
                    $errors[] = 'PayTabs profile id is required';
                }
                if (empty($config['region'])) {
                    $errors[] = 'PayTabs region is required';
                }
                break;
                
            case 'skrill':
                if (empty($config['merchant_id'])) {
                    $errors[] = 'Skrill merchant ID is required';
                }
                if (empty($config['secret_word'])) {
                    $errors[] = 'Skrill secret word is required';
                }
                break;
                
            case 'coingate':
                if (empty($config['api_token'])) {
                    $errors[] = 'CoinGate API token is required';
                }
                break;
                
            case 'payfast':
                if (empty($config['merchant_id'])) {
                    $errors[] = 'Payfast merchant ID is required';
                }
                if (empty($config['merchant_key'])) {
                    $errors[] = 'Payfast merchant key is required';
                }
                break;
                
            case 'tap':
                if (empty($config['secret_key'])) {
                    $errors[] = 'Tap secret key is required';
                }
                break;
                
            case 'xendit':
                if (empty($config['api_key'])) {
                    $errors[] = 'Xendit api key is required';
                }
                break;
                
            case 'paytr':
                if (empty($config['merchant_id'])) {
                    $errors[] = 'PayTR merchant ID is required';
                }
                if (empty($config['merchant_key'])) {
                    $errors[] = 'PayTR merchant key is required';
                }
                if (empty($config['merchant_salt'])) {
                    $errors[] = 'PayTR merchant salt is required';
                }
                break;
                
            case 'mollie':
                if (empty($config['api_key'])) {
                    $errors[] = 'Mollie API key is required';
                }
                break;
                
            case 'toyyibpay':
                if (empty($config['category_code'])) {
                    $errors[] = 'toyyibPay category code is required';
                }
                if (empty($config['secret_key'])) {
                    $errors[] = 'toyyibPay secret key is required';
                }
                break;
                
            case 'cashfree':
                if (empty($config['public_key'])) {
                    $errors[] = 'Cashfree App ID is required';
                }
                if (empty($config['secret_key'])) {
                    $errors[] = 'Cashfree Secret Key is required';
                }
                break;
                
            case 'iyzipay':
                if (empty($config['public_key'])) {
                    $errors[] = 'Iyzipay API key is required';
                }
                if (empty($config['secret_key'])) {
                    $errors[] = 'Iyzipay secret key is required';
                }
                break;
                
            case 'benefit':
                if (empty($config['public_key'])) {
                    $errors[] = 'Benefit API key is required';
                }
                if (empty($config['secret_key'])) {
                    $errors[] = 'Benefit secret key is required';
                }
                break;
                
            case 'ozow':
                if (empty($config['site_key'])) {
                    $errors[] = 'Ozow site key is required';
                }
                if (empty($config['private_key'])) {
                    $errors[] = 'Ozow private key is required';
                }
                break;
                
            case 'easebuzz':
                if (empty($config['merchant_key'])) {
                    $errors[] = 'Easebuzz merchant key is required';
                }
                if (empty($config['salt_key'])) {
                    $errors[] = 'Easebuzz salt key is required';
                }
                break;
                
            case 'khalti':
                if (empty($config['public_key'])) {
                    $errors[] = 'Khalti public key is required';
                }
                if (empty($config['secret_key'])) {
                    $errors[] = 'Khalti secret key is required';
                }
                break;
                
            case 'authorizenet':
                if (empty($config['merchant_id'])) {
                    $errors[] = 'AuthorizeNet merchant ID is required';
                }
                if (empty($config['transaction_key'])) {
                    $errors[] = 'AuthorizeNet transaction key is required';
                }
                break;
                
            case 'fedapay':
                if (empty($config['public_key'])) {
                    $errors[] = 'FedaPay public key is required';
                }
                if (empty($config['secret_key'])) {
                    $errors[] = 'FedaPay secret key is required';
                }
                break;
                
            case 'payhere':
                if (empty($config['merchant_id'])) {
                    $errors[] = 'PayHere merchant ID is required';
                }
                if (empty($config['merchant_secret'])) {
                    $errors[] = 'PayHere merchant secret is required';
                }
                break;
                
            case 'cinetpay':
                if (empty($config['site_id'])) {
                    $errors[] = 'CinetPay site ID is required';
                }
                if (empty($config['api_key'])) {
                    $errors[] = 'CinetPay API key is required';
                }
                break;
                
            case 'paiement':
                if (empty($config['merchant_id'])) {
                    $errors[] = 'Paiement Pro merchant ID is required';
                }
                break;
                
            case 'nepalste':
                if (empty($config['public_key'])) {
                    $errors[] = 'Nepalste public key is required';
                }
                if (empty($config['secret_key'])) {
                    $errors[] = 'Nepalste secret key is required';
                }
                break;
                
            case 'yookassa':
                if (empty($config['shop_id'])) {
                    $errors[] = 'YooKassa shop ID is required';
                }
                if (empty($config['secret_key'])) {
                    $errors[] = 'YooKassa secret key is required';
                }
                break;
                
            case 'midtrans':
                if (empty($config['secret_key'])) {
                    $errors[] = 'Midtrans secret key is required';
                }
                break;
                
            case 'aamarpay':
                if (empty($config['store_id'])) {
                    $errors[] = 'Aamarpay store ID is required';
                }
                if (empty($config['signature'])) {
                    $errors[] = 'Aamarpay signature is required';
                }
                break;
                
            case 'whatsapp':
                if (empty($config['number'])) {
                    $errors[] = 'WhatsApp phone number is required';
                }
                break;
                
            case 'telegram':
                if (empty($config['bot_token'])) {
                    $errors[] = 'Telegram bot token is required';
                }
                if (empty($config['chat_id'])) {
                    $errors[] = 'Telegram chat ID is required';
                }
                break;
        }
        
        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
}

if (! function_exists('calculatePlanPricing')) {
    function calculatePlanPricing($plan, $couponCode = null, $billingCycle = 'monthly', $userId = null)
    {
        $originalPrice = $plan->getPriceForCycle($billingCycle);
        $discountAmount = 0;
        $finalPrice = $originalPrice;
        $couponId = null;

        if ($couponCode) {
            $coupon = Coupon::where('code', $couponCode)
                ->where('status', 1)
                ->first();

            if ($coupon) {
                $now = now();
                $isValid = true;

                if ($coupon->start_date && $now->lt($coupon->start_date)) {
                    $isValid = false;
                }

                if ($isValid && $coupon->expiry_date && $now->gt($coupon->expiry_date)) {
                    $isValid = false;
                }

                if ($isValid && $coupon->use_limit_per_coupon && $coupon->used_count >= $coupon->use_limit_per_coupon) {
                    $isValid = false;
                }

                if ($isValid && $userId && $coupon->use_limit_per_user) {
                    $userUsage = PlanOrder::where('coupon_id', $coupon->id)
                        ->where('user_id', $userId)
                        ->whereIn('status', ['approved', 'pending'])
                        ->count();
                    if ($userUsage >= $coupon->use_limit_per_user) {
                        $isValid = false;
                    }
                }

                if ($isValid && $coupon->minimum_spend && $originalPrice < $coupon->minimum_spend) {
                    $isValid = false;
                }

                if ($isValid && $coupon->maximum_spend && $originalPrice > $coupon->maximum_spend) {
                    $isValid = false;
                }

                if ($isValid) {
                    if ($coupon->type === 'percentage') {
                        $discountAmount = ($originalPrice * $coupon->discount_amount) / 100;
                    } else {
                        $discountAmount = min($coupon->discount_amount, $originalPrice);
                    }
                    $finalPrice = max(0, $originalPrice - $discountAmount);
                    $couponId = $coupon->id;
                }
            }
        }

        return [
            'original_price' => $originalPrice,
            'discount_amount' => $discountAmount,
            'final_price' => $finalPrice,
            'coupon_id' => $couponId
        ];
    }
}

if (! function_exists('createPlanOrder')) {
    function createPlanOrder($data)
    {
        $plan = Plan::findOrFail($data['plan_id']);
        $userId = $data['user_id'] ?? null;
        $pricing = calculatePlanPricing($plan, $data['coupon_code'] ?? null, $data['billing_cycle'] ?? 'monthly', $userId);
        
        $planOrder = PlanOrder::create([
            'user_id' => $data['user_id'],
            'plan_id' => $plan->id,
            'coupon_id' => $pricing['coupon_id'],
            'billing_cycle' => $data['billing_cycle'],
            'payment_method' => $data['payment_method'],
            'coupon_code' => $data['coupon_code'] ?? null,
            'original_price' => $pricing['original_price'],
            'discount_amount' => $pricing['discount_amount'],
            'final_price' => $pricing['final_price'],
            'payment_id' => $data['payment_id'],
            'receipt' => $data['receipt'] ?? null,
            'status' => $data['status'] ?? 'pending',
            'ordered_at' => now(),
        ]);

        if ($pricing['coupon_id'] && ($data['status'] ?? 'pending') === 'approved') {
            Coupon::where('id', $pricing['coupon_id'])->increment('used_count');
        }

        return $planOrder;
    }
}


if (! function_exists('processPaymentSuccess')) {
    function processPaymentSuccess($data)
    {
        $plan = Plan::findOrFail($data['plan_id']);
        $user = User::findOrFail($data['user_id']);
        
        $planOrder = createPlanOrder(array_merge($data, ['status' => 'approved']));
        assignPlanToUser($user, $plan, $data['billing_cycle']);
        
        // Verify the plan was assigned
        $user->refresh();
        return $planOrder;
    }
}

if (! function_exists('getPaymentGatewaySettings')) {
    function getPaymentGatewaySettings()
    {
        $superAdminId = User::where('type', 'superadmin')->first()?->id;
        
        return [
            'payment_settings' => PaymentSetting::getUserSettings($superAdminId),
            'general_settings' => Setting::getUserSettings($superAdminId),
            'super_admin_id' => $superAdminId
        ];
    }
}

if (! function_exists('validatePaymentRequest')) {
    function validatePaymentRequest($request, $additionalRules = [])
    {
        $baseRules = [
            'plan_id' => 'required|exists:plans,id',
            'billing_cycle' => 'required|in:monthly,yearly',
            'coupon_code' => 'nullable|string',
        ];
        
        return $request->validate(array_merge($baseRules, $additionalRules));
    }
}

if (! function_exists('handlePaymentError')) {
    function handlePaymentError($e, $method = 'payment')
    {
        return back()->withErrors(['error' => __('Payment processing failed: :message', ['message' => $e->getMessage()])]);
    }
}

if (! function_exists('defaultSettings')) {
    /**
     * Get default settings for System, Brand, Storage, and Currency configurations
     *
     * @return array
     */
    function defaultSettings()
    {
        return [
            // System Settings
            'defaultLanguage' => 'ar',
            'dateFormat' => 'm/d/Y',
            'timeFormat' => 'h:i A',
            'calendarStartDay' => 'sunday',
            'defaultTimezone' => 'Asia/Hebron',
            'emailVerification' => false,
            'landingPageEnabled' => true,
            'registrationEnabled' => true,
            
            // Brand Settings
            'logoLight' => '/images/logos/logo-light.png',
            'favicon' => '/images/logos/favicon.png',
            'titleText' => 'Wusool',
            'footerText' => '© 2026 Wusool. All rights reserved.',
            'themeColor' => 'green',
            'customColor' => '#10b77f',
            'sidebarVariant' => 'inset',
            'sidebarStyle' => 'plain',
            'layoutDirection' => 'right',
            
            // Storage Settings
            'storage_type' => 'local',
            'storage_file_types' => 'jpg,png,webp,gif,pdf,doc,docx,txt,csv',
            'storage_max_upload_size' => '2048',
            'aws_access_key_id' => '',
            'aws_secret_access_key' => '',
            'aws_default_region' => 'us-east-1',
            'aws_bucket' => '',
            'aws_url' => '',
            'aws_endpoint' => '',
            'wasabi_access_key' => '',
            'wasabi_secret_key' => '',
            'wasabi_region' => 'us-east-1',
            'wasabi_bucket' => '',
            'wasabi_url' => '',
            'wasabi_root' => '',
            
            // Currency Settings
            'decimalFormat' => '2',
            'defaultCurrency' => 'ILS',
            'decimalSeparator' => '.',
            'thousandsSeparator' => ',',
            'floatNumber' => true,
            'currencySymbolSpace' => false,
            'currencySymbolPosition' => 'after',
            
            // Cookie Settings
            'enableLogging' => true,
            'strictlyNecessaryCookies' => true,
            'cookieTitle' => 'موافقة ملفات تعريف الارتباط',
            'strictlyCookieTitle' => 'ملفات تعريف الارتباط الضرورية',
            'cookieDescription' => 'نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح وتوفير محتوى مخصص.',
            'strictlyCookieDescription' => 'هذه الملفات ضرورية لتشغيل الموقع بشكل صحيح.',
            'contactUsDescription' => 'إذا كان لديك أي أسئلة حول سياسة ملفات تعريف الارتباط، يرجى التواصل معنا.',
            'contactUsUrl' => 'https://wusool.ps/contact',
        ];
    }
}

if (! function_exists('createDefaultSettings')) {
    function createDefaultSettings($userId)
    {
        if (Setting::where('user_id', $userId)->exists()) {
            return;
        }
        
        $defaults = defaultSettings();
        $settingsData = [];
        
        foreach ($defaults as $key => $value) {
            $settingsData[] = [
                'user_id' => $userId,
                'key' => $key,
                'value' => is_bool($value) ? ($value ? '1' : '0') : (string)$value,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        
        Setting::insert($settingsData);
    }
}

if (! function_exists('copySettingsFromSuperAdmin')) {
    /**
     * Copy system and brand settings from superadmin to company user
     *
     * @param int $companyUserId
     * @return void
     */
    function copySettingsFromSuperAdmin($companyUserId, $companyUserCurrentStore = null)
    {
        $superAdmin = User::where('type', 'superadmin')->first();
        if (!$superAdmin) {
            createDefaultSettings($companyUserId);
            return;
        }
        
        // Settings to copy from superadmin (system and brand settings only)
        $settingsToCopy = [
            'defaultLanguage', 'dateFormat', 'timeFormat', 'calendarStartDay', 
            'defaultTimezone',
            'logoLight', 'favicon', 'titleText', 'footerText',
            'themeColor', 'customColor', 'sidebarVariant', 'sidebarStyle',
            'layoutDirection',
            'defaultCurrency', 'decimalFormat', 'decimalSeparator',
            'thousandsSeparator', 'floatNumber', 'currencySymbolSpace',
            'currencySymbolPosition'
        ];
        
        $superAdminSettings = Setting::where('user_id', $superAdmin->id)
            ->whereIn('key', $settingsToCopy)
            ->get();
        
        $settingsData = [];
        
        // Only copy existing superadmin settings
        foreach ($superAdminSettings as $setting) {
            Setting::updateOrCreate(
                [
                    'user_id' => $companyUserId,
                    'store_id' => $companyUserCurrentStore,
                    'key' => $setting->key
                ],
                ['value' => $setting->value]
            );
        }
    }
}

if (! function_exists('formatStoreCurrency')) {
    /**
     * Format currency using store-specific settings
     *
     * @param float|string $amount
     * @param int|null $userId
     * @param int|null $storeId
     * @return string
     */
    function formatStoreCurrency($amount, $userId = null, $storeId = null)
    {
        // Get user and store ID if not provided
        if (is_null($userId) && auth()->check()) {
            $userId = auth()->id();
            if (is_null($storeId) && auth()->user()->current_store) {
                $storeId = getCurrentStoreId(auth()->user());
            }
        }
        
        // Convert amount to float
        $numAmount = is_string($amount) ? (float)$amount : $amount;
        
        try {
            // Get store-specific currency settings
            $storeSettings = $storeId ? Setting::getUserSettings($userId, $storeId) : [];
            
            // Get currency code from store settings or fall back to global settings
            $currencyCode = $storeSettings['defaultCurrency'] ?? settings($userId)['defaultCurrency'] ?? 'ILS';
            
            // Get currency details
            $currency = \App\Models\Currency::where('code', $currencyCode)->first();
            
            // Currency formatting settings
            $symbol = $currency ? $currency->symbol : '₪';
            $position = $storeSettings['currencySymbolPosition'] ?? 'before';
            $decimals = (int)($storeSettings['decimalFormat'] ?? 2);
            $decimalSeparator = $storeSettings['decimalSeparator'] ?? '.';
            $thousandsSeparator = $storeSettings['thousandsSeparator'] ?? ',';
            
            // Format the number
            $formattedNumber = number_format($numAmount, $decimals, $decimalSeparator, $thousandsSeparator);
            
            // Return with currency symbol in correct position
            return $position === 'after' 
                ? $formattedNumber . ' ' . $symbol
                : $symbol . ' ' . $formattedNumber;
                
        } catch (\Exception $e) {
            // Fallback to simple formatting
            return '₪' . number_format($numAmount, 2);
        }
    }
}

if (! function_exists('formatCurrency')) {
    /**
     * Format currency based on store settings (matches TypeScript formatCurrency function)
     *
     * @param float|string $amount
     * @param array $storeSettings
     * @param array $currencies
     * @return string
     */
    function formatCurrency($amount, $storeSettings = [], $currencies = [])
    {
        $defaultCurrency = $storeSettings['defaultCurrency'] ?? 'ILS';
        $decimalFormat = $storeSettings['decimalFormat'] ?? '2';
        $decimalSeparator = $storeSettings['decimalSeparator'] ?? '.';
        $thousandsSeparator = $storeSettings['thousandsSeparator'] ?? ',';
        $currencySymbolPosition = $storeSettings['currencySymbolPosition'] ?? 'after';
        $currencySymbolSpace = $storeSettings['currencySymbolSpace'] ?? false;
        $floatNumber = $storeSettings['floatNumber'] ?? true;
        
        // Convert amount to number
        $numAmount = is_string($amount) ? (float)$amount : $amount;
        if (is_nan($numAmount)) return '₪0.00';
        
        // Get currency symbol
        $currency = null;
        foreach ($currencies as $curr) {
            if ($curr['code'] === $defaultCurrency) {
                $currency = $curr;
                break;
            }
        }
        $symbol = $currency['symbol'] ?? '₪';
        
        // Handle float number setting
        $finalAmount = ($floatNumber === false || $floatNumber === '0') 
            ? floor($numAmount) 
            : $numAmount;
        
        // Format decimal places
        $decimalPlaces = (int)$decimalFormat ?: 2;
        $formattedNumber = number_format($finalAmount, $decimalPlaces, '.', '');
        
        // Split into integer and decimal parts
        $parts = explode('.', $formattedNumber);
        
        // Add thousands separator
        if ($thousandsSeparator && $thousandsSeparator !== 'none') {
            $parts[0] = preg_replace('/\B(?=(\d{3})+(?!\d))/', $thousandsSeparator, $parts[0]);
        }
        
        // Join with decimal separator
        $finalNumber = implode($decimalSeparator, $parts);
        
        // Add currency symbol with proper positioning and spacing
        $space = ($currencySymbolSpace === true || $currencySymbolSpace === '1') ? ' ' : '';
        
        $primary = $currencySymbolPosition === 'after' 
            ? $finalNumber . $space . $symbol
            : $symbol . $space . $finalNumber;
        
        // Dual currency: append the secondary currency value when configured
        $secondary = getSecondaryCurrencyInfo($storeSettings, $currencies);
        if ($secondary !== null) {
            $secondaryAmount = $numAmount * $secondary['exchangeRate'];
            $secondaryNumber = number_format($secondaryAmount, $decimalPlaces, '.', '');
            $secondaryParts = explode('.', $secondaryNumber);
            if ($thousandsSeparator && $thousandsSeparator !== 'none') {
                $secondaryParts[0] = preg_replace('/\B(?=(\d{3})+(?!\d))/', $thousandsSeparator, $secondaryParts[0]);
            }
            $secondaryFinalNumber = implode($decimalSeparator, $secondaryParts);
            $secondaryStr = $currencySymbolPosition === 'after' 
                ? $secondaryFinalNumber . $space . $secondary['symbol']
                : $secondary['symbol'] . $space . $secondaryFinalNumber;
            return $primary . ' ≈ ' . $secondaryStr;
        }
        
        return $primary;
    }

    /**
     * Resolve the configured secondary currency (code/symbol + manual exchange rate).
     */
    function getSecondaryCurrencyInfo(array $storeSettings = [], array $currencies = [])
    {
        $code = $storeSettings['secondaryCurrency'] ?? null;
        $exchangeRate = isset($storeSettings['exchangeRate']) ? (float) $storeSettings['exchangeRate'] : 0;
        if (!$code || $exchangeRate <= 0) {
            return null;
        }

        $symbol = null;
        foreach ($currencies as $curr) {
            if (($curr['code'] ?? null) === $code) {
                $symbol = $curr['symbol'] ?? null;
                break;
            }
        }
        if (!$symbol) {
            $symbol = $code;
        }

        return [
            'symbol' => $symbol,
            'exchangeRate' => $exchangeRate,
        ];
    }
}

if (! function_exists('getCurrentStoreId')) {
    /**
     * Get the current store ID, handling both demo and production modes
     *
     * @param \App\Models\User|null $user
     * @return int|null
     */
    function getCurrentStoreId($user = null)
    {
        if (!$user) {
            $user = auth()->user();
        }
        
        if (!$user) {
            return null;
        }
        
        // Check if demo mode is enabled
        if (config('app.is_demo', false)) {
            // Demo mode: use cookie if available and valid
            if (request()->cookie('demo_store_id')) {
                $storeId = (int) request()->cookie('demo_store_id');
                
                // Verify the store belongs to the user or their creator
                $storeExists = false;
                if ($user->type === 'company') {
                    $storeExists = $user->stores->contains('id', $storeId);
                } elseif ($user->type === 'user' && $user->created_by) {
                    $creator = \App\Models\User::find($user->created_by);
                    if ($creator) {
                        $storeExists = $creator->stores->contains('id', $storeId);
                    }
                }
                
                if ($storeExists) {
                    return $storeId;
                }
            }
            // Fall back to database if no valid cookie
            return $user->current_store;
        } else {
            // Production mode: always use database current_store field
            return $user->current_store;
        }
    }
}

if (! function_exists('cleanUtf8')) {
    /**
     * Sanitize a value so it only contains valid UTF-8 characters.
     * Prevents JSON encoding from failing on malformed text
     * (e.g. "Malformed UTF-8 characters, possibly incorrectly encoded").
     *
     * @param mixed $value
     * @return mixed
     */
    function cleanUtf8($value)
    {
        if (!is_string($value) || $value === '' || mb_check_encoding($value, 'UTF-8')) {
            return $value;
        }
        // Drop invalid byte sequences, keeping valid UTF-8 characters intact.
        $cleaned = @iconv('UTF-8', 'UTF-8//IGNORE', $value);
        return $cleaned === false ? '' : $cleaned;
    }
}

if (! function_exists('sanitizeModelUtf8')) {
    /**
     * Recursively sanitize all string attributes (and loaded relations) of a model
     * so its JSON serialization never fails on malformed UTF-8.
     *
     * @param mixed $model
     * @return mixed
     */
    function sanitizeModelUtf8($model)
    {
        if ($model instanceof \Illuminate\Database\Eloquent\Model) {
            foreach ($model->getAttributes() as $key => $value) {
                if (is_string($value)) {
                    $model->{$key} = cleanUtf8($value);
                }
            }
            foreach ($model->getRelations() as $relation => $related) {
                if ($related instanceof \Illuminate\Database\Eloquent\Model) {
                    $model->setRelation($relation, sanitizeModelUtf8($related));
                } elseif ($related instanceof \Illuminate\Support\Collection) {
                    $model->setRelation($relation, $related->map(fn ($item) => sanitizeModelUtf8($item)));
                }
            }
        } elseif ($model instanceof \Illuminate\Support\Collection || $model instanceof \Illuminate\Database\Eloquent\Collection) {
            $model->transform(fn ($item) => sanitizeModelUtf8($item));
        }
        return $model;
    }
}

if (! function_exists('isSuperAdmin')) {
    /**
     * Check if the current user is a super admin
     *
     * @param \App\Models\User|null $user
     * @return bool
     */
    function isSuperAdmin($user = null)
    {
        if (!$user) {
            $user = auth()->user();
        }
        
        if (!$user) {
            return false;
        }
        
        return $user->isSuperAdmin();
    }
}

if (! function_exists('resolveStoreQuery')) {
    /**
     * Build a store query scoped to the given user.
     *
     * Superadmins and admins can access any store, company users access their
     * own stores, and sub-users access their creator's stores.
     *
     * @param \App\Models\User|null $user
     * @return \Illuminate\Database\Eloquent\Builder
     */
    function resolveStoreQuery($user = null)
    {
        if (!$user) {
            $user = auth()->user();
        }

        if ($user && ($user->isSuperAdmin() || $user->isAdmin())) {
            return \App\Models\Store::query();
        }

        if ($user && $user->type === 'company') {
            return \App\Models\Store::where('user_id', $user->id);
        }

        return \App\Models\Store::where('user_id', $user ? $user->created_by : 0);
    }
}

if (! function_exists('isCompanyUser')) {
    /**
     * Check if the current user is a company user
     *
     * @param \App\Models\User|null $user
     * @return bool
     */
    function isCompanyUser($user = null)
    {
        if (!$user) {
            $user = auth()->user();
        }
        
        if (!$user) {
            return false;
        }
        
        return $user->type === 'company';
    }
}

if (! function_exists('getWusoolVersion')) {
    /**
     * Get Wusool application version
     *
     * @return string
     */
    function getWusoolVersion()
    {
        return '1.0.0';
    }
}

if (! function_exists('getWusoolStats')) {
    /**
     * Get basic Wusool statistics
     *
     * @return array
     */
    function getWusoolStats()
    {
        try {
            return [
                'total_companies' => \App\Models\User::where('type', 'company')->count(),
                'total_stores' => \App\Models\Store::count(),
                'active_stores' => \App\Models\Store::count(),
                'total_plans' => \App\Models\Plan::count(),
                'active_plans' => \App\Models\Plan::where('is_plan_enable', 'on')->count(),
            ];
        } catch (\Exception $e) {
            return [
                'total_companies' => 0,
                'total_stores' => 0,
                'active_stores' => 0,
                'total_plans' => 0,
                'active_plans' => 0,
            ];
        }
    }
}

if (!function_exists('reactivateResources')) {
    /**
     * Reactivate resources when plan is upgraded
     */
    function reactivateResources($user)
    {
        if (!$user->plan) {
            return;
        }

        $plan = $user->plan;
        $maxStores = $plan->max_stores ?? 0;
        $maxUsersPerStore = $plan->max_users_per_store ?? 0;
        $maxProductsPerStore = $plan->max_products_per_store ?? 0;

        // Reactivate stores within new limit
        $allStores = $user->stores()->orderBy('created_at', 'asc')->take($maxStores)->get();
        foreach ($allStores as $store) {
            \App\Models\StoreConfiguration::updateOrCreate(
                ['store_id' => $store->id, 'key' => 'store_status'],
                ['value' => 'true']
            );
        }

        // Reactivate users within new limit for each active store
        foreach ($user->stores as $store) {
            $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
            if (!($config['store_status'] ?? true)) continue;
            
            $deactivatedUsers = \App\Models\User::where('current_store', $store->id)
                ->where('type', '!=', 'company')
                ->where('status', 'inactive')
                ->orderBy('created_at', 'asc')
                ->limit($maxUsersPerStore)
                ->get();
                
            foreach ($deactivatedUsers as $storeUser) {
                $storeUser->update(['status' => 'active']);
            }
        }

        // Reactivate products within new limit for each active store
        if ($maxProductsPerStore > 0) {
            foreach ($user->stores as $store) {
                $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
                if (!($config['store_status'] ?? true)) continue;
                
                $deactivatedProducts = \App\Models\Product::where('store_id', $store->id)
                    ->where('is_active', false)
                    ->orderBy('created_at', 'asc')
                    ->limit($maxProductsPerStore)
                    ->get();
                    
                foreach ($deactivatedProducts as $product) {
                    $product->update(['is_active' => true]);
                }
            }
        }
    }
}

if (!function_exists('enforcePlanLimitations')) {
    /**
     * Enforce plan limitations when plan changes
     */
    function enforcePlanLimitations($user)
    {
        if (!$user->plan) {
            return;
        }

        $plan = $user->plan;
        $maxStores = $plan->max_stores ?? 0;
        $maxUsersPerStore = $plan->max_users_per_store ?? 0;
        $maxProductsPerStore = $plan->max_products_per_store ?? 0;

        // Enforce store limitations
        $stores = $user->stores()->orderBy('created_at', 'asc')->get();
        $activeCount = 0;
        foreach ($stores as $store) {
            $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
            if ($config['store_status'] ?? true) {
                $activeCount++;
                if ($activeCount > $maxStores) {
                    \App\Models\StoreConfiguration::updateOrCreate(
                        ['store_id' => $store->id, 'key' => 'store_status'],
                        ['value' => 'false']
                    );
                }
            }
        }

        // Enforce user limitations per store (only for active stores)
        foreach ($user->stores as $store) {
            $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
            if (!($config['store_status'] ?? true)) continue;
            
            $storeUsers = \App\Models\User::where('current_store', $store->id)
                ->where('type', '!=', 'company')
                ->where('status', 'active')
                ->orderBy('created_at', 'desc')
                ->get();
                
            if ($storeUsers->count() > $maxUsersPerStore) {
                $usersToDeactivate = $storeUsers->skip($maxUsersPerStore);
                foreach ($usersToDeactivate as $storeUser) {
                    $storeUser->update(['status' => 'inactive']);
                }
            }
        }

        // Enforce product limitations per store (only for active stores)
        if ($maxProductsPerStore > 0) {
            foreach ($user->stores as $store) {
                $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
                if (!($config['store_status'] ?? true)) continue;
                
                $products = \App\Models\Product::where('store_id', $store->id)
                    ->where('is_active', true)
                    ->orderBy('created_at', 'desc')
                    ->get();
                    
                if ($products->count() > $maxProductsPerStore) {
                    $productsToDeactivate = $products->skip($maxProductsPerStore);
                    foreach ($productsToDeactivate as $product) {
                        $product->update(['is_active' => false]);
                    }
                }
            }
        }

        // Enforce theme limitations
        $allowedThemes = $user->getAvailableThemes();
        if (is_array($allowedThemes) && !empty($allowedThemes)) {
            $defaultTheme = $allowedThemes[0] ?? 'gadgets';
            $user->stores()->whereNotIn('theme', $allowedThemes)->update(['theme' => $defaultTheme]);
        }
    }
}

if (!function_exists('isPlanUpgrade')) {
    /**
     * Check if new plan is an upgrade from old plan
     */
    function isPlanUpgrade($oldPlan, $newPlan)
    {
        if (!$oldPlan || !$newPlan) {
            return false;
        }
        
        return (
            ($newPlan->max_stores ?? 0) > ($oldPlan->max_stores ?? 0) ||
            ($newPlan->max_users_per_store ?? 0) > ($oldPlan->max_users_per_store ?? 0) ||
            ($newPlan->max_products_per_store ?? 0) > ($oldPlan->max_products_per_store ?? 0)
        );
    }
}

// Domain Helper Functions
if (!function_exists('getStoreUrl')) {
    /**
     * Get store URL based on domain configuration
     */
    function getStoreUrl($store)
    {
        if (!$store) {
            return url('/');
        }
        
        return $store->getStoreUrl();
    }
}



if (!function_exists('isCustomDomain')) {
    /**
     * Check if current request is on custom domain
     */
    function isCustomDomain($host = null)
    {
        if (!$host) {
            $host = request()->getHost();
        }
        
        // Check custom domain
        $customDomain = \App\Models\Store::where('custom_domain', $host)
            ->where('enable_custom_domain', true)
            ->whereHas('configurations', function($q) {
                $q->where('key', 'store_status')->where('value', 'true');
            })->exists();
        
        // Also check stores without configuration (default active)
        if (!$customDomain) {
            $customDomain = \App\Models\Store::where('custom_domain', $host)
                ->where('enable_custom_domain', true)
                ->whereDoesntHave('configurations', function($q) {
                    $q->where('key', 'store_status');
                })->exists();
        }
            
        if ($customDomain) {
            return true;
        }
        
        // Check custom subdomain
        if (str_contains($host, '.')) {
            $subdomain = explode('.', $host)[0];
            $subdomainExists = \App\Models\Store::where('custom_subdomain', $subdomain)
                ->where('enable_custom_subdomain', true)
                ->whereHas('configurations', function($q) {
                    $q->where('key', 'store_status')->where('value', 'true');
                })->exists();
            
            // Also check stores without configuration (default active)
            if (!$subdomainExists) {
                $subdomainExists = \App\Models\Store::where('custom_subdomain', $subdomain)
                    ->where('enable_custom_subdomain', true)
                    ->whereDoesntHave('configurations', function($q) {
                        $q->where('key', 'store_status');
                    })->exists();
            }
            
            return $subdomainExists;
        }
        
        return false;
    }
}

if (!function_exists('getCurrentStore')) {
    /**
     * Get current store from request
     */
    function getCurrentStore()
    {
        return request()->attributes->get('resolved_store');
    }
}



if (!function_exists('isCustomDomainRequest')) {
    /**
     * Check if current request is from custom domain
     */
    function isCustomDomainRequest(): bool
    {
        $store = getCurrentStore();
        return $store && ($store->enable_custom_domain || $store->enable_custom_subdomain);
    }
}

if (!function_exists('storeUrl')) {
    /**
     * Generate store URL with custom domain support
     */
    function storeUrl($store, $path = '', $parameters = [])
    {
        if (is_string($store)) {
            $store = \App\Models\Store::where('slug', $store)->first();
        }
        
        if (!$store) {
            return url($path);
        }
        
        return $store->route($path, $parameters);
    }
}




if (! function_exists('assignPlanToUser')) {
    function assignPlanToUser($user, $plan, $billingCycle)
    {
        $expiresAt = $billingCycle === 'yearly' ? now()->addYear() : now()->addMonth();
        
        $oldPlan = $user->plan;
        
        try {
            \DB::beginTransaction();
            
            $updated = $user->update([
                'plan_id' => $plan->id,
                'plan_duration' => $billingCycle,
                'plan_expire_date' => $expiresAt,
                'plan_is_active' => 1,
                'is_trial' => 0,
                'trial_expire_date' => null,
            ]);
            
            if ($updated) {
                $user = $user->fresh();
                
                // Create referral record if user was referred
                if (class_exists('\App\Http\Controllers\ReferralController')) {
                    \App\Http\Controllers\ReferralController::createReferralRecord($user, $billingCycle);
                }
                
                // If upgrading (higher limits), reactivate resources first
                if ($oldPlan && isPlanUpgrade($oldPlan, $plan)) {
                    reactivateResources($user);
                }
                
                // Then enforce current plan limitations
                enforcePlanLimitations($user);
            }
            
            \DB::commit();
            return $updated;
            
        } catch (\Exception $e) {
            \DB::rollback();
            \Log::error('Plan assignment failed: ' . $e->getMessage());
            throw $e;
        }
    }
}

if (! function_exists('getPWAIconUrl')) {
    /**
     * Get PWA icon URL with proper fallback chain
     * Priority: Store favicon > Company store favicon > Store logo > Default
     */
    function getPWAIconUrl($store)
    {
        // Get store configuration
        $storeConfig = \App\Models\StoreConfiguration::getConfiguration($store->id);
        
        // Priority 1: Store favicon from store_configuration
        if (!empty($storeConfig['favicon'])) {
            return asset($storeConfig['favicon']);
        }
        
        // Priority 2: Company favicon for this store (settings table with store_id)
        if ($store->user) {
            $userSettings = \App\Models\Setting::getUserSettings($store->user->id, $store->id);
            if (!empty($userSettings['favicon'])) {
                return asset($userSettings['favicon']);
            }
        }
        
        // Priority 3: Store logo
        if (!empty($storeConfig['logo'])) {
            return asset($storeConfig['logo']);
        }
        
        // Priority 4: Default logo (check if exists, otherwise use fallback)
        $defaultPath = public_path('images/logos/favicon.png');
        if (file_exists($defaultPath)) {
            return asset('images/logos/favicon.png');
        }
        
        return null;
    }
}

if (! function_exists('generatePWAIcons')) {
    /**
     * Generate PWA icons array with optimized fallback chain
     */
    function generatePWAIcons($store)
    {
        // PWA standard sizes - we use the dynamic route to ensure perfect compatibility
        $sizes = [72, 96, 128, 144, 152, 192, 256, 384, 512];
        $icons = [];
        
        foreach ($sizes as $size) {
            $icons[] = [
                'src' => route('store.pwa.icon', ['storeSlug' => $store->slug, 'size' => $size]),
                'sizes' => $size . 'x' . $size,
                'type' => 'image/png',
                'purpose' => 'any maskable'
            ];
        }
        
        return $icons;
    }
}

if (! function_exists('getSuperadminId')) {
    function getSuperadminId()
    {
        if (request()->is('install*') || request()->is('update*') || request()->is('installer*') || !file_exists(storage_path('installed'))) {
            return null;
        }

        static $superadminId = null;
        if ($superadminId === null) {
            $superAdmin = User::where('type', 'superadmin')->first();
            $superadminId = $superAdmin?->id;
        }
        return $superadminId;
    }
}

if (! function_exists('getCurrencySettings')) {
    function getCurrencySettings($userId = null, $storeId = null)
    {
        if (request()->is('install*') || request()->is('update*') || request()->is('installer*') || !file_exists(storage_path('installed'))) {
            return defaultSettings();
        }

        if (is_null($userId)) {
            if (auth()->user()) {
                $user = auth()->user();
                if ($user->type === 'superadmin') {
                    $userId = $user->id;
                    $storeId = null;
                } elseif ($user->type === 'company') {
                    $userId = $user->id;
                    $storeId = $storeId ?: getCurrentStoreId($user);
                } else {
                    $userId = $user->created_by;
                    $companyUser = User::find($user->created_by);
                    $storeId = $storeId ?: ($companyUser ? getCurrentStoreId($companyUser) : null);
                }
            } else {
                $superadminId = getSuperadminId();
                $userId = $superadminId;
                $storeId = null;
            }
        }

        if (!$userId) {
            return defaultSettings();
        }

        if ($storeId) {
            $storeSettings = Setting::where('user_id', $userId)
                                  ->where('store_id', $storeId)
                                  ->pluck('value', 'key')
                                  ->toArray();
            if (!empty($storeSettings)) {
                return array_merge(defaultSettings(), $storeSettings);
            }
        }

        $userSettings = Setting::where('user_id', $userId)
                              ->whereNull('store_id')
                              ->pluck('value', 'key')
                              ->toArray();
        if (!empty($userSettings)) {
            return array_merge(defaultSettings(), $userSettings);
        }

        if ($userId !== getSuperadminId()) {
            $superadminSettings = Setting::where('user_id', getSuperadminId())
                                        ->whereNull('store_id')
                                        ->pluck('value', 'key')
                                        ->toArray();
            if (!empty($superadminSettings)) {
                return array_merge(defaultSettings(), $superadminSettings);
            }
        }

        return defaultSettings();
    }
}

if (! function_exists('formatCurrencyAmount')) {
    function formatCurrencyAmount($amount, $userId = null, $storeId = null)
    {
        // Always use superadmin settings for plan prices
        $superadminId = getSuperadminId();
        $settings = getCurrencySettings($superadminId, null);
        $currencies = Currency::all()->map(function ($currency) {
            return [
                'code' => $currency->code,
                'symbol' => $currency->symbol,
                'name' => $currency->name
            ];
        })->toArray();
        
        return formatCurrency($amount, $settings, $currencies);
    }
}

if (! function_exists('get_file')) {
    /**
     * Get the correct URL for a file based on active storage disk
     */
    function get_file($path)
    {
        if (empty($path)) {
            return null;
        }

        // If path is already a full URL, return as is
        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }

        \App\Services\DynamicStorageService::configureDynamicDisks();
        $disk = \App\Services\StorageConfigService::getActiveDisk();

        try {
            if ($disk === 'public') {
                $baseUrl = rtrim(getSchemeAwareUrl(), '/');
                $path = ltrim($path, '/');
                return $baseUrl . '/storage/' . $path;
            }

            return \Illuminate\Support\Facades\Storage::disk($disk)->url($path);
        } catch (\Exception $e) {
            // Fallback to local public url
            $baseUrl = rtrim(getSchemeAwareUrl(), '/');
            $path = ltrim($path, '/');
            return $baseUrl . '/storage/' . $path;
        }
    }
}

if (!function_exists('getSubdomainUrl')) {
    /**
     * Get the full subdomain URL for a store
     *
     * @param string $slug Store slug/subdomain
     * @return string e.g. https://mystore.wusool.ps
     */
    function getSubdomainUrl($slug)
    {
        $baseDomain = parse_url(config('app.url'), PHP_URL_HOST) ?? 'wusool.ps';
        return "https://{$slug}.{$baseDomain}";
    }
}

if (!function_exists('getBaseDomain')) {
    /**
     * Get the base domain from APP_URL
     *
     * @return string e.g. wusool.ps
     */
    function getBaseDomain()
    {
        return parse_url(config('app.url'), PHP_URL_HOST) ?? 'wusool.ps';
    }
}

if (!function_exists('getSchemeAwareUrl')) {
    /**
     * Get the app URL with the correct protocol (HTTP/HTTPS).
     * Respects X-Forwarded-Proto header from proxies (LocalTunnel, ngrok, etc.)
     *
     * @return string e.g. https://eager-places-sniff.loca.lt
     */
    function getSchemeAwareUrl()
    {
        $request = request();
        if ($request) {
            return $request->getSchemeAndHttpHost();
        }
        return config('app.url', 'http://localhost');
    }
}

if (!function_exists('getSchemeAwareStorageUrl')) {
    /**
     * Get the full URL for a storage/public file, using the correct protocol.
     * Replaces all config('app.url') usages for storage URLs.
     *
     * @param string $path Relative path (e.g. 'images/logos/wusool.png')
     * @return string Full URL with correct scheme
     */
    function getSchemeAwareStorageUrl($path = '')
    {
        $baseUrl = rtrim(getSchemeAwareUrl(), '/');
        if ($path) {
            return $baseUrl . '/' . ltrim($path, '/');
        }
        return $baseUrl;
    }
}
