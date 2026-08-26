<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoyaltySetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'is_enabled',
        'points_per_currency',
        'points_value',
        'minimum_redemption_points',
        'maximum_discount_percentage',
        'signup_bonus_points',
        'review_bonus_points',
        'points_expire',
        'expiry_days',
        'expiry_reminder_days',
        'earning_rules',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'points_per_currency' => 'decimal:2',
        'points_value' => 'decimal:4',
        'minimum_redemption_points' => 'decimal:2',
        'maximum_discount_percentage' => 'decimal:2',
        'signup_bonus_points' => 'decimal:2',
        'review_bonus_points' => 'decimal:2',
        'points_expire' => 'boolean',
        'expiry_days' => 'integer',
        'expiry_reminder_days' => 'integer',
        'earning_rules' => 'array',
    ];

    /**
     * Get the store that owns the loyalty settings.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    /**
     * Get the loyalty settings for a store, or create defaults if none exist.
     */
    public static function forStore(int $storeId): self
    {
        return static::firstOrCreate(
            ['store_id' => $storeId],
            [
                'is_enabled' => false,
                'points_per_currency' => 1,
                'points_value' => 0.01,
                'minimum_redemption_points' => 100,
                'maximum_discount_percentage' => 50,
                'signup_bonus_points' => 0,
                'review_bonus_points' => 0,
                'points_expire' => false,
                'expiry_days' => 90,
                'expiry_reminder_days' => 7,
                'earning_rules' => null,
            ]
        );
    }

    /**
     * Calculate how many points a purchase of the given amount should earn.
     */
    public function calculateEarnPoints(float $amount): float
    {
        if (!$this->is_enabled || $amount <= 0) {
            return 0;
        }

        return round($amount * (float) $this->points_per_currency, 2);
    }

    /**
     * Calculate the monetary value of a given number of points.
     */
    public function calculateRedemptionValue(float $points): float
    {
        return round($points * (float) $this->points_value, 2);
    }

    /**
     * Convert a monetary discount into the points required to pay for it.
     */
    public function pointsRequiredForAmount(float $amount): float
    {
        $value = (float) $this->points_value;
        if ($value <= 0) {
            return 0;
        }

        return ceil($amount / $value);
    }
}

