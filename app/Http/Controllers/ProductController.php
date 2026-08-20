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
        $statsQuery = Product::where('store_id', $currentStoreId);
        $totalProducts = $statsQuery->count();
        $activeProducts = (clone $statsQuery)->where('is_active', true)->count();
        $lowStockProducts = (clone $statsQuery)->where('stock', '<', $lowStockThreshold)->count();
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
                $query->where('stock', '<', $lowStockThreshold);
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
        
        // Validation
        $request->validate([
            'name' => 'required|string|max:255',
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'specifications' => 'nullable|string',
            'details' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'low_stock_warning' => 'nullable|integer|min:0',
            'track_inventory' => 'nullable|boolean',
            'allow_backorder' => 'nullable|boolean',
            'cover_image' => 'required|string',
            'images' => 'nullable|string',
            'category_id' => 'required|exists:categories,id',
            'tax_id' => 'nullable|exists:taxes,id',
            'is_active' => 'nullable|boolean',
            'is_downloadable' => 'nullable|boolean',
            'downloadable_file' => 'nullable|string',
            'meta_title' => 'nullable|string|max:60',
            'meta_description' => 'nullable|string|max:160',
            'seo_url_slug' => 'nullable|string|max:191',
            'variants' => 'nullable|array',
            'variant_combinations' => 'nullable|array',
            'custom_fields' => 'nullable|array',
        ], [], [
            'name' => __('Product Name'),
            'sku' => __('SKU'),
            'category_id' => __('Category'),
            'cover_image' => __('Cover Image'),
            'price' => __('Price'),
            'stock' => __('Stock Quantity'),
        ]);
        
        $product = new Product();
        $product->name = $request->name;
        $product->sku = $request->sku;
        $product->barcode = $request->barcode;
        $product->description = $request->description;
        $product->short_description = $request->short_description;
        $product->specifications = $request->specifications;
        $product->details = $request->details;
        $product->price = $request->price;
        $product->sale_price = $request->sale_price;
        $product->stock = $request->stock;
        $product->low_stock_warning = $request->has('low_stock_warning') ? $request->low_stock_warning : ($product->low_stock_warning ?? 5);
        $product->track_inventory = $request->has('track_inventory') ? $request->track_inventory : true;
        $product->allow_backorder = $request->has('allow_backorder') ? $request->allow_backorder : false;
        $product->cover_image = $request->cover_image;
        $product->images = $request->images;
        $product->category_id = $request->category_id;
        $product->tax_id = $request->tax_id;
        $product->store_id = $currentStoreId;
        $product->is_active = $request->has('is_active') ? $request->is_active : true;
        $product->is_downloadable = $request->has('is_downloadable') ? $request->is_downloadable : false;
        $product->downloadable_file = $request->downloadable_file;
        $product->meta_title = $request->meta_title;
        $product->meta_description = $request->meta_description;
        $product->seo_url_slug = $request->seo_url_slug;
        $product->variants = $request->variants;
        $product->variant_combinations = $request->variant_combinations;
        $product->custom_fields = $request->custom_fields;
        $product->save();
        
        // Dispatch ProductCreated event for webhooks
        event(new \App\Events\ProductCreated($product));
        
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
        
        // Calculate dynamic stats for the product
        $orderItems = \App\Models\OrderItem::where('product_id', $product->id)->get();
        
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
        
        // Validation
        $request->validate([
            'name' => 'required|string|max:255',
            'sku' => 'nullable|string|max:100',
            'barcode' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'short_description' => 'nullable|string|max:500',
            'specifications' => 'nullable|string',
            'details' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'low_stock_warning' => 'nullable|integer|min:0',
            'track_inventory' => 'nullable|boolean',
            'allow_backorder' => 'nullable|boolean',
            'cover_image' => 'required|string',
            'images' => 'nullable|string',
            'category_id' => 'required|exists:categories,id',
            'tax_id' => 'nullable|exists:taxes,id',
            'is_active' => 'nullable|boolean',
            'is_downloadable' => 'nullable|boolean',
            'downloadable_file' => 'nullable|string',
            'meta_title' => 'nullable|string|max:60',
            'meta_description' => 'nullable|string|max:160',
            'seo_url_slug' => 'nullable|string|max:191',
            'variants' => 'nullable|array',
            'variant_combinations' => 'nullable|array',
            'custom_fields' => 'nullable|array',
        ], [], [
            'name' => __('Product Name'),
            'sku' => __('SKU'),
            'category_id' => __('Category'),
            'cover_image' => __('Cover Image'),
            'price' => __('Price'),
            'stock' => __('Stock Quantity'),
        ]);
        
        // Check if trying to activate product
        $newIsActive = $request->has('is_active') ? $request->is_active : $product->is_active;
        if ($newIsActive && !$product->is_active) {
            // Product is being activated, check plan limits
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
        
        $product->name = $request->name;
        $product->sku = $request->sku;
        $product->barcode = $request->barcode;
        $product->description = $request->description ?? $product->description;
        $product->short_description = $request->short_description ?? $product->short_description;
        $product->specifications = $request->specifications ?? $product->specifications;
        $product->details = $request->details ?? $product->details;
        $product->price = $request->price;
        $product->sale_price = $request->sale_price;
        $product->stock = $request->stock;
        $product->low_stock_warning = $request->has('low_stock_warning') ? $request->low_stock_warning : ($product->low_stock_warning ?? 5);
        $product->track_inventory = $request->has('track_inventory') ? $request->track_inventory : true;
        $product->allow_backorder = $request->has('allow_backorder') ? $request->allow_backorder : false;
        $product->cover_image = $request->cover_image;
        $product->images = $request->images;
        $product->category_id = $request->category_id;
        $product->tax_id = $request->tax_id;
        $product->is_active = $newIsActive;
        $product->is_downloadable = $request->has('is_downloadable') ? $request->is_downloadable : $product->is_downloadable;
        $product->downloadable_file = $request->downloadable_file;
        $product->meta_title = $request->meta_title;
        $product->meta_description = $request->meta_description;
        $product->seo_url_slug = $request->seo_url_slug;
        $product->variants = $request->variants;
        $product->variant_combinations = $request->variant_combinations;
        $product->custom_fields = $request->custom_fields;
        $product->save();
        
        return redirect()->route('products.index')->with('success', __('Product updated successfully'));
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
