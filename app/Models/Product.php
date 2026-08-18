<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'name',
        'sku',
        'description',
        'specifications',
        'details',
        'price',
        'sale_price',
        'stock',
        'low_stock_warning',
        'track_inventory',
        'allow_backorder',
        'cover_image',
        'images',
        'variants',
        'custom_fields',
        'category_id',
        'tax_id',
        'store_id',
        'is_active',
        'is_downloadable',
        'downloadable_file',
    ];
    
    protected $casts = [
        'is_active' => 'boolean',
        'is_downloadable' => 'boolean',
        'track_inventory' => 'boolean',
        'allow_backorder' => 'boolean',
        'price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'stock' => 'integer',
        'variants' => 'array',
        'custom_fields' => 'array',
    ];
    
    /**
     * Get the variants as an array
     */
    public function getVariantsAttribute($value)
    {
        if (empty($value)) return [];
        return json_decode($value, true);
    }
    
    /**
     * Set the variants as JSON
     */
    public function setVariantsAttribute($value)
    {
        $this->attributes['variants'] = is_array($value) ? json_encode($value) : $value;
    }
    
    /**
     * Get the custom fields as an array
     */
    public function getCustomFieldsAttribute($value)
    {
        if (empty($value)) return [];
        return json_decode($value, true);
    }
    
    /**
     * Set the custom fields as JSON
     */
    public function setCustomFieldsAttribute($value)
    {
        $this->attributes['custom_fields'] = is_array($value) ? json_encode($value) : $value;
    }
    
    /**
     * Get the images as an array
     */
    public function getImagesArrayAttribute()
    {
        if (empty($this->images)) return [];
        return explode(',', $this->images);
    }
    
    /**
     * Get the category that owns the product.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
    
    /**
     * Get the store that owns the product.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
    
    /**
     * Get the tax that applies to the product.
     */
    public function tax(): BelongsTo
    {
        return $this->belongsTo(Tax::class);
    }
    
    /**
     * Get the reviews for the product.
     */
    public function reviews()
    {
        return $this->hasMany(ProductReview::class);
    }
    
    /**
     * Boot method to handle model events
     */
    protected static function boot()
    {
        parent::boot();
        
        static::updating(function ($product) {
            // Check if is_active is being changed from false to true
            if ($product->isDirty('is_active') && $product->is_active && !$product->getOriginal('is_active')) {
                $store = $product->store;
                if ($store && $store->user) {
                    $canActivate = \App\Http\Middleware\CheckPlanAccess::canActivateResource(
                        $store->user, 'product', $product->store_id, $product->id
                    );
                    if (!$canActivate) {
                        // Set is_active back to false instead of throwing exception
                        $product->is_active = false;
                        \Log::warning('Product activation blocked due to plan limit', ['product_id' => $product->id]);
                    }
                }
            }
        });
        
        static::updated(function ($product) {
            try {
                // Enforce plan limitations after product is activated
                if ($product->is_active && $product->wasChanged('is_active')) {
                    $store = $product->store;
                    if ($store && $store->user) {
                        enforcePlanLimitations($store->user);
                    }
                }
            } catch (\Exception $e) {
                \Log::error('Product updated event failed: ' . $e->getMessage(), ['product_id' => $product->id]);
            }

// Invalidate all storefront catalog cache variations (theme/locale)
            $storeId = $product->store_id;
            \Illuminate\Support\Facades\Cache::forget('store_catalog.' . $storeId);
            \Illuminate\Support\Facades\Cache::forget('store_categories.' . $storeId);
            // Invalidate pattern-based keys for all theme/locale combinations
            \Illuminate\Support\Facades\Cache::flush(); // Note: Consider using cache tags in production for granular invalidation
        });
 
        static::created(function ($product) {
            $storeId = $product->store_id;
            \Illuminate\Support\Facades\Cache::forget('store_catalog.' . $storeId);
            \Illuminate\Support\Facades\Cache::forget('store_categories.' . $storeId);
            \Illuminate\Support\Facades\Cache::flush();
        });
 
        static::deleted(function ($product) {
            $storeId = $product->store_id;
            \Illuminate\Support\Facades\Cache::forget('store_catalog.' . $storeId);
            \Illuminate\Support\Facades\Cache::forget('store_categories.' . $storeId);
            \Illuminate\Support\Facades\Cache::flush();
        });
    }
}
