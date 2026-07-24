<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class CashfreeController extends Controller
{
    /**
     * Get Cashfree API configuration for a specific store
     */
    private function getCashfreeConfig($storeId)
    {
        $store = Store::find($storeId);
        if (!$store) return null;

        $cashfreeConfig = getPaymentMethodConfig('cashfree', $store->user->id, $storeId);
        
        if (!$cashfreeConfig['enabled']) return null;

        $mode = $cashfreeConfig['mode'] ?? 'sandbox';
        $baseUrl = $mode === 'production' 
            ? 'https://api.cashfree.com/pg' 
            : 'https://sandbox.cashfree.com/pg';

        return [
            'app_id' => $cashfreeConfig['public_key'],
            'secret_key' => $cashfreeConfig['secret_key'],
            'mode' => $mode,
            'base_url' => $baseUrl,
            'currency' => $cashfreeConfig['currency'] ?? 'INR'
        ];
    }

    /**
     * Make Cashfree API call
     */
    private function makeCashfreeApiCall($config, $method, $endpoint, $data = null)
    {
        $headers = [
            'x-client-id' => $config['app_id'],
            'x-client-secret' => $config['secret_key'],
            'x-api-version' => '2023-08-01',
            'Accept' => 'application/json'
        ];

        if ($data) {
            $headers['Content-Type'] = 'application/json';
        }

        $url = $config['base_url'] . $endpoint;

        $response = Http::withHeaders($headers)->$method($url, $data);
        
        if (!$response->successful()) {
            Log::error('Store Cashfree API Error', [
                'url' => $url,
                'status' => $response->status(),
                'body' => $response->body()
            ]);
            throw new \Exception('API Error: ' . ($response->json()['message'] ?? $response->body()));
        }

        return $response->json();
    }

    /**
     * Handle Cashfree payment verification for store orders
     */
    public function verifyPayment(Request $request, $storeSlug)
    {
        $request->validate([
            'order_id' => 'required|exists:orders,id',
            'cf_payment_id' => 'nullable|string'
        ]);

        try {
            $order = Order::findOrFail($request->order_id);
            $config = $this->getCashfreeConfig($order->store_id);
            
            if (!$config) {
                return response()->json(['error' => 'Cashfree not configured for this store'], 400);
            }
            
            $cashfreeOrderId = $order->payment_transaction_id;
            if (!$cashfreeOrderId) {
                return response()->json(['error' => 'Cashfree order ID not found'], 400);
            }
            
            // Fetch order status
            $orderData = $this->makeCashfreeApiCall($config, 'get', '/orders/' . $cashfreeOrderId);
            
            if (($orderData['order_status'] ?? '') !== 'PAID') {
                return response()->json(['error' => 'Payment not completed. Status: ' . ($orderData['order_status'] ?? 'UNKNOWN')], 400);
            }
            
            // Get payment details
            $payments = $this->makeCashfreeApiCall($config, 'get', '/orders/' . $cashfreeOrderId . '/payments');
            
            $successfulPayment = null;
            if (is_array($payments)) {
                foreach ($payments as $payment) {
                    if (($payment['payment_status'] ?? '') === 'SUCCESS') {
                        $successfulPayment = $payment;
                        break;
                    }
                }
            }
            
            if (!$successfulPayment) {
                return response()->json(['error' => 'No successful payment found'], 400);
            }
            
            // Update order status
            $order->update([
                'status' => 'confirmed',
                'payment_status' => 'paid',
                'payment_details' => array_merge($order->payment_details ?? [], [
                    'cashfree_payment_id' => $successfulPayment['cf_payment_id'],
                    'payment_amount' => $successfulPayment['payment_amount'],
                    'payment_time' => $successfulPayment['payment_time'],
                    'verified_at' => now(),
                ]),
            ]);
            
            return response()->json(['success' => true]);
            
        } catch (\Exception $e) {
            Log::error('Store Cashfree verification failed', [
                'error' => $e->getMessage(),
                'order_id' => $request->order_id
            ]);
            return response()->json(['error' => 'Payment verification failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Handle Cashfree webhook for store orders
     */
    public function webhook(Request $request, $storeSlug)
    {
        try {            
            $signature = $request->header('x-webhook-signature');
            $timestamp = $request->header('x-webhook-timestamp');
            $rawBody = $request->getContent();
            
            if (!$signature || !$timestamp) {
                return response()->json(['error' => 'Missing signature'], 400);
            }
            
            $data = $request->json()->all();
            
            if (($data['type'] ?? '') !== 'PAYMENT_SUCCESS_WEBHOOK') {
                return response()->json(['status' => 'ignored']);
            }
            
            $orderData = $data['data']['order'] ?? [];
            $orderTags = $orderData['order_tags'] ?? [];
            
            if (!isset($orderTags['store_order_id'])) {
                return response()->json(['error' => 'Store order ID missing'], 400);
            }
            
            $order = Order::find($orderTags['store_order_id']);
            if (!$order) {
                return response()->json(['error' => 'Order not found'], 404);
            }
            
            $config = $this->getCashfreeConfig($order->store_id);
            if (!$config) {
                return response()->json(['error' => 'Config not found'], 400);
            }
            
            // Verify signature
            $expectedSignature = base64_encode(hash_hmac('sha256', $timestamp . $rawBody, $config['secret_key'], true));
            if (!hash_equals($expectedSignature, $signature)) {
                return response()->json(['error' => 'Invalid signature'], 400);
            }
            
            $paymentData = $data['data']['payment'] ?? [];
            
            // Update order status
            if ($order->payment_status !== 'paid') {
                $order->update([
                    'status' => 'confirmed',
                    'payment_status' => 'paid',
                    'payment_details' => array_merge($order->payment_details ?? [], [
                        'cashfree_payment_id' => $paymentData['cf_payment_id'] ?? null,
                        'payment_amount' => $paymentData['payment_amount'] ?? null,
                        'webhook_received_at' => now(),
                    ]),
                ]);
            }
            
            return response()->json(['status' => 'success']);
            
        } catch (\Exception $e) {
            Log::error('Store Cashfree Webhook Error: ' . $e->getMessage());
            return response()->json(['error' => 'Webhook processing failed'], 500);
        }
    }

    /**
     * Handle success redirect
     */
    public function success(Request $request, $storeSlug, $orderNumber)
    {
        try {
            $order = Order::where('order_number', $orderNumber)->firstOrFail();
            $store = $order->store;
            
            // If order is still pending, try to verify payment from Cashfree
            if ($order->payment_status !== 'paid') {
                $config = $this->getCashfreeConfig($order->store_id);
                
                if ($config && $order->payment_transaction_id) {
                    try {
                        // Fetch order status from Cashfree
                        $orderData = $this->makeCashfreeApiCall($config, 'get', '/orders/' . $order->payment_transaction_id);
                        
                        if (($orderData['order_status'] ?? '') === 'PAID') {
                            // Get payment details
                            $payments = $this->makeCashfreeApiCall($config, 'get', '/orders/' . $order->payment_transaction_id . '/payments');
                            
                            $successfulPayment = null;
                            if (is_array($payments)) {
                                foreach ($payments as $payment) {
                                    if (($payment['payment_status'] ?? '') === 'SUCCESS') {
                                        $successfulPayment = $payment;
                                        break;
                                    }
                                }
                            }
                            
                            if ($successfulPayment) {
                                // Update order status immediately
                                $order->update([
                                    'status' => 'confirmed',
                                    'payment_status' => 'paid',
                                    'payment_details' => array_merge($order->payment_details ?? [], [
                                        'cashfree_payment_id' => $successfulPayment['cf_payment_id'],
                                        'payment_amount' => $successfulPayment['payment_amount'],
                                        'payment_time' => $successfulPayment['payment_time'],
                                        'verified_at_success' => now(),
                                    ]),
                                ]);
                            }
                        }
                    } catch (\Exception $e) {
                        Log::warning('Cashfree success verification failed', ['error' => $e->getMessage()]);
                        // Continue without failing - webhook will handle it
                    }
                }
            }
            
            $host = $request->getHost();

            // Redirect to store home with payment_status flash (same pattern as Stripe)
            if ($store->enable_custom_domain && $store->custom_domain === $host) {
                $redirectUrl = $store->getStoreUrl();
            } else {
                $redirectUrl = route('store.home', $store->slug);
            }

            return redirect($redirectUrl)
                ->with('payment_status', 'success')
                ->with('order_number', $order->order_number)
                ->with('success', __('Payment completed successfully!'));

        } catch (\Exception $e) {
            Log::error('Cashfree Success Redirect Error: ' . $e->getMessage());
            return redirect('/')->with('error', __('Something went wrong.'));
        }
    }
}
