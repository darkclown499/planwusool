<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PayTabsController extends Controller
{
    public function callback(Request $request, $storeSlug, $orderNumber)
    {
        try {
            $cartId    = $request->input('cartId') ?? $request->input('cart_id');
            $respStatus = $request->input('respStatus') ?? $request->input('resp_status');
            $tranRef   = $request->input('tranRef') ?? $request->input('tran_ref');

            if (!$cartId) {
                return response('Missing cart ID', 400);
            }

            $order = Order::where('order_number', $orderNumber)->first();

            if (!$order) {
                return response('Order not found', 404);
            }

            if ($respStatus === 'A') {
                if ($order->payment_status !== 'paid') {
                    $order->update([
                        'status'         => 'confirmed',
                        'payment_status' => 'paid',
                        'payment_details' => array_merge($order->payment_details ?? [], [
                            'paytabs_tran_ref' => $tranRef,
                            'cart_id'          => $cartId,
                            'verified_at'      => now(),
                        ]),
                    ]);
                }
            } else {
                $order->update(['payment_status' => 'failed']);
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

            if ($order->payment_status !== 'paid') {
                $cartId  = $request->input('cart_id') ?? $request->input('cartId');
                $tranRef = $request->input('tran_ref') ?? $request->input('tranRef');

                $order->update([
                    'status'          => 'confirmed',
                    'payment_status'  => 'paid',
                    'payment_details' => array_merge($order->payment_details ?? [], [
                        'paytabs_tran_ref' => $tranRef,
                        'cart_id'          => $cartId,
                        'verified_at'      => now(),
                    ]),
                ]);
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
