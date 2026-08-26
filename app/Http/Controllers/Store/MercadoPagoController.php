<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use MercadoPago\SDK;
use MercadoPago\Payment;
use App\Traits\HandlesWebhookIdempotency;

class MercadoPagoController extends Controller
{
    use HandlesWebhookIdempotency;
    /**
     * Handle successful MercadoPago payment for store orders
     * 
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function success(Request $request, $storeSlug, $orderNumber)
    {
        try {
            // Find the store
            $store = Store::where('slug', $storeSlug)->firstOrFail();
            
            // Find the order
            $order = Order::where('order_number', $orderNumber)
                         ->where('store_id', $store->id)
                         ->firstOrFail();
            
            // Get payment details from request
            $paymentId = $request->payment_id;
            $status = $request->status;
            $externalReference = $request->external_reference;
            
            // Verify external reference matches order number
            if ($externalReference && $externalReference !== $orderNumber) {
                return $this->redirectToCheckoutError($store, $storeSlug, 'Invalid payment reference');
            }
            
            // The payment_id and status query params are CLIENT-CONTROLLED and MUST
            // never be trusted. Always re-verify the payment server-side via the
            // MercadoPago SDK before marking an order as paid.
            if (!$paymentId) {
                return $this->redirectToCheckoutError($store, $storeSlug, 'Payment reference missing');
            }

            // Get store owner's MercadoPago settings
            $mercadopagoConfig = getPaymentMethodConfig('mercadopago', $store->user->id, $store->id);
            if (!$mercadopagoConfig['enabled'] || !$mercadopagoConfig['access_token']) {
                return $this->redirectToCheckoutError($store, $storeSlug, 'Payment gateway not configured');
            }

            // Initialize MercadoPago SDK and fetch the real payment
            SDK::setAccessToken($mercadopagoConfig['access_token']);
            $payment = Payment::find_by_id($paymentId);

            if (!$payment) {
                return $this->redirectToCheckoutError($store, $storeSlug, 'Payment could not be verified');
            }

            // Only mark as paid when the payment is truly approved AND the amount
            // matches the order total.
            $amountMatches = isset($payment->transaction_amount)
                && abs((float) $payment->transaction_amount - (float) $order->total_amount) < 0.01;

            if ($payment->status === 'approved' && $amountMatches) {
                $oldStatus = $order->status;
                $order->update([
                    'status' => 'confirmed',
                    'payment_status' => 'paid',
                    'payment_transaction_id' => $paymentId,
                    'payment_details' => array_merge($order->payment_details ?? [], [
                        'payment_id' => $paymentId,
                        'payment_method' => 'mercadopago',
                        'status' => $payment->status,
                        'status_detail' => $payment->status_detail ?? null,
                        'transaction_amount' => $payment->transaction_amount ?? null,
                    ]),
                ]);
                $fresh = $order->fresh();
                try { event(new \App\Events\OrderStatusChanged($fresh, $oldStatus, 'confirmed')); } catch (\Throwable $e) {}
                try { if ($fresh->customer_email) \App\Jobs\SendStoreCustomerEmail::dispatch($fresh->store_id, 'payment_received', $fresh->customer_email, $fresh->id, null, $fresh->customer_id)->afterCommit(); } catch (\Throwable $e) {}
                
                // Redirect to store home with success parameters (like Stripe)
                return redirect()->to($this->getStoreHomeUrl($store, $storeSlug))
                    ->with('payment_status', 'success')
                    ->with('order_number', $orderNumber)
                    ->with('success', __('Payment successful! Your order has been confirmed.'));
            }
            
            return $this->redirectToCheckoutError($store, $storeSlug, 'Payment status could not be verified');
            
        } catch (\Exception $e) {
            Log::error('MercadoPago store success error: ' . $e->getMessage());
            
            $store = Store::where('slug', $storeSlug)->first();
            return $this->redirectToCheckoutError($store, $storeSlug, 'Failed to process payment: ' . $e->getMessage());
        }
    }
    
    /**
     * Handle failed MercadoPago payment
     * 
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function failure(Request $request, $storeSlug)
    {
        try {
            $store = Store::where('slug', $storeSlug)->first();
            return $this->redirectToCheckoutError($store, $storeSlug, 'Payment failed. Please try again.');
        } catch (\Exception $e) {
            Log::error('MercadoPago store failure error: ' . $e->getMessage());
            return redirect()->route('store.home', $storeSlug)
                ->with('error', __('An error occurred while processing your payment.'));
        }
    }
    
    /**
     * Handle pending MercadoPago payment
     * 
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function pending(Request $request, $storeSlug)
    {
        try {
            $store = Store::where('slug', $storeSlug)->first();
            return redirect()->route('store.checkout.pending', ['storeSlug' => $storeSlug])
                ->with('info', __('Your payment is pending. We will notify you once it is confirmed.'));
        } catch (\Exception $e) {
            Log::error('MercadoPago store pending error: ' . $e->getMessage());
            return redirect()->route('store.home', $storeSlug)
                ->with('error', __('An error occurred while processing your payment.'));
        }
    }
    
    /**
     * Handle MercadoPago webhook notifications for store orders
     * 
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function webhook(Request $request)
    {
        return $this->processWebhookIdempotently($request, 'mercadopago', function (Request $req) {
            try {
                $data = $req->all();
                
                // Check if this is a payment notification
                if (isset($data['action']) && $data['action'] === 'payment.created') {
                    $paymentId = $data['data']['id'] ?? null;
                    
                    if (!$paymentId) {
                        return response()->json(['status' => 'error', 'message' => 'Payment ID not found'], 400);
                    }
                    
                    // Find order by payment_id or external_reference
                    $order = Order::where('payment_transaction_id', $paymentId)
                        ->orWhere(function($query) use ($data) {
                            if (isset($data['external_reference'])) {
                                $query->whereJsonContains('payment_details->mercadopago_preference_id', $data['external_reference']);
                            }
                        })
                        ->first();
                    
                    if (!$order || !$order->store) {
                        return response()->json(['status' => 'error', 'message' => 'Order not found'], 404);
                    }
                    
                    // Get store owner's MercadoPago settings
                    $mercadopagoConfig = getPaymentMethodConfig('mercadopago', $order->store->user->id, $order->store_id);
                    
                    if (!$mercadopagoConfig['enabled'] || !$mercadopagoConfig['access_token']) {
                        return response()->json(['status' => 'error', 'message' => 'MercadoPago not configured'], 500);
                    }
                    
                    // Initialize MercadoPago SDK
                    SDK::setAccessToken($mercadopagoConfig['access_token']);
                    
                    // Get payment details
                    $payment = Payment::find_by_id($paymentId);
                    
                    if (!$payment) {
                        return response()->json(['status' => 'error', 'message' => 'Payment not found'], 404);
                    }
                    
                    // Update order based on payment status
                    switch ($payment->status) {
                        case 'approved':
                            $oldStatus = $order->status;
                            $order->update([
                                'status' => 'confirmed',
                                'payment_status' => 'paid',
                                'payment_transaction_id' => $paymentId,
                                'payment_details' => array_merge($order->payment_details ?? [], [
                                    'payment_id' => $paymentId,
                                    'payment_method' => $payment->payment_method_id,
                                'transaction_amount' => $payment->transaction_amount,
                                'status' => $payment->status,
                                'status_detail' => $payment->status_detail,
                            ]),
                        ]);
                            $fresh = $order->fresh();
                            try { event(new \App\Events\OrderStatusChanged($fresh, $oldStatus, 'confirmed')); } catch (\Throwable $e) {}
                            try { if ($fresh->customer_email) \App\Jobs\SendStoreCustomerEmail::dispatch($fresh->store_id, 'payment_received', $fresh->customer_email, $fresh->id, null, $fresh->customer_id)->afterCommit(); } catch (\Throwable $e) {}
                        break;
                        
                    case 'rejected':
                    case 'cancelled':
                        $order->update([
                            'status' => 'cancelled',
                            'payment_status' => 'failed',
                            'payment_transaction_id' => $paymentId,
                            'payment_details' => array_merge($order->payment_details ?? [], [
                                'payment_id' => $paymentId,
                                'status' => $payment->status,
                                'status_detail' => $payment->status_detail,
                            ]),
                        ]);
                        break;
                        
                    case 'pending':
                    case 'in_process':
                        $order->update([
                            'payment_status' => 'pending',
                            'payment_transaction_id' => $paymentId,
                            'payment_details' => array_merge($order->payment_details ?? [], [
                                'payment_id' => $paymentId,
                                'status' => $payment->status,
                            ]),
                        ]);
                        break;
                }
            }
            
return response()->json(['status' => 'success']);
             
        } catch (\Exception $e) {
            Log::error('MercadoPago store webhook error: ' . $e->getMessage());
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    });
    }
    
    /**
     * Redirect to checkout error page with proper domain handling
     * 
     * @param  \App\Models\Store|null  $store
     * @param  string  $storeSlug
     * @param  string  $message
     * @return \Illuminate\Http\RedirectResponse
     */
    private function redirectToCheckoutError($store, $storeSlug, $message)
    {
        if ($store && $store->isCurrentDomain()) {
            return redirect($store->getStoreUrl() . '/checkout/error')
                ->with('error', __($message));
        }
        
        return redirect()->route('store.checkout.error', ['storeSlug' => $storeSlug])
            ->with('error', __($message));
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
