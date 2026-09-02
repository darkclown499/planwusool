<?php

namespace App\Services;

use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Single Source of Truth for all inventory decisions.
 * Centralizes product-level vs variant-level stock, track/backorder,
 * availability, purchasability, decrement + restoration.
 *
 * REUSE: delegates variant resolution to Product::resolveVariantCombination
 */
class InventoryService
{
    /**
     * Whether product uses variant-level inventory tracking.
     * Requirement: explicit merchant intent — presence of variants alone is NOT enough.
     */
    public static function isVariantInventory(Product $product): bool
    {
        if (!$product->track_inventory) return false;
        $mode = $product->inventory_mode ?? 'product';
        if ($mode !== 'variant') return false;
        // Variant mode only meaningful if there are actual combinations
        $combos = $product->variant_combinations;
        if (!is_array($combos) || count($combos) === 0) return false;
        return true;
    }

    /**
     * Resolve inventory state for a given product + variant selection.
     * Returns unified structure consumed by cart, checkout, storefront, availability.
     *
     * @param Product $product
     * @param mixed $selection variant selection (id string, map, array values, or null)
     * @return array{
     *   tracking: bool,
     *   backorder: bool,
     *   mode: string,
     *   is_variant: bool,
     *   combination: ?array,
     *   combination_index: ?int,
     *   available_qty: ?int,
     *   stock_source: string,
     *   purchasable: bool,
     *   purchasable_reason: string,
     *   max_purchasable: ?int
     * }
     */
    public static function resolve(Product $product, $selection = null): array
    {
        $tracking = (bool) ($product->track_inventory ?? true);
        $backorder = (bool) ($product->allow_backorder ?? false);
        $isVariant = self::isVariantInventory($product);
        $mode = $isVariant ? 'variant' : 'product';

        if (!$tracking) {
            return [
                'tracking' => false,
                'backorder' => $backorder,
                'mode' => $mode,
                'is_variant' => false,
                'combination' => null,
                'combination_index' => null,
                'available_qty' => null,
                'stock_source' => 'untracked',
                'purchasable' => true,
                'purchasable_reason' => 'untracked',
                'max_purchasable' => null,
            ];
        }

        if ($backorder) {
            // Backorder: always purchasable, but we still report actual stock for UI
            $availableQty = null;
            $combination = null;
            $comboIdx = null;
            if ($isVariant) {
                $comboInfo = self::findCombination($product, $selection);
                $combination = $comboInfo['combo'];
                $comboIdx = $comboInfo['idx'];
                // May still report underlying stock even though backorder allowed
                $availableQty = $combination !== null ? (int) self::comboStock($combination) : null;
            } else {
                $availableQty = (int) $product->stock;
            }
            return [
                'tracking' => true,
                'backorder' => true,
                'mode' => $mode,
                'is_variant' => $isVariant,
                'combination' => $combination,
                'combination_index' => $comboIdx,
                'available_qty' => $availableQty,
                'stock_source' => $isVariant ? 'variant' : 'product',
                'purchasable' => true,
                'purchasable_reason' => 'backorder',
                'max_purchasable' => null,
            ];
        }

        if ($isVariant) {
            $comboInfo = self::findCombination($product, $selection);
            $combination = $comboInfo['combo'];
            $comboIdx = $comboInfo['idx'];

            if ($combination === null) {
                // Selection does not resolve to a known combination
                // If product has variant combinations but no selection provided (catalog cards),
                // product-level availability is determined by ANY available combo (see productAvailability).
                return [
                    'tracking' => true,
                    'backorder' => false,
                    'mode' => 'variant',
                    'is_variant' => true,
                    'combination' => null,
                    'combination_index' => null,
                    'available_qty' => 0,
                    'stock_source' => 'variant',
                    'purchasable' => false,
                    'purchasable_reason' => 'variant_not_found',
                    'max_purchasable' => 0,
                ];
            }

            $stock = (int) self::comboStock($combination);
            $purchasable = $stock > 0;
            return [
                'tracking' => true,
                'backorder' => false,
                'mode' => 'variant',
                'is_variant' => true,
                'combination' => $combination,
                'combination_index' => $comboIdx,
                'available_qty' => $stock,
                'stock_source' => 'variant',
                'purchasable' => $purchasable,
                'purchasable_reason' => $purchasable ? 'in_stock' : 'out_of_stock',
                'max_purchasable' => $stock,
            ];
        }

        // Product-level tracked, no backorder
        $stock = (int) ($product->stock ?? 0);
        $purchasable = $stock > 0;
        return [
            'tracking' => true,
            'backorder' => false,
            'mode' => 'product',
            'is_variant' => false,
            'combination' => null,
            'combination_index' => null,
            'available_qty' => $stock,
            'stock_source' => 'product',
            'purchasable' => $purchasable,
            'purchasable_reason' => $purchasable ? 'in_stock' : 'out_of_stock',
            'max_purchasable' => $stock,
        ];
    }

