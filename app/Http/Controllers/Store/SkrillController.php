<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class SkrillController extends Controller
{
    public function success(Request $request)
    {
        try {
            $storeSlug = request()->route('storeSlug') ?? null;
            $orderNumber = request()->route('orderNumber') ?? null;
            $order = Order::where('order_number', $orderNumber)->firstOrFail();
            // For Skrill, do NOT update status blindly on redirect.
            // Real verification happens via callback/IPN.
            if ($order->payment_status !== 'paid') {
                return redirect()->to($this->getStoreHomeUrl($order->store, $storeSlug) . '?payment_status=warning&order_number=' . $order->order_number)
                    ->with('payment_status', 'warning')
                    ->with('order_number', $order->order_number)
                    ->with('warning', __('Payment is being processed by Skrill. Your order will be confirmed once payment is verified.'));
            }

            return redirect()->to($this->getStoreHomeUrl($order->store, $storeSlug) . '?payment_status=success&order_number=' . $order->order_number)
                ->with('payment_status', 'success')
                ->with('order_number', $order->order_number)
                ->with('success', __('Payment successful! Your order has been confirmed.'));

        } catch (\Exception $e) {
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
        // Skrill IPN – called in the background by Skrill servers
        $transactionId = $request->transaction_id;
        $order = Order::where('payment_transaction_id', $transactionId)->first();

        if ($order) {
            $storeModel    = \App\Models\Store::find($order->store_id);
            $skrillConfig  = getPaymentMethodConfig('skrill', $storeModel->user->id, $order->store_id);

            $concatFields = $request->merchant_id
                . $request->transaction_id
                . strtoupper(md5($skrillConfig['secret_word']))
                . $request->mb_amount
                . $request->mb_currency
                . $request->status;

            // Use a constant-time comparison and verify the paid amount matches
            // the order total before confirming the order.
            $signatureValid = isset($request->md5sig)
                && hash_equals(strtoupper(md5($concatFields)), strtoupper((string) $request->md5sig));

            $amountMatches = isset($request->mb_amount)
                && abs((float) $request->mb_amount - (float) $order->total_amount) < 0.01;

            if ($signatureValid && $amountMatches && (int) $request->status === 2) {
                $order->update([
                    'status'         => 'confirmed',
                    'payment_status' => 'paid',
                ]);
            } else {
                \Illuminate\Support\Facades\Log::warning('Skrill callback rejected', [
                    'order_id' => $order->id,
                    'signature_valid' => $signatureValid,
                    'amount_matches' => $amountMatches,
                    'status' => $request->status,
                ]);
            }
        }

        return response('OK');
    }
}
