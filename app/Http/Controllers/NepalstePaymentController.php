<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NepalstePaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        $validated = validatePaymentRequest($request, [
            'payment_id' => 'required|string',
            'status' => 'required|string',
        ]);

        try {
            $plan = Plan::findOrFail($validated['plan_id']);
            $settings = getPaymentGatewaySettings();

            if (!isset($settings['payment_settings']['nepalste_public_key']) || !isset($settings['payment_settings']['nepalste_secret_key'])) {
                return back()->withErrors(['error' => __('Nepalste not configured')]);
            }

            if ($validated['status'] !== 'completed') {
                return back()->withErrors(['error' => __('Payment failed or cancelled')]);
            }

            // Fail closed: verify server-side before activating
            if (!$this->verifyNepalstePlan($validated['payment_id'], $plan, $validated)) {
                return back()->withErrors(['error' => __('Payment could not be verified.')]);
            }

            processPaymentSuccess([
                'user_id' => auth()->id(),
                'plan_id' => $plan->id,
                'billing_cycle' => $validated['billing_cycle'],
                'payment_method' => 'nepalste',
                'coupon_code' => $validated['coupon_code'] ?? null,
                'payment_id' => $validated['payment_id'],
            ]);

            return back()->with('success', __('Payment successful and plan activated'));

        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Payment processing failed']);
        }
    }

    private function verifyNepalstePlan(string $paymentId, Plan $plan, array $validated): bool
    {
        $settings = getPaymentGatewaySettings();
        $publicKey = $settings['payment_settings']['nepalste_public_key'] ?? null;
        $secretKey = $settings['payment_settings']['nepalste_secret_key'] ?? null;
        $mode = $settings['payment_settings']['nepalste_mode'] ?? 'sandbox';
        if (empty($publicKey) || empty($secretKey)) {
            return false;
        }

        $pricing = calculatePlanPricing($plan, $validated['coupon_code'] ?? null, $validated['billing_cycle'], auth()->id());

        $baseUrl = $mode === 'live'
            ? 'https://nepalste.com.np/pay/api/v1'
            : 'https://nepalste.com.np/pay/sandbox/api/v1';

        try {
            $tokenResponse = Http::timeout(15)->post($baseUrl . '/access-token', [
                'consumer_key' => $publicKey,
                'consumer_secret' => $secretKey,
            ]);
            if (!$tokenResponse->successful()) {
                Log::warning('Nepalste plan token fetch failed');
                return false;
            }
            $token = $tokenResponse->json()['token'] ?? $tokenResponse->json()['access_token'] ?? null;
            if (!$token) {
                return false;
            }

            $check = Http::withToken($token)->timeout(15)->get($baseUrl . '/payment/check', [
                'payment_id' => $paymentId,
            ]);
            if ($check->status() === 404) {
                $check = Http::withToken($token)->timeout(15)->get($baseUrl . '/payment/status/' . $paymentId);
            }
            if (!$check->successful()) {
                return false;
            }
            $data = $check->json();
            $status = $data['status'] ?? $data['Status'] ?? $data['payment_status'] ?? null;
            if ($status !== null && strtolower((string) $status) !== 'completed') {
                return false;
            }
            $amount = $data['amount'] ?? $data['total_amount'] ?? $data['data']['amount'] ?? null;
            if ($amount !== null && abs((float) $amount - (float) $pricing['final_price']) >= 0.01) {
                Log::warning('Nepalste plan amount mismatch');
                return false;
            }
            // Currency should be NPR
            $currency = $data['currency'] ?? $data['data']['currency'] ?? null;
            if ($currency !== null && strtoupper((string) $currency) !== 'NPR') {
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('Nepalste plan verify error: ' . $e->getMessage());
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

            if (!isset($settings['payment_settings']['nepalste_public_key']) || !isset($settings['payment_settings']['nepalste_secret_key'])) {
                return response()->json(['error' => 'Nepalste not configured'], 400);
            }

            $user = auth()->user();
            $orderId = 'plan_' . $plan->id . '_' . $user->id . '_' . time();

            // First get access token
            $accessToken = $this->getAccessToken($settings['payment_settings']);
            if (!$accessToken) {
                return response()->json(['error' => 'Failed to get access token'], 500);
            }

            $paymentData = [
                'amount' => $pricing['final_price'],
                'purchase_order_id' => $orderId,
                'purchase_order_name' => $plan->name,
                'return_url' => route('nepalste.success', ['order_id' => $orderId, 'plan_id' => $plan->id, 'billing_cycle' => $validated['billing_cycle']]),
                'website_url' => route('plans.index'),
            ];

            $baseUrl = $settings['payment_settings']['nepalste_mode'] === 'live'
                ? 'https://nepalste.com.np/pay/api/v1'
                : 'https://nepalste.com.np/pay/sandbox/api/v1';

            $response = $this->initiateNepalstePayment($baseUrl . '/payment/initiate', $paymentData, $accessToken);

            if ($response && isset($response['payment_url'])) {
                return response()->json([
                    'success' => true,
                    'payment_url' => $response['payment_url'],
                    'order_id' => $orderId
                ]);
            }

            return response()->json(['error' => 'Payment initiation failed'], 500);

        } catch (\Exception $e) {
            Log::error('Nepalste payment creation error: ' . $e->getMessage());
            return response()->json(['error' => 'Payment creation failed'], 500);
        }
    }

    public function success(Request $request)
    {
        try {
            $orderId = $request->input('order_id');
            $planId = $request->input('plan_id');
            $billingCycle = $request->input('billing_cycle') ?? 'monthly';

            if (!$orderId || !$planId) {
                return redirect()->route('plans.index')->with('error', __('Payment verification failed'));
            }

            $plan = Plan::find($planId);
            $user = auth()->user();
            if (!$plan || !$user) {
                return redirect()->route('plans.index')->with('error', __('Payment verification failed'));
            }

            // Server verification before activating (fail closed)
            $settings = getPaymentGatewaySettings();
            $publicKey = $settings['payment_settings']['nepalste_public_key'] ?? null;
            $secretKey = $settings['payment_settings']['nepalste_secret_key'] ?? null;
            if (empty($publicKey) || empty($secretKey)) {
                return redirect()->route('plans.index')->with('error', __('Payment verification failed'));
            }

            $pricing = calculatePlanPricing($plan, null, $billingCycle, $user->id);
            $mode = $settings['payment_settings']['nepalste_mode'] ?? 'sandbox';
            $baseUrl = $mode === 'live'
                ? 'https://nepalste.com.np/pay/api/v1'
                : 'https://nepalste.com.np/pay/sandbox/api/v1';

            try {
                $tokenResponse = Http::timeout(15)->post($baseUrl . '/access-token', [
                    'consumer_key' => $publicKey,
                    'consumer_secret' => $secretKey,
                ]);
                if (!$tokenResponse->successful()) {
                    return redirect()->route('plans.index')->with('error', __('Payment verification failed'));
                }
                $token = $tokenResponse->json()['token'] ?? $tokenResponse->json()['access_token'] ?? null;
                if (!$token) {
                    return redirect()->route('plans.index')->with('error', __('Payment verification failed'));
                }
                $check = Http::withToken($token)->timeout(15)->get($baseUrl . '/payment/check', [
                    'purchase_order_id' => $orderId,
                ]);
                if ($check->status() === 404) {
                    $check = Http::withToken($token)->timeout(15)->get($baseUrl . '/payment/status/' . $orderId);
                }
                if (!$check->successful()) {
                    return redirect()->route('plans.index')->with('error', __('Payment verification failed'));
                }
                $data = $check->json();
                $status = $data['status'] ?? $data['Status'] ?? null;
                if ($status !== null && strtolower((string) $status) !== 'completed') {
                    return redirect()->route('plans.index')->with('error', __('Payment verification failed'));
                }
                $amount = $data['amount'] ?? $data['data']['amount'] ?? null;
                if ($amount !== null && abs((float) $amount - (float) $pricing['final_price']) >= 0.01) {
                    return redirect()->route('plans.index')->with('error', __('Payment verification failed'));
                }
            } catch (\Throwable $e) {
                Log::error('Nepalste success verify error: ' . $e->getMessage());
                return redirect()->route('plans.index')->with('error', __('Payment verification failed'));
            }

            processPaymentSuccess([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'billing_cycle' => $billingCycle,
                'payment_method' => 'nepalste',
                'payment_id' => $orderId,
            ]);

            return redirect()->route('plans.index')->with('success', __('Payment successful and plan activated'));

        } catch (\Exception $e) {
            Log::error('Nepalste success error: ' . $e->getMessage());
            return redirect()->route('plans.index')->with('error', __('Payment processing failed'));
        }
    }

    public function callback(Request $request)
    {
        try {
            $orderId = $request->input('purchase_order_id');
            $status = $request->input('status');

            if (!$orderId || $status !== 'completed') {
                return response()->json(['status' => 'failed'], 400);
            }

            $parts = explode('_', $orderId);
            if (count($parts) < 3) {
                return response()->json(['status' => 'failed'], 400);
            }

            $planId = $parts[1];
            $userId = $parts[2];

            $plan = Plan::find($planId);
            $user = \App\Models\User::find($userId);
            if (!$plan || !$user) {
                return response()->json(['status' => 'failed'], 404);
            }

            // Server verification
            $settings = getPaymentGatewaySettings();
            $publicKey = $settings['payment_settings']['nepalste_public_key'] ?? null;
            $secretKey = $settings['payment_settings']['nepalste_secret_key'] ?? null;
            if (empty($publicKey) || empty($secretKey)) {
                return response()->json(['status' => 'failed'], 403);
            }

            // Recover billing_cycle from cpm_custom if present, else infer
            $billingCycle = 'monthly';
            $custom = $request->input('cpm_custom');
            if ($custom) {
                $decoded = json_decode($custom, true);
                $billingCycle = $decoded['billing_cycle'] ?? $billingCycle;
            }

            $pricing = calculatePlanPricing($plan, null, $billingCycle, $user->id);
            $mode = $settings['payment_settings']['nepalste_mode'] ?? 'sandbox';
            $baseUrl = $mode === 'live'
                ? 'https://nepalste.com.np/pay/api/v1'
                : 'https://nepalste.com.np/pay/sandbox/api/v1';

            try {
                $tokenResponse = Http::timeout(15)->post($baseUrl . '/access-token', [
                    'consumer_key' => $publicKey,
                    'consumer_secret' => $secretKey,
                ]);
                if (!$tokenResponse->successful()) {
                    return response()->json(['status' => 'failed'], 403);
                }
                $token = $tokenResponse->json()['token'] ?? $tokenResponse->json()['access_token'] ?? null;
                if (!$token) {
                    return response()->json(['status' => 'failed'], 403);
                }
                $check = Http::withToken($token)->timeout(15)->get($baseUrl . '/payment/check', [
                    'purchase_order_id' => $orderId,
                    'payment_id' => $request->input('payment_id') ?? $orderId,
                ]);
                if ($check->status() === 404) {
                    $check = Http::withToken($token)->timeout(15)->get($baseUrl . '/payment/status/' . $orderId);
                }
                if (!$check->successful()) {
                    return response()->json(['status' => 'failed'], 403);
                }
                $data = $check->json();
                $serverStatus = $data['status'] ?? $data['Status'] ?? null;
                if ($serverStatus !== null && strtolower((string) $serverStatus) !== 'completed') {
                    return response()->json(['status' => 'failed'], 403);
                }
                $serverAmount = $data['amount'] ?? $data['data']['amount'] ?? null;
                if ($serverAmount !== null && abs((float) $serverAmount - (float) $pricing['final_price']) >= 0.01) {
                    return response()->json(['status' => 'failed'], 403);
                }
            } catch (\Throwable $e) {
                Log::error('Nepalste callback verify error: ' . $e->getMessage());
                return response()->json(['status' => 'failed'], 403);
            }

            processPaymentSuccess([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'billing_cycle' => $billingCycle,
                'payment_method' => 'nepalste',
                'payment_id' => $request->input('payment_id') ?? $orderId,
            ]);

            return response()->json(['status' => 'success']);

        } catch (\Exception $e) {
            Log::error('Nepalste callback error: ' . $e->getMessage());
            return response()->json(['error' => 'Callback processing failed'], 500);
        }
    }

    private function getAccessToken($settings)
    {
        try {
            $baseUrl = $settings['nepalste_mode'] === 'live'
                ? 'https://nepalste.com.np/pay/api/v1'
                : 'https://nepalste.com.np/pay/sandbox/api/v1';

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $baseUrl . '/access-token');
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                'consumer_key' => $settings['nepalste_public_key'],
                'consumer_secret' => $settings['nepalste_secret_key']
            ]));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                $decoded = json_decode($response, true);
                return $decoded['token'] ?? null;
            }

            return null;

        } catch (\Exception $e) {
            Log::error('Nepalste access token error: ' . $e->getMessage());
            return null;
        }
    }

    private function initiateNepalstePayment($url, $data, $token)
    {
        try {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $token,
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                $decoded = json_decode($response, true);
                if ($decoded && isset($decoded['payment_url'])) {
                    return $decoded;
                }
            }

            return false;

        } catch (\Exception $e) {
            Log::error('Nepalste payment request error: ' . $e->getMessage());
            return false;
        }
    }
}
