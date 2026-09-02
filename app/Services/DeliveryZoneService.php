<?php

namespace App\Services;

use App\Models\DeliveryZone;

/**
 * Central Local Delivery rate engine.
 *
 * All delivery-fee determination flows through here so storefront templates
 * never compute delivery pricing themselves. Zones are always store-scoped
 * and ownership is re-validated server-side on every use.
 */
class DeliveryZoneService
{
    /**
     * Resolve a valid, active zone for a store and compute the effective fee.
     *
     * @param int      $storeId
     * @param int|null $zoneId
     * @param float    $subtotal subtotal (before shipping/tax) used for thresholds
     *
     * @return array{zone: DeliveryZone|null, eligible: bool, fee: float, free_delivery: bool}
     */
    public function resolveForCheckout(int $storeId, ?int $zoneId, float $subtotal): array
    {
        $result = ['zone' => null, 'eligible' => false, 'fee' => 0.0, 'free_delivery' => false];

        if (!$zoneId) {
            return $result;
        }

        $zone = DeliveryZone::where('store_id', $storeId)
            ->where('id', $zoneId)
            ->where('is_active', true)
            ->first();

        if (!$zone) {
            return $result;
        }

        if (!$zone->isEligibleForSubtotal($subtotal)) {
            $result['zone'] = $zone;
            return $result;
        }

        $fee = $zone->feeForSubtotal($subtotal);

        $result['zone'] = $zone;
        $result['eligible'] = true;
        $result['fee'] = $fee;
        $result['free_delivery'] = $fee <= 0;

        return $result;
    }

    /**
     * Client-submitted delivery amounts are NEVER trusted. The fee is always
     * resolved server-side from the persisted zone row.
     */
    public function feeForZone(DeliveryZone $zone, float $subtotal): float
    {
        return $zone->feeForSubtotal($subtotal);
    }
}
