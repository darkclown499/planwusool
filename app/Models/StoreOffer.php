<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreOffer extends Model
{
    protected $fillable = [
        'store_id',
        'title',
        'subtitle',
        'image',
        'product_id',
        'link',
        'discount_percent',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'discount_percent' => 'float',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}