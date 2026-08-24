<?php

namespace App\Http\Controllers;

use App\Models\AbandonedCart;
use App\Models\Store;
use App\Services\AbandonedCartService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AbandonedCartController extends Controller
{
    protected $abandonedCartService;

    public function __construct(AbandonedCartService $abandonedCartService)
    {
        $this->abandonedCartService = $abandonedCartService;
    }

    /**
     * Display a listing of abandoned carts.
     * Supports both global (/abandoned-carts) and store-scoped (/stores/{store}/abandoned-carts) routes.
     * RBAC: STORE_OWNER / STORE_ADMIN can access filtered by activeStoreId without superAdmin.
     */
    public function index(Request $request, Store $store = null)
    {
        $user = Auth::user();

        // Resolve target store: route-bound store takes precedence, else current_store
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
            // Store-scoped access: verify ownership or store-admin without requiring superAdmin
            $currentStoreId = $targetStore->id;
            $isOwner = (int) $targetStore->user_id === (int) $user->id;
            $isActiveStore = (int) $user->current_store === (int) $currentStoreId;
            $isSuper = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();
            $isAdmin = method_exists($user, 'isAdmin') && $user->isAdmin();
            if (!$isSuper && !$isAdmin && !$isOwner && !$isActiveStore) {
                // Also allow if user has explicit store access via permission
                abort(403, 'Unauthorized store access');
            }
        } else {
            // Global route: filter strictly by activeStoreId for non-superAdmins
            $currentStoreId = $user->current_store;
            $isSuper = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();
            $isAdmin = method_exists($user, 'isAdmin') && $user->isAdmin();
            if (!$isSuper && !$isAdmin && !$currentStoreId) {
                abort(403, 'No active store selected');
            }
            // Non-super users are strictly scoped to their activeStoreId
        }

        $query = AbandonedCart::where('store_id', $currentStoreId);

        // Apply filters
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
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
    }

    /**
     * Send a manual reminder for a specific abandoned cart.
     * Store-scoped: validates against route store or activeStoreId without superAdmin requirement.
     */
    public function sendReminder(Request $request, AbandonedCart $abandonedCart)
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

        // Allow STORE_OWNER / STORE_ADMIN filtered by activeStoreId; verify cart belongs to target store
        if ((int) $abandonedCart->store_id !== (int) $targetStoreId) {
            abort(403, 'Unauthorized action.');
        }
        // Extra ownership check for store-scoped routes
        if ($routeStore) {
            $storeModel = $routeStore instanceof Store ? $routeStore : Store::find($targetStoreId);
            if ($storeModel) {
                $isOwner = (int) $storeModel->user_id === (int) $user->id;
                $isActive = (int) $user->current_store === (int) $targetStoreId;
                $isSuper = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();
                $isAdmin = method_exists($user, 'isAdmin') && $user->isAdmin();
                if (!$isSuper && !$isAdmin && !$isOwner && !$isActive) {
                    abort(403, 'Unauthorized store access');
                }
            }
        }

        $this->abandonedCartService->sendReminder($abandonedCart);

        return redirect()->back()->with('success', __('Reminder sent successfully!'));
    }

    /**
     * Mark an abandoned cart as recovered manually.
     */
    public function markRecovered(Request $request, AbandonedCart $abandonedCart)
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

        if ((int) $abandonedCart->store_id !== (int) $targetStoreId) {
            abort(403, 'Unauthorized action.');
        }
        if ($routeStore) {
            $storeModel = $routeStore instanceof Store ? $routeStore : Store::find($targetStoreId);
            if ($storeModel) {
                $isOwner = (int) $storeModel->user_id === (int) $user->id;
                $isActive = (int) $user->current_store === (int) $targetStoreId;
                $isSuper = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();
                $isAdmin = method_exists($user, 'isAdmin') && $user->isAdmin();
                if (!$isSuper && !$isAdmin && !$isOwner && !$isActive) {
                    abort(403, 'Unauthorized store access');
                }
            }
        }

        $abandonedCart->update([
            'status' => 'recovered',
            'recovered_at' => now(),
        ]);

        return redirect()->back()->with('success', __('Cart marked as recovered!'));
    }

    /**
     * Remove the specified abandoned cart.
     */
    public function destroy(Request $request, AbandonedCart $abandonedCart)
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

        if ((int) $abandonedCart->store_id !== (int) $targetStoreId) {
            abort(403, 'Unauthorized action.');
        }
        if ($routeStore) {
            $storeModel = $routeStore instanceof Store ? $routeStore : Store::find($targetStoreId);
            if ($storeModel) {
                $isOwner = (int) $storeModel->user_id === (int) $user->id;
                $isActive = (int) $user->current_store === (int) $targetStoreId;
                $isSuper = method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();
                $isAdmin = method_exists($user, 'isAdmin') && $user->isAdmin();
                if (!$isSuper && !$isAdmin && !$isOwner && !$isActive) {
                    abort(403, 'Unauthorized store access');
                }
            }
        }

        $abandonedCart->delete();

        if ($routeStore) {
            $storeId = $routeStore instanceof Store ? $routeStore->id : $targetStoreId;
            return redirect()->route('stores.abandoned-carts.index', $storeId)->with('success', __('Cart deleted successfully!'));
        }
        return redirect()->route('abandoned-carts.index')->with('success', __('Cart deleted successfully!'));
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

        $carts = AbandonedCart::where('store_id', $currentStoreId)
            ->orderBy('last_activity_at', 'desc')
            ->get();

        $csvData = [];
        $csvData[] = ['Customer Name', 'Email', 'Phone', 'Cart Total', 'Status', 'Items Count', 'Reminders Sent', 'Last Activity', 'Recovered At'];

        foreach ($carts as $cart) {
            $items = is_array($cart->cart_items) ? $cart->cart_items : [];
            $csvData[] = [
                $cart->customer_name ?? 'N/A',
                $cart->customer_email ?? 'N/A',
                $cart->customer_phone ?? 'N/A',
                number_format($cart->cart_total, 2),
                ucfirst($cart->status),
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
    }
}
