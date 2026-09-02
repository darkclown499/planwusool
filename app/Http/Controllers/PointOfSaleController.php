<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\Customer;
use App\Services\InventoryService;
use App\Services\PointOfSaleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Merchant Point of Sale (Phase 1).
 *
 * Search / sale endpoints are server-side and store-scoped via the merchant's
 * current store. No cross-store catalog access. The final sale reuses the
 * canonical OrderService so stock, orders and the movement ledger stay on one
 * unified truth.
 */
class PointOfSaleController extends Controller
{
    public function __construct(
        private PointOfSaleService $posService
    ) {}

    /**
     * POS register page.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $storeId = (int) getCurrentStoreId($user);
        $store = \App\Models\Store::where('id', $storeId)
            ->where(function ($q) use ($user) {
                if ($user->type !== 'platform_admin') $q->where('user_id', $user->created_by ?: $user->id)->orWhere('id', $user->current_store);
            })
            ->first();

        $currency = $store?->currency ?? 'ILS';

        return Inertia::render('pos/index', [
            'storeCurrency' => $currency,
            'storeName' => $store?->name ?? '',
        ]);
    }

    /**
     * Fast, server-side product search for the POS register.
     * Searches product name, SKU and barcode; store-scoped; maintains variant rows.
     */
    public function search(Request $request)
    {
        $request->validate([
            'q' => 'nullable|string|max:255',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:5|max:50',
        ]);

        $storeId = (int) getCurrentStoreId(Auth::user());
        $q = trim((string) $request->input('q', ''));
        $perPage = (int) $request->input('per_page', 20);

        $query = Product::where('store_id', $storeId)->where('is_active', true);

        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('sku', 'like', "%{$q}%")
                    ->orWhere('barcode', 'like', "%{$q}%");
            });
        }

        $products = $query
            ->with('tax')
            ->orderBy('name')
            ->paginate($perPage);

        // Build POS rows: one row per sellable item (variant combos expanded for variant-tracked products).
        $rows = [];
        foreach ($products as $product) {
            $isVariant = InventoryService::isVariantInventory($product);
            $combos = $product->variant_combinations ?? [];
            $taxRate = (float) ($product->tax?->rate ?? 0);

            if ($isVariant && count($combos) > 0) {
                foreach ($combos as $combo) {
                    $stock = (int) ($combo['stock'] ?? 0);
                    $rows[] = $this->toPosRow($product, [
                        'is_variant' => true,
                        'variant_id' => $combo['id'] ?? null,
                        'variant_uuid' => $combo['uuid'] ?? null,
                        'variant_label' => $combo['label'] ?? implode(' / ', $combo['values'] ?? []),
                        'sku' => $combo['sku'] ?? $product->sku,
                        'price' => (float) ($combo['price'] ?? $product->effectivePrice()),
                        'stock' => $stock,
                        'tax_rate' => $taxRate,
                    ]);
                }
            } else {
                $rows[] = $this->toPosRow($product, [
                    'variants_label' => null,
                    'sku' => $product->sku,
                    'price' => (float) $product->effectivePrice(),
                    'stock' => $backorder = (bool) $product->allow_backorder ? null : (int) ($product->stock ?? 0),
                    'tax_rate' => $taxRate,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'rows' => $rows,
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    /**
     * Optional CRM customer lookup for linking a POS sale.
     */
    public function customers(Request $request)
    {
        $request->validate([
            'q' => 'nullable|string|max:255',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:5|max:50',
        ]);

        $storeId = (int) getCurrentStoreId(Auth::user());
        $q = trim((string) $request->input('q', ''));

        $query = Customer::where('store_id', $storeId);
        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('first_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            });
        }

        $customers = $query
            ->select('id', 'first_name', 'last_name', 'phone', 'email')
            ->orderBy('first_name')
            ->limit((int) $request->input('per_page', 20))
            ->get();

        return response()->json([
            'success' => true,
            'customers' => $customers->map(fn ($c) => [
                'id' => $c->id,
                'name' => trim($c->first_name . ' ' . $c->last_name),
                'phone' => $c->phone,
                'email' => $c->email,
            ]),
        ]);
    }

    /**
     * Finalize a POS sale — creates a canonical order with source = pos.
     */
    public function store(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1|max:200',
            'items.*.product_id' => 'required|integer',
            'items.*.variant_id' => 'nullable|string|max:255',
            'items.*.variant_uuid' => 'nullable|string|max:255',
            'items.*.quantity' => 'required|integer|min:1|max:99999',
            'payment_method' => 'required|string|in:cash,bank,bank_transfer',
            'customer_id' => 'nullable|integer',
            'notes' => 'nullable|string|max:1000',
        ]);

        $storeId = (int) getCurrentStoreId(Auth::user());
        if ($storeId <= 0) {
            return response()->json(['success' => false, 'message' => 'لا يوجد متجر نشط.'], 422);
        }

        try {
            $order = $this->posService->createPosSale(
                $storeId,
                $request->input('items'),
                $request->input('payment_method'),
                $request->has('customer_id') ? (int) $request->input('customer_id') : null,
                $request->input('notes'),
                true
            );

            return response()->json([
                'success' => true,
                'order_number' => $order->order_number,
                'order_id' => $order->id,
                'message' => 'تم إتمام البيع بنجاح.',
            ], 201);
        } catch (\Exception $e) {
            // Suppress the friendly Arabic domain message; return it verbatim when it is our own.
            $message = $e->getMessage();
            if (stripos($message, 'insufficient stock') !== false) {
                return response()->json(['success' => false, 'message' => 'المخزون لم يعد كافيًا لإتمام البيع.'], 409);
            }
            if (preg_match('/[\\x{0600}-\\x{06FF}]/u', $message)) {
                return response()->json(['success' => false, 'message' => $message], 409);
            }
            \Illuminate\Support\Facades\Log::warning('POS sale failed', ['store_id'=>$storeId,'error'=>$e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'تعذر إتمام البيع.'], 422);
        }
    }

    /**
     * Printable receipt for a POS order (canonical order, store-scoped).
     */
    public function receipt(Request $request, $order)
    {
        $storeId = (int) getCurrentStoreId(Auth::user());
        $posOrder = Order::with(['items', 'store'])
            ->where('store_id', $storeId)
            ->where('order_source', 'pos')
            ->where('id', $order)
            ->firstOrFail();

        return Inertia::render('pos/receipt', [
            'order' => [
                'order_number' => $posOrder->order_number,
                'created_at' => $posOrder->created_at?->toIso8601String(),
                'status' => $posOrder->status,
                'payment_status' => $posOrder->payment_status,
                'payment_method' => $posOrder->payment_method,
                'subtotal' => $posOrder->subtotal,
                'tax_amount' => $posOrder->tax_amount,
                'discount_amount' => $posOrder->discount_amount,
                'total_amount' => $posOrder->total_amount,
                'currency' => $posOrder->currency,
                'customer_name' => trim($posOrder->customer_first_name . ' ' . $posOrder->customer_last_name),
                'customer_phone' => $posOrder->customer_phone,
                'items' => $posOrder->items->map(fn ($item) => [
                    'product_name' => $item->product_name,
                    'sku' => $item->product_sku,
                    'variant' => $this->variantLabel($item),
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total_price' => $item->total_price,
                ]),
                'store' => [
                    'name' => $posOrder->store?->name,
                ],
            ],
        ]);
    }

    private function toPosRow(Product $product, array $overrides = []): array
    {
        return array_merge([
            'product_id' => $product->id,
            'name' => $product->name,
            'barcode' => $product->barcode,
            'cover_image' => $product->cover_image,
            'is_variant' => false,
        ], $overrides);
    }

    private function variantLabel($item): ?string
    {
        $snapshot = $item->product_variants;
        if (is_string($snapshot)) {
            $decoded = json_decode($snapshot, true);
            if (json_last_error() === JSON_ERROR_NONE) $snapshot = $decoded;
        }
        if (is_array($snapshot) && isset($snapshot['label'])) return $snapshot['label'];
        if (is_array($snapshot) && isset($snapshot['values'])) return implode(' / ', (array) $snapshot['values']);
        if (is_string($snapshot) && $snapshot !== '' && !str_contains($snapshot, '{')) return $snapshot;
        return null;
    }
}