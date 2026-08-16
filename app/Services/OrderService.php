<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\CartItem;
use App\Models\Customer;
use App\Models\Product;
use App\Models\AdvancedCoupon;
use App\Services\LoyaltyService;
use App\Services\AbandonedCartService;
use App\Services\AdvancedCouponService;
use App\Services\CodPaymentService;
use App\Services\MerchantNotificationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\Checkout\Session;

class OrderService
{
    public function createOrder(array $orderData, array $cartItems): Order
    {
        $order = DB::transaction(function () use ($orderData, $cartItems) {
            // Create the order
            $order = Order::create([
                'order_number' => Order::generateOrderNumber(),
                'store_id' => $orderData['store_id'],
                'customer_id' => Auth::guard('customer')->check() ? Auth::guard('customer')->id() : null,
                'session_id' => session()->getId(),
                'status' => 'pending',
                'payment_status' => 'pending',
                
                // Customer info
                'customer_email' => $orderData['customer_email'],
                'customer_phone' => $orderData['customer_phone'],
                'customer_first_name' => $orderData['customer_first_name'],
                'customer_last_name' => $orderData['customer_last_name'],
                
                // Shipping address
                'shipping_address' => $orderData['shipping_address'],
                'shipping_city' => $orderData['shipping_city'],
                'shipping_state' => $orderData['shipping_state'],
                'shipping_postal_code' => $orderData['shipping_postal_code'],
                'shipping_country' => $orderData['shipping_country'],
                
                // Billing address
                'billing_address' => $orderData['billing_address'],
                'billing_city' => $orderData['billing_city'],
                'billing_state' => $orderData['billing_state'],
                'billing_postal_code' => $orderData['billing_postal_code'],
                'billing_country' => $orderData['billing_country'],
                
                // Pricing
                'subtotal' => $orderData['subtotal'],
                'tax_amount' => $orderData['tax_amount'],
                'shipping_amount' => $orderData['shipping_amount'],
                'discount_amount' => $orderData['discount_amount'],
                'total_amount' => $orderData['total_amount'],
                
                // Payment info
                'payment_method' => $orderData['payment_method'],
                'bank_transfer_receipt' => $orderData['bank_transfer_receipt'] ?? null,
                'whatsapp_number' => $orderData['whatsapp_number'] ?? null,
                
                // Shipping info
                'shipping_method_id' => $orderData['shipping_method_id'] ?? null,
                
                // Additional info
                'notes' => $orderData['notes'] ?? null,
                'coupon_code' => $orderData['coupon_code'] ?? null,
                'coupon_discount' => $orderData['coupon_discount'] ?? 0,
            ]);

            // Create order items and update inventory
            foreach ($cartItems as $cartItem) {
                $unitPrice = $cartItem['sale_price'] ?? $cartItem['price'];
                
                // Check and update product inventory
                $product = Product::find($cartItem['product_id']);
                if ($product) {
                    if ($product->stock < $cartItem['quantity']) {
                        throw new \Exception("Insufficient stock for product: {$cartItem['name']}");
                    }
                    
                    // Reduce product stock
                    $product->decrement('stock', $cartItem['quantity']);

                    // Notify the merchant when stock runs low
                    if ($product->stock <= 5) {
                        MerchantNotificationService::lowStock($product);
                    }
                }
                
                // Calculate tax for this item
                $itemTotal = $unitPrice * $cartItem['quantity'];
                $taxAmount = 0;
                $taxName = null;
                $taxPercentage = null;
                
                if (isset($cartItem['taxPercentage']) && $cartItem['taxPercentage'] > 0) {
                    $taxPercentage = $cartItem['taxPercentage'];
                    $taxName = $cartItem['taxName'] ?? 'Tax';
                    $taxAmount = ($itemTotal * $taxPercentage) / 100;
                }
                
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $cartItem['product_id'],
                    'product_name' => $cartItem['name'],
                    'product_sku' => $cartItem['sku'] ?? null,
                    'product_price' => $cartItem['price'],
                    'quantity' => $cartItem['quantity'],
                    'product_variants' => $cartItem['variants'] ?? null,
                    'unit_price' => $unitPrice,
                    'total_price' => $itemTotal,
                    'tax_details' => json_encode([
                        'tax_name' => $taxName,
                        'tax_percentage' => $taxPercentage,
                        'tax_amount' => $taxAmount,
                    ]),
                ]);
            }

            // Clear cart items after order creation
            $this->clearCart($orderData['store_id']);

            // Dispatch accounting sync job
            try {
                dispatch(new \App\Jobs\SyncOrderToAccounting($order))->onQueue('accounting');
            } catch (\Exception $e) {
                Log::warning('Failed to dispatch accounting sync', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            }

            // Handle post-order extras (abandoned cart recovery + loyalty points)
            $this->handlePostOrderExtras($order);

            return $order;
        });

        // Fire the OrderCreated event AFTER the transaction commits so slow
        // notification listeners (email/SMS) never hold DB locks or delay the
        // order confirmation response.
        event(new \App\Events\OrderCreated($order));

