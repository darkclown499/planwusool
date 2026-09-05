<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\User;
use App\Models\PlanOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SkrillPaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        $validated = validatePaymentRequest($request, [
            'email' => 'required|email',
        ]);

        try {
            $superAdminId = User::where('type', 'superadmin')->first()?->id;
            $settings = getPaymentMethodConfig('skrill', $superAdminId);

            if (empty($settings['merchant_id']) || empty($settings['secret_word'])) {
                return back()->withErrors(['error' => __('Skrill is not configured correctly')]);
            }

            $plan = Plan::findOrFail($validated['plan_id']);
            $pricing = calculatePlanPricing($plan, $validated['coupon_code'] ?? null, $validated['billing_cycle']);

            // Wusool: a $0 total (e.g. 100% coupon) is activated directly
            // without redirecting the customer to the gateway.
            if ((float) $pricing['final_price'] <= 0) {
                processPaymentSuccess([
                    'user_id' => auth()->id(),
                    'plan_id' => $plan->id,
                    'billing_cycle' => $validated['billing_cycle'],
                    'payment_method' => 'skrill',
                    'coupon_code' => $validated['coupon_code'] ?? null,
                    'payment_id' => null,
                ]);

                if ($request->wantsJson()) {
                    return response()->json([
                        'success' => true,
                        'zero_total' => true,
                        'skrill_endpoint' => null,
                        'skrill_data' => null,
                    ]);
                }

                return back()->with('success', __('Plan activated'));
            }

            // Server-generated transaction id bound to a pending PlanOrder.
            // The client-supplied transaction_id/payment_id values are ignored.
            $transactionId = 'SKRILL-' . strtoupper(Str::random(20));

            createPlanOrder([
                'user_id' => auth()->id(),
                'plan_id' => $validated['plan_id'],
                'billing_cycle' => $validated['billing_cycle'],
                'payment_method' => 'skrill',
                'coupon_code' => $validated['coupon_code'] ?? null,
                'payment_id' => $transactionId,
                'status' => 'pending'
            ]);

            $paymentData = [
                'pay_to_email' => $settings['merchant_id'],
                'transaction_id' => $transactionId,
                'return_url' => route('plans.index'),
                'cancel_url' => route('plans.index'),
                'status_url' => route('skrill.callback'),
                'language' => 'EN',
                'amount' => $pricing['final_price'],
                'currency' => 'USD',
                'detail1_description' => 'Plan Subscription',
                'detail1_text' => $plan->name,
                'pay_from_email' => $validated['email']
            ];

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'skrill_endpoint' => 'https://www.moneybookers.com/app/payment.pl',
                    'skrill_data' => $paymentData
                ]);
            }

            // Create form and auto-submit to Skrill
            $form = '<form id="skrill-form" method="POST" action="https://www.moneybookers.com/app/payment.pl">';
            foreach ($paymentData as $key => $value) {
                $form .= '<input type="hidden" name="' . $key . '" value="' . $value . '">';
            }
            $form .= '</form><script>document.getElementById("skrill-form").submit();</script>';

            return response($form);
        } catch (\Exception $e) {
            return handlePaymentError($e, 'skrill');
        }
    }

    public function callback(Request $request)
    {
        // Skrill IPN - called in the background by Skrill servers.
        // Always acknowledge with HTTP 200 so Skrill stops retrying.
        $transactionId = $request->input('transaction_id');
        $status = $request->input('status');

        $planOrder = PlanOrder::where('payment_id', $transactionId)
            ->where('payment_method', 'skrill')
            ->latest('id')
            ->first();

        if ($planOrder && $planOrder->status === 'pending') {
            $superAdminId = User::where('type', 'superadmin')->first()?->id;
            $settings = getPaymentMethodConfig('skrill', $superAdminId);

            $merchantId = $request->input('merchant_id');
            $amount = $request->input('mb_amount');
            $currency = $request->input('mb_currency');
            $md5sig = $request->input('md5sig');

            $signatureValid = false;
            $merchantMatches = false;
            $amountMatches = false;

            if (! empty($settings['secret_word'])
                && ! empty($merchantId)
                && $amount !== null
                && $currency !== null
                && ! empty($md5sig)
            ) {
                $concatFields = $merchantId
                    . $transactionId
                    . strtoupper(md5($settings['secret_word']))
                    . $amount
                    . $currency
                    . $status;

                // Constant-time comparison of the md5sig signature.
                $signatureValid = hash_equals(strtoupper(md5($concatFields)), strtoupper((string) $md5sig));
                $merchantMatches = $merchantId === $settings['merchant_id'];
                $amountMatches = abs((float) $amount - (float) $planOrder->final_price) < 0.01;
            }

            if ($signatureValid && $merchantMatches && $amountMatches && (int) $status === 2) {
                $planOrder->approveIfPending();
            } else {
                Log::warning('Skrill plan callback rejected', [
                    'transaction_id' => $transactionId,
                    'plan_order_id' => $planOrder->id,
                    'signature_valid' => $signatureValid,
                    'merchant_matches' => $merchantMatches,
                    'amount_matches' => $amountMatches,
                    'status' => $status,
                    'expected_amount' => $planOrder->final_price,
                    'amount' => $amount,
                    'currency' => $currency,
                ]);
            }
        }

        return response('OK', 200);
    }
}