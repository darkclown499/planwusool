<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrderReturn extends Model
{
    protected $fillable = [
        'return_number', 'store_id', 'order_id', 'customer_id', 'customer_email',
        'status', 'reason', 'customer_note', 'merchant_note',
        'refund_status', 'refund_amount', 'refund_method', 'refund_reference',
        'requested_at', 'approved_at', 'received_at', 'completed_at', 'cancelled_at',
    ];

    protected $casts = [
        'refund_amount' => 'decimal:2',
        'requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'received_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    const STATUSES = ['requested','approved','rejected','in_transit','received','completed','cancelled'];
    const REFUND_STATUSES = ['none','pending','partial','refunded'];

    const REASONS = [
        'not_suitable' => 'المنتج غير مناسب',
        'wrong_size' => 'المقاس غير مناسب',
        'damaged' => 'وصل المنتج تالفاً',
        'different_description' => 'المنتج مختلف عن الوصف',
        'wrong_product' => 'وصل منتج خاطئ',
        'other' => 'سبب آخر',
    ];

    public function store(): BelongsTo { return $this->belongsTo(Store::class); }
    public function order(): BelongsTo { return $this->belongsTo(Order::class); }
    public function customer(): BelongsTo { return $this->belongsTo(Customer::class); }
    public function items(): HasMany { return $this->hasMany(OrderReturnItem::class, 'return_id'); }

    public static function generateReturnNumber(): string
    {
        do {
            $num = 'RET-' . date('Y') . '-' . str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        } while (self::where('return_number', $num)->exists());
        return $num;
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, ['completed','rejected','cancelled'], true);
    }
}
