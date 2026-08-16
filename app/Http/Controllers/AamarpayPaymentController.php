<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\User;
use App\Models\PlanOrder;
use Illuminate\Http\Request;

class AamarpayPaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        // SECURITY: never trust the client-supplied pay_status. Plan activation
        // only happens after the gateway transaction has been verified
        // server-side in success()/callback() via the Aamarpay query API.
        return back()->with('info', __('Payment is being verified by Aamarpay. Your plan will activate once payment is confirmed.'));
    }

    public function createPayment(Request $request)
    {
        $validated = validatePaymentRequest($request);

        try {
            $plan = Plan::findOrFail($validated['plan_id']);
            $pricing = calculatePlanPricing($plan, $validated['coupon_code'] ?? null, $validated['billing_cycle']);
            $settings = getPaymentGatewaySettings();
            
            if (!isset($settings['payment_settings']['aamarpay_store_id']) || !isset($settings['payment_settings']['aamarpay_signature'])) {
                return response()->json(['error' => __('Aamarpay not configured')], 400);
            }

            $user = auth()->user();
            $orderID = strtoupper(str_replace('.', '', uniqid('', true)));
            $currency = $settings['payment_settings']['currency'] ?? 'BDT';
            $url = 'https://sandbox.aamarpay.com/request.php';

            // Use proper test store_id for sandbox
            $storeId = $settings['payment_settings']['aamarpay_store_id'];
            if ($storeId === 'aamarpaytest') {
                $storeId = 'aamarpaytest'; // This might need to be changed to actual test store ID
            }
            
            $fields = [
                'store_id' => $storeId,
                'amount' => $pricing['final_price'],
                'payment_type' => '',
                'currency' => $currency,
                'tran_id' => $orderID,
                'cus_name' => $user->name ?? 'Customer',
                'cus_email' => $user->email,
                'cus_add1' => '',
                'cus_add2' => '',
                'cus_city' => '',
                'cus_state' => '',
                'cus_postcode' => '',
                'cus_country' => '',
                'cus_phone' => '1234567890',
                'success_url' => route('aamarpay.success', [
                    'response' => 'success',
                    'coupon' => $validated['coupon_code'] ?? '',
                    'plan_id' => $plan->id,
                    'price' => $pricing['final_price'],
                    'order_id' => $orderID,
                    'user_id' => $user->id,
                    'billing_cycle' => $validated['billing_cycle']
                ]),
                'fail_url' => route('aamarpay.success', [
                    'response' => 'failure',
                    'coupon' => $validated['coupon_code'] ?? '',
                    'plan_id' => $plan->id,
                    'price' => $pricing['final_price'],
                    'order_id' => $orderID
                ]),
                'cancel_url' => route('aamarpay.success', ['response' => 'cancel']),
                'signature_key' => $settings['payment_settings']['aamarpay_signature'],
                'desc' => 'Plan: ' . $plan->name,
            ];

            $fields_string = http_build_query($fields);

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_VERBOSE, true);
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $fields_string);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $response = curl_exec($ch);
            $url_forward = str_replace('"', '', stripslashes($response));
            curl_close($ch);

            if ($url_forward) {
                return $this->redirectToMerchant($url_forward);
            }

            return response()->json(['error' => __('Payment creation failed')], 500);

        } catch (\Exception $e) {
            return response()->json(['error' => __('Payment creation failed')], 500);
        }
    }

    private function redirectToMerchant($url)
    {
        $token = csrf_token();
        $redirectUrl = 'https://sandbox.aamarpay.com/' . $url;
        
        return response(view('aamarpay-redirect', compact('redirectUrl', 'token')));
    }

    public function success(Request $request)
    {
        try {
            $response = $request->input('response');
            $planId = $request->input('plan_id');
            $coupon = $request->input('coupon');
            $billingCycle = $request->input('billing_cycle', 'monthly');
            $orderId = $request->input('order_id');

            // SECURITY: activate only when the payment is confirmed by the
            // Aamarpay server (transaction query API), the caller owns the
            // plan (no auto-login), and the captured amount matches the price.
            if ($response === 'success' && $orderId && auth()->check()) {
                $settings = getPaymentGatewaySettings();
                $verified = $this->verifyAamarpayTransaction($orderId, $settings['payment_settings'] ?? []);

                if ($verified && strtolower($verified['PAY_STATUS'] ?? '') === 'successful') {
                    $plan = Plan::find($planId);
                    $user = auth()->user();

                    if ($plan && $user && (int) $orderId !== 0) {
                        $pricing = calculatePlanPricing($plan, $coupon ?: null, $billingCycle);
                        $paidAmount = (float) ($verified['AMOUNT'] ?? 0);

                        if (abs($paidAmount - (float) $pricing['final_price']) < 0.01) {
                            $existing = PlanOrder::where('payment_id', $orderId)->first();

                            if (!$existing) {
                                processPaymentSuccess([
                                    'user_id' => $user->id,
                                    'plan_id' => $plan->id,
                                    'billing_cycle' => $billingCycle,
                                    'payment_method' => 'aamarpay',
                                    'coupon_code' => $coupon,
                                    'payment_id' => $orderId,
                                ]);
                            }

                            return redirect()->route('plans.index')->with('success', __('Payment completed successfully and plan activated'));
                        }
                    }
                }
            }

            return redirect()->route('plans.index')
                ->with('info', __('Payment is pending server verification. Your plan will activate once confirmed.'));

        } catch (\Exception $e) {
            return redirect()->route('plans.index')->with('error', __('Payment processing failed'));
        }
    }

    public function callback(Request $request)
    {
        try {
            $transactionId = $request->input('mer_txnid');

            if (!$transactionId) {
                return response()->json(['status' => 'error', 'error' => 'Missing transaction id'], 400);
            }

            // SECURITY: never trust the posted pay_status. Confirm the
            // transaction against the Aamarpay query API before approving.
            $settings = getPaymentGatewaySettings();
            $verified = $this->verifyAamarpayTransaction($transactionId, $settings['payment_settings'] ?? []);

            if ($verified && strtolower($verified['PAY_STATUS'] ?? '') === 'successful') {
                $planOrder = PlanOrder::where('payment_id', $transactionId)
                    ->where('status', 'pending')
                    ->first();

                if ($planOrder) {
                    $planOrder->update(['status' => 'approved', 'processed_at' => now()]);
                    assignPlanToUser($planOrder->user, $planOrder->plan, $planOrder->billing_cycle);
                }
            }

            return response()->json(['status' => 'success']);

        } catch (\Exception $e) {
            return response()->json(['error' => __('Callback processing failed')], 500);
        }
    }

    /**
     * Query the Aamarpay transaction-check API for the given merchant
     * transaction id. Returns the gateway response array, or null when the
     * request fails so callers fail closed.
     */
    private function verifyAamarpayTransaction(string $tranId, array $settings): ?array
    {
        $storeId = $settings['aamarpay_store_id'] ?? null;
        $signatureKey = $settings['aamarpay_signature'] ?? null;

        if (!$storeId || !$signatureKey) {
            return null;
        }

        $isSandbox = $storeId === 'aamarpaytest';
        $endpoint = $isSandbox
            ? 'https://sandbox.aamarpay.com/api/v1/trxcheck/request.php'
            : 'https://secure.aamarpay.com/api/v1/trxcheck/request.php';

        try {
            $response = \Illuminate\Support\Facades\Http::asForm()->post($endpoint, [
                'store_id' => $storeId,
                'signature_key' => $signatureKey,
                'type' => 'json',
                'tran_id' => $tranId,
            ]);

            if (!$response->successful()) {
                return null;
            }

            $data = $response->json();
            return is_array($data) ? $data : null;

        } catch (\Throwable $e) {
            return null;
        }
    }
}