<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\User;
use App\Models\Setting;
use App\Models\PlanOrder;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class PayPalPaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'plan_id' => 'required|exists:plans,id',
            'billing_cycle' => 'required|in:monthly,yearly',
            'order_id' => 'required|string',
            'payment_id' => 'required|string',
            'coupon_code' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        try {
            $plan = Plan::findOrFail($request->plan_id);
            $user = auth()->user();
            
            // Calculate pricing
            $basePrice = $request->billing_cycle === 'yearly' ? $plan->yearly_price : $plan->price;
            $finalPrice = $basePrice;
            
            // Get PayPal settings
            $paypalSettings = PaymentSetting::where('user_id', 1)
                ->whereIn('key', ['paypal_client_id', 'paypal_secret_key', 'is_paypal_enabled'])
                ->pluck('value', 'key')
                ->toArray();
            
            if (($paypalSettings['is_paypal_enabled'] ?? '0') !== '1') {
                return back()->withErrors(['error' => __('PayPal payment is not enabled')]);
            }
            
            // Create plan order
            $planOrder = PlanOrder::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'original_price' => $finalPrice,
                'final_price' => $finalPrice,
                'billing_cycle' => $request->billing_cycle,
                'payment_method' => 'paypal',
                'payment_id' => $request->payment_id,
                'status' => 'approved',
                'coupon_code' => $request->coupon_code,
                'order_number' => 'PO-' . strtoupper(Str::random(8)),
                'ordered_at' => now(),
                'processed_at' => now(),
            ]);

            // Update user plan
            $user->update([
                'plan_id' => $plan->id,
                'plan_expire_date' => $request->billing_cycle === 'yearly' 
                    ? now()->addYear() 
                    : now()->addMonth(),
                'plan_is_active' => 1,
                'is_trial' => 0,
            ]);

            return back()->with('success', __('Payment successful! Your plan has been activated.'));

        } catch (\Exception $e) {
            \Log::error('PayPal payment error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
            return back()->withErrors(['error' => __('Payment processing failed. Please try again.')]);
        }
    }
}