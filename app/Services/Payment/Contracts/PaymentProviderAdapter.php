<?php

namespace App\Services\Payment\Contracts;

use App\Models\Order;
use Illuminate\Http\Request;

/**
 * Reusable provider adapter contract for CONNECTED gateways.
 *
 * REUSE > REFACTOR > REBUILD:
 * Existing OrderService::process{Gateway}Payment + GatewayReturnController::verify*
 * + GatewayWebhookController + VerifyWebhookSignature remain canonical.
 * New adapters implement this contract and delegate to those flows.
 *
 * Phase 1: contract only — no fake Gateway implementations.
 */
interface PaymentProviderAdapter
{
    public function id(): string; // e.g. 'grow'
    public function label(): string;

    /** Create provider payment — return checkout_url or payment_form or error. */
    public function createPayment(Order $order, ?string $storeSlug = null): array;

    /** Verify browser callback/success redirect — must do server-to-server fetch + amount/currency guard. */
    public function verifyCallback(Request $request, Order $order): bool;

    /** Verify webhook signature + server-to-server + idempotency. */
    public function verifyWebhook(Request $request, Order $order): bool;

    public function handleWebhook(Request $request): \Illuminate\Http\Response;

    /** Refund — only if supportsRefund() true; otherwise manual. */
    public function refund(Order $order, float $amount, ?string $reason = null): array;

    public function supportsRefund(): bool;
    public function supportsWebhook(): bool;
    public function supportsSandbox(): bool;

    /** Currency guard — order.currency must be in this list. */
    public function supportedCurrencies(): array;
    public function supportsCurrency(string $currency): bool;

    /** Credential schema — fields shown in Hub (empty for partner until adapter). */
    public function credentialSchema(): array;

    /** Public config exposed to checkout (no secrets). */
    public function getPublicConfig(int $userId, int $storeId): array;

    /** Server-side credential validation (safe endpoint, never echo secrets). */
    public function validateCredentials(array $credentials): array; // ['ok'=>bool,'message'=>string]
}
