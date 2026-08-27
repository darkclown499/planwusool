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
use Illuminate\Support\Facades\Http;

class PayPalPaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'plan_id' => 'required|exists:plans,id',
            'billing_cycle' => 'required|in:yearly',
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

            // Calculate pricing (applies coupon if provided)
            $pricing = calculatePlanPricing($plan, $request->coupon_code, $request->billing_cycle, $user->id);
            $finalPrice = $pricing['final_price'];

            // Get PayPal settings from superadmin
            $paypalSettings = PaymentSetting::where('user_id', 1)
                ->whereIn('key', ['paypal_client_id', 'paypal_secret_key', 'paypal_mode', 'is_paypal_enabled'])
                ->pluck('value', 'key')
                ->toArray();

            if (($paypalSettings['is_paypal_enabled'] ?? '0') !== '1') {
                return back()->withErrors(['error' => __('PayPal payment is not enabled')]);
            }

            // Verify PayPal payment via API
            $baseUrl = ($paypalSettings['paypal_mode'] ?? 'sandbox') === 'live'
                ? 'https://api.paypal.com'
                : 'https://api.sandbox.paypal.com';

            // Get access token
            $tokenResponse = Http::withBasicAuth(
                $paypalSettings['paypal_client_id'],
                $paypalSettings['paypal_secret_key']
            )->asForm()->post($baseUrl . '/v1/oauth2/token', [
                'grant_type' => 'client_credentials'
            ]);

            if (!$tokenResponse->successful()) {
                return back()->withErrors(['error' => __('PayPal authentication failed')]);
            }

            $accessToken = $tokenResponse->json()['access_token'];

            // Capture PayPal order
            $captureResponse = Http::withToken($accessToken)
                ->post($baseUrl . "/v2/checkout/orders/{$request->order_id}/capture");

            if (!$captureResponse->successful()) {
                return back()->withErrors(['error' => 'PayPal payment capture failed: ' . $captureResponse->body()]);
            }

            $captureData = $captureResponse->json();
            $captureStatus = $captureData['status'] ?? '';

            if ($captureStatus !== 'COMPLETED') {
                return back()->withErrors(['error' => 'PayPal payment not completed: ' . $captureStatus]);
            }

            // Verify the captured amount matches expected price - reject on mismatch
            $capturedAmount = $captureData['purchase_units'][0]['payments']['captures'][0]['amount']['value'] ?? 0;
            if (abs((float)$capturedAmount - (float)$finalPrice) > 0.01) {
                \Log::error("PayPal amount mismatch: expected {$finalPrice}, captured {$capturedAmount}");
                return back()->withErrors(['error' => 'PayPal payment amount does not match the plan price. Please contact support.']);
            }

            // Create plan order with approved status AFTER verification
            $planOrder = PlanOrder::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'coupon_id' => $pricing['coupon_id'],
                'original_price' => $pricing['original_price'],
                'discount_amount' => $pricing['discount_amount'],
                'final_price' => $pricing['final_price'],
                'billing_cycle' => $request->billing_cycle,
                'payment_method' => 'paypal',
                'payment_id' => $request->payment_id,
                'status' => 'approved',
                'coupon_code' => $request->coupon_code,
                'order_number' => 'PO-' . strtoupper(Str::random(8)),
                'ordered_at' => now(),
                'processed_at' => now(),
            ]);

            // Assign plan to user (handles referral record, plan upgrade,
            // resource reactivation, plan limitations - all in a transaction)
            $planOrder->activateSubscription();

            return back()->with('success', __('Payment successful! Your plan has been activated.'));

        } catch (\Exception $e) {
            \Log::error('PayPal payment error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
            return back()->withErrors(['error' => __('Payment processing failed. Please try again.')]);
        }
    }
}