<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BenefitController extends Controller
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

            // Server-side verification with Tap API (Benefit uses Tap under the hood)
            $benefitConfig = getPaymentMethodConfig('benefit', $order->store->user->id, $order->store_id);

            if (!$benefitConfig['enabled'] || !$benefitConfig['secret_key']) {
                return redirect()->to($this->getStoreHomeUrl($order->store, $storeSlug))
                    ->withErrors(['error' => __('Benefit payment is not configured.')]);
            }

            $paymentId = $order->payment_transaction_id;

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $benefitConfig['secret_key'],
                'accept'        => 'application/json',
            ])->get('https://api.tap.company/v2/charges/' . $paymentId);

            if ($response->successful()) {
                $payment = $response->json();

                if (isset($payment['status']) && $payment['status'] === 'CAPTURED') {
                    if ($order->payment_status === 'pending') {
                        $order->update([
                            'status'          => 'confirmed',
                            'payment_status'  => 'paid',
                            'payment_details' => array_merge($order->payment_details ?? [], [
                                'completed_at'               => now(),
                                'verified_by_success_redirect' => true,
                                'benefit_tap_data'           => $payment,
                            ]),
                        ]);
                    }

                    return redirect()->to($this->getStoreHomeUrl($order->store, $storeSlug) . '?payment_status=success&order_number=' . $order->order_number)
                        ->with('payment_status', 'success')
                        ->with('order_number', $order->order_number)
                        ->with('success', __('Payment completed successfully!'));
                }
            }

            // Payment not confirmed yet
            return redirect()->to($this->getStoreHomeUrl($order->store, $storeSlug) . '?payment_status=warning&order_number=' . $order->order_number)
                ->with('payment_status', 'warning')
                ->with('order_number', $order->order_number)
                ->with('warning', __('Payment is being processed. Your order will be confirmed once Benefit verifies the payment.'));

        } catch (\Exception $e) {
            Log::error('Wusool Benefit success error: ' . $e->getMessage());
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
            $payload   = $request->all();
            $paymentId = $payload['id'] ?? null;

            if (!$paymentId) {
                return response('Missing ID', 400);
            }

            $order = Order::where('payment_transaction_id', $paymentId)->first();
            if (!$order) {
                return response('Order not found', 404);
            }

            $benefitConfig = getPaymentMethodConfig('benefit', $order->store->user->id, $order->store_id);

            // Verify with Tap API
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $benefitConfig['secret_key'],
                'accept'        => 'application/json',
            ])->get('https://api.tap.company/v2/charges/' . $paymentId);

            if ($response->successful()) {
                $payment = $response->json();

                if (isset($payment['status']) && $payment['status'] === 'CAPTURED') {
                    if ($order->payment_status === 'pending') {
                        $order->update([
                            'status'          => 'confirmed',
                            'payment_status'  => 'paid',
                            'payment_details' => array_merge($order->payment_details ?? [], [
                                'callback_data'       => $payment,
                                'verified_by_webhook' => true,
                                'completed_at'        => now(),
                            ]),
                        ]);
                    }
                } elseif (in_array($payment['status'] ?? '', ['CANCELLED', 'FAILED', 'DECLINED', 'VOID'])) {
                    $order->update([
                        'payment_status' => 'failed',
                        'status'         => 'cancelled',
                    ]);
                }
            }

            return response('OK', 200);

        } catch (\Exception $e) {
            Log::error('Wusool Benefit callback error: ' . $e->getMessage());
            return response('ERROR', 500);
        }
    }
}
