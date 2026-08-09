<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Http\Request;

class ToyyibPayController extends Controller
{
    public function success(Request $request, $storeSlug, $orderNumber)
    {
        try {
            $order = Order::where('order_number', $orderNumber)->firstOrFail();
            $storeModel = Store::where('slug', $storeSlug)->firstOrFail();
            
            $billCode = $request->input('billcode');
            
            $isPaid = false;

            // The client-supplied status_id is NEVER trusted. Payment is only
            // confirmed by re-querying the ToyyibPay API and checking that the
            // billed amount matches the order total.
            $toyyibpayConfig = getPaymentMethodConfig('toyyibpay', $storeModel->user->id, $order->store_id);
            $secretKey = $toyyibpayConfig['secret_key'] ?? '';
            $mode = $toyyibpayConfig['mode'] ?? 'sandbox';

            if ($secretKey && $billCode) {
                $url = ($mode == 'live') ? 'https://toyyibpay.com/index.php/api/getBillTransactions' : 'https://dev.toyyibpay.com/index.php/api/getBillTransactions';

                $response = \Http::asForm()->post($url, [
                    'billCode' => $billCode,
                    'userSecretKey' => $secretKey
                ]);

                if ($response->successful()) {
                    $result = $response->json();
                    $transaction = $result[0] ?? [];

                    $billedAmount = isset($transaction['billAmount'])
                        ? (float) $transaction['billAmount']
                        : (isset($transaction['bill_amount']) ? (float) $transaction['bill_amount'] : null);

                    $amountMatches = $billedAmount !== null
                        && abs($billedAmount - (float) $order->total_amount) < 0.01;

                    if (($transaction['billpaymentStatus'] ?? '') == '1' && $amountMatches) {
                        $isPaid = true;
                    } else {
                        \Illuminate\Support\Facades\Log::warning('ToyyibPay verification rejected', [
                            'order_number' => $order->order_number,
                            'billed_amount' => $billedAmount,
                            'order_total' => $order->total_amount,
                            'status' => $transaction['billpaymentStatus'] ?? null,
                        ]);
                    }
                }
            }
            
            if ($isPaid) {
                if ($order->payment_status !== 'paid') {
                    $order->update([
                        'status' => 'confirmed',
                        'payment_status' => 'paid',
                    ]);
                    
                    // Fire OrderPaid event if exists, or handle inventory etc if not already handled
                }
                
                return redirect()->to($this->getStoreHomeUrl($storeModel, $storeSlug))
                    ->with('payment_status', 'success')
                    ->with('order_number', $order->order_number)
                    ->with('success', __('Payment completed successfully!'));
            } else {
                return redirect()->to($this->getStoreHomeUrl($storeModel, $storeSlug))
                    ->with('payment_status', 'failed')
                    ->withErrors(['error' => __('Payment was not completed or is still pending.')]);
            }
            
        } catch (\Exception $e) {
            $storeModel = Store::where('slug', $storeSlug)->first();
            return redirect()->to($this->getStoreHomeUrl($storeModel, $storeSlug))
                ->with('payment_status', 'failed')
                ->withErrors(['error' => __('Payment verification failed: ') . $e->getMessage()]);
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
}
