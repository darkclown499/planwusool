<?php

namespace App\Models\Concerns;

use Illuminate\Support\Facades\Crypt;

/**
 * Selective at-rest encryption for settings-like models.
 *
 * Rather than encrypting the entire `value` column (which throws a
 * DecryptException on any pre-existing plaintext row or on non-sensitive
 * values), only known-sensitive keys (payment secrets, tokens, etc.) are
 * encrypted with the current application key via Crypt::encryptString().
 * Reading uses a try/catch so legacy plaintext values (or values encrypted
 * under a different APP_KEY) degrade gracefully instead of crashing seeding
 * or page loads.
 */
trait EncryptsSensitiveSettings
{
    /**
     * Sensitive setting keys that MUST be encrypted at rest.
     */
    protected static function sensitiveSettingKeys(): array
    {
        return [
            // Store mail credentials (merchant-owned delivery)
            'email_password',
            // Payment gateway credentials
            'stripe_secret', 'stripe_key',
            'paypal_secret_key', 'paypal_client_id',
            'razorpay_secret', 'razorpay_key',
            'mercadopago_access_token',
            'paystack_secret_key', 'paystack_public_key',
            'flutterwave_secret_key', 'flutterwave_public_key',
            'paytabs_server_key', 'paytabs_profile_id', 'paytabs_region',
            'skrill_secret_word', 'skrill_merchant_id',
            'coingate_api_token',
            'payfast_passphrase', 'payfast_merchant_key', 'payfast_merchant_id',
            'tap_secret_key',
            'xendit_api_key',
            'paytr_merchant_salt', 'paytr_merchant_key',
            'mollie_api_key',
            'toyyibpay_secret_key',
            'benefit_secret_key', 'benefit_public_key',
            'iyzipay_secret_key', 'iyzipay_public_key',
            'aamarpay_signature',
            'midtrans_secret_key',
            'yookassa_secret_key',
            'nepalste_secret_key', 'nepalste_public_key',
            'cinetpay_secret_key', 'cinetpay_api_key',
            'payhere_merchant_secret', 'payhere_app_secret',
            'fedapay_secret_key', 'fedapay_public_key',
            'authorizenet_transaction_key',
            'khalti_secret_key', 'khalti_public_key',
            'easebuzz_salt_key', 'easebuzz_merchant_key',
            'ozow_private_key', 'ozow_api_key',
            'cashfree_secret_key', 'cashfree_public_key',
            // Mobile / chat credentials
            'telegram_bot_token', 'telegram_chat_id',
            'whatsapp_number',
            // Storage credentials (S3 / Wasabi-compatible)
            'aws_access_key_id', 'aws_secret_access_key',
            'wasabi_access_key', 'wasabi_secret_key',
            // Regional wallet / mobile-money — NO fake API fields.
            // These are MANUAL — credentials are phone_number/merchant_name/instructions/wallet_address
            // stored plaintext intentionally. Do NOT encrypt fake api_key here.
            // Partner gateways (BoP, CliQ via Bank al Etihad) will use real keys only when adapter exists.
        ];
    }

    /**
     * Encrypt sensitive values transparently on write.
     */
    public function setValueAttribute($value)
    {
        $sensitiveKeys = static::sensitiveSettingKeys();

        if (in_array($this->key, $sensitiveKeys, true) && $value !== null && $value !== '') {
            $this->attributes['value'] = \Illuminate\Support\Facades\Crypt::encryptString((string) $value);
        } else {
            $this->attributes['value'] = is_bool($value) ? ($value ? '1' : '0') : $value;
        }
    }

    /**
     * Decrypt sensitive values on read, degrading gracefully to plaintext
     * for legacy rows (no DecryptException during seeding or page loads).
     */
    public function getValueAttribute($value)
    {
        return $this->decryptSensitiveValue($value);
    }

    /**
     * Decrypt a value if this row's key is sensitive. Non-sensitive values,
     * nulls, and values that fail to decrypt (legacy plaintext, or ciphertext
     * produced under a different APP_KEY) are returned unchanged.
     */
    public function decryptSensitiveValue($value)
    {
        $sensitiveKeys = static::sensitiveSettingKeys();

        if (! in_array($this->key, $sensitiveKeys, true) || $value === null || $value === '') {
            return $value;
        }

        try {
            return \Illuminate\Support\Facades\Crypt::decryptString($value);
        } catch (\Exception $e) {
            // Value may already be plaintext (seeded before encryption was
            // introduced) or encrypted under an older APP_KEY. Return as-is.
            return $value;
        }
    }
}
