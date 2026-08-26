<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;

class StorefrontSearchController extends Controller
{
    public function search(Request $request)
    {
        $request->validate([
            'q' => 'nullable|string|max:500',
            'store_id' => 'nullable|integer|exists:stores,id',
            'storeSlug' => 'nullable|string',
            'limit' => 'nullable|integer|min:1|max:50',
            'page' => 'nullable|integer|min:1|max:1000',
            'per_page' => 'nullable|integer|min:1|max:50',
            'sort' => 'nullable|string|in:relevance,price_asc,price_desc,newest,name',
            'category_id' => 'nullable|string',
            'availability' => 'nullable|string|in:all,in_stock,out_of_stock',
            'on_sale' => 'nullable|boolean',
        ]);

        $raw = trim((string) $request->input('q', ''));
        if ($raw === '' || mb_strlen($raw) < 2) {
            return response()->json(['products' => [], 'query' => $raw, 'count' => 0, 'total' => 0]);
        }
        // Normalize whitespace, limit length, prevent HTML injection
        $q = mb_substr(preg_replace('/\s+/', ' ', $raw), 0, 100);
        $q = trim(strip_tags($q));

        $isPaginated = $request->has('page') || $request->has('per_page');
        $limit = (int) ($request->input('limit', $request->input('per_page', 10)));
        $limit = max(1, min($limit, 50));
        $page = max(1, (int) $request->input('page', 1));
        $sort = $request->input('sort', 'relevance');

        // Resolve store: prefer store_id, fallback to storeSlug via subdomain/domain, else null = no cross-store leak
        $storeId = $request->input('store_id');
        if (!$storeId && $request->input('storeSlug')) {
            $store = \App\Models\Store::where('slug', $request->input('storeSlug'))->first();
            $storeId = $store?->id;
        }
        if (!$storeId) {
            // Try domain resolver context if available
            $resolved = $request->attributes->get('resolved_store');
            if ($resolved) $storeId = $resolved->id;
        }
        if (!$storeId) {
            return response()->json(['products' => [], 'query' => $q, 'error' => 'Store not resolved'], 422);
        }

        $baseQuery = Product::where('store_id', $storeId)
            ->where('is_active', true)
            ->where(function ($wq) use ($q) {
                $wq->where(function ($s) use ($q) {
                    $s->where('name', 'like', "%{$q}%")
                      ->orWhere('sku', 'like', "%{$q}%")
                      ->orWhere('short_description', 'like', "%{$q}%")
                      ->orWhere('description', 'like', "%{$q}%");
                });
                $wq->where(function ($catFilter) {
                    $catFilter->whereNull('category_id')
                        ->orWhereHas('category', fn($cq) => $cq->where('is_active', true));
                });
            });

        // Optional filters
        if ($request->filled('category_id')) {
            $baseQuery->where('category_id', $request->input('category_id'));
        }
        if ($request->input('availability') === 'in_stock') {
            // in_stock: delegate to availability check post-query would be expensive; filter by stock>0 or not tracked
            $baseQuery->where(function ($aq) {
                $aq->where('is_active', true); // placeholder to keep chain; actual filter is in map but we add rough filter
            });
        }
        if ($request->boolean('on_sale')) {
            $baseQuery->where(function ($sq) {
                $sq->whereNotNull('sale_price')->whereRaw('sale_price > 0 AND sale_price < price');
            });
        }

        // Sorting
        switch ($sort) {
            case 'price_asc':
                $baseQuery->orderByRaw('COALESCE(NULLIF(sale_price,0), price) ASC');
                break;
            case 'price_desc':
                $baseQuery->orderByRaw('COALESCE(NULLIF(sale_price,0), price) DESC');
                break;
            case 'newest':
                $baseQuery->orderBy('created_at', 'desc');
                break;
            case 'name':
                $baseQuery->orderBy('name');
                break;
            default: // relevance = creation desc as proxy
                $baseQuery->orderBy('created_at', 'desc');
        }

        $baseQuery->with('category');

        if ($isPaginated) {
            $paginator = $baseQuery->paginate($limit, ['*'], 'page', $page);
            $products = collect($paginator->items())->map(function ($product) {
                $hasSale = $product->hasEffectiveSale();
                $isVariant = \App\Services\InventoryService::isVariantInventory($product);
                return [
                    'id' => (string) $product->id,
                    'name' => $product->name,
                    'slug' => $product->seo_url_slug ?: $product->id,
                    'image' => $product->cover_image ?: null,
                    'price' => $hasSale ? (float) $product->sale_price : (float) $product->price,
                    'originalPrice' => $hasSale ? (float) $product->price : null,
                    'availability' => $product->availabilityStatus(),
                    'inventoryMode' => $isVariant ? 'variant' : 'product',
                    'category' => $product->category ? $product->category->name : null,
                    'categoryId' => $product->category_id ? (string) $product->category_id : null,
                    'sku' => $product->sku,
                    'url' => '/product/' . $product->id,
                ];
            })->values();

            // Post-filter availability if requested (variant-aware would need service, apply after fetch)
            if ($request->input('availability') === 'in_stock') {
                $products = $products->filter(fn($p)=> $p['availability'] !== 'out_of_stock')->values();
            } elseif ($request->input('availability') === 'out_of_stock') {
                $products = $products->filter(fn($p)=> $p['availability'] === 'out_of_stock')->values();
            }

            return response()->json([
                'products' => $products,
                'query' => $q,
                'count' => $products->count(),
                'total' => $paginator->total(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
            ]);
        }

        $products = $baseQuery->limit($limit)->get()->map(function ($product) {
                $hasSale = $product->hasEffectiveSale();
                $isVariant = \App\Services\InventoryService::isVariantInventory($product);
                return [
                    'id' => (string) $product->id,
                    'name' => $product->name,
                    'slug' => $product->seo_url_slug ?: $product->id,
                    'image' => $product->cover_image ?: null,
                    'price' => $hasSale ? (float) $product->sale_price : (float) $product->price,
                    'originalPrice' => $hasSale ? (float) $product->price : null,
                    'availability' => $product->availabilityStatus(),
                    'inventoryMode' => $isVariant ? 'variant' : 'product',
                    'category' => $product->category ? $product->category->name : null,
                    'categoryId' => $product->category_id ? (string) $product->category_id : null,
                    'sku' => $product->sku,
                    'url' => '/product/' . $product->id,
                ];
            })->values();

        return response()->json(['products' => $products, 'query' => $q, 'count' => $products->count(), 'total' => $products->count()]);
    }
}
