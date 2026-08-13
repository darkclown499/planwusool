<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PaymentSettingController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        
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
        
        // Get payment settings for the current user and store.
        // Mask sensitive credential values before sending to the frontend
        // (the full decrypted values are only needed server-side; the UI
        // already supports masked display with the '************' pattern).
        $paymentSettings = getPaymentSettings($settingsUserId, $storeId);
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
            'paytr_merchant_secret',
            'mollie_api_key',
            'toyyibpay_secret_key',
            'benefit_secret_key',
            'iyzipay_secret_key',
            'aamarpay_signature',
            'midtrans_secret_key',
            'yookassa_secret_key',
            'nepalste_secret_key',
            'paiement_merchant_id',
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
        
        $orderVars = isset($paymentSettings['messaging_order_variables']) ? json_decode($paymentSettings['messaging_order_variables'], true) : [];
        $itemVars = isset($paymentSettings['messaging_item_variables']) ? json_decode($paymentSettings['messaging_item_variables'], true) : [];
        
        $messagingVariables = [
            'orderVariables' => $orderVars,
            'itemVariables' => $itemVars
        ];
        
        return Inertia::render('settings/index', [
            'paymentSettings' => $paymentSettingsForUi,
            'messagingVariables' => $messagingVariables,
        ]);
    }

    public function getPaymentMethods()
    {
        // Permission check: only users with manage-settings or manage-payments permission can access
        $user = auth()->user();
        if (!$user || (!$user->hasPermissionTo('manage-settings') && !$user->hasPermissionTo('manage-payments'))) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Always use superadmin settings for plan subscriptions
        $superAdminId = \App\Models\User::where('type', 'superadmin')->first()?->id;
        if (!$superAdminId) {
            return response()->json([]);
        }
        
        $paymentSettings = getPaymentSettings($superAdminId);
        
        // Add superadmin settings for plan subscriptions
        $settings = settings($superAdminId);
        $paymentSettings['defaultCurrency'] = $settings['defaultCurrency'] ?? 'usd';
        $paymentSettings['titleText'] = $settings['titleText'] ?? 'Wusool';
        
        // Add demo mode flag for frontend handling
        $paymentSettings['is_demo'] = config('app.is_demo', false);
        $paymentSettings['user_type'] = auth()->user()?->type;

        // Filter sensitive keys before sending to frontend
        $paymentSettings = filterSensitiveSettings($paymentSettings);

        return response()->json($paymentSettings);
    }
    public function store(Request $request)
    {
        $user = auth()->user();
        
        // Permission check
        if (!$user->hasPermissionTo('manage-settings')) {
            return back()->withErrors(['error' => 'You do not have permission to update payment settings.']);
        }
        
        try {
            $validatedData = $request->validate([
                'stripe_key' => 'nullable|string',
                'stripe_secret' => 'nullable|string',
                'paypal_client_id' => 'nullable|string',
                'paypal_secret_key' => 'nullable|string',
                'paypal_mode' => 'in:sandbox,live',
                'bank_detail' => 'nullable|string',
                'razorpay_key' => 'nullable|string',
                'razorpay_secret' => 'nullable|string',
                'mercadopago_mode' => 'in:sandbox,live',
                'mercadopago_access_token' => 'nullable|string',
                'paystack_public_key' => 'nullable|string',
                'paystack_secret_key' => 'nullable|string',
                'flutterwave_public_key' => 'nullable|string',
                'flutterwave_secret_key' => 'nullable|string',
                'paytabs_profile_id' => 'nullable|string',
                'paytabs_server_key' => 'nullable|string',
                'paytabs_region' => 'nullable|string',
                'paytabs_mode' => 'in:sandbox,live',
                'skrill_merchant_id' => 'nullable|string',
                'skrill_secret_word' => 'nullable|string',
                'coingate_api_token' => 'nullable|string',
                'coingate_mode' => 'in:sandbox,live',
                'payfast_merchant_id' => 'nullable|string',
                'payfast_merchant_key' => 'nullable|string',
                'payfast_passphrase' => 'nullable|string',
                'payfast_mode' => 'in:sandbox,live',
                'tap_secret_key' => 'nullable|string',
                'xendit_api_key' => 'nullable|string',
                'paytr_merchant_id' => 'nullable|string',
                'paytr_merchant_key' => 'nullable|string',
                'paytr_merchant_salt' => 'nullable|string',
                'mollie_api_key' => 'nullable|string',
                'toyyibpay_category_code' => 'nullable|string',
                'toyyibpay_secret_key' => 'nullable|string',
                'toyyibpay_mode' => 'in:sandbox,live',
                'benefit_mode' => 'in:sandbox,live',
                'benefit_secret_key' => 'nullable|string',
                'benefit_public_key' => 'nullable|string',
                'iyzipay_mode' => 'in:sandbox,live',
                'iyzipay_secret_key' => 'nullable|string',
                'iyzipay_public_key' => 'nullable|string',
                'aamarpay_store_id' => 'nullable|string',
                'aamarpay_signature' => 'nullable|string',
                'midtrans_mode' => 'in:sandbox,live',
                'midtrans_secret_key' => 'nullable|string',
                'yookassa_shop_id' => 'nullable|string',
                'yookassa_secret_key' => 'nullable|string',
                'nepalste_mode' => 'in:sandbox,live',
                'nepalste_secret_key' => 'nullable|string',
                'nepalste_public_key' => 'nullable|string',
                'paiement_merchant_id' => 'nullable|string',
                'cinetpay_site_id' => 'nullable|string',
                'cinetpay_api_key' => 'nullable|string',
                'cinetpay_secret_key' => 'nullable|string',
                'payhere_mode' => 'in:sandbox,live',
                'payhere_merchant_id' => 'nullable|string',
                'payhere_merchant_secret' => 'nullable|string',
                'payhere_app_id' => 'nullable|string',
                'payhere_app_secret' => 'nullable|string',
                'fedapay_mode' => 'in:sandbox,live',
                'fedapay_secret_key' => 'nullable|string',
                'fedapay_public_key' => 'nullable|string',
                'authorizenet_mode' => 'in:sandbox,live',
                'authorizenet_merchant_id' => 'nullable|string',
                'authorizenet_transaction_key' => 'nullable|string',
                'khalti_secret_key' => 'nullable|string',
                'khalti_public_key' => 'nullable|string',
                'easebuzz_merchant_key' => 'nullable|string',
                'easebuzz_salt_key' => 'nullable|string',
                'easebuzz_environment' => 'nullable|string',
                'ozow_mode' => 'in:sandbox,live',
                'ozow_site_key' => 'nullable|string',
                'ozow_private_key' => 'nullable|string',
                'ozow_api_key' => 'nullable|string',
                'cashfree_mode' => 'in:sandbox,live',
                'cashfree_secret_key' => 'nullable|string',
                'cashfree_public_key' => 'nullable|string',
                'telegram_bot_token' => 'nullable|string',
                'telegram_chat_id' => 'nullable|string',
                'whatsapp_number' => 'nullable|string',
                'messaging_message_template' => 'nullable|string',
                'messaging_item_template' => 'nullable|string',
                'jawwal_pay_mode' => 'in:offline,api',
                'jawwal_pay_phone_number' => 'nullable|string',
                'jawwal_pay_merchant_name' => 'nullable|string',
                'jawwal_pay_instructions' => 'nullable|string',
                'jawwal_pay_api_key' => 'nullable|string',
                'jawwal_pay_secret_key' => 'nullable|string',
                'jawwal_pay_merchant_id' => 'nullable|string',
                'pal_pay_mode' => 'in:offline,api',
                'pal_pay_phone_number' => 'nullable|string',
                'pal_pay_merchant_name' => 'nullable|string',
                'pal_pay_instructions' => 'nullable|string',
                'pal_pay_api_key' => 'nullable|string',
                'pal_pay_secret_key' => 'nullable|string',
                'pal_pay_merchant_id' => 'nullable|string',
                'zain_cash_mode' => 'in:offline,api',
                'zain_cash_phone_number' => 'nullable|string',
                'zain_cash_merchant_name' => 'nullable|string',
                'zain_cash_instructions' => 'nullable|string',
                'zain_cash_api_key' => 'nullable|string',
                'zain_cash_secret_key' => 'nullable|string',
                'zain_cash_merchant_id' => 'nullable|string',
                'orange_money_mode' => 'in:offline,api',
                'orange_money_phone_number' => 'nullable|string',
                'orange_money_merchant_name' => 'nullable|string',
                'orange_money_instructions' => 'nullable|string',
                'orange_money_api_key' => 'nullable|string',
                'orange_money_secret_key' => 'nullable|string',
                'orange_money_merchant_id' => 'nullable|string',
                'cliq_mode' => 'in:offline,api',
                'cliq_phone_number' => 'nullable|string',
                'cliq_merchant_name' => 'nullable|string',
                'cliq_instructions' => 'nullable|string',
                'cliq_api_key' => 'nullable|string',
                'cliq_secret_key' => 'nullable|string',
                'cliq_merchant_id' => 'nullable|string',
                'zain_cash_jo_mode' => 'in:offline,api',
                'zain_cash_jo_phone_number' => 'nullable|string',
                'zain_cash_jo_merchant_name' => 'nullable|string',
                'zain_cash_jo_instructions' => 'nullable|string',
                'zain_cash_jo_api_key' => 'nullable|string',
                'zain_cash_jo_secret_key' => 'nullable|string',
                'zain_cash_jo_merchant_id' => 'nullable|string',
                'orange_money_jo_mode' => 'in:offline,api',
                'orange_money_jo_phone_number' => 'nullable|string',
                'orange_money_jo_merchant_name' => 'nullable|string',
                'orange_money_jo_instructions' => 'nullable|string',
                'orange_money_jo_api_key' => 'nullable|string',
                'orange_money_jo_secret_key' => 'nullable|string',
                'orange_money_jo_merchant_id' => 'nullable|string',
                'etihad_wallet_mode' => 'in:offline,api',
                'etihad_wallet_phone_number' => 'nullable|string',
                'etihad_wallet_merchant_name' => 'nullable|string',
                'etihad_wallet_instructions' => 'nullable|string',
                'etihad_wallet_api_key' => 'nullable|string',
                'etihad_wallet_secret_key' => 'nullable|string',
                'etihad_wallet_merchant_id' => 'nullable|string',
                'dinar_pay_mode' => 'in:offline,api',
                'dinar_pay_phone_number' => 'nullable|string',
                'dinar_pay_merchant_name' => 'nullable|string',
                'dinar_pay_instructions' => 'nullable|string',
                'dinar_pay_api_key' => 'nullable|string',
                'dinar_pay_secret_key' => 'nullable|string',
                'dinar_pay_merchant_id' => 'nullable|string',
                'bank_palestine_mode' => 'in:offline,api',
                'bank_palestine_phone_number' => 'nullable|string',
                'bank_palestine_merchant_name' => 'nullable|string',
                'bank_palestine_instructions' => 'nullable|string',
                'bank_palestine_api_key' => 'nullable|string',
                'bank_palestine_secret_key' => 'nullable|string',
                'bank_palestine_merchant_id' => 'nullable|string',
                'al_quds_bank_mode' => 'in:offline,api',
                'al_quds_bank_phone_number' => 'nullable|string',
                'al_quds_bank_merchant_name' => 'nullable|string',
                'al_quds_bank_instructions' => 'nullable|string',
                'al_quds_bank_api_key' => 'nullable|string',
                'al_quds_bank_secret_key' => 'nullable|string',
                'al_quds_bank_merchant_id' => 'nullable|string',
                'arab_islamic_bank_mode' => 'in:offline,api',
                'arab_islamic_bank_phone_number' => 'nullable|string',
                'arab_islamic_bank_merchant_name' => 'nullable|string',
                'arab_islamic_bank_instructions' => 'nullable|string',
                'arab_islamic_bank_api_key' => 'nullable|string',
                'arab_islamic_bank_secret_key' => 'nullable|string',
                'arab_islamic_bank_merchant_id' => 'nullable|string',
                'cairo_amman_bank_mode' => 'in:offline,api',
                'cairo_amman_bank_phone_number' => 'nullable|string',
                'cairo_amman_bank_merchant_name' => 'nullable|string',
                'cairo_amman_bank_instructions' => 'nullable|string',
                'cairo_amman_bank_api_key' => 'nullable|string',
                'cairo_amman_bank_secret_key' => 'nullable|string',
                'cairo_amman_bank_merchant_id' => 'nullable|string',
                'housing_bank_mode' => 'in:offline,api',
                'housing_bank_phone_number' => 'nullable|string',
                'housing_bank_merchant_name' => 'nullable|string',
                'housing_bank_instructions' => 'nullable|string',
                'housing_bank_api_key' => 'nullable|string',
                'housing_bank_secret_key' => 'nullable|string',
                'housing_bank_merchant_id' => 'nullable|string',
                'safad_bank_mode' => 'in:offline,api',
                'safad_bank_phone_number' => 'nullable|string',
                'safad_bank_merchant_name' => 'nullable|string',
                'safad_bank_instructions' => 'nullable|string',
                'safad_bank_api_key' => 'nullable|string',
                'safad_bank_secret_key' => 'nullable|string',
                'safad_bank_merchant_id' => 'nullable|string',
                'jordan_kuwait_bank_mode' => 'in:offline,api',
                'jordan_kuwait_bank_phone_number' => 'nullable|string',
                'jordan_kuwait_bank_merchant_name' => 'nullable|string',
                'jordan_kuwait_bank_instructions' => 'nullable|string',
                'jordan_kuwait_bank_api_key' => 'nullable|string',
                'jordan_kuwait_bank_secret_key' => 'nullable|string',
                'jordan_kuwait_bank_merchant_id' => 'nullable|string',
                'arab_bank_mode' => 'in:offline,api',
                'arab_bank_phone_number' => 'nullable|string',
                'arab_bank_merchant_name' => 'nullable|string',
                'arab_bank_instructions' => 'nullable|string',
                'arab_bank_api_key' => 'nullable|string',
                'arab_bank_secret_key' => 'nullable|string',
                'arab_bank_merchant_id' => 'nullable|string',
                'housing_bank_jo_mode' => 'in:offline,api',
                'housing_bank_jo_phone_number' => 'nullable|string',
                'housing_bank_jo_merchant_name' => 'nullable|string',
                'housing_bank_jo_instructions' => 'nullable|string',
                'housing_bank_jo_api_key' => 'nullable|string',
                'housing_bank_jo_secret_key' => 'nullable|string',
                'housing_bank_jo_merchant_id' => 'nullable|string',
                'cairo_amman_bank_jo_mode' => 'in:offline,api',
                'cairo_amman_bank_jo_phone_number' => 'nullable|string',
                'cairo_amman_bank_jo_merchant_name' => 'nullable|string',
                'cairo_amman_bank_jo_instructions' => 'nullable|string',
                'cairo_amman_bank_jo_api_key' => 'nullable|string',
                'cairo_amman_bank_jo_secret_key' => 'nullable|string',
                'cairo_amman_bank_jo_merchant_id' => 'nullable|string',
                'safad_bank_jo_mode' => 'in:offline,api',
                'safad_bank_jo_phone_number' => 'nullable|string',
                'safad_bank_jo_merchant_name' => 'nullable|string',
                'safad_bank_jo_instructions' => 'nullable|string',
                'safad_bank_jo_api_key' => 'nullable|string',
                'safad_bank_jo_secret_key' => 'nullable|string',
                'safad_bank_jo_merchant_id' => 'nullable|string',
                'usdt_trc20_mode' => 'in:offline,api',
                'usdt_trc20_wallet_address' => 'nullable|string',
                'usdt_trc20_network' => 'nullable|string',
                'usdt_trc20_memo' => 'nullable|string',
                'usdt_trc20_api_key' => 'nullable|string',
                'usdt_trc20_secret_key' => 'nullable|string',
                'usdt_trc20_merchant_id' => 'nullable|string',
                'usdt_erc20_mode' => 'in:offline,api',
                'usdt_erc20_wallet_address' => 'nullable|string',
                'usdt_erc20_network' => 'nullable|string',
                'usdt_erc20_memo' => 'nullable|string',
                'usdt_erc20_api_key' => 'nullable|string',
                'usdt_erc20_secret_key' => 'nullable|string',
                'usdt_erc20_merchant_id' => 'nullable|string',
                'usdt_bep20_mode' => 'in:offline,api',
                'usdt_bep20_wallet_address' => 'nullable|string',
                'usdt_bep20_network' => 'nullable|string',
                'usdt_bep20_memo' => 'nullable|string',
                'usdt_bep20_api_key' => 'nullable|string',
                'usdt_bep20_secret_key' => 'nullable|string',
                'usdt_bep20_merchant_id' => 'nullable|string',
                'usdt_polygon_mode' => 'in:offline,api',
                'usdt_polygon_wallet_address' => 'nullable|string',
                'usdt_polygon_network' => 'nullable|string',
                'usdt_polygon_memo' => 'nullable|string',
                'usdt_polygon_api_key' => 'nullable|string',
                'usdt_polygon_secret_key' => 'nullable|string',
                'usdt_polygon_merchant_id' => 'nullable|string',
                'usdt_solana_mode' => 'in:offline,api',
                'usdt_solana_wallet_address' => 'nullable|string',
                'usdt_solana_network' => 'nullable|string',
                'usdt_solana_memo' => 'nullable|string',
                'usdt_solana_api_key' => 'nullable|string',
                'usdt_solana_secret_key' => 'nullable|string',
                'usdt_solana_merchant_id' => 'nullable|string',
            ]);

            $settings = $this->preparePaymentSettings($request, $validatedData);
            $this->validateEnabledPaymentMethods($request, $validatedData);
            $this->savePaymentSettings($settings);

            return back()->with('success', __('Payment settings saved successfully.'));
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors());
        } catch (\Exception $e) {
            \Log::error('Payment settings save error: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to save payment settings: ' . $e->getMessage()]);
        }
    }

    private function preparePaymentSettings(Request $request, array $validatedData): array
    {
        // Handle masked values in demo mode
        if (config('app.is_demo', false)) {
            $validatedData = $this->handleMaskedValues($validatedData);
        }
        
        return [
            'is_manually_enabled' => $request->boolean('is_manually_enabled'),
            'is_cod_enabled' => $request->boolean('is_cod_enabled'),
            'is_bank_enabled' => $request->boolean('is_bank_enabled'),
            'is_stripe_enabled' => $request->boolean('is_stripe_enabled'),
            'is_paypal_enabled' => $request->boolean('is_paypal_enabled'),
            'is_razorpay_enabled' => $request->boolean('is_razorpay_enabled'),
            'is_mercadopago_enabled' => $request->boolean('is_mercadopago_enabled'),
            'is_paystack_enabled' => $request->boolean('is_paystack_enabled'),
            'is_flutterwave_enabled' => $request->boolean('is_flutterwave_enabled'),
            'is_paytabs_enabled' => $request->boolean('is_paytabs_enabled'),
            'is_skrill_enabled' => $request->boolean('is_skrill_enabled'),
            'is_coingate_enabled' => $request->boolean('is_coingate_enabled'),
            'is_payfast_enabled' => $request->boolean('is_payfast_enabled'),
            'is_tap_enabled' => $request->boolean('is_tap_enabled'),
            'is_xendit_enabled' => $request->boolean('is_xendit_enabled'),
            'is_paytr_enabled' => $request->boolean('is_paytr_enabled'),
            'is_mollie_enabled' => $request->boolean('is_mollie_enabled'),
            'is_toyyibpay_enabled' => $request->boolean('is_toyyibpay_enabled'),
            'is_benefit_enabled' => $request->boolean('is_benefit_enabled'),
            'is_iyzipay_enabled' => $request->boolean('is_iyzipay_enabled'),
            'is_aamarpay_enabled' => $request->boolean('is_aamarpay_enabled'),
            'is_midtrans_enabled' => $request->boolean('is_midtrans_enabled'),
            'is_yookassa_enabled' => $request->boolean('is_yookassa_enabled'),
            'is_nepalste_enabled' => $request->boolean('is_nepalste_enabled'),
            'is_paiement_enabled' => $request->boolean('is_paiement_enabled'),
            'is_cinetpay_enabled' => $request->boolean('is_cinetpay_enabled'),
            'is_payhere_enabled' => $request->boolean('is_payhere_enabled'),
            'is_fedapay_enabled' => $request->boolean('is_fedapay_enabled'),
            'is_authorizenet_enabled' => $request->boolean('is_authorizenet_enabled'),
            'is_khalti_enabled' => $request->boolean('is_khalti_enabled'),
            'is_easebuzz_enabled' => $request->boolean('is_easebuzz_enabled'),
            'is_ozow_enabled' => $request->boolean('is_ozow_enabled'),
            'is_cashfree_enabled' => $request->boolean('is_cashfree_enabled'),
            'paypal_mode' => $validatedData['paypal_mode'] ?? 'sandbox',
            'mercadopago_mode' => $validatedData['mercadopago_mode'] ?? 'sandbox',
            'bank_detail' => $validatedData['bank_detail'],
            'stripe_key' => $validatedData['stripe_key'],
            'stripe_secret' => $validatedData['stripe_secret'],
            'paypal_client_id' => $validatedData['paypal_client_id'],
            'paypal_secret_key' => $validatedData['paypal_secret_key'],
            'razorpay_key' => $validatedData['razorpay_key'],
            'razorpay_secret' => $validatedData['razorpay_secret'],
            'mercadopago_access_token' => $validatedData['mercadopago_access_token'],
            'paystack_public_key' => $validatedData['paystack_public_key'],
            'paystack_secret_key' => $validatedData['paystack_secret_key'],
            'flutterwave_public_key' => $validatedData['flutterwave_public_key'],
            'flutterwave_secret_key' => $validatedData['flutterwave_secret_key'],
            'paytabs_profile_id' => $validatedData['paytabs_profile_id'],
            'paytabs_server_key' => $validatedData['paytabs_server_key'],
            'paytabs_region' => $validatedData['paytabs_region'],
            'paytabs_mode' => $validatedData['paytabs_mode'] ?? 'sandbox',
            'skrill_merchant_id' => $validatedData['skrill_merchant_id'],
            'skrill_secret_word' => $validatedData['skrill_secret_word'],
            'coingate_api_token' => $validatedData['coingate_api_token'],
            'coingate_mode' => $validatedData['coingate_mode'] ?? 'sandbox',
            'payfast_merchant_id' => $validatedData['payfast_merchant_id'],
            'payfast_merchant_key' => $validatedData['payfast_merchant_key'],
            'payfast_passphrase' => $validatedData['payfast_passphrase'],
            'payfast_mode' => $validatedData['payfast_mode'] ?? 'sandbox',
            'tap_secret_key' => $validatedData['tap_secret_key'],
            'xendit_api_key' => $validatedData['xendit_api_key'],
            'paytr_merchant_id' => $validatedData['paytr_merchant_id'],
            'paytr_merchant_key' => $validatedData['paytr_merchant_key'],
            'paytr_merchant_salt' => $validatedData['paytr_merchant_salt'],
            'mollie_api_key' => $validatedData['mollie_api_key'],
            'toyyibpay_category_code' => $validatedData['toyyibpay_category_code'],
            'toyyibpay_secret_key' => $validatedData['toyyibpay_secret_key'],
            'toyyibpay_mode' => $validatedData['toyyibpay_mode'] ?? 'sandbox',
            'benefit_mode' => $validatedData['benefit_mode'] ?? 'sandbox',
            'benefit_secret_key' => $validatedData['benefit_secret_key'],
            'benefit_public_key' => $validatedData['benefit_public_key'],
            'iyzipay_mode' => $validatedData['iyzipay_mode'] ?? 'sandbox',
            'iyzipay_secret_key' => $validatedData['iyzipay_secret_key'],
            'iyzipay_public_key' => $validatedData['iyzipay_public_key'],
            'aamarpay_store_id' => $validatedData['aamarpay_store_id'],
            'aamarpay_signature' => $validatedData['aamarpay_signature'],
            'midtrans_mode' => $validatedData['midtrans_mode'] ?? 'sandbox',
            'midtrans_secret_key' => $validatedData['midtrans_secret_key'],
            'yookassa_shop_id' => $validatedData['yookassa_shop_id'],
            'yookassa_secret_key' => $validatedData['yookassa_secret_key'],
            'nepalste_mode' => $validatedData['nepalste_mode'] ?? 'sandbox',
            'nepalste_secret_key' => $validatedData['nepalste_secret_key'],
            'nepalste_public_key' => $validatedData['nepalste_public_key'],
            'paiement_merchant_id' => $validatedData['paiement_merchant_id'],
            'cinetpay_site_id' => $validatedData['cinetpay_site_id'],
            'cinetpay_api_key' => $validatedData['cinetpay_api_key'],
            'cinetpay_secret_key' => $validatedData['cinetpay_secret_key'],
            'payhere_mode' => $validatedData['payhere_mode'] ?? 'sandbox',
            'payhere_merchant_id' => $validatedData['payhere_merchant_id'],
            'payhere_merchant_secret' => $validatedData['payhere_merchant_secret'],
            'payhere_app_id' => $validatedData['payhere_app_id'],
            'payhere_app_secret' => $validatedData['payhere_app_secret'],
            'fedapay_mode' => $validatedData['fedapay_mode'] ?? 'sandbox',
            'fedapay_secret_key' => $validatedData['fedapay_secret_key'],
            'fedapay_public_key' => $validatedData['fedapay_public_key'],
            'authorizenet_mode' => $validatedData['authorizenet_mode'] ?? 'sandbox',
            'authorizenet_merchant_id' => $validatedData['authorizenet_merchant_id'],
            'authorizenet_transaction_key' => $validatedData['authorizenet_transaction_key'],
            'khalti_secret_key' => $validatedData['khalti_secret_key'],
            'khalti_public_key' => $validatedData['khalti_public_key'],
            'easebuzz_merchant_key' => $validatedData['easebuzz_merchant_key'],
            'easebuzz_salt_key' => $validatedData['easebuzz_salt_key'],
            'easebuzz_environment' => $validatedData['easebuzz_environment'],
            'ozow_mode' => $validatedData['ozow_mode'] ?? 'sandbox',
            'ozow_site_key' => $validatedData['ozow_site_key'],
            'ozow_private_key' => $validatedData['ozow_private_key'],
            'ozow_api_key' => $validatedData['ozow_api_key'],
            'cashfree_mode' => $validatedData['cashfree_mode'] ?? 'sandbox',
            'cashfree_secret_key' => $validatedData['cashfree_secret_key'],
            'cashfree_public_key' => $validatedData['cashfree_public_key'],
            'is_telegram_enabled' => $request->boolean('is_telegram_enabled'),
            'telegram_bot_token' => $validatedData['telegram_bot_token'],
            'telegram_chat_id' => $validatedData['telegram_chat_id'],
            'is_whatsapp_enabled' => $request->boolean('is_whatsapp_enabled'),
            'whatsapp_number' => $validatedData['whatsapp_number'],
            'messaging_message_template' => $validatedData['messaging_message_template'],
            'messaging_item_template' => $validatedData['messaging_item_template'],
            'is_jawwal_pay_enabled' => $request->boolean('is_jawwal_pay_enabled'),
            'jawwal_pay_mode' => $validatedData['jawwal_pay_mode'] ?? 'offline',
            'jawwal_pay_phone_number' => $validatedData['jawwal_pay_phone_number'],
            'jawwal_pay_merchant_name' => $validatedData['jawwal_pay_merchant_name'],
            'jawwal_pay_instructions' => $validatedData['jawwal_pay_instructions'],
            'jawwal_pay_api_key' => $validatedData['jawwal_pay_api_key'],
            'jawwal_pay_secret_key' => $validatedData['jawwal_pay_secret_key'],
            'jawwal_pay_merchant_id' => $validatedData['jawwal_pay_merchant_id'],
            'is_pal_pay_enabled' => $request->boolean('is_pal_pay_enabled'),
            'pal_pay_mode' => $validatedData['pal_pay_mode'] ?? 'offline',
            'pal_pay_phone_number' => $validatedData['pal_pay_phone_number'],
            'pal_pay_merchant_name' => $validatedData['pal_pay_merchant_name'],
            'pal_pay_instructions' => $validatedData['pal_pay_instructions'],
            'pal_pay_api_key' => $validatedData['pal_pay_api_key'],
            'pal_pay_secret_key' => $validatedData['pal_pay_secret_key'],
            'pal_pay_merchant_id' => $validatedData['pal_pay_merchant_id'],
            'is_zain_cash_enabled' => $request->boolean('is_zain_cash_enabled'),
            'zain_cash_mode' => $validatedData['zain_cash_mode'] ?? 'offline',
            'zain_cash_phone_number' => $validatedData['zain_cash_phone_number'],
            'zain_cash_merchant_name' => $validatedData['zain_cash_merchant_name'],
            'zain_cash_instructions' => $validatedData['zain_cash_instructions'],
            'zain_cash_api_key' => $validatedData['zain_cash_api_key'],
            'zain_cash_secret_key' => $validatedData['zain_cash_secret_key'],
            'zain_cash_merchant_id' => $validatedData['zain_cash_merchant_id'],
            'is_orange_money_enabled' => $request->boolean('is_orange_money_enabled'),
            'orange_money_mode' => $validatedData['orange_money_mode'] ?? 'offline',
            'orange_money_phone_number' => $validatedData['orange_money_phone_number'],
            'orange_money_merchant_name' => $validatedData['orange_money_merchant_name'],
            'orange_money_instructions' => $validatedData['orange_money_instructions'],
            'orange_money_api_key' => $validatedData['orange_money_api_key'],
            'orange_money_secret_key' => $validatedData['orange_money_secret_key'],
            'orange_money_merchant_id' => $validatedData['orange_money_merchant_id'],
            'is_cliq_enabled' => $request->boolean('is_cliq_enabled'),
            'cliq_mode' => $validatedData['cliq_mode'] ?? 'offline',
            'cliq_phone_number' => $validatedData['cliq_phone_number'],
            'cliq_merchant_name' => $validatedData['cliq_merchant_name'],
            'cliq_instructions' => $validatedData['cliq_instructions'],
            'cliq_api_key' => $validatedData['cliq_api_key'],
            'cliq_secret_key' => $validatedData['cliq_secret_key'],
            'cliq_merchant_id' => $validatedData['cliq_merchant_id'],
            'is_zain_cash_jo_enabled' => $request->boolean('is_zain_cash_jo_enabled'),
            'zain_cash_jo_mode' => $validatedData['zain_cash_jo_mode'] ?? 'offline',
            'zain_cash_jo_phone_number' => $validatedData['zain_cash_jo_phone_number'],
            'zain_cash_jo_merchant_name' => $validatedData['zain_cash_jo_merchant_name'],
            'zain_cash_jo_instructions' => $validatedData['zain_cash_jo_instructions'],
            'zain_cash_jo_api_key' => $validatedData['zain_cash_jo_api_key'],
            'zain_cash_jo_secret_key' => $validatedData['zain_cash_jo_secret_key'],
            'zain_cash_jo_merchant_id' => $validatedData['zain_cash_jo_merchant_id'],
            'is_orange_money_jo_enabled' => $request->boolean('is_orange_money_jo_enabled'),
            'orange_money_jo_mode' => $validatedData['orange_money_jo_mode'] ?? 'offline',
            'orange_money_jo_phone_number' => $validatedData['orange_money_jo_phone_number'],
            'orange_money_jo_merchant_name' => $validatedData['orange_money_jo_merchant_name'],
            'orange_money_jo_instructions' => $validatedData['orange_money_jo_instructions'],
            'orange_money_jo_api_key' => $validatedData['orange_money_jo_api_key'],
            'orange_money_jo_secret_key' => $validatedData['orange_money_jo_secret_key'],
            'orange_money_jo_merchant_id' => $validatedData['orange_money_jo_merchant_id'],
            'is_etihad_wallet_enabled' => $request->boolean('is_etihad_wallet_enabled'),
            'etihad_wallet_mode' => $validatedData['etihad_wallet_mode'] ?? 'offline',
            'etihad_wallet_phone_number' => $validatedData['etihad_wallet_phone_number'],
            'etihad_wallet_merchant_name' => $validatedData['etihad_wallet_merchant_name'],
            'etihad_wallet_instructions' => $validatedData['etihad_wallet_instructions'],
            'etihad_wallet_api_key' => $validatedData['etihad_wallet_api_key'],
            'etihad_wallet_secret_key' => $validatedData['etihad_wallet_secret_key'],
            'etihad_wallet_merchant_id' => $validatedData['etihad_wallet_merchant_id'],
            'is_dinar_pay_enabled' => $request->boolean('is_dinar_pay_enabled'),
            'dinar_pay_mode' => $validatedData['dinar_pay_mode'] ?? 'offline',
            'dinar_pay_phone_number' => $validatedData['dinar_pay_phone_number'],
            'dinar_pay_merchant_name' => $validatedData['dinar_pay_merchant_name'],
            'dinar_pay_instructions' => $validatedData['dinar_pay_instructions'],
            'dinar_pay_api_key' => $validatedData['dinar_pay_api_key'],
            'dinar_pay_secret_key' => $validatedData['dinar_pay_secret_key'],
            'dinar_pay_merchant_id' => $validatedData['dinar_pay_merchant_id'],
            'is_bank_palestine_enabled' => $request->boolean('is_bank_palestine_enabled'),
            'bank_palestine_mode' => $validatedData['bank_palestine_mode'] ?? 'offline',
            'bank_palestine_phone_number' => $validatedData['bank_palestine_phone_number'],
            'bank_palestine_merchant_name' => $validatedData['bank_palestine_merchant_name'],
            'bank_palestine_instructions' => $validatedData['bank_palestine_instructions'],
            'bank_palestine_api_key' => $validatedData['bank_palestine_api_key'],
            'bank_palestine_secret_key' => $validatedData['bank_palestine_secret_key'],
            'bank_palestine_merchant_id' => $validatedData['bank_palestine_merchant_id'],
            'is_al_quds_bank_enabled' => $request->boolean('is_al_quds_bank_enabled'),
            'al_quds_bank_mode' => $validatedData['al_quds_bank_mode'] ?? 'offline',
            'al_quds_bank_phone_number' => $validatedData['al_quds_bank_phone_number'],
            'al_quds_bank_merchant_name' => $validatedData['al_quds_bank_merchant_name'],
            'al_quds_bank_instructions' => $validatedData['al_quds_bank_instructions'],
            'al_quds_bank_api_key' => $validatedData['al_quds_bank_api_key'],
            'al_quds_bank_secret_key' => $validatedData['al_quds_bank_secret_key'],
            'al_quds_bank_merchant_id' => $validatedData['al_quds_bank_merchant_id'],
            'is_arab_islamic_bank_enabled' => $request->boolean('is_arab_islamic_bank_enabled'),
            'arab_islamic_bank_mode' => $validatedData['arab_islamic_bank_mode'] ?? 'offline',
            'arab_islamic_bank_phone_number' => $validatedData['arab_islamic_bank_phone_number'],
            'arab_islamic_bank_merchant_name' => $validatedData['arab_islamic_bank_merchant_name'],
            'arab_islamic_bank_instructions' => $validatedData['arab_islamic_bank_instructions'],
            'arab_islamic_bank_api_key' => $validatedData['arab_islamic_bank_api_key'],
            'arab_islamic_bank_secret_key' => $validatedData['arab_islamic_bank_secret_key'],
            'arab_islamic_bank_merchant_id' => $validatedData['arab_islamic_bank_merchant_id'],
            'is_cairo_amman_bank_enabled' => $request->boolean('is_cairo_amman_bank_enabled'),
            'cairo_amman_bank_mode' => $validatedData['cairo_amman_bank_mode'] ?? 'offline',
            'cairo_amman_bank_phone_number' => $validatedData['cairo_amman_bank_phone_number'],
            'cairo_amman_bank_merchant_name' => $validatedData['cairo_amman_bank_merchant_name'],
            'cairo_amman_bank_instructions' => $validatedData['cairo_amman_bank_instructions'],
            'cairo_amman_bank_api_key' => $validatedData['cairo_amman_bank_api_key'],
            'cairo_amman_bank_secret_key' => $validatedData['cairo_amman_bank_secret_key'],
            'cairo_amman_bank_merchant_id' => $validatedData['cairo_amman_bank_merchant_id'],
            'is_housing_bank_enabled' => $request->boolean('is_housing_bank_enabled'),
            'housing_bank_mode' => $validatedData['housing_bank_mode'] ?? 'offline',
            'housing_bank_phone_number' => $validatedData['housing_bank_phone_number'],
            'housing_bank_merchant_name' => $validatedData['housing_bank_merchant_name'],
            'housing_bank_instructions' => $validatedData['housing_bank_instructions'],
            'housing_bank_api_key' => $validatedData['housing_bank_api_key'],
            'housing_bank_secret_key' => $validatedData['housing_bank_secret_key'],
            'housing_bank_merchant_id' => $validatedData['housing_bank_merchant_id'],
            'is_safad_bank_enabled' => $request->boolean('is_safad_bank_enabled'),
            'safad_bank_mode' => $validatedData['safad_bank_mode'] ?? 'offline',
            'safad_bank_phone_number' => $validatedData['safad_bank_phone_number'],
            'safad_bank_merchant_name' => $validatedData['safad_bank_merchant_name'],
            'safad_bank_instructions' => $validatedData['safad_bank_instructions'],
            'safad_bank_api_key' => $validatedData['safad_bank_api_key'],
            'safad_bank_secret_key' => $validatedData['safad_bank_secret_key'],
            'safad_bank_merchant_id' => $validatedData['safad_bank_merchant_id'],
            'is_jordan_kuwait_bank_enabled' => $request->boolean('is_jordan_kuwait_bank_enabled'),
            'jordan_kuwait_bank_mode' => $validatedData['jordan_kuwait_bank_mode'] ?? 'offline',
            'jordan_kuwait_bank_phone_number' => $validatedData['jordan_kuwait_bank_phone_number'],
            'jordan_kuwait_bank_merchant_name' => $validatedData['jordan_kuwait_bank_merchant_name'],
            'jordan_kuwait_bank_instructions' => $validatedData['jordan_kuwait_bank_instructions'],
            'jordan_kuwait_bank_api_key' => $validatedData['jordan_kuwait_bank_api_key'],
            'jordan_kuwait_bank_secret_key' => $validatedData['jordan_kuwait_bank_secret_key'],
            'jordan_kuwait_bank_merchant_id' => $validatedData['jordan_kuwait_bank_merchant_id'],
            'is_arab_bank_enabled' => $request->boolean('is_arab_bank_enabled'),
            'arab_bank_mode' => $validatedData['arab_bank_mode'] ?? 'offline',
            'arab_bank_phone_number' => $validatedData['arab_bank_phone_number'],
            'arab_bank_merchant_name' => $validatedData['arab_bank_merchant_name'],
            'arab_bank_instructions' => $validatedData['arab_bank_instructions'],
            'arab_bank_api_key' => $validatedData['arab_bank_api_key'],
            'arab_bank_secret_key' => $validatedData['arab_bank_secret_key'],
            'arab_bank_merchant_id' => $validatedData['arab_bank_merchant_id'],
            'is_housing_bank_jo_enabled' => $request->boolean('is_housing_bank_jo_enabled'),
            'housing_bank_jo_mode' => $validatedData['housing_bank_jo_mode'] ?? 'offline',
            'housing_bank_jo_phone_number' => $validatedData['housing_bank_jo_phone_number'],
            'housing_bank_jo_merchant_name' => $validatedData['housing_bank_jo_merchant_name'],
            'housing_bank_jo_instructions' => $validatedData['housing_bank_jo_instructions'],
            'housing_bank_jo_api_key' => $validatedData['housing_bank_jo_api_key'],
            'housing_bank_jo_secret_key' => $validatedData['housing_bank_jo_secret_key'],
            'housing_bank_jo_merchant_id' => $validatedData['housing_bank_jo_merchant_id'],
            'is_cairo_amman_bank_jo_enabled' => $request->boolean('is_cairo_amman_bank_jo_enabled'),
            'cairo_amman_bank_jo_mode' => $validatedData['cairo_amman_bank_jo_mode'] ?? 'offline',
            'cairo_amman_bank_jo_phone_number' => $validatedData['cairo_amman_bank_jo_phone_number'],
            'cairo_amman_bank_jo_merchant_name' => $validatedData['cairo_amman_bank_jo_merchant_name'],
            'cairo_amman_bank_jo_instructions' => $validatedData['cairo_amman_bank_jo_instructions'],
            'cairo_amman_bank_jo_api_key' => $validatedData['cairo_amman_bank_jo_api_key'],
            'cairo_amman_bank_jo_secret_key' => $validatedData['cairo_amman_bank_jo_secret_key'],
            'cairo_amman_bank_jo_merchant_id' => $validatedData['cairo_amman_bank_jo_merchant_id'],
            'is_safad_bank_jo_enabled' => $request->boolean('is_safad_bank_jo_enabled'),
            'safad_bank_jo_mode' => $validatedData['safad_bank_jo_mode'] ?? 'offline',
            'safad_bank_jo_phone_number' => $validatedData['safad_bank_jo_phone_number'],
            'safad_bank_jo_merchant_name' => $validatedData['safad_bank_jo_merchant_name'],
            'safad_bank_jo_instructions' => $validatedData['safad_bank_jo_instructions'],
            'safad_bank_jo_api_key' => $validatedData['safad_bank_jo_api_key'],
            'safad_bank_jo_secret_key' => $validatedData['safad_bank_jo_secret_key'],
            'safad_bank_jo_merchant_id' => $validatedData['safad_bank_jo_merchant_id'],
            'is_usdt_trc20_enabled' => $request->boolean('is_usdt_trc20_enabled'),
            'usdt_trc20_mode' => $validatedData['usdt_trc20_mode'] ?? 'offline',
            'usdt_trc20_wallet_address' => $validatedData['usdt_trc20_wallet_address'],
            'usdt_trc20_network' => $validatedData['usdt_trc20_network'],
            'usdt_trc20_memo' => $validatedData['usdt_trc20_memo'],
            'usdt_trc20_api_key' => $validatedData['usdt_trc20_api_key'],
            'usdt_trc20_secret_key' => $validatedData['usdt_trc20_secret_key'],
            'usdt_trc20_merchant_id' => $validatedData['usdt_trc20_merchant_id'],
            'is_usdt_erc20_enabled' => $request->boolean('is_usdt_erc20_enabled'),
            'usdt_erc20_mode' => $validatedData['usdt_erc20_mode'] ?? 'offline',
            'usdt_erc20_wallet_address' => $validatedData['usdt_erc20_wallet_address'],
            'usdt_erc20_network' => $validatedData['usdt_erc20_network'],
            'usdt_erc20_memo' => $validatedData['usdt_erc20_memo'],
            'usdt_erc20_api_key' => $validatedData['usdt_erc20_api_key'],
            'usdt_erc20_secret_key' => $validatedData['usdt_erc20_secret_key'],
            'usdt_erc20_merchant_id' => $validatedData['usdt_erc20_merchant_id'],
            'is_usdt_bep20_enabled' => $request->boolean('is_usdt_bep20_enabled'),
            'usdt_bep20_mode' => $validatedData['usdt_bep20_mode'] ?? 'offline',
            'usdt_bep20_wallet_address' => $validatedData['usdt_bep20_wallet_address'],
            'usdt_bep20_network' => $validatedData['usdt_bep20_network'],
            'usdt_bep20_memo' => $validatedData['usdt_bep20_memo'],
            'usdt_bep20_api_key' => $validatedData['usdt_bep20_api_key'],
            'usdt_bep20_secret_key' => $validatedData['usdt_bep20_secret_key'],
            'usdt_bep20_merchant_id' => $validatedData['usdt_bep20_merchant_id'],
            'is_usdt_polygon_enabled' => $request->boolean('is_usdt_polygon_enabled'),
            'usdt_polygon_mode' => $validatedData['usdt_polygon_mode'] ?? 'offline',
            'usdt_polygon_wallet_address' => $validatedData['usdt_polygon_wallet_address'],
            'usdt_polygon_network' => $validatedData['usdt_polygon_network'],
            'usdt_polygon_memo' => $validatedData['usdt_polygon_memo'],
            'usdt_polygon_api_key' => $validatedData['usdt_polygon_api_key'],
            'usdt_polygon_secret_key' => $validatedData['usdt_polygon_secret_key'],
            'usdt_polygon_merchant_id' => $validatedData['usdt_polygon_merchant_id'],
            'is_usdt_solana_enabled' => $request->boolean('is_usdt_solana_enabled'),
            'usdt_solana_mode' => $validatedData['usdt_solana_mode'] ?? 'offline',
            'usdt_solana_wallet_address' => $validatedData['usdt_solana_wallet_address'],
            'usdt_solana_network' => $validatedData['usdt_solana_network'],
            'usdt_solana_memo' => $validatedData['usdt_solana_memo'],
            'usdt_solana_api_key' => $validatedData['usdt_solana_api_key'],
            'usdt_solana_secret_key' => $validatedData['usdt_solana_secret_key'],
            'usdt_solana_merchant_id' => $validatedData['usdt_solana_merchant_id'],
        ];
    }

    private function handleMaskedValues(array $validatedData): array
    {
        $user = auth()->user();
        
        // Determine the correct user_id and store_id for settings
        if ($user->type === 'superadmin') {
            $settingsUserId = $user->id;
            $storeId = null;
        } elseif ($user->type === 'company') {
            $settingsUserId = $user->id;
            $storeId = getCurrentStoreId($user);
        } else {
            $settingsUserId = $user->created_by;
            $companyUser = \App\Models\User::find($user->created_by);
            $storeId = $companyUser ? getCurrentStoreId($companyUser) : null;
        }
        
        // Get current payment settings from database
        $currentSettings = getPaymentSettings($settingsUserId, $storeId);
        
        // List of all payment credential fields that might be masked
        $credentialFields = [
            'stripe_key', 'stripe_secret', 'paypal_client_id', 'paypal_secret_key',
            'razorpay_key', 'razorpay_secret', 'mercadopago_access_token',
            'paystack_public_key', 'paystack_secret_key', 'flutterwave_public_key', 'flutterwave_secret_key',
            'paytabs_profile_id', 'paytabs_server_key', 'skrill_merchant_id', 'skrill_secret_word',
            'coingate_api_token', 'payfast_merchant_id', 'payfast_merchant_key', 'payfast_passphrase',
            'tap_secret_key', 'xendit_api_key', 'paytr_merchant_id', 'paytr_merchant_key', 'paytr_merchant_salt',
            'mollie_api_key', 'toyyibpay_category_code', 'toyyibpay_secret_key',
            'benefit_secret_key', 'benefit_public_key', 'iyzipay_secret_key', 'iyzipay_public_key',
            'aamarpay_store_id', 'aamarpay_signature', 'midtrans_secret_key',
            'yookassa_shop_id', 'yookassa_secret_key', 'nepalste_secret_key', 'nepalste_public_key',
            'paiement_merchant_id', 'cinetpay_site_id', 'cinetpay_api_key', 'cinetpay_secret_key',
            'payhere_merchant_id', 'payhere_merchant_secret', 'payhere_app_id', 'payhere_app_secret',
            'fedapay_secret_key', 'fedapay_public_key', 'authorizenet_merchant_id', 'authorizenet_transaction_key',
            'khalti_secret_key', 'khalti_public_key', 'easebuzz_merchant_key', 'easebuzz_salt_key',
            'ozow_site_key', 'ozow_private_key', 'ozow_api_key',
            'cashfree_secret_key', 'cashfree_public_key',
            'jawwal_pay_api_key', 'jawwal_pay_secret_key', 'pal_pay_api_key', 'pal_pay_secret_key',
            'zain_cash_api_key', 'zain_cash_secret_key', 'orange_money_api_key', 'orange_money_secret_key',
            'cliq_api_key', 'cliq_secret_key', 'zain_cash_jo_api_key', 'zain_cash_jo_secret_key',
            'orange_money_jo_api_key', 'orange_money_jo_secret_key', 'etihad_wallet_api_key', 'etihad_wallet_secret_key',
            'dinar_pay_api_key', 'dinar_pay_secret_key', 'bank_palestine_api_key', 'bank_palestine_secret_key',
            'al_quds_bank_api_key', 'al_quds_bank_secret_key', 'arab_islamic_bank_api_key', 'arab_islamic_bank_secret_key',
            'cairo_amman_bank_api_key', 'cairo_amman_bank_secret_key', 'housing_bank_api_key', 'housing_bank_secret_key',
            'safad_bank_api_key', 'safad_bank_secret_key', 'jordan_kuwait_bank_api_key', 'jordan_kuwait_bank_secret_key',
            'arab_bank_api_key', 'arab_bank_secret_key', 'housing_bank_jo_api_key', 'housing_bank_jo_secret_key',
            'cairo_amman_bank_jo_api_key', 'cairo_amman_bank_jo_secret_key', 'safad_bank_jo_api_key', 'safad_bank_jo_secret_key',
            'usdt_trc20_api_key', 'usdt_trc20_secret_key', 'usdt_erc20_api_key', 'usdt_erc20_secret_key',
            'usdt_bep20_api_key', 'usdt_bep20_secret_key', 'usdt_polygon_api_key', 'usdt_polygon_secret_key',
            'usdt_solana_api_key', 'usdt_solana_secret_key'
        ];
        
        foreach ($credentialFields as $field) {
            if (isset($validatedData[$field])) {
                $submittedValue = $validatedData[$field];
                
                // If the submitted value is asterisks (masked), preserve the original DB value
                if ($submittedValue === '************') {
                    $validatedData[$field] = $currentSettings[$field] ?? null;
                }
                // If the submitted value is empty/null, keep it as is (will be saved as empty)
                // If the submitted value is a new string, keep it as is (will overwrite DB value)
            }
        }
        
        return $validatedData;
    }

    private function validateEnabledPaymentMethods(Request $request, array $validatedData): void
    {
        $errors = [];

        if ($request->boolean('is_stripe_enabled')) {
            $config = ['key' => $validatedData['stripe_key'], 'secret' => $validatedData['stripe_secret']];
            $validation = validatePaymentMethodConfig('stripe', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_paypal_enabled')) {
            $config = ['client_id' => $validatedData['paypal_client_id'], 'secret' => $validatedData['paypal_secret_key']];
            $validation = validatePaymentMethodConfig('paypal', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_razorpay_enabled')) {
            $config = ['key' => $validatedData['razorpay_key'], 'secret' => $validatedData['razorpay_secret']];
            $validation = validatePaymentMethodConfig('razorpay', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_mercadopago_enabled')) {
            $config = ['access_token' => $validatedData['mercadopago_access_token']];
            $validation = validatePaymentMethodConfig('mercadopago', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_paystack_enabled')) {
            $config = ['public_key' => $validatedData['paystack_public_key'], 'secret_key' => $validatedData['paystack_secret_key']];
            $validation = validatePaymentMethodConfig('paystack', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_flutterwave_enabled')) {
            $config = ['public_key' => $validatedData['flutterwave_public_key'], 'secret_key' => $validatedData['flutterwave_secret_key']];
            $validation = validatePaymentMethodConfig('flutterwave', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_bank_enabled')) {
            $config = ['details' => $validatedData['bank_detail']];
            $validation = validatePaymentMethodConfig('bank', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_paytabs_enabled')) {
            $config = ['server_key' => $validatedData['paytabs_server_key'], 'profile_id' => $validatedData['paytabs_profile_id'], 'region' => $validatedData['paytabs_region']];
            $validation = validatePaymentMethodConfig('paytabs', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_skrill_enabled')) {
            $config = ['merchant_id' => $validatedData['skrill_merchant_id'], 'secret_word' => $validatedData['skrill_secret_word']];
            $validation = validatePaymentMethodConfig('skrill', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_coingate_enabled')) {
            $config = ['api_token' => $validatedData['coingate_api_token']];
            $validation = validatePaymentMethodConfig('coingate', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_payfast_enabled')) {
            $config = ['merchant_id' => $validatedData['payfast_merchant_id'], 'merchant_key' => $validatedData['payfast_merchant_key']];
            $validation = validatePaymentMethodConfig('payfast', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_tap_enabled')) {
            $config = ['secret_key' => $validatedData['tap_secret_key']];
            $validation = validatePaymentMethodConfig('tap', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_xendit_enabled')) {
            $config = ['api_key' => $validatedData['xendit_api_key']];
            $validation = validatePaymentMethodConfig('xendit', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_paytr_enabled')) {
            $config = ['merchant_id' => $validatedData['paytr_merchant_id'], 'merchant_key' => $validatedData['paytr_merchant_key'], 'merchant_salt' => $validatedData['paytr_merchant_salt']];
            $validation = validatePaymentMethodConfig('paytr', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_mollie_enabled')) {
            $config = ['api_key' => $validatedData['mollie_api_key']];
            $validation = validatePaymentMethodConfig('mollie', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_toyyibpay_enabled')) {
            $config = ['category_code' => $validatedData['toyyibpay_category_code'], 'secret_key' => $validatedData['toyyibpay_secret_key']];
            $validation = validatePaymentMethodConfig('toyyibpay', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_cashfree_enabled')) {
            $config = ['public_key' => $validatedData['cashfree_public_key'], 'secret_key' => $validatedData['cashfree_secret_key']];
            $validation = validatePaymentMethodConfig('cashfree', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_ozow_enabled')) {
            $config = ['site_key' => $validatedData['ozow_site_key'], 'private_key' => $validatedData['ozow_private_key']];
            $validation = validatePaymentMethodConfig('ozow', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_easebuzz_enabled')) {
            $config = ['merchant_key' => $validatedData['easebuzz_merchant_key'], 'salt_key' => $validatedData['easebuzz_salt_key']];
            $validation = validatePaymentMethodConfig('easebuzz', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_khalti_enabled')) {
            $config = ['public_key' => $validatedData['khalti_public_key'], 'secret_key' => $validatedData['khalti_secret_key']];
            $validation = validatePaymentMethodConfig('khalti', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_authorizenet_enabled')) {
            $config = ['merchant_id' => $validatedData['authorizenet_merchant_id'], 'transaction_key' => $validatedData['authorizenet_transaction_key']];
            $validation = validatePaymentMethodConfig('authorizenet', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_fedapay_enabled')) {
            $config = ['public_key' => $validatedData['fedapay_public_key'], 'secret_key' => $validatedData['fedapay_secret_key']];
            $validation = validatePaymentMethodConfig('fedapay', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_payhere_enabled')) {
            $config = ['merchant_id' => $validatedData['payhere_merchant_id'], 'merchant_secret' => $validatedData['payhere_merchant_secret']];
            $validation = validatePaymentMethodConfig('payhere', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_cinetpay_enabled')) {
            $config = ['site_id' => $validatedData['cinetpay_site_id'], 'api_key' => $validatedData['cinetpay_api_key']];
            $validation = validatePaymentMethodConfig('cinetpay', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_paiement_enabled')) {
            $config = ['merchant_id' => $validatedData['paiement_merchant_id']];
            $validation = validatePaymentMethodConfig('paiement', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_nepalste_enabled')) {
            $config = ['public_key' => $validatedData['nepalste_public_key'], 'secret_key' => $validatedData['nepalste_secret_key']];
            $validation = validatePaymentMethodConfig('nepalste', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_yookassa_enabled')) {
            $config = ['shop_id' => $validatedData['yookassa_shop_id'], 'secret_key' => $validatedData['yookassa_secret_key']];
            $validation = validatePaymentMethodConfig('yookassa', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_midtrans_enabled')) {
            $config = ['secret_key' => $validatedData['midtrans_secret_key']];
            $validation = validatePaymentMethodConfig('midtrans', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_aamarpay_enabled')) {
            $config = ['store_id' => $validatedData['aamarpay_store_id'], 'signature' => $validatedData['aamarpay_signature']];
            $validation = validatePaymentMethodConfig('aamarpay', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_iyzipay_enabled')) {
            $config = ['public_key' => $validatedData['iyzipay_public_key'], 'secret_key' => $validatedData['iyzipay_secret_key']];
            $validation = validatePaymentMethodConfig('iyzipay', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_benefit_enabled')) {
            $config = ['public_key' => $validatedData['benefit_public_key'], 'secret_key' => $validatedData['benefit_secret_key']];
            $validation = validatePaymentMethodConfig('benefit', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_telegram_enabled')) {
            $config = ['bot_token' => $validatedData['telegram_bot_token'], 'chat_id' => $validatedData['telegram_chat_id']];
            $validation = validatePaymentMethodConfig('telegram', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        if ($request->boolean('is_whatsapp_enabled')) {
            $config = ['number' => $validatedData['whatsapp_number']];
            $validation = validatePaymentMethodConfig('whatsapp', $config);
            if (!$validation['valid']) {
                $errors = array_merge($errors, $validation['errors']);
            }
        }

        $walletMethods = ['jawwal_pay', 'pal_pay', 'zain_cash', 'orange_money', 'cliq', 'zain_cash_jo', 'orange_money_jo', 'etihad_wallet', 'dinar_pay'];
        foreach ($walletMethods as $method) {
            if ($request->boolean('is_' . $method . '_enabled')) {
                $config = [
                    'mode' => $validatedData[$method . '_mode'] ?? 'offline',
                    'phone_number' => $validatedData[$method . '_phone_number'] ?? null,
                    'merchant_name' => $validatedData[$method . '_merchant_name'] ?? null,
                    'api_key' => $validatedData[$method . '_api_key'] ?? null,
                    'secret_key' => $validatedData[$method . '_secret_key'] ?? null,
                    'merchant_id' => $validatedData[$method . '_merchant_id'] ?? null,
                ];
                $validation = validatePaymentMethodConfig($method, $config);
                if (!$validation['valid']) {
                    $errors = array_merge($errors, $validation['errors']);
                }
            }
        }

        $bankMethods = ['bank_palestine', 'al_quds_bank', 'arab_islamic_bank', 'cairo_amman_bank', 'housing_bank', 'safad_bank', 'jordan_kuwait_bank', 'arab_bank', 'housing_bank_jo', 'cairo_amman_bank_jo', 'safad_bank_jo'];
        foreach ($bankMethods as $method) {
            if ($request->boolean('is_' . $method . '_enabled')) {
                $config = [
                    'mode' => $validatedData[$method . '_mode'] ?? 'offline',
                    'phone_number' => $validatedData[$method . '_phone_number'] ?? null,
                    'merchant_name' => $validatedData[$method . '_merchant_name'] ?? null,
                    'instructions' => $validatedData[$method . '_instructions'] ?? null,
                    'api_key' => $validatedData[$method . '_api_key'] ?? null,
                    'secret_key' => $validatedData[$method . '_secret_key'] ?? null,
                    'merchant_id' => $validatedData[$method . '_merchant_id'] ?? null,
                ];
                $validation = validatePaymentMethodConfig($method, $config);
                if (!$validation['valid']) {
                    $errors = array_merge($errors, $validation['errors']);
                }
            }
        }

        $usdtMethods = ['usdt_trc20', 'usdt_erc20', 'usdt_bep20', 'usdt_polygon', 'usdt_solana'];
        foreach ($usdtMethods as $method) {
            if ($request->boolean('is_' . $method . '_enabled')) {
                $config = [
                    'mode' => $validatedData[$method . '_mode'] ?? 'offline',
                    'wallet_address' => $validatedData[$method . '_wallet_address'] ?? null,
                    'network' => $validatedData[$method . '_network'] ?? null,
                    'api_key' => $validatedData[$method . '_api_key'] ?? null,
                    'secret_key' => $validatedData[$method . '_secret_key'] ?? null,
                    'merchant_id' => $validatedData[$method . '_merchant_id'] ?? null,
                ];
                $validation = validatePaymentMethodConfig($method, $config);
                if (!$validation['valid']) {
                    $errors = array_merge($errors, $validation['errors']);
                }
            }
        }

        if (!empty($errors)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'payment_methods' => $errors
            ]);
        }
    }

    private function savePaymentSettings(array $settings): void
    {
        $user = auth()->user();
        
        // Determine the correct user_id and store_id for settings
        if ($user->type === 'superadmin') {
            $settingsUserId = $user->id;
            $storeId = null;
        } elseif ($user->type === 'company') {
            $settingsUserId = $user->id;
            $storeId = getCurrentStoreId($user);
        } else {
            // For sub-users, save settings under their company (created_by)
            $settingsUserId = $user->created_by;
            $companyUser = \App\Models\User::find($user->created_by);
            $storeId = $companyUser ? getCurrentStoreId($companyUser) : null;
        }
        
        foreach ($settings as $key => $value) {
            updatePaymentSetting($key, $value, $settingsUserId, $storeId);
        }
    }

    public function getEnabledMethods()
    {
        $user = auth()->user();

        // Permission check
        if (!$user || (!$user->hasPermissionTo('manage-settings') && !$user->hasPermissionTo('manage-payments'))) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Determine the correct user_id and store_id for settings
        if ($user->type === 'superadmin') {
            $enabledMethods = getEnabledPaymentMethods();
        } elseif ($user->type === 'company') {
            $storeId = getCurrentStoreId($user);
            $enabledMethods = getEnabledPaymentMethods($user->id, $storeId);
        } else {
            // For sub-users, get settings from their company but pass current user ID for COD/WhatsApp/Telegram check
            $settingsUserId = $user->created_by;
            $companyUser = \App\Models\User::find($user->created_by);
            $storeId = $companyUser ? getCurrentStoreId($companyUser) : null;
            
            // Get enabled methods with company settings but current user ID for method availability
            $enabledMethods = getEnabledPaymentMethods($settingsUserId, $storeId);
            
            // Add COD, WhatsApp, Telegram for sub-users if company user exists
            if ($companyUser && $companyUser->type === 'company') {
                $methods = ['cod', 'whatsapp', 'telegram'];
                foreach ($methods as $method) {
                    if (isPaymentMethodEnabled($method, $settingsUserId, $storeId)) {
                        $enabledMethods[$method] = getPaymentMethodConfig($method, $settingsUserId, $storeId);
                    }
                }
            }
        }
        
        return response()->json($enabledMethods);
    }

    public function testTelegram(Request $request)
    {
        $request->validate([
            'telegram_bot_token' => 'required|string',
            'telegram_chat_id' => 'required|string',
        ]);

        $telegramService = new \App\Services\TelegramService();
        $result = $telegramService->testConnection(
            $request->telegram_bot_token,
            $request->telegram_chat_id
        );

        return response()->json([
            'success' => $result['success'],
            'message' => $result['message']
        ], $result['success'] ? 200 : 400);
    }
}