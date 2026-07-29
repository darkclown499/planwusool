<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreCoupon;
use App\Models\Order;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CouponController extends Controller
{
    public function validate(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'store_id' => 'required|exists:stores,id',
            'subtotal' => 'required|numeric|min:0',
            'customer_email' => 'nullable|email'
        ]);

        $coupon = StoreCoupon::where('code', $request->code)
            ->where('store_id', $request->store_id)
            ->where('status', true)
            ->first();

        if (!$coupon) {
            return response()->json(['valid' => false, 'error' => 'Invalid coupon code', 'message' => 'Invalid coupon code'], 400);
        }

        $now = Carbon::now();

        if ($coupon->start_date && $now->lt($coupon->start_date)) {
            return response()->json(['valid' => false, 'error' => 'Coupon is not yet active', 'message' => 'Coupon is not yet active'], 400);
        }

        if ($coupon->expiry_date && $now->gt($coupon->expiry_date)) {
            return response()->json(['valid' => false, 'error' => 'Coupon has expired', 'message' => 'Coupon has expired'], 400);
        }

        if ($coupon->use_limit_per_coupon && $coupon->used_count >= $coupon->use_limit_per_coupon) {
            return response()->json(['valid' => false, 'error' => 'Coupon usage limit exceeded', 'message' => 'Coupon usage limit exceeded'], 400);
        }

        if ($coupon->use_limit_per_user && $request->customer_email) {
            $userUsage = Order::where('store_id', $request->store_id)
                ->where('coupon_code', $coupon->code)
                ->where('customer_email', $request->customer_email)
                ->count();
            if ($userUsage >= $coupon->use_limit_per_user) {
                return response()->json(['valid' => false, 'error' => 'You have exceeded the usage limit for this coupon', 'message' => 'You have exceeded the usage limit for this coupon'], 400);
            }
        }

        if ($coupon->minimum_spend && $request->subtotal < $coupon->minimum_spend) {
            return response()->json(['valid' => false, 'error' => "Minimum spend of {$coupon->minimum_spend} required", 'message' => "Minimum spend of {$coupon->minimum_spend} required"], 400);
        }

        if ($coupon->maximum_spend && $request->subtotal > $coupon->maximum_spend) {
            return response()->json(['valid' => false, 'error' => "Maximum spend of {$coupon->maximum_spend} exceeded", 'message' => "Maximum spend of {$coupon->maximum_spend} exceeded"], 400);
        }

        $discount = 0;
        if ($coupon->type === 'percentage') {
            $discount = ($request->subtotal * $coupon->discount_amount) / 100;
        } else {
            $discount = $coupon->discount_amount;
        }

        if ($discount > $request->subtotal) {
            $discount = $request->subtotal;
        }

        return response()->json([
            'valid' => true,
            'coupon' => [
                'code' => $coupon->code,
                'name' => $coupon->name,
                'type' => $coupon->type,
                'discount_amount' => $coupon->discount_amount,
                'discount' => round($discount, 2)
            ]
        ]);
    }
}