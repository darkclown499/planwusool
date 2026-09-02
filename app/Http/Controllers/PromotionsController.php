<?php

namespace App\Http\Controllers;

use App\Models\AdvancedCoupon;
use App\Models\Product;
use App\Models\Category;
use App\Services\AdvancedCouponService;
use App\Services\PromotionAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Merchant Promotions center (Marketing → العروض والخصومات).
 *
 * A guided, merchant-friendly management layer on top of the canonical
 * AdvancedCoupon engine (REUSE, not rebuild). Adds:
 *   - statuses (draft/scheduled/active/expired/disabled)
 *   - duplicate
 *   - reporting (valid-order analytics, Section 18)
 */
class PromotionsController extends Controller
{
    public function __construct(
        protected AdvancedCouponService $couponService,
        protected PromotionAnalyticsService $analyticsService
    ) {
    }

    /**
     * Listing + reporting.
     */
    public function index(Request $request)
    {
        $storeId = (int) Auth::user()->current_store;

        $query = AdvancedCoupon::where('store_id', $storeId);

        if ($request->filled('search')) {
            $q = $request->search;
            $query->where(fn ($b) => $b->where('name', 'like', "%{$q}%")->orWhere('code', 'like', "%{$q}%"));
        }
        $statusFilter = $request->get('status', 'all');
        if ($statusFilter === 'active') {
            $query->where('status', true)->where(fn ($b) => $b->whereNull('starts_at')->orWhere('starts_at', '<=', now()))->where(fn ($b) => $b->whereNull('expires_at')->orWhere('expires_at', '>=', now()));
        } elseif ($statusFilter === 'scheduled') {
            $query->where('status', true)->whereNotNull('starts_at')->where('starts_at', '>', now());
        } elseif ($statusFilter === 'expired') {
            $query->whereNotNull('expires_at')->where('expires_at', '<', now());
        } elseif ($statusFilter === 'disabled') {
            $query->where('status', false);
        }

        $paginated = $query->latest()->paginate((int) $request->get('per_page', 10));
        $promotions = $paginated->getCollection()->map(function ($coupon) {
            $status = $this->statusFor($coupon);
            $meta = $this->analyticsService->forPromotion($coupon);
            return array_merge([
                'id' => $coupon->id,
                'name' => $coupon->name,
                'code' => $coupon->code,
                'code_type' => $coupon->code_type,
                'discount_type' => $coupon->discount_type,
                'discount_value' => (float) $coupon->discount_value,
                'max_discount_amount' => $coupon->max_discount_amount !== null ? (float) $coupon->max_discount_amount : null,
                'starts_at' => $coupon->starts_at?->toISOString(),
                'expires_at' => $coupon->expires_at?->toISOString(),
                'status' => $status,
                'is_active' => (bool) $coupon->status,
                'used_count' => (int) $coupon->used_count,
            ], $meta);
        })->values()->toArray();

        $paginated->setCollection(collect($promotions));

        $all = AdvancedCoupon::where('store_id', $storeId)->latest()->get();
        $statuses = [
            'active' => $all->filter(fn ($c) => $this->statusFor($c) === 'active')->count(),
            'scheduled' => $all->filter(fn ($c) => $this->statusFor($c) === 'scheduled')->count(),
            'expired' => $all->filter(fn ($c) => $this->statusFor($c) === 'expired')->count(),
            'disabled' => $all->filter(fn ($c) => $this->statusFor($c) === 'disabled')->count(),
        ];

        return Inertia::render('promotions/index', [
            'promotions' => $paginated,
            'filters' => $request->only(['search', 'status', 'per_page']),
            'overall' => array_merge($this->analyticsService->overall($storeId), $statuses),
        ]);
    }

    /**
     * Create form.
     */
    public function create()
    {
        $storeId = (int) Auth::user()->current_store;
        return Inertia::render('promotions/create', $this->formData($storeId));
    }

    /**
     * Edit form.
     */
    public function edit(AdvancedCoupon $promotion)
    {
        $storeId = (int) Auth::user()->current_store;
        if ($promotion->store_id !== $storeId) {
            abort(403, __('Unauthorized action.'));
        }
        $promotion->load(['products', 'excludedProducts', 'categories']);
        return Inertia::render('promotions/edit', array_merge($this->formData($storeId), [
            'promotion' => $this->formatForForm($promotion),
        ]));
    }

    /**
     * Store a new promotion.
     */
    public function store(Request $request)
    {
        $data = $this->validated($request);
        $storeId = (int) Auth::user()->current_store;

        $coupon = AdvancedCoupon::create(array_merge($data, [
            'store_id' => $storeId,
            'created_by' => Auth::id(),
            'used_count' => 0,
        ]));

        $this->syncScopes($coupon, $request);

        return redirect()->route('promotions.index')->with('success', __('Promotion created successfully!'));
    }

    /**
     * Update a promotion.
     */
    public function update(Request $request, AdvancedCoupon $promotion)
    {
        $storeId = (int) Auth::user()->current_store;
        if ($promotion->store_id !== $storeId) {
            abort(403, __('Unauthorized action.'));
        }
        $promotion->update($this->validated($request));
        $this->syncScopes($promotion, $request);

        return redirect()->route('promotions.index')->with('success', __('Promotion updated successfully!'));
    }

