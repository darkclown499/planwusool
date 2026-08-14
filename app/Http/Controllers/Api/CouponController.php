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
            return response()->json(['valid' => false, 'error' => 'رمز الكوبون غير صحيح', 'message' => 'رمز الكوبون غير صحيح'], 400);
        }

        $now = Carbon::now();

        if ($coupon->start_date && $now->lt($coupon->start_date)) {
            return response()->json(['valid' => false, 'error' => 'الكوبون غير نشط بعد', 'message' => 'الكوبون غير نشط بعد'], 400);
        }

        if ($coupon->expiry_date && $now->gt($coupon->expiry_date)) {
            return response()->json(['valid' => false, 'error' => 'انتهت صلاحية الكوبون', 'message' => 'انتهت صلاحية الكوبون'], 400);
        }

        if ($coupon->use_limit_per_coupon && $coupon->used_count >= $coupon->use_limit_per_coupon) {
            return response()->json(['valid' => false, 'error' => 'تم تجاوز الحد الأقصى لاستخدام الكوبون', 'message' => 'تم تجاوز الحد الأقصى لاستخدام الكوبون'], 400);
        }

        if ($coupon->use_limit_per_user && $request->customer_email) {
            $userUsage = Order::where('store_id', $request->store_id)
                ->where('coupon_code', $coupon->code)
                ->where('customer_email', $request->customer_email)
                ->count();
            if ($userUsage >= $coupon->use_limit_per_user) {
                return response()->json(['valid' => false, 'error' => 'لقد تجاوزت الحد الأقصى لاستخدام هذا الكوبون', 'message' => 'لقد تجاوزت الحد الأقصى لاستخدام هذا الكوبون'], 400);
            }
        }

        if ($coupon->minimum_spend && $request->subtotal < $coupon->minimum_spend) {
            return response()->json(['valid' => false, 'error' => "الحد الأدنى للإنفاق {$coupon->minimum_spend} مطلوب", 'message' => "الحد الأدنى للإنفاق {$coupon->minimum_spend} مطلوب"], 400);
        }

        if ($coupon->maximum_spend && $request->subtotal > $coupon->maximum_spend) {
            return response()->json(['valid' => false, 'error' => "تم تجاوز الحد الأقصى للإنفاق {$coupon->maximum_spend}", 'message' => "تم تجاوز الحد الأقصى للإنفاق {$coupon->maximum_spend}"], 400);
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