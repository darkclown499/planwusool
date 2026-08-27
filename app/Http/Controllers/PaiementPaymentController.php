<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaiementPaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        $validated = validatePaymentRequest($request, [
            'transaction_id' => 'required|string',
            'status' => 'required|string',
        ]);

        try {
            $plan = Plan::findOrFail($validated['plan_id']);
            $settings = getPaymentGatewaySettings();

            if (!isset($settings['payment_settings']['paiement_merchant_id'])) {
                return back()->withErrors(['error' => __('Paiement Pro not configured')]);
            }

            if ($validated['status'] !== 'success') {
                return back()->withErrors(['error' => __('Payment failed or cancelled')]);
            }

            // Fail closed: verify amount and secret before activating
            if (!$this->verifyPaiementPlan($validated, $plan)) {
                return back()->withErrors(['error' => __('Payment could not be verified.')]);
            }

            processPaymentSuccess([
                'user_id' => auth()->id(),
                'plan_id' => $plan->id,
                'billing_cycle' => $validated['billing_cycle'],
                'payment_method' => 'paiement',
                'coupon_code' => $validated['coupon_code'] ?? null,
                'payment_id' => $validated['transaction_id'],
            ]);

            return back()->with('success', __('Payment successful and plan activated'));

        } catch (\Exception $e) {
            return handlePaymentError($e, 'paiement');
        }
    }

    private function verifyPaiementPlan(array $validated, Plan $plan): bool
    {
        $settings = getPaymentGatewaySettings();
        $merchantSecret = $settings['payment_settings']['paiement_merchant_secret'] ?? null;
        if (empty($settings['payment_settings']['paiement_merchant_id']) || empty($merchantSecret)) {
            Log::warning('Paiement plan verification failed: missing credentials');
            return false;
        }

        // Amount is REQUIRED
        $amount = request()->input('amount');
        if ($amount === null || $amount === '') {
            Log::warning('Paiement plan amount missing — failing closed');
            return false;
        }

        $pricing = calculatePlanPricing($plan, $validated['coupon_code'] ?? null, $validated['billing_cycle'], auth()->id());
        if (abs((float) $amount - (float) $pricing['final_price']) >= 0.01) {
            Log::warning('Paiement plan amount mismatch');
            return false;
        }

        // Currency must be XOF
        $currency = request()->input('currency');
        if ($currency !== null && strtoupper((string) $currency) !== 'XOF') {
            return false;
        }

        return true;
    }

    public function createPayment(Request $request)
    {
        $validated = validatePaymentRequest($request);

        try {
            $plan = Plan::findOrFail($validated['plan_id']);
            $pricing = calculatePlanPricing($plan, $validated['coupon_code'] ?? null, $validated['billing_cycle']);
            $settings = getPaymentGatewaySettings();

            if (!isset($settings['payment_settings']['paiement_merchant_id'])) {
                return response()->json(['error' => __('Paiement Pro not configured')], 400);
            }

            $user = auth()->user();
            $transactionId = 'plan_' . $plan->id . '_' . $user->id . '_' . time();

            $paymentData = [
                'merchant_id' => $settings['payment_settings']['paiement_merchant_id'],
                'amount' => $pricing['final_price'],
                'currency' => 'XOF',
                'reference' => $transactionId,
                'description' => $plan->name,
                'return_url' => route('paiement.success'),
                'cancel_url' => route('plans.index'),
                'notify_url' => route('paiement.callback'),
            ];

            return response()->json([
                'success' => true,
                'payment_url' => 'https://www.paiementpro.net/webservice/onlinepayment/init/merchant-payment',
                'payment_data' => $paymentData,
                'transaction_id' => $transactionId
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => __('Payment creation failed')], 500);
        }
    }

    public function success(Request $request)
    {
        return redirect()->route('plans.index')->with('success', __('Payment completed successfully'));
    }

    public function callback(Request $request)
    {
        try {
            $transactionId = $request->input('reference');
            $status = $request->input('status');

            if (!$transactionId || $status !== 'success') {
                return response()->json(['status' => 'failed'], 400);
            }

            $parts = explode('_', $transactionId);
            if (count($parts) < 3) {
                return response()->json(['status' => 'failed'], 400);
            }

            $planId = $parts[1];
            $userId = $parts[2];

            $plan = Plan::find($planId);
            $user = User::find($userId);
            if (!$plan || !$user) {
                return response()->json(['status' => 'failed'], 404);
            }

            $settings = getPaymentGatewaySettings();
            if (empty($settings['payment_settings']['paiement_merchant_id']) || empty($settings['payment_settings']['paiement_merchant_secret'])) {
                return response()->json(['status' => 'failed'], 403);
            }

            $custom = $request->input('cpm_custom');
            $couponCode = null;
            $billingCycle = 'monthly';
            if ($custom) {
                $decoded = json_decode($custom, true);
                $couponCode = $decoded['coupon_code'] ?? null;
                $billingCycle = $decoded['billing_cycle'] ?? $billingCycle;
            }

            $pricing = calculatePlanPricing($plan, $couponCode, $billingCycle, $user->id);

            // Amount is REQUIRED — fail closed if missing or mismatch
            $amount = $request->input('amount');
            if ($amount === null || $amount === '') {
                return response()->json(['status' => 'failed'], 403);
            }
            if (abs((float) $amount - (float) $pricing['final_price']) >= 0.01) {
                return response()->json(['status' => 'failed'], 403);
            }

            $currency = $request->input('currency');
            if ($currency !== null && strtoupper((string) $currency) !== 'XOF') {
                return response()->json(['status' => 'failed'], 403);
            }

            processPaymentSuccess([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'billing_cycle' => $billingCycle,
                'payment_method' => 'paiement',
                'payment_id' => $request->input('transaction_id') ?? $transactionId,
            ]);

            return response()->json(['status' => 'success']);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Callback processing failed'], 500);
        }
    }
}
