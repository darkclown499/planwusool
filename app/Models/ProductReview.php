<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductReview extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'store_id',
        'customer_id',
        'order_id',
        'rating',
        'title',
        'comment',
        'images',
        'is_approved',
        'is_rejected',
        'is_verified_purchase',
        'admin_reply',
    ];

    protected $casts = [
        'rating' => 'integer',
        'images' => 'array',
        'is_approved' => 'boolean',
        'is_rejected' => 'boolean',
        'is_verified_purchase' => 'boolean',
    ];

    /**
     * Get the product that owns the review.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Get the store that owns the review.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the customer that wrote the review.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the order associated with this review.
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Scope a query to only approved reviews.
     */
    public function scopeApproved($query)
    {
        return $query->where('is_approved', true);
    }

    /**
     * Get the average rating for a product (approved reviews only).
     */
    public static function averageRatingFor(int $productId): float
    {
        return (float) static::where('product_id', $productId)
            ->approved()
            ->avg('rating') ?? 0;
    }

    /**
     * Get the review count for a product (approved reviews only).
     */
    public static function countFor(int $productId): int
    {
        return static::where('product_id', $productId)
            ->approved()
            ->count();
    }
}

