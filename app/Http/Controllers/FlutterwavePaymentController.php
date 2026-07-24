<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use Illuminate\Http\Request;

class FlutterwavePaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        $validated = validatePaymentRequest($request, [
            'payment_id' => 'required|string',
            'tx_ref' => 'required|string',
            'plan_id' => 'required|exists:plans,id',
            'billing_cycle' => 'required|string',
            'coupon_code' => 'nullable|string',
        ]);

        try {
            $plan = Plan::findOrFail($validated['plan_id']);
            $settings = getPaymentGatewaySettings();
            
            if (!isset($settings['payment_settings']['flutterwave_secret_key'])) {
                return back()->withErrors(['error' => __('Flutterwave not configured')]);
            }

            // Verify payment with Flutterwave API
            $curl = curl_init();
            curl_setopt_array($curl, array(
                CURLOPT_URL => "https://api.flutterwave.com/v3/transactions/" . $validated['payment_id'] . "/verify",
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    "Authorization: Bearer " . $settings['payment_settings']['flutterwave_secret_key'],
                    "Content-Type: application/json",
                ],
            ));

            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            curl_close($curl);

            if ($httpCode !== 200) {
                return back()->withErrors(['error' => __('Payment verification failed - API error')]);
            }

            $result = json_decode($response, true);
            
            if (!$result) {
                return back()->withErrors(['error' => __('Payment verification failed - Invalid response')]);
            }

            if ($result['status'] === 'success' && $result['data']['status'] === 'successful') {
                // Calculate expected amount with coupon
                $pricing = calculatePlanPricing($plan, $validated['coupon_code'] ?? null, $validated['billing_cycle']);
                $expectedAmount = (float)$pricing['final_price'];
                
                $paidAmount = (float)$result['data']['amount'];
                
                if (abs($paidAmount - $expectedAmount) > 0.01) {
                    \Log::error('Flutterwave amount mismatch: Expected ' . $expectedAmount . ', Paid ' . $paidAmount);
                    return back()->withErrors(['error' => __('Payment amount verification failed. Expected: :expected, Paid: :paid', ['expected' => $expectedAmount, 'paid' => $paidAmount])]);
                }
                
                processPaymentSuccess([
                    'user_id' => auth()->id(),
                    'plan_id' => $plan->id,
                    'billing_cycle' => $validated['billing_cycle'],
                    'payment_method' => 'flutterwave',
                    'coupon_code' => $validated['coupon_code'] ?? null,
                    'payment_id' => $validated['payment_id'],
                ]);

                // Success logic

                return redirect()->route('plans.index')->with('success', __('Payment successful! Your plan has been activated.'));
            }

            \Log::error('Flutterwave payment failed - result status: ' . ($result['status'] ?? 'unknown'));
            return back()->withErrors(['error' => __('Payment verification failed')]);

        } catch (\Exception $e) {
            return handlePaymentError($e, 'flutterwave');
        }
    }
}