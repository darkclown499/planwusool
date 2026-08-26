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

        // Idempotency: do not grant twice for same store/order
        $alreadyEarned = LoyaltyTransaction::where('store_id', $store->id)
            ->where('customer_id', $customer->id)
            ->where('order_id', $order->id)
            ->where('type', 'earn')
            ->exists();
        if ($alreadyEarned) {
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
        if (!$settings->is_enabled) {
            return;
        }

        $bonusPoints = (float) $settings->signup_bonus_points;
        if ($bonusPoints <= 0) {
            return;
        }

        $existing = LoyaltyTransaction::where('store_id', $store->id)
            ->where('customer_id', $customer->id)
            ->where('type', 'signup_bonus')
            ->exists();
        if ($existing) return;

        $currentBalance = LoyaltyTransaction::balanceFor($store->id, $customer->id);
        $expiresAt = null;
        if ($settings->points_expire && $settings->expiry_days > 0) {
            $expiresAt = now()->addDays($settings->expiry_days);
        }
        LoyaltyTransaction::create([
            'store_id' => $store->id,
            'customer_id' => $customer->id,
            'type' => 'signup_bonus',
            'points' => $bonusPoints,
            'balance_after' => $currentBalance + $bonusPoints,
            'description' => 'Signup bonus points',
            'expires_at' => $expiresAt,
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
        if (!$settings->is_enabled) {
            return;
        }

        $bonusPoints = (float) $settings->review_bonus_points;
        if ($bonusPoints <= 0) {
            return;
        }

        $existing = LoyaltyTransaction::where('store_id', $store->id)
            ->where('customer_id', $customer->id)
            ->where('type', 'review_bonus')
            ->exists();
        if ($existing) return;

        $currentBalance = LoyaltyTransaction::balanceFor($store->id, $customer->id);
        $expiresAt = null;
        if ($settings->points_expire && $settings->expiry_days > 0) {
            $expiresAt = now()->addDays($settings->expiry_days);
        }
        LoyaltyTransaction::create([
            'store_id' => $store->id,
            'customer_id' => $customer->id,
            'type' => 'review_bonus',
            'points' => $bonusPoints,
            'balance_after' => $currentBalance + $bonusPoints,
            'description' => 'Review bonus points',
            'expires_at' => $expiresAt,
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
     * Reverse loyalty points when an order is cancelled/refunded.
     * Idempotent per store/order: second cancel does not create additional reversal.
     * Supports partial refund via $refundAmount (proportional reversal).
     */
    public function reversePointsForOrder(Order $order, ?float $refundAmount = null): void
    {
        $store = $order->store;
        $customer = $order->customer;
        if (!$store || !$customer) return;

        $storeId = $store->id;
        $customerId = $customer->id;

        \Illuminate\Support\Facades\DB::transaction(function () use ($order, $storeId, $customerId, $refundAmount) {
            // Lock to prevent race double reversal
            $earnPoints = (float) LoyaltyTransaction::where('store_id', $storeId)
                ->where('customer_id', $customerId)
                ->where('order_id', $order->id)
                ->where('type', 'earn')
                ->sum('points');

            $redeemPoints = abs((float) LoyaltyTransaction::where('store_id', $storeId)
                ->where('customer_id', $customerId)
                ->where('order_id', $order->id)
                ->where('type', 'redeem')
                ->sum('points'));

            if ($earnPoints == 0 && $redeemPoints == 0) return;

            // Idempotency: check if reversal already exists
            $hasEarnReversal = LoyaltyTransaction::where('store_id', $storeId)
                ->where('customer_id', $customerId)
                ->where('order_id', $order->id)
                ->where('type', 'refund')
                ->where('points', '<', 0)
                ->exists();

            $hasRedeemReversal = LoyaltyTransaction::where('store_id', $storeId)
                ->where('customer_id', $customerId)
                ->where('order_id', $order->id)
                ->where('type', 'adjustment')
                ->where('points', '>', 0)
                ->exists();

            $ratio = 1.0;
            $isPartial = $refundAmount !== null && $refundAmount > 0 && (float) $order->total_amount > 0;
            if ($isPartial) {
                $ratio = min(1.0, max(0, (float) $refundAmount / (float) $order->total_amount));
            }

            // For partial refunds we support incremental reversal: already reversed + new = total proportional
            $alreadyRefundedPoints = abs((float) LoyaltyTransaction::where('store_id', $storeId)
                ->where('customer_id', $customerId)->where('order_id', $order->id)->where('type', 'refund')->sum('points'));
            $alreadyReturnedPoints = (float) LoyaltyTransaction::where('store_id', $storeId)
                ->where('customer_id', $customerId)->where('order_id', $order->id)->where('type', 'adjustment')->where('points', '>', 0)->sum('points');

            if ($earnPoints > 0) {
                $totalProportional = round($earnPoints * $ratio, 2);
                $pointsToReverse = round($totalProportional - $alreadyRefundedPoints, 2);
                if ($pointsToReverse > 0.001) {
                    $pointsToReverse = min($pointsToReverse, $earnPoints - $alreadyRefundedPoints);
                    if ($pointsToReverse > 0) {
                        $currentBalance = LoyaltyTransaction::balanceFor($storeId, $customerId);
                        // never go negative incorrectly: cap to balance
                        $pointsToReverse = min($pointsToReverse, max(0, $currentBalance));
                        if ($pointsToReverse > 0) {
                            LoyaltyTransaction::create([
                                'store_id' => $storeId,
                                'customer_id' => $customerId,
                                'order_id' => $order->id,
                                'type' => 'refund',
                                'points' => -$pointsToReverse,
                                'balance_after' => $currentBalance - $pointsToReverse,
                                'description' => "Points reversed for cancelled/refunded order #{$order->order_number}",
                                'metadata' => [
                                    'order_number' => $order->order_number,
                                    'original_earn' => $earnPoints,
                                    'reversed' => $pointsToReverse,
                                    'total_proportional' => $totalProportional,
                                    'refund_amount' => $refundAmount,
                                    'reason' => $isPartial ? 'partial_refund' : 'order_cancelled',
                                ],
                            ]);
                        }
                    }
                }
            }

            if ($redeemPoints > 0) {
                $totalReturn = round($redeemPoints * $ratio, 2);
                $pointsToReturn = round($totalReturn - $alreadyReturnedPoints, 2);
                if ($pointsToReturn > 0.001) {
                    $pointsToReturn = min($pointsToReturn, $redeemPoints - $alreadyReturnedPoints);
                    if ($pointsToReturn > 0) {
                        $currentBalance = LoyaltyTransaction::balanceFor($storeId, $customerId);
                        LoyaltyTransaction::create([
                            'store_id' => $storeId,
                            'customer_id' => $customerId,
                            'order_id' => $order->id,
                            'type' => 'adjustment',
                            'points' => $pointsToReturn,
                            'balance_after' => $currentBalance + $pointsToReturn,
                            'description' => "Redeemed points returned for cancelled/refunded order #{$order->order_number}",
                            'metadata' => [
                                'order_number' => $order->order_number,
                                'original_redeem' => $redeemPoints,
                                'returned' => $pointsToReturn,
                                'total_proportional' => $totalReturn,
                                'refund_amount' => $refundAmount,
                                'reason' => $isPartial ? 'partial_refund_redeem_return' : 'order_cancelled_redeem_return',
                            ],
                        ]);
                    }
                }
            }
        });
    }

    /**
     * Convenience for partial refund (amount based).
     */
    public function refundPointsForOrder(Order $order, float $refundAmount): void
    {
        $this->reversePointsForOrder($order, $refundAmount);
    }

    /**
     * Process expirations for a store (or all stores). Idempotent: never double-expire same original transaction.
     * When points_expire=OFF, no points expire. Expired points create an 'expired' ledger entry.
     * Returns count of expired ledger entries created.
     */
    public function processExpirations(?int $storeId = null): int
    {
        $storesQuery = LoyaltySetting::where('points_expire', true)->where('expiry_days', '>', 0);
        if ($storeId !== null) {
            $storesQuery->where('store_id', $storeId);
        }
        $settings = $storesQuery->get();
        $created = 0;
        foreach ($settings as $setting) {
            $sid = $setting->store_id;
            // Find earn/bonus transactions that are due to expire and haven't been expired yet
            $candidates = LoyaltyTransaction::where('store_id', $sid)
                ->whereIn('type', ['earn', 'signup_bonus', 'review_bonus'])
                ->whereNotNull('expires_at')
                ->where('expires_at', '<=', now())
                ->where('points', '>', 0)
                ->get();
            foreach ($candidates as $tx) {
                // Idempotency: has an expired entry referencing this original?
                $already = LoyaltyTransaction::where('store_id', $sid)
                    ->where('customer_id', $tx->customer_id)
                    ->where('type', 'expired')
                    ->where('metadata->original_transaction_id', $tx->id)
                    ->exists();
                if ($already) continue;
                // Also avoid if order already reversed/refunded and original earn already negated?
                // Check balance guard: don't create expired if balance is 0
                $balance = LoyaltyTransaction::balanceFor($sid, $tx->customer_id);
                if ($balance <= 0) continue;
                $expirePoints = min((float) $tx->points, $balance);
                if ($expirePoints <= 0) continue;
                $balanceAfter = $balance - $expirePoints;
                LoyaltyTransaction::create([
                    'store_id' => $sid,
                    'customer_id' => $tx->customer_id,
                    'order_id' => $tx->order_id,
                    'type' => 'expired',
                    'points' => -$expirePoints,
                    'balance_after' => $balanceAfter,
                    'description' => "Points expired (original #{$tx->id})",
                    'metadata' => [
                        'original_transaction_id' => $tx->id,
                        'original_type' => $tx->type,
                        'original_points' => (float) $tx->points,
                        'expired_points' => $expirePoints,
                        'reason' => 'expiration',
                    ],
                    'expires_at' => null,
                ]);
                $created++;
            }
        }
        return $created;
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
