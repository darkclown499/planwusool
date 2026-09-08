<?php

namespace App\Services;

use App\Models\Shipping;

/**
 * P4A-02 — canonical, server-authoritative shipping decision for storefront checkout.
 *
 *  A customer must never silently get free shipping when an eligible, active paid
 *  method exists. When the client omits shipping_method_id (and no local delivery
 *  zone applies), the server resolves exactly ONE eligible method so the order is
 *  charged the merchant's real fee instead of an accidental 0.
 *
 *  The canonical default is the merchant's own delivery priority: the first
 *  eligible method ordered by sort_order/name — the exact ordering the merchant
 *  dashboard and the storefront api.shipping.methods endpoint expose. That
 *  priority stays authoritative even when a later method in the order happens to
 *  be free, because the merchant's ranking encodes their real intent.
 *
 *  Explicit client selections are validated (store-scope + active) by the order
 *  controller and are never overridden here.
 */
class ShippingSelectionService
{
    /**
     * Server fee for a shipping method on a given subtotal.
     *
     * Mirrors CartCalculationService so "free" decisions match the billed amount:
     *  - free_shipping / free        => 0
     *  - percentage_based            => subtotal * cost / 100 + handling_fee
     *  - everything else (flat_rate) => cost + handling_fee
     */
    public static function computeFee(Shipping $method, float $subtotal): float
    {
        if ($method->type === 'free_shipping' || $method->type === 'free') {
            return 0.0;
        }
        $handlingFee = (float) ($method->handling_fee ?? 0);
        if ($method->type === 'percentage_based') {
            return round(($subtotal * (float) $method->cost / 100) + $handlingFee, 2);
        }
        return round((float) $method->cost + $handlingFee, 2);
    }

    public static function isFree(Shipping $method, float $subtotal): bool
    {
        return self::computeFee($method, $subtotal) == 0;
    }

    /**
     * Canonical default method for a store without a client selection.
     *
     * Policy (deterministic, matches the storefront API ordering):
     *  - exactly one eligible method  => it;
     *  - multiple                     => the first eligible method by
     *    sort_order/name — the merchant's canonical delivery priority. A later
     *    method being free does NOT outrank merchant priority (that is the
     *    merchant's deliberate ranking, e.g. free pickup ranked below paid
     *    delivery).
     *
     * Returns null when the store has no eligible methods — a true no-shipping
     * store keeps shipping 0 and is never masqueraded as a free paid method.
     */
    public static function defaultForCheckout(int $storeId, float $subtotal): ?Shipping
    {
        $methods = Shipping::where('store_id', $storeId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return $methods->first();
    }
}