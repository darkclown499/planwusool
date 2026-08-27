<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\PlanOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\Exception\CardException;
use Stripe\Exception\InvalidRequestException;

class StripePaymentController extends PaymentGatewayController
{
    protected function gatewayName(): string
    {
        return 'stripe';
    }

    protected function validationRules(): array
    {
        return array_merge(parent::validationRules(), [
            'payment_method_id' => 'required|string',
            'cardholder_name' => 'required|string',
        ]);
    }

    protected function processCharged(Request $request, Plan $plan, array $pricing): array
    {
        $stripeSettings = \App\Models\PaymentSetting::getUserSettings(1);

        if (($stripeSettings['is_stripe_enabled'] ?? '0') !== '1') {
            return ['success' => false, 'message' => __('Stripe payment is not enabled')];
        }
        if (!isset($stripeSettings['stripe_secret']) || !isset($stripeSettings['stripe_key'])) {
            return ['success' => false, 'message' => __('Stripe not configured properly')];
        }

        $stripeSecret = $stripeSettings['stripe_secret'];
        if (!str_starts_with($stripeSecret, 'sk_')) {
            return ['success' => false, 'message' => __('Invalid Stripe secret key format')];
        }

        Stripe::setApiKey($stripeSecret);
        $user = auth()->user();
        $currency = strtolower(getPaymentGatewaySettings()['general_settings']['defaultCurrency'] ?? 'usd');

        $paymentIntent = PaymentIntent::create([
            'amount' => (int)round($pricing['final_price'] * 100),
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
                'final_price' => (string)$pricing['final_price'],
            ],
        ]);

        if ($paymentIntent->status === 'succeeded') {
            return [
                'success' => true,
                'reference_id' => $paymentIntent->id,
                'needs_order_creation' => true,
            ];
        }

        if ($paymentIntent->status === 'requires_action' && !empty($paymentIntent->next_action->redirect_to_url->url)) {
            return [
                'success' => true,
                'reference_id' => $paymentIntent->id,
                'needs_order_creation' => false, // handled on return
                'redirect_url' => $paymentIntent->next_action->redirect_to_url->url,
            ];
        }

        return ['success' => false, 'message' => __('Payment failed. Please try again.')];
    }

    /**
     * Handle the customer's return from 3D Secure authentication.
     */
    public function paymentReturn(Request $request)
    {
        $paymentIntentId = $request->input('payment_intent');

        if (!$paymentIntentId) {
            return redirect()->route('plans.index')->with('error', __('Missing payment intent'));
        }

        try {
            $stripeSettings = \App\Models\PaymentSetting::getUserSettings(1);

            if (!isset($stripeSettings['stripe_secret'])) {
                return redirect()->route('plans.index')->with('error', __('Stripe not configured properly'));
            }

            Stripe::setApiKey($stripeSettings['stripe_secret']);

            $paymentIntent = PaymentIntent::retrieve($paymentIntentId);

            if ($paymentIntent->status !== 'succeeded') {
                Log::warning('Stripe return: payment intent not succeeded', [
                    'payment_intent' => $paymentIntentId,
                    'status' => $paymentIntent->status,
                ]);
                return redirect()->route('plans.index')->with('error', __('Payment was not completed.'));
            }

            $metadata = $paymentIntent->metadata ?? [];

            if ((int)($metadata['user_id'] ?? 0) !== (int)auth()->id()) {
                return redirect()->route('plans.index')->with('error', __('Unauthorized payment reference'));
            }

            $plan = Plan::find($metadata['plan_id'] ?? null);
            if (!$plan) {
                return redirect()->route('plans.index')->with('error', __('Plan not found'));
            }

            $billingCycle = $metadata['billing_cycle'] ?? 'yearly';
            $couponCode = $metadata['coupon_code'] ?? null;

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
            if (PlanOrder::where('payment_id', $paymentIntentId)->exists()) {
                return redirect()->route('plans.index')->with('success', __('Payment successful! Your plan has been activated.'));
            }

            $this->createPlanOrderAndActivate(
                auth()->user(),
                $plan,
                new Request(['billing_cycle' => $billingCycle, 'coupon_code' => $couponCode]),
                $pricing,
                $paymentIntentId
            );

            return redirect()->route('plans.index')->with('success', __('Payment successful! Your plan has been activated.'));

        } catch (\Exception $e) {
            \Log::error('Stripe return error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
            return redirect()->route('plans.index')->with('error', __('Payment processing failed. Please try again.'));
        }
    }
}
