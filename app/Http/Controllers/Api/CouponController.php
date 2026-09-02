<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdvancedCoupon;
use App\Models\StoreCoupon;
use App\Models\Order;
use App\Services\AdvancedCouponService;
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

        $storeId = (int) $request->store_id;
        $code = $request->code;

        // Advanced-coupon engine first (REUSE the canonical engine). Any coupon
        // managed through the Promotions center (AdvancedCoupon) is resolved here.
        $advanced = AdvancedCoupon::where('store_id', $storeId)
            ->where('code', $code)
            ->first();

        if ($advanced) {
            $service = app(AdvancedCouponService::class);
            $result = $service->validateCoupon($code, $storeId, [
                'subtotal' => (float) $request->subtotal,
                'customer_identifier' => $request->customer_email,
                'items' => [],
            ]);

            if (!$result['valid']) {
                return response()->json([
                    'valid' => false,
                    'error' => $this->advancedErrorMessage($result['errors']),
                    'message' => $this->advancedErrorMessage($result['errors']),
                ], 400);
            }

            $discount = (float) ($result['discount']['discount_amount'] ?? 0);

            return response()->json([
                'valid' => true,
                'coupon' => [
                    'code' => $advanced->code,
                    'name' => $advanced->name,
                    'type' => $advanced->discount_type,
                    'discount_amount' => (float) $advanced->discount_value,
                    'discount' => round(min($discount, (float) $request->subtotal), 2),
                ],
            ]);
        }

        $coupon = StoreCoupon::where('code', $code)
            ->where('store_id', $storeId)
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

    /**
     * Map advanced-coupon validation error codes to human-readable messages.
     */
    private function advancedErrorMessage(array $errors): string
    {
        $messages = [
            'coupon_not_found' => 'رمز الكوبون غير صحيح',
            'coupon_disabled' => 'هذا الكوبون غير مفعّل',
            'coupon_inactive_period' => 'هذا الكوبون غير نشط بعد أو انتهت صلاحيته',
            'coupon_usage_limit_exceeded' => 'تم تجاوز الحد الأقصى لاستخدام الكوبون',
            'coupon_per_customer_limit_exceeded' => 'لقد تجاوزت الحد الأقصى لاستخدام هذا الكوبون',
            'coupon_minimum_not_met' => 'هذا الكوبون يتطلب حداً أدنى لمبلغ الطلب',
            'coupon_not_valid_with_sale_items' => 'لا يمكن استخدام هذا الكوبون مع المنتجات المشمولة بالتخفيضات',
            'coupon_not_valid_for_some_items' => 'هذا الكوبون غير صالح لبعض المنتجات في سلة التسوق',
            'coupon_region_not_available' => 'هذا الكوبون غير متاح في منطقتك',
            'coupon_first_order_only' => 'هذا الكوبون متاح للعملاء الجدد فقط',
        ];

        foreach ($errors as $error) {
            if (isset($messages[$error])) {
                return $messages[$error];
            }
        }

        return 'رمز الكوبون غير صحيح';
    }
}