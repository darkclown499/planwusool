<?php

namespace App\Http\Controllers;

use App\Models\DeliveryDriver;
use App\Services\PhoneNormalizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DeliveryDriverController extends Controller
{
    /**
     * Delivery Drivers — merchant-managed, store-scoped.
     */
    public function index()
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $drivers = DeliveryDriver::where('store_id', $storeId)
            ->orderBy('name')
            ->get()
            ->map(function ($driver) {
                return [
                    'id' => $driver->id,
                    'name' => $driver->name,
                    'phone' => $driver->phone,
                    'active' => (bool) $driver->active,
                    'notes' => $driver->notes,
                    'vehicle_info' => $driver->vehicle_info,
                    'code' => $driver->code,
                    'active_assignments' => $driver->assignments()
                        ->whereIn('delivery_status', ['assigned', 'picked_up', 'out_for_delivery'])
                        ->count(),
                    'today_deliveries' => $driver->assignments()
                        ->where('delivered_at', '>=', now()->startOfDay())
                        ->count(),
                ];
            });

        return Inertia::render('delivery/drivers/index', [
            'drivers' => $drivers,
            'stats' => [
                'total' => $drivers->count(),
                'active' => $drivers->where('active', true)->count(),
            ],
        ]);
    }

    public function create(Request $request)
    {
        return Inertia::render('delivery/drivers/form', [
            'driver' => null,
            'return_to' => $this->validatedReturnTo($request->input('return_to')),
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $data = $this->validateDriver($request);
        $data['store_id'] = $storeId;
        if (!empty($data['phone'])) {
            $normalized = PhoneNormalizer::normalize($data['phone']);
            if ($normalized) $data['phone'] = $normalized;
        }

        DeliveryDriver::create($data);

        $returnTo = $this->validatedReturnTo($request->input('return_to'));
        if ($returnTo) {
            return redirect($returnTo)->with('success', 'تم إضافة السائق بنجاح.');
        }

        return redirect()->route('delivery.drivers.index')->with('success', 'تم إضافة السائق بنجاح.');
    }

    public function edit($id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $driver = DeliveryDriver::where('store_id', $storeId)->where('id', $id)->firstOrFail();

        return Inertia::render('delivery/drivers/form', [
            'driver' => $driver,
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $driver = DeliveryDriver::where('store_id', $storeId)->where('id', $id)->firstOrFail();

        $data = $this->validateDriver($request);
        if (!empty($data['phone'])) {
            $normalized = PhoneNormalizer::normalize($data['phone']);
            if ($normalized) $data['phone'] = $normalized;
        }
        $driver->update($data);

        return redirect()->route('delivery.drivers.index')->with('success', 'تم تحديث بيانات السائق بنجاح.');
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $driver = DeliveryDriver::where('store_id', $storeId)->where('id', $id)->firstOrFail();

        // Active assignments become driver-less (null driver) via nullOnDelete FK.
        $driver->delete();

        return redirect()->route('delivery.drivers.index')->with('success', 'تم حذف السائق.');
    }

    public function toggleStatus(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $driver = DeliveryDriver::where('store_id', $storeId)->where('id', $id)->firstOrFail();
        $driver->update(['active' => !$driver->active]);

        return redirect()->route('delivery.drivers.index')->with('success', 'تم تحديث حالة السائق.');
    }

    /**
     * Driver detail — active assignments, today's deliveries, completed/failed.
     */
    public function show($id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $driver = DeliveryDriver::where('store_id', $storeId)->where('id', $id)->firstOrFail();

        $activeAssignments = $driver->assignments()
            ->with('order:id,order_number,customer_first_name,customer_last_name,customer_phone,delivery_status,delivery_zone_name,delivery_fee,total_amount,status,payment_status,payment_method')
            ->whereIn('delivery_status', ['assigned', 'picked_up', 'out_for_delivery'])
            ->orderByDesc('assigned_at')
            ->get();

        $todayStart = now()->startOfDay();

        $metrics = [
            'active' => $activeAssignments->count(),
            'today_delivered' => $driver->assignments()->where('delivered_at', '>=', $todayStart)->count(),
            'today_failed' => $driver->assignments()->where('failed_at', '>=', $todayStart)->count(),
            'completed_total' => $driver->assignments()->where('delivery_status', 'delivered')->count(),
        ];

        return Inertia::render('delivery/drivers/show', [
            'driver' => [
                'id' => $driver->id,
                'name' => $driver->name,
                'phone' => $driver->phone,
                'active' => (bool) $driver->active,
                'notes' => $driver->notes,
                'vehicle_info' => $driver->vehicle_info,
                'code' => $driver->code,
                'created_at' => $driver->created_at?->format('Y-m-d'),
            ],
            'metrics' => $metrics,
            'activeAssignments' => $activeAssignments->map(fn($a) => [
                'id' => $a->id,
                'order_id' => $a->order_id,
                'order_number' => $a->order?->order_number,
                'customer_name' => trim(($a->order?->customer_first_name ?? '') . ' ' . ($a->order?->customer_last_name ?? '')),
                'customer_phone' => $a->order?->customer_phone,
                'zone_name' => $a->zone_name_snapshot ?? $a->order?->delivery_zone_name,
                'delivery_fee' => (float) ($a->delivery_fee_snapshot ?? $a->order?->delivery_fee),
                'total_amount' => (float) $a->order?->total_amount,
                'status' => $a->delivery_status,
                'assigned_at' => $a->assigned_at?->format('Y-m-d H:i'),
                'payment_method' => $a->order?->payment_method,
                'payment_status' => $a->order?->payment_status,
            ])->values(),
        ]);
    }

    private function validateDriver(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:30',
            'active' => 'nullable|boolean',
            'notes' => 'nullable|string',
            'vehicle_info' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:50',
        ]);
    }

    /**
     * Resolve a merchant-return destination after creating a driver.
     * Only known internal delivery paths are allowed — prevents open redirects.
     */
    private function validatedReturnTo($value): ?string
    {
        if (!is_string($value) || $value === '' || $value === null) {
            return null;
        }

        $parsed = parse_url($value);
        // Must be a relative internal path (no scheme / host / credentials).
        if ($parsed === false || isset($parsed['scheme'], $parsed['host'])) {
            return null;
        }

        $path = rtrim($parsed['path'] ?? '/' . parse_url($value, PHP_URL_PATH) . '', '/');

        if (in_array($path, ['/delivery', '/delivery/drivers'], true)) {
            return $value;
        }

        return null;
    }
}