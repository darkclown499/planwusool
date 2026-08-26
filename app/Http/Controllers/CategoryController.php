<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class CategoryController extends Controller
{
    /**
     * Display a listing of the categories. Now validates storeId explicitly and
     * returns fallback UI instead of 500 when storeId is missing or query fails.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        // Prefer explicit store param (for /stores/{store}/categories) then current store context
        $paramStoreId = $request->route('store') ? (int) $request->route('store') : null;
        $currentStoreId = $paramStoreId ?: getCurrentStoreId($user);

        // Explicit validation for storeId
        if (empty($currentStoreId) || !is_numeric($currentStoreId)) {
            return Inertia::render('categories/index', [
                'categories' => [],
                'stats' => ['total' => 0, 'active' => 0, 'parent' => 0, 'sub' => 0],
                'warning' => __('Store not selected or invalid. Please select a store.'),
            ]);
        }

        try {
            // Verify store belongs to user (or superadmin) — avoid leaking other stores
            if (!Auth::user()?->isSuperAdmin() && !Auth::user()?->isAdmin()) {
                $owns = \App\Models\Store::where('id', $currentStoreId)->where('user_id', $user->id)->exists();
                $hasBusiness = $user->businesses?->contains('id', (int) $currentStoreId);
                if (!$owns && !$hasBusiness) {
                    return Inertia::render('categories/index', [
                        'categories' => [],
                        'stats' => ['total' => 0, 'active' => 0, 'parent' => 0, 'sub' => 0],
                        'warning' => __('You do not have access to this store.'),
                    ]);
                }
            }

            $categories = Category::with('parent')
                ->withCount('products')
                ->where('store_id', $currentStoreId)
                ->orderBy('sort_order')->orderBy('id')
                ->get();

            $totalCategories = $categories->count();
            $activeCategories = $categories->where('is_active', true)->count();
            $parentCategories = $categories->whereNull('parent_id')->count();
            $subCategories = $categories->whereNotNull('parent_id')->count();

            return Inertia::render('categories/index', [
                'categories' => $categories,
                'stats' => [
                    'total' => $totalCategories,
                    'active' => $activeCategories,
                    'parent' => $parentCategories,
                    'sub' => $subCategories
                ]
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Categories index failed: ' . $e->getMessage(), ['store_id' => $currentStoreId, 'exception' => $e]);
            return Inertia::render('categories/index', [
                'categories' => [],
                'stats' => ['total' => 0, 'active' => 0, 'parent' => 0, 'sub' => 0],
                'warning' => __('Failed to load categories. Please try again.'),
            ]);
        }
    }

    /**
     * API: GET /api/categories?storeId= — explicit storeId validation with try-catch fallback.
     */
    public function apiIndex(Request $request)
    {
        if (!Auth::check()) {
            return response()->json(['categories' => [], 'error' => 'Unauthenticated'], 401);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'storeId' => 'nullable|integer|exists:stores,id',
            'store_id' => 'nullable|integer|exists:stores,id',
        ]);
        if ($validator->fails()) {
            return response()->json(['categories' => [], 'error' => 'Invalid storeId'], 422);
        }
        $storeId = $request->input('storeId') ?? $request->input('store_id') ?? getCurrentStoreId(Auth::user());
        if (empty($storeId)) {
            return response()->json(['categories' => [], 'warning' => 'Missing storeId'], 200);
        }
        try {
            $categories = Category::with('parent')
                ->withCount('products')
                ->where('store_id', $storeId)
                ->get();
            return response()->json(['categories' => $categories]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('API categories failed: ' . $e->getMessage(), ['store_id' => $storeId]);
            return response()->json(['categories' => [], 'error' => 'Failed to load categories'], 200);
        }
    }

    /**
     * Show the form for creating a new category.
     */
    public function create()
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);
        
        // Get all categories for dropdown (for parent selection) — ordered deterministically
        $parentCategories = Category::where('store_id', $currentStoreId)
                                   ->orderBy('sort_order')
                                   ->orderBy('name')
                                   ->get();
        
        return Inertia::render('categories/create', [
            'parentCategories' => $parentCategories
        ]);
    }

    /**
     * Validate that parent_id belongs to the same store, is not self, does not create a cycle,
     * and respects the supported depth (Parent -> Child only, depth 1).
     */
    private function validateParent(?int $parentId, int $storeId, ?int $selfId = null): ?string
    {
        if ($parentId === null) return null;
        if ($selfId !== null && $parentId === $selfId) {
            return __('Category parent cannot be itself.');
        }
        $parent = Category::where('id', $parentId)->where('store_id', $storeId)->first();
        if (!$parent) {
            return __('Selected parent category is invalid or belongs to another store.');
        }
        // Enforce depth 1: parent must be a root category (parent_id null)
        if ($parent->parent_id !== null) {
            return __('Subcategory nesting is limited to one level. Select a root category as parent.');
        }
        // Cycle detection: walk ancestors of parent; if self appears, reject
        if ($selfId !== null) {
            $seen = [];
            $current = $parent;
            while ($current) {
                if (in_array($current->id, $seen, true)) break; // safety against existing loop
                if ((int)$current->id === (int)$selfId) {
                    return __('Circular category hierarchy detected.');
                }
                $seen[] = $current->id;
                $current = $current->parent_id ? Category::find($current->parent_id) : null;
                // Ensure ancestor is within same store
                if ($current && (int)$current->store_id !== $storeId) break;
            }
            // Also prevent descendants cycle: ensure no descendant already points to self through chain
            $descendants = $this->collectDescendantIds($selfId, $storeId);
            if (in_array($parentId, $descendants, true)) {
                return __('Circular category hierarchy detected.');
            }
        }
        return null;
    }

    private function collectDescendantIds(int $categoryId, int $storeId): array
    {
        $ids = [];
        $queue = [$categoryId];
        $visited = [];
        while ($queue) {
            $cur = array_shift($queue);
            if (in_array($cur, $visited, true)) continue;
            $visited[] = $cur;
            $children = Category::where('parent_id', $cur)->where('store_id', $storeId)->pluck('id')->all();
            foreach ($children as $cid) {
                $ids[] = (int)$cid;
                $queue[] = (int)$cid;
            }
        }
        return $ids;
    }

    /**
     * Store a newly created category in storage.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);
        
        if (empty($currentStoreId)) {
            return redirect()->back()->with('error', __('Store not selected.'));
        }

        if ($request->input('parent_id') === 'none' || $request->input('parent_id') === '') {
            $request->merge(['parent_id' => null]);
        }

        // Trim name and reject whitespace-only
        $rawName = $request->input('name');
        $trimmedName = is_string($rawName) ? trim($rawName) : $rawName;
        $request->merge(['name' => $trimmedName]);

        // Normalize sort_order
        if ($request->has('sort_order') && $request->input('sort_order') !== null && $request->input('sort_order') !== '') {
            $request->merge(['sort_order' => (int)$request->input('sort_order')]);
        } else {
            $request->merge(['sort_order' => 0]);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'image' => 'nullable|string|max:2048',
            'parent_id' => 'nullable|integer|exists:categories,id',
            'sort_order' => 'nullable|integer|min:-9999|max:9999',
            'is_active' => 'nullable|boolean'
        ], [], [
            'name' => __('Category Name'),
        ]);

        // Additional strict checks: whitespace-only already handled via trim+required, but double-guard
        if ($trimmedName === '' || $trimmedName === null) {
            return redirect()->back()->withErrors(['name' => __('Category name cannot be empty.')])->withInput();
        }

        // Cross-store parent check + depth + cycle
        $parentId = $request->input('parent_id') !== null ? (int)$request->input('parent_id') : null;
        if ($error = $this->validateParent($parentId, (int)$currentStoreId, null)) {
            return redirect()->back()->withErrors(['parent_id' => $error])->withInput();
        }

        // Image safety: reject path traversal / script
        $image = $request->input('image');
        if (is_string($image) && $image !== '') {
            if (str_contains($image, '..') || str_contains($image, '<script') || str_contains($image, 'javascript:')) {
                return redirect()->back()->withErrors(['image' => __('Invalid image path.')])->withInput();
            }
        }

        // Generate a unique slug for this store
        $slug = Category::generateUniqueSlug($trimmedName, $currentStoreId);
        
        $category = new Category();
        $category->name = $trimmedName;
        $category->slug = $slug;
        $category->description = $request->input('description') !== null ? trim((string)$request->input('description')) : null;
        $category->image = $image ?: null;
        $category->parent_id = $parentId;
        $category->store_id = $currentStoreId;
        $category->sort_order = (int)($request->input('sort_order') ?? 0);
        $category->is_active = $request->has('is_active') ? (bool)$request->input('is_active') : true;
        $category->save();

        return redirect()->route('categories.index')->with('success', __('Category created successfully'));
    }

    /**
     * Create a category inline (from the product page) and return JSON so the
     * frontend can insert it into the picker without leaving the form.
     */
    public function inlineStore(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);

        if (empty($currentStoreId)) {
            return response()->json(['success' => false, 'error' => __('Store not selected.')], 422);
        }

        $rawName = $request->input('name');
        $trimmed = is_string($rawName) ? trim($rawName) : $rawName;
        $request->merge(['name' => $trimmed]);

        $request->validate([
            'name' => 'required|string|max:255',
        ], [], [
            'name' => __('Category Name'),
        ]);

        if ($trimmed === '' || $trimmed === null) {
            return response()->json(['success' => false, 'error' => __('Category name cannot be empty.')], 422);
        }

        $category = new Category();
        $category->name = $trimmed;
        $category->slug = Category::generateUniqueSlug($trimmed, $currentStoreId);
        $category->description = null;
        $category->parent_id = null;
        $category->store_id = $currentStoreId;
        $category->sort_order = 0;
        $category->is_active = true;
        $category->save();

        return response()->json([
            'success' => true,
            'category' => $category->only(['id', 'name']),
            'categories' => Category::where('store_id', $currentStoreId)
                ->orderBy('sort_order')->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    /**
     * Display the specified category.
     */
    public function show(string $id)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);
        
        $category = Category::with('parent')
                          ->where('store_id', $currentStoreId)
                          ->findOrFail($id);
        
        // Get subcategories with product counts
        $subcategories = Category::where('parent_id', $category->id)
                               ->where('store_id', $currentStoreId)
                               ->withCount('products')
                               ->get();
        
        // Get product count for this category
        $productCount = \App\Models\Product::where('category_id', $category->id)
                                          ->where('store_id', $currentStoreId)
                                          ->count();
        
        // Calculate total revenue from products in this category
        $categoryProducts = \App\Models\Product::where('category_id', $category->id)
                                              ->where('store_id', $currentStoreId)
                                              ->pluck('id');
        
        $totalRevenue = \App\Models\OrderItem::whereIn('product_id', $categoryProducts)
                                            ->whereHas('order', fn($q) => $q->where('store_id', $currentStoreId))
                                            ->sum('total_price');
        
        $stats = [
            'total_products' => $productCount,
            'subcategories_count' => $subcategories->count(),
            'total_revenue' => $totalRevenue,
            'active_products' => \App\Models\Product::where('category_id', $category->id)
                                                   ->where('store_id', $currentStoreId)
                                                   ->where('is_active', true)
                                                   ->count(),
        ];
        
        // Format revenue for display
        $stats['formatted_revenue'] = formatStoreCurrency($totalRevenue, $user->id, $currentStoreId);
        
        return Inertia::render('categories/show', [
            'category' => $category,
            'subcategories' => $subcategories,
            'productCount' => $productCount,
            'stats' => $stats
        ]);
    }

    /**
     * Show the form for editing the specified category.
     */
    public function edit(string $id)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);
        
        $category = Category::where('store_id', $currentStoreId)->findOrFail($id);
        
        // Get parent candidates: root categories only, ordered, excluding self and descendants
        $descendantIds = $this->collectDescendantIds((int)$id, (int)$currentStoreId);
        $parentCategories = Category::where('store_id', $currentStoreId)
                                   ->where('id', '!=', $id)
                                   ->whereNotIn('id', $descendantIds)
                                   ->whereNull('parent_id')
                                   ->orderBy('sort_order')->orderBy('name')
                                   ->get();
        
        return Inertia::render('categories/edit', [
            'category' => $category,
            'parentCategories' => $parentCategories
        ]);
    }

    /**
     * Update the specified category in storage.
     */
    public function update(Request $request, string $id)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);
        
        $category = Category::where('store_id', $currentStoreId)->findOrFail($id);
        
        if ($request->input('parent_id') === 'none' || $request->input('parent_id') === '') {
            $request->merge(['parent_id' => null]);
        }

        $rawName = $request->input('name');
        $trimmedName = is_string($rawName) ? trim($rawName) : $rawName;
        $request->merge(['name' => $trimmedName]);

        if ($request->has('sort_order') && $request->input('sort_order') !== null && $request->input('sort_order') !== '') {
            $request->merge(['sort_order' => (int)$request->input('sort_order')]);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'image' => 'nullable|string|max:2048',
            'parent_id' => 'nullable|integer|exists:categories,id',
            'sort_order' => 'nullable|integer|min:-9999|max:9999',
            'is_active' => 'nullable|boolean'
        ], [], [
            'name' => __('Category Name'),
        ]);

        if ($trimmedName === '' || $trimmedName === null) {
            return redirect()->back()->withErrors(['name' => __('Category name cannot be empty.')])->withInput();
        }

        $parentId = $request->input('parent_id') !== null ? (int)$request->input('parent_id') : null;
        if ($error = $this->validateParent($parentId, (int)$currentStoreId, (int)$category->id)) {
            return redirect()->back()->withErrors(['parent_id' => $error])->withInput();
        }

        $image = $request->input('image');
        if (is_string($image) && $image !== '') {
            if (str_contains($image, '..') || str_contains($image, '<script') || str_contains($image, 'javascript:')) {
                return redirect()->back()->withErrors(['image' => __('Invalid image path.')])->withInput();
            }
        }

        // Check if name changed, if so, update slug (ensure store-scoped uniqueness excluding self)
        if ($category->name !== $trimmedName) {
            $category->slug = Category::generateUniqueSlug($trimmedName, $currentStoreId, (int)$category->id);
        }
        
        $category->name = $trimmedName;
        $category->description = $request->input('description') !== null ? trim((string)$request->input('description')) : null;
        $category->image = $image ?: null;
        $category->parent_id = $parentId;
        $category->sort_order = $request->has('sort_order') && $request->input('sort_order') !== null ? (int)$request->input('sort_order') : $category->sort_order;
        // Handle is_active: checkbox sends boolean, but Inertia may send true/false; preserve
        if ($request->has('is_active')) {
            $category->is_active = (bool)$request->input('is_active');
        }
        $category->save();

        return redirect()->route('categories.index')->with('success', __('Category updated successfully'));
    }

    /**
     * Remove the specified category from storage.
     */
    public function destroy(string $id)
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);
        
        $category = Category::where('store_id', $currentStoreId)->findOrFail($id);
        
        // Check if category has subcategories (store-scoped)
        $hasSubcategories = Category::where('parent_id', $id)->where('store_id', $currentStoreId)->exists();
        
        if ($hasSubcategories) {
            return redirect()->back()->with('error', __('Cannot delete category with subcategories'));
        }
        
        // Check if category has products (store-scoped)
        if ($category->products()->where('store_id', $currentStoreId)->exists()) {
            return redirect()->back()->with('error', __('Cannot delete category with products'));
        }
        
        $category->delete();

        return redirect()->route('categories.index')->with('success', __('Category deleted successfully'));
    }
    
    /**
     * Export categories data as CSV.
     */
    public function export()
    {
        $user = Auth::user();
        $currentStoreId = getCurrentStoreId($user);
        
        $categories = Category::with('parent')
                            ->where('store_id', $currentStoreId)
                            ->get();
        
        $csvData = [];
        $csvData[] = ['Category Name', 'Slug', 'Parent Category', 'Description', 'Sort Order', 'Status', 'Created Date'];
        
        foreach ($categories as $category) {
            $csvData[] = [
                $category->name,
                $category->slug,
                $category->parent ? $category->parent->name : 'Root Category',
                $category->description ?: 'No description',
                $category->sort_order,
                $category->is_active ? 'Active' : 'Inactive',
                $category->created_at->format('Y-m-d H:i:s')
            ];
        }
        
        $filename = 'categories-export-' . now()->format('Y-m-d') . '.csv';
        
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
