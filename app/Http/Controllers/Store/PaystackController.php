<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaystackController extends Controller
{
    /**
     * Handle successful Paystack payment for store orders
     */
    public function success(Request $request)
    {
        try {
            $storeSlug = $request->route('storeSlug');
            $orderNumber = $request->route('orderNumber');
            
            // Find the store
            $store = Store::where('slug', $storeSlug)->firstOrFail();
            
            // Find the order
            $order = Order::where('order_number', $orderNumber)
                         ->where('store_id', $store->id)
                         ->first();
            
            if (!$order) {
                return redirect()->route('store.checkout', ['storeSlug' => $storeSlug])
                    ->withErrors(['error' => 'Order not found']);
            }
            
            // Get reference from request
            $reference = $request->get('reference') ?: $request->get('trxref');
            
            if (!$reference) {
                return redirect()->route('store.checkout', ['storeSlug' => $storeSlug])
                    ->withErrors(['error' => __('Payment reference not found')]);
            }
            
            // Get store owner's Paystack settings
            if (!$store->user) {
                return redirect()->route('store.checkout', ['storeSlug' => $storeSlug])
                    ->withErrors(['error' => 'Store configuration error']);
            }
            
            $paystackConfig = getPaymentMethodConfig('paystack', $store->user->id, $store->id);
            
            if (!$paystackConfig['enabled'] || !$paystackConfig['secret_key']) {
                return redirect()->route('store.checkout', ['storeSlug' => $storeSlug])
                    ->withErrors(['error' => 'Paystack not configured']);
            }
            
            // Verify payment with Paystack API
            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => "https://api.paystack.co/transaction/verify/" . $reference,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    "Authorization: Bearer " . $paystackConfig['secret_key'],
                    "Cache-Control: no-cache",
                ],
            ]);
            
            $response = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            curl_close($curl);
            
            if ($httpCode !== 200) {
                return redirect()->route('store.checkout', ['storeSlug' => $storeSlug])
                    ->withErrors(['error' => 'Payment verification failed']);
            }
            
            $result = json_decode($response, true);
            
            if (!$result || !$result['status'] || $result['data']['status'] !== 'success') {
                return redirect()->route('store.checkout', ['storeSlug' => $storeSlug])
                    ->withErrors(['error' => 'Payment was not successful']);
            }
            
            // Verify amount matches
            $paidAmount = $result['data']['amount'] / 100; // Convert from kobo
            if (abs($paidAmount - (float)$order->total_amount) > 0.01) {
                return redirect()->route('store.checkout', ['storeSlug' => $storeSlug])
                    ->withErrors(['error' => 'Payment amount does not match']);
            }
            
            // Update order
            $order->update([
                'status' => 'confirmed',
                'payment_status' => 'paid',
                'payment_transaction_id' => $reference,
                'payment_details' => array_merge($order->payment_details ?? [], [
                    'payment_reference' => $reference,
                    'payment_method' => 'paystack',
                    'transaction_amount' => $paidAmount,
                    'status' => $result['data']['status'],
                ]),
            ]);
            
            // Fire order created event for notifications
            event(new \App\Events\OrderCreated($order));
            
            // Redirect to store home with success parameters (like Stripe)
            return redirect()->to($this->getStoreHomeUrl($store, $storeSlug))
                ->with('payment_status', 'success')
                ->with('order_number', $order->order_number)
                ->with('success', __('Payment successful! Your order has been confirmed.'));
            
        } catch (\Exception $e) {
            Log::error('Paystack store success error: ' . $e->getMessage());
            
            $storeSlug = $request->route('storeSlug');
            return redirect()->route('store.checkout', ['storeSlug' => $storeSlug])
                ->withErrors(['error' => 'Failed to process payment: ' . $e->getMessage()]);
        }
    }
    
    /**
     * Handle webhook notifications for Paystack payments
     */
    public function webhook(Request $request)
    {
        try {
            $payload = $request->all();
            
            // Verify event type
            if (!isset($payload['event']) || $payload['event'] !== 'charge.success') {
                return response()->json(['status' => 'ignored', 'message' => 'Not a charge success event']);
            }
            
            // Get reference
            $reference = $payload['data']['reference'] ?? null;
            
            if (!$reference) {
                return response()->json(['status' => 'error', 'message' => 'Reference not found'], 400);
            }
            
            // Find order by reference
            $order = Order::whereJsonContains('payment_details->payment_reference', $reference)
                ->orWhere('payment_transaction_id', $reference)
                ->first();
            
            if (!$order) {
                return response()->json(['status' => 'error', 'message' => 'Order not found'], 404);
            }
            
            // Get store owner's Paystack settings
            $store = $order->store;
            if (!$store || !$store->user) {
                return response()->json(['status' => 'error', 'message' => 'Store configuration error'], 500);
            }
            
            $paystackConfig = getPaymentMethodConfig('paystack', $store->user->id, $order->store_id);
            
            if (!$paystackConfig['enabled'] || !$paystackConfig['secret_key']) {
                return response()->json(['status' => 'error', 'message' => 'Paystack not configured'], 500);
            }
            
            // Verify payment with Paystack API
            $curl = curl_init();
            curl_setopt_array($curl, [
                CURLOPT_URL => "https://api.paystack.co/transaction/verify/" . $reference,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    "Authorization: Bearer " . $paystackConfig['secret_key'],
                    "Cache-Control: no-cache",
                ],
            ]);
            
            $response = curl_exec($curl);
            curl_close($curl);
            
            $result = json_decode($response, true);
            
            if ($result && $result['status'] && $result['data']['status'] === 'success') {
                $order->update([
                    'status' => 'confirmed',
                    'payment_status' => 'paid',
                    'payment_transaction_id' => $reference,
                    'payment_details' => array_merge($order->payment_details ?? [], [
                        'payment_reference' => $reference,
                        'payment_method' => 'paystack',
                        'transaction_amount' => $result['data']['amount'] / 100,
                        'status' => $result['data']['status'],
                    ]),
                ]);
                
                // Fire order created event for notifications
                event(new \App\Events\OrderCreated($order));
            }
            
            return response()->json(['status' => 'success']);
            
        } catch (\Exception $e) {
            Log::error('Paystack store webhook error: ' . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
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
