<?php

namespace App\Jobs;

use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MercadoPagoWebhookJob extends WebhookJob
{
    protected function processWebhook(array $payload): void
    {
        $data = $payload;
        $paymentId = $data['id'] ?? null;
        $topic = $data['topic'] ?? null;

        if (!$paymentId) {
            $this->logError('Payment ID not found');
            return;
        }

        $settings = getPaymentGatewaySettings();
        $accessToken = $settings['payment_settings']['mercadopago_access_token'] ?? null;

        if (!$accessToken) {
            $this->logError('MercadoPago credentials not found');
            return;
        }

        $paymentResponse = Http::withToken($accessToken)
            ->get('https://api.mercadopago.com/v1/payments/' . $paymentId);

        if (!$paymentResponse->successful()) {
            $this->logError('Failed to fetch payment details', ['payment_id' => $paymentId]);
            return;
        }

        $payment = $paymentResponse->json();
        $externalReference = $payment['external_reference'] ?? null;
        $paymentStatus = $payment['status'] ?? null;

        if (!$externalReference) {
            $this->logError('External reference not found', ['payment_id' => $paymentId]);
            return;
        }

        $parts = explode('_', $externalReference);

        if (count($parts) >= 4 && $parts[0] === 'plan') {
            $this->handlePlanPayment($parts, $payment, $paymentStatus);
        } else {
            $this->handleOrderPayment($externalReference, $payment, $paymentStatus);
        }
    }

    private function handlePlanPayment(array $parts, array $payment, string $paymentStatus): void
    {
        $planId = (int)$parts[1];
        $userId = (int)$parts[2];
        $billingCycle = $parts[3];
        $couponCode = (count($parts) > 5 && $parts[4] === 'coupon') ? $parts[5] : null;

        $plan = Plan::find($planId);
        if (!$plan) {
            $this->logError('Plan not found', ['plan_id' => $planId]);
            return;
        }

        if ($payment['status'] === 'approved') {
            $existingOrder = PlanOrder::where('payment_id', $payment['id'])->first();

            if (!$existingOrder) {
                $pricing = calculatePlanPricing($plan, $couponCode, $billingCycle, $userId);
                $paidAmount = (float)($payment['transaction_amount'] ?? 0);

                if (abs($paidAmount - (float)$pricing['final_price']) > 0.01) {
                    $this->logError('Amount mismatch', [
                        'expected' => $pricing['final_price'],
                        'paid' => $paidAmount,
                        'payment_id' => $payment['id'],
                    ]);
                    return;
                }

                $planOrder = new PlanOrder();
                $planOrder->plan_id = $planId;
                $planOrder->user_id = $userId;
                $planOrder->payment_method = 'mercadopago';
                $planOrder->payment_id = $payment['id'];
                $planOrder->billing_cycle = $billingCycle;
                $planOrder->coupon_id = $pricing['coupon_id'];
                $planOrder->coupon_code = $couponCode;
                $planOrder->original_price = $pricing['original_price'];
                $planOrder->discount_amount = $pricing['discount_amount'];
                $planOrder->final_price = $pricing['final_price'];
                $planOrder->status = 'completed';
                $planOrder->save();

                $planOrder->activateSubscription();
            }
        }
    }

    private function handleOrderPayment(string $externalReference, array $payment, string $paymentStatus): void
    {
        $orderNumber = $externalReference;
        $order = Order::where('order_number', $orderNumber)->first();

        if (!$order) {
            $this->logError('Order not found', ['order_number' => $orderNumber]);
            return;
        }

        if ($payment['status'] === 'approved') {
            $order->update([
                'status' => 'confirmed',
                'payment_status' => 'paid',
                'payment_transaction_id' => $payment['id'],
            ]);

            event(new \App\Events\OrderCreated($order));
        } elseif (in_array($payment['status'], ['rejected', 'failed'])) {
            $order->update([
                'payment_status' => 'failed',
                'payment_transaction_id' => $payment['id'],
            ]);
        }
    }
}