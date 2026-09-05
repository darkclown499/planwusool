<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\PlanOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MidtransPaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        $validated = validatePaymentRequest($request, [
            'transaction_status' => 'required|string',
            'order_id' => 'required|string',
        ]);

        try {
            $planOrder = PlanOrder::where('payment_id', $validated['order_id'])
                ->where('user_id', auth()->id())
                ->where('payment_method', 'midtrans')
                ->latest('id')
                ->first();

            if (! $planOrder || $planOrder->status !== 'pending') {
                return back()->withErrors(['error' => __('Payment cannot be processed.')]);
            }

            $midtransConfig = $this->midtransConfig();

            if (empty($midtransConfig['server_key'])) {
                return back()->withErrors(['error' => __('Midtrans not configured')]);
            }

            $status = $this->fetchMidtransStatus($midtransConfig, $validated['order_id']);

            if (! $this->isValidMidtransPayment($status, $planOrder)) {
                Log::warning('Midtrans Snap payment verification failed', [
                    'order_id' => $validated['order_id'],
                    'user_id' => auth()->id(),
                ]);

                return back()->withErrors(['error' => __('Payment verification failed. Please contact support.')]);
            }

            $planOrder->approveIfPending();

            return back()->with('success', __('Payment successful and plan activated'));

        } catch (\Exception $e) {
            return handlePaymentError($e, 'midtrans');
        }
    }

    public function createPayment(Request $request)
    {
        $validated = validatePaymentRequest($request);

        try {
            $plan = Plan::findOrFail($validated['plan_id']);
            $pricing = calculatePlanPricing($plan, $validated['coupon_code'] ?? null, $validated['billing_cycle']);
            $settings = getPaymentGatewaySettings();

            if (!isset($settings['payment_settings']['midtrans_secret_key'])) {
                return response()->json(['error' => __('Midtrans not configured')], 400);
            }

            // Wusool: a $0 total (e.g. 100% coupon) is activated directly
            // without requiring a gateway payment.
            if ((float) $pricing['final_price'] <= 0) {
                processPaymentSuccess([
                    'user_id' => auth()->id(),
                    'plan_id' => $plan->id,
                    'billing_cycle' => $validated['billing_cycle'],
                    'payment_method' => 'midtrans',
                    'coupon_code' => $validated['coupon_code'] ?? null,
                    'payment_id' => null,
                ]);

                return response()->json([
                    'success' => true,
                    'zero_total' => true,
                ]);
            }

            $user = auth()->user();
            $orderId = 'plan_' . $plan->id . '_' . $user->id . '_' . time() . '_' . mt_rand(10000, 99999);

            // Convert to IDR (whole numbers only, no cents)
            $amount = intval($pricing['final_price']);

            // Bind the server-generated order id to a pending PlanOrder so
            // callbacks can only ever approve an order that actually exists
            // for the authenticated user.
            createPlanOrder([
                'user_id' => auth()->id(),
                'plan_id' => $plan->id,
                'billing_cycle' => $validated['billing_cycle'],
                'payment_method' => 'midtrans',
                'coupon_code' => $validated['coupon_code'] ?? null,
                'payment_id' => $orderId,
                'status' => 'pending',
            ]);

            $paymentData = [
                'transaction_details' => [
                    'order_id' => $orderId,
                    'gross_amount' => $amount
                ],
                'credit_card' => [
                    'secure' => true
                ],
                'customer_details' => [
                    'first_name' => $user->name ?? 'Customer',
                    'email' => $user->email,
                ],
                'item_details' => [
                    [
                        'id' => $plan->id,
                        'price' => $amount,
                        'quantity' => 1,
                        'name' => $plan->name
                    ]
                ]
            ];

            $snapToken = $this->createSnapToken($paymentData, $settings['payment_settings']);

            if ($snapToken) {
                $baseUrl = $settings['payment_settings']['midtrans_mode'] === 'live'
                    ? 'https://app.midtrans.com'
                    : 'https://app.sandbox.midtrans.com';

                return response()->json([
                    'success' => true,
                    'snap_token' => $snapToken,
                    'payment_url' => $baseUrl . '/snap/v1/transactions/' . $snapToken,
                    'order_id' => $orderId
                ]);
            }

            throw new \Exception(__('Failed to create Midtrans snap token'));

        } catch (\Exception $e) {
            return response()->json(['error' => __('Payment creation failed')], 500);
        }
    }

    public function callback(Request $request)
    {
        try {
            $orderId = $request->input('order_id');

            if (! $orderId) {
                return response()->json(['error' => 'Missing order ID'], 400);
            }

            $planOrder = PlanOrder::where('payment_id', $orderId)
                ->where('payment_method', 'midtrans')
                ->latest('id')
                ->first();

            if (! $planOrder) {
                return response()->json(['error' => 'Order not found'], 404);
            }

            if ($planOrder->status !== 'pending') {
                return response()->json(['status' => 'OK']);
            }

            $midtransConfig = $this->midtransConfig();

            if (empty($midtransConfig['server_key'])) {
                return response()->json(['error' => 'Midtrans not configured'], 503);
            }

            // Verify the SHA512 webhook signature
            // (order_id + status_code + gross_amount + server_key).
            $signatureKey = $request->input('signature_key');
            $statusCode = $request->input('status_code');
            $grossAmount = $request->input('gross_amount');

            if ($signatureKey === null || $statusCode === null || $grossAmount === null) {
                Log::warning('Midtrans plan callback missing signature fields', ['order_id' => $orderId]);
                return response()->json(['error' => 'Missing signature'], 403);
            }

            $expectedSignature = hash('sha512', $orderId . $statusCode . $grossAmount . $midtransConfig['server_key']);

            if (! hash_equals($expectedSignature, (string) $signatureKey)) {
                Log::warning('Midtrans plan callback signature verification failed', ['order_id' => $orderId]);
                return response()->json(['error' => 'Invalid signature'], 403);
            }

            // Verify the callback amount matches the expected order total.
            $expectedAmount = (float) str_replace(',', '.', (string) $grossAmount);

            if (abs($expectedAmount - (float) $planOrder->final_price) > 0.01) {
                Log::warning('Midtrans plan callback amount mismatch', [
                    'order_id' => $orderId,
                    'callback_amount' => $expectedAmount,
                    'expected_amount' => $planOrder->final_price,
                ]);
                return response()->json(['error' => 'Amount mismatch'], 400);
            }

            // Server-to-server re-verification with the Midtrans status API.
            $status = $this->fetchMidtransStatus($midtransConfig, $orderId);

            if (! $this->isValidMidtransPayment($status, $planOrder)) {
                Log::warning('Midtrans plan callback server verification failed', ['order_id' => $orderId]);
                return response()->json(['error' => 'Payment verification failed'], 400);
            }

            $planOrder->approveIfPending();

            return response()->json(['status' => 'OK']);

        } catch (\Exception $e) {
            Log::error('Wusool Midtrans plan callback error: ' . $e->getMessage());
            return response()->json(['error' => 'Webhook processing failed'], 500);
        }
    }

    private function midtransConfig(): array
    {
        $settings = getPaymentGatewaySettings();
        $paymentSettings = $settings['payment_settings'] ?? [];

        return [
            'server_key' => $paymentSettings['midtrans_secret_key'] ?? null,
            'mode' => $paymentSettings['midtrans_mode'] ?? 'sandbox',
        ];
    }

    private function midtransApiBase(): string
    {
        return $this->midtransConfig()['mode'] === 'live'
            ? 'https://api.midtrans.com'
            : 'https://api.sandbox.midtrans.com';
    }

    private function fetchMidtransStatus(array $config, string $orderId): ?array
    {
        $response = Http::withBasicAuth($config['server_key'], '')
            ->acceptJson()
            ->timeout(15)
            ->get($this->midtransApiBase() . '/v2/' . rawurlencode($orderId) . '/status');

        if (! $response->successful()) {
            Log::warning('Midtrans status API request failed', [
                'order_id' => $orderId,
                'status' => $response->status(),
            ]);

            return null;
        }

        $data = $response->json();

        return is_array($data) ? $data : null;
    }

    private function isValidMidtransPayment(?array $status, PlanOrder $planOrder): bool
    {
        if (! $status) {
            return false;
        }

        if (! in_array($status['transaction_status'] ?? null, ['capture', 'settlement'])) {
            return false;
        }

        if (($status['fraud_status'] ?? null) === 'challenge') {
            return false;
        }

        $actualAmount = (float) ($status['gross_amount'] ?? 0);

        if (abs($actualAmount - (float) $planOrder->final_price) > 0.01) {
            return false;
        }

        return true;
    }

    private function createSnapToken($paymentData, $settings)
    {
        try {
            $baseUrl = $settings['midtrans_mode'] === 'live'
                ? 'https://app.midtrans.com'
                : 'https://app.sandbox.midtrans.com';

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $baseUrl . '/snap/v1/transactions');
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($paymentData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Basic ' . base64_encode($settings['midtrans_secret_key'] . ':'),
                'Content-Type: application/json',
                'Accept: application/json'
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                throw new \Exception(__('cURL Error: ') . $curlError);
            }

            if ($httpCode !== 201) {
                throw new \Exception(__('HTTP Error: ') . $httpCode . ' - ' . $response);
            }

            $result = json_decode($response, true);

            if (!isset($result['token'])) {
                throw new \Exception(__('No token in response: ') . $response);
            }

            return $result['token'];

        } catch (\Exception $e) {
            return false;
        }
    }
}