<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PayTabsController extends Controller
{
    /**
     * Verify the PayTabs transaction server-side using the query API.
     * Returns ['verified' => bool, 'message' => string, 'status' => ?string].
     *
     * @param  string  $tranRef
     * @param  \App\Models\Order  $order
     * @return array{verified: bool, message: string, status: string|null}
     */
    private function verifyTransaction($tranRef, $order)
    {
        if (!$tranRef) {
            return ['verified' => false, 'message' => 'Transaction reference missing', 'status' => null];
        }

        $storeModel = \App\Models\Store::find($order->store_id);
        if (!$storeModel || !$storeModel->user) {
            return ['verified' => false, 'message' => 'Store not found', 'status' => null];
        }

        $paytabsConfig = getPaymentMethodConfig('paytabs', $storeModel->user->id, $order->store_id);
        if (!$paytabsConfig['enabled'] || empty($paytabsConfig['profile_id']) || empty($paytabsConfig['server_key'])) {
            return ['verified' => false, 'message' => 'PayTabs is not configured', 'status' => null];
        }

        config([
            'paytabs.profile_id' => $paytabsConfig['profile_id'],
            'paytabs.server_key' => $paytabsConfig['server_key'],
            'paytabs.region'     => $paytabsConfig['region'] ?? 'global',
        ]);

        $result = \Paytabscom\Laravel_paytabs\Facades\paypage::queryTransaction($tranRef);

        // The query API returns an object/array of verified transaction data.
        $status = is_object($result) ? ($result->transaction_status ?? null) : ($result['transaction_status'] ?? null);
        $cartId = is_object($result) ? ($result->cart_id ?? null) : ($result['cart_id'] ?? null);
        $amount = is_object($result) ? ($result->cart_amount ?? null) : ($result['cart_amount'] ?? null);

        $amountMatches = $amount !== null
            && abs((float) $amount - (float) $order->total_amount) < 0.01;

        $expectedCartId = 'STORE_PT_' . $order->id;
        $cartIdMatches = $cartId === null || strpos((string) $cartId, $expectedCartId) === 0;

        if (!$amountMatches) {
            return ['verified' => false, 'message' => 'Amount mismatch', 'status' => $status];
        }

        if (!$cartIdMatches) {
            return ['verified' => false, 'message' => 'Cart reference mismatch', 'status' => $status];
        }

        return ['verified' => in_array($status, ['A', 'C'], true), 'message' => '', 'status' => $status];
    }

    public function callback(Request $request, $storeSlug, $orderNumber)
    {
        try {
            $cartId    = $request->input('cartId') ?? $request->input('cart_id');
            $tranRef   = $request->input('tranRef') ?? $request->input('tran_ref');

            if (!$cartId) {
                return response('Missing cart ID', 400);
            }

            $order = Order::where('order_number', $orderNumber)->first();

            if (!$order) {
                return response('Order not found', 404);
            }

            // Client-supplied respStatus is NEVER trusted. Re-verify via the
            // PayTabs query API before marking the order as paid.
            $verification = $this->verifyTransaction($tranRef, $order);

            if ($verification['verified']) {
                if ($order->payment_status !== 'paid') {
                    $order->update([
                        'status'         => 'confirmed',
                        'payment_status' => 'paid',
                        'payment_transaction_id' => $tranRef,
                        'payment_details' => array_merge($order->payment_details ?? [], [
                            'paytabs_tran_ref' => $tranRef,
                            'cart_id'          => $cartId,
                            'verified_at'      => now(),
                        ]),
                    ]);
                }
            } else {
                // Only flip to failed if the order was not already paid.
                if ($order->payment_status !== 'paid') {
                    $order->update(['payment_status' => 'failed']);
                }
                Log::warning('PayTabs callback verification failed: ' . $verification['message'], [
                    'order_number' => $orderNumber,
                ]);
            }

            return response('OK', 200);

        } catch (\Exception $e) {
            Log::error('PayTabs Store Callback Error: ' . $e->getMessage());
            return response('Callback processing failed', 500);
        }
    }

    public function success(Request $request, $storeSlug, $orderNumber)
    {
        try {
            $order      = Order::where('order_number', $orderNumber)->firstOrFail();
            $storeModel = Store::where('slug', $storeSlug)->firstOrFail();

            // The browser redirect is NOT a proof of payment. If the order is
            // not already marked paid (by a verified callback/webhook), verify
            // it here server-side before showing success.
            if ($order->payment_status !== 'paid') {
                $tranRef = $request->input('tran_ref') ?? $request->input('tranRef');

                $verification = $this->verifyTransaction($tranRef, $order);

                if ($verification['verified']) {
                    $order->update([
                        'status'          => 'confirmed',
                        'payment_status'  => 'paid',
                        'payment_transaction_id' => $tranRef,
                        'payment_details' => array_merge($order->payment_details ?? [], [
                            'paytabs_tran_ref' => $tranRef,
                            'cart_id'          => $request->input('cart_id') ?? $request->input('cartId'),
                            'verified_at'      => now(),
                        ]),
                    ]);
                } else {
                    Log::warning('PayTabs success verification failed: ' . $verification['message'], [
                        'order_number' => $orderNumber,
                    ]);
                    return redirect()->to($this->getStoreHomeUrl($storeModel, $storeSlug))
                        ->with('payment_status', 'failed')
                        ->withErrors(['error' => __('Payment could not be verified.')]);
                }
            }

            return redirect()->to($this->getStoreHomeUrl($storeModel, $storeSlug))
                ->with('payment_status', 'success')
                ->with('order_number', $order->order_number)
                ->with('success', __('Payment completed successfully!'));

        } catch (\Exception $e) {
            Log::error('PayTabs Store Success Error: ' . $e->getMessage());
            $storeModel = Store::where('slug', $storeSlug)->first();
            return redirect()->to($this->getStoreHomeUrl($storeModel, $storeSlug))
                ->with('payment_status', 'failed')
                ->withErrors(['error' => __('Payment verification failed.')]);
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
