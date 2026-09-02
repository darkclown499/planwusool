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
     * Operational board with buckets: unassigned / assigned / out_for_delivery / delivered / failed.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $filters = $request->validate([
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
            'unassigned' => Order::where('store_id', $storeId)->where('delivery_status', 'unassigned')->whereIn('status', ['pending','confirmed','processing','shipped'])->count(),
            'assigned' => Order::where('store_id', $storeId)->where('delivery_status', 'assigned')->count(),
            'picked_up' => Order::where('store_id', $storeId)->where('delivery_status', 'picked_up')->count(),
            'out_for_delivery' => Order::where('store_id', $storeId)->where('delivery_status', 'out_for_delivery')->count(),
            'delivered' => Order::where('store_id', $storeId)->where('delivery_status', 'delivered')->count(),
            'delivery_failed' => Order::where('store_id', $storeId)->where('delivery_status', 'delivery_failed')->count(),
            'returned' => Order::where('store_id', $storeId)->where('delivery_status', 'returned')->count(),
            'cancelled' => Order::where('store_id', $storeId)->where('delivery_status', 'cancelled')->count(),
        ];

        $zones = DeliveryZone::where('store_id', $storeId)->orderBy('name')->get(['id', 'name']);
        $drivers = DeliveryDriver::where('store_id', $storeId)->orderBy('name')->get(['id', 'name', 'active']);

        return Inertia::render('delivery/index', [
            'orders' => $orders,
            'zones' => $zones,
            'drivers' => $drivers,
            'counts' => $counts,
            'filters' => $filters,
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