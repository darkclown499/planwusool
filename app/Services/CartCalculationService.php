<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\StoreCoupon;
use App\Models\AdvancedCoupon;
use App\Models\Shipping;
use App\Models\Tax;
use Illuminate\Support\Facades\Log;

class CartCalculationService
{
    /**
     * Calculate cart totals with support for both legacy StoreCoupon and AdvancedCoupon.
     *
     * @param int         $storeId
     * @param string      $sessionId
     * @param string|null $couponCode
     * @param int|null    $shippingId
     * @param array       $extraContext  Optional extra context: customer_id, customer_email, country_id, state_id, city_id
     *
     * @return array
     */
    public static function calculateCartTotals($storeId, $sessionId, $couponCode = null, $shippingId = null, array $extraContext = [])
    {
        // Get cart items with product and tax relationships
        $query = CartItem::where('store_id', $storeId)
            ->with(['product', 'product.tax']);
            
        // Check if customer is authenticated
        if (auth()->guard('customer')->check()) {
            $query->where('customer_id', auth()->guard('customer')->id());
        } else {
            $query->where('session_id', $sessionId)
                  ->whereNull('customer_id');
        }
        
        $cartItems = $query->get();

        if ($cartItems->isEmpty()) {
            return [
                'subtotal' => 0,
                'discount' => 0,
                'shipping' => 0,
                'tax' => 0,
                'total' => 0,
                'items' => collect([]),
                'coupon' => null,
                'applied_advanced_coupon' => false,
                'free_shipping_applied' => false,
            ];
        }

        // Calculate subtotal
        $subtotal = 0;
        foreach ($cartItems as $item) {
            $itemPrice = $item->product->sale_price ?? $item->product->price;
            $subtotal += $itemPrice * $item->quantity;
        }

        // ─── Coupon handling: try AdvancedCoupon first, fallback to StoreCoupon ───
        $discount = 0;
        $coupon = null;
        $appliedAdvancedCoupon = false;
        $freeShippingApplied = false;
        $advancedCouponDiscountType = null;
        $advancedCouponId = null;

        if ($couponCode) {
            // 1) Try AdvancedCoupon (new system)
            $advancedCoupon = AdvancedCoupon::where('store_id', $storeId)
                ->where('code', $couponCode)
                ->where('status', true)
                ->where(function ($q) {
                    $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
                })
                ->where(function ($q) {
                    $q->whereNull('expires_at')->orWhere('expires_at', '>=', now());
                })
                ->first();

            if ($advancedCoupon) {
                // Build items array for advanced coupon validation
                $cartItemsForValidation = $cartItems->map(function ($item) {
                    return [
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                        'unit_price' => (float) ($item->product->price ?? 0),
                        'sale_price' => (float) ($item->product->sale_price ?? null),
                        'category_id' => $item->product->category_id,
                    ];
                })->toArray();

                $customerIdentifier = $extraContext['customer_email'] ?? null;
                if (auth()->guard('customer')->check()) {
                    $customerIdentifier = $customerIdentifier ?: auth()->guard('customer')->user()->email;
                }

                $itemProductIds = $cartItems->pluck('product_id')->toArray();
                $hasOnSaleItems = $cartItems->contains(function ($item) {
                    return !is_null($item->product->sale_price);
                });

                $result = app(AdvancedCouponService::class)->applyCouponToCart(
                    $couponCode,
                    $storeId,
                    $subtotal,
                    0, // shipping cost will be calculated later
                    $cartItemsForValidation,
                    [
                        'customer_id' => $extraContext['customer_id'] ?? (auth()->guard('customer')->id() ?: null),
                        'customer_identifier' => $customerIdentifier,
                        'is_first_order' => $extraContext['is_first_order'] ?? self::isFirstOrder($storeId, $customerIdentifier),
                    ],
                    [
                        'country_id' => $extraContext['country_id'] ?? null,
                        'state_id' => $extraContext['state_id'] ?? null,
                        'city_id' => $extraContext['city_id'] ?? null,
                    ]
                );

                if ($result['applied']) {
                    $discount = $result['discount_amount'];
                    $appliedAdvancedCoupon = true;
                    $advancedCouponDiscountType = $result['discount_type'];
                    $advancedCouponId = $advancedCoupon->id;
                    $freeShippingApplied = ($result['discount_type'] === 'free_shipping');
                    $coupon = [
                        'id' => $advancedCoupon->id,
                        'code' => $advancedCoupon->code,
                        'name' => $advancedCoupon->name,
                        'type' => $result['discount_type'],
                        'discount_amount' => $result['discount_amount'],
                        'is_advanced' => true,
                    ];
                } else {
                    // Advanced coupon exists but validation failed, don't fallback to legacy
                    $coupon = null;
                }
            }

            // 2) Fallback to legacy StoreCoupon (only if no advanced coupon was found)
            if (!$advancedCoupon) {
                $legacyCoupon = StoreCoupon::where('store_id', $storeId)
                    ->where('code', $couponCode)
                    ->where('status', true)
                    ->where(function ($q) {
                        $q->whereNull('start_date')->orWhere('start_date', '<=', now());
                    })
                    ->where(function ($q) {
                        $q->whereNull('expiry_date')->orWhere('expiry_date', '>=', now());
                    })
                    ->first();

                if ($legacyCoupon && $subtotal >= ($legacyCoupon->minimum_spend ?? 0)
                    && (!$legacyCoupon->maximum_spend || $subtotal <= $legacyCoupon->maximum_spend)) {
                    if ($legacyCoupon->use_limit_per_coupon && $legacyCoupon->used_count >= $legacyCoupon->use_limit_per_coupon) {
                        $legacyCoupon = null;
                    } else {
                        $userLimitOk = true;
                        if ($legacyCoupon->use_limit_per_user) {
                            $customerEmail = $extraContext['customer_email'] ?? null;
                            if (!$customerEmail) {
                                if (auth()->guard('customer')->check()) {
                                    $customerEmail = auth()->guard('customer')->user()->email;
                                } else {
                                    $customerEmail = session('checkout_customer_email');
                                }
                            }
                            if ($customerEmail) {
                                $userUsage = \App\Models\Order::where('store_id', $storeId)
                                    ->where('coupon_code', $legacyCoupon->code)
                                    ->where('customer_email', $customerEmail)
                                    ->count();
                                if ($userUsage >= $legacyCoupon->use_limit_per_user) {
                                    $userLimitOk = false;
                                    $legacyCoupon = null;
                                }
                            } else {
                                $userLimitOk = false;
                                $legacyCoupon = null;
                            }
                        }

                        if ($userLimitOk && $legacyCoupon) {
                            if ($legacyCoupon->type === 'percentage') {
                                $discount = ($subtotal * $legacyCoupon->discount_amount) / 100;
                            } else {
                                $discount = $legacyCoupon->discount_amount;
                            }

                            if ($discount > $subtotal) {
                                $discount = $subtotal;
                            }
                            $coupon = $legacyCoupon;
                        }
                    }
                }
            }
        }

        // ─── Shipping ───
        $shipping = 0;
        $shippingMethod = null;

        if ($freeShippingApplied) {
            // Advanced Free Shipping coupon applied — shipping is free
            $shipping = 0;
        } elseif ($shippingId) {
            $shippingMethod = Shipping::where('store_id', $storeId)
                ->where('id', $shippingId)
                ->where('is_active', true)
                ->first();

            if ($shippingMethod) {
                $shipping = $shippingMethod->cost + ($shippingMethod->handling_fee ?? 0);
            }
        }

        // ─── Tax ───
        $tax = 0;
        foreach ($cartItems as $item) {
            if ($item->product->tax && $item->product->tax->is_active) {
                $itemPrice = $item->product->sale_price ?? $item->product->price;
                $itemSubtotal = $itemPrice * $item->quantity;

                if ($item->product->tax->type === 'percentage') {
                    $tax += ($itemSubtotal * $item->product->tax->rate) / 100;
                } else {
                    $tax += $item->product->tax->rate * $item->quantity;
                }
            }
        }

        // ─── Final total ───
        $total = $subtotal - $discount + $shipping + $tax;

        return [
            'subtotal' => round($subtotal, 2),
            'discount' => round($discount, 2),
            'shipping' => round($shipping, 2),
            'tax' => round($tax, 2),
            'total' => round($total, 2),
            'coupon' => $coupon,
            'items' => $cartItems,
            'applied_advanced_coupon' => $appliedAdvancedCoupon,
            'free_shipping_applied' => $freeShippingApplied,
            'advanced_coupon_discount_type' => $advancedCouponDiscountType,
            'advanced_coupon_id' => $advancedCouponId,
        ];
    }

    /**
     * Check if a customer has placed their first order (for first_order_only coupons).
     *
     * @param int         $storeId
     * @param string|null $customerIdentifier
     * @return bool
     */
    protected static function isFirstOrder(int $storeId, ?string $customerIdentifier): bool
    {
        if (!$customerIdentifier) {
            return false;
        }

        return !\App\Models\Order::where('store_id', $storeId)
            ->where('customer_email', $customerIdentifier)
            ->exists();
    }
}
