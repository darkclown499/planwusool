<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class PaymentSetting extends Model
{
    protected $fillable = ['user_id', 'store_id', 'key', 'value'];

    protected $casts = [
        'user_id' => 'integer',
        'store_id' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function setValueAttribute($value)
    {
        $sensitiveKeys = [
            'stripe_secret', 
            'paypal_secret_key', 
            'stripe_key', 
            'paypal_client_id', 
            'razorpay_key', 
            'razorpay_secret',
            'mercadopago_access_token',
            'paystack_public_key',
            'paystack_secret_key',
            'flutterwave_public_key',
            'flutterwave_secret_key',
            'paytabs_server_key',
            'paytabs_profile_id',
            'paytabs_region',
            'skrill_merchant_id',
            'skrill_secret_word',
            'coingate_api_token',
            'payfast_merchant_id',
            'payfast_merchant_key',
            'payfast_passphrase',
            'tap_secret_key',
            'xendit_api_key',
            'paytr_merchant_key',
            'paytr_merchant_salt',
            'mollie_api_key',
            'toyyibpay_secret_key',
            'benefit_secret_key',
            'benefit_public_key',
            'iyzipay_secret_key',
            'iyzipay_public_key',
            'aamarpay_signature',
            'midtrans_secret_key',
            'yookassa_secret_key',
            'nepalste_secret_key',
            'nepalste_public_key',
            'cinetpay_api_key',
            'cinetpay_secret_key',
            'payhere_merchant_secret',
            'payhere_app_secret',
            'fedapay_secret_key',
            'fedapay_public_key',
            'authorizenet_transaction_key',
            'khalti_secret_key',
            'khalti_public_key',
            'easebuzz_merchant_key',
            'easebuzz_salt_key',
            'ozow_private_key',
            'ozow_api_key',
            'cashfree_secret_key',
            'cashfree_public_key',
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
        
        if (in_array($this->key, $sensitiveKeys) && $value) {
            $this->attributes['value'] = Crypt::encryptString($value);
        } else {
            $this->attributes['value'] = is_bool($value) ? ($value ? '1' : '0') : $value;
        }
    }

    public function getValueAttribute($value)
    {
        $sensitiveKeys = [
            'stripe_secret', 
            'paypal_secret_key', 
            'stripe_key', 
            'paypal_client_id', 
            'razorpay_key', 
            'razorpay_secret',
            'mercadopago_access_token',
            'paystack_public_key',
            'paystack_secret_key',
            'flutterwave_public_key',
            'flutterwave_secret_key',
            'paytabs_server_key',
            'paytabs_profile_id',
            'paytabs_region',
            'skrill_merchant_id',
            'skrill_secret_word',
            'coingate_api_token',
            'payfast_merchant_id',
            'payfast_merchant_key',
            'payfast_passphrase',
            'tap_secret_key',
            'xendit_api_key',
            'paytr_merchant_key',
            'paytr_merchant_salt',
            'mollie_api_key',
            'toyyibpay_secret_key',
            'benefit_secret_key',
            'benefit_public_key',
            'iyzipay_secret_key',
            'iyzipay_public_key',
            'aamarpay_signature',
            'midtrans_secret_key',
            'yookassa_secret_key',
            'nepalste_secret_key',
            'nepalste_public_key',
            'cinetpay_api_key',
            'cinetpay_secret_key',
            'payhere_merchant_secret',
            'payhere_app_secret',
            'fedapay_secret_key',
            'fedapay_public_key',
            'authorizenet_transaction_key',
            'khalti_secret_key',
            'khalti_public_key',
            'easebuzz_merchant_key',
            'easebuzz_salt_key',
            'ozow_private_key',
            'ozow_api_key',
            'cashfree_secret_key',
            'cashfree_public_key',
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
        
        $booleanKeys = [
            'is_manually_enabled', 
            'is_cod_enabled', 
            'is_bank_enabled', 
            'is_stripe_enabled', 
            'is_paypal_enabled', 
            'is_razorpay_enabled',
            'is_mercadopago_enabled',
            'is_paystack_enabled',
            'is_flutterwave_enabled',
            'is_paytabs_enabled',
            'is_skrill_enabled',
            'is_coingate_enabled',
            'is_payfast_enabled',
            'is_tap_enabled',
            'is_xendit_enabled',
            'is_paytr_enabled',
            'is_mollie_enabled',
            'is_toyyibpay_enabled',
            'is_benefit_enabled',
            'is_iyzipay_enabled',
            'is_aamarpay_enabled',
            'is_midtrans_enabled',
            'is_yookassa_enabled',
            'is_nepalste_enabled',
            'is_paiement_enabled',
            'is_cinetpay_enabled',
            'is_payhere_enabled',
            'is_fedapay_enabled',
            'is_authorizenet_enabled',
            'is_khalti_enabled',
            'is_easebuzz_enabled',
            'is_ozow_enabled',
            'is_cashfree_enabled',
            'is_whatsapp_enabled',
            'is_telegram_enabled',
            'is_jawwal_pay_enabled',
            'is_pal_pay_enabled',
            'is_zain_cash_enabled',
            'is_orange_money_enabled',
            'is_bank_palestine_enabled',
            'is_al_quds_bank_enabled',
            'is_arab_islamic_bank_enabled',
            'is_cairo_amman_bank_enabled',
            'is_housing_bank_enabled',
            'is_safad_bank_enabled',
            'is_cliq_enabled',
            'is_zain_cash_jo_enabled',
            'is_orange_money_jo_enabled',
            'is_etihad_wallet_enabled',
            'is_dinar_pay_enabled',
            'is_jordan_kuwait_bank_enabled',
            'is_arab_bank_enabled',
            'is_housing_bank_jo_enabled',
            'is_cairo_amman_bank_jo_enabled',
            'is_safad_bank_jo_enabled',
            'is_usdt_trc20_enabled',
            'is_usdt_erc20_enabled',
            'is_usdt_bep20_enabled',
            'is_usdt_polygon_enabled',
            'is_usdt_solana_enabled'
        ];
        
        if (in_array($this->key, $sensitiveKeys) && $value) {
            try {
                return Crypt::decryptString($value);
            } catch (\Exception $e) {
                return null;
            }
        }
        
        if (in_array($this->key, $booleanKeys)) {
            return $value === '1' || $value === 1 || $value === true;
        }
        
        return $value;
    }

    public static function updateOrCreateSetting($userId, $key, $value, $storeId = null)
    {
        return self::updateOrCreate(
            ['user_id' => $userId, 'store_id' => $storeId, 'key' => $key],
            ['value' => $value]
        );
    }

    public static function getUserSettings($userId, $storeId = null)
    {
        if (!$userId) {
            return [];
        }
        
        // For company users, get store-specific settings; for superadmin, get user settings
        $query = self::where('user_id', $userId);
        
        if ($storeId !== null) {
            $query->where('store_id', $storeId);
        } else {
            $query->whereNull('store_id');
        }
        
        // Use ->get() so the encrypted value accessor runs; a raw pluck() on
        // the query builder bypasses it and returns the ciphertext.
        $settings = $query->get(['key', 'value'])->pluck('value', 'key')->toArray();
        
        return $settings;
    }
}