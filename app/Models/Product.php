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
        'barcode',
        'description',
        'short_description',
        'specifications',
        'details',
        'price',
        'sale_price',
        'cost_price',
        'stock',
        'low_stock_warning',
        'track_inventory',
        'allow_backorder',
        'cover_image',
        'images',
        'variants',
        'variant_combinations',
        'custom_fields',
        'category_id',
        'tax_id',
        'store_id',
        'is_active',
        'is_downloadable',
        'is_tax_included',
        'downloadable_file',
        'meta_title',
        'meta_description',
        'seo_url_slug',
    ];
    
    protected $casts = [
        'is_active' => 'boolean',
        'is_downloadable' => 'boolean',
        'is_tax_included' => 'boolean',
        'track_inventory' => 'boolean',
        'allow_backorder' => 'boolean',
        'price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'stock' => 'integer',
        'variants' => 'array',
        'custom_fields' => 'array',
    ];

    protected $appends = ['thumbnail'];
    
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
     * Get the variant combinations as an array
     */
    public function getVariantCombinationsAttribute($value)
    {
        if (empty($value)) return [];
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }
    
    /**
     * Set the variant combinations as JSON
     */
    public function setVariantCombinationsAttribute($value)
    {
        $this->attributes['variant_combinations'] = is_array($value) ? json_encode($value) : $value;
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
     * Accessor: cover_image returns images[0] for backward compatibility
     * when cover_image column is empty (new flow uses only images).
     */
    public function getCoverImageAttribute($value)
    {
        if (!empty($value)) return $value;
        if (!empty($this->attributes['images'])) {
            $parts = explode(',', $this->attributes['images']);
            $first = trim($parts[0] ?? '');
            if ($first !== '') return $first;
        }
        return $value;
    }

    /**
     * Accessor: thumbnail alias for cover_image (images[0])
     */
    public function getThumbnailAttribute()
    {
        return $this->cover_image;
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
     * Canonical effective price: sale only when 0 < sale < price, else base price.
     */
    public function effectivePrice(): float
    {
        $price = (float) $this->price;
        $sale = $this->sale_price !== null && $this->sale_price !== '' ? (float) $this->sale_price : null;
        if ($sale !== null && $sale > 0 && $sale < $price) {
            return $sale;
        }
        return $price;
    }

    public function hasEffectiveSale(): bool
    {
        $price = (float) $this->price;
        $sale = $this->sale_price !== null && $this->sale_price !== '' ? (float) $this->sale_price : null;
        return $sale !== null && $sale > 0 && $sale < $price;
    }

    /**
     * Canonical availability respecting track_inventory + allow_backorder.
     */
    public function availabilityStatus(): string
    {
        if (!$this->track_inventory) return 'in_stock';
        if ($this->allow_backorder) return 'in_stock';
        return $this->stock > 0 ? 'in_stock' : 'out_of_stock';
    }

    /**
     * Scope for storefront visibility.
     */
    public function scopeVisible($query)
    {
        return $query->where('is_active', true);
    }

    private const VARIANT_SEP = '‖';

    /**
     * Resolve selected variant against canonical variant_combinations.
     * Accepts: map [Color=>Red] , id string "Red‖M" , array values, or null.
     * Returns matching combination array or null if not found / not required.
     */
    public function resolveVariantCombination($selection): ?array
    {
        $combinations = $this->variant_combinations;
        if (!is_array($combinations) || empty($combinations)) return null;
        if ($selection === null || $selection === '' || (is_array($selection) && empty($selection))) return null;

        // Direct id match (frontend sends id)
        if (is_string($selection)) {
            foreach ($combinations as $c) {
                if (($c['id'] ?? null) === $selection) return $c;
            }
            // also try label
            foreach ($combinations as $c) {
                if (($c['label'] ?? null) === $selection) return $c;
            }
        }

        // Map case: {Color:Red, Size:M} — values must match combination values set
        if (is_array($selection) && array_keys($selection) !== range(0, count($selection)-1)) {
            $values = array_values(array_map(fn($v)=>trim((string)$v), $selection));
            sort($values);
            foreach ($combinations as $c) {
                $cVals = $c['values'] ?? [];
                $sorted = $cVals; sort($sorted);
                if ($sorted === $values) return $c;
                // also match via id join
                if (($c['id'] ?? null) === implode(self::VARIANT_SEP, $cVals) && implode(self::VARIANT_SEP, $values) === $c['id']) return $c;
            }
            return null;
        }

        // Array values case: ['Red','M'] or ['M','Red']
        if (is_array($selection)) {
            $vals = array_map(fn($v)=>trim((string)$v), $selection);
            sort($vals);
            foreach ($combinations as $c) {
                $cVals = $c['values'] ?? [];
                $sorted = $cVals; sort($sorted);
                if ($sorted === $vals) return $c;
                if (($c['id'] ?? null) === implode(self::VARIANT_SEP, $selection)) return $c;
            }
            // Check json-encoded id
            $id = implode(self::VARIANT_SEP, $selection);
            foreach ($combinations as $c) if (($c['id'] ?? null) === $id) return $c;
        }

        return null;
    }

    /**
     * Canonical price for a given variant selection. Falls back to base effectivePrice.
     */
    public function effectivePriceForVariant($selection): float
    {
        $combo = $this->resolveVariantCombination($selection);
        if ($combo && isset($combo['price']) && $combo['price'] !== '' && $combo['price'] !== null) {
            $vPrice = (float) $combo['price'];
            if ($vPrice > 0 && $vPrice < 9999999) return $vPrice;
        }
        return $this->effectivePrice();
    }

    /**
     * Whether product has any variant combinations with explicit price.
     */
    public function hasVariantPrices(): bool
    {
        foreach (($this->variant_combinations ?? []) as $c) {
            if (isset($c['price']) && $c['price'] !== '' && (float)$c['price'] > 0) return true;
        }
        return false;
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

            // Targeted invalidation for ThemeController cache permutations
            $storeId = $product->store_id;
            $origStoreId = $product->getOriginal('store_id') ?? $storeId;
            foreach ([$storeId, $origStoreId] as $sid) {
                \Illuminate\Support\Facades\Cache::forget('store_catalog.' . $sid);
                \Illuminate\Support\Facades\Cache::forget('store_categories.' . $sid);
                foreach (\App\Models\Store::ALL_TEMPLATES as $theme) {
                    foreach (['ar','en'] as $locale) {
                        \Illuminate\Support\Facades\Cache::forget("store_catalog.{$sid}.theme_{$theme}.locale_{$locale}.active_1");
                        \Illuminate\Support\Facades\Cache::forget("store_categories.{$sid}.theme_{$theme}.locale_{$locale}");
                    }
                }
            }
        });
 
        static::created(function ($product) {
            $storeId = $product->store_id;
            \Illuminate\Support\Facades\Cache::forget('store_catalog.' . $storeId);
            \Illuminate\Support\Facades\Cache::forget('store_categories.' . $storeId);
            foreach (\App\Models\Store::ALL_TEMPLATES as $theme) {
                foreach (['ar','en'] as $locale) {
                    \Illuminate\Support\Facades\Cache::forget("store_catalog.{$storeId}.theme_{$theme}.locale_{$locale}.active_1");
                    \Illuminate\Support\Facades\Cache::forget("store_categories.{$storeId}.theme_{$theme}.locale_{$locale}");
                }
            }
        });
 
        static::deleted(function ($product) {
            $storeId = $product->store_id;
            \Illuminate\Support\Facades\Cache::forget('store_catalog.' . $storeId);
            \Illuminate\Support\Facades\Cache::forget('store_categories.' . $storeId);
            foreach (\App\Models\Store::ALL_TEMPLATES as $theme) {
                foreach (['ar','en'] as $locale) {
                    \Illuminate\Support\Facades\Cache::forget("store_catalog.{$storeId}.theme_{$theme}.locale_{$locale}.active_1");
                    \Illuminate\Support\Facades\Cache::forget("store_categories.{$storeId}.theme_{$theme}.locale_{$locale}");
                }
            }
        });
    }
}
