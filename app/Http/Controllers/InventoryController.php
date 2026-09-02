<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\InventoryMovement;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Merchant inventory view (Phase 1 POS + unified inventory).
 *
 * Server-side, store-scoped, paginated. Manual adjustments go through the
 * canonical InventoryService (locked, no-negative-stock) and always write a
 * MANUAL_ADJUSTMENT ledger row.
 */
class InventoryController extends Controller
{
    /**
     * Inventory listing page with search + stock filters.
     */
    public function index(Request $request)
    {
        $storeId = (int) getCurrentStoreId(Auth::user());
        $lowStockThreshold = (int) getSetting('low_stock_threshold', 5) ?: 5;

        $q = trim((string) $request->input('search', ''));
        $status = (string) $request->input('status', '');
        $perPage = (int) $request->input('per_page', 25);

        $query = Product::where('store_id', $storeId);

        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('sku', 'like', "%{$q}%")
                    ->orWhere('barcode', 'like', "%{$q}%");
            });
        }

        // Basic SQL-level filters; variant combos are expanded below.
        if ($status === 'out_of_stock') {
            $query->where('track_inventory', true)
                ->where('allow_backorder', false)
                ->where(function ($sub) {
                    $sub->where('stock', '<=', 0)
                        ->orWhere(function ($q2) {
                            $q2->where('inventory_mode', '=', 'variant');
                        });
                });
        }

        $products = $query->orderBy('name')->paginate($perPage)->withQueryString();

        // Expand variant-tracked products into per-combination inventory rows.
        $rows = [];
        foreach ($products as $product) {
            $isVariant = InventoryService::isVariantInventory($product);
            $combos = $product->variant_combinations ?? [];

            if ($isVariant && count($combos) > 0) {
                foreach ($combos as $combo) {
                    $stock = (int) ($combo['stock'] ?? 0);
                    $threshold = (int) ($combo['low_stock_warning'] ?? $product->low_stock_warning ?? $lowStockThreshold) ?: $lowStockThreshold;
                    $row = [
                        'product_id' => $product->id,
                        'name' => $product->name,
                        'is_variant' => true,
                        'variant_id' => $combo['id'] ?? null,
                        'variant_uuid' => $combo['uuid'] ?? null,
                        'variant_label' => $combo['label'] ?? implode(' / ', $combo['values'] ?? []),
                        'sku' => $combo['sku'] ?? $product->sku,
                        'barcode' => $product->barcode,
                        'stock' => $stock,
                        'status' => $this->stockStatus($stock, $threshold, true),
                    ];
                    if ($this->matchesFilter($row, $status)) $rows[] = $row;
                }
            } else {
                $tracking = (bool) ($product->track_inventory ?? true);
                $stock = (int) ($product->stock ?? 0);
                $threshold = (int) ($product->low_stock_warning ?: $lowStockThreshold) ?: $lowStockThreshold;
                $row = [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'is_variant' => false,
                    'variant_id' => null,
                    'variant_uuid' => null,
                    'variant_label' => null,
                    'sku' => $product->sku,
                    'barcode' => $product->barcode,
                    'stock' => $tracking ? $stock : null,
                    'status' => $tracking ? $this->stockStatus($stock, $threshold, false) : 'not_tracked',
                ];
                if ($this->matchesFilter($row, $status)) $rows[] = $row;
            }
        }

        $totalRows = $products->total();

        return Inertia::render('inventory/index', [
            'rows' => $rows,
            'filters' => [
                'search' => (string) $request->input('search', ''),
                'status' => $status,
                'per_page' => $perPage,
            ],
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'total' => $totalRows,
                'has_more' => $products->hasMorePages(),
            ],
            'lowStockThreshold' => $lowStockThreshold,
            'next_page_url' => $products->nextPageUrl(),
            'prev_page_url' => $products->previousPageUrl(),
        ]);
    }

    /**
     * Manual stock adjustment (increase/decrease) — ledger-backed.
     */
    public function adjust(Request $request)
    {
        $request->validate([
            'product_id' => 'required|integer',
            'variant_uuid' => 'nullable|string|max:255',
            'variant_id' => 'nullable|string|max:255',
            'direction' => 'required|in:increase,decrease',
            'quantity' => 'required|integer|min:1|max:1000000',
            'reason' => 'required|string|max:500',
        ]);

        $storeId = (int) getCurrentStoreId(Auth::user());
        $product = Product::where('id', (int) $request->input('product_id'))->where('store_id', $storeId)->first();
        if (!$product) {
            return back()->with('error', 'المنتج غير موجود في هذا المتجر.');
        }

        $qty = (int) $request->input('quantity');
        $delta = $request->input('direction') === 'increase' ? $qty : -$qty;

        $result = InventoryService::adjustStock(
            $product,
            $delta,
            $storeId,
            $request->filled('variant_uuid') ? (string) $request->input('variant_uuid') : null,
            $request->filled('variant_id') ? (string) $request->input('variant_id') : null,
            (string) $request->input('reason'),
            Auth::id()
        );

        if (!($result['success'] ?? false)) {
            return back()->with('error', $result['message'] ?? 'تعذر تعديل المخزون.');
        }

        return back()->with('success', 'تم تعديل المخزون وتسجيل الحركة بنجاح.');
    }

    /**
     * Stock movements history — paginated, store-scoped.
     */
    public function movements(Request $request)
    {
        $storeId = (int) getCurrentStoreId(Auth::user());
        $perPage = (int) $request->input('per_page', 50);

        $query = InventoryMovement::where('store_id', $storeId);

        if ($productId = (int) $request->input('product_id')) {
            $query->where('product_id', $productId);
        }
        if ($type = (string) $request->input('type')) {
            $query->where('movement_type', $type);
        }

        $movements = $query->with('product:id,name')->orderByDesc('created_at')->paginate($perPage)->withQueryString();

        return Inertia::render('inventory/movements', [
            'movements' => $movements->through(fn ($m) => [
                'id' => $m->id,
                'product_name' => $m->product?->name,
                'variant_label' => $m->variant_uuid,
                'delta' => $m->quantity_delta,
                'type' => $m->movement_type,
                'before' => $m->before_quantity,
                'after' => $m->after_quantity,
                'reference_number' => $m->reference_number,
                'reference_type' => $m->reference_type,
                'note' => $m->note,
                'created_at' => $m->created_at?->toISOString(),
            ]),
            'filters' => [
                'product_id' => (int) $request->input('product_id', 0) ?: null,
                'type' => (string) $request->input('type', ''),
            ],
            'pagination' => [
                'current_page' => $movements->currentPage(),
                'last_page' => $movements->lastPage(),
                'total' => $movements->total(),
            ],
        ]);
    }

    private function stockStatus(int $stock, int $threshold, bool $isVariant): string
    {
        if ((bool) $isVariant === false && $stock <= 0) return 'out_of_stock';
        if ($stock === 0) return 'out_of_stock';
        if ($stock <= $threshold) return 'low_stock';
        return 'in_stock';
    }

    private function matchesFilter(array $row, string $status): bool
    {
        if ($status === '') return true;
        return ($row['status'] ?? '') === $status;
    }
}