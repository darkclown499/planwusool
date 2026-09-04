<?php

namespace App\Http\Controllers\Terminal;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Customer;
use App\Models\PosTerminal;
use App\Services\InventoryService;
use App\Services\PointOfSaleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Standalone POS register endpoint set for a dedicated terminal/cashier.
 *
 * Store scope comes from the authenticated terminal's own store_id — never
 * from a client-supplied value — so a Store A terminal can never search or sell
 * against Store B's catalog. Terminal sales still flow through the canonical
 * PointOfSaleService -> OrderService -> InventoryService path (single stock
 * truth), with relational + snapshot attribution to the terminal.
 */
class PosTerminalController extends Controller
{
    public function __construct(
        private PointOfSaleService $posService
    ) {}

    /**
     * Terminal cash-register page (no merchant sidebar/dashboard chrome).
     */
    public function register()
    {
        $terminal = Auth::guard('pos_terminal')->user();
        $storeId = (int) $terminal->store_id;

        return Inertia::render('pos/terminal/index', [
            'storeCurrency' => \App\Models\Store::where('id', $storeId)->value('currency') ?? 'ILS',
            'storeName' => \App\Models\Store::where('id', $storeId)->value('name') ?? '',
            'terminal' => $terminal->only('id', 'name', 'username', 'store_id'),
        ]);
    }

    public function search(Request $request)
    {
        $request->validate([
            'q' => 'nullable|string|max:255',
            'category_id' => 'nullable|integer|min:1',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:5|max:50',
        ]);

        $storeId = (int) Auth::guard('pos_terminal')->user()->store_id;
        $q = trim((string) $request->input('q', ''));
        $perPage = (int) $request->input('per_page', 20);

        $query = Product::where('store_id', $storeId)->where('is_active', true);

        if ($request->filled('category_id')) {
            $categoryId = (int) $request->input('category_id');
            // Category must belong to the SAME store to keep tenant isolation.
            $belongs = \App\Models\Category::where('id', $categoryId)->where('store_id', $storeId)->exists();
            if (!$belongs) {
                return response()->json(['success' => false, 'message' => 'الفئة غير موجودة.'], 422);
            }
            $query->where('category_id', $categoryId);
        }

        if ($q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', "%{$q}%")
                    ->orWhere('sku', 'like', "%{$q}%")
                    ->orWhere('barcode', 'like', "%{$q}%");
            });
        }

        $products = $query->with('tax')->orderBy('name')->paginate($perPage);

        $rows = [];
        foreach ($products as $product) {
            $isVariant = InventoryService::isVariantInventory($product);
            $combos = $product->variant_combinations ?? [];
            $taxRate = (float) ($product->tax?->rate ?? 0);

            if ($isVariant && count($combos) > 0) {
                foreach ($combos as $combo) {
                    $rows[] = $this->toPosRow($product, [
                        'is_variant' => true,
                        'variant_id' => $combo['id'] ?? null,
                        'variant_uuid' => $combo['uuid'] ?? null,
                        'variant_label' => $combo['label'] ?? implode(' / ', $combo['values'] ?? []),
                        'sku' => $combo['sku'] ?? $product->sku,
                        'price' => (float) ($combo['price'] ?? $product->effectivePrice()),
                        'stock' => (int) ($combo['stock'] ?? 0),
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

    public function customers(Request $request)
    {
        $request->validate([
            'q' => 'nullable|string|max:255',
            'per_page' => 'nullable|integer|min:5|max:50',
        ]);

        $storeId = (int) Auth::guard('pos_terminal')->user()->store_id;
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

    public function store(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1|max:200',
            'items.*.product_id' => 'required|integer',
            'items.*.variant_id' => 'nullable|string|max:255',
            'items.*.variant_uuid' => 'nullable|string|max:255',
            'items.*.quantity' => 'required|integer|min:1|max:99999',
            'payment_method' => 'required|string|in:cash,bank,bank_transfer',
            'cash_collected' => 'nullable|boolean',
            'customer_id' => 'nullable|integer',
            'notes' => 'nullable|string|max:1000',
        ]);

        $terminal = Auth::guard('pos_terminal')->user();
        $storeId = (int) $terminal->store_id;

        try {
            $order = $this->posService->createPosSale(
                $storeId,
                $request->input('items'),
                $request->input('payment_method'),
                $request->has('customer_id') ? (int) $request->input('customer_id') : null,
                $request->input('notes'),
                true,
                $terminal->id,
                $terminal->username
            );

            return response()->json([
                'success' => true,
                'order_number' => $order->order_number,
                'order_id' => $order->id,
                'message' => 'تم إتمام البيع بنجاح.',
            ], 201);
        } catch (\Exception $e) {
            $message = $e->getMessage();
            if (stripos($message, 'insufficient stock') !== false) {
                return response()->json(['success' => false, 'message' => 'المخزون لم يعد كافيًا لإتمام البيع.'], 409);
            }
            if (preg_match('/[\x{0600}-\x{06FF}]/u', $message)) {
                return response()->json(['success' => false, 'message' => $message], 409);
            }
            \Illuminate\Support\Facades\Log::warning('Terminal POS sale failed', ['store_id'=>$storeId,'terminal_id'=>$terminal->id,'error'=>$e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'تعذر إتمام البيع.'], 422);
        }
    }

    public function categories(Request $request)
    {
        $storeId = (int) Auth::guard('pos_terminal')->user()->store_id;

        $categories = \App\Models\Category::where('store_id', $storeId)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json([
            'success' => true,
            'categories' => $categories,
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
}
