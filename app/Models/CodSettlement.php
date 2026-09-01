<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CodSettlement extends Model
{
    use HasFactory;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_SETTLED = 'settled';

    protected $fillable = [
        'store_id',
        'reference',
        'period_start',
        'period_end',
        'courier_company',
        'gross_amount',
        'courier_fees',
        'adjustment',
        'net_amount',
        'status',
        'confirmed_by',
        'settled_at',
        'notes',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'gross_amount' => 'decimal:2',
        'courier_fees' => 'decimal:2',
        'adjustment' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'settled_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function confirmor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CodSettlementItem::class, 'settlement_id');
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isSettled(): bool
    {
        return $this->status === self::STATUS_SETTLED;
    }

    public static function generateReference(): string
    {
        do {
            $reference = 'SET-' . strtoupper(\Illuminate\Support\Str::random(10));
        } while (self::where('reference', $reference)->exists());

        return $reference;
    }
}