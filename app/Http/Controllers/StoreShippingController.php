<?php

namespace App\Http\Controllers;

use App\Models\Shipping;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class StoreShippingController extends Controller
{
    public function index($storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            abort(403);
        }
        $store = resolveStoreQuery(Auth::user())->findOrFail($storeId);

        $shippings = Shipping::where('store_id', $store->id)->orderBy('sort_order')->get();
        $totalShippings = $shippings->count();
        $activeShippings = $shippings->where('is_active', true)->count();
        $shippingZones = $shippings->pluck('zone_type')->filter()->unique()->count();
        $avgShippingCost = $shippings->where('type', '!=', 'free_shipping')->avg('cost') ?? 0;

        $user = Auth::user();
        $shippingEnabled = true;
        if ($user->type === 'company' && $user->plan) {
            $shippingEnabled = $user->plan->enable_shipping_method === 'on';
        }

        return Inertia::render('shipping/index', [
            'shippings' => $shippings,
            'shippingEnabled' => $shippingEnabled,
            'store' => $store,
            'stats' => [
                'totalShippings' => $totalShippings,
                'activeShippings' => $activeShippings,
                'shippingZones' => $shippingZones,
                'avgShippingCost' => round($avgShippingCost, 2),
            ],
        ]);
    }
}
