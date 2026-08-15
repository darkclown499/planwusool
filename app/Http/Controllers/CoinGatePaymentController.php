<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;
use App\Libraries\Coingate\Coingate;
use CoinGate\Client;
use Illuminate\Support\Facades\Log;

class CoinGatePaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'billing_cycle' => 'required|in:monthly,yearly',
            'coupon_code' => 'nullable|string'
        ]);

        try {
            $plan = Plan::findOrFail($validated['plan_id']);
            $user = auth()->user();
            
            // Get payment settings exactly like reference project
            $settings = getPaymentGatewaySettings();
                 
            
            if (!$settings['payment_settings']['is_coingate_enabled'] || !$settings['payment_settings']['coingate_api_token']) {
                return redirect()->route('plans.index')->with('error', __('CoinGate payment is not available'));
            }
            
            if (!isset($settings['payment_settings']['coingate_api_token']) || empty($settings['payment_settings']['coingate_api_token'])) {
                return redirect()->route('plans.index')->with('error', __('CoinGate API token not configured'));
            }
            
            // Calculate price using helper
            $pricing = calculatePlanPricing($plan, $validated['coupon_code'], $validated['billing_cycle'], $user->id);
            
            // Create plan order
            $orderId = time();
            $planOrder = PlanOrder::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'coupon_id' => $pricing['coupon_id'],
                'billing_cycle' => $validated['billing_cycle'],
                'payment_method' => 'coingate',
                'coupon_code' => $validated['coupon_code'],
                'payment_id' => $orderId,
                'original_price' => $pricing['original_price'],
                'discount_amount' => $pricing['discount_amount'],
                'final_price' => $pricing['final_price'],
                'status' => 'pending'
            ]);
            
            // Use official CoinGate package
            $client = new Client(
                $settings['payment_settings']['coingate_api_token'], 
                ($settings['payment_settings']['coingate_mode'] ?? 'sandbox') === 'sandbox'
            );
            
            $orderParams = [
                'order_id' => $orderId,
                'price_amount' => $pricing['final_price'],
                'price_currency' => $settings['general_settings']['defaultCurrency'] ?? 'USD',
                'receive_currency' => $settings['general_settings']['defaultCurrency'] ?? 'USD',
                'callback_url' => route('coingate.callback'),
                'cancel_url' => route('plans.index'),
                'success_url' => route('coingate.callback'),
                'title' => 'Plan #' . $orderId,
            ];
            
            $orderResponse = $client->order->create($orderParams);
            
            if ($orderResponse && isset($orderResponse->payment_url)) {
                // Store in session like reference project
                session(['coingate_data' => $orderResponse]);
                
                // Store gateway response
                $planOrder->payment_id = $orderResponse->order_id;
                $planOrder->save();
                
                return redirect($orderResponse->payment_url);
            } else {
                $planOrder->update(['status' => 'cancelled']);
                return redirect()->route('plans.index')->with('error', __('Payment initialization failed'));
            }
            
        } catch (\Exception $e) {
            return redirect()->route('plans.index')->with('error', __('Payment failed: ') . $e->getMessage());
        }
    }
    
    public function callback(Request $request)
    {
        try {
            // SECURITY: never trust the incoming callback data alone. Verify the
            // order status and amount with the CoinGate API before activating.
            $settings = getPaymentGatewaySettings();
            $paymentSettings = $settings['payment_settings'] ?? [];

            $token = $paymentSettings['coingate_api_token'] ?? null;
            $enabled = $paymentSettings['is_coingate_enabled'] ?? false;

            if (!$enabled || !$token) {
                Log::error('CoinGate callback: gateway not configured');
                return redirect()->route('plans.index')->with('error', __('Payment processing failed'));
            }

            $client = new Client($token, ($paymentSettings['coingate_mode'] ?? 'sandbox') === 'sandbox');

            // Merchant order id is used to find our PlanOrder. CoinGate's
            // server-to-server POST includes order_id; the browser redirect
            // (success_url) relies on the session created during checkout.
            $coingateData = session('coingate_data');
            $merchantOrderId = $request->input('order_id')
                ?? (is_object($coingateData) ? $coingateData->order_id : ($coingateData['order_id'] ?? null));

            // CoinGate order id is used to query the CoinGate API.
            $coinGateOrderId = $request->input('id')
                ?? (is_object($coingateData) ? $coingateData->id : ($coingateData['id'] ?? null));

            if (!$merchantOrderId || !$coinGateOrderId) {
                Log::error('CoinGate callback: missing order identifiers', ['request' => $request->all()]);
                return redirect()->route('plans.index')->with('error', __('Payment session expired'));
            }

            $planOrder = PlanOrder::where('payment_id', $merchantOrderId)->first();

            if (!$planOrder) {
                Log::error('Plan order not found', ['order_id' => $merchantOrderId]);
                return redirect()->route('plans.index')->with('error', __('Order not found'));
            }

            // Idempotency guard - do not re-activate / re-extend an already approved order.
            if ($planOrder->status === 'approved') {
                session()->forget('coingate_data');
                return redirect()->route('plans.index')->with('success', __('Plan activated successfully!'));
            }

            // Fetch the order from CoinGate (server-to-server) and verify it is paid.
            try {
                $order = $client->order->get((int)$coinGateOrderId);
            } catch (\Exception $e) {
                Log::error('CoinGate callback: API verification failed', [
                    'error' => $e->getMessage(),
                    'coingate_order_id' => $coinGateOrderId,
                    'plan_order_id' => $planOrder->id,
                ]);
                return redirect()->route('plans.index')->with('error', __('Payment could not be verified. Please contact support.'));
            }

            $gatewayStatus = $order->status ?? null;
            $gatewayAmount = (float)($order->price_amount ?? 0);
            $expectedAmount = (float)$planOrder->final_price;

            if ($gatewayStatus !== 'paid') {
                Log::warning('CoinGate callback: order is not paid', [
                    'coingate_order_id' => $coinGateOrderId,
                    'status' => $gatewayStatus,
                    'plan_order_id' => $planOrder->id,
                ]);
                return redirect()->route('plans.index')->with('error', __('Payment is pending or was not completed.'));
            }

            if (abs($gatewayAmount - $expectedAmount) > 0.01) {
                Log::error('CoinGate callback: amount mismatch', [
                    'expected' => $expectedAmount,
                    'gateway' => $gatewayAmount,
                    'plan_order_id' => $planOrder->id,
                ]);
                return redirect()->route('plans.index')->with('error', __('Payment amount does not match the plan price.'));
            }

            // All checks passed - activate subscription
            $planOrder->update([
                'status' => 'approved',
                'processed_at' => now()
            ]);

            $planOrder->activateSubscription();

            // Clear session
            session()->forget('coingate_data');

            return redirect()->route('plans.index')->with('success', __('Plan activated successfully!'));

        } catch (\Exception $e) {
            Log::error('CoinGate callback error: ' . $e->getMessage());
            return redirect()->route('plans.index')->with('error', __('Payment processing failed'));
        }
    }
}