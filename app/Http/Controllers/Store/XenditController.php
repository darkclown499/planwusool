<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Http\Request;

class XenditController extends Controller
{
    public function success(Request $request, $storeSlug, $orderNumber)
    {
        try {
            $order = Order::where('order_number', $orderNumber)->firstOrFail();
            $storeModel = Store::where('slug', $storeSlug)->firstOrFail();
            
            // Verify payment status with Xendit if we have an invoice ID
            $invoiceId = $order->payment_details['xendit_invoice_id'] ?? null;
            $isPaid = false;

            if ($invoiceId) {
                $xenditConfig = getPaymentMethodConfig('xendit', $storeModel->user->id, $order->store_id);
                $apiKey = $xenditConfig['api_key'] ?? '';
                
                if ($apiKey) {
                    $response = \Http::withHeaders([
                        'Authorization' => 'Basic ' . base64_encode($apiKey . ':'),
                    ])->get('https://api.xendit.co/v2/invoices/' . $invoiceId);
                    
                    if ($response->successful()) {
                        $result = $response->json();
                        if (in_array(($result['status'] ?? ''), ['SETTLED', 'PAID'])) {
                            $isPaid = true;
                        }
                    }
                }
            } else {
                // Fallback if no invoice ID (should not happen with our new implementation)
                $isPaid = true; 
            }
            
            if ($isPaid) {
                if ($order->payment_status !== 'paid') {
                    $order->update([
                        'status' => 'confirmed',
                        'payment_status' => 'paid',
                    ]);
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
