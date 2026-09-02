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
     * @param int|null    $deliveryZoneId Optional local delivery zone selection.
     * @param array       $extraContext  Optional extra context: customer_id, customer_email, country_id, state_id, city_id
     *
     * @return array
     */
    public static function calculateCartTotals($storeId, $sessionId, $couponCode = null, $shippingId = null, $deliveryZoneId = null, array $extraContext = [])
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

        // Calculate subtotal — variant-aware, skip inactive products
        $subtotal = 0;
        foreach ($cartItems as $item) {
            if (!$item->product || !$item->product->is_active) continue;
            $variantSel = $item->variants ? (is_string($item->variants) ? json_decode($item->variants, true) : $item->variants) : null;
            if (method_exists($item->product, 'effectivePriceForVariant')) {
                $itemPrice = $item->product->effectivePriceForVariant($variantSel);
            } else {
                $itemPrice = method_exists($item->product, 'effectivePrice') ? $item->product->effectivePrice() : ((float)($item->product->sale_price ?? $item->product->price));
            }
            $subtotal += $itemPrice * $item->quantity;
        }

        // ─── Coupon handling: try AdvancedCoupon first, fallback to StoreCoupon ───
        $discount = 0;
        $coupon = null;
        $appliedAdvancedCoupon = false;
        $freeShippingApplied = false;
        $advancedCouponDiscountType = null;
        $advancedCouponId = null;

        // Automatic promotions (Sections 5 & 8): when no coupon code is supplied,
        // deterministically auto-apply the BEST eligible automatic promotion.
        // The automatic-promotion block falls through to the explicit-coupon
        // handling below when a code IS provided.
        $autoDiscountType = null;
        if (!$couponCode) {
            try {
                $engine = app(\App\Services\PromotionEngineService::class);
                $itemsForEngine = $cartItems->map(function ($item) {
                    return [
                        'product_id' => $item->product_id,
                        'parent_product_id' => $item->product_id,
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
                $autoResult = $engine->resolveAutomaticPromotion($storeId, [
                    'subtotal' => $subtotal,
                    'shipping_cost' => 0,
                    'customer_id' => $extraContext['customer_id'] ?? (auth()->guard('customer')->id() ?: null),
                    'customer_identifier' => $customerIdentifier,
                    'is_first_order' => $extraContext['is_first_order'] ?? self::isFirstOrder($storeId, $customerIdentifier),
                    'item_product_ids' => $cartItems->pluck('product_id')->toArray(),
                    'has_on_sale_items' => $cartItems->contains(fn ($i) => !is_null($i->product->sale_price)),
                    'items' => $itemsForEngine,
                ]);
                if (!empty($autoResult['applied']) && $autoResult['coupon']) {
                    $autoCoupon = $autoResult['coupon'];
                    $discount = max(0, (float) $autoResult['discount_amount']);
                    $appliedAdvancedCoupon = true;
                    $advancedCouponDiscountType = $autoResult['discount_type'];
                    $advancedCouponId = $autoCoupon->id;
                    $freeShippingApplied = $autoResult['free_shipping'];
                    $autoDiscountType = $autoResult['discount_type'];
                    $coupon = [
                        'id' => $autoCoupon->id,
                        'code' => $autoCoupon->code,
                        'name' => $autoCoupon->name,
                        'type' => $autoResult['discount_type'],
                        'discount_amount' => $autoResult['discount_amount'],
                        'is_advanced' => true,
                        'is_automatic' => true,
                    ];
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Automatic promotion resolution failed', ['store_id' => $storeId, 'error' => $e->getMessage()]);
            }
        }

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
        $deliveryZone = null;
        $deliveryZoneEligible = false;

        // Local Delivery Zone is the authoritative rate when selected.
        // Client-submitted fees are never trusted — resolved from persisted zone row.
        if ($deliveryZoneId) {
            try {
                $zoneResult = app(\App\Services\DeliveryZoneService::class)->resolveForCheckout($storeId, $deliveryZoneId, (float) $subtotal);
                if ($zoneResult['zone'] && $zoneResult['eligible']) {
                    $deliveryZone = $zoneResult['zone'];
                    $deliveryZoneEligible = true;
                    $shipping = $zoneResult['fee'];
                } elseif ($zoneResult['zone'] && !$zoneResult['eligible']) {
                    // Zone exists but order doesn't meet its minimum — invalid selection below
                    $deliveryZone = $zoneResult['zone'];
                    $deliveryZoneEligible = false;
                }
            } catch (\Throwable $e) {
                // Invalid zone selection → not eligible
            }
        }

        if ($freeShippingApplied) {
            // Advanced Free Shipping coupon applied — shipping is free
            $shipping = 0;
        } elseif (!$deliveryZoneEligible && $shippingId) {
            $shippingMethod = Shipping::where('store_id', $storeId)
                ->where('id', $shippingId)
                ->where('is_active', true)
                ->first();

            if ($shippingMethod) {
                if ($shippingMethod->type === 'free_shipping') {
                    $shipping = 0;
                } elseif ($shippingMethod->type === 'percentage_based') {
                    $shipping = ($subtotal * (float) $shippingMethod->cost / 100) + ($shippingMethod->handling_fee ?? 0);
                } else {
                    $shipping = (float) $shippingMethod->cost + ($shippingMethod->handling_fee ?? 0);
                }
            }
        }

        // Canonical Free Shipping threshold override (business setting in StoreConfiguration)
        // Threshold is evaluated on subtotal after discount, before tax/shipping. If qualified, shipping becomes 0
        // regardless of selected method, as long as merchant enabled it. Coupon free_shipping already handled above.
        if (!$freeShippingApplied) {
            try {
                $cfg = \App\Models\StoreConfiguration::getConfiguration($storeId);
                $freeEnabled = \App\Models\StoreConfiguration::toBool($cfg['free_shipping_enabled'] ?? null, false);
                $rawThreshold = $cfg['free_shipping_threshold'] ?? null;
                $thresholdVal = is_numeric($rawThreshold) && (float)$rawThreshold > 0 ? (float)$rawThreshold : null;
                if ($freeEnabled && $thresholdVal !== null) {
                    $subtotalAfterDiscount = max(0, $subtotal - $discount);
                    if ($subtotalAfterDiscount >= $thresholdVal) {
                        $shipping = 0;
                        $freeShippingApplied = true;
                    }
                }
            } catch (\Throwable $e) {
                // silent fallback — never break calculation
            }
        }

        // ─── Tax — inclusive vs exclusive, discount reduces taxable base ───
        $pricesIncludeTax = self::isPricesIncludeTax($storeId);
        $subtotalAfterDiscount = max(0, $subtotal - $discount);
        $tax = 0; $exclusiveTax = 0; $inclusiveTax = 0;
        foreach ($cartItems as $item) {
            if (!$item->product || !$item->product->is_active) continue;
            if (!$item->product->tax || !$item->product->tax->is_active) continue;
            $variantSel = $item->variants ? (is_string($item->variants) ? json_decode($item->variants, true) : $item->variants) : null;
            if (method_exists($item->product, 'effectivePriceForVariant')) {
                $itemPrice = $item->product->effectivePriceForVariant($variantSel);
            } else {
                $itemPrice = method_exists($item->product, 'effectivePrice') ? $item->product->effectivePrice() : ((float)($item->product->sale_price ?? $item->product->price));
            }
            $itemGross = $itemPrice * $item->quantity;
            $share = $subtotal > 0 ? ($itemGross / $subtotal) : 0;
            $itemDiscount = $discount * $share;
            $itemGrossAfterDiscount = max(0, $itemGross - $itemDiscount);
            $rate = (float) $item->product->tax->rate;
            $isInclusive = $pricesIncludeTax || (bool) $item->product->is_tax_included;
            if ($isInclusive) {
                if ($item->product->tax->type === 'percentage' && $rate > 0) {
                    $itemTax = $itemGrossAfterDiscount - ($itemGrossAfterDiscount / (1 + $rate / 100));
                } else {
                    // fixed inclusive: tax component is capped at gross
                    $itemTax = min($rate * $item->quantity, $itemGrossAfterDiscount);
                }
                $inclusiveTax += $itemTax;
            } else {
                if ($item->product->tax->type === 'percentage') {
                    $itemTax = ($itemGrossAfterDiscount * $rate) / 100;
                } else {
                    $itemTax = $rate * $item->quantity;
                }
                $exclusiveTax += $itemTax;
            }
        }
        $tax = $exclusiveTax + $inclusiveTax;
        // Inclusive tax is already in price — do not add to total
        $total = $subtotal - $discount + $shipping + $exclusiveTax;

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
            'delivery_zone' => $deliveryZone ? [
                'id' => $deliveryZone->id,
                'name' => $deliveryZone->name,
                'fee' => round($shipping, 2),
            ] : null,
            'delivery_zone_eligible' => $deliveryZoneEligible,
        ];
    }

    protected static function isPricesIncludeTax(int $storeId): bool
    {
        try {
            $store = \App\Models\Store::find($storeId);
            if (!$store) return false;
            $userId = $store->user_id ?? null;
            // Prefer Setting::getSetting with user+store, fallback to StoreConfiguration
            $val = \App\Models\Setting::getSetting('prices_include_tax', $userId, $storeId);
            if ($val !== null) return $val === '1' || $val === 1 || $val === true || $val === 'true';
            $cfg = \App\Models\StoreConfiguration::getConfiguration($storeId);
            return !empty($cfg['prices_include_tax']);
        } catch (\Throwable $e) { return false; }
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
