<?php

namespace App\Services;

use App\Models\LoyaltySetting;
use App\Models\LoyaltyTransaction;
use App\Models\Store;
use App\Models\Customer;
use App\Models\Order;

class LoyaltyService
{
    /**
     * Earn points for a customer based on an order.
     */
    public function earnPointsForOrder(Order $order): void
    {
        $store = $order->store;
        $customer = $order->customer;

        if (!$store || !$customer) {
            return;
        }

        $settings = LoyaltySetting::forStore($store->id);

        if (!$settings->is_enabled) {
            return;
        }

        // Calculate points based on order subtotal (excluding shipping, tax, discounts)
        $earnableAmount = $order->subtotal - $order->discount_amount;
        if ($earnableAmount <= 0) {
            return;
        }

        $points = $settings->calculateEarnPoints($earnableAmount);
        if ($points <= 0) {
            return;
        }

        $currentBalance = LoyaltyTransaction::balanceFor($store->id, $customer->id);

        $expiresAt = null;
        if ($settings->points_expire && $settings->expiry_days > 0) {
            $expiresAt = now()->addDays($settings->expiry_days);
        }

        LoyaltyTransaction::create([
            'store_id' => $store->id,
            'customer_id' => $customer->id,
            'order_id' => $order->id,
            'type' => 'earn',
            'points' => $points,
            'balance_after' => $currentBalance + $points,
            'description' => "Points earned from order #{$order->order_number}",
            'metadata' => [
                'order_number' => $order->order_number,
                'order_total' => $order->total_amount,
                'earnable_amount' => $earnableAmount,
            ],
            'expires_at' => $expiresAt,
        ]);
    }

    /**
     * Redeem points for a customer on an order.
     *
     * @return float The monetary discount to apply to the order.
     */
    public function redeemPoints(Order $order, float $pointsToRedeem): float
    {
        $store = $order->store;
        $customer = $order->customer;

        if (!$store || !$customer) {
            return 0;
        }

        $settings = LoyaltySetting::forStore($store->id);

        if (!$settings->is_enabled) {
            return 0;
        }

        $currentBalance = LoyaltyTransaction::balanceFor($store->id, $customer->id);

        // Validate minimum redemption
        if ($pointsToRedeem < (float) $settings->minimum_redemption_points) {
            return 0;
        }

        // Validate available balance
        $pointsToRedeem = min($pointsToRedeem, $currentBalance);

        // Calculate monetary value
        $discount = $settings->calculateRedemptionValue($pointsToRedeem);

        // Enforce maximum discount percentage
        $maxDiscount = $order->total_amount * ((float) $settings->maximum_discount_percentage / 100);
        if ($discount > $maxDiscount) {
            $discount = $maxDiscount;
            $pointsToRedeem = $settings->pointsRequiredForAmount($discount);
        }

        $newBalance = $currentBalance - $pointsToRedeem;

        LoyaltyTransaction::create([
            'store_id' => $store->id,
            'customer_id' => $customer->id,
            'order_id' => $order->id,
            'type' => 'redeem',
            'points' => -$pointsToRedeem,
            'balance_after' => $newBalance,
            'description' => "Points redeemed on order #{$order->order_number}",
            'metadata' => [
                'order_number' => $order->order_number,
                'discount' => $discount,
                'points_used' => $pointsToRedeem,
            ],
        ]);

        return $discount;
    }

    /**
     * Award signup bonus points to a new customer.
     */
    public function awardSignupBonus(Customer $customer): void
    {
        $store = $customer->store;
        if (!$store) {
            return;
        }

        $settings = LoyaltySetting::forStore($store->id);

        $bonusPoints = (float) $settings->signup_bonus_points;
        if ($bonusPoints <= 0) {
            return;
        }

        $currentBalance = LoyaltyTransaction::balanceFor($store->id, $customer->id);

        LoyaltyTransaction::create([
            'store_id' => $store->id,
            'customer_id' => $customer->id,
            'type' => 'signup_bonus',
            'points' => $bonusPoints,
            'balance_after' => $currentBalance + $bonusPoints,
            'description' => 'Signup bonus points',
        ]);
    }

    /**
     * Award review bonus points.
     */
    public function awardReviewBonus(Customer $customer): void
    {
        $store = $customer->store;
        if (!$store) {
            return;
        }

        $settings = LoyaltySetting::forStore($store->id);

        $bonusPoints = (float) $settings->review_bonus_points;
        if ($bonusPoints <= 0) {
            return;
        }

        $currentBalance = LoyaltyTransaction::balanceFor($store->id, $customer->id);

        LoyaltyTransaction::create([
            'store_id' => $store->id,
            'customer_id' => $customer->id,
            'type' => 'review_bonus',
            'points' => $bonusPoints,
            'balance_after' => $currentBalance + $bonusPoints,
            'description' => 'Review bonus points',
        ]);
    }

    /**
     * Get the current points balance for a customer.
     */
    public function getBalance(int $storeId, int $customerId): float
    {
        return LoyaltyTransaction::balanceFor($storeId, $customerId);
    }

    /**
     * Get the transaction history for a customer.
     */
    public function getHistory(int $storeId, int $customerId, int $limit = 50)
    {
        return LoyaltyTransaction::where('store_id', $storeId)
            ->where('customer_id', $customerId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }
}
