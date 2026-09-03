<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Immutable audit row describing a single stock movement.
 *
 * The authoritative current stock is NOT stored here — it lives on
 * products.stock (product inventory mode) or products.variant_combinations[*].stock
 * (variant inventory mode). This table only explains HOW and WHY it changed.
 */
class InventoryMovement extends Model
{
    public const MOVEMENT_ONLINE_SALE = 'ONLINE_SALE';
    public const MOVEMENT_POS_SALE = 'POS_SALE';
    public const MOVEMENT_ORDER_CANCEL_RESTOCK = 'ORDER_CANCEL_RESTOCK';
    public const MOVEMENT_ORDER_RESTORE = 'ORDER_RESTORE';
    public const MOVEMENT_RETURN_RESTOCK = 'RETURN_RESTOCK';
    public const MOVEMENT_MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT';
    public const MOVEMENT_IMPORT_ADJUSTMENT = 'IMPORT_ADJUSTMENT';
    public const MOVEMENT_ERP_ADJUSTMENT = 'ERP_ADJUSTMENT';

    /**
     * No mass-assignment surface exposed to the browser — the ledger is written
     * only through InventoryMovementService so server controls ownership/meta.
     *
     * @var list<string>
     */
    protected $guarded = [];

    public $timestamps = false;

    protected $casts = [
        'quantity_delta' => 'integer',
        'before_quantity' => 'integer',
        'after_quantity' => 'integer',
        'store_id' => 'integer',
        'product_id' => 'integer',
        'reference_id' => 'integer',
        'actor_id' => 'integer',
        // created_at is an explicit timestamp column (timestamps=false disables
        // auto-maintenance, but the column still holds real timestamps). Cast it
        // to a Carbon so date consumers (e.g. ->toISOString()) never read a raw
        // string back and throw "Call to a member function ... on string".
        'created_at' => 'datetime',
    ];

    protected $fillable = [
        'store_id',
        'product_id',
        'variant_uuid',
        'variant_combination_id',
        'quantity_delta',
        'movement_type',
        'reference_type',
        'reference_id',
        'reference_number',
        'before_quantity',
        'after_quantity',
        'actor_type',
        'actor_id',
        'note',
        'created_at',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Store::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Product::class);
    }

    public static function label(string $type): string
    {
        return match ($type) {
            self::MOVEMENT_ONLINE_SALE => 'ONLINE_SALE',
            self::MOVEMENT_POS_SALE => 'POS_SALE',
            self::MOVEMENT_ORDER_CANCEL_RESTOCK => 'ORDER_CANCEL_RESTOCK',
            self::MOVEMENT_ORDER_RESTORE => 'ORDER_RESTORE',
            self::MOVEMENT_RETURN_RESTOCK => 'RETURN_RESTOCK',
            self::MOVEMENT_MANUAL_ADJUSTMENT => 'MANUAL_ADJUSTMENT',
            self::MOVEMENT_IMPORT_ADJUSTMENT => 'IMPORT_ADJUSTMENT',
            self::MOVEMENT_ERP_ADJUSTMENT => 'ERP_ADJUSTMENT',
            default => $type,
        };
    }
}
