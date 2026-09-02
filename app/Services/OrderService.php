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
use App\Services\Payment\PaymentCurrencyGuard;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\Checkout\Session;

class OrderService
{
    public function createOrder(array $orderData, array $cartItems): Order
    {
        $order = DB::transaction(function () use ($orderData, $cartItems) {
            // Create the order
            $order = Order::forceCreate([
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
                
                // Shipping address — postal codes nullable for local delivery
                'shipping_address' => $orderData['shipping_address'],
                'shipping_city' => $orderData['shipping_city'],
                'shipping_state' => $orderData['shipping_state'],
                'shipping_postal_code' => $orderData['shipping_postal_code'] ?? $orderData['postal_code'] ?? '',
                'shipping_country' => $orderData['shipping_country'],
                
                // Billing address
                'billing_address' => $orderData['billing_address'],
                'billing_city' => $orderData['billing_city'],
                'billing_state' => $orderData['billing_state'],
                'billing_postal_code' => $orderData['billing_postal_code'] ?? $orderData['postal_code'] ?? '',
                'billing_country' => $orderData['billing_country'],
                
                // Pricing
                'subtotal' => $orderData['subtotal'],
                'tax_amount' => $orderData['tax_amount'],
                'shipping_amount' => $orderData['shipping_amount'],
                'discount_amount' => $orderData['discount_amount'],
                'total_amount' => $orderData['total_amount'],
                'currency' => $orderData['currency'] ?? null,
                
                // Payment info
                'payment_method' => $orderData['payment_method'],
                'order_source' => $orderData['order_source'] ?? ($orderData['payment_method'] === 'whatsapp' ? 'whatsapp' : 'storefront'),
                'idempotency_key' => $orderData['idempotency_key'] ?? null,
                'bank_transfer_receipt' => $orderData['bank_transfer_receipt'] ?? null,
                'whatsapp_number' => $orderData['whatsapp_number'] ?? null,
                
                // Shipping info
                'shipping_method_id' => $orderData['shipping_method_id'] ?? null,

                // Local Delivery snapshot (zone name + fee frozen at order time)
                'delivery_zone_id' => $orderData['delivery_zone_id'] ?? null,
                'delivery_zone_name' => $orderData['delivery_zone_name'] ?? null,
                'delivery_fee' => $orderData['delivery_fee'] ?? 0,
                'delivery_status' => $orderData['delivery_status'] ?? 'unassigned',
                
                // Additional info
                'notes' => $orderData['notes'] ?? null,
                'coupon_code' => $orderData['coupon_code'] ?? null,
                'coupon_discount' => $orderData['coupon_discount'] ?? 0,

                // Immutable promotion snapshot (Section 10) — historical totals
                // must not depend on live promotion records.
                'promotion_type' => $orderData['promotion_type'] ?? null,
                'promotion_name' => $orderData['promotion_name'] ?? null,
                'promotion_id' => $orderData['promotion_id'] ?? null,
                'promotion_snapshot' => $orderData['promotion_snapshot'] ?? null,
            ]);

            // Create order items and update inventory — canonical variant-aware with row locking
            // Store_id needed for inventory isolation
            $storeIdForInventory = (int) $orderData['store_id'];
            // Classify stock movement for the ledger: POS channel records POS_SALE, everything else ONLINE_SALE.
            $movementType = strtolower((string) ($orderData['order_source'] ?? 'storefront')) === 'pos'
                ? \App\Models\InventoryMovement::MOVEMENT_POS_SALE
                : \App\Models\InventoryMovement::MOVEMENT_ONLINE_SALE;
            $movementReference = ['type' => 'order', 'id' => $order->id, 'number' => $order->order_number];
            foreach ($cartItems as $cartItem) {
                $unitPrice = $cartItem['sale_price'] ?? $cartItem['price'];
                
                // Decrement inventory via canonical service (locks product row, handles variant/product/backorder)
                $decrementResult = null;
                try {
                    $decrementResult = \App\Services\InventoryService::decrementForCartLine($cartItem, $storeIdForInventory, $movementType, $movementReference);
                } catch (\Exception $e) {
                    throw $e;
                }
                $variantCombinationId = $decrementResult['combination_id'] ?? null;
                $variantUuid = $decrementResult['variant_uuid'] ?? null;
                $inventoryMode = $decrementResult['inventory_mode'] ?? 'product';
                
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
                    'variant_combination_id' => $variantCombinationId,
                    'variant_uuid' => $variantUuid,
                    'inventory_mode' => $inventoryMode,
                    'unit_price' => $unitPrice,
                    'total_price' => $itemTotal,
                    'tax_details' => json_encode([
                        'tax_name' => $taxName,
                        'tax_percentage' => $taxPercentage,
                        'tax_amount' => $taxAmount,
                    ]),
                ]);
            }

            // Cart clearing is now handled in Store\OrderController ONLY after payment is confirmed
            // to prevent data loss on failed orders (spec: cart must remain on failure).
            // $this->clearCart($orderData['store_id']); // moved to controller

            // Dispatch accounting sync job
            try {
                dispatch(new \App\Jobs\SyncOrderToAccounting($order))->onQueue('accounting');
            } catch (\Exception $e) {
                Log::warning('Failed to dispatch accounting sync', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            }

            // Only handle post-order extras for orders that don't require external payment processing
            // Online payments will call handlePostOrderExtras after successful payment confirmation
            $requiresPayment = !in_array($order->payment_method, ['cod', 'whatsapp', 'bank', 'telegram']);
            if (!$requiresPayment) {
                $this->handlePostOrderExtras($order);
            }

            return $order;
        });

        // Note: OrderCreated event is NOT fired here. It is fired after
        // successful payment for each payment method (offline methods fire
        // it immediately in processCashOnDelivery etc.; online methods fire
        // it in their success callbacks after payment confirmation).

