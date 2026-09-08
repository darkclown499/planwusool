<?php

namespace App\Services;

use App\Models\Store;
use App\Models\StorefrontPhoneOtp;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * Hardened storefront phone OTP service (B2-03).
 *
 * Store-scoped, hashed at rest, one-time, expiring, attempt-limited and
 * resend-limited (cooldown + hourly cap) — mirroring the canonical
 * CustomerEmailOtpService architecture without touching the legacy platform
 * VerificationCode/OtpService flows.
 *
 * The store is ALWAYS the server-side authoritative tenant. It is never
 * inferred from a client-supplied store_id / a type string / a phone number.
 *
 * Delivery is truthful: on a confirmed SMS provider failure the freshly
 * generated OTP is invalidated so no usable code is ever left behind, and a
 * generic 'sms_failed' runtime marker is thrown (no provider internals).
 */
class StorefrontPhoneOtpService
{
    public const TTL_MINUTES = 10;
    public const MAX_ATTEMPTS = 5;
    public const RESEND_COOLDOWN_SEC = 60;
    public const RESEND_MAX_PER_HOUR = 5;

    public function __construct(private StorefrontOtpSmsGateway $gateway)
    {
    }

    /**
     * Deterministic canonical form used for storage and every lookup.
     */
    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/[^0-9]/', '', $phone);
        if (!is_string($digits) || strlen($digits) < 7 || strlen($digits) > 15) {
            throw new \InvalidArgumentException('invalid_phone');
        }
        return $digits;
    }

    /**
     * @throws \RuntimeException on rate limit ('rate_limited_cooldown:<sec>' /
     *         'rate_limited_hour') or confirmed SMS delivery failure
     *         ('sms_failed'). A failed delivery never leaves a usable OTP.
     */
    public function generate(Store $store, string $phone): StorefrontPhoneOtp
    {
        $phone = self::normalize($phone);

        // Resend / generation limits — cooldown then hourly cap.
        $last = StorefrontPhoneOtp::where('store_id', $store->id)
            ->where('phone', $phone)
            ->latest('created_at')
            ->first();
        if ($last && $last->created_at->gt(now()->subSeconds(self::RESEND_COOLDOWN_SEC))) {
            $wait = $last->created_at->diffInSeconds(now()->addSeconds(self::RESEND_COOLDOWN_SEC));
            throw new \RuntimeException('rate_limited_cooldown:'.$wait);
        }
        $hourCount = StorefrontPhoneOtp::where('store_id', $store->id)
            ->where('phone', $phone)
            ->where('created_at', '>=', now()->subHour())
            ->count();
        if ($hourCount >= self::RESEND_MAX_PER_HOUR) {
            throw new \RuntimeException('rate_limited_hour');
        }

        // Previous unused code for this phone/store becomes unusable.
        StorefrontPhoneOtp::where('store_id', $store->id)
            ->where('phone', $phone)
            ->where('used', false)
            ->update(['used' => true]);

        $code = (string) random_int(100000, 999999);
        $otp = StorefrontPhoneOtp::create([
            'store_id' => $store->id,
            'phone' => $phone,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
            'attempts' => 0,
            'max_attempts' => self::MAX_ATTEMPTS,
            'used' => false,
        ]);

        $message = "رمز التحقق الخاص بك في {$store->name} هو: {$code}. صالح لمدة 10 دقائق.";
        $sent = $this->gateway->send($store, $phone, $message);

        if (!$sent) {
            // Truthful failure: no usable OTP may remain after a confirmed
            // send failure. Mark it used, log without the code, and report a
            // generic customer-safe error.
            $otp->update(['used' => true]);
            Log::warning('Storefront OTP SMS not delivered', [
                'store_id' => $store->id,
                'error' => 'delivery_failed',
            ]);
            throw new \RuntimeException('sms_failed');
        }

        return $otp;
    }

    /**
     * @return array{ok:bool,error?:string,otp?:StorefrontPhoneOtp}
     */
    public function verify(Store $store, string $phone, string $code): array
    {
        $phone = self::normalize($phone);

        $otp = StorefrontPhoneOtp::where('store_id', $store->id)
            ->where('phone', $phone)
            ->where('used', false)
            ->latest('created_at')
            ->first();

        if (!$otp) {
            return ['ok' => false, 'error' => 'invalid'];
        }
        if ($otp->isExpired()) {
            $otp->update(['used' => true]);
            return ['ok' => false, 'error' => 'expired'];
        }
        if ($otp->attempts >= $otp->max_attempts) {
            $otp->update(['used' => true]);
            return ['ok' => false, 'error' => 'too_many'];
        }

        if (!Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');
            if ($otp->fresh()->attempts >= $otp->max_attempts) {
                $otp->update(['used' => true]);
                return ['ok' => false, 'error' => 'too_many'];
            }
            return ['ok' => false, 'error' => 'invalid'];
        }

        $otp->update(['used' => true, 'verified_at' => now()]);

        return ['ok' => true, 'otp' => $otp];
    }

    /**
     * Resend = a fresh generation (cooldown + hourly cap enforced).
     */
    public function resend(Store $store, string $phone): StorefrontPhoneOtp
    {
        return $this->generate($store, $phone);
    }
}