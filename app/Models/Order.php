<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    /**
     * Ownership/identity fields (store_id, customer_id, session_id,
     * order_number) are never mass-assignable — they are only set by the
     * server-side OrderService so a request can never re-point an order at
     * another tenant or fabricate an order number.
     *
     * @var list<string>
     */
    protected $guarded = [
        'id',
        'order_number',
        'store_id',
        'customer_id',
        'session_id',
    ];

    protected $fillable = [
        'status',
        'payment_status',
        'customer_email',
        'customer_phone',
        'customer_first_name',
        'customer_last_name',
        'shipping_address',
        'shipping_city',
        'shipping_state',
        'shipping_postal_code',
        'shipping_country',
        'billing_address',
        'billing_city',
        'billing_state',
        'billing_postal_code',
        'billing_country',
        'subtotal',
        'tax_amount',
        'shipping_amount',
        'discount_amount',
        'total_amount',
        'currency',
        'stock_restored',
        'payment_method',
        'order_source',
        'idempotency_key',
        'whatsapp_number',
        'payment_transaction_id',
        'payment_details',
        'bank_transfer_receipt',
        'shipping_method_id',
        'tracking_number',
        'shipped_at',
        'delivered_at',
        'notes',
        'coupon_code',
        'coupon_discount',
        'post_order_extras_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'shipping_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'coupon_discount' => 'decimal:2',
        'stock_restored' => 'boolean',
        'payment_details' => 'array',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'post_order_extras_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function shippingMethod(): BelongsTo
    {
        return $this->belongsTo(Shipping::class, 'shipping_method_id');
    }

    public function returns(): HasMany
    {
        return $this->hasMany(\App\Models\OrderReturn::class);
    }

    public static function generateOrderNumber(): string
    {
        do {
            $orderNumber = 'ORD-' . strtoupper(\Illuminate\Support\Str::random(12));
        } while (self::where('order_number', $orderNumber)->exists());

        return $orderNumber;
    }

    /**
     * Restore the product quantities deducted when this order was created, once
     * the order reaches a terminal state (failed / cancelled / refunded).
     * Guarded by the stock_restored flag so it only ever runs once.
     * Variant-aware: restores to the exact combination that was decremented.
     */
    protected static function boot()
    {
        parent::boot();

        static::updating(function (Order $order) {
            // Financial refund no longer auto-restores inventory — only failed/cancelled do.
            $terminal = in_array(strtolower((string) $order->status), ['failed', 'cancelled'], true)
                || strtolower((string) $order->payment_status) === 'failed';

            if (!$terminal || (bool) $order->stock_restored || !$order->exists) {
                // still check loyalty even if stock already restored — loyalty uses its own idempotency
            } else {
                // Transaction + row locking for idempotent restore (prevents double restore race)
                try {
                    \Illuminate\Support\Facades\DB::transaction(function () use ($order) {
                        // Lock the order row with CAS on stock_restored to prevent concurrent double restore
                        $locked = \Illuminate\Support\Facades\DB::table('orders')
                            ->where('id', $order->id)
                            ->where('stock_restored', false)
                            ->lockForUpdate()
                            ->first();
                        if (!$locked) {
                            // Already restored by concurrent transaction
                            return;
                        }
                        foreach ($order->items()->get() as $item) {
                            if (!$item->product_id) continue;
                            \App\Services\InventoryService::restoreForOrderItem($item, (int) $order->store_id);
                        }
                    });
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Stock restore transaction failed', ['order_id'=>$order->id,'error'=>$e->getMessage()]);
                    // Fallback: attempt per-item without transaction (best-effort)
                    foreach ($order->items()->get() as $item) {
                        if (!$item->product_id) continue;
                        try { \App\Services\InventoryService::restoreForOrderItem($item, (int) $order->store_id); } catch (\Throwable $ignored) {}
                    }
                }

                $order->forceFill(['stock_restored' => true]);
            }

            // Loyalty reversal: idempotent per store/order, handles earn + redeem — canonical lifecycle
            $wasTerminalStatus = in_array(strtolower((string) $order->getOriginal('status')), ['cancelled', 'refunded'], true);
            $isNowTerminalStatus = in_array(strtolower((string) $order->status), ['cancelled', 'refunded', 'failed'], true);
            $wasTerminalPayment = in_array(strtolower((string) $order->getOriginal('payment_status')), ['refunded', 'partially_refunded', 'failed'], true);
            $isNowTerminalPayment = in_array(strtolower((string) $order->payment_status), ['refunded', 'failed'], true);
            $isPartialRefund = strtolower((string) $order->payment_status) === 'partially_refunded' && !$wasTerminalPayment;
            if ((!$wasTerminalStatus && $isNowTerminalStatus) || (!$wasTerminalPayment && $isNowTerminalPayment) || $isPartialRefund) {
                try {
                    // For partial refund via payment_status change without ReturnService, treat as proportional
                    $refundAmount = null;
                    if ($isPartialRefund && isset($order->refunded_amount)) {
                        $refundAmount = (float) $order->refunded_amount;
                    }
                    app(\App\Services\LoyaltyService::class)->reversePointsForOrder($order, $refundAmount);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Loyalty reversal failed', ['order_id' => $order->id, 'error' => $e->getMessage()]);
                }
            }
        });
    }
}