<?php

namespace App\Http\Controllers;

use App\Models\DeliveryAssignment;
use App\Models\DeliveryDriver;
use App\Models\DeliveryZone;
use App\Models\Order;
use App\Services\DeliveryLifecycleService;
use App\Services\MerchantNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

/**
 * Merchant Delivery Operations Board.
 *
 * Server-side pagination/filtering only — never loads the whole store's
 * orders into PHP memory. Mobile-friendly cards render on the frontend.
 */
class DeliveryController extends Controller
{
    /**
     * Order statuses still in-flight and thus part of the operational board.
     *
     * Terminal orders (delivered/completed POS sales, cancelled, failed, …)
     * keep delivery_status='unassigned' by default but do NOT need a driver, so
     * they must never count or appear in the "غير معيّن" column. This constant is
     * the single source of truth shared by the bucket count and the card query —
     * previously the two filtered differently (count 1 vs 2 cards).
     */
    public const OPERATIONAL_DELIVERY_STATUSES = ['pending', 'confirmed', 'processing', 'shipped'];

    /**
     * Delivery Hub — canonical merchant entry for "الشحن والتوصيل".
     * Consolidates overview, operational board, methods, zones, drivers, companies, settings
     * while preserving backend isolation (Shipping vs DeliveryZone vs Drivers vs CourierIntegrations).
     *
     * Query ?tab= controls internal hub navigation; default "overview".
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $store = \App\Models\Store::find($storeId);
        $shippingEnabled = $store ? $store->canUsePlanFeature('shipping_method') : true;

        $filters = $request->validate([
            'tab' => 'nullable|string|in:overview,orders,methods,zones,drivers,companies,settings',
            'bucket' => 'nullable|string|in:unassigned,assigned,picked_up,out_for_delivery,delivered,delivery_failed,returned,cancelled,all',
            'zone_id' => 'nullable|integer',
            'driver_id' => 'nullable|integer',
            'search' => 'nullable|string|max:100',
            'status' => 'nullable|string',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
            'per_page' => 'nullable|integer|min:5|max:100',
        ]);

        $query = Order::where('orders.store_id', $storeId)
            ->with([
                'items' => fn($q) => $q->select('id', 'order_id', 'product_name', 'quantity'),
                'deliveryDriver:id,name,phone',
            ]);

        $bucket = $filters['bucket'] ?? 'unassigned';
        if ($bucket === 'all') {
            // no bucket filter
        } elseif ($bucket === 'unassigned') {
            // Operational column: only in-flight orders need a driver. Terminal
            // orders (completed POS sales, cancelled, refunded, failed, …) keep
            // delivery_status='unassigned' but must not pollute the board —
            // mirrors the unassigned bucket count below (kept in sync).
            $query->where('orders.delivery_status', $bucket)
                ->whereIn('orders.status', self::OPERATIONAL_DELIVERY_STATUSES);
        } else {
            $query->where('orders.delivery_status', $bucket);
        }

        if (!empty($filters['zone_id'])) {
            $query->where('orders.delivery_zone_id', $filters['zone_id']);
        }
        if (!empty($filters['driver_id'])) {
            $query->where('orders.delivery_driver_id', $filters['driver_id']);
        }
        if (!empty($filters['search'])) {
            $term = trim((string) $filters['search']);
            $query->where(function ($q) use ($term) {
                $q->where('orders.order_number', 'like', "%{$term}%")
                    ->orWhere('orders.customer_first_name', 'like', "%{$term}%")
                    ->orWhere('orders.customer_last_name', 'like', "%{$term}%")
                    ->orWhere('orders.customer_phone', 'like', "%{$term}%");
            });
        }
        if (!empty($filters['status'])) {
            $query->where('orders.status', $filters['status']);
        }
        if (!empty($filters['date_from'])) {
            $query->whereDate('orders.created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('orders.created_at', '<=', $filters['date_to']);
        }

        $perPage = (int) ($filters['per_page'] ?? 25);
        $orders = $query
            ->orderByDesc('orders.created_at')
            ->select([
                'id', 'order_number', 'store_id', 'delivery_zone_id', 'delivery_zone_name',
                'delivery_driver_id', 'delivery_status', 'delivery_fee', 'delivery_assigned_at',
                'status', 'payment_status', 'payment_method',
                'customer_first_name', 'customer_last_name', 'customer_phone',
                'shipping_address', 'shipping_city', 'total_amount', 'currency', 'created_at',
            ])
            ->paginate($perPage)
            ->withQueryString();

        // Bucket counts (cheap indexed queries, not the full board)
        $counts = [
            'unassigned' => Order::where('store_id', $storeId)->where('delivery_status', 'unassigned')->whereIn('status', self::OPERATIONAL_DELIVERY_STATUSES)->count(),
            'assigned' => Order::where('store_id', $storeId)->where('delivery_status', 'assigned')->count(),
            'picked_up' => Order::where('store_id', $storeId)->where('delivery_status', 'picked_up')->count(),
            'out_for_delivery' => Order::where('store_id', $storeId)->where('delivery_status', 'out_for_delivery')->count(),
            'delivered' => Order::where('store_id', $storeId)->where('delivery_status', 'delivered')->count(),
            'delivery_failed' => Order::where('store_id', $storeId)->where('delivery_status', 'delivery_failed')->count(),
            'returned' => Order::where('store_id', $storeId)->where('delivery_status', 'returned')->count(),
            'cancelled' => Order::where('store_id', $storeId)->where('delivery_status', 'cancelled')->count(),
        ];

        $zones = DeliveryZone::where('store_id', $storeId)->orderBy('name')->get(['id', 'name', 'fee', 'is_active', 'est_time_text']);
        $drivers = DeliveryDriver::where('store_id', $storeId)->orderBy('name')->get(['id', 'name', 'active', 'phone']);

        // Hub aggregation — authoritative per-store counts (no cross-store leakage)
        $currentTab = $filters['tab'] ?? 'overview';

        // Shipping methods (legacy but still authoritative for checkout)
        $shippings = \App\Models\Shipping::where('store_id', $storeId)->orderBy('sort_order')->orderBy('name')->get();
        $shippingStats = [
            'total' => $shippings->count(),
            'active' => $shippings->where('is_active', true)->count(),
        ];

        // Delivery zones full details for hub pricing view
        $zonesDetailed = \App\Models\DeliveryZone::where('store_id', $storeId)
            ->orderBy('sort_order')->orderBy('name')
            ->get()->map(fn($z) => [
                'id' => $z->id,
                'name' => $z->name,
                'description' => $z->description,
                'fee' => (float) $z->fee,
                'is_active' => (bool) $z->is_active,
                'sort_order' => (int) $z->sort_order,
                'est_time_text' => $z->est_time_text,
                'free_delivery_threshold' => $z->free_delivery_threshold,
                'min_order_amount' => $z->min_order_amount,
            ]);

        // Drivers detailed for hub
        $driversDetailed = \App\Models\DeliveryDriver::where('store_id', $storeId)
            ->orderBy('name')->get()->map(fn($d) => [
                'id' => $d->id,
                'name' => $d->name,
                'phone' => $d->phone,
                'active' => (bool) $d->active,
                'code' => $d->code,
            ]);

        // Courier integrations (truthful, no fake API claims)
        $courierIntegrations = [];
        $courierRequests = [];
        try {
            $courierIntegrations = \App\Models\StoreCourierIntegration::where('store_id', $storeId)
                ->get()->map(fn($c) => [
                    'id' => $c->id,
                    'provider' => $c->provider,
                    'display_name' => $c->display_name,
                    'status' => $c->status,
                    'is_active' => (bool) $c->is_active,
                    'last_error' => $c->last_error,
                    'last_tested_at' => $c->last_tested_at?->toISOString(),
                ])->values();
            // Optional courier requests if table exists
            if (\Illuminate\Support\Facades\Schema::hasTable('store_courier_connection_requests')) {
                $courierRequests = \App\Models\StoreCourierConnectionRequest::where('store_id', $storeId)->get(['id','provider','status'])->values();
            }
        } catch (\Throwable $e) {
            // silent fallback for hubs without courier tables
        }

        // Free shipping authoritative config
        $storeConfig = \App\Models\StoreConfiguration::getConfiguration($storeId);
        $freeEnabled = \App\Models\StoreConfiguration::toBool($storeConfig['free_shipping_enabled'] ?? null, false);
        $freeThresholdRaw = $storeConfig['free_shipping_threshold'] ?? null;
        $freeThresholdVal = is_numeric($freeThresholdRaw) && (float)$freeThresholdRaw > 0 ? (float)$freeThresholdRaw : null;

        $hubStats = [
            'methods_total' => $shippingStats['total'],
            'methods_active' => $shippingStats['active'],
            'zones_total' => $zonesDetailed->count(),
            'zones_active' => $zonesDetailed->where('is_active', true)->count(),
            'drivers_total' => $driversDetailed->count(),
            'drivers_active' => $driversDetailed->where('active', true)->count(),
            'unassigned_orders' => $counts['unassigned'] ?? 0,
            'courier_integrations' => count($courierIntegrations),
            'free_shipping_enabled' => $freeEnabled,
            'free_shipping_threshold' => $freeThresholdVal,
        ];

        // Delivery setup readiness — a truthful read-model computed from the same
        // store-scoped facts the checkout uses. A single active method is enough:
        // the storefront checkout API only exposes methods when is_active = true.
        // Local delivery zones are an optional coverage layer and are never a
        // prerequisite for a method to be usable.
        $activeMethods = $shippings->where('is_active', true);
        $inactiveMethods = $shippings->where('is_active', false);
        $deliveryReadiness = [
            'entitled' => (bool) $shippingEnabled,
            'has_methods' => $shippings->count() > 0,
            'has_active_method' => $activeMethods->count() > 0,
            'active_methods_count' => $activeMethods->count(),
            'methods_total' => $shippings->count(),
            'zones_active_count' => (int) $zonesDetailed->where('is_active', true)->count(),
            'zones_optional' => true,
            'first_inactive_method_id' => $inactiveMethods->first()?->id ?? null,
        ];

        return Inertia::render('delivery/index', [
            'orders' => $orders,
            'zones' => $zones,
            'drivers' => $drivers,
            'counts' => $counts,
            'filters' => $filters,
            'currentTab' => $currentTab,
            'hubStats' => $hubStats,
            'shippings' => $shippings,
            'shippingStats' => $shippingStats,
            'zonesDetailed' => $zonesDetailed,
            'driversDetailed' => $driversDetailed,
            'courierIntegrations' => $courierIntegrations,
            'courierRequests' => $courierRequests,
            'shippingEnabled' => $shippingEnabled,
            'deliveryReadiness' => $deliveryReadiness,
            'freeShipping' => [
                'enabled' => $freeEnabled,
                'threshold' => $freeThresholdVal,
            ],
        ]);
    }

    /**
     * Assign a driver to an order.
     * Server enforces driver.store_id == order.store_id.
     */
    public function assign(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $data = $request->validate([
            'driver_id' => 'required|integer',
            'zone_id' => 'nullable|integer',
        ]);

        $order = Order::where('store_id', $storeId)->where('id', $id)->firstOrFail();
        $driver = DeliveryDriver::where('store_id', $storeId)->where('id', $data['driver_id'])->first();

        if (!$driver) {
            return response()->json(['message' => 'السائق المحدد غير صالح لهذا المتجر.'], 422);
        }

        try {
            $assignment = DeliveryLifecycleService::assignDriver($order, $driver, $data['zone_id'] ?? null);
            try {
                MerchantNotificationService::deliveryDriverAssigned($order->fresh(), $driver->name);
            } catch (\Throwable $e) {
                Log::warning('Driver assigned notification failed', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            }
            return response()->json([
                'message' => 'تم تعيين السائق بنجاح.',
                'assignment' => $assignment,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Reassign driver on an order.
     */
    public function reassign(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $data = $request->validate(['driver_id' => 'required|integer']);

        $order = Order::where('store_id', $storeId)->where('id', $id)->firstOrFail();
        $driver = DeliveryDriver::where('store_id', $storeId)->where('id', $data['driver_id'])->first();

        if (!$driver) {
            return response()->json(['message' => 'السائق المحدد غير صالح لهذا المتجر.'], 422);
        }

        try {
            $assignment = DeliveryLifecycleService::reassignDriver($order, $driver);
            try {
                MerchantNotificationService::deliveryDriverAssigned($order->fresh(), $driver->name);
            } catch (\Throwable $e) {
                Log::warning('Reassign notification failed', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            }
            return response()->json(['message' => 'تم إعادة تعيين السائق بنجاح.', 'assignment' => $assignment]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Unassign the current driver (back to unassigned) where safe.
     */
    public function unassign(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $order = Order::where('store_id', $storeId)->where('id', $id)->firstOrFail();

        try {
            DeliveryLifecycleService::unassignDriver($order);
            return response()->json(['message' => 'تم إلغاء تعيين السائق.']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Server-controlled delivery lifecycle transition.
     * validate: assignment belongs to store+order; transition allowed.
     */
    public function transition(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $data = $request->validate([
            'status' => 'required|string|in:assigned,picked_up,out_for_delivery,delivered,delivery_failed,returned,cancelled',
            'reason' => 'nullable|string|max:500',
            'assignment_id' => 'nullable|integer',
        ]);

        $order = Order::where('store_id', $storeId)->where('id', $id)->firstOrFail();

        try {
            $assignment = DeliveryLifecycleService::transition($order, $data['status'], $data['reason'] ?? null, $data['assignment_id'] ?? null);

            // Delivery notifications (delivery completed/failed handled inside service)
            if ($data['status'] === 'delivery_failed') {
                try {
                    MerchantNotificationService::deliveryFailed($order->fresh(), $data['reason'] ?? null);
                } catch (\Throwable $e) {
                    Log::warning('Delivery failed notification failed', ['order_id' => $order->id, 'error' => $e->getMessage()]);
                }
            }

            return response()->json([
                'message' => 'تم تحديث حالة التوصيل بنجاح.',
                'assignment' => $assignment,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}