        return $order;
    }

    public function processPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            if (!in_array($order->payment_method, ['cod','bank','whatsapp','telegram','jawwal_pay','pal_pay','zain_cash','orange_money','cliq','zain_cash_jo','orange_money_jo','etihad_wallet','dinar_pay','bit','paybox','bank_palestine','al_quds_bank','arab_islamic_bank','cairo_amman_bank','housing_bank','safad_bank','jordan_kuwait_bank','arab_bank','housing_bank_jo','cairo_amman_bank_jo','safad_bank_jo','usdt_trc20','usdt_erc20','usdt_bep20','usdt_polygon','usdt_solana'])) {
                PaymentCurrencyGuard::assertOrderCurrency($order);
            }
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }

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
            case 'tap':
                return $this->processTapPayment($order, $storeSlug);
            case 'payfast':
                return $this->processPayfastPayment($order, $storeSlug);
            case 'paytr':
                return $this->processPaytrPayment($order, $storeSlug);
            case 'iyzipay':
                return $this->processIyzipayPayment($order, $storeSlug);
            case 'khalti':
                return $this->processKhaltiPayment($order, $storeSlug);
            case 'easebuzz':
                return $this->processEasebuzzPayment($order, $storeSlug);
            case 'ozow':
                return $this->processOzowPayment($order, $storeSlug);
            case 'authorizenet':
                return $this->processAuthorizeNetPayment($order, $storeSlug);
            case 'fedapay':
                return $this->processFedaPayPayment($order, $storeSlug);
            case 'payhere':
                return $this->processPayHerePayment($order, $storeSlug);
            case 'cinetpay':
                return $this->processCinetPayPayment($order, $storeSlug);
            case 'nepalste':
                return $this->processNepalstePayment($order, $storeSlug);
            case 'paiement':
                return $this->processPaiementPayment($order, $storeSlug);
            case 'aamarpay':
                return $this->processAamarpayPayment($order, $storeSlug);
            case 'jawwal_pay':
            case 'pal_pay':
            case 'zain_cash':
            case 'orange_money':
            case 'cliq':
            case 'zain_cash_jo':
            case 'orange_money_jo':
            case 'etihad_wallet':
            case 'dinar_pay':
            case 'bit':
            case 'paybox':
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

        event(new \App\Events\OrderCreated($order));

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

        event(new \App\Events\OrderCreated($order));

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

        event(new \App\Events\OrderCreated($order));

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

        event(new \App\Events\OrderCreated($order));

        // WhatsApp customer message is dispatched via OrderCreated event listener
        // (SendOrderCreatedMessaging) — do NOT send synchronously here to avoid
        // duplicate delivery. The listener is afterCommit + cache-deduplicated.
        if (!$order->whatsapp_number) {
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

        event(new \App\Events\OrderCreated($order));

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
                        'currency' => strtolower($order->currency ?: 'usd'),
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
                                'currency_code' => strtoupper($order->currency ?: 'ILS'),
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
            $currencyCode = $storeSettings['defaultCurrency'] ?? 'ILS';

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
            $currency = settings($storeModel->user->id, $order->store_id)['defaultCurrency'] ?? 'ILS';

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
            // Mark abandoned cart as recovered (use order's stored session_id for webhook compat)
            try {
                $sessionId = $order->session_id ?? session()->getId();
                $abandonedCartService = app(AbandonedCartService::class);
                $abandonedCartService->markRecovered($sessionId, $order->id);
            } catch (\Exception $e) {
                Log::warning('Failed to mark abandoned cart as recovered', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            }

            // Loyalty points are NOT awarded here. Points are earned only when
            // the order reaches the canonical DELIVERED state, via the
            // AwardLoyaltyOnDelivery listener on OrderStatusChanged (Section 20).
            // This prevents premature/double point grants on created/confirmed/
            // processing/shipped and on offline payment confirmation.

            // Record advanced coupon usage if applicable
            if ($order->coupon_code) {
                try {
                    $advancedCoupon = \App\Models\AdvancedCoupon::where('store_id', $order->store_id)
                        ->where('code', $order->coupon_code)
                        ->first();

                    if ($advancedCoupon && $order->discount_amount > 0) {
                        // Guard: skip if usage already recorded for this order (defense-in-depth)
                        $alreadyUsed = \App\Models\CouponUsage::where('coupon_id', $advancedCoupon->id)
                            ->where('order_id', $order->id)
                            ->exists();
                        if (!$alreadyUsed) {
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

    /**
     * Idempotent post-order completion for online payment gateways.
     *
     * Uses an atomic compare-and-swap on `post_order_extras_at` so that
     * regardless of whether the browser success callback or the server-to-server
     * webhook arrives first, the extras (loyalty, cart recovery, coupon tracking)
     * and the OrderCreated event (emails, notifications) fire exactly once.
     *
     * Called from: StripeController::success, PayPalController::success,
     * RazorpayController::verifyPayment, GatewayWebhookController::stripe,
     * GatewayWebhookController::paypal, GatewayWebhookController::razorpay.
     */
    public function completePostOrderExtras(Order $order): void
    {
        // Atomic CAS: only the first caller wins. If post_order_extras_at is
        // already set, another request (browser callback or webhook) already
        // completed the post-order flow — skip everything.
        $updated = DB::table('orders')
            ->where('id', $order->id)
            ->whereNull('post_order_extras_at')
            ->update(['post_order_extras_at' => now()]);

        if ($updated === 0) {
            return;
        }

        // Refresh to pick up the new timestamp
        $order->refresh();

        // Run post-order extras (loyalty points, abandoned cart, coupon tracking)
        $this->handlePostOrderExtras($order);

        // Dispatch OrderCreated event — triggers customer confirmation email,
        // merchant notification, messaging, and webhook integrations.
        try {
            event(new \App\Events\OrderCreated($order));
        } catch (\Exception $e) {
            Log::warning('Failed to dispatch OrderCreated event', ['order_id' => $order->id, 'error' => $e->getMessage()]);
        }
    }

    private function processCashfreePayment(Order $order): array
    {
        try {

            $storeModel = $order->store;
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }

            $cashfreeConfig = getPaymentMethodConfig('cashfree', $storeModel->user->id, $order->store_id);
            
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
                'return_url'         => $storeModel->route('skrill/success/' . $order->order_number),
                'cancel_url'         => $storeModel->route('checkout'),
                'status_url'         => $storeModel->route('skrill/callback/' . $order->order_number),
                'language'           => 'EN',
                'amount'             => number_format((float) $order->total_amount, 2, '.', ''),
                'currency'           => getPaymentSettings($storeModel->user->id, $order->store_id)['currency'] ?? 'ILS',
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

            $successUrl = $storeModel->route('coingate/success/' . $order->order_number);
            $cancelUrl  = $storeModel->route('checkout');
            $callbackUrl = $storeModel->route('coingate/callback/' . $order->order_number);

            $storeSettings = settings($storeModel->user->id, $order->store_id);
            $currencyCode  = $storeSettings['defaultCurrency'] ?? 'ILS';

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
                    'finish' => $storeModel->route('midtrans/success/' . $order->order_number),
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
                'currency' => $mollieConfig['currency'] ?? 'ILS',
                'value'    => number_format((float) $order->total_amount, 2, '.', ''),
            ];
            $redirectUrl  = $storeModel->route('mollie/success/' . $order->order_number);

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
                $paymentData['webhookUrl'] = $storeModel->route('mollie/callback/' . $order->order_number);
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
            $successUrl  = $storeModel->route('benefit/success/' . $order->order_number);
            $callbackUrl = $storeModel->route('benefit/callback/' . $order->order_number);

            $storeSettings = settings($storeModel->user->id, $order->store_id);
            $currencyCode  = $storeSettings['defaultCurrency'] ?? 'ILS';

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
            $successUrl   = $storeModel->route('yookassa/success/' . $order->order_number);

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

    // -------------------------------------------------------------------------
    // Tap
    // -------------------------------------------------------------------------
    private function processTapPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            $config = getPaymentMethodConfig('tap', $storeModel->user->id, $order->store_id);
            if (!$config['enabled'] || !$config['secret_key']) {
                return ['success' => false, 'message' => 'Tap is not configured for this store'];
            }

            require_once app_path('Libraries/Tap/Tap.php');
            require_once app_path('Libraries/Tap/Reference.php');
            require_once app_path('Libraries/Tap/Payment.php');

            $tap = new \App\Package\Payment(['company_tap_secret_key' => $config['secret_key']]);
            $chargeData = [
                'amount' => $order->total_amount,
                'currency' => $order->currency ?: 'ILS',
                'threeDSecure' => 'true',
                'save_card' => 'false',
                'description' => 'Order #' . $order->order_number,
                'statement_descriptor' => 'Store Order',
                'metadata' => ['udf1' => (string) $order->id, 'udf2' => $order->order_number],
                'reference' => ['transaction' => (string) $order->id, 'order' => $order->order_number],
                'receipt' => ['email' => 'true', 'sms' => 'false'],
                'customer' => [
                    'first_name' => $order->customer_first_name ?: 'Customer',
                    'middle_name' => '',
                    'last_name' => $order->customer_last_name ?: '',
                    'email' => $order->customer_email,
                    'phone' => ['country_code' => '', 'number' => ''],
                ],
                'source' => ['id' => 'src_card'],
                'post' => ['url' => $storeModel->route('tap/callback/' . $order->order_number)],
                'redirect' => ['url' => $storeModel->route('tap/success/' . $order->order_number)],
            ];

            $charge = $tap->charge($chargeData, false);
            if ($charge && isset($charge->transaction->url)) {
                $order->update([
                    'payment_gateway' => 'tap',
                    'payment_transaction_id' => $charge->id,
                    'payment_details' => array_merge($order->payment_details ?? [], [
                        'tap_charge_id' => $charge->id,
                        'checkout_url' => $charge->transaction->url,
                    ]),
                ]);
                return [
                    'success' => true,
                    'checkout_url' => $charge->transaction->url,
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ];
            }
            return ['success' => false, 'message' => 'Tap payment creation failed'];
        } catch (\Throwable $e) {
            Log::error('OrderService Tap Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Tap payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // PayFast (HTML form POST)
    // -------------------------------------------------------------------------
    private function processPayfastPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            $config = getPaymentMethodConfig('payfast', $storeModel->user->id, $order->store_id);
            if (!$config['enabled'] || !$config['merchant_id'] || !$config['merchant_key']) {
                return ['success' => false, 'message' => 'PayFast is not configured for this store'];
            }

            $paymentId = 'store_' . $order->id . '_' . time() . '_' . uniqid();
            $data = [
                'merchant_id' => $config['merchant_id'],
                'merchant_key' => $config['merchant_key'],
                'return_url' => $storeModel->route('payfast/success/' . $order->order_number),
                'cancel_url' => $storeModel->getStoreUrl(),
                'notify_url' => $storeModel->route('payfast/callback/' . $order->order_number),
                'name_first' => $order->customer_first_name ?: 'Customer',
                'name_last' => $order->customer_last_name ?: '',
                'email_address' => $order->customer_email,
                'm_payment_id' => $paymentId,
                'amount' => number_format($order->total_amount, 2, '.', ''),
                'item_name' => 'Order #' . $order->order_number,
            ];
            $data['signature'] = $this->payfastSignature($data, $config['passphrase'] ?? '');

            $isLive = ($config['mode'] ?? 'sandbox') === 'live';
            $endpoint = $isLive ? 'https://www.payfast.co.za/eng/process' : 'https://sandbox.payfast.co.za/eng/process';

            $order->update([
                'payment_gateway' => 'payfast',
                'payment_transaction_id' => $paymentId,
                'payment_details' => array_merge($order->payment_details ?? [], [
                    'payfast_payment_id' => $paymentId,
                ]),
            ]);

            return [
                'success' => true,
                'payment_form' => ['action' => $endpoint, 'method' => 'POST', 'fields' => $data],
                'order_id' => $order->id,
                'order_number' => $order->order_number,
            ];
        } catch (\Throwable $e) {
            Log::error('OrderService PayFast Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'PayFast payment failed: ' . $e->getMessage()];
        }
    }

    private function payfastSignature(array $data, ?string $passPhrase = null): string
    {
        $pfOutput = '';
        foreach ($data as $key => $val) {
            if ($val !== '') {
                $pfOutput .= $key . '=' . urlencode(trim((string) $val)) . '&';
            }
        }
        $getString = substr($pfOutput, 0, -1);
        if ($passPhrase !== null) {
            $getString .= '&passphrase=' . urlencode(trim($passPhrase));
        }
        return md5($getString);
    }

    // -------------------------------------------------------------------------
    // PayTR
    // -------------------------------------------------------------------------
    private function processPaytrPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            $config = getPaymentMethodConfig('paytr', $storeModel->user->id, $order->store_id);
            if (!$config['enabled'] || !$config['merchant_id'] || !$config['merchant_key'] || !$config['merchant_salt']) {
                return ['success' => false, 'message' => 'PayTR is not configured for this store'];
            }

            $merchantOid = 'store_' . $order->id . '_' . time() . '_' . uniqid();
            $amountKurus = intval(round($order->total_amount * 100));
            $userBasket = json_encode([['Order #' . $order->order_number, number_format($order->total_amount, 2), 1]]);
            $ip = request()->ip() ?? '0.0.0.0';
            $currency = 'TRY';

            $hashStr = $config['merchant_id'] . $ip . $merchantOid . $order->customer_email . $amountKurus . $userBasket . '1' . '0' . $currency . '1' . $config['merchant_salt'];
            $paytrToken = base64_encode(hash_hmac('sha256', $hashStr, $config['merchant_key'], true));

            $response = \Illuminate\Support\Facades\Http::asForm()->timeout(40)->post('https://www.paytr.com/odeme/api/get-token', [
                'merchant_id' => $config['merchant_id'],
                'user_ip' => $ip,
                'merchant_oid' => $merchantOid,
                'email' => $order->customer_email,
                'payment_amount' => $amountKurus,
                'paytr_token' => $paytrToken,
                'user_basket' => $userBasket,
                'no_installment' => 1,
                'max_installment' => 0,
                'user_name' => trim($order->customer_first_name . ' ' . $order->customer_last_name) ?: 'Customer',
                'user_address' => $order->shipping_address ?: 'Turkey',
                'user_phone' => $order->customer_phone ?: '0',
                'merchant_ok_url' => $storeModel->route('paytr/success/' . $order->order_number),
                'merchant_fail_url' => $storeModel->getStoreUrl(),
                'timeout_limit' => 30,
                'currency' => $currency,
                'test_mode' => ($config['mode'] ?? 'sandbox') === 'sandbox' ? 1 : 0,
            ]);

            $result = $response->json();
            if ($response->successful() && ($result['status'] ?? null) === 'success' && !empty($result['token'])) {
                $order->update([
                    'payment_gateway' => 'paytr',
                    'payment_transaction_id' => $merchantOid,
                    'payment_details' => array_merge($order->payment_details ?? [], [
                        'paytr_merchant_oid' => $merchantOid,
                        'paytr_token' => $result['token'],
                    ]),
                ]);
                return [
                    'success' => true,
                    'checkout_url' => 'https://www.paytr.com/odeme/guvenli/' . $result['token'],
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ];
            }
            return ['success' => false, 'message' => 'PayTR token generation failed'];
        } catch (\Throwable $e) {
            Log::error('OrderService PayTR Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'PayTR payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // iyzico (hosted payment page)
    // -------------------------------------------------------------------------
    private function processIyzipayPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            $config = getPaymentMethodConfig('iyzipay', $storeModel->user->id, $order->store_id);
            if (!$config['enabled'] || !$config['public_key'] || !$config['secret_key']) {
                return ['success' => false, 'message' => 'iyzico is not configured for this store'];
            }

            $options = new \Iyzipay\Options();
            $options->setApiKey($config['public_key']);
            $options->setSecretKey($config['secret_key']);
            $options->setBaseUrl(($config['mode'] ?? 'sandbox') === 'live' ? 'https://api.iyzipay.com' : 'https://sandbox-api.iyzipay.com');

            $conversationId = 'store_' . $order->id . '_' . time();
            $amount = number_format($order->total_amount, 2, '.', '');
            $currency = strtoupper($order->currency ?: 'TRY');
            $currency = in_array($currency, ['TRY', 'ILS', 'ILS', 'GBP'], true) ? $currency : 'TRY';

            $checkoutRequest = new \Iyzipay\Request\CreateCheckoutFormInitializeRequest();
            $checkoutRequest->setLocale(\Iyzipay\Model\Locale::EN);
            $checkoutRequest->setConversationId($conversationId);
            $checkoutRequest->setPrice($amount);
            $checkoutRequest->setPaidPrice($amount);
            $checkoutRequest->setCurrency($currency);
            $checkoutRequest->setBasketId('order_' . $order->id);
            $checkoutRequest->setPaymentGroup(\Iyzipay\Model\PaymentGroup::PRODUCT);
            $checkoutRequest->setCallbackUrl($storeModel->route('iyzipay/callback/' . $order->order_number));
            $checkoutRequest->setEnabledInstallments([1]);

            $buyer = new \Iyzipay\Model\Buyer();
            $buyer->setId((string) $order->id);
            $buyer->setName($order->customer_first_name ?: 'Customer');
            $buyer->setSurname($order->customer_last_name ?: 'User');
            $buyer->setGsmNumber($order->customer_phone ?: '+0000000000');
            $buyer->setEmail($order->customer_email);
            $buyer->setIdentityNumber('11111111111');
            $buyer->setLastLoginDate(date('Y-m-d H:i:s'));
            $buyer->setRegistrationDate(date('Y-m-d H:i:s'));
            $buyer->setRegistrationAddress($order->shipping_address ?: 'N/A');
            $buyer->setIp(request()->ip() ?? '127.0.0.1');
            $buyer->setCity($order->shipping_city ?: 'N/A');
            $buyer->setCountry($order->shipping_country ?: 'N/A');
            $buyer->setZipCode($order->shipping_postal_code ?: '00000');
            $checkoutRequest->setBuyer($buyer);

            $name = trim($order->customer_first_name . ' ' . $order->customer_last_name) ?: 'Customer';
            $shipping = new \Iyzipay\Model\Address();
            $shipping->setContactName($name);
            $shipping->setCity($order->shipping_city ?: 'N/A');
            $shipping->setCountry($order->shipping_country ?: 'N/A');
            $shipping->setAddress($order->shipping_address ?: 'N/A');
            $shipping->setZipCode($order->shipping_postal_code ?: '00000');
            $checkoutRequest->setShippingAddress($shipping);
            $checkoutRequest->setBillingAddress($shipping);

            $basketItem = new \Iyzipay\Model\BasketItem();
            $basketItem->setId((string) $order->id);
            $basketItem->setName('Order #' . $order->order_number);
            $basketItem->setCategory1('Store');
            $basketItem->setItemType(\Iyzipay\Model\BasketItemType::VIRTUAL);
            $basketItem->setPrice($amount);
            $checkoutRequest->setBasketItems([$basketItem]);

            $checkoutFormInitialize = \Iyzipay\Model\CheckoutFormInitialize::create($checkoutRequest, $options);
            if ($checkoutFormInitialize->getStatus() === 'success') {
                $order->update([
                    'payment_gateway' => 'iyzipay',
                    'payment_transaction_id' => $conversationId,
                    'payment_details' => array_merge($order->payment_details ?? [], [
                        'iyzipay_token' => $checkoutFormInitialize->getToken(),
                        'iyzipay_conversation_id' => $conversationId,
                    ]),
                ]);
                return [
                    'success' => true,
                    'checkout_url' => $checkoutFormInitialize->getPaymentPageUrl(),
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ];
            }
            return ['success' => false, 'message' => 'iyzico checkout form creation failed'];
        } catch (\Throwable $e) {
            Log::error('OrderService iyzico Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'iyzico payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // Khalti (hosted ePay)
    // -------------------------------------------------------------------------
    private function processKhaltiPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            $config = getPaymentMethodConfig('khalti', $storeModel->user->id, $order->store_id);
            if (!$config['enabled'] || !$config['public_key'] || !$config['secret_key']) {
                return ['success' => false, 'message' => 'Khalti is not configured for this store'];
            }

            $amountPaisa = (int) round($order->total_amount * 100);
            $orderId = 'store_' . $order->id . '_' . $order->order_number;
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'Authorization' => 'Key ' . $config['secret_key'],
            ])->post('https://epay.khalti.com/api/v2/initiate', [
                'return_url' => $storeModel->route('khalti/success/' . $order->order_number),
                'website_url' => $storeModel->getStoreUrl(),
                'amount' => $amountPaisa,
                'purchase_order_id' => $orderId,
                'purchase_order_name' => 'Order #' . $order->order_number,
                'customer_info' => [
                    'name' => trim($order->customer_first_name . ' ' . $order->customer_last_name) ?: 'Customer',
                    'email' => $order->customer_email,
                    'phone' => $order->customer_phone,
                ],
            ]);

            $result = $response->json();
            if ($response->successful() && !empty($result['payment_url'])) {
                $order->update([
                    'payment_gateway' => 'khalti',
                    'payment_transaction_id' => $orderId,
                    'payment_details' => array_merge($order->payment_details ?? [], [
                        'khalti_pidx' => $result['pidx'] ?? null,
                        'purchase_order_id' => $orderId,
                    ]),
                ]);
                return [
                    'success' => true,
                    'checkout_url' => $result['payment_url'],
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ];
            }
            return ['success' => false, 'message' => 'Khalti payment initiation failed'];
        } catch (\Throwable $e) {
            Log::error('OrderService Khalti Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Khalti payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // Easebuzz
    // -------------------------------------------------------------------------
    private function processEasebuzzPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            $config = getPaymentMethodConfig('easebuzz', $storeModel->user->id, $order->store_id);
            if (!$config['enabled'] || !$config['merchant_key'] || !$config['salt_key']) {
                return ['success' => false, 'message' => 'Easebuzz is not configured for this store'];
            }

            require_once app_path('Libraries/Easebuzz/easebuzz_payment_gateway.php');

            $environment = ($config['environment'] ?? 'test') === 'prod' ? 'prod' : 'test';
            $easebuzz = new \Easebuzz($config['merchant_key'], $config['salt_key'], $environment);

            $txnid = 'store_' . $order->id . '_' . time() . '_' . uniqid();
            $postData = [
                'txnid' => $txnid,
                'amount' => number_format($order->total_amount, 2, '.', ''),
                'productinfo' => 'Order #' . $order->order_number,
                'firstname' => $order->customer_first_name ?: 'Customer',
                'email' => $order->customer_email,
                'phone' => $order->customer_phone ?: '9999999999',
                'surl' => $storeModel->route('easebuzz/success/' . $order->order_number),
                'furl' => $storeModel->getStoreUrl(),
                'udf1' => $order->order_number,
                'udf2' => (string) $order->id,
            ];

            $resultArray = json_decode($easebuzz->initiatePaymentAPI($postData, false), true);
            if ($resultArray && isset($resultArray['status']) && (int) $resultArray['status'] === 1 && !empty($resultArray['access_key'])) {
                $baseUrl = $environment === 'prod' ? 'https://pay.easebuzz.in' : 'https://testpay.easebuzz.in';
                $order->update([
                    'payment_gateway' => 'easebuzz',
                    'payment_transaction_id' => $txnid,
                    'payment_details' => array_merge($order->payment_details ?? [], ['easebuzz_txnid' => $txnid]),
                ]);
                return [
                    'success' => true,
                    'checkout_url' => $baseUrl . '/pay/' . $resultArray['access_key'],
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ];
            }
            return ['success' => false, 'message' => 'Easebuzz payment initialization failed'];
        } catch (\Throwable $e) {
            Log::error('OrderService Easebuzz Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Easebuzz payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // Ozow
    // -------------------------------------------------------------------------
    private function processOzowPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            $config = getPaymentMethodConfig('ozow', $storeModel->user->id, $order->store_id);
            if (!$config['enabled'] || !$config['site_key'] || !$config['private_key'] || !$config['api_key']) {
                return ['success' => false, 'message' => 'Ozow is not configured for this store'];
            }

            $siteCode = $config['site_key'];
            $privateKey = $config['private_key'];
            $apiKey = $config['api_key'];
            $isTest = ($config['mode'] ?? 'sandbox') === 'sandbox' ? 'true' : 'false';
            $amount = number_format($order->total_amount, 2, '.', '');
            $successUrl = $storeModel->route('ozow/success/' . $order->order_number);
            $cancelUrl = $storeModel->getStoreUrl();
            $bankReference = time() . 'WK';
            $transactionReference = 'store_' . $order->id . '_' . time();
            $countryCode = 'ZA';
            $currency = 'ZAR';

            $inputString = $siteCode . $countryCode . $currency . $amount . $transactionReference . $bankReference . $cancelUrl . $successUrl . $successUrl . $successUrl . $isTest . $privateKey;
            $hashCheck = hash('sha512', strtolower($inputString));

            $postData = [
                'countryCode' => $countryCode,
                'amount' => $amount,
                'transactionReference' => $transactionReference,
                'bankReference' => $bankReference,
                'cancelUrl' => $cancelUrl,
                'currencyCode' => $currency,
                'errorUrl' => $successUrl,
                'isTest' => $isTest,
                'notifyUrl' => $storeModel->route('ozow/callback/' . $order->order_number),
                'siteCode' => $siteCode,
                'successUrl' => $successUrl,
                'hashCheck' => $hashCheck,
            ];

            $client = new \GuzzleHttp\Client(['timeout' => 30]);
            $response = $client->post('https://api.ozow.com/postpaymentrequest', [
                'json' => $postData,
                'headers' => [
                    'ApiKey' => $apiKey,
                    'Accept' => 'application/json',
                ],
            ]);
            $data = json_decode((string) $response->getBody(), true);

            if (!empty($data['url'])) {
                $order->update([
                    'payment_gateway' => 'ozow',
                    'payment_transaction_id' => $transactionReference,
                    'payment_details' => array_merge($order->payment_details ?? [], [
                        'ozow_transaction_reference' => $transactionReference,
                        'checkout_url' => $data['url'],
                    ]),
                ]);
                return [
                    'success' => true,
                    'checkout_url' => $data['url'],
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ];
            }
            return ['success' => false, 'message' => 'Ozow payment creation failed'];
        } catch (\Throwable $e) {
            Log::error('OrderService Ozow Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Ozow payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // Authorize.Net (Accept Hosted payment page)
    // -------------------------------------------------------------------------
    private function processAuthorizeNetPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            $config = getPaymentMethodConfig('authorizenet', $storeModel->user->id, $order->store_id);
            if (!$config['enabled'] || !$config['merchant_id'] || !$config['transaction_key']) {
                return ['success' => false, 'message' => 'Authorize.Net is not configured for this store'];
            }

            $merchantAuth = new \net\authorize\api\contract\v1\MerchantAuthenticationType();
            $merchantAuth->setName($config['merchant_id']);
            $merchantAuth->setTransactionKey($config['transaction_key']);

            $transactionRequestType = new \net\authorize\api\contract\v1\TransactionRequestType();
            $transactionRequestType->setTransactionType('authCaptureTransaction');
            $transactionRequestType->setAmount(number_format($order->total_amount, 2, '.', ''));
            $transactionRequestType->setCurrencyCode(strtoupper($order->currency ?: 'ILS'));

            $hostedRequest = new \net\authorize\api\contract\v1\GetHostedPaymentPageRequest();
            $hostedRequest->setMerchantAuthentication($merchantAuth);
            $hostedRequest->setTransactionRequest($transactionRequestType);

            $controller = new \net\authorize\api\controller\GetHostedPaymentPageController($hostedRequest);
            $environment = ($config['mode'] ?? 'sandbox') === 'sandbox'
                ? \net\authorize\api\constants\ANetEnvironment::SANDBOX
                : \net\authorize\api\constants\ANetEnvironment::PRODUCTION;
            $response = $controller->executeWithApiResponse($environment);

            if ($response !== null && $response->getMessages()->getResultCode() === 'Ok' && $response->getToken()) {
                $base = ($config['mode'] ?? 'sandbox') === 'sandbox'
                    ? 'https://test.authorize.net/payment/payment'
                    : 'https://accept.authorize.net/payment/payment';
                $checkoutUrl = $base . '?token=' . $response->getToken();
                $order->update([
                    'payment_gateway' => 'authorizenet',
                    'payment_details' => array_merge($order->payment_details ?? [], ['authorizenet_token' => $response->getToken()]),
                ]);
                return [
                    'success' => true,
                    'checkout_url' => $checkoutUrl,
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ];
            }
            return ['success' => false, 'message' => 'Authorize.Net hosted page creation failed'];
        } catch (\Throwable $e) {
            Log::error('OrderService AuthorizeNet Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Authorize.Net payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // FedaPay
    // -------------------------------------------------------------------------
    private function processFedaPayPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            $config = getPaymentMethodConfig('fedapay', $storeModel->user->id, $order->store_id);
            if (!$config['enabled'] || !$config['secret_key']) {
                return ['success' => false, 'message' => 'FedaPay is not configured for this store'];
            }

            $baseUrl = ($config['mode'] ?? 'sandbox') === 'live'
                ? 'https://api.fedapay.com'
                : 'https://sandbox-api.fedapay.com';
            $http = \Illuminate\Support\Facades\Http::withToken($config['secret_key'])->timeout(40);

            $createRes = $http->post($baseUrl . '/v1/transactions', [
                'description' => 'Order #' . $order->order_number,
                'amount' => (int) round($order->total_amount * 100),
                'currency' => ['iso' => 'XOF'],
                'callback_url' => $storeModel->route('fedapay/callback/' . $order->order_number),
                'customer' => [
                    'firstname' => $order->customer_first_name ?: 'Customer',
                    'lastname' => $order->customer_last_name ?: '',
                    'email' => $order->customer_email,
                ],
                'custom_metadata' => [
                    'store_order_id' => (string) $order->id,
                    'order_number' => $order->order_number,
                ],
            ]);

            $txnData = $createRes->json();
            if (!$createRes->successful() || empty($txnData['transaction']['id'])) {
                if (!empty($txnData['transaction']['id'])) {
                    $id = $txnData['transaction']['id'];
                } else {
                    $json = $createRes->json();
                    $id = $json['id'] ?? $json['transaction']['id'] ?? null;
                }
                if (!$id) {
                    return ['success' => false, 'message' => 'FedaPay transaction creation failed'];
                }
            }

            $transactionId = $txnData['transaction']['id'] ?? $txnData['id'] ?? null;
            if (!$transactionId) {
                return ['success' => false, 'message' => 'FedaPay transaction creation failed'];
            }

            $tokenRes = $http->post($baseUrl . '/v1/transactions/' . $transactionId . '/token');
            $tokenData = $tokenRes->json();
            $paymentUrl = $tokenData['token']['url'] ?? $tokenData['url'] ?? null;

            if ($paymentUrl) {
                $order->update([
                    'payment_gateway' => 'fedapay',
                    'payment_transaction_id' => (string) $transactionId,
                    'payment_details' => array_merge($order->payment_details ?? [], [
                        'fedapay_transaction_id' => (string) $transactionId,
                        'checkout_url' => $paymentUrl,
                    ]),
                ]);
                return [
                    'success' => true,
                    'checkout_url' => $paymentUrl,
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ];
            }
            return ['success' => false, 'message' => 'FedaPay payment link creation failed'];
        } catch (\Throwable $e) {
            Log::error('OrderService FedaPay Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'FedaPay payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // PayHere (HTML form POST)
    // -------------------------------------------------------------------------
    private function processPayHerePayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            $config = getPaymentMethodConfig('payhere', $storeModel->user->id, $order->store_id);
            if (!$config['enabled'] || !$config['merchant_id']) {
                return ['success' => false, 'message' => 'PayHere is not configured for this store'];
            }

            $orderId = 'store_' . $order->id . '_' . $order->order_number;
            $amount = number_format($order->total_amount, 2, '.', '');
            $currency = 'LKR';
            $data = [
                'merchant_id' => $config['merchant_id'],
                'return_url' => $storeModel->route('payhere/success/' . $order->order_number),
                'cancel_url' => $storeModel->getStoreUrl(),
                'notify_url' => $storeModel->route('payhere/callback/' . $order->order_number),
                'order_id' => $orderId,
                'items' => 'Order #' . $order->order_number,
                'currency' => $currency,
                'amount' => $amount,
                'first_name' => $order->customer_first_name ?: 'Customer',
                'last_name' => $order->customer_last_name ?: 'User',
                'email' => $order->customer_email,
                'phone' => $order->customer_phone ?: '0770000000',
                'address' => $order->shipping_address ?: 'N/A',
                'city' => $order->shipping_city ?: 'N/A',
                'country' => $order->shipping_country ?: 'Sri Lanka',
            ];
            $hash = strtoupper(md5($data['merchant_id'] . $orderId . $amount . $currency . strtoupper(md5($config['merchant_secret'] ?? ''))));
            $data['hash'] = $hash;

            $baseUrl = ($config['mode'] ?? 'sandbox') === 'live' ? 'https://www.payhere.lk' : 'https://sandbox.payhere.lk';

            $order->update([
                'payment_gateway' => 'payhere',
                'payment_transaction_id' => $orderId,
                'payment_details' => array_merge($order->payment_details ?? [], ['payhere_order_id' => $orderId]),
            ]);

            return [
                'success' => true,
                'payment_form' => ['action' => $baseUrl . '/pay/checkout', 'method' => 'POST', 'fields' => $data],
                'order_id' => $order->id,
                'order_number' => $order->order_number,
            ];
        } catch (\Throwable $e) {
            Log::error('OrderService PayHere Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'PayHere payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // CinetPay (HTML form POST)
    // -------------------------------------------------------------------------
    private function processCinetPayPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            $config = getPaymentMethodConfig('cinetpay', $storeModel->user->id, $order->store_id);
            if (!$config['enabled'] || !$config['site_id']) {
                return ['success' => false, 'message' => 'CinetPay is not configured for this store'];
            }

            $transactionId = 'store_' . $order->id . '_' . time();
            $data = [
                'cpm_site_id' => $config['site_id'],
                'cpm_trans_id' => $transactionId,
                'cpm_amount' => number_format($order->total_amount, 2, '.', ''),
                'cpm_currency' => ($order->currency ?: 'XOF'),
                'cpm_designation' => 'Order #' . $order->order_number,
                'cpm_custom' => json_encode([
                    'store_order_id' => (string) $order->id,
                    'order_number' => $order->order_number,
                ]),
                'cpm_page_action' => 'PAYMENT',
                'cpm_version' => 'V2',
                'cpm_language' => 'fr',
                'cpm_return_url' => $storeModel->route('cinetpay/success/' . $order->order_number),
                'cpm_notify_url' => $storeModel->route('cinetpay/callback/' . $order->order_number),
                'cpm_error_url' => $storeModel->getStoreUrl(),
            ];

            $order->update([
                'payment_gateway' => 'cinetpay',
                'payment_transaction_id' => $transactionId,
                'payment_details' => array_merge($order->payment_details ?? [], ['cinetpay_trans_id' => $transactionId]),
            ]);

            return [
                'success' => true,
                'payment_form' => ['action' => 'https://www.cinetpay.com/payment/', 'method' => 'POST', 'fields' => $data],
                'order_id' => $order->id,
                'order_number' => $order->order_number,
            ];
        } catch (\Throwable $e) {
            Log::error('OrderService CinetPay Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'CinetPay payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // Nepalste
    // -------------------------------------------------------------------------
    private function processNepalstePayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            $config = getPaymentMethodConfig('nepalste', $storeModel->user->id, $order->store_id);
            if (!$config['enabled'] || !$config['public_key'] || !$config['secret_key']) {
                return ['success' => false, 'message' => 'Nepalste is not configured for this store'];
            }

            $baseUrl = ($config['mode'] ?? 'sandbox') === 'live'
                ? 'https://nepalste.com.np/pay/api/v1'
                : 'https://nepalste.com.np/pay/sandbox/api/v1';

            $http = \Illuminate\Support\Facades\Http::timeout(40)->withoutVerifying();

            $tokenRes = $http->post($baseUrl . '/access-token', [
                'consumer_key' => $config['public_key'],
                'consumer_secret' => $config['secret_key'],
            ]);
            $tokenData = $tokenRes->json();
            $accessToken = $tokenData['token'] ?? null;
            if (!$accessToken) {
                return ['success' => false, 'message' => 'Nepalste access token failed'];
            }

            $orderId = 'store_' . $order->id . '_' . $order->order_number;
            $payRes = $http->withHeaders(['Authorization' => 'Bearer ' . $accessToken])->post($baseUrl . '/payment/initiate', [
                'amount' => number_format($order->total_amount, 2, '.', ''),
                'purchase_order_id' => $orderId,
                'purchase_order_name' => 'Order #' . $order->order_number,
                'return_url' => $storeModel->route('nepalste/success/' . $order->order_number . '/' . $orderId),
                'website_url' => $storeModel->getStoreUrl(),
            ]);
            $payData = $payRes->json();

            if (!empty($payData['payment_url'])) {
                $order->update([
                    'payment_gateway' => 'nepalste',
                    'payment_transaction_id' => $orderId,
                    'payment_details' => array_merge($order->payment_details ?? [], [
                        'nepalste_purchase_order_id' => $orderId,
                        'checkout_url' => $payData['payment_url'],
                    ]),
                ]);
                return [
                    'success' => true,
                    'checkout_url' => $payData['payment_url'],
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ];
            }
            return ['success' => false, 'message' => 'Nepalste payment initiation failed'];
        } catch (\Throwable $e) {
            Log::error('OrderService Nepalste Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Nepalste payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // Paiement Pro (HTML form POST)
    // -------------------------------------------------------------------------
    private function processPaiementPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            $config = getPaymentMethodConfig('paiement', $storeModel->user->id, $order->store_id);
            if (!$config['enabled'] || !$config['merchant_id']) {
                return ['success' => false, 'message' => 'Paiement Pro is not configured for this store'];
            }

            $transactionId = 'store_' . $order->id . '_' . time();
            $data = [
                'merchant_id' => $config['merchant_id'],
                'amount' => number_format($order->total_amount, 2, '.', ''),
                'currency' => 'XOF',
                'reference' => $transactionId,
                'description' => 'Order #' . $order->order_number,
                'return_url' => $storeModel->route('paiement/success/' . $order->order_number),
                'cancel_url' => $storeModel->getStoreUrl(),
                'notify_url' => $storeModel->route('paiement/callback/' . $order->order_number),
            ];

            $order->update([
                'payment_gateway' => 'paiement',
                'payment_transaction_id' => $transactionId,
                'payment_details' => array_merge($order->payment_details ?? [], ['paiement_reference' => $transactionId]),
            ]);

            return [
                'success' => true,
                'payment_form' => [
                    'action' => 'https://www.paiementpro.net/webservice/onlinepayment/init/merchant-payment',
                    'method' => 'POST',
                    'fields' => $data,
                ],
                'order_id' => $order->id,
                'order_number' => $order->order_number,
            ];
        } catch (\Throwable $e) {
            Log::error('OrderService Paiement Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Paiement payment failed: ' . $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // Aamarpay (hosted redirect)
    // -------------------------------------------------------------------------
    private function processAamarpayPayment(Order $order, ?string $storeSlug = null): array
    {
        try {
            $storeModel = \App\Models\Store::find($order->store_id);
            if (!$storeModel || !$storeModel->user) {
                return ['success' => false, 'message' => 'Store configuration error'];
            }
            $config = getPaymentMethodConfig('aamarpay', $storeModel->user->id, $order->store_id);
            if (!$config['enabled'] || !$config['store_id'] || !$config['signature']) {
                return ['success' => false, 'message' => 'Aamarpay is not configured for this store'];
            }

            $isSandbox = $config['store_id'] === 'aamarpaytest';
            $endpoint = $isSandbox ? 'https://sandbox.aamarpay.com/request.php' : 'https://secure.aamarpay.com/request.php';
            $orderId = 'store_' . $order->id . '_' . time();
            $currency = 'BDT';

            $response = \Illuminate\Support\Facades\Http::withoutVerifying()->asForm()->post($endpoint, [
                'store_id' => $config['store_id'],
                'amount' => number_format($order->total_amount, 2, '.', ''),
                'payment_type' => '',
                'currency' => $currency,
                'tran_id' => $orderId,
                'cus_name' => trim($order->customer_first_name . ' ' . $order->customer_last_name) ?: 'Customer',
                'cus_email' => $order->customer_email,
                'cus_phone' => $order->customer_phone ?: '1234567890',
                'cus_add1' => $order->shipping_address ?: '',
                'success_url' => $storeModel->route('aamarpay/success/' . $order->order_number),
                'fail_url' => $storeModel->getStoreUrl(),
                'cancel_url' => $storeModel->getStoreUrl(),
                'signature_key' => $config['signature'],
                'desc' => 'Order #' . $order->order_number,
            ]);

            $url = trim(str_replace('"', '', (string) $response->body()));
            if ($url) {
                $fullUrl = url($url);
                if (!preg_match('#^https?://#', $url)) {
                    $fullUrl = ($isSandbox ? 'https://sandbox.aamarpay.com/' : 'https://secure.aamarpay.com/') . ltrim($url, '/');
                }
                $order->update([
                    'payment_gateway' => 'aamarpay',
                    'payment_transaction_id' => $orderId,
                    'payment_details' => array_merge($order->payment_details ?? [], ['aamarpay_tran_id' => $orderId]),
                ]);
                return [
                    'success' => true,
                    'checkout_url' => $fullUrl,
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ];
            }
            return ['success' => false, 'message' => 'Aamarpay payment creation failed'];
        } catch (\Throwable $e) {
            Log::error('OrderService Aamarpay Error: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Aamarpay payment failed: ' . $e->getMessage()];
        }
    }
}