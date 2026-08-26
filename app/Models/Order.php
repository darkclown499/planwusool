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
     */
    protected static function boot()
    {
        parent::boot();

        static::updating(function (Order $order) {
            $terminal = in_array(strtolower((string) $order->status), ['failed', 'cancelled', 'refunded'], true)
                || strtolower((string) $order->payment_status) === 'failed';

            if (!$terminal || (bool) $order->stock_restored || !$order->exists) {
                // still check loyalty even if stock already restored — loyalty uses its own idempotency
            } else {
                foreach ($order->items()->get() as $item) {
                    if (!$item->product_id) {
                        continue;
                    }
                    $product = \App\Models\Product::find($item->product_id);
                    if (!$product) {
                        continue;
                    }
                    // Respect track_inventory — do not mutate stock for non-tracked products
                    if (!$product->track_inventory) {
                        continue;
                    }
                    // Store isolation guard: product must belong to order's store
                    if ((int)$product->store_id !== (int)$order->store_id) {
                        \Illuminate\Support\Facades\Log::warning('Stock restore skipped: product store mismatch', ['order_id'=>$order->id,'product_id'=>$product->id]);
                        continue;
                    }
                    \Illuminate\Support\Facades\DB::table('products')
                        ->where('id', $product->id)
                        ->increment('stock', (int) $item->quantity);
                }

                $order->forceFill(['stock_restored' => true]);
            }

            // Loyalty reversal: idempotent per store/order, handles earn + redeem
            $wasTerminal = in_array(strtolower((string) $order->getOriginal('status')), ['cancelled', 'refunded'], true);
            $isNowTerminal = in_array(strtolower((string) $order->status), ['cancelled', 'refunded'], true);
            if (!$wasTerminal && $isNowTerminal) {
                try {
                    app(\App\Services\LoyaltyService::class)->reversePointsForOrder($order);
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Loyalty reversal failed', ['order_id' => $order->id, 'error' => $e->getMessage()]);
                }
            }
        });
    }
}