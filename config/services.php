<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('APP_URL') . '/auth/callback/google',
    ],

    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect' => env('APP_URL') . '/auth/callback/facebook',
    ],

    'apple' => [
        'client_id' => env('APPLE_CLIENT_ID'),
        'client_secret' => env('APPLE_CLIENT_SECRET'),
        'team_id' => env('APPLE_TEAM_ID'),
        'key_id' => env('APPLE_KEY_ID'),
        'private_key' => env('APPLE_PRIVATE_KEY'),
        'redirect' => env('APP_URL') . '/auth/callback/apple',
    ],

    'github' => [
        'client_id' => env('GITHUB_CLIENT_ID'),
        'client_secret' => env('GITHUB_CLIENT_SECRET'),
        'redirect' => env('APP_URL') . '/auth/callback/github',
    ],

    'linkedin' => [
        'client_id' => env('LINKEDIN_CLIENT_ID'),
        'client_secret' => env('LINKEDIN_CLIENT_SECRET'),
        'redirect' => env('APP_URL') . '/auth/callback/linkedin',
    ],

'vapid' => [
        // Web Push VAPID keys — generate with:
        //   php artisan webpush:generate-keys  (or via minishlink/web-push)
        //   public_key:  base64url-encoded public key
        //   private_key: base64url-encoded private key
        'subject' => env('VAPID_SUBJECT', env('APP_URL')),
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
    ],

    'plankton' => [
        // Plankton is a custom OAuth2 provider; configure these in .env
        'authorize_url' => env('PLANKTON_AUTHORIZE_URL'),
        'token_url' => env('PLANKTON_TOKEN_URL'),
        'userinfo_url' => env('PLANKTON_USERINFO_URL'),
        'client_id' => env('PLANKTON_CLIENT_ID'),
        'client_secret' => env('PLANKTON_CLIENT_SECRET'),
        'redirect' => env('APP_URL') . '/auth/callback/plankton',
        'scope' => env('PLANKTON_SCOPE', 'openid profile email'),
    ],

    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
    ],

    'whatsapp' => [
        'provider' => env('WHATSAPP_PROVIDER', env('WHATSAPP_CLOUD_PROVIDER', '')),
        'cloud_token' => env('WHATSAPP_CLOUD_TOKEN'),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        'business_account_id' => env('WHATSAPP_BUSINESS_ACCOUNT_ID'),
        'twilio_sid' => env('TWILIO_SID'),
        'twilio_token' => env('TWILIO_AUTH_TOKEN'),
        'twilio_from' => env('TWILIO_WHATSAPP_FROM'),
    ],

];
