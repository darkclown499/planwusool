<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreConfigurationRevision extends Model
{
    protected $fillable = [
        'store_id',
        'user_id',
        'key',
        'previous_value',
        'new_value',
        'reason',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Record a revision for a store configuration key when its value changes.
     */
    public static function record($storeId, $key, $previousValue, $newValue, $userId = null, $reason = 'manual')
    {
        $normalizedPrevious = is_bool($previousValue) ? ($previousValue ? 'true' : 'false') : (string) $previousValue;
        $normalizedNew = is_bool($newValue) ? ($newValue ? 'true' : 'false') : (string) $newValue;

        if ($normalizedPrevious === $normalizedNew) {
            return null;
        }

        return self::create([
            'store_id' => $storeId,
            'user_id' => $userId,
            'key' => $key,
            'previous_value' => $normalizedPrevious,
            'new_value' => $normalizedNew,
            'reason' => $reason,
        ]);
    }
}
