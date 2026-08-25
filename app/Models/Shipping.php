<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shipping extends Model
{
    protected $fillable = [
        'store_id',
        'courier_integration_id',
        'name',
        'type',
        'description',
        'cost',
        'min_order_amount',
        'delivery_time',
        'sort_order',
        'is_active',
        'zone_type',
        'countries',
        'country_id',
        'city_id',
        'all_regions',
        'postal_codes',
        'max_distance',
        'max_weight',
        'max_dimensions',
        'delivery_method',
        'fulfillment_type',
        'delivery_company',
        'courier_service_type',
        'courier_price_mode',
        'courier_fixed_price',
        'currency',
        'require_signature',
        'insurance_required',
        'tracking_available',
        'handling_fee',
        'views'
    ];

    protected $casts = [
        'cost' => 'float',
        'min_order_amount' => 'float',
        'max_distance' => 'float',
        'max_weight' => 'float',
        'handling_fee' => 'float',
        'courier_fixed_price' => 'float',
        'is_active' => 'boolean',
        'all_regions' => 'boolean',
        'require_signature' => 'boolean',
        'insurance_required' => 'boolean',
        'tracking_available' => 'boolean',
    ];

    public function courierIntegration()
    {
        return $this->belongsTo(StoreCourierIntegration::class, 'courier_integration_id');
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function incrementViews()
    {
        $this->increment('views');
    }
}