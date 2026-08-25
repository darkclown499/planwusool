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
    public const ENFORCED_AT = '2026-08-26 00:00:00';

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

        // Send email using store mail config if available
        try {
            \App\Services\MailConfigService::setStoreMailConfig($store->user_id, $store->id);
        } catch (\Throwable $e) {}
        try {
            Mail::to($customer->email)->send(new CustomerEmailVerificationMail($code, $store->name));
        } catch (\Throwable $e) {
            // Do not expose code; log without secret
            \Log::warning('Customer OTP email failed', ['customer_id'=>$customer->id,'store_id'=>$store->id,'error'=>$e->getMessage()]);
            // Keep OTP so resend can work, but inform caller email failed
            throw new \RuntimeException('email_failed:'.$e->getMessage());
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
