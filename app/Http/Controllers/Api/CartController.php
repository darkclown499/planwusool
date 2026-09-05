<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AddToCartRequest;
use App\Http\Requests\Api\UpdateCartRequest;
use App\Http\Requests\Api\CartStoreRequest;
use App\Models\CartItem;
use App\Models\Product;
use App\Services\AbandonedCartService;
use App\Services\CartCalculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CartController extends Controller
{
    protected $abandonedCartService;

    public function __construct(AbandonedCartService $abandonedCartService)
    {
        $this->abandonedCartService = $abandonedCartService;
    }

    /**
     * Enforce store scope when an authoritative store is known (resolved
     * domain, customer membership, or session context). When no authority is
     * known the request is left to the existing per-store ownership checks.
     */
    private function storeScopeRejection(Request $request): ?\Illuminate\Http\JsonResponse
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
        $calculation = CartCalculationService::calculateCartTotals(
            $storeId, 
            session()->getId(),
            $request->coupon_code,
            $request->shipping_id
        );
        
        $formattedItems = $calculation['items']->map(function ($item) {
            $variantSel = $item->variants ? (is_string($item->variants) ? json_decode($item->variants, true) : $item->variants) : null;
            $hasVariantPrice = false;
            $variantPrice = null;
            $resolvedInventory = null;
            if (method_exists($item->product, 'resolveVariantCombination')) {
                $combo = $item->product->resolveVariantCombination($variantSel);
                if ($combo && isset($combo['price']) && $combo['price'] !== '' && (float)$combo['price'] > 0) { $hasVariantPrice = true; $variantPrice = (float)$combo['price']; }
            }
            // Canonical variant-aware availability: specific combination if variant, else product
            $inv = null;
            if (method_exists(\App\Services\InventoryService::class, 'resolve')) {
                try { $inv = \App\Services\InventoryService::resolve($item->product, $variantSel); } catch (\Throwable $e) {}
            }
            if ($hasVariantPrice) {
                $price = $variantPrice; $originalPrice = null;
            } else {
                $hasSale = method_exists($item->product, 'hasEffectiveSale') ? $item->product->hasEffectiveSale() : (!empty($item->product->sale_price) && (float)$item->product->sale_price < (float)$item->product->price);
                $price = $hasSale ? (float) $item->product->sale_price : (float) $item->product->price;
                $originalPrice = $hasSale ? (float) $item->product->price : null;
            }
            // Determine per-item availability and stockQuantity from inventory resolver
            $availability = 'in_stock';
            $stockQty = (int) $item->product->stock;
            if ($inv) {
                if (!$inv['tracking'] || $inv['backorder']) {
                    $availability = 'in_stock';
                    $stockQty = $inv['available_qty'] !== null ? (int)$inv['available_qty'] : $stockQty;
                } else {
                    $availability = $inv['purchasable'] ? 'in_stock' : 'out_of_stock';
                    $stockQty = $inv['available_qty'] !== null ? (int)$inv['available_qty'] : $stockQty;
                }
            } else {
                $availability = method_exists($item->product, 'availabilityStatus') ? $item->product->availabilityStatus() : ($item->product->stock > 0 ? 'in_stock' : 'out_of_stock');
            }
            $resolvedSku = $item->product->sku ?: 'SKU-' . $item->product->id;
            if ($inv && !empty($inv['combination']['sku'])) $resolvedSku = $inv['combination']['sku'];
            elseif (isset($combo['sku']) && $combo['sku'] !== '') $resolvedSku = $combo['sku'];
            return [
                'id' => $item->id,
                'product_id' => (string) $item->product_id,
                'name' => $item->product->name,
                'price' => $price,
                'originalPrice' => $originalPrice,
                'image' => $item->product->cover_image ? $item->product->cover_image : asset('images/avatar/avatar.png'),
                'images' => $item->product->images ? (is_array($item->product->images) ? $item->product->images : (strpos($item->product->images, ',') !== false ? explode(',', $item->product->images) : json_decode($item->product->images, true))) : null,
                'categoryId' => (string) $item->product->category_id,
                'category' => $item->product->category ? $item->product->category->name : 'Uncategorized',
                'availability' => $availability,
                'sku' => $resolvedSku,
                'stockQuantity' => $stockQty,
                'description' => $item->product->description,
                'variants' => $item->variants ? (is_array($item->variants) ? $item->variants : json_decode($item->variants, true)) : null,
                'customFields' => $item->product->custom_fields ? (is_array($item->product->custom_fields) ? $item->product->custom_fields : json_decode($item->product->custom_fields, true)) : null,
                'taxName' =>$item->product->tax->name ?? null,
                'taxPercentage' =>$item->product->tax->rate ?? null,
                'quantity' => $item->quantity,
                'total' => $item->total,
                'inventoryMode' => $inv['mode'] ?? 'product',
                'variantCombinationId' => $inv['combination']['id'] ?? null,
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

    public function add(AddToCartRequest $request)
    {
        if ($rejected = $this->storeScopeRejection($request)) {
            return $rejected;
        }

        $product = Product::with('category')->findOrFail($request->product_id);
        // Store isolation: product must belong to requested store
        if ((int)$product->store_id !== (int)$request->store_id) {
            return response()->json(['message' => __('Product does not belong to this store.')], 422);
        }
        if (!$product->is_active) {
            return response()->json(['message' => __('This product is unavailable.')], 422);
        }
        // Inactive category → product not purchasable via storefront
        if ($product->category && !$product->category->is_active) {
            return response()->json(['message' => __('This product\'s category is unavailable.')], 422);
        }
        // Fix variants structure
        $variants = $request->variants;
        if (isset($variants['variants'])) {
            $variants = $variants['variants'];
        }
        // Variant validation via canonical resolver
        $resolvedCombo = null;
        if (!empty($product->variants) && is_array($product->variants) && count($product->variants) > 0) {
            $hasCombos = is_array($product->variant_combinations) && count($product->variant_combinations) > 0;
            if ($hasCombos && $variants !== null && $variants !== '' && !(is_array($variants) && empty($variants))) {
                $resolvedCombo = $product->resolveVariantCombination($variants);
                if (!$resolvedCombo) {
                    // Fallback lenient check: ensure values subset of defined values
                    $definedValues = [];
                    foreach ($product->variants as $vg) { foreach (($vg['values'] ?? $vg['options'] ?? []) as $v) $definedValues[] = (string)$v; }
                    $toCheck = is_array($variants) ? array_values(array_map(fn($v)=>(string)$v, $variants)) : [(string)$variants];
                    // For associative map, values are meaningful
                    if (is_array($variants) && array_keys($variants) !== range(0,count($variants)-1)) $toCheck = array_values(array_map(fn($v)=>(string)$v, $variants));
                    foreach ($toCheck as $val) {
                        if ($val !== '' && !in_array($val, $definedValues, true)) {
                            return response()->json(['message' => __('Invalid variant selection.')], 422);
                        }
                    }
                    // If lenient passed but no combo found and combos exist, still reject unknown combination when strict combinations defined
                    if (!empty($toCheck) && $hasCombos) {
                        // Require exact combination when combos have prices — prevent fake combo
                        $stillNull = $product->resolveVariantCombination($variants);
                        if (!$stillNull) return response()->json(['message' => __('Invalid variant selection.')], 422);
                    }
                }
            } elseif ($hasCombos && ($variants === null || $variants === '' || (is_array($variants) && empty($variants)))) {
                // Variant product requires selection
                return response()->json(['message' => __('Please select product options.')], 422);
            }
        }
        // Stock validation — canonical variant-aware via InventoryService (considers existing cart qty)
        $qty = (int)$request->quantity;
        $existingQty = 0;
        $variantJson = json_encode($variants);
        $whereConditions = [
            'store_id' => $request->store_id,
            'product_id' => $request->product_id,
            'variants' => $variantJson
        ];
        if (Auth::guard('customer')->check()) {
            $whereConditions['customer_id'] = Auth::guard('customer')->id();
        } else {
            $whereConditions['session_id'] = session()->getId();
            $whereConditions['customer_id'] = null;
        }
        $existingItem = CartItem::where($whereConditions)->first();
        if ($existingItem) $existingQty = (int)$existingItem->quantity;
        $requestedTotal = $existingQty + $qty;

        // Canonical inventory resolve for this selection
        $inv = \App\Services\InventoryService::resolve($product, $variants);
        if ($inv['tracking'] && !$inv['backorder']) {
            if (!$inv['purchasable']) {
                // Provide variant-specific message if variant-level
                $msg = $inv['is_variant'] ? __('This variant is out of stock.') : __('Product is out of stock.');
                return response()->json(['message' => $msg, 'available' => $inv['available_qty'] ?? 0], 422);
            }
            $available = $inv['available_qty'] ?? 0;
            if ($requestedTotal > (int)$available) {
                $msg = $inv['is_variant'] ? __('Requested quantity exceeds available stock for this variant.') : __('Requested quantity exceeds available stock.');
                return response()->json(['message' => $msg, 'available' => (int)$available], 422);
            }
        }

        // Canonical variant price: variant price overrides base effectivePrice
        if (method_exists($product, 'effectivePriceForVariant')) {
            $effectivePrice = $product->effectivePriceForVariant($variants);
        } else {
            $effectivePrice = method_exists($product, 'effectivePrice') ? $product->effectivePrice() : (float)($product->sale_price ?? $product->price);
        }

        if ($existingItem) {
            $existingItem->increment('quantity', $qty);
            $cartItem = $existingItem;
        } else {
            $cartItem = CartItem::create([
                'store_id' => $request->store_id,
                'customer_id' => Auth::guard('customer')->check() ? Auth::guard('customer')->id() : null,
                'session_id' => session()->getId(),
                'product_id' => $request->product_id,
                'quantity' => $qty,
                'variants' => $variantJson,
                'price' => $effectivePrice
            ]);
        }

        // Sync abandoned cart — persistent record for dashboard "استعادة السلة المتروكة"
        $this->syncAbandonedCart($request->store_id);

        return response()->json(['message' => 'تمت الإضافة إلى السلة', 'item' => $cartItem]);
    }

    public function update(UpdateCartRequest $request, $id)
    {
        if ($rejected = $this->storeScopeRejection($request)) {
            return $rejected;
        }

        $cartItem = $this->getCartItems($request->store_id, $request)->with('product')->findOrFail($id);
        // Stock guard on quantity update — variant-aware
        $product = $cartItem->product;
        if ($product) {
            $variantSel = $cartItem->variants ? (is_string($cartItem->variants) ? json_decode($cartItem->variants, true) : $cartItem->variants) : null;
            $inv = \App\Services\InventoryService::resolve($product, $variantSel);
            if ($inv['tracking'] && !$inv['backorder']) {
                if (!$inv['purchasable']) {
                    $msg = $inv['is_variant'] ? __('This variant is out of stock.') : __('Product is out of stock.');
                    return response()->json(['message' => $msg, 'available' => $inv['available_qty'] ?? 0], 422);
                }
                $available = $inv['available_qty'] ?? 0;
                if ((int)$request->quantity > (int)$available) {
                    $msg = $inv['is_variant'] ? __('Requested quantity exceeds available stock for this variant.') : __('Requested quantity exceeds available stock.');
                    // Arabic UX expected: "الكمية المتوفرة من هذا الخيار هي X فقط."
                    if ($inv['is_variant']) {
                        $msg = "الكمية المتوفرة من هذا الخيار هي {$available} فقط.";
                    }
                    return response()->json(['message' => $msg, 'available' => (int)$available], 422);
                }
            }
        }
        if ($product && !$product->is_active) {
            return response()->json(['message' => __('This product is unavailable.')], 422);
        }
        $cartItem->update(['quantity' => $request->quantity]);
        
        $this->syncAbandonedCart($request->store_id);

        return response()->json(['message' => 'تم تحديث السلة', 'item' => $cartItem]);
    }

    public function remove($id, CartStoreRequest $request)
    {
        if ($rejected = $this->storeScopeRejection($request)) {
            return $rejected;
        }

        $cartItem = $this->getCartItems($request->store_id, $request)->findOrFail($id);
        $cartItem->delete();
        
        $this->syncAbandonedCart($request->store_id);

        return response()->json(['message' => 'تمت إزالة المنتج']);
    }

    public function sync(CartStoreRequest $request)
    {
        if ($rejected = $this->storeScopeRejection($request)) {
            return $rejected;
        }

        // The session id is ALWAYS taken from the server-side session cookie,
        // never from a client-supplied value. This prevents an attacker from
        // claiming or poisoning another guest's cart.
        $sessionId = session()->getId();

        // Update guest cart items to assign them to the logged-in customer
        CartItem::where('store_id', $request->store_id)
            ->where('session_id', $sessionId)
            ->whereNull('customer_id')
            ->update(['customer_id' => Auth::guard('customer')->id()]);

        $this->syncAbandonedCart($request->store_id);

        return response()->json(['message' => 'تمت مزامنة السلة']);
    }

    private function syncAbandonedCart(int $storeId): void
    {
        try {
            $sessionId = session()->getId();
            $customer = Auth::guard('customer')->user();
            $customerId = $customer?->id;
            $customerEmail = $customer?->email;
            $customerPhone = $customer?->phone;
            $customerName = $customer ? trim(($customer->first_name ?? '') . ' ' . ($customer->last_name ?? '')) ?: ($customer->name ?? null) : null;

            $calculation = CartCalculationService::calculateCartTotals($storeId, $sessionId);
            $items = $calculation['items']->map(function ($item) {
                $p = $item->product;
                $variantSel = $item->variants ? (is_string($item->variants) ? json_decode($item->variants, true) : $item->variants) : null;
                $price = 0;
                if ($p) {
                    if (method_exists($p, 'effectivePriceForVariant')) $price = $p->effectivePriceForVariant($variantSel);
                    else $price = method_exists($p, 'effectivePrice') ? $p->effectivePrice() : (float)($p->sale_price ?? $p->price);
                }
                return [
                    'name' => $item->product->name,
                    'quantity' => $item->quantity,
                    'price' => (float) $price,
                    'product_id' => $item->product_id,
                    'image' => $item->product->cover_image ?? null,
                ];
            })->values()->toArray();

            $total = (float) ($calculation['total'] ?? 0);

            // If cart is empty, still update abandoned cart to reflect empty state (or keep last known)
            // The service handles empty items by keeping existing cart_items if contact info exists
            $this->abandonedCartService->trackCart(
                $storeId,
                $sessionId,
                $customerId,
                $customerEmail,
                $customerPhone,
                $customerName,
                $items,
                $total
            );
        } catch (\Throwable $e) {
            // Never break cart flow due to abandoned tracking failure
            \Illuminate\Support\Facades\Log::warning('Abandoned cart sync failed: ' . $e->getMessage(), ['store_id' => $storeId]);
        }
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