<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class AdvancedCoupon extends Model
{
    protected $table = 'advanced_coupons';

    /**
     * أنواع الخصم المدعومة.
     */
    public const TYPE_FIXED = 'fixed';
    public const TYPE_PERCENTAGE = 'percentage';
    public const TYPE_FREE_SHIPPING = 'free_shipping';
    public const TYPE_BUY_ONE_GET_ONE = 'buy_one_get_one';

    protected $fillable = [
        'store_id',
        'name',
        'description',
        'code',
        'code_type',          // manual | auto
        'discount_type',      // fixed | percentage | free_shipping | buy_one_get_one
        'discount_value',     // مبلغ ثابت أو نسبة مئوية
        'max_discount_amount',// الحد الأقصى لقيمة الخصم (حماية هامش الربح)
        'bogo_product_id',    // منتج محدد في عرض BOGO
        'bogo_quantity',      // الكمية المطلوب شراؤها
        'bogo_free_quantity', // الكمية المجانية
        'minimum_order_amount',
        'usage_limit',
        'per_customer_limit',
        'used_count',
        'exclude_on_sale_items', // استثناء المنتجات المخفضة
        'first_order_only',      // طلبات أولى فقط
        'starts_at',
        'expires_at',
        'status',
        'created_by',
    ];

    protected $casts = [
        'discount_value'        => 'decimal:2',
        'max_discount_amount'   => 'decimal:2',
        'minimum_order_amount'  => 'decimal:2',
        'bogo_quantity'         => 'integer',
        'bogo_free_quantity'    => 'integer',
        'usage_limit'           => 'integer',
        'per_customer_limit'    => 'integer',
        'used_count'            => 'integer',
        'exclude_on_sale_items' => 'boolean',
        'first_order_only'      => 'boolean',
        'status'                => 'boolean',
        'starts_at'             => 'datetime',
        'expires_at'            => 'datetime',
    ];

    // =========================================================================
    // العلاقات (Relations)
    // =========================================================================

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * المنتجات المحددة (غير المستثناة) المرتبطة بالكوبون.
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'coupon_product', 'coupon_id', 'product_id')
            ->wherePivot('excluded', false)
            ->withPivot('excluded')
            ->withTimestamps();
    }

    /**
     * المنتجات المستثناة من تطبيق الكوبون.
     */
    public function excludedProducts(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'coupon_product', 'coupon_id', 'product_id')
            ->wherePivot('excluded', true)
            ->withPivot('excluded')
            ->withTimestamps();
    }

    /**
     * جميع المنتجات المرتبطة (مشمولة ومستثناة).
     */
    public function allProducts(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'coupon_product', 'coupon_id', 'product_id')
            ->withPivot('excluded')
            ->withTimestamps();
    }

    /**
     * التصنيفات المستهدفة.
     */
    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class, 'coupon_category', 'coupon_id', 'category_id')
            ->withTimestamps();
    }

    /**
     * قيود المناطق الجغرافية.
     */
    public function regions(): HasMany
    {
        return $this->hasMany(CouponRegion::class, 'coupon_id');
    }

    /**
     * سجل الاستخدامات.
     */
    public function usages(): HasMany
    {
        return $this->hasMany(CouponUsage::class, 'coupon_id');
    }

    /**
     * منتج BOGO المحدد.
     */
    public function bogoProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'bogo_product_id');
    }

    // =========================================================================
    // دوال المساعدة للتحقق من الصلاحية
    // =========================================================================

    /**
     * هل الكوبون مفعّل في الوقت الحالي؟
     */
    public function isActiveNow(?Carbon $now = null): bool
    {
        $now = $now ?: now();

        if (!$this->status) {
            return false;
        }

        if ($this->starts_at && $now->lt($this->starts_at)) {
            return false;
        }

        if ($this->expires_at && $now->gt($this->expires_at)) {
            return false;
        }

        return true;
    }

    /**
     * هل تم تجاوز سقف الاستخدام الإجمالي؟
     */
    public function isUsageLimitExceeded(): bool
    {
        return $this->usage_limit !== null && $this->used_count >= $this->usage_limit;
    }

    /**
     * هل تجاوز هذا العميل حد الاستخدام الشخصي؟
     *
     * @param string|null $identifier  رقم الهاتف أو البريد الإلكتروني للعميل.
     * @param int|null    $customerId  معرّف العميل المسجل.
     */
    public function isPerCustomerLimitExceeded(?string $identifier = null, ?int $customerId = null): bool
    {
        if ($this->per_customer_limit === null) {
            return false;
        }

        $count = $this->usageCountForCustomer($identifier, $customerId);

        return $count >= $this->per_customer_limit;
    }

    /**
     * احتساب عدد مرات استخدام العميل للكوبون (بالهاتف/البريد أو الحساب).
     */
    public function usageCountForCustomer(?string $identifier = null, ?int $customerId = null): int
    {
        $query = $this->usages();

        if ($customerId) {
            $query->where('customer_id', $customerId);
        }

        if ($identifier) {
            $query->orWhere('customer_identifier', $identifier);
        }

        return (int) $query->count();
    }

    /**
     * هل يتحقق شرط الحد الأدنى لقيمة الطلب؟
     */
    public function meetsMinimumOrderAmount(float $subtotal): bool
    {
        return $subtotal >= (float) $this->minimum_order_amount;
    }

    /**
     * هل يسمح الكوبون للمنتجات المخفضة حالياً؟
     */
    public function allowsOnSaleItems(): bool
    {
        return !$this->exclude_on_sale_items;
    }

    /**
     * هل الكوبون مخصص للطلبات الأولى فقط؟
     */
    public function isFirstOrderOnly(): bool
    {
        return (bool) $this->first_order_only;
    }

    /**
     * التحقق من أن الكوبون سليم وجاهز للاستخدام.
     *
     * @param array $context بيانات السياق:
     *  - subtotal: قيمة الطلب قبل الخصم
     *  - customer_identifier: هاتف/بريد العميل
     *  - customer_id: معرّف العميل المسجل
     *  - country_id, state_id, city_id: موقع الشحن
     *  - item_product_ids: قائمة معرفات المنتجات في السلة
     *  - has_on_sale_items: هل تحتوي السلة على منتجات مخفضة
     *  - is_first_order: هل هذا أول طلب للعميل
     *
     * @return array{valid: bool, errors: array}
     */
    public function validateForUse(array $context = []): array
    {
        $errors = [];

        if (!$this->isActiveNow()) {
            $errors[] = $this->status ? 'coupon_inactive_period' : 'coupon_disabled';
        }

        if (!$this->isUsageLimitExceeded() && empty($errors)) {
            // لا داعي لمتابعة فحص باقي الشروط إذا كان غير مفعل
        }

        if ($this->isUsageLimitExceeded()) {
            $errors[] = 'coupon_usage_limit_exceeded';
        }

        $subtotal = (float) ($context['subtotal'] ?? 0);

        if (!$this->meetsMinimumOrderAmount($subtotal)) {
            $errors[] = 'coupon_minimum_not_met';
        }

        $identifier = $context['customer_identifier'] ?? null;
        $customerId = $context['customer_id'] ?? null;

        if ($this->isPerCustomerLimitExceeded($identifier, $customerId)) {
            $errors[] = 'coupon_per_customer_limit_exceeded';
        }

        // كوبون الطلبات الأولى فقط
        if ($this->isFirstOrderOnly()) {
            $isFirstOrder = (bool) ($context['is_first_order'] ?? false);
            if (!$isFirstOrder) {
                $errors[] = 'coupon_first_order_only';
            }
        }

        // استثناء المنتجات المخفضة حالياً
        if ($this->exclude_on_sale_items && ($context['has_on_sale_items'] ?? false)) {
            $errors[] = 'coupon_not_valid_with_sale_items';
        }

        // التحقق من نطاق التطبيق (منتجات/تصنيفات)
        $productScopeError = $this->validateProductScope($context['item_product_ids'] ?? []);
        if ($productScopeError) {
            $errors[] = $productScopeError;
        }

        // التحقق من القيود الجغرافية
        if (!$this->validateRegion($context)) {
            $errors[] = 'coupon_region_not_available';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * التحقق من أن منتجات السلة ضمن نطاق تطبيق الكوبون.
     */
    protected function validateProductScope(array $itemProductIds = []): ?string
    {
        if (empty($itemProductIds)) {
            return null;
        }

        $hasProductBinding = $this->allProducts()->exists();
        $hasCategoryBinding = $this->categories()->exists();

        // لا توجد قيود منتجات/تصنيفات → الكوبون عام
        if (!$hasProductBinding && !$hasCategoryBinding) {
            return null;
        }

        // استبعاد المنتجات المحددة صراحةً كـ excluded
        $excludedProductIds = $this->excludedProducts()->pluck('products.id')->all();
        $intersectExcluded = array_intersect($itemProductIds, $excludedProductIds);
        if (!empty($intersectExcluded)) {
            return 'coupon_not_valid_for_some_items';
        }

        $includedProductIds = $this->products()->pluck('products.id')->all();
        $categoryIds = $this->categories()->pluck('categories.id')->all();

        foreach ($itemProductIds as $productId) {
            $product = Product::find($productId);
            if (!$product) {
                continue;
            }

            $isIncludedProduct = !empty($includedProductIds) && in_array($productId, $includedProductIds);
            $isIncludedCategory = !empty($categoryIds) && in_array($product->category_id, $categoryIds);

            if (!$isIncludedProduct && !$isIncludedCategory) {
                return 'coupon_not_valid_for_some_items';
            }
        }

        return null;
    }

    /**
     * التحقق من القيود الجغرافية.
     */
    protected function validateRegion(array $context = []): bool
    {
        // لا قيود مناطق → متاح في كل المناطق
        if (!$this->regions()->exists()) {
            return true;
        }

        $countryId = $context['country_id'] ?? null;
        $stateId = $context['state_id'] ?? null;
        $cityId = $context['city_id'] ?? null;

        $regions = $this->regions()->get();

        foreach ($regions as $region) {
            // مطابقة بأدق مستوى متوفر
            if ($region->city_id && $region->city_id == $cityId) {
                return true;
            }
            if ($region->state_id && $region->state_id == $stateId) {
                return true;
            }
            if ($region->country_id && $region->country_id == $countryId) {
                return true;
            }
        }

        return false;
    }

    // =========================================================================
    // احتساب الخصم
    // =========================================================================

    /**
     * حساب قيمة الخصم بناءً على نوع الكوبون.
     *
     * @param array $context:
     *  - subtotal: إجمالي الطلب قبل الخصم
     *  - shipping_cost: تكلفة الشحن
     *  - items: مصفوفة عناصر السلة [ ['product_id'=>, 'quantity'=>, 'unit_price'=>, 'sale_price'=>, 'category_id'=>], ... ]
     *
     * @return array{discount_type: string, discount_amount: float, message: string}
     */
    public function calculateDiscount(array $context = []): array
    {
        $subtotal = (float) ($context['subtotal'] ?? 0);
        $shippingCost = (float) ($context['shipping_cost'] ?? 0);

        switch ($this->discount_type) {
            case self::TYPE_FIXED:
                $discount = min((float) $this->discount_value, $subtotal);
                return [
                    'discount_type' => self::TYPE_FIXED,
                    'discount_amount' => round($discount, 2),
                    'message' => "Fixed discount of {$this->discount_value}",
                ];

            case self::TYPE_PERCENTAGE:
                $discount = ($subtotal * (float) $this->discount_value) / 100;
                // تطبيق الحد الأقصى لقيمة الخصم (حماية هامش الربح)
                if ($this->max_discount_amount !== null) {
                    $discount = min($discount, (float) $this->max_discount_amount);
                }
                $discount = min($discount, $subtotal);
                return [
                    'discount_type' => self::TYPE_PERCENTAGE,
                    'discount_amount' => round($discount, 2),
                    'message' => "Percentage discount of {$this->discount_value}%",
                ];

            case self::TYPE_FREE_SHIPPING:
                return [
                    'discount_type' => self::TYPE_FREE_SHIPPING,
                    'discount_amount' => round($shippingCost, 2),
                    'message' => 'Free shipping',
                ];

            case self::TYPE_BUY_ONE_GET_ONE:
                return $this->calculateBogoDiscount($context);

            default:
                return [
                    'discount_type' => $this->discount_type,
                    'discount_amount' => 0,
                    'message' => 'No discount',
                ];
        }
    }

    /**
     * حساب خصم Buy 1 Get 1 بناءً على عناصر السلة.
     */
    protected function calculateBogoDiscount(array $context = []): array
    {
        $items = $context['items'] ?? [];
        $totalFreeValue = 0.0;
        $freeCount = 0;

        foreach ($items as $item) {
            $productId = $item['product_id'] ?? null;

            // إذا كان BOGO محدداً بمنتج معين، نطبق عليه فقط
            if ($this->bogo_product_id && (int) $productId !== (int) $this->bogo_product_id) {
                continue;
            }

            // تطبيق BOGO على التصنيفات المرتبطة إن وُجدت
            if ($this->categories()->exists()) {
                $categoryIds = $this->categories()->pluck('categories.id')->all();
                $itemCategoryId = $item['category_id'] ?? null;
                if (!in_array($itemCategoryId, $categoryIds)) {
                    continue;
                }
            }

            $required = max(1, (int) $this->bogo_quantity);
            $freeQty = max(1, (int) $this->bogo_free_quantity);
            $purchaseQty = (int) ($item['quantity'] ?? 0);

            // كل (required) منتج يتم شراؤه يمنح (freeQty) مجاناً
            $sets = intdiv($purchaseQty, $required + $freeQty);
            if ($sets <= 0) {
                continue;
            }

            $unitPrice = (float) ($item['sale_price'] ?? $item['unit_price'] ?? 0);
            $freeValue = $unitPrice * $freeQty * $sets;
            $totalFreeValue += $freeValue;
            $freeCount += $freeQty * $sets;
        }

        $totalFreeValue = min($totalFreeValue, (float) ($context['subtotal'] ?? 0));

        return [
            'discount_type' => self::TYPE_BUY_ONE_GET_ONE,
            'discount_amount' => round($totalFreeValue, 2),
            'free_quantity' => $freeCount,
            'message' => $freeCount > 0 ? "{$freeCount} item(s) free" : 'BOGO offer not applied',
        ];
    }

    /**
     * تسجيل استخدام جديد للكوبون.
     */
    public function recordUsage(array $data = []): CouponUsage
    {
        $usage = $this->usages()->create([
            'order_id' => $data['order_id'] ?? null,
            'customer_id' => $data['customer_id'] ?? null,
            'customer_identifier' => $data['customer_identifier'] ?? null,
            'discount_amount' => $data['discount_amount'] ?? 0,
        ]);

        $this->increment('used_count');

        return $usage;
    }

    /**
     * توليد كود تلقائي فريد داخل المتجر.
     */
    public static function generateUniqueCode(int $storeId): string
    {
        do {
            $code = strtoupper(\Illuminate\Support\Str::random(10));
        } while (static::where('store_id', $storeId)->where('code', $code)->exists());

        return $code;
    }
}

