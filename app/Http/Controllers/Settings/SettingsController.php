<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\Notification;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\Currency;
use App\Models\PaymentSetting;
use App\Models\Webhook;

class SettingsController extends Controller
{
    /**
     * Display the main settings page.
     *
     * @return \Inertia\Response
     */
    public function index()
    {
        $user = auth()->user();

        // Platform-level page — SuperAdmin / System Owners only.
        if (!$user || (!$user->isSuperAdmin() && !$user->isAdmin())) {
            abort(403, 'This area is restricted to platform administrators.');
        }

        // Determine the correct user_id and store_id for settings
        if ($user->type === 'superadmin') {
            $settingsUserId = $user->id;
            $storeId = null;
        } elseif ($user->type === 'company') {
            $settingsUserId = $user->id;
            $storeId = getCurrentStoreId($user);
        } else {
            // For sub-users, get settings from their company (created_by)
            $settingsUserId = $user->created_by;
            $companyUser = \App\Models\User::find($user->created_by);
            $storeId = $companyUser ? getCurrentStoreId($companyUser) : null;
        }
        
        // Get system settings - store-specific for company users and sub-users
        if ($storeId) {
            // For company users and sub-users, get store-specific settings with fallback to global
            $systemSettings = Setting::getUserSettings($settingsUserId, $storeId);
            
            // If no store-specific settings exist, fall back to global settings
            if (empty($systemSettings)) {
                $globalSettings = settings();
                $systemSettings = $globalSettings;
            } else {
                // Merge with global settings for missing keys
                $globalSettings = settings();
                $systemSettings = array_merge($globalSettings, $systemSettings);
            }
        } else {
            // For superadmin, use global settings
            $systemSettings = settings();
        }
        
        $currencies = Currency::all();
        $paymentSettings = PaymentSetting::getUserSettings($settingsUserId, $storeId);

        // Mask sensitive payment credentials before sending to the frontend.
        $sensitivePaymentKeys = [
            'stripe_secret',
            'paypal_client_id',
            'paypal_secret_key',
            'razorpay_secret',
            'mercadopago_access_token',
            'paystack_secret_key',
            'flutterwave_secret_key',
            'paytabs_server_key',
            'skrill_secret_word',
            'coingate_api_token',
            'payfast_passphrase',
            'tap_secret_key',
            'xendit_api_key',
            'paytr_merchant_key',
            'mollie_api_key',
            'toyyibpay_secret_key',
            'benefit_secret_key',
            'iyzipay_secret_key',
            'midtrans_secret_key',
            'yookassa_secret_key',
            'nepalste_secret_key',
            'cinetpay_api_key',
            'cinetpay_secret_key',
            'payhere_merchant_secret',
            'payhere_app_secret',
            'fedapay_secret_key',
            'authorizenet_transaction_key',
            'khalti_secret_key',
            'easebuzz_merchant_key',
            'easebuzz_salt_key',
            'ozow_private_key',
            'ozow_api_key',
            'cashfree_secret_key',
            'telegram_bot_token',
            'jawwal_pay_api_key',
            'jawwal_pay_secret_key',
            'pal_pay_api_key',
            'pal_pay_secret_key',
            'zain_cash_api_key',
            'zain_cash_secret_key',
            'orange_money_api_key',
            'orange_money_secret_key',
            'cliq_api_key',
            'cliq_secret_key',
            'zain_cash_jo_api_key',
            'zain_cash_jo_secret_key',
            'orange_money_jo_api_key',
            'orange_money_jo_secret_key',
            'etihad_wallet_api_key',
            'etihad_wallet_secret_key',
            'dinar_pay_api_key',
            'dinar_pay_secret_key',
            'bank_palestine_api_key',
            'bank_palestine_secret_key',
            'al_quds_bank_api_key',
            'al_quds_bank_secret_key',
            'arab_islamic_bank_api_key',
            'arab_islamic_bank_secret_key',
            'cairo_amman_bank_api_key',
            'cairo_amman_bank_secret_key',
            'housing_bank_api_key',
            'housing_bank_secret_key',
            'safad_bank_api_key',
            'safad_bank_secret_key',
            'jordan_kuwait_bank_api_key',
            'jordan_kuwait_bank_secret_key',
            'arab_bank_api_key',
            'arab_bank_secret_key',
            'housing_bank_jo_api_key',
            'housing_bank_jo_secret_key',
            'cairo_amman_bank_jo_api_key',
            'cairo_amman_bank_jo_secret_key',
            'safad_bank_jo_api_key',
            'safad_bank_jo_secret_key',
            'usdt_trc20_api_key',
            'usdt_trc20_secret_key',
            'usdt_erc20_api_key',
            'usdt_erc20_secret_key',
            'usdt_bep20_api_key',
            'usdt_bep20_secret_key',
            'usdt_polygon_api_key',
            'usdt_polygon_secret_key',
            'usdt_solana_api_key',
            'usdt_solana_secret_key'
        ];

        $paymentSettingsForUi = $paymentSettings;
        foreach ($sensitivePaymentKeys as $sensitiveKey) {
            if (isset($paymentSettingsForUi[$sensitiveKey]) && $paymentSettingsForUi[$sensitiveKey] !== '') {
                $paymentSettingsForUi[$sensitiveKey] = '*************';
            }
        }

        $webhooks = Webhook::where('user_id', $settingsUserId)->get();
        $templates = Notification::all();

        // Mask sensitive Twilio credentials before sending to the frontend
        if (isset($systemSettings['twilio_token']) && $systemSettings['twilio_token'] !== '') {
            $systemSettings['twilio_token'] = '*************';
        }

        // Mask sensitive HotSMS credentials before sending to the frontend
        if (isset($systemSettings['hotsms_password']) && $systemSettings['hotsms_password'] !== '') {
            $systemSettings['hotsms_password'] = '*************';
        }
        
        // Get user's plan features for frontend feature gating
        $planFeatures = null;
        if ($user->type === 'company' && $user->plan) {
            $planFeatures = [
                'enable_chatgpt'        => $user->plan->enable_chatgpt === 'on',
                'enable_mobile_app'     => $user->plan->enable_mobile_app === 'on',
                'enable_sms'            => $user->plan->enable_sms === 'on',
                'enable_shipping_method'=> $user->plan->enable_shipping_method === 'on',
                'enable_custdomain'     => $user->plan->enable_custdomain === 'on',
                'enable_custsubdomain'  => $user->plan->enable_custsubdomain === 'on',
                'pwa_business'          => $user->plan->pwa_business === 'on',
                'enable_branding'       => $user->plan->enable_branding === 'on',
                'enable_accounting_integration' => $user->plan->enable_accounting_integration === 'on',
            ];
        }
        
        // Get messaging variables
        $orderVars = isset($paymentSettings['messaging_order_variables']) ? json_decode($paymentSettings['messaging_order_variables'], true) : [];
        $itemVars = isset($paymentSettings['messaging_item_variables']) ? json_decode($paymentSettings['messaging_item_variables'], true) : [];
        
        $messagingVariables = [
            'orderVariables' => $orderVars,
            'itemVariables' => $itemVars
        ];
        
        return Inertia::render('settings/index', [
            'systemSettings' => $systemSettings,
            'settings' => $systemSettings, // For helper functions
            'cacheSize' => getCacheSize(),
            'currencies' => $currencies,
            'timezones' => config('timezones'),
            'dateFormats' => config('dateformat'),
            'timeFormats' => config('timeformat'),
            'paymentSettings' => $paymentSettingsForUi,
            'messagingVariables' => $messagingVariables,
            'webhooks' => $webhooks,
            'availableModules' => Webhook::modules(),
            'templates' => $templates,
            'planFeatures' => $planFeatures,
        ]);
    }
}