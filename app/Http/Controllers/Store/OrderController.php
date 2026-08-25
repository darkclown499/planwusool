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
            // SECURITY: store owner can require login before checkout.
            $storeModel = \App\Models\Store::find($request->store_id);
            if ($storeModel) {
                $config = \App\Models\StoreConfiguration::getConfiguration($storeModel->id);
                $accountsOn = (bool) ($config['customer_accounts_enabled'] ?? true);
                if ($accountsOn && ($config['require_login_checkout'] ?? false) && !Auth::guard('customer')->check()) {
                    if ($request->expectsJson() || $request->ajax()) {
                        return response()->json([
                            'success' => false,
                            'message' => __('Please log in to your account to complete your order.'),
                            'requires_login' => true,
                        ], 401);
                    }
                    return redirect()->back()->withErrors(['login' => __('Please log in to your account to complete your order.')]);
                }
            }

            $validationRules = [
                'store_id' => 'required|exists:stores,id',
                'customer_first_name' => 'required|string|max:255',
                'customer_last_name' => 'required|string|max:255',
                'customer_email' => 'required|email|max:255',
                'customer_phone' => 'nullable|string|max:20',
                'shipping_address' => 'required|string|max:255',
                'shipping_city' => 'required|max:100',
                'shipping_state' => 'required|max:100',
                'shipping_postal_code' => 'nullable|string|max:20',
                'postal_code'          => 'nullable|string|max:20',
                'shipping_country' => 'required|max:100',
                'billing_address' => 'required|string|max:255',
                'billing_city' => 'required|max:100',
                'billing_state' => 'required|max:100',
                'billing_postal_code' => 'nullable|string|max:20',
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

            // Store isolation: shipping method must belong to same store
            if ($request->shipping_method_id) {
                $shippingValid = \App\Models\Shipping::where('id', $request->shipping_method_id)
                    ->where('store_id', $request->store_id)
                    ->where('is_active', true)
                    ->exists();
                if (!$shippingValid) {
                    return response()->json([
                        'success' => false,
                        'message' => 'طريقة الشحن المحددة غير صالحة لهذا المتجر.',
                        'errors' => ['shipping_method_id' => ['طريقة الشحن غير صالحة.']]
                    ], 422);
                }
            }

            // Store isolation: payment method must be enabled for this store
            if ($request->payment_method) {
                $enabledMethods = getEnabledPaymentMethods(
                    \App\Models\Store::find($request->store_id)?->user_id,
                    $request->store_id
                );
                // COD fallback is always allowed even if not explicitly enabled
                $allowedOffline = ['cod','cash','cash_on_delivery'];
                if (!isset($enabledMethods[$request->payment_method]) && !in_array($request->payment_method, $allowedOffline, true)) {
                    // Check if method exists but disabled -> return error
                    // Allow any offline/local methods that are stored as payment configs with enabled flag
                    $isOffline = in_array($request->payment_method, ['bank','jawwal_pay','pal_pay','zain_cash','orange_money','bank_palestine','al_quds_bank','arab_islamic_bank','cairo_amman_bank','housing_bank','safad_bank','cliq','zain_cash_jo','orange_money_jo','etihad_wallet','dinar_pay','jordan_kuwait_bank','arab_bank','housing_bank_jo','cairo_amman_bank_jo','safad_bank_jo','usdt_trc20','usdt_erc20','usdt_bep20','usdt_polygon','usdt_solana','whatsapp','telegram'], true);
                    if (!$isOffline || !isset($enabledMethods[$request->payment_method])) {
                        // For COD we already allow, for others if not in enabled list, reject
                        if ($request->payment_method !== 'cod' && !isset($enabledMethods[$request->payment_method])) {
                            // Only enforce if method is not a generic offline that we allow without explicit config
                            // Strict check: if payment method is not cod and not in enabled list, reject
                            // But to avoid breaking existing stores with legacy offline methods, only reject if method is online gateway not enabled
                            $onlineGateways = ['stripe','paypal','razorpay','paystack','mercadopago','xendit','toyyibpay','cashfree','flutterwave','paytabs','skrill','coingate','midtrans','mollie','benefit','yookassa','tap','payfast','paytr','iyzipay','khalti','easebuzz','ozow','authorizenet','fedapay','payhere','cinetpay','nepalste','paiement','aamarpay'];
                            if (in_array($request->payment_method, $onlineGateways, true)) {
                                return response()->json([
                                    'success' => false,
                                    'message' => 'طريقة الدفع المحددة غير مفعلة لهذا المتجر.',
                                    'errors' => ['payment_method' => ['طريقة الدفع غير مفعلة.']]
                                ], 422);
                            }
                        }
                    }
                }
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

            // Resolve the store's default currency so every order records what
            // the customer is charged (gateway payloads use it instead of
            // hard-coded USD).
            $currencyCode = 'ILS';
            $currencySourceStore = \App\Models\Store::find($request->store_id);
            if ($currencySourceStore && $currencySourceStore->user) {
                $currencyCode = \App\Models\Setting::getUserSettings($currencySourceStore->user->id, $currencySourceStore->id)['defaultCurrency']
                    ?? \App\Models\StoreConfiguration::getConfiguration($currencySourceStore->id)['default_currency']
                    ?? 'ILS';
            }

            // Prepare order data — postal codes are nullable for local delivery
            $orderData = [
                'store_id' => $request->store_id,
                'currency' => strtoupper($currencyCode),
                'customer_first_name' => $request->customer_first_name,
                'customer_last_name' => $request->customer_last_name,
                'customer_email' => $request->customer_email,
                'customer_phone' => $request->customer_phone,
                'shipping_address' => $request->shipping_address,
                'shipping_city' => $request->shipping_city,
                'shipping_state' => $request->shipping_state,
                'shipping_postal_code' => $request->shipping_postal_code ?? $request->postal_code ?? null,
                'shipping_country' => $request->shipping_country,
                'billing_address' => $request->billing_address,
                'billing_city' => $request->billing_city,
                'billing_state' => $request->billing_state,
                'billing_postal_code' => $request->billing_postal_code ?? $request->postal_code ?? null,
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

            // Apply loyalty points redemption (if requested) before order creation – cap discount to max allowed
            $loyaltyPointsRequested = (float) ($request->input('loyalty_points') ?? $request->input('loyalty_points_used') ?? 0);
            $loyaltyDiscount = 0;
            if ($loyaltyPointsRequested > 0 && Auth::guard('customer')->check()) {
                try {
                    $tmpLoyalty = app(\App\Models\LoyaltySetting::class)::forStore($request->store_id);
                    $tmpBalance = \App\Models\LoyaltyTransaction::balanceFor($request->store_id, Auth::guard('customer')->id());
                    $canUse = $tmpBalance >= (float) $tmpLoyalty->minimum_redemption_points && $tmpLoyalty->is_enabled;
                    if ($canUse) {
                        $balanceCash = $tmpLoyalty->calculateRedemptionValue($tmpBalance);
                        $maxDiscount = $calculation['total'] * ((float) $tmpLoyalty->maximum_discount_percentage / 100);
                        $pts = min($loyaltyPointsRequested, $tmpBalance);
                        $discount = $tmpLoyalty->calculateRedemptionValue($pts);
                        $discount = min($discount, $maxDiscount, $balanceCash, $calculation['total']);
                        $loyaltyDiscount = round($discount, 2);
                        if ($loyaltyDiscount > 0) {
                            $orderData['discount_amount'] = ($orderData['discount_amount'] ?? 0) + $loyaltyDiscount;
                            $orderData['total_amount'] = max(0, $calculation['total'] - $loyaltyDiscount);
                        }
                    }
                } catch (\Throwable $e) {
                    \Log::warning('Loyalty pre-check failed', ['error' => $e->getMessage()]);
                }
            }

            // Create order
            $order = $this->orderService->createOrder($orderData, $cartItems);

            // Persist loyalty redemption transaction after order is created
            if ($loyaltyDiscount > 0 && $loyaltyPointsRequested > 0) {
                try {
                    app(\App\Services\LoyaltyService::class)->redeemPoints($order, $loyaltyPointsRequested);
                } catch (\Throwable $e) {
                    \Log::warning('Loyalty redeem failed', ['order_id' => $order->id ?? null, 'error' => $e->getMessage()]);
                }
            }
            
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
            
            // Clear cart ONLY after successful payment/order — scoped correctly for guest vs logged-in
            if ($paymentResult['success']) {
                $cartQuery = \App\Models\CartItem::where('store_id', $request->store_id);
                if (Auth::guard('customer')->check()) {
                    $cartQuery->where('customer_id', Auth::guard('customer')->id());
                } else {
                    $cartQuery->where('session_id', session()->getId())->whereNull('customer_id');
                }
                $cartQuery->delete();
                // Also clear any remaining guest session items for this store (defensive for post-login sync)
                if (Auth::guard('customer')->check()) {
                    \App\Models\CartItem::where('store_id', $request->store_id)
                        ->where('session_id', session()->getId())
                        ->whereNull('customer_id')
                        ->delete();
                }
            }

            if ($paymentResult['success']) {
                // Hosted-redirect gateways (Stripe, PayPal, CoinGate, ... and the
                // newly wired adapters: Tap, PayTR, iyzico, Khalti, Easebuzz, Ozow,
                // Authorize.Net, FedaPay, Nepalste, Aamarpay) all return a
                // checkout_url for the frontend to redirect the customer to.
                if (isset($paymentResult['checkout_url'])) {
                    return response()->json([
                        'success' => true,
                        'redirect_url' => $paymentResult['checkout_url'],
                        'order_number' => $order->order_number
                    ]);
                }

                // HTML-form gateways (PayFast, PayHere, CinetPay, Paiement Pro):
                // return the endpoint + fields so the checkout frontend can
                // auto-submit the payment form.
                if (isset($paymentResult['payment_form']) && isset($paymentResult['payment_form']['action'])) {
                    $form = $paymentResult['payment_form'];
                    return response()->json([
                        'success' => true,
                        'payment_method' => $request->payment_method,
                        'form_endpoint' => $form['action'],
                        'form_fields' => $form['fields'] ?? [],
                        'order_id' => $order->id,
                        'order_number' => $order->order_number,
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
                // The order was created and stock deducted before the payment
                // could be initialized. Mark it failed so the Order updater
                // restores the reserved inventory automatically.
                if ($order instanceof \App\Models\Order) {
                    $order->forceFill(['status' => 'failed', 'payment_status' => 'failed'])->save();
                }

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
            // Payment bridge (or anything post-creation) threw. If an order was
            // already created, release its reserved stock before reporting.
            if (isset($order) && $order instanceof \App\Models\Order) {
                try {
                    $order->forceFill(['status' => 'failed', 'payment_status' => 'failed'])->save();
                } catch (\Throwable $ignored) {
                    \Illuminate\Support\Facades\Log::warning('Could not finalize failed order state', ['order_id' => $order->id ?? null]);
                }
            }

            return response()->json([
                'success' => false,
                'message' => 'تعذر إتمام الطلب: ' . $e->getMessage()
            ], 500);
        }
    }
}