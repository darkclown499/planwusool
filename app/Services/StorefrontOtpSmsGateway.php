<?php

namespace App\Services;

use App\Models\Store;
use Illuminate\Support\Facades\Log;

/**
 * Delivery seam for the storefront phone OTP.
 *
 * Wraps the shared SmsService so delivery success/failure is a truthful boolean
 * (SmsService returns false — it does not throw — when the provider is
 * disabled/unconfigured and fails). Never logs the raw code or provider
 * credentials; only a store id and a generic failure marker.
 */
class StorefrontOtpSmsGateway
{
    public function send(Store $store, string $phone, string $message): bool
    {
        try {
            return (bool) SmsService::sendRawSMS($store->user_id, $store->id, $phone, $message);
        } catch (\Throwable $e) {
            Log::warning('Storefront OTP SMS send failed', [
                'store_id' => $store->id,
                'error' => 'send_failed',
            ]);
            return false;
        }
    }
}