<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\StoreCoupon;
use App\Models\Shipping;
use App\Models\Tax;

class CartCalculationService
{
    public static function calculateCartTotals($storeId, $sessionId, $couponCode = null, $shippingId = null)
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
                'items' => collect([])
            ];
        }

        // Calculate subtotal
        $subtotal = 0;
        foreach ($cartItems as $item) {
            $itemPrice = $item->product->sale_price ?? $item->product->price;
            $subtotal += $itemPrice * $item->quantity;
        }

        // Calculate discount
        $discount = 0;
        $coupon = null;
        if ($couponCode) {
            $coupon = \App\Models\StoreCoupon::where('store_id', $storeId)
                ->where('code', $couponCode)
                ->where('status', true)
                ->where(function ($q) {
                    $q->whereNull('start_date')->orWhere('start_date', '<=', now());
                })
                ->where(function ($q) {
                    $q->whereNull('expiry_date')->orWhere('expiry_date', '>=', now());
                })
                ->first();

            if ($coupon && $subtotal >= ($coupon->minimum_spend ?? 0)
                && (!$coupon->maximum_spend || $subtotal <= $coupon->maximum_spend)) {
                if ($coupon->use_limit_per_coupon && $coupon->used_count >= $coupon->use_limit_per_coupon) {
                    $coupon = null;
                } else {
                    $userLimitOk = true;
                    if ($coupon->use_limit_per_user) {
                        $customerEmail = null;
                        if (auth()->guard('customer')->check()) {
                            $customer = auth()->guard('customer')->user();
                            $customerEmail = $customer->email;
                        } else {
                            $customerEmail = session('checkout_customer_email');
                        }
                        if ($customerEmail) {
                            $userUsage = \App\Models\Order::where('store_id', $storeId)
                                ->where('coupon_code', $coupon->code)
                                ->where('customer_email', $customerEmail)
                                ->count();
                            if ($userUsage >= $coupon->use_limit_per_user) {
                                $userLimitOk = false;
                                $coupon = null;
                            }
                        } else {
                            $userLimitOk = false;
                            $coupon = null;
                        }
                    }

                    if ($userLimitOk && $coupon) {
                        if ($coupon->type === 'percentage') {
                            $discount = ($subtotal * $coupon->discount_amount) / 100;
                        } else {
                            $discount = $coupon->discount_amount;
                        }

                        if ($discount > $subtotal) {
                            $discount = $subtotal;
                        }
                    }
                }
            }
        }

        // Calculate shipping
        $shipping = 0;
        if ($shippingId) {
            $shippingMethod = Shipping::where('store_id', $storeId)
                ->where('id', $shippingId)
                ->where('is_active', true)
                ->first();

            if ($shippingMethod) {
                // Check if order meets minimum amount for free shipping
                if ($subtotal >= ($shippingMethod->min_order_amount ?? 0)) {
                    $shipping = $shippingMethod->cost + ($shippingMethod->handling_fee ?? 0);
                } else {
                    $shipping = $shippingMethod->cost + ($shippingMethod->handling_fee ?? 0);
                }
            }
        }

        // Calculate tax per product (on original price before discount)
        $tax = 0;
        // $tax_details = [];
        foreach ($cartItems as $item) {
            if ($item->product->tax && $item->product->tax->is_active) {
                $itemPrice = $item->product->sale_price ?? $item->product->price;
                $itemSubtotal = $itemPrice * $item->quantity;
                
                // Calculate tax based on type (percentage or fixed) - on original price
                if ($item->product->tax->type === 'percentage') {
                    $tax += ($itemSubtotal * $item->product->tax->rate) / 100;
                } else {
                    // Fixed tax amount per item
                    $tax += $item->product->tax->rate * $item->quantity;
                }
                // $tax_details[] = [
                //     'name' => $item->product->tax->name,
                //     'rate' => $item->product->tax->rate,
                //     'type' => $item->product->tax->type,
                //     'amount' => $item->product->tax->type === 'percentage' ? ($itemSubtotal * $item->product->tax->rate) / 100 : $item->product->tax->rate * $item->quantity
                // ];
            }
        }

        // Calculate final total
        $total = $subtotal - $discount + $shipping + $tax;

        return [
            'subtotal' => round($subtotal, 2),
            'discount' => round($discount, 2),
            'shipping' => round($shipping, 2),
            'tax' => round($tax, 2),
            'total' => round($total, 2),
            'coupon' => $coupon,
            'items' => $cartItems,
            // 'tax_details' => $tax_details
        ];
    }
}