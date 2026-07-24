<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function getMethods(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id'
        ]);

        $storeId = $request->store_id;
        $store = Store::find($storeId);
        
        // In demo mode, always return payment methods for display
        // The actual payment processing will be blocked by demo middleware
        $enabledMethods = getEnabledPaymentMethods($store->user->id ?? null, $storeId);
        
        // Ensure $enabledMethods is an array
        if (!is_array($enabledMethods)) {
            $enabledMethods = [];
        }
        
        $paymentMethods = [];
        
        foreach ($enabledMethods as $methodName => $methodConfig) {
            if (isset($methodConfig['enabled']) && $methodConfig['enabled']) {
                $paymentMethod = [
                    'name' => $methodName,
                    'display_name' => $this->getDisplayName($methodName),
                    'description' => $this->getDescription($methodName),
                    'icon' => $this->getIcon($methodName),
                    'form_fields' => $this->getFormFields($methodName)
                ];
                
                // Add bank details for bank transfer method
                if ($methodName === 'bank' && isset($methodConfig['details'])) {
                    $paymentMethod['details'] = $methodConfig['details'];
                }
                
                $paymentMethods[] = $paymentMethod;
            }
        }

        return response()->json([
            'payment_methods' => $paymentMethods
        ]);
    }
    
    private function getDisplayName($method)
    {
        $names = [
            'bank' => 'Bank Transfer',
            'cod' => 'Cash on Delivery',
            'stripe' => 'Credit/Debit Card',
            'paypal' => 'PayPal',
            'razorpay' => 'Razorpay',
            'flutterwave' => 'Flutterwave',
            'paystack' => 'Paystack',
            'xendit' => 'Xendit',
            'toyyibpay' => 'ToyyibPay',
            'cashfree' => 'Cashfree',
            'skrill' => 'Skrill',
            'coingate' => 'CoinGate',
            'midtrans' => 'Midtrans',
            'mollie' => 'Mollie',
            'benefit' => 'Benefit',
            'yookassa' => 'YooKassa',
        ];
        
        return $names[$method] ?? ucfirst(str_replace('_', ' ', $method));
    }
    
    private function getDescription($method)
    {
        $descriptions = [
            'bank' => 'Direct bank transfer payment',
            'cod' => 'Pay when you receive your order',
            'stripe' => 'Pay securely with credit or debit card',
            'paypal' => 'Pay with your PayPal account',
            'razorpay' => 'Pay with Razorpay',
            'flutterwave' => 'Pay with Flutterwave',
            'paystack' => 'Pay with Paystack',
            'xendit' => 'Pay with Xendit',
            'toyyibpay' => 'Pay with ToyyibPay (FPX)',
            'cashfree' => 'Pay with Cashfree',
            'mercadopago' => 'Pay with Mercado Pago',
            'paytabs' => 'Pay with PayTabs',
            'skrill' => 'Pay with Skrill',
            'coingate' => 'Pay with CoinGate',
            'midtrans' => 'Pay with Midtrans',
            'mollie' => 'Pay with Mollie',
            'benefit' => 'Pay with Benefit',
            'yookassa' => 'Pay with YooKassa',
        ];
        
        return $descriptions[$method] ?? null;
    }
    
    private function getIcon($method)
    {
        $icons = [
            'stripe' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>',
            'paypal' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.028-.026.056-.052.08-.498 2.542-2.114 4.395-4.708 4.395h-2.91l-1.433 9.098-.574 3.649a.641.641 0 0 0 .633.74h4.180a.641.641 0 0 0 .633-.74l.055-.348.574-3.649.037-.234a.641.641 0 0 1 .633-.74h.4c3.611 0 6.436-1.47 7.26-5.729.344-1.781.166-3.26-.72-4.381z"/></svg>'
        ];
        
        return $icons[$method] ?? null;
    }
    
    private function getFormFields($method)
    {
        $fields = [
            'bank' => [
                ['label' => 'Upload Payment Receipt', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']
            ],
            // 'stripe' => [
            //     ['label' => 'Card Number', 'type' => 'text', 'required' => true, 'placeholder' => '1234 5678 9012 3456'],
            //     ['label' => 'Expiry Date', 'type' => 'text', 'required' => true, 'placeholder' => 'MM/YY'],
            //     ['label' => 'CVC', 'type' => 'text', 'required' => true, 'placeholder' => '123'],
            //     ['label' => 'Cardholder Name', 'type' => 'text', 'required' => true, 'placeholder' => 'John Doe']
            // ]
        ];
        
        return isset($fields[$method]) ? $fields[$method] : null;
    }
}