    /**
     * Canonical product-level availability for cards/search/category.
     * For variant-tracked products: in_stock if ANY combination has stock >0 or backorder, else out_of_stock.
     * For untracked/backorder: always in_stock.
     */
    public static function productAvailability(Product $product): string
    {
        if (!$product->track_inventory) return 'in_stock';
        if ($product->allow_backorder) return 'in_stock';

        if (self::isVariantInventory($product)) {
            foreach (($product->variant_combinations ?? []) as $combo) {
                if ((int) self::comboStock($combo) > 0) return 'in_stock';
            }
            return 'out_of_stock';
        }

        return ((int) $product->stock > 0) ? 'in_stock' : 'out_of_stock';
    }

    /**
     * Return aggregated info for merchant UI / badges: total stock, purchasable combination count.
     */
    public static function variantInventorySummary(Product $product): array
    {
        $combos = $product->variant_combinations ?? [];
        $total = 0;
        $available = 0;
        $out = 0;
        $track = (bool) ($product->track_inventory ?? true);
        $backorder = (bool) ($product->allow_backorder ?? false);
        $isVariant = self::isVariantInventory($product);

        if ($isVariant) {
            foreach ($combos as $c) {
                $s = (int) self::comboStock($c);
                $total += $s;
                if ($s > 0 || $backorder) $available++;
                else $out++;
            }
        } else {
            $total = (int) ($product->stock ?? 0);
            $available = ($total > 0 || !$track || $backorder) ? 1 : 0;
            $out = $available ? 0 : 1;
        }

        return [
            'mode' => $isVariant ? 'variant' : 'product',
            'tracking' => $track,
            'backorder' => $backorder,
            'total_stock' => $total,
            'available_combinations' => $available,
            'out_of_stock_combinations' => $out,
            'total_combinations' => count($combos),
        ];
    }

