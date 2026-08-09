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
            
            // Get PayPal settings from superadmin
            $paypalSettings = PaymentSetting::where('user_id', 1)
                ->whereIn('key', ['paypal_client_id', 'paypal_secret_key', 'is_paypal_enabled'])
                ->pluck('value', 'key')
                ->toArray();
            
            if (($paypalSettings['is_paypal_enabled'] ?? '0') !== '1') {
                return back()->withErrors(['error' => __('PayPal payment is not enabled')]);
            }
            
            // Verify PayPal payment via API
            $baseUrl = $paypalSettings['paypal_mode'] === 'live' 
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
            
            // Verify the captured amount matches expected price
            $capturedAmount = $captureData['purchase_units'][0]['payments']['captures'][0]['amount']['value'] ?? 0;
            if ((float)$capturedAmount !== (float)$finalPrice) {
                \Log::warning("PayPal amount mismatch: expected {$finalPrice}, captured {$capturedAmount}");
                // Still process but log warning
            }
            
            // Create plan order with approved status AFTER verification
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