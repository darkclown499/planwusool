<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use CoinGate\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CoinGateController extends Controller
{
    public function success(Request $request)
    {
        try {
            $storeSlug   = request()->route('storeSlug') ?? null;
            $orderNumber = request()->route('orderNumber') ?? null;

            $order = Order::where('order_number', $orderNumber)->firstOrFail();

            // Server-side verification with CoinGate API
            $coingateConfig = getPaymentMethodConfig('coingate', $order->store->user->id, $order->store_id);

            if (!$coingateConfig['enabled']) {
                $storeModel = $order ? $order->store : null;
                return redirect()->to($this->getStoreHomeUrl($storeModel, $storeSlug))
                    ->withErrors(['error' => __('Payment method not available')]);
            }

            $client       = new Client($coingateConfig['api_token'], ($coingateConfig['mode'] ?? 'sandbox') === 'sandbox');
            $coingateOrder = $client->order->get((int) $order->payment_transaction_id);

            if ($coingateOrder && $coingateOrder->status === 'paid') {
                if ($order->payment_status === 'pending') {
                    $order->update([
                        'status'          => 'confirmed',
                        'payment_status'  => 'paid',
                        'payment_details' => array_merge($order->payment_details ?? [], [
                            'completed_at'               => now(),
                            'verified_by_success_redirect' => true,
                            'coingate_order_id'          => $coingateOrder->id,
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
                ->with('warning', __('Payment is being processed. Your order will be confirmed once payment is verified by CoinGate.'));

        } catch (\Exception $e) {
            Log::error('Wusool CoinGate success error: ' . $e->getMessage());
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
            $coingateId = $request->input('id');
            if (!$coingateId) {
                Log::error('CoinGate callback: Missing internal ID');
                return response()->json(['error' => 'Missing ID'], 400);
            }

            $order = Order::where('payment_transaction_id', (string) $coingateId)->first();
            if (!$order) {
                Log::error('CoinGate callback: Order not found', ['coingate_id' => $coingateId]);
                return response()->json(['error' => 'Order not found'], 404);
            }

            $coingateConfig = getPaymentMethodConfig('coingate', $order->store->user->id, $order->store_id);

            if (!$coingateConfig['enabled'] || !$coingateConfig['api_token']) {
                return response()->json(['error' => 'Payment gateway not configured'], 400);
            }

            $client       = new Client($coingateConfig['api_token'], ($coingateConfig['mode'] ?? 'sandbox') === 'sandbox');
            $coingateOrder = $client->order->get((int) $coingateId);

            if ($coingateOrder && $coingateOrder->status === 'paid') {
                $order->update([
                    'status'          => 'confirmed',
                    'payment_status'  => 'paid',
                    'payment_details' => array_merge($order->payment_details ?? [], [
                        'coingate_order_id'   => $coingateOrder->id,
                        'payment_amount'      => $coingateOrder->price_amount,
                        'payment_currency'    => $coingateOrder->price_currency,
                        'crypto_amount'       => $coingateOrder->receive_amount ?? null,
                        'crypto_currency'     => $coingateOrder->receive_currency ?? null,
                        'callback_received_at' => now(),
                    ]),
                ]);
            }

            return response()->json(['status' => 'success']);

        } catch (\Exception $e) {
            Log::error('Wusool CoinGate callback error', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Callback processing failed'], 500);
        }
    }
}
