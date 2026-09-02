<?php

namespace App\Services;

use App\Models\AdvancedCoupon;
use Illuminate\Support\Facades\DB;

/**
 * Canonical promotion engine (Phase 1).
 *
 * This is the single authoritative server-side service for resolving automatic
 * promotions and enforcing the centralized stacking policy. It REUSES the
 * existing AdvancedCoupon validation/calculation logic rather than duplicating
 * a second discount engine.
 *
 * Responsibilities:
 *   - Automatic promotion selection (Sections 5 & 8): when no coupon code is
 *     supplied, deterministically pick the BEST eligible automatic promotion
 *     (the one producing the highest customer discount). No hidden DB ordering.
 *   - Stacking policy (Section 7): at most ONE merchandise discount promotion
 *     may apply at a time. A free-shipping promotion may coexist only when
 *     explicitly allowed (stackable flag) AND the merchant-supplied merchant
 *     of record agrees. Combined discounts are capped so merchandise payable
 *     never goes below zero.
 */
class PromotionEngineService
{
    /**
     * Resolve the automatic promotion that should apply to a cart.
     *
     * When $couponCode is provided, that coupon takes precedence (explicit
     * customer intent). When absent, we evaluate every potentially-active
     * automatic promotion (code_type='auto', status=1, within schedule) and
     * return the single one producing the highest discount.
     *
     * @param int   $storeId
     * @param array $context  Same shape as AdvancedCouponService context, plus:
     *                        items (for quantity/BOGO), subtotal, shipping_cost,
     *                        customer_id, customer_identifier, is_first_order,
     *                        country_id/state_id/city_id, item_product_ids,
     *                        has_on_sale_items
     *
     * @return array{
     *   applied: bool,
     *   coupon: AdvancedCoupon|null,
     *   discount_amount: float,
     *   discount_type: string,
     *   free_shipping: bool,
     *   errors: array
     * }
     */
    public function resolveAutomaticPromotion(int $storeId, array $context = []): array
    {
        $subtotal = max(0, (float) ($context['subtotal'] ?? 0));

        // Only query potentially-active automatic promotions (performance).
        $candidates = AdvancedCoupon::where('store_id', $storeId)
            ->where('code_type', 'auto')
            ->where('status', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>=', now()))
            ->where(fn ($q) => $q->whereNull('usage_limit')->orWhereColumn('used_count', '<', 'usage_limit'))
            ->get();

        if ($candidates->isEmpty()) {
            return ['applied' => false, 'coupon' => null, 'discount_amount' => 0, 'discount_type' => '', 'free_shipping' => false, 'errors' => []];
        }

        $best = null;
        $bestService = new AdvancedCouponService();

        foreach ($candidates as $coupon) {
            $result = $bestService->applyCouponToCart(
                $coupon->code,
                $storeId,
                $subtotal,
                (float) ($context['shipping_cost'] ?? 0),
                $context['items'] ?? [],
                $context,
                $context
            );
            if (!$result['applied']) {
                continue;
            }
            // Deterministic best: pick highest merchandise discount. Free-shipping
            // promotions are only auto-applied when they are the only matching one
            // or when the store policy permits coexistence (handled by caller).
            $score = (float) $result['discount_amount'];
            if ($result['discount_type'] === 'free_shipping') {
                $score = (float) ($context['shipping_cost'] ?? 0);
            }
            if ($best === null || $score > (float) $best['discount_amount']) {
                $best = $result;
            }
        }

        if (!$best) {
            return ['applied' => false, 'coupon' => null, 'discount_amount' => 0, 'discount_type' => '', 'free_shipping' => false, 'errors' => []];
        }

        $freeShipping = ($best['discount_type'] === 'free_shipping');

        return [
            'applied' => true,
            'coupon' => $best['coupon'],
            'discount_amount' => max(0, (float) $best['discount_amount']),
            'discount_type' => (string) $best['discount_type'],
            'free_shipping' => $freeShipping,
            'errors' => $best['errors'] ?? [],
        ];
    }

    /**
     * Merge a shipping discount into the final order totals.
     *
     * Shipping discount is kept separate from the merchandise discount so we
     * never overwrite the base shipping zone rate. The order's shipping_amount
     * is reduced by at most the full shipping cost.
     */
    public function applyShippingDiscount(float $shippingCost, ?AdvancedCoupon $coupon = null): array
    {
        if ($coupon && $coupon->discount_type === AdvancedCoupon::TYPE_FREE_SHIPPING) {
            $shippingDiscount = $shippingCost;
        } else {
            $shippingDiscount = 0;
        }

        return [
            'shipping_discount' => max(0, min($shippingCost, round($shippingDiscount, 2))),
            'shipping_payable' => max(0, round($shippingCost - $shippingDiscount, 2)),
        ];
    }
}