        return $order;
    }

    public function processPayment(Order $order, ?string $storeSlug = null): array
    {
        switch ($order->payment_method) {
            case 'cod':
                return $this->processCashOnDelivery($order);
            case 'bank':
                return $this->processBankTransferPayment($order);
            case 'whatsapp':
                return $this->processWhatsAppPayment($order);
            case 'telegram':
                return $this->processTelegramPayment($order);
            case 'stripe':
                return $this->processStripePayment($order, $storeSlug);
            case 'paypal':
                return $this->processPayPalPayment($order, $storeSlug);
            case 'razorpay':
                return $this->processRazorpayPayment($order);
            case 'paystack':
                return $this->processPaystackPayment($order, $storeSlug);
            case 'mercadopago':
                return $this->processMercadoPagoPayment($order, $storeSlug);
            case 'xendit':
                return $this->processXenditPayment($order, $storeSlug);
            case 'toyyibpay':
                return $this->processToyyibPayPayment($order, $storeSlug);
            case 'cashfree':
                return $this->processCashfreePayment($order);
            case 'flutterwave':
                return $this->processFlutterwavePayment($order, $storeSlug);
            case 'paytabs':
                return $this->processPaytabsPayment($order, $storeSlug);
            case 'skrill':
                return $this->processSkrillPayment($order, $storeSlug);
            case 'coingate':
                return $this->processCoinGatePayment($order, $storeSlug);
            case 'midtrans':
                return $this->processMidtransPayment($order, $storeSlug);
            case 'mollie':
                return $this->processMolliePayment($order, $storeSlug);
            case 'benefit':
                return $this->processBenefitPayment($order, $storeSlug);
            case 'yookassa':
                return $this->processYooKassaPayment($order, $storeSlug);
            case 'jawwal_pay':
            case 'pal_pay':
            case 'zain_cash':
            case 'orange_money':
            case 'cliq':
            case 'zain_cash_jo':
            case 'orange_money_jo':
            case 'etihad_wallet':
            case 'dinar_pay':
            case 'bank_palestine':
            case 'al_quds_bank':
            case 'arab_islamic_bank':
            case 'cairo_amman_bank':
            case 'housing_bank':
            case 'safad_bank':
            case 'jordan_kuwait_bank':
            case 'arab_bank':
            case 'housing_bank_jo':
            case 'cairo_amman_bank_jo':
            case 'safad_bank_jo':
            case 'usdt_trc20':
            case 'usdt_erc20':
            case 'usdt_bep20':
            case 'usdt_polygon':
            case 'usdt_solana':
                return $this->processOfflinePayment($order);
            default:
                return ['success' => false, 'message' => 'Unsupported payment method: ' . $order->payment_method];
        }
    }

    private function processCashOnDelivery(Order $order): array
    {
        $order->update([
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        return [
            'success' => true,
            'message' => 'تم إتمام الطلب بنجاح. سيتم تحصيل الدفع عند الاستلام.',
            'order_id' => $order->id,
            'order_number' => $order->order_number,
        ];
    }

    private function processBankTransferPayment(Order $order): array
    {
        $order->update([
            'status' => 'pending',
            'payment_status' => 'pending',
        ]);

        return [
            'success' => true,
            'message' => 'تم إتمام الطلب بنجاح. يرجى تحويل الدفع إلى تفاصيل الحساب البنكي المقدمة. سيتم معالجة طلبك بعد التحقق من الدفع.',
            'order_id' => $order->id,
            'order_number' => $order->order_number,
        ];
    }

    private function processOfflinePayment(Order $order): array
    {
        $order->update([
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_gateway' => $order->payment_method,
        ]);

        return [
            'success' => true,
            'message' => 'تم إتمام الطلب بنجاح. يرجى إكمال الدفع وفقاً للتعليمات المقدمة. سيتم معالجة طلبك بعد التحقق من الدفع.',
            'order_id' => $order->id,
            'order_number' => $order->order_number,
        ];
    }

    private function processWhatsAppPayment(Order $order): array
    {
        $order->update([
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_gateway' => 'whatsapp',
        ]);

        // Send WhatsApp message
        if ($order->whatsapp_number) {
            $whatsappService = new \App\Services\WhatsAppService();
            $result = $whatsappService->sendOrderConfirmation($order, $order->whatsapp_number);
        } else {
            \Log::warning('No WhatsApp number provided for order', ['order_id' => $order->id]);
        }

        // Get WhatsApp redirect URL from session
        $whatsappUrl = \App\Services\WhatsAppService::getWhatsAppRedirectUrl();
        
        return [
            'success' => true,
            'message' => 'تم إتمام الطلب بنجاح. سيتم التواصل معك عبر واتساب لتأكيد الدفع.',
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'whatsapp_redirect' => true,
            'whatsapp_data' => [
                'url' => $whatsappUrl,
                'order_id' => $order->id
            ]
        ];
    }

    private function processTelegramPayment(Order $order): array
    {
        $order->update([
            'status' => 'pending',
            'payment_status' => 'pending',
            'payment_gateway' => 'telegram',
        ]);

        // Telegram message will be sent by the OrderCreated event listener

        return [
            'success' => true,
            'message' => 'تم إتمام الطلب بنجاح. ستصلك رسالة عبر تيليجرام.',
            'order_id' => $order->id,
            'order_number' => $order->order_number,
        ];
    }

    private function processStripePayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            // Get store owner's Stripe settings
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            
            $stripeConfig = getPaymentMethodConfig('stripe', $storeModel->user->id, $order->store_id);
            
            if (!$stripeConfig['enabled'] || !$stripeConfig['secret']) {
                return ['success' => false, 'message' => 'Stripe is not configured for this store'];
            }
            
            Stripe::setApiKey($stripeConfig['secret']);
            
            // Use store's actual URL (custom domain, subdomain, or default)
            $storeBaseUrl = rtrim($storeModel->getStoreUrl(request()), '/');
            $successUrl = $storeBaseUrl . '/stripe/success/' . $order->order_number;
            $cancelUrl = $storeBaseUrl . '/checkout';
            
            // Create checkout session
            $checkoutSession = Session::create([
                'payment_method_types' => ['card'],
                'line_items' => [[
                    'price_data' => [
                        'currency' => 'usd',
                        'product_data' => [
                            'name' => "Order #{$order->order_number}",
                        ],
                        'unit_amount' => intval($order->total_amount * 100),
                    ],
                    'quantity' => 1,
                ]],
                'mode' => 'payment',
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'metadata' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'store_id' => $order->store_id,
                ],
            ]);
            
            $order->update([
                'payment_transaction_id' => $checkoutSession->id,
                'payment_details' => [
                    'checkout_session_id' => $checkoutSession->id,
                ],
            ]);
            
            return [
                'success' => true,
                'message' => 'Stripe checkout session created',
                'checkout_url' => $checkoutSession->url,
                'order_id' => $order->id,
                'order_number' => $order->order_number,
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Stripe payment failed: ' . $e->getMessage()
            ];
        }
    }

    private function processPayPalPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            // Get store owner's PayPal settings
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            
            $paypalConfig = getPaymentMethodConfig('paypal', $storeModel->user->id, $order->store_id);
            
            if (!$paypalConfig['enabled'] || !$paypalConfig['client_id'] || !$paypalConfig['secret']) {
                return ['success' => false, 'message' => 'PayPal is not configured for this store'];
            }
            
            // Use direct PayPal API calls
            $baseUrl = $paypalConfig['mode'] === 'live' ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
            
            // Get access token
            $tokenResponse = \Http::withBasicAuth($paypalConfig['client_id'], $paypalConfig['secret'])
                ->asForm()
                ->post($baseUrl . '/v1/oauth2/token', [
                    'grant_type' => 'client_credentials'
                ]);
            
            if (!$tokenResponse->successful()) {
                return ['success' => false, 'message' => 'PayPal authentication failed'];
            }
            
            $accessToken = $tokenResponse->json()['access_token'];
            
            // Create PayPal order
            $orderResponse = \Http::withToken($accessToken)
                ->post($baseUrl . '/v2/checkout/orders', [
                    'intent' => 'CAPTURE',
                    'application_context' => [
                        'return_url' => $storeModel->route('paypal/success/' . $order->order_number),
                        'cancel_url' => $storeModel->route('checkout'),
                    ],
                    'purchase_units' => [
                        [
                            'amount' => [
                                'currency_code' => 'USD',
                                'value' => number_format($order->total_amount, 2, '.', ''),
                            ],
                            'description' => "Order #{$order->order_number}",
                        ]
                    ],
                ]);
            
            if (!$orderResponse->successful()) {
                return ['success' => false, 'message' => 'PayPal order creation failed: ' . $orderResponse->body()];
            }
            
            $paypalOrder = $orderResponse->json();
            
            if (isset($paypalOrder['id'])) {
                $order->update([
                    'payment_transaction_id' => $paypalOrder['id'],
                    'payment_details' => [
                        'paypal_order_id' => $paypalOrder['id'],
                    ],
                ]);
                
                // Get approval URL
                $approvalUrl = collect($paypalOrder['links'])->firstWhere('rel', 'approve')['href'] ?? null;
                
                return [
                    'success' => true,
                    'message' => 'PayPal order created successfully',
                    'checkout_url' => $approvalUrl,
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ];
            } else {
                return ['success' => false, 'message' => 'Failed to create PayPal order: ' . json_encode($paypalOrder)];
            }
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'PayPal payment failed: ' . $e->getMessage()
            ];
        }
    }

    private function processRazorpayPayment(Order $order): array
    {
        try {
            // Get store owner's Razorpay settings
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            
            $razorpayConfig = getPaymentMethodConfig('razorpay', $storeModel->user->id, $order->store_id);
            
            if (!$razorpayConfig['enabled'] || !$razorpayConfig['key'] || !$razorpayConfig['secret']) {
                return ['success' => false, 'message' => 'Razorpay is not configured for this store'];
            }
            
            // Initialize Razorpay API
            $api = new \Razorpay\Api\Api($razorpayConfig['key'], $razorpayConfig['secret']);
            
            // Generate unique order ID for Razorpay
            $razorpayOrderId = 'store_rp_' . $order->id . '_' . time() . '_' . uniqid();
            
            // Create Razorpay order
            $orderData = [
                'receipt' => $razorpayOrderId,
                'amount' => (int)($order->total_amount * 100), // Amount in paise
                'currency' => $razorpayConfig['currency'] ?? 'INR',
                'notes' => [
                    'store_order_id' => (string)$order->id,
                    'order_number' => $order->order_number,
                    'store_id' => (string)$order->store_id
                ]
            ];
            
            $razorpayOrder = $api->order->create($orderData);
            
            // Update order with Razorpay details
            $order->update([
                'payment_gateway' => 'razorpay',
                'payment_transaction_id' => $razorpayOrder->id,
                'payment_details' => [
                    'razorpay_order_id' => $razorpayOrder->id,
                    'receipt' => $razorpayOrderId,
                ],
            ]);
            
            // Get store title for Razorpay
            $storeTitle = getSetting('titleText', null, $storeModel->user->id, $order->store_id);
            
            if (!$storeTitle) {
                // Try without store_id (global company setting)
                $storeTitle = getSetting('titleText', null, $storeModel->user->id, null);
            }
            if (!$storeTitle) {
                $storeTitle = 'Wusool';
            }
            
            return [
                'success' => true,
                'message' => 'Razorpay order created successfully',
                'razorpay_order_id' => $razorpayOrder->id,
                'amount' => (int)($order->total_amount * 100),
                'currency' => $razorpayConfig['currency'] ?? 'INR',
                'key_id' => $razorpayConfig['key'],
                'store_title' => $storeTitle,
                'order_id' => $order->id,
                'order_number' => $order->order_number,
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Razorpay payment failed: ' . $e->getMessage()
            ];
        }
    }

    private function processPaystackPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            // Get store owner's Paystack settings
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            
            $paystackConfig = getPaymentMethodConfig('paystack', $storeModel->user->id, $order->store_id);
            
            if (!$paystackConfig['enabled'] || !$paystackConfig['secret_key']) {
                return ['success' => false, 'message' => 'Paystack is not configured for this store'];
            }
            
            // Generate unique reference for Paystack
            $reference = 'ORD' . strtoupper(uniqid()) . time();
            
            // Build callback URL
            $callbackUrl = $storeModel->route('paystack/success/' . $order->order_number);
            
            // Prepare transaction data
            $transactionData = [
                'email' => $order->customer_email ?? 'customer@example.com',
                'amount' => (float)$order->total_amount * 100, // Convert to kobo/cents
                'reference' => $reference,
                'currency' => $paystackConfig['currency'] ?? 'NGN',
                'metadata' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'store_id' => $order->store_id,
                    'customer_name' => trim($order->customer_first_name . ' ' . $order->customer_last_name),
                    'customer_phone' => $order->customer_phone ?? '',
                ],
                'callback_url' => $callbackUrl,
            ];
            
            // Add line items if available
            if ($order->items->count() > 0) {
                $custom_fields = [];
                foreach ($order->items as $item) {
                    $custom_fields[] = [
                        'display_name' => $item->product_name,
                        'value' => $item->quantity . ' x ' . number_format($item->unit_price, 2),
                    ];
                }
                $transactionData['custom_fields'] = $custom_fields;
            }
            
            // Initialize Paystack transaction via API
            $response = \Http::withHeaders([
                'Authorization' => 'Bearer ' . $paystackConfig['secret_key'],
                'Content-Type' => 'application/json',
            ])->post('https://api.paystack.co/transaction/initialize', $transactionData);
            
            if (!$response->successful()) {
                return ['success' => false, 'message' => 'Paystack initialization failed: ' . $response->body()];
            }
            
            $result = $response->json();
            
            if (!$result['status'] || !isset($result['data']['authorization_url'])) {
                return ['success' => false, 'message' => 'Paystack response error: ' . json_encode($result)];
            }
            
            // Update order with Paystack details
            $order->update([
                'payment_gateway' => 'paystack',
                'payment_transaction_id' => $result['data']['reference'],
                'payment_details' => [
                    'paystack_reference' => $result['data']['reference'],
                    'paystack_authorization_url' => $result['data']['authorization_url'],
                    'access_code' => $result['data']['access_code'] ?? null,
                ],
            ]);
            
            return [
                'success' => true,
                'message' => 'Paystack transaction initialized successfully',
                'authorization_url' => $result['data']['authorization_url'],
                'reference' => $result['data']['reference'],
                'access_code' => $result['data']['access_code'] ?? null,
                'order_id' => $order->id,
                'order_number' => $order->order_number,
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Paystack payment failed: ' . $e->getMessage()
            ];
        }
    }

    private function processMercadoPagoPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            // Get store owner's MercadoPago settings
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            
            $mercadoConfig = getPaymentMethodConfig('mercadopago', $storeModel->user->id, $order->store_id);
            
            if (!$mercadoConfig['enabled'] || !$mercadoConfig['access_token']) {
                return ['success' => false, 'message' => 'MercadoPago is not configured for this store'];
            }
            
            // Get store currency
            $storeSettings = \App\Models\Setting::getUserSettings($storeModel->user->id, $order->store_id);
            $currencyCode = $storeSettings['defaultCurrency'] ?? 'BRL';

            // Auto-detect mode from token prefix
            $accessToken = $mercadoConfig['access_token'];
            $mode = str_starts_with($accessToken, 'TEST-') ? 'sandbox' : 'production';
            $baseUrl = 'https://api.mercadopago.com';

            // Build success/failure URLs with order number for reference
            $successUrl = $storeModel->enable_custom_domain && $storeModel->custom_domain
                ? 'https://' . $storeModel->custom_domain . '/mercadopago/success/' . $order->order_number
                : $storeModel->route('mercadopago/success/' . $order->order_number);

            $failureUrl = $storeModel->enable_custom_domain && $storeModel->custom_domain
                ? 'https://' . $storeModel->custom_domain
                : $storeModel->route();

            // Create preference items from order items
            $items = [];
            foreach ($order->items as $item) {
                $items[] = [
                    'title'       => $item->product_name,
                    'quantity'    => $item->quantity,
                    'unit_price'  => (float) $item->unit_price,
                    'currency_id' => $currencyCode,
                ];
            }
            
            // Add shipping cost as a separate item if applicable
            if ($order->shipping_amount > 0) {
                $items[] = [
                    'title'       => __('Shipping Cost'),
                    'quantity'    => 1,
                    'unit_price'  => (float) $order->shipping_amount,
                    'currency_id' => $currencyCode,
                ];
            }
            
            // Add tax as a separate item if applicable
            if ($order->tax_amount > 0) {
                $items[] = [
                    'title'       => __('Tax'),
                    'quantity'    => 1,
                    'unit_price'  => (float) $order->tax_amount,
                    'currency_id' => $currencyCode,
                ];
            }
            
            // Apply discount as a negative item if applicable
            if ($order->discount_amount > 0) {
                $items[] = [
                    'title'       => __('Discount'),
                    'quantity'    => 1,
                    'unit_price'  => (float) -$order->discount_amount,
                    'currency_id' => $currencyCode,
                ];
            }

            // Calculate total from items to ensure it matches order total
            $calculatedTotal = 0;
            foreach ($items as $item) {
                $calculatedTotal += $item['unit_price'] * $item['quantity'];
            }
            
            // Verify the calculated total matches the order total
            if (abs($calculatedTotal - (float)$order->total_amount) > 0.01) {
                Log::warning('MercadoPago amount mismatch', [
                    'calculated' => $calculatedTotal,
                    'order_total' => $order->total_amount,
                    'order_number' => $order->order_number
                ]);
            }

            // Create preference
            $preferenceData = [
                'items' => $items,
                'back_urls' => [
                    'success' => $successUrl,
                    'failure' => $failureUrl,
                    'pending' => $failureUrl,
                ],
                'external_reference' => $order->order_number,
                'notification_url'   => route('store.mercadopago.webhook'), // Use store webhook
                'binary_mode'        => true, // No pending status, only success or failure
            ];
            
            // Add metadata to include order number and other details
            // This ensures order info is available without affecting item display
            $preferenceData['metadata'] = [
                'order_number' => $order->order_number,
                'store_id' => $order->store_id,
                'customer_email' => $order->customer_email ?? '',
            ];
            
            // Add payer information if available
            if ($order->customer_email) {
                $preferenceData['payer'] = [
                    'email' => $order->customer_email,
                ];
                
                if ($order->customer_first_name || $order->customer_last_name) {
                    $preferenceData['payer']['name'] = trim($order->customer_first_name . ' ' . $order->customer_last_name);
                }
            }
            
            $response = \Http::withToken($mercadoConfig['access_token'])
                ->post($baseUrl . '/checkout/preferences', $preferenceData);
            
            if (!$response->successful()) {
                return ['success' => false, 'message' => 'MercadoPago preference creation failed: ' . $response->body()];
            }
            
            $preference = $response->json();
            
            if (isset($preference['id'])) {
                $order->update([
                    'payment_transaction_id' => $preference['id'],
                    'payment_details' => [
                        'mercadopago_preference_id' => $preference['id'],
                        'mode' => $mode,
                    ],
                ]);
                
                return [
                    'success' => true,
                    'message' => 'MercadoPago preference created successfully',
                    'checkout_url' => $preference['init_point'],
                    'sandbox_url' => $preference['sandbox_init_point'] ?? null,
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ];
            } else {
                return ['success' => false, 'message' => 'Failed to create MercadoPago preference: ' . json_encode($preference)];
            }
            
        } catch (\Exception $e) {
            Log::error('MercadoPago payment processing error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'MercadoPago payment failed: ' . $e->getMessage()
            ];
        }
    }

    private function processXenditPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            
            $xenditConfig = getPaymentMethodConfig('xendit', $storeModel->user->id, $order->store_id);
            
            if (!$xenditConfig['enabled'] || !$xenditConfig['api_key']) {
                return ['success' => false, 'message' => 'Xendit is not configured for this store'];
            }
            
            $externalId = 'order_' . $order->order_number . '_' . time();
            
            $invoiceData = [
                'external_id' => $externalId,
                'amount' => (float)$order->total_amount,
                'description' => "Order #{$order->order_number} at " . ($storeModel->name ?? 'Store'),
                'invoice_duration' => 86400,
                'currency' => $xenditConfig['currency'] ?? 'PHP',
                'customer' => [
                    'given_names' => $order->customer_first_name,
                    'surname' => $order->customer_last_name,
                    'email' => $order->customer_email,
                    'mobile_number' => $order->customer_phone
                ],
                'success_redirect_url' => $storeModel->route('xendit/success/' . $order->order_number),
                'failure_redirect_url' => $storeModel->route('checkout'),
            ];
            
            $response = \Http::withHeaders([
                'Authorization' => 'Basic ' . base64_encode($xenditConfig['api_key'] . ':'),
                'Content-Type' => 'application/json'
            ])->post('https://api.xendit.co/v2/invoices', $invoiceData);
            
            if (!$response->successful()) {
                \Log::error('Xendit Invoice Creation Failed: ' . $response->body());
                return ['success' => false, 'message' => 'Xendit payment creation failed: ' . $response->body()];
            }
            
            $result = $response->json();
            
            if (isset($result['invoice_url'])) {
                $order->update([
                    'payment_transaction_id' => $result['id'],
                    'payment_details' => [
                        'xendit_invoice_id' => $result['id'],
                        'external_id' => $externalId,
                    ],
                ]);
                
                return [
                    'success' => true,
                    'message' => 'Xendit invoice created successfully',
                    'checkout_url' => $result['invoice_url'],
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ];
            } else {
                return ['success' => false, 'message' => 'Failed to create Xendit invoice'];
            }
            
        } catch (\Exception $e) {
            \Log::error('Xendit Payment Error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Xendit payment failed: ' . $e->getMessage()
            ];
        }
    }

    private function processToyyibPayPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            
            $toyyibpayConfig = getPaymentMethodConfig('toyyibpay', $storeModel->user->id, $order->store_id);
            
            if (!$toyyibpayConfig['enabled'] || !$toyyibpayConfig['secret_key'] || !$toyyibpayConfig['category_code']) {
                return ['success' => false, 'message' => 'ToyyibPay is not configured for this store'];
            }

            $mode = $toyyibpayConfig['mode'] ?? 'sandbox';
            
            // Format phone number for Malaysian format
            $phone = preg_replace('/[^0-9]/', '', $order->customer_phone ?? '1234567890');
            if (!str_starts_with($phone, '60')) {
                $phone = '60' . ltrim($phone, '0');
            }

            $paymentId = 'store_toyyib_' . $order->id . '_' . time() . '_' . uniqid();

            $returnUrl = $storeModel->route('toyyibpay/success/' . $order->order_number);
            $callbackUrl = route('toyyibpay.callback'); // Shared callback for now, but usually store needs its own or shared with different reference

            $billData = [
                'userSecretKey' => $toyyibpayConfig['secret_key'],
                'categoryCode' => $toyyibpayConfig['category_code'],
                'billName' => 'Order #' . $order->order_number,
                'billDescription' => 'Payment for order #' . $order->order_number,
                'billPriceSetting' => 1,
                'billPayorInfo' => 1,
                'billAmount' => intval((float)$order->total_amount * 100), // Convert to cents
                'billReturnUrl' => $returnUrl,
                'billCallbackUrl' => $callbackUrl,
                'billExternalReferenceNo' => $paymentId,
                'billTo' => ($order->customer_first_name ?? 'Customer') . ' ' . ($order->customer_last_name ?? ''),
                'billEmail' => $order->customer_email,
                'billPhone' => $phone,
                'billSplitPayment' => 0,
                'billSplitPaymentArgs' => '',
                'billPaymentChannel' => '0',
                'billContentEmail' => 'Thank you for your order!',
                'billChargeToCustomer' => 1,
                'billExpiryDate' => date('d-m-Y', strtotime('+3 days')),
                'billExpiryDays' => 3
            ];

            $apiUrl = ($mode == 'live') 
                ? 'https://toyyibpay.com/index.php/api/createBill'
                : 'https://dev.toyyibpay.com/index.php/api/createBill';

            $curl = curl_init();
            curl_setopt($curl, CURLOPT_POST, 1);
            curl_setopt($curl, CURLOPT_URL, $apiUrl);
            curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($curl, CURLOPT_POSTFIELDS, $billData);
            curl_setopt($curl, CURLOPT_TIMEOUT, 30);
            
            $result = curl_exec($curl);
            $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
            $curlError = curl_error($curl);
            curl_close($curl);
            
            if ($curlError) {
                return ['success' => false, 'message' => 'ToyyibPay cURL error: ' . $curlError];
            }
            
            if ($httpCode !== 200) {
                return ['success' => false, 'message' => 'ToyyibPay HTTP Error: ' . $httpCode];
            }
            
            $responseData = json_decode($result, true);
            
            if (isset($responseData[0]['BillCode'])) {
                $order->update([
                    'payment_gateway' => 'toyyibpay',
                    'payment_transaction_id' => $responseData[0]['BillCode'],
                    'payment_details' => [
                        'toyyibpay_bill_code' => $responseData[0]['BillCode'],
                        'external_reference' => $paymentId
                    ]
                ]);

                $redirectBase = ($mode == 'live') ? 'https://toyyibpay.com/' : 'https://dev.toyyibpay.com/';
                
                return [
                    'success' => true,
                    'message' => 'ToyyibPay payment created successfully',
                    'checkout_url' => $redirectBase . $responseData[0]['BillCode'],
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ];
            }

            return ['success' => false, 'message' => 'ToyyibPay payment failed: ' . ($responseData[0]['msg'] ?? 'Unknown error')];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'ToyyibPay payment failed: ' . $e->getMessage()
            ];
        }
    }

    private function processFlutterwavePayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }

            $flutterwaveConfig = getPaymentMethodConfig('flutterwave', $storeModel->user->id, $order->store_id);

            if (!$flutterwaveConfig['enabled'] || !$flutterwaveConfig['public_key'] || !$flutterwaveConfig['secret_key']) {
                return ['success' => false, 'message' => 'Flutterwave is not configured for this store'];
            }

            $txRef = 'store_flw_' . $order->order_number . '_' . time();

            $order->update([
                'payment_gateway' => 'flutterwave',
                'payment_transaction_id' => $txRef,
                'payment_details' => [
                    'tx_ref' => $txRef,
                    'public_key' => $flutterwaveConfig['public_key'],
                ],
            ]);

            return [
                'success' => true,
                'message' => 'Flutterwave payment initialized',
                'payment_method' => 'flutterwave',
                'public_key' => $flutterwaveConfig['public_key'],
                'tx_ref' => $txRef,
                'amount' => (float) $order->total_amount,
                'currency' => $flutterwaveConfig['currency'] ?? 'NGN',
                'customer_email' => $order->customer_email,
                'customer_name' => trim($order->customer_first_name . ' ' . $order->customer_last_name),
                'customer_phone' => $order->customer_phone ?? '',
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'redirect_url' => $storeModel->route('flutterwave/success/' . $order->order_number),
            ];

        } catch (\Exception $e) {
            Log::error('Flutterwave Store Payment Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Flutterwave payment failed: ' . $e->getMessage()];
        }
    }

    private function processPaytabsPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }

            $paytabsConfig = getPaymentMethodConfig('paytabs', $storeModel->user->id, $order->store_id);

            if (!$paytabsConfig['enabled'] || empty($paytabsConfig['profile_id']) || empty($paytabsConfig['server_key'])) {
                return ['success' => false, 'message' => 'PayTabs is not configured for this store'];
            }

            $cartId = 'STORE_PT_' . $order->id . '_' . time();
            $currency = settings($storeModel->user->id, $order->store_id)['defaultCurrency'] ?? 'USD';

            config([
                'paytabs.profile_id' => $paytabsConfig['profile_id'],
                'paytabs.server_key' => $paytabsConfig['server_key'],
                'paytabs.region'     => $paytabsConfig['region'],
                'paytabs.currency'   => $currency,
            ]);

            $successUrl  = $storeModel->route('paytabs/success/' . $order->order_number, ['cart_id' => $cartId]);
            $callbackUrl = $storeModel->route('paytabs/callback/' . $order->order_number);

            $pay = \Paytabscom\Laravel_paytabs\Facades\paypage::sendPaymentCode('all')
                ->sendTransaction('sale', 'ecom')
                ->sendCart($cartId, (float) $order->total_amount, 'Order #' . $order->order_number)
                ->sendCustomerDetails(
                    trim($order->customer_first_name . ' ' . $order->customer_last_name),
                    $order->customer_email,
                    $order->customer_phone ?? '1234567890',
                    $order->billing_address ?? 'Address',
                    $order->billing_city ?? 'City',
                    $order->billing_state ?? 'State',
                    $order->billing_country ?? 'SA',
                    $order->billing_postal_code ?? '12345',
                    request()->ip()
                )
                ->sendURLs($successUrl, $callbackUrl)
                ->sendLanguage('ar')
                ->sendFramed(true)
                ->create_pay_page();

            if ($pay && is_string($pay) && !empty($pay)) {
                $order->update([
                    'payment_gateway'        => 'paytabs',
                    'payment_transaction_id' => $cartId,
                    'payment_details'        => ['cart_id' => $cartId],
                ]);

                return [
                    'success'      => true,
                    'message'      => 'PayTabs payment page created',
                    'checkout_url' => $pay,
                    'order_id'     => $order->id,
                    'order_number' => $order->order_number,
                ];
            }

            Log::error('PayTabs Store: $pay is not a valid URL. Response type: ' . gettype($pay));
            return ['success' => false, 'message' => 'PayTabs payment initialization failed'];

        } catch (\Exception $e) {
            Log::error('PayTabs Store Payment Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'PayTabs payment failed: ' . $e->getMessage()];
        }
    }

    private function clearCart(int $storeId): void
    {
        $query = CartItem::where('store_id', $storeId);
        
        if (Auth::guard('customer')->check()) {
            $query->where('customer_id', Auth::guard('customer')->id());
        } else {
            $query->where('session_id', session()->getId())
                  ->whereNull('customer_id');
        }
        
        $query->delete();
    }

    /**
     * Mark abandoned cart as recovered, award loyalty points, and record advanced coupon usage.
     */
    private function handlePostOrderExtras(Order $order): void
    {
        try {
            // Mark abandoned cart as recovered (based on session)
            try {
                $abandonedCartService = app(AbandonedCartService::class);
                $abandonedCartService->markRecovered(session()->getId(), $order->id);
            } catch (\Exception $e) {
                Log::warning('Failed to mark abandoned cart as recovered', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            }

            // Award loyalty points for the order
            try {
                $loyaltyService = app(LoyaltyService::class);
                $loyaltyService->earnPointsForOrder($order);
            } catch (\Exception $e) {
                Log::warning('Failed to award loyalty points', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            }

            // Record advanced coupon usage if applicable
            if ($order->coupon_code) {
                try {
                    $advancedCoupon = \App\Models\AdvancedCoupon::where('store_id', $order->store_id)
                        ->where('code', $order->coupon_code)
                        ->first();

                    if ($advancedCoupon && $order->discount_amount > 0) {
                        app(AdvancedCouponService::class)->recordCouponUsage(
                            $advancedCoupon,
                            $order,
                            $order->discount_amount,
                            [
                                'customer_id' => $order->customer_id,
                                'customer_identifier' => $order->customer_email,
                            ]
                        );
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to record advanced coupon usage', ['order_id' => $order->id, 'error' => $e->getMessage()]);
                }
            }

            // Create COD payment tracking record if the order is cash-on-delivery
            if ($order->payment_method === 'cod') {
                try {
                    // Avoid creating duplicates if already exists
                    $existing = \App\Models\CodPayment::where('order_id', $order->id)->first();
                    if (!$existing) {
                        app(CodPaymentService::class)->createForOrder($order);
                    }
                } catch (\Exception $e) {
                    Log::warning('Failed to create COD payment record', ['order_id' => $order->id, 'error' => $e->getMessage()]);
                }
            }
        } catch (\Exception $e) {
            Log::warning('Post-order extras failed', ['order_id' => $order->id, 'error' => $e->getMessage()]);
        }
    }

    private function processCashfreePayment(Order $order): array
    {
        try {

            $cashfreeConfig = getPaymentMethodConfig('cashfree', $order->store->user->id, $order->store_id);
            
            if (!$cashfreeConfig['enabled']) {
                Log::warning('[Cashfree Store] Payment method not enabled for store ' . $order->store_id);
                return ['success' => false, 'message' => 'Cashfree is not enabled for this store.'];
            }

            $mode = $cashfreeConfig['mode'] ?? 'sandbox';
            $baseUrl = $mode === 'production' 
                ? 'https://api.cashfree.com/pg' 
                : 'https://sandbox.cashfree.com/pg';

            $headers = [
                'x-client-id' => $cashfreeConfig['public_key'],
                'x-client-secret' => $cashfreeConfig['secret_key'],
                'x-api-version' => '2023-08-01',
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ];

            $orderId = 'store_' . $order->id . '_' . time();
            
            // Clean phone number
            $phone = $order->customer_phone ?: '9999999999';
            $phone = preg_replace('/[^0-9]/', '', $phone);
            if (strlen($phone) > 10) $phone = substr($phone, -10);
            if (strlen($phone) < 10) $phone = str_pad($phone, 10, '0', STR_PAD_LEFT);

            $payload = [
                'order_id' => $orderId,
                'order_amount' => (float)$order->total_amount,
                'order_currency' => $cashfreeConfig['currency'] ?? 'INR',
                'customer_details' => [
                    'customer_id' => 'customer_' . ($order->customer_id ?? uniqid()),
                    'customer_name' => $order->customer_first_name . ' ' . $order->customer_last_name,
                    'customer_email' => $order->customer_email,
                    'customer_phone' => $phone
                ],
                'order_meta' => [
                    'return_url' => $storeModel->route('cashfree/success/' . $order->order_number),
                    'notify_url' => $storeModel->route('cashfree/webhook')
                ],
                'order_tags' => [
                    'store_order_id' => (string)$order->id,
                    'order_number' => $order->order_number
                ]
            ];

            $response = \Illuminate\Support\Facades\Http::withHeaders($headers)
                ->post($baseUrl . '/orders', $payload);

            if ($response->successful()) {
                $data = $response->json();
                $order->update([
                    'payment_transaction_id' => $orderId,
                    'payment_details' => array_merge($order->payment_details ?? [], [
                        'payment_session_id' => $data['payment_session_id'] ?? null,
                    ])
                ]);

                return [
                    'success' => true,
                    'checkout_url' => $data['payment_session_id'] ?? null,
                    'payment_session_id' => $data['payment_session_id'] ?? null,
                    'cf_order_id' => $data['cf_order_id'] ?? null,
                    'order_id' => $order->id,
                    'message' => 'Cashfree order created successfully.'
                ];
            }

            Log::error('OrderService Cashfree Error', ['body' => $response->body()]);
            return ['success' => false, 'message' => 'Cashfree API Error: ' . ($response->json()['message'] ?? $response->body())];

        } catch (\Exception $e) {
            Log::error('OrderService Cashfree Exception: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Cashfree Exception: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // Skrill
    // -------------------------------------------------------------------------
    private function processSkrillPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }

            $skrillConfig = getPaymentMethodConfig('skrill', $storeModel->user->id, $order->store_id);

            if (!$skrillConfig['enabled'] || !$skrillConfig['merchant_id']) {
                return ['success' => false, 'message' => 'Skrill is not configured for this store'];
            }

            $paymentId = 'store_sk_' . $order->id . '_' . time();

            $data = [
                'pay_to_email'       => $skrillConfig['merchant_id'],
                'transaction_id'     => $paymentId,
                'return_url'         => $storeModel->route('skrill/success' . (strpos('success', 'success') !== false ? '/' . $order->order_number : '')),
                'cancel_url'         => $storeModel->route('checkout'),
                'status_url'         => $storeModel->route('skrill/callback' . (strpos('callback', 'success') !== false ? '/' . $order->order_number : '')),
                'language'           => 'EN',
                'amount'             => number_format((float) $order->total_amount, 2, '.', ''),
                'currency'           => getPaymentSettings($storeModel->user->id, $order->store_id)['currency'] ?? 'USD',
                'detail1_description' => 'Order #' . $order->order_number,
                'detail1_text'       => 'Order #' . $order->order_number,
            ];

            $order->update([
                'payment_gateway'       => 'skrill',
                'payment_transaction_id' => $paymentId,
                'payment_details'       => ['skrill_transaction_id' => $paymentId],
            ]);

            return [
                'success'          => true,
                'message'          => 'Skrill payment form created',
                'skrill_data'      => $data,
                'skrill_endpoint'  => 'https://www.moneybookers.com/app/payment.pl',
                'order_id'         => $order->id,
                'order_number'     => $order->order_number,
            ];

        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Skrill payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // CoinGate
    // -------------------------------------------------------------------------
    private function processCoinGatePayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }

            $coingateConfig = getPaymentMethodConfig('coingate', $storeModel->user->id, $order->store_id);

            if (!$coingateConfig['enabled'] || !$coingateConfig['api_token']) {
                return ['success' => false, 'message' => 'CoinGate is not configured for this store'];
            }

            $orderId  = 'store_cg_' . $order->id . '_' . time();
            $client   = new \CoinGate\Client($coingateConfig['api_token'], ($coingateConfig['mode'] ?? 'sandbox') === 'sandbox');

            $successUrl = $storeModel->route('coingate/success' . (strpos('success', 'success') !== false ? '/' . $order->order_number : ''));
            $cancelUrl  = $storeModel->route('checkout');
            $callbackUrl = $storeModel->route('coingate/callback' . (strpos('callback', 'success') !== false ? '/' . $order->order_number : ''));

            $storeSettings = settings($storeModel->user->id, $order->store_id);
            $currencyCode  = $storeSettings['defaultCurrency'] ?? 'USD';

            $orderParams = [
                'order_id'          => $orderId,
                'price_amount'      => (float) $order->total_amount,
                'price_currency'     => $currencyCode,
                'receive_currency'  => 'BTC',
                'title'             => 'Order #' . $order->order_number,
                'description'       => 'Store Order #' . $order->order_number,
                'callback_url'      => $callbackUrl,
                'success_url'       => $successUrl,
                'cancel_url'        => $cancelUrl,
            ];

            $orderResponse = $client->order->create($orderParams);

            if ($orderResponse && isset($orderResponse->payment_url)) {
                $order->update([
                    'payment_gateway'       => 'coingate',
                    'payment_transaction_id' => (string) $orderResponse->id,
                    'payment_status'        => 'pending',
                    'payment_details'       => array_merge($order->payment_details ?? [], [
                        'custom_order_id' => $orderId,
                    ]),
                ]);

                return [
                    'success'      => true,
                    'checkout_url' => $orderResponse->payment_url,
                    'order_id'     => $order->id,
                    'order_number' => $order->order_number,
                ];
            }

            return ['success' => false, 'message' => 'CoinGate payment initialization failed'];

        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'CoinGate payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // Midtrans
    // -------------------------------------------------------------------------
    private function processMidtransPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }

            $midtransConfig = getPaymentMethodConfig('midtrans', $storeModel->user->id, $order->store_id);

            if (!$midtransConfig['enabled'] || !$midtransConfig['secret_key']) {
                return ['success' => false, 'message' => 'Midtrans is not configured for this store'];
            }

            $orderId  = 'store_' . $order->id . '_' . time();
            $amount   = intval($order->total_amount);
            $baseUrl  = ($midtransConfig['mode'] ?? 'sandbox') === 'live'
                ? 'https://app.midtrans.com'
                : 'https://app.sandbox.midtrans.com';

            $paymentData = [
                'transaction_details' => [
                    'order_id'     => $orderId,
                    'gross_amount' => $amount,
                ],
                'credit_card'        => ['secure' => true],
                'customer_details'   => [
                    'first_name' => $order->customer_first_name,
                    'last_name'  => $order->customer_last_name,
                    'email'      => $order->customer_email,
                    'phone'      => $order->customer_phone,
                ],
                'callbacks' => [
                    'finish' => $storeModel->route('midtrans/success' . (strpos('success', 'success') !== false ? '/' . $order->order_number : '')),
                ],
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $baseUrl . '/snap/v1/transactions');
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($paymentData));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Basic ' . base64_encode($midtransConfig['secret_key'] . ':'),
                'Content-Type: application/json',
                'Accept: application/json',
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            $response = curl_exec($ch);
            curl_close($ch);
            $result = json_decode($response, true);

            if (isset($result['token'])) {
                $order->update([
                    'payment_gateway'       => 'midtrans',
                    'payment_transaction_id' => $orderId,
                    'payment_details'       => [
                        'snap_token' => $result['token'],
                        'payment_url' => $result['redirect_url'],
                    ],
                ]);

                return [
                    'success'      => true,
                    'checkout_url' => $result['redirect_url'],
                    'order_id'     => $order->id,
                    'order_number' => $order->order_number,
                ];
            }

            return ['success' => false, 'message' => 'Midtrans token creation failed: ' . ($result['error_messages'][0] ?? 'Unknown error')];

        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Midtrans payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // Mollie
    // -------------------------------------------------------------------------
    private function processMolliePayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }

            $mollieConfig = getPaymentMethodConfig('mollie', $storeModel->user->id, $order->store_id);

            if (!$mollieConfig['enabled'] || !$mollieConfig['api_key']) {
                return ['success' => false, 'message' => 'Mollie is not configured for this store'];
            }

            $mollie = new \Mollie\Api\MollieApiClient();
            $mollie->setApiKey($mollieConfig['api_key']);

            $amount      = [
                'currency' => $mollieConfig['currency'] ?? 'EUR',
                'value'    => number_format((float) $order->total_amount, 2, '.', ''),
            ];
            $redirectUrl  = $storeModel->route('mollie/success' . (strpos('success', 'success') !== false ? '/' . $order->order_number : ''));

            $paymentData = [
                'amount'      => $amount,
                'description' => 'Order #' . $order->order_number,
                'redirectUrl' => $redirectUrl,
                'metadata'    => [
                    'order_id'     => $order->id,
                    'order_number' => $order->order_number,
                    'store_id'     => $order->store_id,
                ],
            ];

            // Only add webhook URL if not localhost
            $appUrl = getSchemeAwareUrl();
            if (!str_contains($appUrl, 'localhost')) {
                $paymentData['webhookUrl'] = $storeModel->route('mollie/callback' . (strpos('callback', 'success') !== false ? '/' . $order->order_number : ''));
            }

            $payment = $mollie->payments->create($paymentData);

            $order->update([
                'payment_gateway'       => 'mollie',
                'payment_transaction_id' => $payment->id,
                'payment_details'       => array_merge($order->payment_details ?? [], [
                    'mollie_payment_id' => $payment->id,
                    'checkout_url'      => $payment->getCheckoutUrl(),
                ]),
            ]);

            return [
                'success'      => true,
                'checkout_url' => $payment->getCheckoutUrl(),
                'order_id'     => $order->id,
                'order_number' => $order->order_number,
            ];

        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Mollie payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // Benefit (Tap API)
    // -------------------------------------------------------------------------
    private function processBenefitPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }

            $benefitConfig = getPaymentMethodConfig('benefit', $storeModel->user->id, $order->store_id);

            if (!$benefitConfig['enabled'] || !$benefitConfig['secret_key'] || !$benefitConfig['public_key']) {
                return ['success' => false, 'message' => 'Benefit payment is not configured for this store'];
            }

            $orderID     = strtoupper(str_replace('.', '', uniqid('BENEFIT_', true)));
            $successUrl  = $storeModel->route('benefit/success' . (strpos('success', 'success') !== false ? '/' . $order->order_number : ''));
            $callbackUrl = $storeModel->route('benefit/callback' . (strpos('callback', 'success') !== false ? '/' . $order->order_number : ''));

            $storeSettings = settings($storeModel->user->id, $order->store_id);
            $currencyCode  = $storeSettings['defaultCurrency'] ?? 'BHD';

            $userData = [
                'amount'            => (float) $order->total_amount,
                'currency'          => $currencyCode,
                'customer_initiated' => true,
                'threeDSecure'      => true,
                'save_card'         => false,
                'description'       => 'Order #' . $order->order_number,
                'metadata'          => ['order_id' => (string) $order->id],
                'reference'         => ['transaction' => $orderID, 'order' => $orderID],
                'receipt'           => ['email' => true, 'sms' => true],
                'customer'          => [
                    'first_name' => $order->customer_first_name ?: 'Customer',
                    'last_name'  => $order->customer_last_name  ?: '',
                    'email'      => $order->customer_email      ?: 'customer@example.com',
                    'phone'      => [
                        'country_code' => '973',
                        'number'       => preg_replace('/[^0-9]/', '', $order->customer_phone) ?: '33123456',
                    ],
                ],
                'source'            => ['id' => 'src_bh.benefit'],
                'post'              => ['url' => $callbackUrl],
                'redirect'          => ['url' => $successUrl],
            ];

            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'Authorization' => 'Bearer ' . $benefitConfig['secret_key'],
                'accept'        => 'application/json',
                'content-type'  => 'application/json',
            ])->post('https://api.tap.company/v2/charges', $userData);

            if ($response->successful()) {
                $res = $response->json();
                if (isset($res['transaction']['url'])) {
                    $order->update([
                        'payment_gateway'       => 'benefit',
                        'payment_transaction_id' => $res['id'] ?? $orderID,
                        'payment_details'       => array_merge($order->payment_details ?? [], [
                            'benefit_tap_id' => $res['id'] ?? null,
                            'checkout_url'   => $res['transaction']['url'],
                        ]),
                    ]);

                    return [
                        'success'      => true,
                        'checkout_url' => $res['transaction']['url'],
                        'order_id'     => $order->id,
                        'order_number' => $order->order_number,
                    ];
                }
            }

            return ['success' => false, 'message' => 'Benefit payment initialization failed: ' . ($response->json('errors.0.description') ?? $response->body())];

        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Benefit payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // YooKassa
    // -------------------------------------------------------------------------
    private function processYooKassaPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }

            $yookassaConfig = getPaymentMethodConfig('yookassa', $storeModel->user->id, $order->store_id);

            if (!$yookassaConfig['enabled'] || !$yookassaConfig['shop_id'] || !$yookassaConfig['secret_key']) {
                return ['success' => false, 'message' => 'YooKassa is not configured for this store'];
            }

            $client = new \YooKassa\Client();
            $client->setAuth((int) $yookassaConfig['shop_id'], $yookassaConfig['secret_key']);

            $currencyCode = $yookassaConfig['currency'] ?? 'RUB';
            $successUrl   = $storeModel->route('yookassa/success' . (strpos('success', 'success') !== false ? '/' . $order->order_number : ''));

            $payment = $client->createPayment([
                'amount' => [
                    'value'    => number_format((float) $order->total_amount, 2, '.', ''),
                    'currency' => $currencyCode,
                ],
                'confirmation' => [
                    'type'       => 'redirect',
                    'return_url' => $successUrl,
                ],
                'capture'     => true,
                'description' => 'Store Order #' . $order->order_number,
                'metadata'    => [
                    'order_id'     => $order->id,
                    'order_number' => $order->order_number,
                    'store_id'     => $order->store_id,
                ],
            ], uniqid('', true));

            if ($payment && isset($payment['confirmation']['confirmation_url'])) {
                $order->update([
                    'payment_gateway'       => 'yookassa',
                    'payment_transaction_id' => $payment['id'],
                    'payment_details'       => array_merge($order->payment_details ?? [], [
                        'yookassa_payment_id' => $payment['id'],
                        'checkout_url'        => $payment['confirmation']['confirmation_url'],
                    ]),
                ]);

                return [
                    'success'      => true,
                    'checkout_url' => $payment['confirmation']['confirmation_url'],
                    'order_id'     => $order->id,
                    'order_number' => $order->order_number,
                ];
            }

            return ['success' => false, 'message' => 'YooKassa payment creation failed'];

        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'YooKassa payment failed: ' . $e->getMessage()];
        }
    }
}