<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Category extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'name',
        'slug',
        'description',
        'image',
        'parent_id',
        'store_id',
        'sort_order',
        'is_active',
    ];
    
    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Get the products for the category.
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
    
    /**
     * Get the store that owns the category.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
    
    /**
     * Get the parent category.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }
    
    /**
     * Get the subcategories for the category.
     */
    public function subcategories(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id');
    }
    
    /**
     * Generate a unique slug for the category within the store.
     */
    public static function generateUniqueSlug($name, $storeId, ?int $excludeId = null)
    {
        $base = Str::slug(trim((string)$name));
        if ($base === '') $base = 'category';
        $slug = $base;
        $counter = 0;
        while (true) {
            $exists = static::where('store_id', $storeId)
                ->where('slug', $slug)
                ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
                ->exists();
            if (!$exists) return $slug;
            $counter++;
            $slug = $base . '-' . $counter;
        }
    }

    /**
     * Scope for active categories.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for root categories (whereNull parent_id).
     */
    public function scopeRoots($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Central sorting: sort_order ASC, then name ASC, then id ASC (deterministic).
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name')->orderBy('id');
    }

    /**
     * Invalidate the cached storefront catalog/categories for this store.
     * Covers all theme/locale permutations used by ThemeController.
     */
    protected static function boot()
    {
        parent::boot();

        $invalidate = function ($category) {
            $storeId = $category->store_id;
            $origStoreId = $category->getOriginal('store_id') ?? $storeId;
            foreach ([$storeId, $origStoreId] as $sid) {
                \Illuminate\Support\Facades\Cache::forget('store_categories.' . $sid);
                \Illuminate\Support\Facades\Cache::forget('store_catalog.' . $sid);
                // Theme/locale-specific keys
                foreach (\App\Models\Store::ALL_TEMPLATES as $theme) {
                    foreach (['ar','en'] as $locale) {
                        \Illuminate\Support\Facades\Cache::forget("store_categories.{$sid}.theme_{$theme}.locale_{$locale}");
                        \Illuminate\Support\Facades\Cache::forget("store_catalog.{$sid}.theme_{$theme}.locale_{$locale}.active_1");
                    }
                }
                \Illuminate\Support\Facades\Cache::forget('store_configuration.' . $sid);
            }
            // Back-compat flush for any legacy key
            \Illuminate\Support\Facades\Cache::flush();
        };

        static::saved($invalidate);
        static::deleted($invalidate);
    }
}