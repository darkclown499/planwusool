<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\PlanOrder;
use App\Traits\HandlesWebhookIdempotency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * Abstract base controller for plan-subscription payment gateways.
 *
 * Encapsulates the shared flow across the 30+ payment gateway controllers:
 *   1. Validate the plan subscription request
 *   2. Calculate plan pricing (applies coupon if provided)
 *   3. Delegate gateway-specific charging to processCharged()
 *   4. On success, create the PlanOrder + activate the subscription
 *
 * Concrete subclasses implement light (`getGatewayName`, `processCharged`)
 * and `${gateway}Return` hooks where a redirect-back verification step exists.
 */
abstract class PaymentGatewayController extends Controller
{
    use HandlesWebhookIdempotency;

    /**
     * The payment gateway identifier (e.g. 'stripe', 'paypal', 'razorpay').
     * Used for PlanOrder.payment_method and idempotency keys.
     */
    abstract protected function gatewayName(): string;

    /**
     * Validate the gateway-specific fields for this gateway.
     * Override to add gateway-specific validation rules.
     */
    protected function validationRules(): array
    {
        return [
            'plan_id' => 'required|exists:plans,id',
            'billing_cycle' => 'required|in:yearly',
            'coupon_code' => 'nullable|string',
        ];
    }

    /**
     * Process the gateway charge and return an array describing the result.
     *
     * @param  Request  $request
     * @param  Plan  $plan
     * @param  array  $pricing  Pricing computed by calculatePlanPricing()
     * @return array  ['success' => bool, 'reference_id' => ?string, 'redirect_url' => ?string, 'message' => string]
     */
    abstract protected function processCharged(Request $request, Plan $plan, array $pricing): array;

    /**
     * Handle a successful subscription payment (Shared).
     */
    public function processPayment(Request $request)
    {
        $validator = Validator::make($request->all(), $this->validationRules());

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        try {
            $plan = Plan::findOrFail($request->plan_id);
            $user = auth()->user();

            $pricing = calculatePlanPricing(
                $plan,
                $request->coupon_code,
                $request->billing_cycle,
                $user->id
            );

            $result = $this->processCharged($request, $plan, $pricing);

            if (!$result['success']) {
                return back()->withErrors(['error' => $result['message'] ?? __('Payment failed.')]);
            }

            // Gateway handles the payment synchronously; create order + activate.
            if (isset($result['reference_id']) && $result['reference_id'] && !empty($result['needs_order_creation'] ?? true)) {
                $this->createPlanOrderAndActivate($user, $plan, $request, $pricing, $result['reference_id']);
            }

            // If the gateway requires a redirect (3DS / hosted checkout), redirect.
            if (!empty($result['redirect_url'])) {
                return \Inertia\Inertia::location($result['redirect_url']);
            }

            return back()->with('success', __('Payment successful! Your plan has been activated.'));

        } catch (\Exception $e) {
            Log::error($this->gatewayName() . ' payment error: ' . $e->getMessage() . ' | Trace: ' . $e->getTraceAsString());
            return back()->withErrors(['error' => __('Payment processing failed. Please try again.')]);
        }
    }

    /**
     * Create the PlanOrder and activate the subscription idempotently (atomic).
     */
    protected function createPlanOrderAndActivate($user, Plan $plan, Request $request, array $pricing, string $paymentId): void
    {
        // Atomic idempotency via DB transaction + unique constraint fallback
        try {
            \Illuminate\Support\Facades\DB::transaction(function () use ($user, $plan, $request, $pricing, $paymentId) {
                // Use lock + check inside transaction to avoid race
                $exists = PlanOrder::where('payment_id', $paymentId)->lockForUpdate()->exists();
                if ($exists) {
                    return;
                }

                $planOrder = PlanOrder::create([
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'coupon_id' => $pricing['coupon_id'] ?? null,
                    'original_price' => $pricing['original_price'],
                    'discount_amount' => $pricing['discount_amount'],
                    'final_price' => $pricing['final_price'],
                    'billing_cycle' => $request->billing_cycle,
                    'payment_method' => $this->gatewayName(),
                    'payment_id' => $paymentId,
                    'status' => 'approved',
                    'coupon_code' => $request->coupon_code,
                    'order_number' => 'PO-' . strtoupper(Str::random(8)),
                    'ordered_at' => now(),
                    'processed_at' => now(),
                ]);

                $planOrder->activateSubscription();
            });
        } catch (\Illuminate\Database\QueryException $e) {
            // Unique violation (1062 MySQL / 23505 PG) — already processed by concurrent request
            if (str_contains($e->getMessage(), 'Duplicate') || str_contains($e->getMessage(), 'unique') || $e->getCode() === '23000') {
                Log::info("Duplicate plan order ignored: payment_id={$paymentId} gateway=" . $this->gatewayName());
                return;
            }
            throw $e;
        }
    }
}
