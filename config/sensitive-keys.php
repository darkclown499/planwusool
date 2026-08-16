<?php

/*
|--------------------------------------------------------------------------
| Sensitive Setting Keys
|--------------------------------------------------------------------------
|
| Keys listed here are stripped (filterSensitiveSettings) or masked
| (getMaskedSettings) whenever settings are shared with the frontend or
| returned through JSON APIs. Anything that would damage the platform if
| exposed (payment credentials, cloud/infra keys, SMTP credentials, OTP-ish
| tokens, messaging/webhook tokens) MUST be listed here. Keep this in sync
| with app/Models/Concerns/EncryptsSensitiveSettings::sensitiveSettingKeys().
|
*/

return [
    // reCAPTCHA
    'recaptchaSecretKey',

    // Wasabi Storage
    'wasabi_access_key',
    'wasabi_secret_key',
    'wasabi_bucket',
    'wasabi_region',
    'wasabi_root',
    'wasabi_url',

    // Email / SMTP Configuration
    'email_username',
    'email_password',
    'email_host',
    'email_port',
    'email_encryption',
    'email_driver',
    'email_provider',

    // AWS / S3 Configuration
    'aws_access_key_id',
    'aws_secret_access_key',
    'aws_default_region',
    'aws_bucket',
    'aws_url',
    'aws_endpoint',

    // AI / integration keys
    'chatgptKey',
    'openai_key',
    'chatgpt_api_key',
    'twilio_account_sid',
    'twilio_auth_token',
    'twilio_sid',
    'twilio_token',

    // Card & global payment gateways
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
    'aamarpay_signature', 'aamarpay_store_id',
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

    // Regional wallet / mobile-money gateways
    'jawwal_pay_api_key', 'jawwal_pay_secret_key',
    'pal_pay_api_key', 'pal_pay_secret_key',
    'zain_cash_api_key', 'zain_cash_secret_key',
    'orange_money_api_key', 'orange_money_secret_key',
    'cliq_api_key', 'cliq_secret_key',
    'zain_cash_jo_api_key', 'zain_cash_jo_secret_key',
    'orange_money_jo_api_key', 'orange_money_jo_secret_key',
    'etihad_wallet_api_key', 'etihad_wallet_secret_key',
    'dinar_pay_api_key', 'dinar_pay_secret_key',
    'bank_palestine_api_key', 'bank_palestine_secret_key',
    'al_quds_bank_api_key', 'al_quds_bank_secret_key',
    'arab_islamic_bank_api_key', 'arab_islamic_bank_secret_key',
    'cairo_amman_bank_api_key', 'cairo_amman_bank_secret_key',
    'housing_bank_api_key', 'housing_bank_secret_key',
    'safad_bank_api_key', 'safad_bank_secret_key',
    'jordan_kuwait_bank_api_key', 'jordan_kuwait_bank_secret_key',
    'arab_bank_api_key', 'arab_bank_secret_key',
    'housing_bank_jo_api_key', 'housing_bank_jo_secret_key',
    'cairo_amman_bank_jo_api_key', 'cairo_amman_bank_jo_secret_key',
    'safad_bank_jo_api_key', 'safad_bank_jo_secret_key',
    'usdt_trc20_api_key', 'usdt_trc20_secret_key',
    'usdt_erc20_api_key', 'usdt_erc20_secret_key',
    'usdt_bep20_api_key', 'usdt_bep20_secret_key',
    'usdt_polygon_api_key', 'usdt_polygon_secret_key',
    'usdt_solana_api_key', 'usdt_solana_secret_key',

    // Messaging / chat tokens (also merged in getSensitiveKeys for safety)
    'telegram_bot_token', 'telegram_chat_id',
    'whatsapp_number',
    'messaging_message_template',
    'messaging_item_template',
];