<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Models\PlanOrder;
use App\Http\Requests\CouponRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CouponController extends BaseController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Coupon::with('creator');

        // Apply search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        // Apply filters
        if ($request->has('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $perPage = $request->get('per_page', 10);
        $coupons = $query->latest()->paginate($perPage);

        return Inertia::render('coupons/index', [
            'coupons' => $coupons,
            'filters' => $request->only(['search', 'type', 'status', 'per_page'])
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(CouponRequest $request)
    {
        $data = $request->all();
        $data['created_by'] = Auth::id();
        unset($data['used_count']);

        if ($request->code_type === 'auto') {
            do {
                $data['code'] = strtoupper(Str::random(8));
            } while (Coupon::where('code', $data['code'])->exists());
        }

        $coupon = Coupon::create($data);

        return redirect()->route('coupons.index')->with('success', __('Coupon created successfully!'));
    }

    public function update(CouponRequest $request, Coupon $coupon)
    {
        $data = $request->all();
        unset($data['used_count']);

        if ($request->code_type === 'auto' && $coupon->code_type !== 'auto') {
            do {
                $data['code'] = strtoupper(Str::random(8));
            } while (Coupon::where('code', $data['code'])->where('id', '!=', $coupon->id)->exists());
        }

        $coupon->update($data);

        return redirect()->route('coupons.index')->with('success', __('Coupon updated successfully!'));
    }

    /**
     * Validate coupon code
     */
    public function validate(Request $request)
    {
        $request->validate([
            'coupon_code' => 'required|string',
            'plan_id' => 'required|integer',
            'amount' => 'required|numeric|min:0'
        ]);
        
        $coupon = Coupon::where('code', $request->coupon_code)
            ->where('status', 1)
            ->first();
            
        if (!$coupon) {
            return response()->json([
                'valid' => false,
                'message' => __('Invalid or inactive coupon code')
            ], 400);
        }
        
        $now = now();
        
        if ($coupon->start_date && $now->lt($coupon->start_date)) {
            return response()->json([
                'valid' => false,
                'message' => __('Coupon is not yet active')
            ], 400);
        }
        
        if ($coupon->expiry_date && $now->gt($coupon->expiry_date)) {
            return response()->json([
                'valid' => false,
                'message' => __('Coupon has expired')
            ], 400);
        }
        
        if ($coupon->use_limit_per_coupon && $coupon->used_count >= $coupon->use_limit_per_coupon) {
            return response()->json([
                'valid' => false,
                'message' => __('Coupon usage limit exceeded')
            ], 400);
        }
        
        if ($coupon->use_limit_per_user) {
            $userUsage = PlanOrder::where('coupon_id', $coupon->id)
                ->where('user_id', Auth::id())
                ->whereIn('status', ['approved', 'pending'])
                ->count();
            if ($userUsage >= $coupon->use_limit_per_user) {
                return response()->json([
                    'valid' => false,
                    'message' => __('You have exceeded the usage limit for this coupon')
                ], 400);
            }
        }
        
        if ($coupon->minimum_spend && $request->amount < $coupon->minimum_spend) {
            return response()->json([
                'valid' => false,
                'message' => __('Minimum spend requirement not met')
            ], 400);
        }
        
        if ($coupon->maximum_spend && $request->amount > $coupon->maximum_spend) {
            return response()->json([
                'valid' => false,
                'message' => __('Maximum spend limit exceeded')
            ], 400);
        }
        
        $discount = 0;
        if ($coupon->type === 'percentage') {
            $discount = ($request->amount * $coupon->discount_amount) / 100;
        } else {
            $discount = $coupon->discount_amount;
        }

        if ($discount > $request->amount) {
            $discount = $request->amount;
        }

        return response()->json([
            'valid' => true,
            'coupon' => [
                'id' => $coupon->id,
                'code' => $coupon->code,
                'type' => $coupon->type,
                'value' => $coupon->discount_amount,
                'discount' => round($discount, 2)
            ]
        ]);
    }

    /**
     * Toggle the status of the specified coupon.
     */
    public function toggleStatus(Coupon $coupon)
    {
        $coupon->update([
            'status' => !$coupon->status
        ]);

        return redirect()->back()->with('success', __('Coupon status updated successfully!'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Coupon $coupon)
    {
        $coupon->delete();

        return redirect()->route('coupons.index')->with('success', __('Coupon deleted successfully!'));
    }
}
