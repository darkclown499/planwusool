<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AbandonedCart extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'session_id',
        'customer_id',
        'customer_email',
        'customer_phone',
        'customer_name',
        'cart_items',
        'cart_total',
        'status',
        'last_activity_at',
        'reminder_sent_at',
        'recovered_at',
        'recovered_order_id',
        'reminder_count',
        'recovery_token',
        'abandoned_at',
        'expires_at',
        'whatsapp_status',
        'whatsapp_message_id',
        'whatsapp_sent_at',
    ];

    protected $casts = [
        'cart_items' => 'array',
        'cart_total' => 'decimal:2',
        'last_activity_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
        'recovered_at' => 'datetime',
        'abandoned_at' => 'datetime',
        'expires_at' => 'datetime',
        'whatsapp_sent_at' => 'datetime',
        'reminder_count' => 'integer',
    ];

    public const STATUSES = [
        'new' => 'new',
        'draft' => 'draft',
        'abandoned' => 'abandoned',
        'reminder_sent' => 'reminder_sent',
        'recovered' => 'recovered',
        'expired' => 'expired',
        'unsubscribed' => 'unsubscribed',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function recoveredOrder(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'recovered_order_id');
    }

    public function ensureRecoveryToken(): string
    {
        if ($this->recovery_token) {
            return $this->recovery_token;
        }
        $token = bin2hex(random_bytes(32));
        $this->update([
            'recovery_token' => $token,
            'expires_at' => now()->addDays(7),
        ]);
        return $token;
    }

    public function getRecoverUrl(): string
    {
        $token = $this->recovery_token ?: $this->ensureRecoveryToken();
        $store = $this->store;
        $base = $store ? (method_exists($store, 'getStoreUrl') ? '' : '') : '';
        return url('/checkout?recover_token=' . $token);
    }

    public function scopePendingReminder($query, int $storeId, int $hours = 24)
    {
        return $query->where('store_id', $storeId)
            ->whereIn('status', [self::STATUSES['new'], self::STATUSES['reminder_sent'], self::STATUSES['abandoned'], self::STATUSES['draft']])
            ->where(function ($q) {
                $q->whereNotNull('customer_email')->orWhereNotNull('customer_phone');
            })
            ->where('last_activity_at', '<=', now()->subHours($hours))
            ->where(function ($q) use ($hours) {
                $q->whereNull('reminder_sent_at')
                    ->orWhere('reminder_sent_at', '<=', now()->subHours($hours));
            });
    }

    public function scopeAbandonedCandidates($query, int $minutes = 30)
    {
        return $query->whereIn('status', [self::STATUSES['new'], self::STATUSES['draft']])
            ->where('last_activity_at', '<=', now()->subMinutes($minutes))
            ->where(function ($q) {
                $q->whereNotNull('customer_email')
                    ->orWhereNotNull('customer_phone');
            });
    }
}
