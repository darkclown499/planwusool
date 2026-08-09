<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\User;
use App\Models\Setting;
use App\Models\PlanOrder;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;

class BankPaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'billing_cycle' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'receipt' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        try {
            $plan = Plan::findOrFail($request->plan_id);
            $user = auth()->user();
            
            // Handle file upload
            $receiptPath = null;
            if ($request->hasFile('receipt')) {
                $receiptPath = $request->file('receipt')->store('bank_transfer_receipts', 'public');
            }

            // Check if amount is actually 0 (after coupons etc.)
            // We can recalculate to be safe
            $pricing = calculatePlanPricing($plan, $request->coupon_code, $request->billing_cycle);
            $finalPrice = $pricing['final_price'];

            // SECURITY FIX: Only auto-approve if the PLAN itself is free (price = 0)
            // Not if a coupon makes a paid plan free - that requires admin verification
            $isFreePlan = ($plan->price == 0 && $plan->yearly_price == 0);
            $status = ($isFreePlan && $finalPrice <= 0) ? 'approved' : 'pending';

            $planOrder = createPlanOrder([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'billing_cycle' => $request->billing_cycle,
                'payment_method' => 'bank',
                'coupon_code' => $request->coupon_code ?? null,
                'payment_id' => 'BANK_' . strtoupper(uniqid()),
                'receipt' => $receiptPath,
                'status' => $status,
            ]);

            if ($status === 'approved') {
                // If auto-approved, assign plan immediately
                $planOrder->activateSubscription();
                
                return back()->with('success', __('Plan activated successfully!'));
            }

            return back()->with('success', __('Payment request submitted successfully! Your plan will be activated after payment verification. Order Number: :order', ['order' => $planOrder->order_number]));

        } catch (\Exception $e) {
            return back()->withErrors(['error' => __('Payment processing failed: ') . $e->getMessage()]);
        }
    }
}