    /**
     * Activate / deactivate.
     */
    public function toggleStatus(AdvancedCoupon $promotion)
    {
        $storeId = (int) Auth::user()->current_store;
        if ($promotion->store_id !== $storeId) {
            abort(403, __('Unauthorized action.'));
        }
        $promotion->update(['status' => !$promotion->status]);
        return back()->with('success', __('Promotion status updated.'));
    }

    /**
     * Duplicate a promotion (fresh copy, new code, reset usage).
     */
    public function duplicate(AdvancedCoupon $promotion)
    {
        $storeId = (int) Auth::user()->current_store;
        if ($promotion->store_id !== $storeId) {
            abort(403, __('Unauthorized action.'));
        }
        $copy = $promotion->replicateForDuplication();
        $copy->name = $promotion->name . ' (copy)';
        $copy->code = $promotion->code_type === 'manual' ? $promotion->code . '-' . Str::upper(Str::random(4)) : null;
        $copy->used_count = 0;
        $copy->status = false;
        $copy->created_by = Auth::id();
        $copy->save();

        $copy->products()->sync($promotion->products()->pluck('products.id')->all());
        $copy->excludedProducts()->sync($promotion->excludedProducts()->pluck('products.id')->all());
        $copy->categories()->sync($promotion->categories()->pluck('categories.id')->all());

        return redirect()->route('promotions.index')->with('success', __('Promotion duplicated.'));
    }

    /**
     * Delete a promotion.
     */
    public function destroy(AdvancedCoupon $promotion)
    {
        $storeId = (int) Auth::user()->current_store;
        if ($promotion->store_id !== $storeId) {
            abort(403, __('Unauthorized action.'));
        }
        $promotion->delete();
        return redirect()->route('promotions.index')->with('success', __('Promotion deleted.'));
    }

    /**
     * Per-promotion reporting.
     */
    public function analytics(AdvancedCoupon $promotion, Request $request)
    {
        $storeId = (int) Auth::user()->current_store;
        if ($promotion->store_id !== $storeId) {
            abort(403, __('Unauthorized action.'));
        }
        return Inertia::render('promotions/analytics', [
            'promotion' => $this->analyticsService->forPromotion($promotion),
        ]);
    }

    protected function statusFor(AdvancedCoupon $coupon): string
    {
        if (!$coupon->status) return 'disabled';
        if ($coupon->starts_at && now()->lt($coupon->starts_at)) return 'scheduled';
        if ($coupon->expires_at && now()->gt($coupon->expires_at)) return 'expired';
        return 'active';
    }

    protected function validated(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'code' => 'nullable|string|max:100|unique:advanced_coupons,code,' . ($request->route('promotion')?->id ?? 'NULL') . ',id,store_id,' . (int) Auth::user()->current_store,
            'code_type' => 'required|in:manual,auto',
            'discount_type' => 'required|in:fixed,percentage,free_shipping,buy_one_get_one,quantity',
            'discount_value' => 'required|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'quantity_tiers' => 'nullable|array',
            'quantity_tiers.*.min_qty' => 'integer|min:2',
            'quantity_tiers.*.discount_value' => 'numeric|min:0|max:100',
            'quantity_tiers.*.max_discount_amount' => 'nullable|numeric|min:0',
            'minimum_order_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'per_customer_limit' => 'nullable|integer|min:1',
            'exclude_on_sale_items' => 'boolean',
            'first_order_only' => 'boolean',
            'audience' => 'required|in:everyone,registered,first_order,repeat',
            'stackable' => 'boolean',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after_or_equal:starts_at',
            'status' => 'boolean',
        ]);
    }

    protected function syncScopes(AdvancedCoupon $coupon, Request $request): void
    {
        $productIds = array_filter((array) $request->input('product_ids', []));
        $excludedIds = array_filter((array) $request->input('excluded_product_ids', []));
        $categoryIds = array_filter((array) $request->input('category_ids', []));
        if ($productIds) $coupon->products()->sync($productIds);
        if ($excludedIds) $coupon->excludedProducts()->sync($excludedIds);
        if ($categoryIds) $coupon->categories()->sync($categoryIds);
    }

    protected function formData(int $storeId): array
    {
        $products = Product::where('store_id', $storeId)->select('id', 'name')->limit(500)->get();
        $categories = Category::where('store_id', $storeId)->select('id', 'name')->limit(500)->get();
        return [
            'products' => $products,
            'categories' => $categories,
        ];
    }

    protected function formatForForm(AdvancedCoupon $coupon): array
    {
        return array_merge($this->couponService->describe($coupon), [
            'product_ids' => $coupon->products()->pluck('products.id')->all(),
            'excluded_product_ids' => $coupon->excludedProducts()->pluck('products.id')->all(),
            'category_ids' => $coupon->categories()->pluck('categories.id')->all(),
        ]);
    }
}
