<?php

namespace App\Http\Controllers;

use App\Models\AbandonedCart;
use App\Models\Store;
use App\Services\AbandonedCartService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class AbandonedCartController extends Controller
{
    protected $abandonedCartService;

    public function __construct(AbandonedCartService $abandonedCartService)
    {
        $this->abandonedCartService = $abandonedCartService;
    }

    /**
     * Resolve the target store from request and verify authorization.
     */
    private function resolveStoreAndAuthorize(Request $request): ?int
    {
        $user = Auth::user();
        $routeStore = $request->route('store');
        $targetStoreId = null;

        if ($routeStore instanceof Store) {
            $targetStoreId = $routeStore->id;
        } elseif (is_numeric($routeStore)) {
            $targetStoreId = (int) $routeStore;
        } else {
            $targetStoreId = $user->current_store;
        }

        if ($targetStoreId) {
            $storeModel = ($routeStore instanceof Store) ? $routeStore : Store::find($targetStoreId);
            $isSuper = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();
            $isAdmin = method_exists($user, 'isAdmin') && $user->isAdmin();
            $isOwner = $storeModel ? ((int) $storeModel->user_id === (int) $user->id) : false;
            $isActive = (int) $user->current_store === (int) $targetStoreId;

            if (!$isSuper && !$isAdmin && !$isOwner && !$isActive) {
                abort(403, 'Unauthorized store access');
            }
        }

        return $targetStoreId;
    }

    /**
     * Manually resolve AbandonedCart from route parameter.
     * This avoids implicit route model binding issues when the route has
     * multiple parameters (e.g., stores/{store}/abandoned-carts/{abandonedCart})
     * where positional parameter passing causes the {store} value to displace
     * the {abandonedCart} model binding.
     */
    private function resolveAbandonedCart(Request $request): AbandonedCart
    {
        $cartId = $request->route('abandonedCart');
        if (!$cartId) {
            abort(404, 'Abandoned cart not found.');
        }
        $cart = AbandonedCart::find($cartId);
        if (!$cart) {
            abort(404, 'Abandoned cart not found.');
        }
        return $cart;
    }

    /**
     * Verify that a cart belongs to the target store.
     */
    private function verifyCartOwnership(AbandonedCart $cart, ?int $targetStoreId): void
    {
        if ($targetStoreId && (int) $cart->store_id !== (int) $targetStoreId) {
            abort(403, 'Unauthorized action.');
        }
    }

    /**
     * Display a listing of abandoned carts.
     */
    public function index(Request $request, Store $store = null)
    {
        try {
            $user = Auth::user();

            $routeStore = $request->route('store');
            if ($routeStore instanceof Store) {
                $targetStore = $routeStore;
            } elseif (is_numeric($routeStore)) {
                $targetStore = Store::find($routeStore);
            } elseif ($store instanceof Store && $store->exists) {
                $targetStore = $store;
            } else {
                $targetStore = null;
            }

            if ($targetStore) {
                $currentStoreId = $targetStore->id;
                $isOwner = (int) $targetStore->user_id === (int) $user->id;
                $isActiveStore = (int) $user->current_store === (int) $currentStoreId;
                $isSuper = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();
                $isAdmin = method_exists($user, 'isAdmin') && $user->isAdmin();
                if (!$isSuper && !$isAdmin && !$isOwner && !$isActiveStore) {
                    abort(403, 'Unauthorized store access');
                }
            } else {
                $currentStoreId = $user->current_store;
                $isSuper = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();
                $isAdmin = method_exists($user, 'isAdmin') && $user->isAdmin();
                if (!$isSuper && !$isAdmin && !$currentStoreId) {
                    abort(403, 'No active store selected');
                }
            }

            $query = AbandonedCart::where('store_id', $currentStoreId);

            if ($request->has('status') && $request->status !== 'all') {
                $query->where('status', $request->status);
            } else {
                $query->whereNotIn('status', ['recovered', 'expired', 'unsubscribed']);
            }
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('customer_name', 'like', "%{$search}%")
                        ->orWhere('customer_email', 'like', "%{$search}%")
                        ->orWhere('customer_phone', 'like', "%{$search}%");
                });
            }
            if ($request->has('date_from') && $request->date_from) {
                $query->whereDate('last_activity_at', '>=', $request->date_from);
            }
            if ($request->has('date_to') && $request->date_to) {
                $query->whereDate('last_activity_at', '<=', $request->date_to);
            }

            $perPage = $request->get('per_page', 15);
            $carts = $query->latest('last_activity_at')->paginate($perPage);

            // Attach the WhatsApp recovery deep-link action per cart (Phase 1:
            // wa.me only — the merchant opens a prefilled compose dialog).
            $whatsAppCommerce = app(\App\Services\WhatsAppCommerceService::class);
            $carts->getCollection()->transform(function ($cart) use ($whatsAppCommerce, $currentStoreId) {
                $cart->whatsapp_action = $currentStoreId && (int) $cart->store_id === (int) $currentStoreId
                    ? $whatsAppCommerce->abandonedCartAction((int) $cart->id)
                    : null;
                return $cart;
            });

            $stats = $currentStoreId ? $this->abandonedCartService->getStats($currentStoreId) : [];

            $currencySymbol = '₪';
            if ($currentStoreId) {
                try {
                    $currencySettings = app(\App\Services\Currency\CurrencyService::class)
                        ->getCurrencySettings($user->id, $currentStoreId);
                    $currency = \App\Models\Currency::where('code', $currencySettings['defaultCurrency'] ?? 'ILS')->first();
                    $currencySymbol = $currency ? $currency->symbol : '₪';
                } catch (\Throwable $e) {
                    $currencySymbol = '₪';
                }
            }

            return Inertia::render('abandoned-carts/index', [
                'carts' => $carts,
                'filters' => $request->only(['search', 'status', 'date_from', 'date_to', 'per_page']),
                'stats' => $stats,
                'currency_symbol' => $currencySymbol,
                'activeStoreId' => $currentStoreId,
            ]);
        } catch (\Throwable $e) {
            Log::error('Abandoned carts index failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            abort(500, 'Failed to load abandoned carts.');
        }
    }

    /**
     * Send a manual reminder for a specific abandoned cart.
     */
    public function sendReminder(Request $request)
    {
        $abandonedCart = $this->resolveAbandonedCart($request);
        $targetStoreId = $this->resolveStoreAndAuthorize($request);
        $this->verifyCartOwnership($abandonedCart, $targetStoreId);

        try {
            $result = $this->abandonedCartService->sendReminder($abandonedCart);

            if ($result['success']) {
                return redirect()->back()->with('success', $result['message']);
            }
            return redirect()->back()->withErrors(['error' => $result['message']]);
        } catch (\Throwable $e) {
            Log::error('Send reminder failed: ' . $e->getMessage(), [
                'cart_id' => $request->route('abandonedCart'),
                'trace' => $e->getTraceAsString(),
            ]);
            return redirect()->back()->withErrors(['error' => 'حدث خطأ أثناء إرسال التذكير.']);
        }
    }

    /**
     * Mark an abandoned cart as recovered manually.
     */
    public function markRecovered(Request $request)
    {
        $abandonedCart = $this->resolveAbandonedCart($request);
        $targetStoreId = $this->resolveStoreAndAuthorize($request);
        $this->verifyCartOwnership($abandonedCart, $targetStoreId);

        try {
            if ($abandonedCart->status === 'recovered') {
                return redirect()->back()->with('success', 'هذه السلة مستردة بالفعل.');
            }

            $abandonedCart->update([
                'status' => 'recovered',
                'recovered_at' => now(),
            ]);

            return redirect()->back()->with('success', 'تم تحديد السلة كمستردة!');
        } catch (\Throwable $e) {
            Log::error('Mark recovered failed: ' . $e->getMessage(), [
                'cart_id' => $request->route('abandonedCart'),
                'trace' => $e->getTraceAsString(),
            ]);
            return redirect()->back()->withErrors(['error' => 'حدث خطأ أثناء تحديد السلة كمستردة.']);
        }
    }

    /**
     * Remove the specified abandoned cart.
     */
    public function destroy(Request $request)
    {
        $abandonedCart = $this->resolveAbandonedCart($request);
        $targetStoreId = $this->resolveStoreAndAuthorize($request);
        $this->verifyCartOwnership($abandonedCart, $targetStoreId);

        try {
            $abandonedCart->delete();

            if ($targetStoreId) {
                return redirect()->route('stores.abandoned-carts.index', $targetStoreId)->with('success', __('Cart deleted successfully!'));
            }
            return redirect()->route('abandoned-carts.index')->with('success', __('Cart deleted successfully!'));
        } catch (\Throwable $e) {
            Log::error('Delete abandoned cart failed: ' . $e->getMessage(), [
                'cart_id' => $request->route('abandonedCart'),
                'trace' => $e->getTraceAsString(),
            ]);
            return redirect()->back()->withErrors(['error' => 'حدث خطأ أثناء حذف السلة.']);
        }
    }

    /**
     * Export abandoned carts data as CSV.
     */
    public function export(Request $request)
    {
        $user = Auth::user();
        $routeStore = $request->route('store');
        $currentStoreId = null;
        if ($routeStore instanceof Store) {
            $currentStoreId = $routeStore->id;
            $isOwner = (int) $routeStore->user_id === (int) $user->id;
            $isActive = (int) $user->current_store === (int) $currentStoreId;
            $isSuper = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();
            $isAdmin = method_exists($user, 'isAdmin') && $user->isAdmin();
            if (!$isSuper && !$isAdmin && !$isOwner && !$isActive) {
                abort(403, 'Unauthorized store access');
            }
        } elseif (is_numeric($routeStore)) {
            $currentStoreId = (int) $routeStore;
            $storeModel = Store::find($currentStoreId);
            if ($storeModel) {
                $isOwner = (int) $storeModel->user_id === (int) $user->id;
                $isActive = (int) $user->current_store === (int) $currentStoreId;
                $isSuper = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();
                $isAdmin = method_exists($user, 'isAdmin') && $user->isAdmin();
                if (!$isSuper && !$isAdmin && !$isOwner && !$isActive) {
                    abort(403, 'Unauthorized store access');
                }
            }
        } else {
            $currentStoreId = $user->current_store;
        }

        try {
            $statusLabels = [
                'new' => 'جديدة',
                'draft' => 'مسودة',
                'abandoned' => 'متروكة',
                'reminder_sent' => 'تم إرسال تذكير',
                'recovered' => 'مستردة',
                'expired' => 'منتهية',
                'unsubscribed' => 'إلغاء الاشتراك',
            ];

            $carts = AbandonedCart::where('store_id', $currentStoreId)
                ->orderBy('last_activity_at', 'desc')
                ->get();

            $csvData = [];
            $csvData[] = ['اسم العميل', 'البريد الإلكتروني', 'الهاتف', 'إجمالي السلة', 'الحالة', 'عدد المنتجات', 'عدد التذكيرات', 'آخر نشاط', 'تاريخ الاسترداد'];

            foreach ($carts as $cart) {
                $items = is_array($cart->cart_items) ? $cart->cart_items : [];
                $csvData[] = [
                    $cart->customer_name ?? 'N/A',
                    $cart->customer_email ?? 'N/A',
                    $cart->customer_phone ?? 'N/A',
                    $this->formatCartTotalForExport($cart->cart_total),
                    $statusLabels[$cart->status] ?? ucfirst($cart->status),
                    count($items),
                    $cart->reminder_count,
                    $cart->last_activity_at ? $cart->last_activity_at->format('Y-m-d H:i:s') : 'N/A',
                    $cart->recovered_at ? $cart->recovered_at->format('Y-m-d H:i:s') : 'N/A',
                ];
            }

            $filename = 'abandoned-carts-export-' . now()->format('Y-m-d') . '.csv';

            $headers = [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ];

            $callback = function () use ($csvData) {
                $file = fopen('php://output', 'w');
                foreach ($csvData as $row) {
                    fputcsv($file, $row);
                }
                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        } catch (\Throwable $e) {
            Log::error('Export abandoned carts failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            abort(500, 'Failed to export abandoned carts.');
        }
    }

    /**
     * Safely format cart_total for CSV export without throwing TypeError.
     *
     * Money rule: formatting is presentation only. We never mutate persisted values.
     * - numeric strings/ints/floats (including DB decimal strings like "120.50") are formatted to 2 decimals
     * - null/empty is treated as 0.00 to keep CSV numeric consistency (DB default is 0)
     * - genuinely malformed values (e.g. "1,200" with thousands separator, currency-decorated text, array) are preserved as raw string to avoid fabricating 0
     */
    private function formatCartTotalForExport($value): string
    {
        if ($value === null || $value === '') {
            return '0.00';
        }
        if (is_numeric($value)) {
            return number_format((float) $value, 2, '.', '');
        }
        if (is_string($value) && is_numeric(trim(str_replace(',', '', $value)))) {
            // Preserve evidence: do not silently strip commas — return raw trimmed value
            // Merchant can see original malformed value; we do not fabricate a corrected number.
            return trim($value);
        }
        if (is_array($value) || is_object($value)) {
            return '—';
        }
        // Non-numeric scalar (e.g. "abc", "₪100") — preserve raw evidence
        return trim((string) $value) !== '' ? trim((string) $value) : '0.00';
    }
}