    /**
     * Atomic decrement for a single cart line. Must be called inside a DB transaction with lock.
     * Locks the product row first, then validates and mutates.
     *
     * Optionally records an auditable stock movement when $movementType is provided.
     *
     * @param string|null $movementType e.g. InventoryMovement::MOVEMENT_POS_SALE / ONLINE_SALE
     * @param array{w?:int, type?:string, id?:?int, number?:?string}|null $reference optional reference/order info
     * @return array{success: bool, message: string|null, combination_id: string|null, inventory_mode: string, variant_uuid: string|null}
     */
    public static function decrementForCartLine(array $cartItem, int $storeId, ?string $movementType = null, ?array $reference = null): array
    {
        $productId = $cartItem['product_id'];
        $qty = (int) $cartItem['quantity'];
        $variants = $cartItem['variants'] ?? null;
        // variants may be JSON string
        if (is_string($variants)) {
            $decoded = json_decode($variants, true);
            if (json_last_error() === JSON_ERROR_NONE) $variants = $decoded;
        }

        // SELECT ... FOR UPDATE — blocks concurrent checkouts on same product row
        $product = Product::where('id', $productId)
            ->where('store_id', $storeId)
            ->lockForUpdate()
            ->first();

        if (!$product) {
            throw new \Exception("Product not found: {$productId}");
        }

        if (!$product->is_active) {
            throw new \Exception("Product unavailable: " . ($cartItem['name'] ?? $productId));
        }

        $tracking = (bool) ($product->track_inventory ?? true);
        if (!$tracking) {
            // No stock mutation
            return ['success' => true, 'message' => null, 'combination_id' => null, 'inventory_mode' => 'product'];
        }

        $backorder = (bool) $product->allow_backorder;
        $isVariant = self::isVariantInventory($product);

        if ($isVariant) {
            $comboInfo = self::findCombination($product, $variants);
            $combo = $comboInfo['combo'];
            $idx = $comboInfo['idx'];
            if ($combo === null) {
                throw new \Exception("Invalid variant selection for product: " . ($cartItem['name'] ?? $productId));
            }
            $stock = (int) self::comboStock($combo);
            if (!$backorder && $stock < $qty) {
                $id = $combo['id'] ?? $combo['label'] ?? 'variant';
                throw new \Exception("Insufficient stock for variant '{$id}' : available {$stock}, requested {$qty}");
            }
            // Mutate JSON stock atomically within the locked row
            $newStock = $stock - $qty;
            // In backorder mode, allow negative; otherwise newStock already validated >=0
            $combos = $product->variant_combinations;
            $combos[$idx]['stock'] = (string) $newStock;
            // Also preserve low_stock_warning etc.
            $product->variant_combinations = $combos;
            $product->save();

            // Low-stock notification for variant
            $threshold = $combos[$idx]['low_stock_warning'] ?? $product->low_stock_warning ?? 5;
            $threshold = (int) $threshold ?: 5;
            if ($newStock <= $threshold) {
                try { \App\Services\MerchantNotificationService::lowStock($product, $threshold); } catch (\Throwable $e) {}
            }

            if ($movementType) {
                \App\Services\InventoryMovementService::record(array_merge([
                    'store_id' => $storeId,
                    'product_id' => $product->id,
                    'variant_uuid' => $combo['uuid'] ?? null,
                    'variant_combination_id' => $combo['id'] ?? null,
                    'quantity_delta' => -$qty,
                    'movement_type' => $movementType,
                    'before_quantity' => $stock,
                    'after_quantity' => $newStock,
                ], $reference ? ['reference_type'=>$reference['type']??null,'reference_id'=>$reference['id']??null,'reference_number'=>$reference['number']??null] : []));
            }

            return ['success' => true, 'message' => null, 'combination_id' => $combo['id'] ?? null, 'variant_uuid' => $combo['uuid'] ?? null, 'inventory_mode' => 'variant'];
        }

        // Product-level atomic conditional decrement (still under lock, but keep conditional as defence)
        if ($backorder) {
            // Direct decrement may go negative
            $beforeStock = (int) ($product->stock ?? 0);
            DB::table('products')->where('id', $product->id)->decrement('stock', $qty);
            $product->refresh();
            $afterStock = (int) ($product->stock ?? 0);
            $threshold = (int) ($product->low_stock_warning ?: 5);
            if ($product->stock !== null && $product->stock <= $threshold) {
                try { \App\Services\MerchantNotificationService::lowStock($product, $threshold); } catch (\Throwable $e) {}
            }
            if ($movementType) {
                \App\Services\InventoryMovementService::record(array_merge([
                    'store_id' => $storeId,
                    'product_id' => $product->id,
                    'quantity_delta' => -$qty,
                    'movement_type' => $movementType,
                    'before_quantity' => $beforeStock,
                    'after_quantity' => $afterStock,
                ], $reference ? ['reference_type'=>$reference['type']??null,'reference_id'=>$reference['id']??null,'reference_number'=>$reference['number']??null] : []));
            }
            return ['success' => true, 'message' => null, 'combination_id' => null, 'inventory_mode' => 'product'];
        }

        // Conditional atomic decrement — if stock insufficient at DB level, fail
        $beforeStock = (int) ($product->stock ?? 0);
        $decremented = DB::table('products')
            ->where('id', $product->id)
            ->where('stock', '>=', $qty)
            ->decrement('stock', $qty);

        if (!$decremented) {
            throw new \Exception("Insufficient stock for product: " . ($cartItem['name'] ?? $productId));
        }

        $product->refresh();
        $afterStock = (int) ($product->stock ?? 0);
        $threshold = (int) ($product->low_stock_warning ?: 5);
        if ($product->stock !== null && $product->stock <= $threshold) {
            try { \App\Services\MerchantNotificationService::lowStock($product, $threshold); } catch (\Throwable $e) {}
        }

        if ($movementType) {
            \App\Services\InventoryMovementService::record(array_merge([
                'store_id' => $storeId,
                'product_id' => $product->id,
                'quantity_delta' => -$qty,
                'movement_type' => $movementType,
                'before_quantity' => $beforeStock,
                'after_quantity' => $afterStock,
            ], $reference ? ['reference_type'=>$reference['type']??null,'reference_id'=>$reference['id']??null,'reference_number'=>$reference['number']??null] : []));
        }

        return ['success' => true, 'message' => null, 'combination_id' => null, 'inventory_mode' => 'product'];
    }

