<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Services\OrderService;
use App\Services\CartCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class OrderController extends Controller
{
    protected $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    public function placeOrder(Request $request, $storeSlug)
    {
        try {
            $validationRules = [
                'store_id' => 'required|exists:stores,id',
                'customer_first_name' => 'required|string|max:255',
                'customer_last_name' => 'required|string|max:255',
                'customer_email' => 'required|email|max:255',
                'customer_phone' => 'nullable|string|max:20',
                'shipping_address' => 'required|string|max:255',
                'shipping_city' => 'required|max:100',
                'shipping_state' => 'required|max:100',
                'shipping_postal_code' => 'required|string|max:20',
                'shipping_country' => 'required|max:100',
                'billing_address' => 'required|string|max:255',
                'billing_city' => 'required|max:100',
                'billing_state' => 'required|max:100',
                'billing_postal_code' => 'required|string|max:20',
                'billing_country' => 'required|max:100',
                'payment_method' => 'required|string',
                'shipping_method_id' => 'nullable|exists:shippings,id',
                'notes' => 'nullable|string',
                'coupon_code' => 'nullable|string',
                'bank_transfer_receipt' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
            ];
            
            // Add bank transfer file validation if payment method is bank
            if ($request->payment_method === 'bank') {
                $validationRules['bank_transfer_receipt'] = 'required|file|mimes:jpg,jpeg,png,pdf|max:5120';
            }
            
            $validator = \Validator::make($request->all(), $validationRules);
            
            if ($validator->fails()) {
                if ($request->expectsJson() || $request->ajax()) {
                    return response()->json([
                        'success' => false,
                        'message' => $validator->errors()->first(),
                        'errors' => $validator->errors()
                    ], 422);
                }
                return back()->withErrors($validator)->withInput();
            }
            // Get cart calculation
            $calculation = CartCalculationService::calculateCartTotals(
                $request->store_id,
                session()->getId(),
                $request->coupon_code,
                $request->shipping_method_id
            );

            if ($calculation['items']->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'سلة التسوق فارغة'
                ], 400);
            }

            // Handle bank transfer receipt upload
            $bankTransferReceiptPath = null;
            if ($request->payment_method === 'bank' && $request->hasFile('bank_transfer_receipt')) {
                $file = $request->file('bank_transfer_receipt');
                $bankTransferReceiptPath = $file->store('bank_transfers', 'public');
            }

            // Prepare order data
            $orderData = [
                'store_id' => $request->store_id,
                'customer_first_name' => $request->customer_first_name,
                'customer_last_name' => $request->customer_last_name,
                'customer_email' => $request->customer_email,
                'customer_phone' => $request->customer_phone,
                'shipping_address' => $request->shipping_address,
                'shipping_city' => $request->shipping_city,
                'shipping_state' => $request->shipping_state,
                'shipping_postal_code' => $request->shipping_postal_code,
                'shipping_country' => $request->shipping_country,
                'billing_address' => $request->billing_address,
                'billing_city' => $request->billing_city,
                'billing_state' => $request->billing_state,
                'billing_postal_code' => $request->billing_postal_code,
                'billing_country' => $request->billing_country,
                'subtotal' => $calculation['subtotal'],
                'tax_amount' => $calculation['tax'],
                'shipping_amount' => $calculation['shipping'],
                'discount_amount' => $calculation['discount'],
                'total_amount' => $calculation['total'],
                'payment_method' => $request->payment_method,
                'shipping_method_id' => $request->shipping_method_id,
                'notes' => $request->notes,
                'coupon_code' => $request->coupon_code,
                'coupon_discount' => $calculation['discount'],
                'bank_transfer_receipt' => $bankTransferReceiptPath,
                'whatsapp_number' => $request->whatsapp_number,
            ];

            // Prepare cart items
            $cartItems = $calculation['items']->map(function ($item) {
                return [
                    'product_id' => $item->product_id,
                    'name' => $item->product->name,
                    'sku' => $item->product->sku,
                    'price' => $item->product->price,
                    'sale_price' => $item->product->sale_price,
                    'quantity' => $item->quantity,
                    'variants' => $item->variants,
                    'taxName' => $item->product->tax->name ?? NULL,
                    'taxPercentage' => $item->product->tax->rate ?? 0,
                    'taxType' => $item->product->tax->type ?? NULL,
                ];
            })->toArray();

            // Create order
            $order = $this->orderService->createOrder($orderData, $cartItems);
            
            // Update coupon usage if coupon was used.
            // $calculation['coupon'] is an Eloquent StoreCoupon model for legacy
            // coupons, but a plain array for AdvancedCoupon (whose usage is
            // recorded inside OrderService::handlePostOrderExtras). Only call
            // ->increment() on the model to avoid a fatal "call on array".
            if ($request->coupon_code && $calculation['coupon'] instanceof \App\Models\StoreCoupon) {
                $calculation['coupon']->increment('used_count');
            }

            // Process payment
            $paymentResult = $this->orderService->processPayment($order, $storeSlug);
            
            // Clear cart after successful order
            if ($paymentResult['success']) {
                \App\Models\CartItem::where('store_id', $request->store_id)
                    ->where('session_id', session()->getId())
                    ->delete();
            }

            if ($paymentResult['success']) {
                // For Stripe, PayPal, Xendit, MercadoPago and ToyyibPay, return checkout URL for frontend redirect
                if (in_array($request->payment_method, ['stripe', 'paypal', 'xendit', 'mercadopago', 'toyyibpay', 'paytabs', 'coingate', 'midtrans', 'mollie', 'benefit', 'yookassa']) && isset($paymentResult['checkout_url'])) {
                    return response()->json([
                        'success' => true,
                        'redirect_url' => $paymentResult['checkout_url'],
                        'order_number' => $order->order_number
                    ]);
                }
                
                // For Razorpay and Paystack, return payment data for frontend modal processing
                if ($request->payment_method === 'razorpay' && isset($paymentResult['razorpay_order_id'])) {
                    return response()->json([
                        'success' => true,
                        'payment_method' => 'razorpay',
                        'razorpay_order_id' => $paymentResult['razorpay_order_id'],
                        'key_id' => $paymentResult['key_id'],
                        'amount' => $paymentResult['amount'],
                        'currency' => $paymentResult['currency'],
                        'store_title' => $paymentResult['store_title'],
                        'order_id' => $order->id,
                        'order_number' => $order->order_number,
                        'message' => $paymentResult['message']
                    ]);
                }
                
                // For Paystack, return authorization URL for frontend modal
                if ($request->payment_method === 'paystack' && isset($paymentResult['authorization_url'])) {
                    return response()->json([
                        'success' => true,
                        'payment_method' => 'paystack',
                        'authorization_url' => $paymentResult['authorization_url'],
                        'reference' => $paymentResult['reference'],
                        'access_code' => $paymentResult['access_code'],
                        'order_id' => $order->id,
                        'order_number' => $order->order_number,
                        'message' => $paymentResult['message']
                    ]);
                }

                // For Cashfree, return payment data for frontend processing
                if ($request->payment_method === 'cashfree' && isset($paymentResult['payment_session_id'])) {
                    $store = \App\Models\Store::find($order->store_id);
                    $cashfreeConfig = getPaymentMethodConfig('cashfree', $store->user->id, $order->store_id);

                    return response()->json([
                        'success' => true,
                        'payment_method' => 'cashfree',
                        'payment_session_id' => $paymentResult['payment_session_id'],
                        'mode' => $cashfreeConfig['mode'] ?? 'sandbox',
                        'order_id' => $order->id,
                        'order_number' => $order->order_number,
                        'message' => $paymentResult['message']
                    ]);
                }

                // For Flutterwave, return payment data for frontend modal processing
                if ($request->payment_method === 'flutterwave' && isset($paymentResult['public_key'])) {
                    return response()->json([
                        'success' => true,
                        'payment_method' => 'flutterwave',
                        'public_key' => $paymentResult['public_key'],
                        'tx_ref' => $paymentResult['tx_ref'],
                        'amount' => $paymentResult['amount'],
                        'currency' => $paymentResult['currency'],
                        'customer_email' => $paymentResult['customer_email'],
                        'customer_name' => $paymentResult['customer_name'],
                        'customer_phone' => $paymentResult['customer_phone'],
                        'redirect_url' => $paymentResult['redirect_url'],
                        'order_id' => $order->id,
                        'order_number' => $order->order_number,
                        'message' => $paymentResult['message'],
                    ]);
                }
                
                // For Skrill, return form data for HTML POST redirect
                if ($request->payment_method === 'skrill' && isset($paymentResult['skrill_data'])) {
                    return response()->json([
                        'success'         => true,
                        'payment_method'  => 'skrill',
                        'skrill_data'     => $paymentResult['skrill_data'],
                        'skrill_endpoint' => $paymentResult['skrill_endpoint'],
                        'order_id'        => $order->id,
                        'order_number'    => $order->order_number,
                    ]);
                }

                // For WhatsApp, return WhatsApp redirect data
                if ($request->payment_method === 'whatsapp' && isset($paymentResult['whatsapp_redirect'])) {
                    if ($request->expectsJson()) {
                        return response()->json([
                            'success' => true,
                            'whatsapp_redirect' => true,
                            'whatsapp_data' => $paymentResult['whatsapp_data'],
                            'order_number' => $order->order_number,
                            'message' => $paymentResult['message']
                        ]);
                    } else {
                        // For form submission, redirect with WhatsApp URL
                        $whatsappUrl = $paymentResult['whatsapp_data']['url'] ?? null;
                        if ($whatsappUrl) {
                            return redirect()->away($whatsappUrl);
                        }
                    }
                }
                
                return response()->json([
                    'success' => true,
                    'order_number' => $order->order_number,
                    'message' => $paymentResult['message']
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $paymentResult['message']
                ], 400);
            }

        } catch (\Illuminate\Validation\ValidationException $e) {
            if ($request->expectsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->validator->errors()->first(),
                    'errors' => $e->validator->errors()
                ], 422);
            }
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'تعذر إتمام الطلب: ' . $e->getMessage()
            ], 500);
        }
    }
}