<?php

namespace App\Http\Controllers;

use App\Models\AdvancedCoupon;
use App\Models\Product;
use App\Models\Category;
use App\Models\Country;
use App\Models\State;
use App\Models\City;
use App\Models\Order;
use App\Services\AdvancedCouponService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdvancedCouponController extends Controller
{
    /**
     * Redirect to the advanced coupons index (legacy route alias).
     */
    public function redirectIndex()
    {
        return redirect()->route('advanced-coupons.index');
    }

    /**
     * Display a listing of advanced coupons.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $query = AdvancedCoupon::where('store_id', $currentStoreId)
            ->with(['products', 'categories', 'regions']);

        // Apply search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        // Apply filters
        if ($request->has('discount_type') && $request->discount_type !== 'all') {
            $query->where('discount_type', $request->discount_type);
        }
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status === 'active' ? true : false);
        }

        $perPage = (int) $request->get('per_page', 10);
        $coupons = $query->latest()->paginate($perPage);

        // Transform for the frontend
        $coupons->through(function ($coupon) {
            return $this->formatCoupon($coupon);
        });

        // Statistics
        $all = AdvancedCoupon::where('store_id', $currentStoreId);
        $stats = [
            'total' => (clone $all)->count(),
            'active' => (clone $all)->where('status', true)->count(),
            'percentage' => (clone $all)->where('discount_type', 'percentage')->count(),
            'fixed' => (clone $all)->where('discount_type', 'fixed')->count(),
            'free_shipping' => (clone $all)->where('discount_type', 'free_shipping')->count(),
            'bogo' => (clone $all)->where('discount_type', 'buy_one_get_one')->count(),
        ];

        return Inertia::render('advanced-coupons/index', [
            'coupons' => $coupons,
            'filters' => $request->only(['search', 'discount_type', 'status', 'per_page']),
            'stats' => $stats,
        ]);
    }

    /**
     * Show create form.
     */
    public function create()
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        return Inertia::render('advanced-coupons/create', $this->getFormData($currentStoreId));
    }

    /**
     * Show edit form.
     */
    public function edit(AdvancedCoupon $coupon)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($coupon->store_id !== $currentStoreId) {
            abort(403, __('Unauthorized action.'));
        }

        $coupon->load(['products', 'excludedProducts', 'categories', 'regions', 'bogoProduct']);

        return Inertia::render('advanced-coupons/edit', array_merge(
            $this->getFormData($currentStoreId),
            ['coupon' => $this->formatCouponForForm($coupon)]
        ));
    }

    /**
     * Store a newly created coupon.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $validated = $this->validateRequest($request, $currentStoreId);

        $data = $this->extractMainFields($request, $validated);

        // Auto-generate code
        if (($data['code_type'] ?? 'manual') === 'auto' || empty($data['code'])) {
            $data['code'] = AdvancedCoupon::generateUniqueCode($currentStoreId);
        }

        $data['store_id'] = $currentStoreId;
        $data['created_by'] = Auth::id();
        $data['status'] = $request->boolean('status', true);

        $coupon = AdvancedCoupon::create($data);

        // Sync product pivot
        $this->syncProducts($coupon, $request);
        // Sync categories
        $this->syncCategories($coupon, $request);
        // Sync regions
        $this->syncRegions($coupon, $request);

        return redirect()->route('advanced-coupons.index')
            ->with('success', __('Advanced coupon created successfully!'));
    }

    /**
     * Update the specified coupon.
     */
    public function update(Request $request, AdvancedCoupon $coupon)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($coupon->store_id !== $currentStoreId) {
            abort(403, __('Unauthorized action.'));
        }

        $validated = $this->validateRequest($request, $currentStoreId, $coupon->id);

        $data = $this->extractMainFields($request, $validated);

        // If switching to auto type, generate new code if needed
        if (($request->code_type ?? 'manual') === 'auto') {
            $data['code'] = AdvancedCoupon::generateUniqueCode($currentStoreId);
        }

        $data['status'] = $request->boolean('status', $coupon->status);

        $coupon->update($data);

        // Sync pivot tables
        $this->syncProducts($coupon, $request);
        $this->syncCategories($coupon, $request);
        $this->syncRegions($coupon, $request);

        return redirect()->route('advanced-coupons.index')
            ->with('success', __('Advanced coupon updated successfully!'));
    }

    /**
     * Toggle the status of the coupon.
     */
    public function toggleStatus(AdvancedCoupon $coupon)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($coupon->store_id !== $currentStoreId) {
            abort(403, __('Unauthorized action.'));
        }

        $coupon->update(['status' => !$coupon->status]);

        return redirect()->back()->with('success', __('Coupon status updated successfully!'));
    }

    /**
     * Remove the specified coupon.
     */
    public function destroy(AdvancedCoupon $coupon)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($coupon->store_id !== $currentStoreId) {
            abort(403, __('Unauthorized action.'));
        }

        $coupon->delete();

        return redirect()->route('advanced-coupons.index')
            ->with('success', __('Advanced coupon deleted successfully!'));
    }

    /**
     * Export coupons as CSV.
     */
    public function export()
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $coupons = AdvancedCoupon::where('store_id', $currentStoreId)
            ->orderBy('created_at', 'desc')
            ->get();

        $csvData = [];
        $csvData[] = ['Name', 'Code', 'Discount Type', 'Discount Value', 'Max Discount', 'Min Order', 'Usage Limit', 'Used Count', 'Starts At', 'Expires At', 'Status'];

        foreach ($coupons as $coupon) {
            $csvData[] = [
                $coupon->name,
                $coupon->code,
                $coupon->discount_type,
                $coupon->discount_value,
                $coupon->max_discount_amount ?? '',
                $coupon->minimum_order_amount,
                $coupon->usage_limit ?? 'Unlimited',
                $coupon->used_count,
                $coupon->starts_at?->format('Y-m-d H:i'),
                $coupon->expires_at?->format('Y-m-d H:i'),
                $coupon->status ? 'Active' : 'Inactive',
            ];
        }

        $filename = 'advanced-coupons-export-' . now()->format('Y-m-d') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function () use ($csvData) {
            $file = fopen('php://output', 'w');
            foreach ($csvData as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Validate a coupon code during checkout (storefront API).
     *
     * Accepts context: products (cart items), location (country/state/city), customer identifier.
     * Returns eligibility + calculated discount.
     */
    public function validateCoupon(Request $request)
    {
        $request->validate([
            'code' => 'required|string|max:50',
            'store_id' => 'required|integer',
            'subtotal' => 'nullable|numeric|min:0',
            'shipping_cost' => 'nullable|numeric|min:0',
            'items' => 'nullable|array',
            'items.*.product_id' => 'required_with:items|integer',
            'items.*.quantity' => 'required_with:items|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric',
            'items.*.sale_price' => 'nullable|numeric',
            'items.*.category_id' => 'nullable|integer',
            'country_id' => 'nullable|integer',
            'state_id' => 'nullable|integer',
            'city_id' => 'nullable|integer',
            'customer_email' => 'nullable|email',
        ]);

        $storeId = (int) $request->store_id;
        $code = $request->code;
        $service = app(AdvancedCouponService::class);

        $items = $request->input('items', []);
        // Fall back to cart items if not provided, for logged-in customers.
        if (empty($items) && auth()->guard('customer')->check()) {
            $items = \App\Models\CartItem::where('store_id', $storeId)
                ->where('customer_id', auth()->guard('customer')->id())
                ->with('product')
                ->get()
                ->map(function ($cartItem) {
                    return [
                        'product_id' => $cartItem->product_id,
                        'quantity' => $cartItem->quantity,
                        'unit_price' => (float) ($cartItem->product->price ?? 0),
                        'sale_price' => (float) ($cartItem->product->sale_price ?? 0),
                        'category_id' => $cartItem->product->category_id,
                    ];
                })->toArray();
        }

        $subtotal = (float) $request->subtotal;
        if ($subtotal <= 0) {
            foreach ($items as $item) {
                $subtotal += ((float) ($item['sale_price'] ?? $item['unit_price'] ?? 0)) * (int) ($item['quantity'] ?? 1);
            }
        }

        $customerIdentifier = $request->customer_email;
        if (!$customerIdentifier && auth()->guard('customer')->check()) {
            $customerIdentifier = auth()->guard('customer')->user()->email;
        }

        $result = $service->validateCoupon($code, $storeId, [
            'subtotal' => $subtotal,
            'shipping_cost' => (float) $request->shipping_cost,
            'items' => $items,
            'customer_id' => auth()->guard('customer')->id() ?: null,
            'customer_identifier' => $customerIdentifier,
            'item_product_ids' => array_map(fn ($item) => $item['product_id'] ?? 0, $items),
            'has_on_sale_items' => !empty(array_filter($items, fn ($item) => !empty($item['sale_price']))),
            'is_first_order' => $customerIdentifier
                ? !Order::where('store_id', $storeId)->where('customer_email', $customerIdentifier)->exists()
                : false,
            'country_id' => $request->country_id,
            'state_id' => $request->state_id,
            'city_id' => $request->city_id,
        ]);

        if (!$result['valid']) {
            return response()->json([
                'valid' => false,
                'errors' => $result['errors'],
                'message' => $this->couponErrorMessage($result['errors']),
            ]);
        }

        return response()->json([
            'valid' => true,
            'coupon' => [
                'id' => $result['coupon']->id,
                'name' => $result['coupon']->name,
                'code' => $result['coupon']->code,
                'discount_type' => $result['coupon']->discount_type,
                'discount_value' => (float) $result['coupon']->discount_value,
            ],
            'discount' => $result['discount'],
            'subtotal' => round($subtotal, 2),
            'discount_amount' => round($result['discount']['discount_amount'] ?? 0, 2),
        ]);
    }

    /**
     * Map validation error codes to human-readable messages.
     * Aligned with AdvancedCoupon::validateForUse() error codes.
     */
    private function couponErrorMessage(array $errors): string
    {
        $messages = [
            'coupon_not_found' => __('The coupon code is invalid or does not exist.'),
            'coupon_disabled' => __('This coupon is inactive.'),
            'coupon_inactive_period' => __('This coupon is not active yet or has expired.'),
            'coupon_usage_limit_exceeded' => __('The usage limit for this coupon has been reached.'),
            'coupon_per_customer_limit_exceeded' => __('You have already used this coupon.'),
            'coupon_minimum_not_met' => __('This coupon requires a minimum order amount.'),
            'coupon_not_valid_with_sale_items' => __('This coupon cannot be used with sale items.'),
            'coupon_not_valid_for_some_items' => __('This coupon is not valid for some items in your cart.'),
            'coupon_region_not_available' => __('This coupon is not valid in your region.'),
            'coupon_first_order_only' => __('This coupon is only valid for first-time customers.'),
        ];

        foreach ($errors as $error) {
            if (isset($messages[$error])) {
                return $messages[$error];
            }
        }

        return __('This coupon cannot be applied.');
    }

    /**
     * Validate the request input.
     */
    private function validateRequest(Request $request, int $storeId, ?int $ignoreId = null): array
    {
        $codeRule = 'nullable|string|max:50';
        if ($request->code_type === 'manual') {
            $codeRule = 'required|string|max:50|unique:advanced_coupons,code' .
                ($ignoreId ? ',' . $ignoreId : '') . ',id,store_id,' . $storeId;
        }

        return $request->validate([
            'name' => 'required|string|max:255',
            'code' => $codeRule,
            'description' => 'nullable|string',
            'discount_type' => 'required|in:fixed,percentage,free_shipping,buy_one_get_one',
            'discount_value' => 'required_if:discount_type,fixed,percentage|numeric|min:0',
            'max_discount_amount' => 'nullable|numeric|min:0',
            'minimum_order_amount' => 'nullable|numeric|min:0',
            'usage_limit' => 'nullable|integer|min:1',
            'per_customer_limit' => 'nullable|integer|min:1',
            'bogo_product_id' => 'nullable|integer|exists:products,id',
            'bogo_quantity' => 'required_if:discount_type,buy_one_get_one|integer|min:1',
            'bogo_free_quantity' => 'required_if:discount_type,buy_one_get_one|integer|min:1',
            'exclude_on_sale_items' => 'boolean',
            'first_order_only' => 'boolean',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'status' => 'boolean',
            'code_type' => 'sometimes|in:manual,auto',

            // Pivot arrays
            'product_ids' => 'nullable|array',
            'product_ids.*' => 'integer|exists:products,id',
            'excluded_product_ids' => 'nullable|array',
            'excluded_product_ids.*' => 'integer|exists:products,id',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'integer|exists:categories,id',

            // Regions
            'regions' => 'nullable|array',
            'regions.*.country_id' => 'nullable|integer|exists:countries,id',
            'regions.*.state_id' => 'nullable|integer|exists:states,id',
            'regions.*.city_id' => 'nullable|integer|exists:cities,id',
        ], [], [
            'name' => __('Coupon Name'),
            'code' => __('Coupon Code'),
            'discount_type' => __('Discount Type'),
            'discount_value' => __('Discount Value'),
        ]);
    }

    /**
     * Extract the main coupon fields from the request.
     */
    private function extractMainFields(Request $request, array $validated): array
    {
        return [
            'name' => $request->name,
            'description' => $request->description,
            'code' => $request->code,
            'code_type' => $request->code_type ?? 'manual',
            'discount_type' => $request->discount_type,
            'discount_value' => $request->discount_type === 'free_shipping' ? 0 : ($request->discount_value ?? 0),
            'max_discount_amount' => $request->max_discount_amount,
            'minimum_order_amount' => $request->minimum_order_amount ?? 0,
            'usage_limit' => $request->usage_limit,
            'per_customer_limit' => $request->per_customer_limit,
            'bogo_product_id' => $request->discount_type === 'buy_one_get_one' ? $request->bogo_product_id : null,
            'bogo_quantity' => $request->discount_type === 'buy_one_get_one' ? ($request->bogo_quantity ?? 1) : 1,
            'bogo_free_quantity' => $request->discount_type === 'buy_one_get_one' ? ($request->bogo_free_quantity ?? 1) : 1,
            'exclude_on_sale_items' => $request->boolean('exclude_on_sale_items'),
            'first_order_only' => $request->boolean('first_order_only'),
            'starts_at' => $request->starts_at,
            'expires_at' => $request->expires_at,
        ];
    }

    /**
     * Sync product pivot (included + excluded).
     */
    private function syncProducts(AdvancedCoupon $coupon, Request $request): void
    {
        $included = (array) ($request->product_ids ?? []);
        $excluded = (array) ($request->excluded_product_ids ?? []);

        $productIds = array_values(array_unique(array_merge($included, $excluded)));

        $pivotData = [];
        foreach ($productIds as $productId) {
            $pivotData[$productId] = [
                'excluded' => in_array($productId, $excluded) ? true : false,
            ];
        }

        $coupon->allProducts()->sync($pivotData);
    }

    /**
     * Sync categories pivot.
     */
    private function syncCategories(AdvancedCoupon $coupon, Request $request): void
    {
        $categoryIds = (array) ($request->category_ids ?? []);
        $coupon->categories()->sync($categoryIds);
    }

    /**
     * Sync regions for the coupon.
     */
    private function syncRegions(AdvancedCoupon $coupon, Request $request): void
    {
        $coupon->regions()->delete();

        $regions = (array) ($request->regions ?? []);
        foreach ($regions as $region) {
            if (empty($region['country_id']) && empty($region['state_id']) && empty($region['city_id'])) {
                continue;
            }
            $coupon->regions()->create([
                'country_id' => $region['country_id'] ?? null,
                'state_id' => $region['state_id'] ?? null,
                'city_id' => $region['city_id'] ?? null,
            ]);
        }
    }

    /**
     * Data for create/edit forms.
     */
    private function getFormData(int $storeId): array
    {
        $products = Product::where('store_id', $storeId)
            ->orderBy('name')
            ->get(['id', 'name', 'sale_price', 'price'])
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'price' => $p->sale_price ? (float) $p->sale_price : (float) $p->price,
                ];
            });

        $categories = Category::where('store_id', $storeId)
            ->orderBy('name')
            ->get(['id', 'name']);

        $countries = Country::active()->orderBy('name')->get(['id', 'name', 'code']);
        $states = State::active()->orderBy('name')->get(['id', 'name', 'country_id']);
        $cities = City::active()->orderBy('name')->get(['id', 'name', 'state_id']);

        return [
            'availableProducts' => $products,
            'availableCategories' => $categories,
            'countries' => $countries,
            'states' => $states,
            'cities' => $cities,
            'discountTypes' => [
                ['value' => 'fixed', 'label' => __('Fixed Amount')],
                ['value' => 'percentage', 'label' => __('Percentage Discount')],
                ['value' => 'free_shipping', 'label' => __('Free Shipping')],
                ['value' => 'buy_one_get_one', 'label' => __('Buy 1 Get 1')],
            ],
        ];
    }

    /**
     * Format a coupon for the list page.
     */
    private function formatCoupon(AdvancedCoupon $coupon): array
    {
        return [
            'id' => $coupon->id,
            'name' => $coupon->name,
            'code' => $coupon->code,
            'description' => $coupon->description,
            'discount_type' => $coupon->discount_type,
            'discount_value' => (float) $coupon->discount_value,
            'max_discount_amount' => $coupon->max_discount_amount !== null ? (float) $coupon->max_discount_amount : null,
            'minimum_order_amount' => (float) $coupon->minimum_order_amount,
            'usage_limit' => $coupon->usage_limit,
            'per_customer_limit' => $coupon->per_customer_limit,
            'used_count' => (int) $coupon->used_count,
            'exclude_on_sale_items' => (bool) $coupon->exclude_on_sale_items,
            'first_order_only' => (bool) $coupon->first_order_only,
            'starts_at' => $coupon->starts_at?->toIso8601String(),
            'expires_at' => $coupon->expires_at?->toIso8601String(),
            'status' => (bool) $coupon->status,
            'products_count' => $coupon->products->count(),
            'categories_count' => $coupon->categories->count(),
            'regions_count' => $coupon->regions->count(),
        ];
    }

    /**
     * Format a coupon for the edit form.
     */
    private function formatCouponForForm(AdvancedCoupon $coupon): array
    {
        return [
            'id' => $coupon->id,
            'name' => $coupon->name,
            'code' => $coupon->code,
            'code_type' => $coupon->code_type,
            'description' => $coupon->description,
            'discount_type' => $coupon->discount_type,
            'discount_value' => (float) $coupon->discount_value,
            'max_discount_amount' => $coupon->max_discount_amount !== null ? (float) $coupon->max_discount_amount : '',
            'minimum_order_amount' => (float) $coupon->minimum_order_amount > 0 ? (float) $coupon->minimum_order_amount : '',
            'usage_limit' => $coupon->usage_limit,
            'per_customer_limit' => $coupon->per_customer_limit,
            'bogo_product_id' => $coupon->bogo_product_id,
            'bogo_quantity' => (int) $coupon->bogo_quantity,
            'bogo_free_quantity' => (int) $coupon->bogo_free_quantity,
            'exclude_on_sale_items' => (bool) $coupon->exclude_on_sale_items,
            'first_order_only' => (bool) $coupon->first_order_only,
            'starts_at' => $coupon->starts_at?->format('Y-m-d\TH:i'),
            'expires_at' => $coupon->expires_at?->format('Y-m-d\TH:i'),
            'status' => (bool) $coupon->status,
            'product_ids' => $coupon->products->pluck('id')->map(fn ($id) => (int) $id),
            'excluded_product_ids' => $coupon->excludedProducts->pluck('id')->map(fn ($id) => (int) $id),
            'category_ids' => $coupon->categories->pluck('id')->map(fn ($id) => (int) $id),
            'regions' => $coupon->regions->map(function ($region) {
                return [
                    'country_id' => $region->country_id,
                    'state_id' => $region->state_id,
                    'city_id' => $region->city_id,
                ];
            }),
        ];
    }
}

