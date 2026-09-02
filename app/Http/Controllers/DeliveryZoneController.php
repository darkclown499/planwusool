<?php

namespace App\Http\Controllers;

use App\Models\DeliveryZone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DeliveryZoneController extends Controller
{
    /**
     * Delivery Zones — merchant-managed, store-scoped.
     */
    public function index()
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $zones = DeliveryZone::where('store_id', $storeId)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn($zone) => [
                'id' => $zone->id,
                'name' => $zone->name,
                'description' => $zone->description,
                'fee' => (float) $zone->fee,
                'is_active' => (bool) $zone->is_active,
                'sort_order' => (int) $zone->sort_order,
                'est_time_text' => $zone->est_time_text,
                'free_delivery_threshold' => $zone->free_delivery_threshold,
                'min_order_amount' => $zone->min_order_amount,
                'orders_count' => $zone->assignments()->count(),
            ]);

        return Inertia::render('delivery/zones/index', [
            'zones' => $zones,
            'stats' => [
                'total' => $zones->count(),
                'active' => $zones->where('is_active', true)->count(),
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('delivery/zones/form', [
            'zone' => null,
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $data = $this->validateZone($request);
        $data['store_id'] = $storeId;

        DeliveryZone::create($data);

        return redirect()->route('delivery.zones.index')->with('success', 'تم إنشاء منطقة التوصيل بنجاح.');
    }

    public function edit($id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $zone = DeliveryZone::where('store_id', $storeId)->where('id', $id)->firstOrFail();

        return Inertia::render('delivery/zones/form', [
            'zone' => $zone,
        ]);
    }

    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $zone = DeliveryZone::where('store_id', $storeId)->where('id', $id)->firstOrFail();
        $zone->update($this->validateZone($request));

        return redirect()->route('delivery.zones.index')->with('success', 'تم تحديث منطقة التوصيل بنجاح.');
    }

    public function destroy($id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $zone = DeliveryZone::where('store_id', $storeId)->where('id', $id)->firstOrFail();

        // Historical orders keep their snapshot; only the zone row is removed.
        $zone->delete();

        return redirect()->route('delivery.zones.index')->with('success', 'تم حذف منطقة التوصيل.');
    }

    public function toggleStatus(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $zone = DeliveryZone::where('store_id', $storeId)->where('id', $id)->firstOrFail();
        $zone->update(['is_active' => !$zone->is_active]);

        return redirect()->route('delivery.zones.index')->with('success', 'تم تحديث حالة منطقة التوصيل.');
    }

    /**
     * Reorder zones (server-validated incrementing sort_order).
     */
    public function reorder(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);

        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        foreach ((array) $request->input('ids') as $index => $id) {
            DeliveryZone::where('store_id', $storeId)
                ->where('id', $id)
                ->update(['sort_order' => $index]);
        }

        return redirect()->route('delivery.zones.index')->with('success', 'تم تحديث ترتيب المناطق.');
    }

    private function validateZone(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'fee' => 'required|numeric|min:0',
            'is_active' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
            'est_time_text' => 'nullable|string|max:255',
            'free_delivery_threshold' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
        ]);
    }
}