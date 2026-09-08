<?php

namespace App\Services;

use App\Models\Shipping;

/**
 * P4A-02 — canonical, server-authoritative shipping decision for storefront checkout.
 *
 * A customer must never silently get free shipping when an eligible, active paid
 * method exists. When the client omits shipping_method_id (and no local delivery
 * zone applies), the server resolves exactly ONE eligible method so the order is
 * charged the merchant's real fee instead of an accidental 0.
 *
 * Explicit client selections are validated (store-scope + active) by the order
 * controller and are never overridden here.
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
     *  - multiple                     => the first genuinely-free method,
     *    otherwise the first by sort_order/name (same ordering the checkout UI
     *    exposes via api.shipping.methods).
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

        if ($methods->isEmpty()) {
            return null;
        }

        $first = $methods->first();

        if ($methods->count() === 1) {
            return $first;
        }

        foreach ($methods as $method) {
            if (self::isFree($method, $subtotal)) {
                return $method;
            }
        }

        return $first;
    }
}