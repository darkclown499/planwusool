<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Support\Facades\Auth;

/**
 * Canonical cart operations shared by the storefront cart API and the
 * abandoned-cart recovery endpoint.
 *
 * Single source of truth for add-to-cart business rules:
 *  - product belongs to the requested store
 *  - product / category active and purchasable
 *  - variant combination still valid against the CURRENT variant definition
 *  - CURRENT inventory / availability (never stale snapshot values)
 *  - CURRENT authoritative pricing at add time (base / sale / variant)
 *  - cart owner identity: server session id for guests, or a STORE-SCOPED
 *    customer (customer.store_id MUST match the store being purchased in).
 */
class CartService
{
    /**
     * Resolve the current customer id as a legitimate cart owner for THIS store.
     *
     * One customer session can carry a Store-A customer onto Store B. A
     * customer is only a valid cart owner for the store they belong to; a
     * foreign-store customer behaves as a guest on this store.
     */
    public function storeScopedCustomerId(int $storeId): ?int
    {
        if (!Auth::guard('customer')->check()) {
            return null;
        }
        $customer = Auth::guard('customer')->user();
        if ($customer && !empty($customer->store_id) && (int) $customer->store_id === (int) $storeId) {
            return (int) $customer->id;
        }
        return null;
    }

    /**
     * Canonical add-to-cart operation.
     *
     * @param  array<string,mixed>|null  $variants  selected options map, e.g. ['Color' => 'Black']
     * @param  bool  $capQuantity  when true, quantity is clamped to current
     *                             availability instead of rejecting (recovery must
     *                             never exceed real stock).
     * @return array{ok:bool,error?:string,message?:string,status?:int,available?:int,item?:CartItem,created?:bool,quantity?:int,capped?:bool}
     */
    public function addItem(int $storeId, Product $product, int $quantity, ?array $variants = null, bool $capQuantity = false): array
    {
        $quantity = max(1, (int) $quantity);

        if ((int) $product->store_id !== (int) $storeId) {
            return ['ok' => false, 'error' => 'product_store_mismatch', 'message' => __('Product does not belong to this store.'), 'status' => 422];
        }
        if (!$product->is_active) {
            return ['ok' => false, 'error' => 'unavailable', 'message' => __('This product is unavailable.'), 'status' => 422];
        }
        if ($product->category && !$product->category->is_active) {
            return ['ok' => false, 'error' => 'category_unavailable', 'message' => __('This product\'s category is unavailable.'), 'status' => 422];
        }

        // Variant normalization + validation against the CURRENT variant definition
        if (isset($variants['variants'])) {
            $variants = $variants['variants'];
        }
        $validated = $this->validateVariants($product, $variants);
        if (!$validated['ok']) {
            return $validated;
        }
        $variants = $validated['variants'];

        // Cart-owner identity: store-scoped customer or server session.
        // The variants column uses an array cast: null/empty inputs are stored
        // as SQL NULL, non-empty selections as a JSON string. The lookup must
        // mirror that exact representation or the merge never matches.
        $customerId = $this->storeScopedCustomerId($storeId);
        $existingQuery = CartItem::where('store_id', $storeId)
            ->where('product_id', $product->id);
        if ($variants === null || $variants === '') {
            $existingQuery->whereNull('variants');
        } else {
            $existingQuery->where('variants', is_array($variants) && count($variants) === 0 ? '[]' : json_encode($variants));
        }
        if ($customerId !== null) {
            $existingQuery->where('customer_id', $customerId);
        } else {
            $existingQuery->where('session_id', session()->getId())->whereNull('customer_id');
        }
        $existingItem = $existingQuery->first();
        $existingQty = $existingItem ? (int) $existingItem->quantity : 0;
        $requestedTotal = $existingQty + $quantity;

        // Canonical variant-aware inventory — CURRENT availability, never snapshot.
        $inv = InventoryService::resolve($product, $variants);
        $added = $quantity;
        $capped = false;
        if ($inv['tracking'] && !$inv['backorder']) {
            $available = (int) ($inv['available_qty'] ?? 0);
            if (!$inv['purchasable']) {
                $msg = $inv['is_variant'] ? __('This variant is out of stock.') : __('Product is out of stock.');
                return ['ok' => false, 'error' => 'out_of_stock', 'message' => $msg, 'status' => 422, 'available' => $available];
            }
            if ($capQuantity) {
                $room = max(0, $available - $existingQty);
                if ($room <= 0) {
                    $msg = $inv['is_variant'] ? __('This variant is out of stock.') : __('Product is out of stock.');
                    return ['ok' => false, 'error' => 'no_stock_room', 'message' => $msg, 'status' => 422, 'available' => $available];
                }
                if ($requestedTotal > $available) {
                    $added = $room;
                    $capped = true;
                }
            } elseif ($requestedTotal > $available) {
                $msg = $inv['is_variant'] ? __('Requested quantity exceeds available stock for this variant.') : __('Requested quantity exceeds available stock.');
                return ['ok' => false, 'error' => 'exceeds_stock', 'message' => $msg, 'status' => 422, 'available' => $available];
            }
        }

        // CURRENT authoritative price at add time.
        if (method_exists($product, 'effectivePriceForVariant')) {
            $price = $product->effectivePriceForVariant($variants);
        } else {
            $price = method_exists($product, 'effectivePrice') ? $product->effectivePrice() : (float) ($product->sale_price ?? $product->price);
        }

        if ($existingItem) {
            $existingItem->increment('quantity', $added);
            $cartItem = $existingItem;
            $created = false;
        } else {
            $cartItem = CartItem::create([
                'store_id' => $storeId,
                'customer_id' => $customerId,
                'session_id' => session()->getId(),
                'product_id' => $product->id,
                'quantity' => $added,
                'variants' => $variants,
                'price' => $price,
            ]);
            $created = true;
        }

        return [
            'ok' => true,
            'item' => $cartItem,
            'created' => $created,
            'quantity' => (int) $cartItem->quantity,
            'capped' => $capped,
        ];
    }

