<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\WishlistRequest;
use App\Models\WishlistItem;
use App\Models\Product;
use App\Services\MerchantNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class WishlistController extends Controller
{
    /**
     * Reject a wishlist mutation whose product does not belong to the requested store.
     * Mirrors CartController ownership validation (422) without leaking the foreign
     * product's details.
     */
    private function rejectForeignProduct()
    {
        return response()->json(['message' => __('Product does not belong to this store.')], 422);
    }

    /**
     * Enforce store scope when an authoritative store is known (resolved
     * domain, customer membership, or session context). When no authority is
     * known the request is left to the existing per-store ownership checks.
     */
    private function storeScopeRejection(Request $request)
    {
        $authoritativeStoreId = getAuthoritativeStoreId($request);
        if ($authoritativeStoreId !== null && (int) $request->store_id !== $authoritativeStoreId) {
            return response()->json(['message' => 'Store not authorized.', 'error' => true], 403);
        }
        return null;
    }

    public function index(Request $request)
    {
        if ($rejected = $this->storeScopeRejection($request)) {
            return $rejected;
        }

        $storeId = $request->store_id;
        $query = WishlistItem::where('store_id', $storeId)
            ->with(['product.category']);
            
        if (Auth::guard('customer')->check()) {
            $query->where('customer_id', Auth::guard('customer')->id());
        } else {
            $query->where('session_id', session()->getId())
                  ->whereNull('customer_id');
        }
        
        $wishlistItems = $query->get();
        
        $formattedItems = $wishlistItems->map(function ($item) {
            return [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'name' => $item->product->name,
                'price' => $item->product->price,
                'sale_price' => $item->product->sale_price,
                'cover_image' => $item->product->cover_image,
                'stock' => $item->product->stock,
                'is_active' => $item->product->is_active,
                'variants' => is_string($item->product->variants) ? json_decode($item->product->variants, true) : ($item->product->variants ?? []),
                'category' => [
                    'id' => $item->product->category_id,
                    'name' => $item->product->category->name ?? 'Uncategorized'
                ]
            ];
        });
        
        return response()->json([
            'items' => $formattedItems,
            'count' => $wishlistItems->count()
        ]);
    }

    public function add(WishlistRequest $request)
    {
        if ($rejected = $this->storeScopeRejection($request)) {
            return $rejected;
        }

        $product = Product::find($request->product_id);

        if (! $product || (int) $product->store_id !== (int) $request->store_id) {
            return $this->rejectForeignProduct();
        }

        $whereConditions = [
            'store_id' => $request->store_id,
            'product_id' => $request->product_id
        ];
        
        if (Auth::guard('customer')->check()) {
            $whereConditions['customer_id'] = Auth::guard('customer')->id();
        } else {
            $whereConditions['session_id'] = session()->getId();
            $whereConditions['customer_id'] = null;
        }
        
        $existingItem = WishlistItem::where($whereConditions)->first();
        
        if ($existingItem) {
            return response()->json(['message' => 'Item already in wishlist'], 409);
        }
        
        $wishlistItem = WishlistItem::create([
            'store_id' => $request->store_id,
            'customer_id' => Auth::guard('customer')->check() ? Auth::guard('customer')->id() : null,
            'session_id' => session()->getId(),
            'product_id' => $request->product_id
        ]);

        // Merchant notification: new wishlist addition
        try {
            $product = Product::find($request->product_id);
            if ($product) {
                MerchantNotificationService::wishlistAdded($product);
            }
        } catch (\Throwable $e) {
            Log::warning('Wishlist merchant notification failed: ' . $e->getMessage());
        }
        
        return response()->json(['message' => 'Added to wishlist', 'item' => $wishlistItem]);
    }

    public function remove($id, Request $request)
    {
        if ($rejected = $this->storeScopeRejection($request)) {
            return $rejected;
        }

        $query = WishlistItem::where('store_id', $request->store_id);
        
        if (Auth::guard('customer')->check()) {
            $query->where('customer_id', Auth::guard('customer')->id());
        } else {
            $query->where('session_id', session()->getId())
                  ->whereNull('customer_id');
        }
        
        $wishlistItem = $query->findOrFail($id);
        $wishlistItem->delete();
        
        return response()->json(['message' => 'Item removed from wishlist']);
    }

    public function toggle(WishlistRequest $request)
    {
        if ($rejected = $this->storeScopeRejection($request)) {
            return $rejected;
        }

        $product = Product::find($request->product_id);

        if (! $product || (int) $product->store_id !== (int) $request->store_id) {
            return $this->rejectForeignProduct();
        }

        $whereConditions = [
            'store_id' => $request->store_id,
            'product_id' => $request->product_id
        ];
        
        if (Auth::guard('customer')->check()) {
            $whereConditions['customer_id'] = Auth::guard('customer')->id();
        } else {
            $whereConditions['session_id'] = session()->getId();
            $whereConditions['customer_id'] = null;
        }
        
        $existingItem = WishlistItem::where($whereConditions)->first();
        
        if ($existingItem) {
            $existingItem->delete();
            return response()->json(['message' => 'Removed from wishlist', 'action' => 'removed']);
        } else {
            WishlistItem::create([
                'store_id' => $request->store_id,
                'customer_id' => Auth::guard('customer')->check() ? Auth::guard('customer')->id() : null,
                'session_id' => session()->getId(),
                'product_id' => $request->product_id
            ]);

            // Merchant notification: new wishlist addition
            try {
                $product = Product::find($request->product_id);
                if ($product) {
                    MerchantNotificationService::wishlistAdded($product);
                }
            } catch (\Throwable $e) {
                Log::warning('Wishlist merchant notification failed: ' . $e->getMessage());
            }

            return response()->json(['message' => 'Added to wishlist', 'action' => 'added']);
        }
    }
}