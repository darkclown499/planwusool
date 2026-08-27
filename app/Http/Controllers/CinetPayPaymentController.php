<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CinetPayPaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        $validated = validatePaymentRequest($request, [
            'cpm_trans_id' => 'required|string',
            'cpm_result' => 'required|string',
        ]);

        try {
            $plan = Plan::findOrFail($validated['plan_id']);
            $settings = getPaymentGatewaySettings();

            if (!isset($settings['payment_settings']['cinetpay_site_id'])) {
                return back()->withErrors(['error' => __('CinetPay not configured')]);
            }

            // Fail closed: only 00 is success, and must verify server-side
            if ($validated['cpm_result'] !== '00') {
                return back()->withErrors(['error' => __('Payment failed or cancelled')]);
            }

            // Server-side verification required before activating
            if (!$this->verifyCinetPayPlan($request, $plan, $validated)) {
                return back()->withErrors(['error' => __('Payment could not be verified.')]);
            }

            processPaymentSuccess([
                'user_id' => auth()->id(),
                'plan_id' => $plan->id,
                'billing_cycle' => $validated['billing_cycle'],
                'payment_method' => 'cinetpay',
                'coupon_code' => $validated['coupon_code'] ?? null,
                'payment_id' => $validated['cpm_trans_id'],
            ]);

            return back()->with('success', __('Payment successful and plan activated'));

        } catch (\Exception $e) {
            return handlePaymentError($e, 'cinetpay');
        }
    }

    private function verifyCinetPayPlan(Request $request, Plan $plan, array $validated): bool
    {
        $settings = getPaymentGatewaySettings();
        $apiKey = $settings['payment_settings']['cinetpay_api_key'] ?? null;
        $siteId = $settings['payment_settings']['cinetpay_site_id'] ?? null;

        // Fail closed if credentials missing
        if (empty($apiKey) || empty($siteId)) {
            Log::warning('CinetPay plan verification failed: missing credentials');
            return false;
        }

        $pricing = calculatePlanPricing($plan, $validated['coupon_code'] ?? null, $validated['billing_cycle'], auth()->id());
        // Amount verification: gateway should echo cpm_amount — compare if present
        $gatewayAmount = $request->input('cpm_amount');
        if ($gatewayAmount !== null && abs((float) $gatewayAmount - (float) $pricing['final_price']) >= 0.01) {
            Log::warning('CinetPay plan amount mismatch');
            return false;
        }

        // Server-to-server check via CinetPay API
        try {
            $response = Http::asForm()->post('https://api-checkout.cinetpay.com/v2/payment/check', [
                'apikey' => $apiKey,
                'site_id' => $siteId,
                'transaction_id' => $validated['cpm_trans_id'],
            ]);
            $result = $response->json();
            if (($result['code'] ?? '') !== '00') {
                return false;
            }
            $serverAmount = $result['data']['amount'] ?? null;
            if ($serverAmount !== null && abs((float) $serverAmount - (float) $pricing['final_price']) >= 0.01) {
                Log::warning('CinetPay server amount mismatch');
                return false;
            }
            // Currency must be XOF for CinetPay
            $currency = $result['data']['currency'] ?? $result['data']['cpm_currency'] ?? $request->input('cpm_currency');
            if ($currency !== null && strtoupper((string) $currency) !== 'XOF') {
                return false;
            }
            return true;
        } catch (\Throwable $e) {
            Log::error('CinetPay plan verify error: ' . $e->getMessage());
            return false;
        }
    }

    public function createPayment(Request $request)
    {
        $validated = validatePaymentRequest($request);

        try {
            $plan = Plan::findOrFail($validated['plan_id']);
            $pricing = calculatePlanPricing($plan, $validated['coupon_code'] ?? null, $validated['billing_cycle']);
            $settings = getPaymentGatewaySettings();

            if (!isset($settings['payment_settings']['cinetpay_site_id'])) {
                return response()->json(['error' => __('CinetPay not configured')], 400);
            }

            $user = auth()->user();
            $transactionId = 'plan_' . $plan->id . '_' . $user->id . '_' . time();

            $paymentData = [
                'cpm_site_id' => $settings['payment_settings']['cinetpay_site_id'],
                'cpm_trans_id' => $transactionId,
                'cpm_amount' => $pricing['final_price'],
                'cpm_currency' => 'XOF',
                'cpm_designation' => $plan->name,
                'cpm_custom' => json_encode([
                    'plan_id' => $plan->id,
                    'user_id' => $user->id,
                    'billing_cycle' => $validated['billing_cycle'],
                ]),
                'cpm_page_action' => 'PAYMENT',
                'cpm_version' => 'V2',
                'cpm_language' => 'fr',
                'cpm_return_url' => route('cinetpay.success'),
                'cpm_notify_url' => route('cinetpay.callback'),
                'cpm_error_url' => route('plans.index'),
            ];

            $baseUrl = 'https://www.cinetpay.com/payment/';

            return response()->json([
                'success' => true,
                'payment_url' => $baseUrl,
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
            $transactionId = $request->input('cpm_trans_id');
            $result = $request->input('cpm_result');

            if (!$transactionId || $result !== '00') {
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
            $apiKey = $settings['payment_settings']['cinetpay_api_key'] ?? null;
            $siteId = $settings['payment_settings']['cinetpay_site_id'] ?? null;
            if (empty($apiKey) || empty($siteId)) {
                return response()->json(['status' => 'failed'], 403);
            }

            $customData = json_decode($request->input('cpm_custom'), true);
            $billingCycle = $customData['billing_cycle'] ?? 'monthly';
            $couponCode = $customData['coupon_code'] ?? null;

            $pricing = calculatePlanPricing($plan, $couponCode, $billingCycle, $user->id);

            // Server verification before activating
            try {
                $response = Http::asForm()->post('https://api-checkout.cinetpay.com/v2/payment/check', [
                    'apikey' => $apiKey,
                    'site_id' => $siteId,
                    'transaction_id' => $transactionId,
                ]);
                $check = $response->json();
                if (($check['code'] ?? '') !== '00') {
                    return response()->json(['status' => 'failed'], 403);
                }
                $serverAmount = $check['data']['amount'] ?? null;
                if ($serverAmount !== null && abs((float) $serverAmount - (float) $pricing['final_price']) >= 0.01) {
                    return response()->json(['status' => 'failed'], 403);
                }
            } catch (\Throwable $e) {
                Log::error('CinetPay callback verify error: ' . $e->getMessage());
                return response()->json(['status' => 'failed'], 403);
            }

            processPaymentSuccess([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'billing_cycle' => $billingCycle,
                'payment_method' => 'cinetpay',
                'payment_id' => $transactionId,
            ]);

            return response()->json(['status' => 'success']);

        } catch (\Exception $e) {
            return response()->json(['error' => __('Callback processing failed')], 500);
        }
    }
}
