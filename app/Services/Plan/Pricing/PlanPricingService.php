<?php

namespace App\Services\Plan\Pricing;

use App\Models\Plan;
use App\Models\Coupon;
use App\Models\PlanOrder;

class PlanPricingService
{
    /**
     * Calculate plan pricing with coupon support
     */
    public function calculate(Plan $plan, ?string $couponCode = null, string $billingCycle = 'yearly', ?int $userId = null): array
    {
        $originalPrice = $plan->getPriceForCycle($billingCycle);
        $discountAmount = 0;
        $finalPrice = $originalPrice;
        $couponId = null;

        if ($couponCode) {
            $coupon = Coupon::where('code', $couponCode)
                ->where('status', 1)
                ->first();

            if ($coupon) {
                $now = now();
                $isValid = true;

                if ($coupon->start_date && $now->lt($coupon->start_date)) {
                    $isValid = false;
                }

                if ($isValid && $coupon->expiry_date && $now->gt($coupon->expiry_date)) {
                    $isValid = false;
                }

                if ($isValid && $coupon->use_limit_per_coupon && $coupon->used_count >= $coupon->use_limit_per_coupon) {
                    $isValid = false;
                }

                if ($isValid && $userId && $coupon->use_limit_per_user) {
                    $userUsage = PlanOrder::where('coupon_id', $coupon->id)
                        ->where('user_id', $userId)
                        ->whereIn('status', ['approved', 'pending'])
                        ->count();
                    if ($userUsage >= $coupon->use_limit_per_user) {
                        $isValid = false;
                    }
                }

                if ($isValid && $coupon->minimum_spend && $originalPrice < $coupon->minimum_spend) {
                    $isValid = false;
                }

                if ($isValid && $coupon->maximum_spend && $originalPrice > $coupon->maximum_spend) {
                    $isValid = false;
                }

                if ($isValid) {
                    if ($coupon->type === 'percentage') {
                        $discountAmount = ($originalPrice * $coupon->discount_amount) / 100;
                    } else {
                        $discountAmount = min($coupon->discount_amount, $originalPrice);
                    }
                    $finalPrice = max(0, $originalPrice - $discountAmount);
                    $couponId = $coupon->id;
                }
            }
        }

        return [
            'original_price' => $originalPrice,
            'discount_amount' => $discountAmount,
            'final_price' => $finalPrice,
            'coupon_id' => $couponId,
        ];
    }
}