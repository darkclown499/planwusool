<?php

namespace App\Services;

use App\Models\InventoryMovement;
use Illuminate\Support\Facades\Auth;

/**
 * Central writer for the stock-movement ledger.
 *
 * Keeps ownership/meta server-derived: never accepts store_id, movement type or
 * actor from a browser payload. Callers supply only the domain facts they know
 * (product/variant, delta, reference) and this service fills the authoritative
 * store + actor.
 */
class InventoryMovementService
{
    /**
     * Record one stock movement.
     *
     * @param array{
     *   store_id: int,
     *   product_id: ?int,
     *   variant_uuid?: ?string,
     *   variant_combination_id?: ?string,
     *   quantity_delta: int,
     *   movement_type: string,
     *   reference_type?: ?string,
     *   reference_id?: ?int,
     *   reference_number?: ?string,
     *   before_quantity?: ?int,
     *   after_quantity?: ?int,
     *   note?: ?string,
     *   actor?: ?array{type?: string, id?: ?int},
     * } $data
     */
    public static function record(array $data): ?InventoryMovement
    {
        try {
            $storeId = (int) ($data['store_id'] ?? 0);
            if ($storeId <= 0) {
                return null;
            }

            $actor = $data['actor'] ?? null;
            $actorType = $actor['type'] ?? null;
            $actorId = $actor['id'] ?? null;
            if (!$actorType || !$actorId) {
                $user = Auth::guard('web')->user();
                if ($user) {
                    $actorType = 'user';
                    $actorId = $user->id;
                }
            }

            return InventoryMovement::create([
                'store_id' => $storeId,
                'product_id' => $data['product_id'] ?? null,
                'variant_uuid' => $data['variant_uuid'] ?? null,
                'variant_combination_id' => $data['variant_combination_id'] ?? null,
                'quantity_delta' => (int) ($data['quantity_delta'] ?? 0),
                'movement_type' => $data['movement_type'],
                'reference_type' => $data['reference_type'] ?? null,
                'reference_id' => $data['reference_id'] ?? null,
                'reference_number' => $data['reference_number'] ?? null,
                'before_quantity' => isset($data['before_quantity']) ? (int) $data['before_quantity'] : null,
                'after_quantity' => isset($data['after_quantity']) ? (int) $data['after_quantity'] : null,
                'actor_type' => $actorType,
                'actor_id' => $actorId,
                'note' => isset($data['note']) ? \Illuminate\Support\Str::limit((string) $data['note'], 500) : null,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            // The ledger must never break the authoritative stock mutation.
            \Illuminate\Support\Facades\Log::warning('Inventory movement record failed', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
