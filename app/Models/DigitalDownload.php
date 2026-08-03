<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalDownload extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'store_id',
        'order_id',
        'customer_id',
        'file_path',
        'file_name',
        'file_size',
        'download_token',
        'download_count',
        'max_downloads',
        'expires_at',
        'last_download_at',
    ];

    protected $casts = [
        'download_count' => 'integer',
        'max_downloads' => 'integer',
        'expires_at' => 'datetime',
        'last_download_at' => 'datetime',
    ];

    /**
     * Get the product that owns the download.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the store that owns the download.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the order that owns the download.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get the customer that owns the download.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Generate a new unique download token.
     */
    public static function generateToken(): string
    {
        return strtoupper(bin2hex(random_bytes(24)));
    }

    /**
     * Check if this download link is still usable.
     */
    public function isUsable(): bool
    {
        if ($this->download_count >= $this->max_downloads) {
            return false;
        }

        if ($this->expires_at && $this->expires_at->isPast()) {
            return false;
        }

        return true;
    }
}