    /**
     * Validate a selection against the product's CURRENT variant definition.
     *
     * @return array{ok:bool,error?:string,message?:string,status?:int,variants?:?array}
     */
    private function validateVariants(Product $product, ?array $variants): array
    {
        $hasVariantDefs = !empty($product->variants) && is_array($product->variants) && count($product->variants) > 0;
        if (!$hasVariantDefs) {
            return ['ok' => true, 'variants' => $variants];
        }

        $hasCombos = is_array($product->variant_combinations) && count($product->variant_combinations) > 0;
        if ($hasCombos && $variants !== null && $variants !== '' && !(is_array($variants) && empty($variants))) {
            $resolved = $product->resolveVariantCombination($variants);
            if (!$resolved) {
                // Lenient check: every selected value must exist in the CURRENT
                // variant definitions; unknown values are rejected outright.
                $definedValues = [];
                foreach ($product->variants as $vg) {
                    foreach (($vg['values'] ?? $vg['options'] ?? []) as $v) {
                        $definedValues[] = (string) $v;
                    }
                }
                $toCheck = is_array($variants)
                    ? array_values(array_map(fn ($v) => (string) $v, $variants))
                    : [(string) $variants];
                foreach ($toCheck as $val) {
                    if ($val !== '' && !in_array($val, $definedValues, true)) {
                        return ['ok' => false, 'error' => 'invalid_variant', 'message' => __('Invalid variant selection.'), 'status' => 422];
                    }
                }
                if (!empty($toCheck) && $hasCombos) {
                    $stillNull = $product->resolveVariantCombination($variants);
                    if (!$stillNull) {
                        return ['ok' => false, 'error' => 'invalid_variant', 'message' => __('Invalid variant selection.'), 'status' => 422];
                    }
                }
            }
        } elseif ($hasCombos && ($variants === null || $variants === '' || (is_array($variants) && empty($variants)))) {
            return ['ok' => false, 'error' => 'variant_required', 'message' => __('Please select product options.'), 'status' => 422];
        }

        return ['ok' => true, 'variants' => $variants];
    }
}