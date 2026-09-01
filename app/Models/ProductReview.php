<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductReview extends Model
{
    use HasFactory;

    /** Hide reasons a merchant may select when taking a review down. */
    public const HIDE_REASONS = [
        'spam',
        'abusive',
        'personal_information',
        'unrelated',
    ];

    protected $fillable = [
        'product_id',
        'store_id',
        'customer_id',
        'order_id',
        'order_item_id',
        'rating',
        'title',
        'comment',
        'images',
        'is_approved',
        'is_rejected',
        'hide_reason',
        'is_verified_purchase',
        'admin_reply',
        'merchant_replied_at',
    ];

    protected $casts = [
        'rating' => 'integer',
        'images' => 'array',
        'is_approved' => 'boolean',
        'is_rejected' => 'boolean',
        'is_verified_purchase' => 'boolean',
        'merchant_replied_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::saved(function (ProductReview $review) {
            if ($review->store_id) {
                self::invalidateStorefrontCache((int) $review->store_id);
            }
        });

        static::deleted(function (ProductReview $review) {
            if ($review->store_id) {
                self::invalidateStorefrontCache((int) $review->store_id);
            }
        });
    }

    /**
     * Reviews that are live on the storefront: approved, not rejected, and not
     * hidden by the merchant. All aggregates must filter through this scope.
     */
    public function scopeVisible($query)
    {
        return $query
            ->where('is_approved', true)
            ->where('is_rejected', false)
            ->whereNull('hide_reason');
    }

    /**
     * Scope a query to only approved reviews (legacy helper).
     */
    public function scopeApproved($query)
    {
        return $query->where('is_approved', true);
    }

    /**
     * Computed moderation status without a dedicated column.
     */
    public function getStatusAttribute(): string
    {
        if ($this->is_rejected) {
            return 'rejected';
        }
        if ($this->hide_reason !== null) {
            return 'hidden';
        }
        if (!$this->is_approved) {
            return 'pending';
        }
        return 'approved';
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    /**
     * Get the average rating for a product (visible reviews only).
     */
    public static function averageRatingFor(int $productId): float
    {
        return (float) static::where('product_id', $productId)
            ->visible()
            ->avg('rating') ?? 0;
    }

    /**
     * Get the review count for a product (visible reviews only).
     */
    public static function countFor(int $productId): int
    {
        return static::where('product_id', $productId)
            ->visible()
            ->count();
    }

    /**
     * Single-query aggregates for many products at once (no N+1).
     *
     * @param  array<int>  $productIds
     * @return array<int, array{average_rating: float, review_count: int, rating_distribution: array<int, int>}>
     */
    public static function statsForProducts(int $storeId, array $productIds): array
    {
        if (empty($productIds)) {
            return [];
        }

        $rows = static::where('store_id', $storeId)
            ->whereIn('product_id', $productIds)
            ->visible()
            ->selectRaw('product_id, rating, COUNT(*) as cnt')
            ->groupBy('product_id', 'rating')
            ->get()
            ->groupBy('product_id');

        $result = [];
        foreach ($rows as $productId => $ratingRows) {
            $total = 0;
            $count = 0;
            $distribution = [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0];
            foreach ($ratingRows as $row) {
                $rating = (int) $row->rating;
                $cnt = (int) $row->cnt;
                $distribution[$rating] = $distribution[$rating] ?? 0;
                $distribution[$rating] += $cnt;
                $total += $rating * $cnt;
                $count += $cnt;
            }
            $result[(int) $productId] = [
                'average_rating' => $count > 0 ? round($total / $count, 1) : 0.0,
                'review_count' => $count,
                'rating_distribution' => $distribution,
            ];
        }

        return $result;
    }

    /**
     * Targeted invalidation of the ThemeController storefront catalog cache —
     * mirrors the Product model boot() pattern so review aggregates embedded in
     * the cached catalog reflect the latest moderation actions immediately.
     */
    private static function invalidateStorefrontCache(int $storeId): void
    {
        \Illuminate\Support\Facades\Cache::forget('store_catalog.' . $storeId);
        \Illuminate\Support\Facades\Cache::forget('store_categories.' . $storeId);
        foreach (Store::ALL_TEMPLATES as $theme) {
            foreach (['ar', 'en'] as $locale) {
                \Illuminate\Support\Facades\Cache::forget("store_catalog.{$storeId}.theme_{$theme}.locale_{$locale}.active_1");
                \Illuminate\Support\Facades\Cache::forget("store_categories.{$storeId}.theme_{$theme}.locale_{$locale}");
            }
        }
    }
}