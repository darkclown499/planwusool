<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductImportBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'user_id',
        'original_filename',
        'file_type',
        'status',
        'strategy',
        'mapping',
        'options',
        'total_rows',
        'valid_rows',
        'warning_rows',
        'error_rows',
        'created_count',
        'updated_count',
        'failed_count',
        'data',
        'results',
        'error_message',
        'completed_at',
    ];

    protected $casts = [
        'mapping' => 'array',
        'options' => 'array',
        'completed_at' => 'datetime',
    ];

    protected $appends = ['status_label'];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getDecodedDataAttribute(): array
    {
        if (empty($this->data)) {
            return [];
        }
        $decoded = json_decode((string) $this->data, true);

        return is_array($decoded) ? $decoded : [];
    }

    public function getDecodedResultsAttribute(): array
    {
        if (empty($this->results)) {
            return [];
        }
        $decoded = json_decode((string) $this->results, true);

        return is_array($decoded) ? $decoded : [];
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'processing' => __('Importing'),
            'completed' => __('Completed'),
            'completed_with_errors' => __('Completed with errors'),
            'failed' => __('Failed'),
            default => __('Previewed'),
        };
    }

    public function scopeForStore($query, int $storeId)
    {
        return $query->where('store_id', $storeId);
    }
}