    /**
     * Canonical restock for a specific quantity (partial returns). Supports variant UUID stable resolution.
     * Used by ReturnService for per-return-item restock.
     */
    public static function restockQuantity(\App\Models\OrderItem $item, int $qty, int $storeId): array
    {
        if ($qty <= 0) return ['success'=>false,'message'=>'الكمية يجب أن تكون أكبر من صفر'];
        if (!$item->product_id) return ['success'=>false,'message'=>'عنصر الطلب بلا منتج'];

        $product = Product::where('id', $item->product_id)->where('store_id', $storeId)->lockForUpdate()->first();
        if (!$product) {
            Log::warning('Restock skipped: product not found', ['order_item_id'=>$item->id,'product_id'=>$item->product_id]);
            return ['success'=>false,'message'=>'الخيار الأصلي لم يعد موجوداً، ولا يمكن إعادة الكمية للمخزون تلقائياً.'];
        }
        if (!$product->track_inventory) return ['success'=>true,'message'=>null,'skipped'=>'untracked'];
        if ((int)$product->store_id !== (int)$storeId) {
            Log::warning('Restock blocked cross-store', ['order_item_id'=>$item->id]);
            return ['success'=>false,'message'=>'متجر غير مطابق'];
        }

        $snapshotMode = $item->inventory_mode ?? null;
        $comboId = $item->variant_combination_id ?? null;
        $variantUuid = $item->variant_uuid ?? null;

        if ($snapshotMode === null) {
            // infer legacy
            $snapshotMode = $comboId || $variantUuid ? 'variant' : 'product';
            if ($snapshotMode === 'variant' && !self::isVariantInventory($product)) $snapshotMode = 'product';
        }

        if ($snapshotMode === 'variant' && ($comboId || $variantUuid)) {
            $combos = $product->variant_combinations ?? [];
            $idx = null;
            // Prefer UUID match (stable)
            if ($variantUuid) {
                foreach ($combos as $i => $c) {
                    if (($c['uuid'] ?? null) === $variantUuid) { $idx = $i; break; }
                }
            }
            if ($idx === null && $comboId) {
                foreach ($combos as $i => $c) {
                    if (($c['id'] ?? null) === $comboId) { $idx = $i; break; }
                }
            }
            // No fallback via resolve — UUID/id stability enforced
            if ($idx !== null) {
                $current = (int) self::comboStock($combos[$idx]);
                $combos[$idx]['stock'] = (string)($current + $qty);
                $product->variant_combinations = $combos;
                $product->save();
                \App\Services\InventoryMovementService::record([
                    'store_id' => $storeId,
                    'product_id' => $product->id,
                    'variant_uuid' => $combos[$idx]['uuid'] ?? null,
                    'variant_combination_id' => $combos[$idx]['id'] ?? null,
                    'quantity_delta' => $qty,
                    'movement_type' => \App\Models\InventoryMovement::MOVEMENT_RETURN_RESTOCK,
                    'reference_type' => 'order_return_item',
                    'reference_id' => $item->id,
                    'before_quantity' => $current,
                    'after_quantity' => $current + $qty,
                    'note' => 'Return restock (order item #' . $item->id . ')',
                ]);
                Log::info('Restocked variant qty', ['order_item_id'=>$item->id,'qty'=>$qty,'uuid'=>$variantUuid,'id'=>$comboId]);
                return ['success'=>true,'message'=>null,'mode'=>'variant','combination_id'=>$comboId,'uuid'=>$variantUuid];
            }
            Log::warning('Restock skipped: variant combination no longer exists', ['order_item_id'=>$item->id,'uuid'=>$variantUuid,'id'=>$comboId]);
            return ['success'=>false,'message'=>'الخيار الأصلي لم يعد موجوداً، ولا يمكن إعادة الكمية للمخزون تلقائياً.'];
        }

        $beforeStock = (int) ($product->stock ?? 0);
        DB::table('products')->where('id',$product->id)->increment('stock', $qty);
        \App\Services\InventoryMovementService::record([
            'store_id' => $storeId,
            'product_id' => $product->id,
            'quantity_delta' => $qty,
            'movement_type' => \App\Models\InventoryMovement::MOVEMENT_RETURN_RESTOCK,
            'reference_type' => 'order_return_item',
            'reference_id' => $item->id,
            'before_quantity' => $beforeStock,
            'after_quantity' => $beforeStock + $qty,
            'note' => 'Return restock (order item #' . $item->id . ')',
        ]);
        Log::info('Restocked product qty', ['order_item_id'=>$item->id,'qty'=>$qty]);
        return ['success'=>true,'message'=>null,'mode'=>'product'];
    }

