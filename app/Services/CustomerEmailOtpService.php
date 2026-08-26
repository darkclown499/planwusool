<?php

namespace App\Services;

use App\Mail\CustomerEmailVerificationMail;
use App\Models\Customer;
use App\Models\CustomerEmailOtp;
use App\Models\Store;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

class CustomerEmailOtpService
{
    public const TTL_MINUTES = 10;
    public const MAX_ATTEMPTS = 5;
    public const RESEND_COOLDOWN_SEC = 60;
    public const RESEND_MAX_PER_HOUR = 5;
    // Deterministic cutoff for legacy customers (see migration 2026_08_25_221240)
    public const ENFORCED_AT = '2026-08-24 00:00:00';

    public function generate(Customer $customer, Store $store): CustomerEmailOtp
    {
        // Rate limiting: cooldown + per hour
        $last = CustomerEmailOtp::where('customer_id', $customer->id)
            ->where('store_id', $store->id)
            ->latest('created_at')
            ->first();
        if ($last && $last->created_at->gt(now()->subSeconds(self::RESEND_COOLDOWN_SEC))) {
            $wait = $last->created_at->diffInSeconds(now()->addSeconds(self::RESEND_COOLDOWN_SEC));
            throw new \RuntimeException('rate_limited_cooldown:'.$wait);
        }
        $hourCount = CustomerEmailOtp::where('customer_id', $customer->id)
            ->where('store_id', $store->id)
            ->where('created_at', '>=', now()->subHour())
            ->count();
        if ($hourCount >= self::RESEND_MAX_PER_HOUR) {
            throw new \RuntimeException('rate_limited_hour');
        }

        // Invalidate previous unused
        CustomerEmailOtp::where('customer_id', $customer->id)
            ->where('store_id', $store->id)
            ->where('used', false)
            ->update(['used' => true]);

        $code = (string) random_int(100000, 999999);
        $otp = CustomerEmailOtp::create([
            'customer_id' => $customer->id,
            'store_id' => $store->id,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
            'attempts' => 0,
            'max_attempts' => self::MAX_ATTEMPTS,
            'used' => false,
        ]);

        // Send email using THIS STORE's merchant-owned config — NO Wusool fallback
        $storeMailReady = \App\Services\StoreMailService::isConnected($store);
        if (!$storeMailReady) {
            // Do not fallback to Wusool; fail gracefully and keep OTP for resend after merchant fixes config
            \Log::warning('Customer OTP email blocked: store mail not connected', ['customer_id'=>$customer->id,'store_id'=>$store->id,'status'=>\App\Services\StoreMailService::getStatus($store)]);
            throw new \RuntimeException('email_failed:store_mail_not_connected');
        }
        try {
            $logo = null;
            try {
                $conf = \App\Models\StoreConfiguration::getConfiguration($store->id);
                $logo = $conf['logo'] ?? ($store->store_content['brand']['logo'] ?? null);
                if ($logo) { $logo = \Illuminate\Support\Facades\Storage::url($logo); }
                if ($logo && !str_starts_with($logo, 'http')) {
                    $logo = $logo;
                }
            } catch (\Throwable $e) { $logo = null; }
            \App\Services\StoreMailService::sendViaStore($store, new CustomerEmailVerificationMail($code, $store->name, $logo), $customer->email);
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            // Mask sensitive details: never expose mail config in message to frontend
            if (str_contains($msg, 'store_mail_not')) {
                \Log::warning('Customer OTP email failed: store mail not ready', ['customer_id'=>$customer->id,'store_id'=>$store->id,'error'=>$msg]);
                throw new \RuntimeException('email_failed:store_mail_not_connected');
            }
            \Log::warning('Customer OTP email failed', ['customer_id'=>$customer->id,'store_id'=>$store->id,'error'=>'send_failed']);
            throw new \RuntimeException('email_failed:send_failed');
        }

        return $otp;
    }

    /**
     * @return array{ok:bool,error?:string,otp?:CustomerEmailOtp}
     */
    public function verify(Customer $customer, Store $store, string $code): array
    {
        // Ensure customer belongs to store
        if ((int)$customer->store_id !== (int)$store->id) {
            return ['ok'=>false,'error'=>'store_mismatch'];
        }

        $otp = CustomerEmailOtp::where('customer_id', $customer->id)
            ->where('store_id', $store->id)
            ->where('used', false)
            ->latest()
            ->first();

        if (!$otp) {
            return ['ok'=>false,'error'=>'invalid'];
        }
        if ($otp->isExpired()) {
            $otp->update(['used'=>true]);
            return ['ok'=>false,'error'=>'expired'];
        }
        if ($otp->attempts >= $otp->max_attempts) {
            $otp->update(['used'=>true]);
            return ['ok'=>false,'error'=>'too_many'];
        }
        if ($otp->used) {
            return ['ok'=>false,'error'=>'used'];
        }

        if (!Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');
            // If reached max, mark used
            if ($otp->fresh()->attempts >= $otp->max_attempts) {
                $otp->update(['used'=>true]);
                return ['ok'=>false,'error'=>'too_many'];
            }
            return ['ok'=>false,'error'=>'invalid'];
        }

        // Success
        $otp->update(['used'=>true,'verified_at'=>now()]);
        $customer->update(['email_verified_at'=>now()]);

        // Loyalty signup bonus only after verification
        try {
            if ($customer->store_id) {
                $existing = \App\Models\LoyaltyTransaction::where('store_id',$store->id)->where('customer_id',$customer->id)->where('type','signup_bonus')->exists();
                if (!$existing) {
                    app(\App\Services\LoyaltyService::class)->awardSignupBonus($customer);
                }
            }
        } catch (\Throwable $e) {}

        return ['ok'=>true,'otp'=>$otp];
    }

    public function resend(Customer $customer, Store $store): CustomerEmailOtp
    {
        return $this->generate($customer, $store);
    }

    public function canResendAt(Customer $customer, Store $store): ?Carbon
    {
        $last = CustomerEmailOtp::where('customer_id',$customer->id)->where('store_id',$store->id)->latest()->first();
        if (!$last) return null;
        $cooldown = $last->created_at->addSeconds(self::RESEND_COOLDOWN_SEC);
        return $cooldown->isFuture() ? $cooldown : null;
    }
}
