<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CartItem;
use App\Models\Product;
use App\Services\CartCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CartController extends Controller
{
    public function index(Request $request)
    {
        $storeId = $request->store_id;
        $calculation = CartCalculationService::calculateCartTotals(
            $storeId, 
            session()->getId(),
            $request->coupon_code,
            $request->shipping_id
        );
        
        $formattedItems = $calculation['items']->map(function ($item) {
            return [
                'id' => $item->id,
                'product_id' => (string) $item->product_id,
                'name' => $item->product->name,
                'price' => $item->product->sale_price ? (float) $item->product->sale_price : (float) $item->product->price,
                'originalPrice' => $item->product->sale_price ? (float) $item->product->price : null,
                'image' => $item->product->cover_image ? $item->product->cover_image : asset('public/images/avatar/avatar.png'),
                'images' => $item->product->images ? (is_array($item->product->images) ? $item->product->images : (strpos($item->product->images, ',') !== false ? explode(',', $item->product->images) : json_decode($item->product->images, true))) : null,
                'categoryId' => (string) $item->product->category_id,
                'category' => $item->product->category ? $item->product->category->name : 'Uncategorized',
                'availability' => $item->product->stock > 0 ? 'in_stock' : 'out_of_stock',
                'sku' => $item->product->sku ?: 'SKU-' . $item->product->id,
                'stockQuantity' => (int) $item->product->stock,
                'description' => $item->product->description,
                'variants' => $item->variants ? (is_array($item->variants) ? $item->variants : json_decode($item->variants, true)) : null,
                'customFields' => $item->product->custom_fields ? (is_array($item->product->custom_fields) ? $item->product->custom_fields : json_decode($item->product->custom_fields, true)) : null,
                'taxName' =>$item->product->tax->name ?? null,
                'taxPercentage' =>$item->product->tax->rate ?? null,
                'quantity' => $item->quantity,
                'total' => $item->total,
            ];
        });
        
        return response()->json([
            'items' => $formattedItems,
            'count' => $calculation['items']->sum('quantity'),
            'subtotal' => $calculation['subtotal'],
            'discount' => $calculation['discount'],
            'shipping' => $calculation['shipping'],
            'tax' => $calculation['tax'],
            'total' => $calculation['total']
        ]);
    }

    public function add(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'variants' => 'nullable|array'
        ]);
        $product = Product::findOrFail($request->product_id);
        // Fix variants structure
        $variants = $request->variants;
        if (isset($variants['variants'])) {
            $variants = $variants['variants'];
        }
        
        $whereConditions = [
            'store_id' => $request->store_id,
            'product_id' => $request->product_id,
            'variants' => json_encode($variants)
        ];
        
        if (Auth::guard('customer')->check()) {
            $whereConditions['customer_id'] = Auth::guard('customer')->id();
        } else {
            $whereConditions['session_id'] = session()->getId();
            $whereConditions['customer_id'] = null;
        }
        
        $existingItem = CartItem::where($whereConditions)->first();
        if ($existingItem) {
            $existingItem->increment('quantity', $request->quantity);
            $cartItem = $existingItem;
        } else {
            $cartItem = CartItem::create([
                'store_id' => $request->store_id,
                'customer_id' => Auth::guard('customer')->check() ? Auth::guard('customer')->id() : null,
                'session_id' => session()->getId(),
                'product_id' => $request->product_id,
                'quantity' => $request->quantity,
                'variants' => json_encode($variants),
                'price' => $product->sale_price ?? $product->price
            ]);
        }
        return response()->json(['message' => 'Added to cart', 'item' => $cartItem]);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'quantity' => 'required|integer|min:1',
            'store_id' => 'required|exists:stores,id'
        ]);
        
        $cartItem = $this->getCartItems($request->store_id, $request)->findOrFail($id);
        $cartItem->update(['quantity' => $request->quantity]);
        
        return response()->json(['message' => 'Cart updated', 'item' => $cartItem]);
    }

    public function remove($id, Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id'
        ]);
        
        $cartItem = $this->getCartItems($request->store_id, $request)->findOrFail($id);
        $cartItem->delete();
        
        return response()->json(['message' => 'Item removed']);
    }

    public function sync(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
            'guest_session_id' => 'nullable|string',
            'items' => 'required|array'
        ]);

        $sessionId = $request->guest_session_id ?: session()->getId();

        // Update guest cart items to assign them to the logged-in customer
        CartItem::where('store_id', $request->store_id)
            ->where('session_id', $sessionId)
            ->whereNull('customer_id')
            ->update(['customer_id' => Auth::guard('customer')->id()]);

        return response()->json(['message' => 'Cart synced']);
    }

    private function getCartItems($storeId, $request)
    {
        $query = CartItem::where('store_id', $storeId);
        
        if (Auth::guard('customer')->check()) {
            $query->where('customer_id', Auth::guard('customer')->id());
        } else {
            $query->where('session_id', session()->getId())
                  ->whereNull('customer_id');
        }
        
        return $query;
    }
}