    /**
     * Restore stock for an order item. Lock the product row.
     * Idempotent via caller checking stock_restored flag; this method itself is lock-safe.
     *
     * @param string|null $movementType defaults to ORDER_CANCEL_RESTOCK (hard failure/cancel)
     */
    public static function restoreForOrderItem(\App\Models\OrderItem $item, int $storeId, ?string $movementType = null): bool
    {
        $productId = $item->product_id;
        if (!$productId) return false;

        $product = Product::where('id', $productId)
            ->where('store_id', $storeId)
            ->lockForUpdate()
            ->first();

        // Product deleted/soft-deleted: cannot restore accurately
        if (!$product) {
            Log::warning('Stock restore skipped: product not found', ['order_id' => $item->order_id, 'product_id' => $productId]);
            return false;
        }

        if (!$product->track_inventory) return false;

        // Store isolation
        if ((int) $product->store_id !== (int) $storeId) {
            Log::warning('Stock restore skipped: product store mismatch', ['order_id' => $item->order_id, 'product_id' => $productId]);
            return false;
        }

        $qty = (int) $item->quantity;

        // Determine which stock was decremented using snapshot (prefer stable uuid)
        $snapshotMode = $item->inventory_mode ?? null;
        $comboId = $item->variant_combination_id ?? null;
        $variantUuid = $item->variant_uuid ?? null;

        // Backwards compat: if no snapshot, infer from current product mode + whether item had variants
        if ($snapshotMode === null) {
            $hasVariantSnapshot = ($comboId !== null && $comboId !== '') || ($variantUuid !== null && $variantUuid !== '');
            if (!$hasVariantSnapshot) {
                $variantData = $item->product_variants;
                if (is_string($variantData)) $variantData = json_decode($variantData, true);
                if (!empty($variantData)) {
                    $possibleCombo = $product->resolveVariantCombination($variantData);
                    if ($possibleCombo && self::isVariantInventory($product)) {
                        $snapshotMode = 'variant';
                        $comboId = $possibleCombo['id'] ?? null;
                        $variantUuid = $possibleCombo['uuid'] ?? null;
                    }
                }
            }
            if ($snapshotMode === null) $snapshotMode = 'product';
        }

        if ($snapshotMode === 'variant' && ($comboId || $variantUuid)) {
            $combos = $product->variant_combinations ?? [];
            $idx = null;
            if ($variantUuid) {
                foreach ($combos as $i => $c) {
                    if (($c['uuid'] ?? null) === $variantUuid) { $idx = $i; break; }
                }
            }
            if ($idx === null && $comboId) {
                foreach ($combos as $i => $c) {
                    if (($c['id'] ?? null) === $comboId) { $idx = $i; break; }
                }
            }

            if ($idx !== null) {
                $currentStock = (int) self::comboStock($combos[$idx]);
                $combos[$idx]['stock'] = (string) ($currentStock + $qty);
                $product->variant_combinations = $combos;
                $product->save();
                \App\Services\InventoryMovementService::record([
                    'store_id' => $storeId,
                    'product_id' => $product->id,
                    'variant_uuid' => $combos[$idx]['uuid'] ?? null,
                    'variant_combination_id' => $combos[$idx]['id'] ?? null,
                    'quantity_delta' => $qty,
                    'movement_type' => $movementType ?? \App\Models\InventoryMovement::MOVEMENT_ORDER_CANCEL_RESTOCK,
                    'reference_type' => 'order',
                    'reference_id' => $item->order_id,
                    'before_quantity' => $currentStock,
                    'after_quantity' => $currentStock + $qty,
                    'note' => 'Order restore (order #' . $item->order_id . ')',
                ]);
                Log::info('Stock restored (variant)', ['order_id' => $item->order_id, 'product_id' => $productId, 'combination_id' => $comboId, 'qty' => $qty]);
                return true;
            }

            // Variant combination no longer exists (deleted/renamed): log and do NOT restore to avoid wrong bucket.
            // This is intentional — we avoid silently inflating product stock when variant was deleted.
            Log::warning('Stock restore skipped: variant combination no longer exists', ['order_id' => $item->order_id, 'product_id' => $productId, 'combination_id' => $comboId]);
            return false;
        }

        // Product-level restore
        $beforeStock = (int) ($product->stock ?? 0);
        DB::table('products')->where('id', $product->id)->increment('stock', $qty);
        \App\Services\InventoryMovementService::record([
            'store_id' => $storeId,
            'product_id' => $product->id,
            'quantity_delta' => $qty,
            'movement_type' => $movementType ?? \App\Models\InventoryMovement::MOVEMENT_ORDER_CANCEL_RESTOCK,
            'reference_type' => 'order',
            'reference_id' => $item->order_id,
            'before_quantity' => $beforeStock,
            'after_quantity' => $beforeStock + $qty,
            'note' => 'Order restore (order #' . $item->order_id . ')',
        ]);
        Log::info('Stock restored (product)', ['order_id' => $item->order_id, 'product_id' => $productId, 'qty' => $qty]);
        return true;
    }

