<?php

namespace App\Services;

use App\Models\AdvancedCoupon;
use App\Models\CouponUsage;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdvancedCouponService
{
    /**
     * Validate an advanced coupon for use in a given context.
     *
     * @param string      $code         Coupon code
     * @param int         $storeId      Store ID
     * @param array       $context      Context data: subtotal, shipping_cost, customer_id, customer_identifier,
     *                                   item_product_ids, has_on_sale_items, is_first_order,
     *                                   country_id, state_id, city_id, items (for BOGO calc)
     *
     * @return array{valid: bool, coupon: AdvancedCoupon|null, discount: array, errors: array}
     */
    public function validateCoupon(string $code, int $storeId, array $context = []): array
    {
        $coupon = AdvancedCoupon::where('store_id', $storeId)
            ->where('code', $code)
            ->first();

        if (!$coupon) {
            return [
                'valid' => false,
                'coupon' => null,
                'discount' => [],
                'errors' => ['coupon_not_found'],
            ];
        }

        // Build validation context
        $validationContext = [
            'subtotal' => $context['subtotal'] ?? 0,
            'shipping_cost' => $context['shipping_cost'] ?? 0,
            'customer_identifier' => $context['customer_identifier'] ?? null,
            'customer_id' => $context['customer_id'] ?? null,
            'item_product_ids' => $context['item_product_ids'] ?? [],
            'has_on_sale_items' => $context['has_on_sale_items'] ?? false,
            'is_first_order' => $context['is_first_order'] ?? false,
            'country_id' => $context['country_id'] ?? null,
            'state_id' => $context['state_id'] ?? null,
            'city_id' => $context['city_id'] ?? null,
        ];

        $validation = $coupon->validateForUse($validationContext);

        if (!$validation['valid']) {
            return [
                'valid' => false,
                'coupon' => $coupon,
                'discount' => [],
                'errors' => $validation['errors'],
            ];
        }

        // Calculate the discount
        $discountContext = array_merge($context, [
            'subtotal' => $context['subtotal'] ?? 0,
            'shipping_cost' => $context['shipping_cost'] ?? 0,
            'items' => $context['items'] ?? [],
        ]);

        $discount = $coupon->calculateDiscount($discountContext);

        return [
            'valid' => true,
            'coupon' => $coupon,
            'discount' => $discount,
            'errors' => [],
        ];
    }

    /**
     * Apply the coupon to a cart subtotal and return the recalculated totals.
     *
     * @param string|null $couponCode
     * @param int         $storeId
     * @param float       $subtotal
     * @param float       $shippingCost
     * @param array       $items         Cart items for BOGO calc: [['product_id'=>, 'quantity'=>, 'unit_price'=>, 'sale_price'=>, 'category_id'=>], ...]
     * @param array       $customerInfo  ['customer_id'=>, 'customer_identifier'=>, 'email'=>, 'is_first_order'=>]
     * @param array       $location      ['country_id'=>, 'state_id'=>, 'city_id'=>]
     *
     * @return array{applied: bool, coupon: AdvancedCoupon|null, discount_amount: float, discount_type: string, errors: array}
     */
    public function applyCouponToCart(
        ?string $couponCode,
        int $storeId,
        float $subtotal,
        float $shippingCost = 0,
        array $items = [],
        array $customerInfo = [],
        array $location = []
    ): array {
        if (!$couponCode) {
            return [
                'applied' => false,
                'coupon' => null,
                'discount_amount' => 0,
                'discount_type' => '',
                'errors' => [],
            ];
        }

        // Prepare context for validation
        $itemProductIds = array_map(fn ($item) => $item['product_id'] ?? 0, $items);
        $hasOnSaleItems = !empty(array_filter($items, fn ($item) => !empty($item['sale_price'])));

        // Check if it's an advanced coupon first
        $result = $this->validateCoupon($couponCode, $storeId, [
            'subtotal' => $subtotal,
            'shipping_cost' => $shippingCost,
            'customer_identifier' => $customerInfo['customer_identifier'] ?? null,
            'customer_id' => $customerInfo['customer_id'] ?? null,
            'item_product_ids' => $itemProductIds,
            'has_on_sale_items' => $hasOnSaleItems,
            'is_first_order' => $customerInfo['is_first_order'] ?? false,
            'country_id' => $location['country_id'] ?? null,
            'state_id' => $location['state_id'] ?? null,
            'city_id' => $location['city_id'] ?? null,
            'items' => $items,
        ]);

        if (!$result['valid']) {
            return [
                'applied' => false,
                'coupon' => $result['coupon'],
                'discount_amount' => 0,
                'discount_type' => '',
                'errors' => $result['errors'],
            ];
        }

        return [
            'applied' => true,
            'coupon' => $result['coupon'],
            'discount_amount' => $result['discount']['discount_amount'] ?? 0,
            'discount_type' => $result['discount']['discount_type'] ?? '',
            'free_quantity' => $result['discount']['free_quantity'] ?? 0,
            'errors' => [],
        ];
    }

    /**
     * Record coupon usage after an order is placed.
     *
     * @param AdvancedCoupon $coupon
     * @param Order          $order
     * @param float          $discountAmount
     * @param array          $customerInfo  ['customer_id'=>, 'customer_identifier'=>]
     *
     * @return CouponUsage|null
     */
    public function recordCouponUsage(AdvancedCoupon $coupon, Order $order, float $discountAmount, array $customerInfo = []): ?CouponUsage
    {
        try {
            $usage = $coupon->recordUsage([
                'order_id' => $order->id,
                'customer_id' => $customerInfo['customer_id'] ?? $order->customer_id,
                'customer_identifier' => $customerInfo['customer_identifier'] ?? $order->customer_email,
                'discount_amount' => $discountAmount,
            ]);

            return $usage;
        } catch (\Exception $e) {
            Log::error('Failed to record advanced coupon usage', [
                'coupon_id' => $coupon->id,
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Get coupon usage statistics for a store.
     *
     * @param int $storeId
     * @return array
     */
    public function getStoreStatistics(int $storeId): array
    {
        $all = AdvancedCoupon::where('store_id', $storeId);

        return [
            'total' => (clone $all)->count(),
            'active' => (clone $all)->where('status', true)->count(),
            'percentage' => (clone $all)->where('discount_type', 'percentage')->count(),
            'fixed' => (clone $all)->where('discount_type', 'fixed')->count(),
            'free_shipping' => (clone $all)->where('discount_type', 'free_shipping')->count(),
            'bogo' => (clone $all)->where('discount_type', 'buy_one_get_one')->count(),
            'total_used' => CouponUsage::whereIn('coupon_id', function ($q) use ($storeId) {
                $q->select('id')->from('advanced_coupons')->where('store_id', $storeId);
            })->count(),
            'total_discount_given' => CouponUsage::whereIn('coupon_id', function ($q) use ($storeId) {
                $q->select('id')->from('advanced_coupons')->where('store_id', $storeId);
            })->sum('discount_amount'),
        ];
    }

    /**
     * Get the best active coupons for a store (for display on checkout/storefront).
     *
     * @param int $storeId
     * @param int $limit
     * @return array
     */
    public function getFeaturedCoupons(int $storeId, int $limit = 5): array
    {
        return AdvancedCoupon::where('store_id', $storeId)
            ->where('status', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', now());
            })
            ->where(function ($q) {
                $q->whereNull('usage_limit')->orWhereColumn('used_count', '<', 'usage_limit');
            })
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($coupon) {
                return [
                    'id' => $coupon->id,
                    'name' => $coupon->name,
                    'code' => $coupon->code,
                    'description' => $coupon->description,
                    'discount_type' => $coupon->discount_type,
                    'discount_value' => (float) $coupon->discount_value,
                    'max_discount_amount' => $coupon->max_discount_amount !== null ? (float) $coupon->max_discount_amount : null,
                    'minimum_order_amount' => (float) $coupon->minimum_order_amount,
                    'first_order_only' => (bool) $coupon->first_order_only,
                    'expires_at' => $coupon->expires_at?->toIso8601String(),
                ];
            })
            ->toArray();
    }

    /**
     * Clean up expired coupons by disabling them.
     */
    public function disableExpiredCoupons(): int
    {
        return AdvancedCoupon::where('status', true)
            ->where('expires_at', '<', now())
            ->update(['status' => false]);
    }
}

