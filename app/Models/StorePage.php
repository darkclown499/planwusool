<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StorePage extends Model
{
    protected $fillable = [
        'store_id',
        'slug',
        'title',
        'content',
        'meta_title',
        'meta_description',
        'image',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }
}