    /**
     * Controlled manual stock adjustment (increase/decrease) with audit.
     *
     * Direction is explicit and signed on the server: a positive $delta raises
     * stock, a negative $delta lowers it. Resulting stock can never go below
     * zero. Always writes a MANUAL_ADJUSTMENT ledger row so corrections are
     * explained (reason/note) and attributable.
     *
     * @param int $delta signed movement (e.g. +10 received, -3 damaged)
     * @param int $storeId validated merchant store
     * @param string|null $variantUuid stable variant uuid (variant-tracked products)
     * @param string|null $variantId combo id fallback
     * @param string|null $note merchant reason (safe note)
     * @param int|null $actorId acting merchant user
     * @return array{success:bool,message:?string,mode:string,before:?int,after:?int}
     */
    public static function adjustStock(Product $product, int $delta, int $storeId, ?string $variantUuid = null, ?string $variantId = null, ?string $note = null, ?int $actorId = null): array
    {
        if ($delta === 0) return ['success'=>false,'message'=>'لا يوجد تغيير في الكمية'];
        if ((int) $product->store_id !== (int) $storeId) {
            return ['success'=>false,'message'=>'متجر غير مطابق'];
        }

        // Lock the product row so the read-modify-write is safe against concurrent sales.
        $locked = Product::where('id', $product->id)
            ->where('store_id', $storeId)
            ->lockForUpdate()
            ->first();
        if (!$locked) return ['success'=>false,'message'=>'المنتج غير موجود'];

        if (!$locked->track_inventory) {
            return ['success'=>false,'message'=>'المنتج لا يتبع المخزون'];
        }

        $isVariant = self::isVariantInventory($locked);
        if ($isVariant) {
            $combos = $locked->variant_combinations ?? [];
            $idx = null;
            if ($variantUuid) {
                foreach ($combos as $i => $c) if (($c['uuid'] ?? null) === $variantUuid) { $idx = $i; break; }
            }
            if ($idx === null && $variantId) {
                foreach ($combos as $i => $c) if (($c['id'] ?? null) === $variantId) { $idx = $i; break; }
            }
            if ($idx === null) {
                return ['success'=>false,'message'=>'الخيار المحدد غير موجود'];
            }
            $before = (int) self::comboStock($combos[$idx]);
            $after = $before + $delta;
            if ($after < 0) return ['success'=>false,'message'=>'لا يمكن خفض المخزون إلى أقل من صفر'];
            $combos[$idx]['stock'] = (string) $after;
            $locked->variant_combinations = $combos;
            $locked->save();

            \App\Services\InventoryMovementService::record([
                'store_id' => $storeId,
                'product_id' => $locked->id,
                'variant_uuid' => $combos[$idx]['uuid'] ?? $variantUuid,
                'variant_combination_id' => $combos[$idx]['id'] ?? $variantId,
                'quantity_delta' => $delta,
                'movement_type' => \App\Models\InventoryMovement::MOVEMENT_MANUAL_ADJUSTMENT,
                'before_quantity' => $before,
                'after_quantity' => $after,
                'note' => $note,
                'actor' => ['type' => 'user', 'id' => $actorId],
            ]);
            return ['success'=>true,'message'=>null,'mode'=>'variant','before'=>$before,'after'=>$after];
        }

        $before = (int) ($locked->stock ?? 0);
        $after = $before + $delta;
        if ($after < 0) return ['success'=>false,'message'=>'لا يمكن خفض المخزون إلى أقل من صفر'];

        DB::table('products')->where('id', $locked->id)->update(['stock' => $after]);
        \App\Services\InventoryMovementService::record([
            'store_id' => $storeId,
            'product_id' => $locked->id,
            'quantity_delta' => $delta,
            'movement_type' => \App\Models\InventoryMovement::MOVEMENT_MANUAL_ADJUSTMENT,
            'before_quantity' => $before,
            'after_quantity' => $after,
            'note' => $note,
            'actor' => ['type' => 'user', 'id' => $actorId],
        ]);
        return ['success'=>true,'message'=>null,'mode'=>'product','before'=>$before,'after'=>$after];
    }

