<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Partner extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_SUSPENDED = 'suspended';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
        self::STATUS_SUSPENDED,
    ];

    /**
     * Only profile/contact fields are fillable from public forms. The
     * referral code, status, timestamps and user linkage are guarded.
     *
     * @var list<string>
     */
    protected $fillable = [
        'company_name',
        'contact_person',
        'email',
        'phone',
        'website',
        'social',
        'business_type',
    ];

    protected $guarded = [
        'id',
        'user_id',
        'referral_code',
        'status',
        'notes',
        'approved_at',
        'rejected_at',
        'suspended_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'suspended_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Stores attributed to this partner (the merchant stores created through
     * this partner's referral).
     */
    public function stores(): HasMany
    {
        return $this->hasMany(Store::class);
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isSuspended(): bool
    {
        return $this->status === self::STATUS_SUSPENDED;
    }

    /**
     * Generate a unique opaque referral code. Random enough not to be
     * guessable/sequential; not derived from any internal id.
     */
    public static function generateReferralCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (static::where('referral_code', $code)->exists());

        return $code;
    }
}
