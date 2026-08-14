<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\User;
use App\Models\Setting;
use App\Models\PlanOrder;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Illuminate\Support\Facades\Validator;

class StripePaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'plan_id' => 'required|exists:plans,id',
            'billing_cycle' => 'required|in:monthly,yearly',
            'payment_method_id' => 'required|string',
            'cardholder_name' => 'required|string',
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
            $finalPrice = $basePrice; // Add coupon logic here if needed
            
            // Get Stripe settings
            $stripeSettings = PaymentSetting::getUserSettings(1);
            
            if (($stripeSettings['is_stripe_enabled'] ?? '0') !== '1') {
                return back()->withErrors(['error' => __('Stripe payment is not enabled')]);
            }
            
            if (!isset($stripeSettings['stripe_secret']) || !isset($stripeSettings['stripe_key'])) {
                return back()->withErrors(['error' => __('Stripe not configured properly')]);
            }

            $stripeSecret = $stripeSettings['stripe_secret'];
            if (!str_starts_with($stripeSecret, 'sk_')) {
                return back()->withErrors(['error' => __('Invalid Stripe secret key format')]);
            }

            Stripe::setApiKey($stripeSecret);
            
            $paymentIntent = PaymentIntent::create([
                'amount' => $finalPrice * 100, // Convert to cents
                'currency' => 'usd',
                'payment_method' => $request->payment_method_id,
                'confirmation_method' => 'manual',
                'confirm' => true,
                'return_url' => route('plans.index'),
                'description' => 'Subscription to ' . $plan->name . ' plan (' . $request->billing_cycle . ')',
                'shipping' => [
                    'name' => $request->cardholder_name,
                    'address' => [
                        'line1' => 'Address Line 1',
                        'city' => 'City',
                        'country' => 'US',
                        'postal_code' => '10001',
                    ],
                ],
                'metadata' => [
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'billing_cycle' => $request->billing_cycle,
                ],
            ]);

            if ($paymentIntent->status === 'succeeded') {
                // Create plan order
                $planOrder = PlanOrder::create([
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'original_price' => $finalPrice,
                    'final_price' => $finalPrice,
                    'billing_cycle' => $request->billing_cycle,
                    'payment_method' => 'stripe',
                    'payment_id' => $paymentIntent->id,
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
            }

            return back()->withErrors(['error' => __('Payment failed. Please try again.')]);

        } catch (\Stripe\Exception\CardException $e) {
            \Log::error('Stripe Card Exception: ' . $e->getMessage());
            return back()->withErrors(['error' => __('Card error: ') . $e->getError()->message]);
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            \Log::error('Stripe Invalid Request: ' . $e->getMessage());
            return back()->withErrors(['error' => __('Invalid request: ') . $e->getMessage()]);
        } catch (\Exception $e) {
            \Log::error('Stripe payment error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
            return back()->withErrors(['error' => __('Payment processing failed. Please try again.')]);
        }
    }
}