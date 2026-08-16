<?php

namespace App\Models;

use App\Models\Concerns\EncryptsSensitiveSettings;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentSetting extends Model
{
    use EncryptsSensitiveSettings;

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

    /**
     * Override the getter to also coerce boolean-enabled keys to real booleans.
     * The parent trait handles sensitive-key decryption via try/catch.
     */
    public function getValueAttribute($value)
    {
        $value = $this->decryptSensitiveValue($value);

        // Coerce "is_*_enabled" keys to actual booleans for cleaner consumers.
        if (in_array($this->key, $this->booleanSettingKeys(), true)) {
            return $value === '1' || $value === 1 || $value === true;
        }

        return $value;
    }

    /**
     * Boolean toggle setting keys.
     */
    protected function booleanSettingKeys(): array
    {
        return [
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
            'is_usdt_solana_enabled',
        ];
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

        // Use ->get() so the value accessor runs and encrypted/boolean values
        // are decoded; a raw pluck bypasses the accessor.
        return $query->get(['key', 'value'])->pluck('value', 'key')->toArray();
    }
}
