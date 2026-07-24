<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MidtransController extends Controller
{
    public function success(Request $request)
    {
        try {
            $storeSlug   = request()->route('storeSlug') ?? null;
            $orderNumber = request()->route('orderNumber') ?? null;

            $order = Order::where('order_number', $orderNumber)->first();

            if (!$order) {
                return redirect()->to($this->getStoreHomeUrl(null, $storeSlug))
                    ->withErrors(['error' => __('Order not found.')]);
            }

            // Server-side verification with Midtrans status API
            $midtransConfig = getPaymentMethodConfig('midtrans', $order->store->user->id, $order->store_id);
            $baseUrl        = ($midtransConfig['mode'] ?? 'sandbox') === 'live'
                ? 'https://api.midtrans.com'
                : 'https://api.sandbox.midtrans.com';

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $baseUrl . '/v2/' . $order->payment_transaction_id . '/status');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Basic ' . base64_encode($midtransConfig['secret_key'] . ':'),
                'Accept: application/json',
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $response = curl_exec($ch);
            curl_close($ch);
            $result = json_decode($response, true);

            if (isset($result['transaction_status']) && in_array($result['transaction_status'], ['capture', 'settlement'])) {
                if ($order->payment_status === 'pending') {
                    $order->update([
                        'status'          => 'confirmed',
                        'payment_status'  => 'paid',
                        'payment_details' => array_merge($order->payment_details ?? [], [
                            'completed_at'               => now(),
                            'verified_by_success_redirect' => true,
                            'midtrans_status'            => $result,
                        ]),
                    ]);
                }

                return redirect()->to($this->getStoreHomeUrl($order->store, $storeSlug) . '?payment_status=success&order_number=' . $order->order_number)
                    ->with('payment_status', 'success')
                    ->with('order_number', $order->order_number)
                    ->with('success', __('Payment completed successfully!'));
            }

            // Payment not confirmed yet
            return redirect()->to($this->getStoreHomeUrl($order->store, $storeSlug) . '?payment_status=warning&order_number=' . $order->order_number)
                ->with('payment_status', 'warning')
                ->with('order_number', $order->order_number)
                ->with('warning', __('Payment is being processed. Your order will be confirmed once payment is verified.'));

        } catch (\Exception $e) {
            Log::error('Wusool Midtrans success error: ' . $e->getMessage());
            $storeModel = \App\Models\Store::where('slug', $storeSlug)->first();
            return redirect()->to($this->getStoreHomeUrl($storeModel, $storeSlug))
                ->with('payment_status', 'failed')
                ->withErrors(['error' => 'Payment verification failed: ' . $e->getMessage()]);
        }
    }

    /**
     * Get proper store home URL (custom domain or default)
     */
    private function getStoreHomeUrl($store, $storeSlug)
    {
        if (!$store) {
            return route('store.home', $storeSlug);
        }
        
        // If on custom domain, return root URL
        if ($store->isCurrentDomain()) {
            return $store->getStoreUrl();
        }
        
        // Otherwise use default route
        return route('store.home', $store->slug);
    }

     public function callback(Request $request)
    {
        try {
            $payload           = $request->all();
            $orderId           = $payload['order_id'] ?? null;
            $transactionStatus = $payload['transaction_status'] ?? null;

            if (!$orderId) {
                return response()->json(['error' => 'Missing order ID'], 400);
            }

            $order = Order::where('payment_transaction_id', $orderId)->first();
            if (!$order) {
                return response()->json(['error' => 'Order not found'], 404);
            }

            // Get store Midtrans config (for future signature verification)
            $midtransConfig = getPaymentMethodConfig('midtrans', $order->store->user->id, $order->store_id);

            if (in_array($transactionStatus, ['capture', 'settlement'])) {
                if ($order->payment_status === 'pending') {
                    $order->update([
                        'status'          => 'confirmed',
                        'payment_status'  => 'paid',
                        'payment_details' => array_merge($order->payment_details ?? [], [
                            'callback_data'     => $payload,
                            'verified_by_webhook' => true,
                            'completed_at'      => now(),
                        ]),
                    ]);
                }
            } elseif (in_array($transactionStatus, ['deny', 'expire', 'cancel', 'failure'])) {
                $order->update([
                    'payment_status' => 'failed',
                    'status'         => 'cancelled',
                ]);
            }

            return response()->json(['status' => 'OK']);

        } catch (\Exception $e) {
            Log::error('Wusool Midtrans callback error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
