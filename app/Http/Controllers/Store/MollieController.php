<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MollieController extends Controller
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

            // Server-side verification with Mollie SDK
            $mollieConfig = getPaymentMethodConfig('mollie', $order->store->user->id, $order->store_id);

            if (!$mollieConfig['enabled'] || !$mollieConfig['api_key']) {
                return redirect()->to($this->getStoreHomeUrl($order->store, $storeSlug))
                    ->withErrors(['error' => __('Mollie is not configured.')]);
            }

            $mollie = new \Mollie\Api\MollieApiClient();
            $mollie->setApiKey($mollieConfig['api_key']);

            $payment = $mollie->payments->get($order->payment_transaction_id);

            if ($payment->isPaid()) {
                if ($order->payment_status === 'pending') {
                    $order->update([
                        'status'          => 'confirmed',
                        'payment_status'  => 'paid',
                        'payment_details' => array_merge($order->payment_details ?? [], [
                            'completed_at'               => now(),
                            'verified_by_success_redirect' => true,
                            'mollie_status'              => $payment->status,
                        ]),
                    ]);
                }

                return redirect()->to($this->getStoreHomeUrl($order->store, $storeSlug) . '?payment_status=success&order_number=' . $order->order_number)
                    ->with('payment_status', 'success')
                    ->with('order_number', $order->order_number)
                    ->with('success', __('Payment completed successfully!'));
            }

            // Payment not completed
            return redirect()->to($this->getStoreHomeUrl($order->store, $storeSlug) . '?payment_status=warning&order_number=' . $order->order_number)
                ->with('payment_status', 'warning')
                ->with('order_number', $order->order_number)
                ->with('warning', __('Payment is being processed. Your order will be confirmed once payment is verified.'));

        } catch (\Exception $e) {
            Log::error('Wusool Mollie success error: ' . $e->getMessage());
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
            $molliePaymentId = $request->input('id');

            if (!$molliePaymentId) {
                return response()->json(['error' => 'Missing payment ID'], 400);
            }

            $order = Order::where('payment_transaction_id', $molliePaymentId)->first();
            if (!$order) {
                return response()->json(['error' => 'Order not found'], 404);
            }

            $mollieConfig = getPaymentMethodConfig('mollie', $order->store->user->id, $order->store_id);

            $mollie = new \Mollie\Api\MollieApiClient();
            $mollie->setApiKey($mollieConfig['api_key']);

            $payment = $mollie->payments->get($molliePaymentId);

            if ($payment->isPaid()) {
                if ($order->payment_status === 'pending') {
                    $order->update([
                        'status'          => 'confirmed',
                        'payment_status'  => 'paid',
                        'payment_details' => array_merge($order->payment_details ?? [], [
                            'verified_by_webhook' => true,
                            'completed_at'        => now(),
                            'mollie_status'       => $payment->status,
                        ]),
                    ]);
                }
            } elseif ($payment->isFailed() || $payment->isExpired() || $payment->isCanceled()) {
                $order->update([
                    'payment_status' => 'failed',
                    'status'         => 'cancelled',
                ]);
            }

            return response()->json(['status' => 'OK']);

        } catch (\Exception $e) {
            Log::error('Wusool Mollie callback error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
