<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class FlutterwaveController extends Controller
{
    public function success(Request $request, $storeSlug, $orderNumber)
    {
        try {
            $order = Order::where('order_number', $orderNumber)->firstOrFail();
            $storeModel = Store::where('slug', $storeSlug)->firstOrFail();

            $txRef  = $request->input('tx_ref');
            $transactionId = $request->input('transaction_id');

            $isPaid = false;

            // Verify with Flutterwave API using secret key
            $flutterwaveConfig = getPaymentMethodConfig('flutterwave', $storeModel->user->id, $order->store_id);
            $secretKey = $flutterwaveConfig['secret_key'] ?? '';

            // The client-supplied $status is NEVER trusted. Payment is only
            // confirmed by verifying the transaction with the Flutterwave API
            // and checking status, tx_ref, and amount. There is intentionally
            // NO unverified fallback branch.
            if ($secretKey && $transactionId) {
                $response = \Http::withHeaders([
                    'Authorization' => 'Bearer ' . $secretKey,
                    'Content-Type'  => 'application/json',
                ])->get('https://api.flutterwave.com/v3/transactions/' . $transactionId . '/verify');

                if ($response->successful()) {
                    $result = $response->json();

                    if (
                        ($result['status'] ?? '') === 'success' &&
                        ($result['data']['status'] ?? '') === 'successful' &&
                        ($result['data']['tx_ref'] ?? '') === $txRef &&
                        abs((float)($result['data']['amount'] ?? 0) - (float)$order->total_amount) <= 0.01
                    ) {
                        $isPaid = true;

                        if ($order->payment_status !== 'paid') {
                            $order->update([
                                'status'          => 'confirmed',
                                'payment_status'  => 'paid',
                                'payment_details' => array_merge($order->payment_details ?? [], [
                                    'flutterwave_transaction_id' => $transactionId,
                                    'tx_ref'       => $txRef,
                                    'amount'       => $result['data']['amount'],
                                    'verified_at'  => now(),
                                ]),
                            ]);
                        }
                    } else {
                        Log::warning('Flutterwave store payment verification failed', [
                            'order_number'  => $orderNumber,
                            'status'        => $result['data']['status'] ?? 'unknown',
                            'tx_ref_match'  => ($result['data']['tx_ref'] ?? '') === $txRef,
                            'amount_paid'   => $result['data']['amount'] ?? 0,
                            'amount_expected' => $order->total_amount,
                        ]);
                    }
                }
            }

            if ($isPaid) {
                return redirect()->to($this->getStoreHomeUrl($storeModel, $storeSlug))
                    ->with('payment_status', 'success')
                    ->with('order_number', $order->order_number)
                    ->with('success', __('Payment completed successfully!'));
            }

            return redirect()->to($this->getStoreHomeUrl($storeModel, $storeSlug))
                ->with('payment_status', 'failed')
                ->withErrors(['error' => __('Payment was not completed or verification failed.')]);

        } catch (\Exception $e) {
            Log::error('Flutterwave Store Success Error: ' . $e->getMessage());
            $storeModel = Store::where('slug', $storeSlug)->first();
            return redirect()->to($this->getStoreHomeUrl($storeModel, $storeSlug))
                ->with('payment_status', 'failed')
                ->withErrors(['error' => __('Payment verification failed: ') . $e->getMessage()]);
        }
    }

    private function getStoreHomeUrl($store, $storeSlug)
    {
        if (!$store) {
            return route('store.home', $storeSlug);
        }

        if ($store->isCurrentDomain()) {
            return $store->getStoreUrl();
        }

        return route('store.home', $store->slug);
    }
}
