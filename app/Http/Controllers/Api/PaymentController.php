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
                
                // Add offline payment details for local & USDT methods
                if ($methodName !== 'bank' && ($methodConfig['mode'] ?? 'offline') === 'offline') {
                    $details = $this->getOfflineDetails($methodName, $methodConfig);
                    if ($details !== null) {
                        $paymentMethod['details'] = $details;
                    }
                }
                
                $paymentMethods[] = $paymentMethod;
            }
        }

        return response()->json([
            'payment_methods' => $paymentMethods
        ]);
    }
    
    private function getOfflineDetails($method, $config)
    {
        if (in_array($method, ['usdt_trc20', 'usdt_erc20', 'usdt_bep20', 'usdt_polygon', 'usdt_solana'])) {
            $lines = [];
            if (!empty($config['wallet_address'])) {
                $lines[] = 'عنوان المحفظة: ' . $config['wallet_address'];
            }
            if (!empty($config['network'])) {
                $lines[] = 'الشبكة: ' . $config['network'];
            }
            if (!empty($config['memo'])) {
                $lines[] = 'مذكرة / وسم: ' . $config['memo'];
            }
            if (!empty($config['merchant_name'])) {
                $lines[] = 'اسم التاجر: ' . $config['merchant_name'];
            }
            return empty($lines) ? null : implode("\n", $lines);
        }
        
        $lines = [];
        if (!empty($config['merchant_name'])) {
            $lines[] = 'Merchant Name: ' . $config['merchant_name'];
        }
        if (!empty($config['phone_number'])) {
            $lines[] = 'رقم الهاتف: ' . $config['phone_number'];
        }
        if (!empty($config['instructions'])) {
            $lines[] = 'التعليمات: ' . $config['instructions'];
        }
        return empty($lines) ? null : implode("\n", $lines);
    }
    
    private function getDisplayName($method)
    {
        $names = [
            'bank' => 'تحويل بنكي',
            'cod' => 'الدفع عند الاستلام',
            'stripe' => 'بطاقة ائتمان/خصم',
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
            'jawwal_pay' => 'Jawwal Pay',
            'pal_pay' => 'PalPay',
            'zain_cash' => 'Zain Cash',
            'orange_money' => 'Orange Money',
            'bank_palestine' => 'بنك فلسطين',
            'al_quds_bank' => 'بنك القدس',
            'arab_islamic_bank' => 'البنك العربي الإسلامي',
            'cairo_amman_bank' => 'بنك القاهرة عمان',
            'housing_bank' => 'بنك الإسكان',
            'safad_bank' => 'بنك صفد',
            'cliq' => 'CLIQ',
            'zain_cash_jo' => 'زين كاش (الأردن)',
            'orange_money_jo' => 'أورنج موني (الأردن)',
            'etihad_wallet' => 'Etihad Wallet',
            'dinar_pay' => 'DinarPay',
            'jordan_kuwait_bank' => 'البنك الأردني الكويتي',
            'arab_bank' => 'البنك العربي',
            'housing_bank_jo' => 'بنك الإسكان (الأردن)',
            'cairo_amman_bank_jo' => 'بنك القاهرة عمان (الأردن)',
            'safad_bank_jo' => 'بنك صفد (الأردن)',
            'usdt_trc20' => 'USDT (TRC20)',
            'usdt_erc20' => 'USDT (ERC20)',
            'usdt_bep20' => 'USDT (BEP20)',
            'usdt_polygon' => 'USDT (Polygon)',
            'usdt_solana' => 'USDT (Solana)',
        ];
        
        return $names[$method] ?? ucfirst(str_replace('_', ' ', $method));
    }
    
    private function getDescription($method)
    {
        $descriptions = [
            'bank' => 'تحويل بنكي مباشر',
            'cod' => 'ادفع عند استلام طلبك',
            'stripe' => 'ادفع بأمان باستخدام بطاقة الائتمان أو الخصم',
            'paypal' => 'ادفع باستخدام حساب باي بال',
            'razorpay' => 'ادفع عبر Razorpay',
            'flutterwave' => 'ادفع عبر Flutterwave',
            'paystack' => 'ادفع عبر Paystack',
            'xendit' => 'ادفع عبر Xendit',
            'toyyibpay' => 'ادفع عبر ToyyibPay (FPX)',
            'cashfree' => 'ادفع عبر Cashfree',
            'mercadopago' => 'ادفع عبر Mercado Pago',
            'paytabs' => 'ادفع عبر PayTabs',
            'skrill' => 'ادفع عبر Skrill',
            'coingate' => 'ادفع عبر CoinGate',
            'midtrans' => 'ادفع عبر Midtrans',
            'mollie' => 'ادفع عبر Mollie',
            'benefit' => 'ادفع عبر Benefit',
            'yookassa' => 'ادفع عبر YooKassa',
            'jawwal_pay' => 'ادفع عبر جوال باي',
            'pal_pay' => 'ادفع عبر PalPay',
            'zain_cash' => 'ادفع عبر زين كاش',
            'orange_money' => 'ادفع عبر أورنج موني',
            'bank_palestine' => 'ادفع عبر بنك فلسطين',
            'al_quds_bank' => 'ادفع عبر بنك القدس',
            'arab_islamic_bank' => 'ادفع عبر البنك العربي الإسلامي',
            'cairo_amman_bank' => 'ادفع عبر بنك القاهرة عمان',
            'housing_bank' => 'ادفع عبر بنك الإسكان',
            'safad_bank' => 'ادفع عبر بنك صفد',
            'cliq' => 'ادفع عبر CLIQ',
            'zain_cash_jo' => 'ادفع عبر زين كاش (الأردن)',
            'orange_money_jo' => 'ادفع عبر أورنج موني (الأردن)',
            'etihad_wallet' => 'ادفع عبر محفظة اتحاد',
            'dinar_pay' => 'ادفع عبر DinarPay',
            'jordan_kuwait_bank' => 'ادفع عبر البنك الأردني الكويتي',
            'arab_bank' => 'ادفع عبر البنك العربي',
            'housing_bank_jo' => 'ادفع عبر بنك الإسكان (الأردن)',
            'cairo_amman_bank_jo' => 'ادفع عبر بنك القاهرة عمان (الأردن)',
            'safad_bank_jo' => 'ادفع عبر بنك صفد (الأردن)',
            'usdt_trc20' => 'ادفع عبر USDT (TRC20)',
            'usdt_erc20' => 'ادفع عبر USDT (ERC20)',
            'usdt_bep20' => 'ادفع عبر USDT (BEP20)',
            'usdt_polygon' => 'ادفع عبر USDT (Polygon)',
            'usdt_solana' => 'ادفع عبر USDT (Solana)',
        ];
        
        return $descriptions[$method] ?? null;
    }
    
    private function getIcon($method)
    {
        $icons = [
            'stripe' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/></svg>',
            'paypal' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.028-.026.056-.052.08-.498 2.542-2.114 4.395-4.708 4.395h-2.91l-1.433 9.098-.574 3.649a.641.641 0 0 0 .633.74h4.180a.641.641 0 0 0 .633-.74l.055-.348.574-3.649.037-.234a.641.641 0 0 1 .633-.74h.4c3.611 0 6.436-1.47 7.26-5.729.344-1.781.166-3.26-.72-4.381z"/></svg>',
            'jawwal_pay' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zm3 3v8h2V8H5zm4 0a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h3v-2H9v-4h3V8H9zm6 0a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h3v-2h-3v-4h3V8h-3z"/></svg>',
            'pal_pay' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zm3 3v8h2V8H5zm4 0v8h2V8H9zm4 0v8h2V8h-2zm4 0a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h3v-2h-3v-4h3V8h-3z"/></svg>',
            'zain_cash' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-6h2v1h-2v-1zm0-1V7h2v6h-2z"/></svg>',
            'orange_money' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 14h2v2h-2v-2zm0-1v-2h2v2h-2zm0-3V7h2v5h-2z"/></svg>',
            'bank_palestine' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M2 8l10-5 10 5-10 5-10-5zm3 1l7 3.5L19 9v8h2v-8l-9 4.5L3 9v8H2v-8h3zm-1 10h18v2H4v-2z"/></svg>',
            'al_quds_bank' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M2 8l10-5 10 5-10 5-10-5zm3 1l7 3.5L19 9v8h2v-8l-9 4.5L3 9v8H2v-8h3zm-1 10h18v2H4v-2z"/></svg>',
            'arab_islamic_bank' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M2 8l10-5 10 5-10 5-10-5zm3 1l7 3.5L19 9v8h2v-8l-9 4.5L3 9v8H2v-8h3zm-1 10h18v2H4v-2z"/></svg>',
            'cairo_amman_bank' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M2 8l10-5 10 5-10 5-10-5zm3 1l7 3.5L19 9v8h2v-8l-9 4.5L3 9v8H2v-8h3zm-1 10h18v2H4v-2z"/></svg>',
            'housing_bank' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2l10 7v2H2V9l10-7zM4 11h16v10h-3v-6H7v6H4V11zm9 0h-2v10h2V11z"/></svg>',
            'safad_bank' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M2 8l10-5 10 5-10 5-10-5zm3 1l7 3.5L19 9v8h2v-8l-9 4.5L3 9v8H2v-8h3zm-1 10h18v2H4v-2z"/></svg>',
            'cliq' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm4-10h-6v6h-2V8h8v2z"/></svg>',
            'zain_cash_jo' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-6h2v1h-2v-1zm0-1V7h2v6h-2z"/></svg>',
            'orange_money_jo' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 14h2v2h-2v-2zm0-1v-2h2v2h-2zm0-3V7h2v5h-2z"/></svg>',
            'etihad_wallet' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15V7h4.5a2.5 2.5 0 0 1 0 5H12v3h-2zm2-5h2a.5.5 0 0 0 0-1h-2v1z"/></svg>',
            'dinar_pay' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-2 15V7h4.5a2.5 2.5 0 0 1 0 5H12v3h-2zm2-5h2a.5.5 0 0 0 0-1h-2v1z"/></svg>',
            'jordan_kuwait_bank' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M2 8l10-5 10 5-10 5-10-5zm3 1l7 3.5L19 9v8h2v-8l-9 4.5L3 9v8H2v-8h3zm-1 10h18v2H4v-2z"/></svg>',
            'arab_bank' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M2 8l10-5 10 5-10 5-10-5zm3 1l7 3.5L19 9v8h2v-8l-9 4.5L3 9v8H2v-8h3zm-1 10h18v2H4v-2z"/></svg>',
            'housing_bank_jo' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2l10 7v2H2V9l10-7zM4 11h16v10h-3v-6H7v6H4V11zm9 0h-2v10h2V11z"/></svg>',
            'cairo_amman_bank_jo' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M2 8l10-5 10 5-10 5-10-5zm3 1l7 3.5L19 9v8h2v-8l-9 4.5L3 9v8H2v-8h3zm-1 10h18v2H4v-2z"/></svg>',
            'safad_bank_jo' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M2 8l10-5 10 5-10 5-10-5zm3 1l7 3.5L19 9v8h2v-8l-9 4.5L3 9v8H2v-8h3zm-1 10h18v2H4v-2z"/></svg>',
            'usdt_trc20' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2l7 5v10l-7 5-7-5V7l7-5zm0 2.2L7 8v8l5 3.8L17 16V8l-5-3.8zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-3 0h2v2h-2v-2z"/></svg>',
            'usdt_erc20' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-2-12l5 4-5 4V8z"/></svg>',
            'usdt_bep20' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-2-12l5 4-5 4V8z"/></svg>',
            'usdt_polygon' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-2-12l5 4-5 4V8z"/></svg>',
            'usdt_solana' => '<svg viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-2-12l5 4-5 4V8z"/></svg>'
        ];
        
        return $icons[$method] ?? null;
    }
    
    private function getFormFields($method)
    {
        $fields = [
            'bank' => [
                ['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']
            ],
            'jawwal_pay' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'pal_pay' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'zain_cash' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'orange_money' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'bank_palestine' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'al_quds_bank' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'arab_islamic_bank' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'cairo_amman_bank' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'housing_bank' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'safad_bank' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'cliq' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'zain_cash_jo' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'orange_money_jo' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'etihad_wallet' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'dinar_pay' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'jordan_kuwait_bank' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'arab_bank' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'housing_bank_jo' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'cairo_amman_bank_jo' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'safad_bank_jo' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'usdt_trc20' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'usdt_erc20' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'usdt_bep20' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'usdt_polygon' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
            'usdt_solana' => [['label' => 'ارفع إيصال الدفع', 'type' => 'file', 'required' => true, 'accept' => 'image/*,.pdf']],
        ];
        
        return isset($fields[$method]) ? $fields[$method] : null;
    }
}