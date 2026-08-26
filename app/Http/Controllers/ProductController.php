<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ProductController extends Controller
{
    /**
     * Display a listing of the products.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);

        // Configurable low-stock threshold (falls back to 10 when unset).
        $lowStockThreshold = (int) getSetting('low_stock_threshold', 10);

        // Statistics are computed from the store-scoped query so they stay
        // accurate regardless of the active filters/pagination.
        // Variant-aware low_stock: products using variant inventory are low-stock if ANY tracked variant <= threshold and stock >0, or all combos 0 with no backorder.
        $statsQuery = Product::where('store_id', $currentStoreId);
        $totalProducts = $statsQuery->count();
        $activeProducts = (clone $statsQuery)->where('is_active', true)->count();
        $allForStats = Product::where('store_id', $currentStoreId)->get();
        $lowStockProducts = $allForStats->filter(function($p) use ($lowStockThreshold) {
            if (!$p->track_inventory) return false;
            if ($p->allow_backorder) return false;
            if (\App\Services\InventoryService::isVariantInventory($p)) {
                foreach (($p->variant_combinations ?? []) as $c) {
                    $s = (int)($c['stock'] ?? 0);
                    $th = (int)($c['low_stock_warning'] ?? $p->low_stock_warning ?? $lowStockThreshold);
                    if ($s > 0 && $s < $th) return true;
                }
                return false;
            }
            return $p->stock > 0 && $p->stock < $lowStockThreshold;
        })->count();
        $totalValue = (clone $statsQuery)->sum(\DB::raw('price * stock')) ?: 0;

        // Filtered + paginated list.
        $query = Product::with('category')
            ->where('store_id', $currentStoreId);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($categoryId = $request->input('category_id')) {
            $query->where('category_id', (int) $categoryId);
        }

        $status = $request->input('status');
        if ($status) {
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            } elseif ($status === 'low_stock') {
                // Variant-aware: need to include variant-tracked products whose ANY combo is low (< threshold), and exclude untracked/backordered.
                $variantLowIds = Product::where('store_id', $currentStoreId)
                    ->where('track_inventory', true)
                    ->where('allow_backorder', false)
                    ->get()
                    ->filter(function($p) use ($lowStockThreshold) {
                        if (!\App\Services\InventoryService::isVariantInventory($p)) return false;
                        foreach (($p->variant_combinations ?? []) as $c) {
                            $s = (int)($c['stock'] ?? 0);
                            $th = (int)($c['low_stock_warning'] ?? $p->low_stock_warning ?? $lowStockThreshold);
                            if ($s > 0 && $s < $th) return true;
                        }
                        return false;
                    })->pluck('id')->all();
                $query->where(function($q) use ($lowStockThreshold, $variantLowIds) {
                    $q->where(function($qq) use ($lowStockThreshold) {
                        $qq->where('stock','<',$lowStockThreshold)
                           ->where('stock','>',0)
                           ->where('track_inventory', true)
                           ->where('allow_backorder', false)
                           ->where(function($q2){ $q2->where('inventory_mode','!=','variant')->orWhereNull('inventory_mode'); });
                    });
                    if (!empty($variantLowIds)) $q->orWhereIn('id', $variantLowIds);
                });
            }
        }

        $sortableFields = ['price', 'sale_price', 'stock', 'created_at', 'name', 'sku'];
        $sortField = in_array($request->input('sort'), $sortableFields)
            ? $request->input('sort')
            : 'created_at';
        $direction = $request->input('direction') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sortField, $direction);

        $perPage = 15;
        if ($request->filled('per_page')) {
            $perPage = max(15, min((int) $request->input('per_page'), 100));
        }
        $products = $query->paginate($perPage)->withQueryString();

        // Categories for the filter dropdown (active, scoped to the store).
        $categories = Category::where('store_id', $currentStoreId)
            ->where('is_active', true)
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        $planLimits = null;
        $plan = $user->getCurrentPlan();
        if ($plan) {
            $maxProducts = $plan->max_products_per_store ?? 0;
            $planLimits = [
                'current_products' => $totalProducts,
                'max_products' => $maxProducts,
                'can_create' => $maxProducts <= 0 || $totalProducts < $maxProducts,
            ];
        }

        return Inertia::render('products/index', [
            'products' => $products,
            'categories' => $categories,
            'planLimits' => $planLimits,
            'lowStockThreshold' => $lowStockThreshold,
            'filters' => [
                'search' => (string) $request->input('search', ''),
                'category_id' => $request->input('category_id') ? (int) $request->input('category_id') : null,
                'status' => (string) $status,
                'sort' => $sortField,
                'direction' => $direction,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total' => $totalProducts,
                'active' => $activeProducts,
                'lowStock' => $lowStockProducts,
                'totalValue' => $totalValue,
            ],
        ]);
    }

    /**
     * Show the form for creating a new product.
     */
    public function create()
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);
        
        // Get categories for the current store
        $categories = Category::where('store_id', $currentStoreId)
                            ->where('is_active', true)
                            ->get();
        
        // Get taxes for the current store
        $taxes = \App\Models\Tax::where('store_id', $currentStoreId)
                            ->where('is_active', true)
                            ->get();
        
        // Plan limits
        $planLimits = null;
        $plan = $user->getCurrentPlan();
        if ($plan) {
            $currentProducts = \App\Models\Product::where('store_id', $currentStoreId)->count();
            $maxProducts = $plan->max_products_per_store ?? 0;
            $planLimits = [
                'can_create' => $maxProducts <= 0 || $currentProducts < $maxProducts,
                'current_products' => $currentProducts,
                'max_products' => $maxProducts,
            ];
        }
        
        return Inertia::render('products/create', [
            'categories' => $categories,
            'taxes' => $taxes,
            'planLimits' => $planLimits,
        ]);
    }

    /**
     * Store a newly created product in storage.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);
        
        // Check if user can add more products to this store
        $productCheck = $user->canAddProductToStore($currentStoreId);
        if (!$productCheck['allowed']) {
            return redirect()->back()->with('error', $productCheck['message']);
        }
        
        // Normalize inputs: trim name, sku, barcode, images
        $request->merge([
            'name' => is_string($request->input('name')) ? trim($request->input('name')) : $request->input('name'),
            'sku' => is_string($request->input('sku')) ? trim($request->input('sku')) : $request->input('sku'),
            'barcode' => is_string($request->input('barcode')) ? trim($request->input('barcode')) : $request->input('barcode'),
            'images' => is_string($request->input('images')) ? trim($request->input('images')) : $request->input('images'),
        ]);
        // Reject whitespace-only name explicitly
        if ($request->input('name') === '') {
            return redirect()->back()->withErrors(['name' => __('Product name cannot be empty.')])->withInput();
        }
        // Validation — single source of truth for create+edit
        $request->validate([
            'name' => 'required|string|max:255',
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:10000',
            'short_description' => 'nullable|string|max:500',
            'specifications' => 'nullable|string|max:10000',
            'details' => 'nullable|string|max:10000',
            'price' => 'required|numeric|min:0|max:9999999',
            'sale_price' => 'nullable|numeric|min:0|max:9999999',
            'cost_price' => 'nullable|numeric|min:0|max:9999999',
            'stock' => 'required|integer|min:0|max:999999',
            'low_stock_warning' => 'nullable|integer|min:0|max:999999',
            'track_inventory' => 'nullable|boolean',
            'allow_backorder' => 'nullable|boolean',
            'inventory_mode' => 'nullable|string|in:product,variant',
            'images' => 'required|string|max:5000',
            'category_id' => 'required|integer|exists:categories,id',
            'tax_id' => 'nullable|integer|exists:taxes,id',
            'is_active' => 'nullable|boolean',
            'is_published' => 'nullable|boolean',
            'is_tax_included' => 'nullable|boolean',
            'is_downloadable' => 'nullable|boolean',
            'downloadable_file' => 'nullable|string|max:2048',
            'meta_title' => 'nullable|string|max:60',
            'meta_description' => 'nullable|string|max:160',
            'seo_url_slug' => 'nullable|string|max:191|regex:/^[a-z0-9\-_]*$/i',
            'variants' => 'nullable|array|max:20',
            'variant_combinations' => 'nullable|array|max:100',
            'custom_fields' => 'nullable|array|max:20',
            'quick_specs' => 'nullable|array|max:20',
        ], [], [
            'name' => __('Product Name'),
            'sku' => __('SKU'),
            'category_id' => __('Category'),
            'images' => __('Product Images'),
            'price' => __('Price'),
            'stock' => __('Stock Quantity'),
        ]);
        
        // Store isolation: category must belong to this store and be active (or allow but warn)
        $categoryValid = Category::where('id', $request->category_id)->where('store_id', $currentStoreId)->exists();
        if (!$categoryValid) {
            return redirect()->back()->withErrors(['category_id' => __('Invalid category.')])->withInput();
        }
        // sale_price sanity: must be < price if set, else ignore (store null)
        $priceVal = (float)$request->input('price');
        $saleVal = $request->input('sale_price') !== null && $request->input('sale_price') !== '' ? (float)$request->input('sale_price') : null;
        if ($saleVal !== null && ($saleVal <= 0 || $saleVal >= $priceVal)) {
            $saleVal = null;
        }
        // images security: reject traversal/script
        $normalizedImages = trim((string) $request->images);
        if (str_contains($normalizedImages, '..') || str_contains($normalizedImages, '<script') || str_contains($normalizedImages, 'javascript:')) {
            return redirect()->back()->withErrors(['images' => __('Invalid image path.')])->withInput();
        }
        $firstImage = explode(',', $normalizedImages)[0] ?? '';
        $sanitizedDescription = $request->description !== null ? preg_replace('/<br\s*\/?>/i', "\n", (string) $request->description) : null;
        // quick_specs is a structured helper for the new UX; persist as JSON-encoded specifications
        $quickSpecs = $request->input('quick_specs');
        $specsFromQuick = null;
        if (is_array($quickSpecs) && count($quickSpecs) > 0) {
            $filtered = array_values(array_filter($quickSpecs, fn($s) => is_array($s) && trim($s['key'] ?? '') !== ''));
            if (count($filtered) > 0) $specsFromQuick = json_encode($filtered, JSON_UNESCAPED_UNICODE);
        }
        // inventory_mode: explicit merchant intent, default product for backward compatibility; variant only allowed if variants present
        $rawMode = $request->input('inventory_mode');
        $hasVariants = is_array($request->variants) && count(array_filter($request->variants, fn($v)=>is_array($v) && !empty(trim($v['name'] ?? ''))))>0;
        $hasCombos = is_array($request->variant_combinations) && count($request->variant_combinations)>0;
        if ($rawMode === 'variant' && (!$hasVariants || !$hasCombos)) {
            $rawMode = 'product'; // can't be variant without variants
        }
        $inventoryMode = in_array($rawMode, ['product','variant'], true) ? $rawMode : 'product';
        $product = new Product();
        $product->name = trim((string)$request->input('name'));
        $product->sku = $request->input('sku') !== null && $request->input('sku') !== '' ? trim((string)$request->input('sku')) : null;
        $product->barcode = $request->input('barcode') !== null && $request->input('barcode') !== '' ? trim((string)$request->input('barcode')) : null;
        $product->description = $sanitizedDescription !== null ? trim($sanitizedDescription) : null;
        $product->short_description = $request->input('short_description') !== null ? trim((string)$request->input('short_description')) : null;
        $product->specifications = $specsFromQuick ?? $request->specifications;
        $product->details = $request->details;
        $product->price = $priceVal;
        $product->sale_price = $saleVal;
        $product->cost_price = $request->input('cost_price') !== null && $request->input('cost_price') !== '' ? (float)$request->input('cost_price') : null;
        $product->stock = (int)$request->input('stock');
        $product->low_stock_warning = $request->has('low_stock_warning') ? (int)$request->input('low_stock_warning') : 5;
        $product->track_inventory = $request->has('track_inventory') ? (bool)$request->track_inventory : true;
        $product->allow_backorder = $request->has('allow_backorder') ? (bool)$request->allow_backorder : false;
        $product->inventory_mode = $inventoryMode;
        $product->cover_image = trim($firstImage);
        $product->images = $normalizedImages;
        $product->category_id = (int)$request->input('category_id');
        $product->tax_id = $request->input('tax_id') ? (int)$request->input('tax_id') : null;
        $product->store_id = $currentStoreId;
        // Draft support: is_published=false => is_active=false ; is_active takes precedence if both sent
        if ($request->has('is_active')) {
            $product->is_active = (bool)$request->is_active;
        } elseif ($request->has('is_published')) {
            $product->is_active = (bool)$request->is_published;
        } else {
            $product->is_active = true;
        }
        $product->is_tax_included = $request->has('is_tax_included') ? (bool)$request->is_tax_included : true;
        $product->is_downloadable = $request->has('is_downloadable') ? (bool)$request->is_downloadable : false;
        $product->downloadable_file = $request->input('downloadable_file') ? trim((string)$request->input('downloadable_file')) : null;
        $product->meta_title = $request->input('meta_title') ? trim((string)$request->input('meta_title')) : null;
        $product->meta_description = $request->input('meta_description') ? trim((string)$request->input('meta_description')) : null;
        $product->seo_url_slug = $request->input('seo_url_slug') ? trim((string)$request->input('seo_url_slug')) : null;
        $product->variants = $request->variants;
        $combos = $request->variant_combinations ?? [];
        $product->variant_combinations = is_array($combos) ? \App\Models\Product::ensureVariantUuids($combos) : $combos;
        $product->custom_fields = $request->custom_fields;
        $product->save();
        
        return redirect()->route('products.index')->with('success', __('Product created successfully'));
    }

    /**
     * Display the specified product.
     */
    public function show(string $id)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);
        
        $product = Product::with(['category', 'tax'])
                        ->where('store_id', $currentStoreId)
                        ->findOrFail($id);
        
        // Calculate dynamic stats for the product — scoped to this store's orders only
        // (order_items.product_id is global auto-increment; without store isolation a
        // product with same numeric id in another store could leak revenue counts).
        $orderItems = \App\Models\OrderItem::where('product_id', $product->id)
            ->whereHas('order', fn($q)=>$q->where('store_id', $currentStoreId))->get();
        
        $stats = [
            'revenue' => $orderItems->sum('total_price'),
            'views' => 0, // Views tracking would need to be implemented separately
            'total_sold' => $orderItems->sum('quantity'),
            'total_orders' => $orderItems->count(),
        ];
        
        // Format revenue for display
        $stats['formatted_revenue'] = formatStoreCurrency($stats['revenue'], $user->id, $currentStoreId);
        
        return Inertia::render('products/show', [
            'product' => $product,
            'stats' => $stats
        ]);
    }

    /**
     * Show the form for editing the specified product.
     */
    public function edit(string $id)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);
        
        $product = Product::where('store_id', $currentStoreId)->findOrFail($id);
        
        // Get categories for the current store
        $categories = Category::where('store_id', $currentStoreId)
                            ->where('is_active', true)
                            ->get();
        
        // Get taxes for the current store
        $taxes = \App\Models\Tax::where('store_id', $currentStoreId)
                            ->where('is_active', true)
                            ->get();
        
        return Inertia::render('products/edit', [
            'product' => $product,
            'categories' => $categories,
            'taxes' => $taxes
        ]);
    }

    /**
     * Update the specified product in storage.
     */
    public function update(Request $request, string $id)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);
        
        $product = Product::where('store_id', $currentStoreId)->findOrFail($id);
        
        $request->merge([
            'name' => is_string($request->input('name')) ? trim($request->input('name')) : $request->input('name'),
            'sku' => is_string($request->input('sku')) ? trim($request->input('sku')) : $request->input('sku'),
            'barcode' => is_string($request->input('barcode')) ? trim($request->input('barcode')) : $request->input('barcode'),
            'images' => is_string($request->input('images')) ? trim($request->input('images')) : $request->input('images'),
        ]);
        if ($request->input('name') === '') {
            return redirect()->back()->withErrors(['name' => __('Product name cannot be empty.')])->withInput();
        }
        $request->validate([
            'name' => 'required|string|max:255',
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:10000',
            'short_description' => 'nullable|string|max:500',
            'specifications' => 'nullable|string|max:10000',
            'details' => 'nullable|string|max:10000',
            'price' => 'required|numeric|min:0|max:9999999',
            'sale_price' => 'nullable|numeric|min:0|max:9999999',
            'cost_price' => 'nullable|numeric|min:0|max:9999999',
            'stock' => 'required|integer|min:0|max:999999',
            'low_stock_warning' => 'nullable|integer|min:0|max:999999',
            'track_inventory' => 'nullable|boolean',
            'allow_backorder' => 'nullable|boolean',
            'inventory_mode' => 'nullable|string|in:product,variant',
            'images' => 'required|string|max:5000',
            'category_id' => 'required|integer|exists:categories,id',
            'tax_id' => 'nullable|integer|exists:taxes,id',
            'is_active' => 'nullable|boolean',
            'is_published' => 'nullable|boolean',
            'is_tax_included' => 'nullable|boolean',
            'is_downloadable' => 'nullable|boolean',
            'downloadable_file' => 'nullable|string|max:2048',
            'meta_title' => 'nullable|string|max:60',
            'meta_description' => 'nullable|string|max:160',
            'seo_url_slug' => 'nullable|string|max:191|regex:/^[a-z0-9\-_]*$/i',
            'variants' => 'nullable|array|max:20',
            'variant_combinations' => 'nullable|array|max:100',
            'custom_fields' => 'nullable|array|max:20',
            'quick_specs' => 'nullable|array|max:20',
        ], [], [
            'name' => __('Product Name'),
            'sku' => __('SKU'),
            'category_id' => __('Category'),
            'images' => __('Product Images'),
            'price' => __('Price'),
            'stock' => __('Stock Quantity'),
        ]);

        // Store isolation: category must belong to this store
        $categoryValid = Category::where('id', $request->category_id)->where('store_id', $currentStoreId)->exists();
        if (!$categoryValid) {
            return redirect()->back()->withErrors(['category_id' => __('Invalid category.')])->withInput();
        }
        $priceVal = (float)$request->input('price');
        $saleVal = $request->input('sale_price') !== null && $request->input('sale_price') !== '' ? (float)$request->input('sale_price') : null;
        if ($saleVal !== null && ($saleVal <= 0 || $saleVal >= $priceVal)) $saleVal = null;
        if (str_contains(trim((string)$request->images), '..') || str_contains(trim((string)$request->images), '<script') || str_contains(trim((string)$request->images), 'javascript:')) {
            return redirect()->back()->withErrors(['images' => __('Invalid image path.')])->withInput();
        }

        $normalizedImages = trim((string) $request->images);
        $firstImage = explode(',', $normalizedImages)[0] ?? '';
        
        $quickSpecs = $request->input('quick_specs');
        $specsFromQuick = null;
        if (is_array($quickSpecs)) {
            $filtered = array_values(array_filter($quickSpecs, fn($s) => is_array($s) && trim($s['key'] ?? '') !== ''));
            if (count($filtered) > 0) $specsFromQuick = json_encode($filtered, JSON_UNESCAPED_UNICODE);
        }
        $effectiveSpecifications = $specsFromQuick !== null ? $specsFromQuick : ($request->has('specifications') ? $request->specifications : $product->specifications);
        // Determine new active state: is_active takes precedence, else is_published
        $newIsActive = $product->is_active;
        if ($request->has('is_active')) $newIsActive = (bool)$request->is_active;
        elseif ($request->has('is_published')) $newIsActive = (bool)$request->is_published;
        if ($newIsActive && !$product->is_active) {
            $companyUser = $user->type === 'company' ? $user : $user->creator;
            if ($companyUser && $companyUser->plan) {
                $maxProducts = $companyUser->plan->max_products_per_store ?? 0;
                if ($maxProducts > 0) {
                    $activeProducts = Product::where('store_id', $currentStoreId)
                        ->where('is_active', true)
                        ->where('id', '!=', $product->id)
                        ->count();
                    if ($activeProducts >= $maxProducts) {
                        return redirect()->back()->with('error', __('Cannot activate product. You have reached your plan limit of :max products per store. Please upgrade your plan or deactivate another product first.', ['max' => $maxProducts]));
                    }
                }
            }
        }
        
        $sanitizedDescription = $request->has('description') && $request->description !== null ? trim(preg_replace('/<br\s*\/?>/i', "\n", (string) $request->description)) : $product->description;
        if ($request->has('inventory_mode')) {
            $rawMode = $request->input('inventory_mode');
            $variantsToCheck = $request->has('variants') ? $request->variants : $product->variants;
            $combosToCheck = $request->has('variant_combinations') ? $request->variant_combinations : $product->variant_combinations;
            if (is_string($variantsToCheck)) $variantsToCheck = json_decode($variantsToCheck, true);
            if (is_string($combosToCheck)) $combosToCheck = json_decode($combosToCheck, true);
            $hasV = is_array($variantsToCheck) && count(array_filter($variantsToCheck, fn($v)=>is_array($v) && !empty(trim($v['name'] ?? $v['label'] ?? ''))))>0;
            $hasC = is_array($combosToCheck) && count($combosToCheck)>0;
            if ($rawMode === 'variant' && (!$hasV || !$hasC)) $rawMode = 'product';
            if (in_array($rawMode, ['product','variant'], true)) {
                $product->inventory_mode = $rawMode;
            }
        }
        $product->name = trim((string)$request->input('name'));
        $product->sku = $request->input('sku') !== null && $request->input('sku') !== '' ? trim((string)$request->input('sku')) : null;
        $product->barcode = $request->input('barcode') !== null && $request->input('barcode') !== '' ? trim((string)$request->input('barcode')) : null;
        $product->description = $sanitizedDescription !== null && $sanitizedDescription !== '' ? $sanitizedDescription : $product->description;
        $product->short_description = $request->has('short_description') ? ($request->input('short_description') !== null ? trim((string)$request->input('short_description')) : null) : $product->short_description;
        $product->specifications = $effectiveSpecifications;
        $product->details = $request->has('details') ? $request->details : $product->details;
        $product->price = $priceVal;
        $product->sale_price = $saleVal;
        $product->cost_price = $request->input('cost_price') !== null && $request->input('cost_price') !== '' ? (float)$request->input('cost_price') : $product->cost_price;
        $product->stock = (int)$request->input('stock');
        $product->low_stock_warning = $request->has('low_stock_warning') ? (int)$request->input('low_stock_warning') : $product->low_stock_warning;
        $product->track_inventory = $request->has('track_inventory') ? (bool)$request->track_inventory : $product->track_inventory;
        $product->allow_backorder = $request->has('allow_backorder') ? (bool)$request->allow_backorder : $product->allow_backorder;
        $product->cover_image = trim($firstImage);
        $product->images = $normalizedImages;
        $product->category_id = (int)$request->input('category_id');
        $product->tax_id = $request->input('tax_id') ? (int)$request->input('tax_id') : null;
        $product->is_active = $newIsActive;
        $product->is_tax_included = $request->has('is_tax_included') ? (bool)$request->is_tax_included : $product->is_tax_included;
        $product->is_downloadable = $request->has('is_downloadable') ? (bool)$request->is_downloadable : $product->is_downloadable;
        $product->downloadable_file = $request->has('downloadable_file') ? ($request->input('downloadable_file') ? trim((string)$request->input('downloadable_file')) : null) : $product->downloadable_file;
        $product->meta_title = $request->has('meta_title') ? ($request->input('meta_title') ? trim((string)$request->input('meta_title')) : null) : $product->meta_title;
        $product->meta_description = $request->has('meta_description') ? ($request->input('meta_description') ? trim((string)$request->input('meta_description')) : null) : $product->meta_description;
        $product->seo_url_slug = $request->has('seo_url_slug') ? ($request->input('seo_url_slug') ? trim((string)$request->input('seo_url_slug')) : null) : $product->seo_url_slug;
        $product->variants = $request->has('variants') ? $request->variants : $product->variants;
        if ($request->has('variant_combinations')) {
            $combos = $request->variant_combinations ?? [];
            $product->variant_combinations = is_array($combos) ? \App\Models\Product::ensureVariantUuids($combos) : $combos;
        }
        $product->custom_fields = $request->has('custom_fields') ? $request->custom_fields : $product->custom_fields;
        $product->save();
    }

    /**
     * Bulk update products status (active/inactive).
     */
    public function bulkStatus(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);

        $ids = array_filter((array) $request->input('ids', []), fn ($id) => is_numeric($id));
        $ids = array_map('intval', $ids);

        if (empty($ids)) {
            return back()->with('error', __('No products selected.'));
        }

        $status = (string) $request->input('status', 'active');
        $newActive = $status === 'active';

        if ($newActive) {
            // Respect the plan's product limit when bulk-activating.
            $companyUser = $user->type === 'company' ? $user : $user->creator;
            if ($companyUser && $companyUser->plan) {
                $maxProducts = $companyUser->plan->max_products_per_store ?? 0;
                if ($maxProducts > 0) {
                    $activeProducts = Product::where('store_id', $currentStoreId)
                        ->where('is_active', true)
                        ->whereNotIn('id', $ids)
                        ->count();

                    if ($activeProducts >= $maxProducts) {
                        return redirect()->back()->with('error', __('Cannot activate products. You have reached your plan limit of :max products per store. Please upgrade your plan or deactivate some products first.', ['max' => $maxProducts]));
                    }
                }
            }
        }

        Product::where('store_id', $currentStoreId)
            ->whereIn('id', $ids)
            ->update(['is_active' => $newActive]);

        return redirect()
            ->route('products.index', $request->only(['search', 'category_id', 'status', 'sort', 'direction', 'per_page']))
            ->with('success', __(':count Product(s) updated successfully.', ['count' => count($ids)]));
    }

    /**
     * Remove the specified product from storage.
     */
    public function destroy(string $id)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);
        
         $product = Product::where('store_id', $currentStoreId)->findOrFail($id);
         $product->delete();
         
         return redirect()->route('products.index')->with('success', __('Product deleted successfully'));
    }

    /**
     * Delete multiple products at once.
     */
    public function destroyBulk(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);

        $ids = array_filter((array) $request->input('ids', []), fn ($id) => is_numeric($id));
        $ids = array_map('intval', $ids);

        if (empty($ids)) {
            return back()->with('error', __('No products selected.'));
        }

        $deleted = Product::where('store_id', $currentStoreId)
            ->whereIn('id', $ids)
            ->delete();

        return redirect()
            ->route('products.index', $request->only(['search', 'category_id', 'status', 'sort', 'direction', 'per_page']))
            ->with('success', __(':count Product(s) deleted successfully.', ['count' => $deleted]));
    }
    
    /**
     * Export products data as CSV.
     */
    public function export()
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);
        
        $products = Product::with('category')
                        ->where('store_id', $currentStoreId)
                        ->get();
        
        $csvData = [];
        $csvData[] = ['Product Name', 'SKU', 'Category', 'Price', 'Sale Price', 'Stock', 'Variants', 'Status', 'Created Date'];
        
        foreach ($products as $product) {
            $variantDetails = 'No variants';
            if ($product->variants && is_array($product->variants) && count($product->variants) > 0) {
                $variantList = [];
                foreach ($product->variants as $variant) {
                    if (is_array($variant) && isset($variant['name'])) {
                        $variantList[] = $variant['name'] . (isset($variant['price']) ? ' (' . formatStoreCurrency($variant['price'], $user->id, $currentStoreId) . ')' : '');
                    }
                }
                $variantDetails = implode('; ', $variantList);
            }
            
            $csvData[] = [
                $product->name,
                $product->sku ?: 'Not set',
                $product->category ? $product->category->name : 'Uncategorized',
                formatStoreCurrency($product->price, $user->id, $currentStoreId),
                $product->sale_price ? formatStoreCurrency($product->sale_price, $user->id, $currentStoreId) : 'Not set',
                $product->stock,
                $variantDetails,
                $product->is_active ? 'Active' : 'Inactive',
                $product->created_at->format('Y-m-d H:i:s')
            ];
        }
        
        $filename = 'products-export-' . now()->format('Y-m-d') . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];
        
        $callback = function() use ($csvData) {
            $file = fopen('php://output', 'w');
            foreach ($csvData as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };
        
        return response()->stream($callback, 200, $headers);
    }
}