    private static function findCombination(Product $product, $selection): array
    {
        $combos = $product->variant_combinations ?? [];
        if (is_string($selection) && $selection !== '' && !self::isJson($selection)) {
            // Already an id string like "Red‖M"
            foreach ($combos as $idx => $c) {
                if (($c['id'] ?? null) === $selection) return ['combo' => $c, 'idx' => $idx];
                if (($c['label'] ?? null) === $selection) return ['combo' => $c, 'idx' => $idx];
            }
        }
        // Try canonical resolver
        $resolved = null;
        try { $resolved = $product->resolveVariantCombination($selection); } catch (\Throwable $e) {}
        if ($resolved !== null) {
            foreach ($combos as $idx => $c) {
                if (($c['id'] ?? null) === ($resolved['id'] ?? null)) return ['combo' => $c, 'idx' => $idx];
                // Fallback by values set comparison
                $cVals = $c['values'] ?? [];
                $rVals = $resolved['values'] ?? [];
                sort($cVals); sort($rVals);
                if ($cVals === $rVals) return ['combo' => $c, 'idx' => $idx];
            }
            // Still return resolved with index hint if not in stored list (edge: stale)
            return ['combo' => $resolved, 'idx' => null];
        }

        return ['combo' => null, 'idx' => null];
    }

    private static function comboStock(array $combo): int
    {
        $raw = $combo['stock'] ?? null;
        if ($raw === null || $raw === '') return 0;
        return (int) $raw;
    }

    private static function isJson(string $value): bool
    {
        json_decode($value);
        return json_last_error() === JSON_ERROR_NONE && (str_starts_with(trim($value), '{') || str_starts_with(trim($value), '['));
    }
}
