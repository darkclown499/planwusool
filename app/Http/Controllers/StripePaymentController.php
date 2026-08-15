<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

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

            // Calculate pricing (applies coupon if provided)
            $pricing = calculatePlanPricing($plan, $request->coupon_code, $request->billing_cycle, $user->id);
            $finalPrice = $pricing['final_price'];

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

            $currency = strtolower(getPaymentGatewaySettings()['general_settings']['defaultCurrency'] ?? 'usd');

            $paymentIntent = PaymentIntent::create([
                'amount' => (int)round($finalPrice * 100), // Convert to cents
                'currency' => $currency,
                'payment_method' => $request->payment_method_id,
                'confirmation_method' => 'manual',
                'confirm' => true,
                'return_url' => route('stripe.return'),
                'description' => 'Subscription to ' . $plan->name . ' plan (' . $request->billing_cycle . ')',
                'shipping' => [
                    'name' => $request->cardholder_name,
                    'address' => [
                        'line1' => 'Address Line 1',
                        'city' => 'City',
                        'country' => $currency === 'usd' ? 'US' : 'AE',
                        'postal_code' => $currency === 'usd' ? '10001' : '00000',
                    ],
                ],
                'metadata' => [
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'billing_cycle' => $request->billing_cycle,
                    'coupon_code' => $request->coupon_code ?? '',
                    'final_price' => (string)$finalPrice,
                ],
            ]);

            if ($paymentIntent->status === 'succeeded') {
                // Create plan order
                $planOrder = PlanOrder::create([
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'coupon_id' => $pricing['coupon_id'],
                    'original_price' => $pricing['original_price'],
                    'discount_amount' => $pricing['discount_amount'],
                    'final_price' => $pricing['final_price'],
                    'billing_cycle' => $request->billing_cycle,
                    'payment_method' => 'stripe',
                    'payment_id' => $paymentIntent->id,
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
            }

            if ($paymentIntent->status === 'requires_action' && !empty($paymentIntent->next_action->redirect_to_url->url)) {
                // 3D Secure - redirect the customer to complete authentication.
                // The return_url (stripe.return) verifies the payment and activates the plan.
                return Inertia::location($paymentIntent->next_action->redirect_to_url->url);
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

    /**
     * Handle the customer's return from 3D Secure authentication.
     * Verifies the PaymentIntent with Stripe before activating the plan.
     */
    public function paymentReturn(Request $request)
    {
        $paymentIntentId = $request->input('payment_intent');

        if (!$paymentIntentId) {
            return redirect()->route('plans.index')->with('error', __('Missing payment intent'));
        }

        try {
            $stripeSettings = PaymentSetting::getUserSettings(1);

            if (!isset($stripeSettings['stripe_secret'])) {
                return redirect()->route('plans.index')->with('error', __('Stripe not configured properly'));
            }

            Stripe::setApiKey($stripeSettings['stripe_secret']);

            $paymentIntent = PaymentIntent::retrieve($paymentIntentId);

            if ($paymentIntent->status !== 'succeeded') {
                \Log::warning('Stripe return: payment intent not succeeded', [
                    'payment_intent' => $paymentIntentId,
                    'status' => $paymentIntent->status,
                ]);
                return redirect()->route('plans.index')->with('error', __('Payment was not completed.'));
            }

            $metadata = $paymentIntent->metadata ?? [];

            // The metadata user must match the authenticated user
            if ((int)($metadata['user_id'] ?? 0) !== (int)auth()->id()) {
                return redirect()->route('plans.index')->with('error', __('Unauthorized payment reference'));
            }

            $plan = Plan::find($metadata['plan_id'] ?? null);
            if (!$plan) {
                return redirect()->route('plans.index')->with('error', __('Plan not found'));
            }

            $billingCycle = $metadata['billing_cycle'] ?? 'monthly';
            $couponCode = $metadata['coupon_code'] ?? null;

            // Verify amount matches the plan price (with coupon if any)
            $pricing = calculatePlanPricing($plan, $couponCode, $billingCycle, auth()->id());
            $paidAmount = ($paymentIntent->amount ?? 0) / 100;

            if (abs((float)$paidAmount - (float)$pricing['final_price']) > 0.01) {
                \Log::error('Stripe return: amount mismatch', [
                    'expected' => $pricing['final_price'],
                    'paid' => $paidAmount,
                    'payment_intent' => $paymentIntentId,
                ]);
                return redirect()->route('plans.index')->with('error', __('Payment amount does not match the plan price.'));
            }

            // Idempotency guard
            $existingOrder = PlanOrder::where('payment_id', $paymentIntentId)->first();
            if ($existingOrder && $existingOrder->status === 'approved') {
                return redirect()->route('plans.index')->with('success', __('Payment successful! Your plan has been activated.'));
            }

            // Create plan order
            $planOrder = PlanOrder::create([
                'user_id' => auth()->id(),
                'plan_id' => $plan->id,
                'coupon_id' => $pricing['coupon_id'],
                'original_price' => $pricing['original_price'],
                'discount_amount' => $pricing['discount_amount'],
                'final_price' => $pricing['final_price'],
                'billing_cycle' => $billingCycle,
                'payment_method' => 'stripe',
                'payment_id' => $paymentIntentId,
                'status' => 'approved',
                'coupon_code' => $couponCode,
                'order_number' => 'PO-' . strtoupper(Str::random(8)),
                'ordered_at' => now(),
                'processed_at' => now(),
            ]);

            // Assign plan to user
            $planOrder->activateSubscription();

            return redirect()->route('plans.index')->with('success', __('Payment successful! Your plan has been activated.'));

        } catch (\Exception $e) {
            \Log::error('Stripe return error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
            return redirect()->route('plans.index')->with('error', __('Payment processing failed. Please try again.'));
        }
    }
}