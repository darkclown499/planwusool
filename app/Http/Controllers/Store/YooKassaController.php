<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use YooKassa\Client;

class YooKassaController extends Controller
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

            $yookassaConfig = getPaymentMethodConfig('yookassa', $order->store->user->id, $order->store_id);

            if (!$yookassaConfig['enabled'] || !$yookassaConfig['shop_id'] || !$yookassaConfig['secret_key']) {
                return redirect()->to($this->getStoreHomeUrl($order->store, $storeSlug))
                    ->withErrors(['error' => __('YooKassa is not configured.')]);
            }

            if (empty($order->payment_transaction_id)) {
                return redirect()->to($this->getStoreHomeUrl($order->store, $storeSlug))
                    ->withErrors(['error' => __('Payment transaction ID missing.')]);
            }

            // Server-side verification with YooKassa SDK
            $client = new Client();
            $client->setAuth((int) $yookassaConfig['shop_id'], $yookassaConfig['secret_key']);

            $payment = $client->getPaymentInfo($order->payment_transaction_id);

            if ($payment && $payment->getStatus() === 'succeeded') {
                if ($order->payment_status === 'pending') {
                    $order->update([
                        'status'          => 'confirmed',
                        'payment_status'  => 'paid',
                        'payment_details' => array_merge($order->payment_details ?? [], [
                            'completed_at'               => now(),
                            'verified_by_success_redirect' => true,
                            'yookassa_details'           => [
                                'id'       => $payment->getId(),
                                'status'   => $payment->getStatus(),
                                'amount'   => $payment->getAmount()->getValue(),
                                'currency' => $payment->getAmount()->getCurrency(),
                            ],
                        ]),
                    ]);
                }

                return redirect()->to($this->getStoreHomeUrl($order->store, $storeSlug) . '?payment_status=success&order_number=' . $order->order_number)
                    ->with('payment_status', 'success')
                    ->with('order_number', $order->order_number)
                    ->with('success', __('Payment completed successfully!'));
            }

            $errorMessage = __('Payment was not successful. Status: ') . ($payment ? $payment->getStatus() : 'Unknown');
            return redirect()->to($this->getStoreHomeUrl($order->store, $storeSlug) . '?payment_status=failed&order_number=' . $order->order_number)
                ->with('payment_status', 'failed')
                ->withErrors(['error' => $errorMessage]);

        } catch (\Exception $e) {
            Log::error('Wusool YooKassa success error: ' . $e->getMessage());
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
            $paymentId = $request->input('object.id');
            $status    = $request->input('object.status');

            if (!$paymentId) {
                return response('Missing ID', 400);
            }

            $order = Order::where('payment_transaction_id', $paymentId)->first();
            if (!$order) {
                return response('Order not found', 404);
            }

            $yookassaConfig = getPaymentMethodConfig('yookassa', $order->store->user->id, $order->store_id);

            // Verify with YooKassa SDK
            $client = new Client();
            $client->setAuth((int) $yookassaConfig['shop_id'], $yookassaConfig['secret_key']);

            $payment = $client->getPaymentInfo($paymentId);

            if ($payment && $payment->getStatus() === 'succeeded') {
                if ($order->payment_status === 'pending') {
                    $order->update([
                        'status'          => 'confirmed',
                        'payment_status'  => 'paid',
                        'payment_details' => array_merge($order->payment_details ?? [], [
                            'callback_data' => [
                                'id'     => $payment->getId(),
                                'status' => $payment->getStatus(),
                            ],
                            'verified_by_webhook' => true,
                            'completed_at'        => now(),
                        ]),
                    ]);
                }
            } elseif ($payment && $payment->getStatus() === 'canceled') {
                $order->update([
                    'payment_status' => 'failed',
                    'status'         => 'cancelled',
                ]);
            }

            return response('OK', 200);

        } catch (\Exception $e) {
            Log::error('Wusool YooKassa callback error: ' . $e->getMessage());
            return response('ERROR', 500);
        }
    }
}
