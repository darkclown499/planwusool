<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderReturnItem extends Model
{
    protected $fillable = [
        'return_id', 'order_item_id', 'product_id', 'quantity', 'restocked_quantity', 'refund_amount', 'reason', 'condition',
    ];

    protected $casts = [
        'refund_amount' => 'decimal:2',
    ];

    public function ret(): BelongsTo { return $this->belongsTo(OrderReturn::class, 'return_id'); }
    public function orderItem(): BelongsTo { return $this->belongsTo(OrderItem::class, 'order_item_id'); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class, 'product_id'); }
}
