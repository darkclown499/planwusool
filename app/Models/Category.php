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
     * Scope for subcategories (where parent_id not null).
     */
    public function scopeChildren($query)
    {
        return $query->whereNotNull('parent_id');
    }

    /**
     * Central sorting: sort_order ASC, then name ASC, then id ASC (deterministic).
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name')->orderBy('id');
    }

    /**
     * Is this a main (root) category?
     */
    public function isRoot(): bool
    {
        return $this->parent_id === null;
    }

    /**
     * Is this a subcategory?
     */
    public function isSubcategory(): bool
    {
        return $this->parent_id !== null;
    }

    /**
     * All product category IDs that logically belong under this category.
     *
     * - If the category is a MAIN category (parent_id null): includes itself
     *   plus all its ACTIVE subcategories' IDs. This ensures a main category's
     *   listing and "الأكثر مبيعاً" aggregates products from its subcategories
     *   while keeping subcategory pages strictly scoped to themselves.
     * - If the category is a SUBCATEGORY: includes only itself.
     *
     * Store-scoped and tenant-isolated: never includes categories from another store.
     *
     * @return int[]
     */
    public function descendantCategoryIdsForProducts(): array
    {
        if ($this->parent_id !== null) {
            return [(int) $this->id];
        }
        $childIds = static::where('store_id', $this->store_id)
            ->where('parent_id', $this->id)
            ->where('is_active', true)
            ->pluck('id')->map(fn($v)=>(int)$v)->all();
        return array_merge([(int) $this->id], $childIds);
    }

    /**
     * Canonical bestseller retrieval scoped to a category + store.
     *
     * Uses REAL order data: sums order_items.quantity per product, filtered to
     * orders that should count for revenue (payment_status='paid' and not
     * cancelled/failed/refunded), strictly store-scoped via both orders.store_id
     * and products.store_id. For MAIN categories includes subcategory products;
     * for SUBCATEGORIES includes only direct products (see descendantCategoryIdsForProducts).
     *
     * Falls back to the existing category product ordering (created_at desc,
     * mirroring ThemeController's catalogue) when insufficient sales data exists,
     * WITHOUT fabricating sales numbers.
     *
     * @return \Illuminate\Database\Eloquent\Collection<Product>
     */
    public static function bestsellersForCategory(int $storeId, int $categoryId, int $limit = 8): \Illuminate\Support\Collection
    {
        $category = static::where('id', $categoryId)->where('store_id', $storeId)->first();
        if (!$category) return collect([]);

        $categoryIds = $category->descendantCategoryIdsForProducts();

        // Aggregate real sales per product from paid, non-terminal orders (canonical logic mirrors AnalyticsController::getTopProducts).
        $sales = \App\Models\OrderItem::select('product_id')
            ->selectRaw('SUM(quantity) as total_quantity')
            ->selectRaw('SUM(total_price) as total_revenue')
            ->whereIn('product_id', function ($q) use ($storeId, $categoryIds) {
                // Restrict to products actually belonging to this store+categoryIds to avoid cross-store ID collision on product_id.
                $q->select('id')->from('products')->where('store_id', $storeId)->whereIn('category_id', $categoryIds);
            })
            ->whereHas('order', function ($q) use ($storeId) {
                $q->where('store_id', $storeId)
                  ->where('payment_status', 'paid')
                  // Exclude terminal non-revenue states (keep parity with Order::boot inventory-restore guard)
                  ->whereNotIn('status', ['cancelled','failed','refunded'])
                  ->whereNotIn('payment_status', ['failed','refunded','partially_refunded']);
            })
            ->groupBy('product_id')
            ->orderByDesc('total_quantity')
            ->orderByDesc('total_revenue')
            ->limit($limit)
            ->get();

        if ($sales->isNotEmpty()) {
            $orderedIds = $sales->pluck('product_id')->map(fn($v)=>(int)$v)->all();
            // Fetch products store-scoped, active only, preserving bestseller rank order.
            $products = \App\Models\Product::where('store_id', $storeId)
                ->where('is_active', true)
                ->whereIn('id', $orderedIds)
                ->with('category')
                ->get()->keyBy('id');
            // Preserve exact sales ordering, drop any product that vanished (deleted/inactive).
            $result = collect($orderedIds)->map(fn($id)=>$products->get($id))->filter()->values();
            if ($result->isNotEmpty()) return $result->map(fn($p)=>$p);
        }

        // Fallback: no sales data -> canonical product ordering (newest first), store+category scoped.
        return \App\Models\Product::where('store_id', $storeId)
            ->where('is_active', true)
            ->whereIn('category_id', $categoryIds)
            ->with('category')
            ->orderBy('created_at','desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Build hierarchical storefront category payload in a canonical, store-scoped way.
     * Used by ThemeController (home, category page, products, search) to avoid duplication.
     *
     * Returns root categories with nested subcategories array + denormalized product counts.
     * For product_count on a root: includes its own direct products + active subcategory products
     * when counting? Currently we keep product_count as DIRECT products only for simplicity,
     * but expose subcategories each with their own product_count. Template can sum if needed.
     *
     * @return \Illuminate\Support\Collection
     */
    public static function hierarchicalForStorefront(int $storeId)
    {
        $roots = static::where('store_id', $storeId)
            ->where('is_active', true)
            ->whereNull('parent_id')
            ->withCount(['products' => fn($q)=>$q->where('is_active', true)])
            ->ordered()
            ->get();

        $childMap = static::where('store_id', $storeId)
            ->where('is_active', true)
            ->whereNotNull('parent_id')
            ->withCount(['products' => fn($q)=>$q->where('is_active', true)])
            ->ordered()
            ->get()
            ->groupBy('parent_id');

        return $roots->map(function ($cat) use ($childMap) {
            $children = $childMap->get($cat->id, collect())->map(function ($sub) {
                return [
                    'id' => (string) $sub->id,
                    'name' => $sub->name,
                    'slug' => $sub->slug,
                    'image' => $sub->image ?: null,
                    'description' => $sub->description,
                    'product_count' => $sub->products_count,
                    'parent_id' => (string) $sub->parent_id,
                ];
            })->values();
            return [
                'id' => (string) $cat->id,
                'name' => $cat->name,
                'slug' => $cat->slug,
                'image' => $cat->image ?: null,
                'description' => $cat->description,
                'product_count' => $cat->products_count,
                'subcategories' => $children,
            ];
        })->values();
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