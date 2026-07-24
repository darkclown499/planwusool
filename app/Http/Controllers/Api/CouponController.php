<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreCoupon;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CouponController extends Controller
{
    public function validate(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'store_id' => 'required|exists:stores,id',
            'subtotal' => 'required|numeric|min:0'
        ]);

        $coupon = StoreCoupon::where('code', $request->code)
            ->where('store_id', $request->store_id)
            ->where('status', true)
            ->first();

        if (!$coupon) {
            return response()->json(['error' => 'Invalid coupon code'], 400);
        }

        // Check if coupon is active
        $now = Carbon::now();
        if ($coupon->start_date && $now->lt($coupon->start_date)) {
            return response()->json(['error' => 'Coupon is not yet active'], 400);
        }

        if ($coupon->expiry_date && $now->gt($coupon->expiry_date)) {
            return response()->json(['error' => 'Coupon has expired'], 400);
        }

        // Check usage limits
        if ($coupon->use_limit_per_coupon && $coupon->used_count >= $coupon->use_limit_per_coupon) {
            return response()->json(['error' => 'Coupon usage limit exceeded'], 400);
        }

        // Check minimum spend
        if ($coupon->minimum_spend && $request->subtotal < $coupon->minimum_spend) {
            return response()->json(['error' => "Minimum spend of {$coupon->minimum_spend} required"], 400);
        }

        // Check maximum spend
        if ($coupon->maximum_spend && $request->subtotal > $coupon->maximum_spend) {
            return response()->json(['error' => "Maximum spend of {$coupon->maximum_spend} exceeded"], 400);
        }

        // Calculate discount
        $discount = 0;
        if ($coupon->type === 'percentage') {
            $discount = ($request->subtotal * $coupon->discount_amount) / 100;
        } else {
            $discount = $coupon->discount_amount;
        }

        return response()->json([
            'valid' => true,
            'coupon' => [
                'code' => $coupon->code,
                'name' => $coupon->name,
                'type' => $coupon->type,
                'discount_amount' => $coupon->discount_amount,
                'discount' => $discount
            ]
        ]);
    }
}