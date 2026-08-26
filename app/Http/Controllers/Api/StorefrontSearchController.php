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
            'q' => 'nullable|string|max:100',
            'store_id' => 'nullable|integer|exists:stores,id',
            'storeSlug' => 'nullable|string',
            'limit' => 'nullable|integer|min:1|max:20',
        ]);

        $raw = trim((string) $request->input('q', ''));
        if ($raw === '' || mb_strlen($raw) < 2) {
            return response()->json(['products' => [], 'query' => $raw]);
        }
        // Normalize whitespace, limit length
        $q = mb_substr(preg_replace('/\s+/', ' ', $raw), 0, 100);
        $limit = (int) ($request->input('limit', 10));
        $limit = max(1, min($limit, 20));

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

        $products = Product::where('store_id', $storeId)
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
            })
            ->with('category')
            ->orderBy('name')
            ->limit($limit)
            ->get()
            ->map(function ($product) {
                $hasSale = $product->hasEffectiveSale();
                // Variant-aware price for search: show base effectivePrice (variant selection not in search)
                return [
                    'id' => (string) $product->id,
                    'name' => $product->name,
                    'slug' => $product->seo_url_slug ?: $product->id,
                    'image' => $product->cover_image ?: null,
                    'price' => $hasSale ? (float) $product->sale_price : (float) $product->price,
                    'originalPrice' => $hasSale ? (float) $product->price : null,
                    'availability' => $product->availabilityStatus(),
                    'category' => $product->category ? $product->category->name : null,
                    'categoryId' => $product->category_id ? (string) $product->category_id : null,
                    'sku' => $product->sku,
                    'url' => '/product/' . $product->id,
                ];
            })->values();

        return response()->json(['products' => $products, 'query' => $q, 'count' => $products->count()]);
    }
}
