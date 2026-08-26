<?php

namespace App\Http\Controllers;

use App\Models\Shipping;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ShippingController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;
        
        // Check plan feature access for shipping
        $shippingEnabled = true;
        if ($user->type === 'company' && $user->plan) {
            $shippingEnabled = $user->plan->enable_shipping_method === 'on';
        }
        
        $shippings = Shipping::where('store_id', $currentStoreId)
            ->orderBy('sort_order')
            ->get();
            
        // Get statistics
        $totalShippings = Shipping::where('store_id', $currentStoreId)->count();
        $activeShippings = Shipping::where('store_id', $currentStoreId)->where('is_active', true)->count();
        $shippingZones = Shipping::where('store_id', $currentStoreId)->distinct('zone_type')->count('zone_type');
        $avgShippingCost = Shipping::where('store_id', $currentStoreId)->where('type', '!=', 'free_shipping')->avg('cost') ?? 0;

        // Canonical free shipping config
        $storeConfig = \App\Models\StoreConfiguration::getConfiguration($currentStoreId);
        $freeEnabled = \App\Models\StoreConfiguration::toBool($storeConfig['free_shipping_enabled'] ?? null, false);
        $freeThreshold = $storeConfig['free_shipping_threshold'] ?? null;
        $freeThresholdVal = is_numeric($freeThreshold) && (float)$freeThreshold > 0 ? (float)$freeThreshold : null;

        return Inertia::render('shipping/index', [
            'shippings' => $shippings,
            'shippingEnabled' => $shippingEnabled,
            'stats' => [
                'totalShippings' => $totalShippings,
                'activeShippings' => $activeShippings,
                'shippingZones' => $shippingZones,
                'avgShippingCost' => round($avgShippingCost, 2)
            ],
            'freeShipping' => [
                'enabled' => $freeEnabled,
                'threshold' => $freeThresholdVal,
            ]
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $countries = \App\Models\Country::active()->orderBy('name')->get(['id', 'name', 'code']);
        $states = \App\Models\State::active()->orderBy('name')->get(['id', 'name', 'country_id']);
        $cities = \App\Models\City::active()->orderBy('name')->get(['id', 'name', 'state_id']);

        return Inertia::render('shipping/create', [
            'countries' => $countries,
            'states' => $states,
            'cities' => $cities
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:flat_rate,free_shipping,weight_based,distance_based,percentage_based',
            'description' => 'nullable|string',
            'cost' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'delivery_time' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
            'zone_type' => 'nullable|string|in:domestic,international,local,regional',
            'countries' => 'nullable|string',
            'country_id' => 'nullable|integer|exists:countries,id',
            'city_id' => 'nullable|integer|exists:cities,id',
            'all_regions' => 'boolean',
            'postal_codes' => 'nullable|string',
            'max_distance' => 'nullable|numeric|min:0',
            'max_weight' => 'nullable|numeric|min:0',
            'max_dimensions' => 'nullable|string',
            'delivery_method' => 'nullable|string|in:personal,company',
            'delivery_company' => 'required_if:delivery_method,company|nullable|string|max:255',
            'currency' => 'nullable|string|max:10',
            'require_signature' => 'boolean',
            'insurance_required' => 'boolean',
            'tracking_available' => 'boolean',
            'handling_fee' => 'nullable|numeric|min:0',
            'courier_integration_id' => 'nullable|integer|exists:store_courier_integrations,id',
            'fulfillment_type' => 'nullable|string|in:manual,personal,courier',
            'courier_service_type' => 'nullable|string|max:50',
            'courier_price_mode' => 'nullable|string|in:api,fixed,free',
            'courier_fixed_price' => 'nullable|numeric|min:0',
        ], [], [
            'name' => __('Shipping Method Name'),
            'type' => __('Shipping Type'),
            'cost' => __('Shipping Cost'),
            'zone_type' => __('Shipping Zone'),
        ]);

        $user = Auth::user();
        $currentStoreId = $user->current_store;

        // Courier integration must belong to same store (isolation)
        if (!empty($request->courier_integration_id)) {
            $valid = \App\Models\StoreCourierIntegration::where('id', $request->courier_integration_id)->where('store_id', $currentStoreId)->exists();
            if (!$valid) {
                return back()->withErrors(['courier_integration_id'=>__('Invalid courier integration for this store')])->withInput();
            }
        }

        $data = $request->all();
        $data['store_id'] = $currentStoreId;
        
        // If free shipping, set cost to 0
        if ($data['type'] === 'free_shipping') {
            $data['cost'] = 0;
        }
        
        // If the method covers all regions of the selected country, no specific city is needed
        if (!empty($data['all_regions'])) {
            $data['city_id'] = null;
        }

        Shipping::create($data);

        return redirect()->route('shipping.index')
            ->with('success', __('Shipping method created successfully!'));
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;
        
        $shipping = Shipping::where('store_id', $currentStoreId)
            ->findOrFail($id);
        
        // Increment view count
        $shipping->incrementViews();
        
        // Calculate dynamic shipping statistics from actual orders
        $orders = \App\Models\Order::where('store_id', $currentStoreId)
                                  ->where('shipping_method_id', $shipping->id)
                                  ->get();
        
        $totalOrders = $orders->count();
        $totalRevenue = $orders->sum('shipping_amount');
        $avgShippingCost = $totalOrders > 0 ? $totalRevenue / $totalOrders : 0;
        $recentOrders = $orders->where('created_at', '>=', now()->subDays(30))->count();
        $deliveredOrders = $orders->where('status', 'delivered')->count();
        $deliveryRate = $totalOrders > 0 ? ($deliveredOrders / $totalOrders) * 100 : 0;
        
        // Calculate average delivery time for delivered orders
        $avgDeliveryDays = 0;
        if ($deliveredOrders > 0) {
            $deliveryTimes = $orders->where('status', 'delivered')
                                   ->map(function($order) {
                                       return $order->created_at->diffInDays($order->updated_at);
                                   });
            $avgDeliveryDays = $deliveryTimes->avg();
        }
        
        $stats = [
            'total_orders' => $totalOrders,
            'total_revenue' => $totalRevenue,
            'avg_shipping_cost' => $avgShippingCost,
            'recent_orders' => $recentOrders,
            'delivered_orders' => $deliveredOrders,
            'delivery_rate' => $deliveryRate,
            'avg_delivery_days' => round($avgDeliveryDays, 1),
            'views' => $shipping->views ?? 0,
        ];
        
        // Get recent orders using this shipping method
        $recentOrdersList = $orders->take(5)->map(function($order) {
            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'customer_name' => $order->customer_first_name . ' ' . $order->customer_last_name,
                'shipping_cost' => $order->shipping_amount,
                'status' => $order->status,
                'date' => $order->created_at->format('M j, Y')
            ];
        });
        
        return Inertia::render('shipping/show', [
            'shipping' => $shipping,
            'stats' => $stats,
            'recentOrders' => $recentOrdersList
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit($id)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;
        
        $shipping = Shipping::where('store_id', $currentStoreId)
            ->findOrFail($id);
        
        return Inertia::render('shipping/edit', [
            'shipping' => $shipping
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:flat_rate,free_shipping,weight_based,distance_based,percentage_based',
            'description' => 'nullable|string',
            'cost' => 'nullable|numeric|min:0',
            'min_order_amount' => 'nullable|numeric|min:0',
            'delivery_time' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
            'zone_type' => 'nullable|string|in:domestic,international,local,regional',
            'countries' => 'nullable|string',
            'country_id' => 'nullable|integer|exists:countries,id',
            'city_id' => 'nullable|integer|exists:cities,id',
            'all_regions' => 'boolean',
            'postal_codes' => 'nullable|string',
            'max_distance' => 'nullable|numeric|min:0',
            'max_weight' => 'nullable|numeric|min:0',
            'max_dimensions' => 'nullable|string',
            'delivery_method' => 'nullable|string|in:personal,company',
            'delivery_company' => 'required_if:delivery_method,company|nullable|string|max:255',
            'currency' => 'nullable|string|max:10',
            'require_signature' => 'boolean',
            'insurance_required' => 'boolean',
            'tracking_available' => 'boolean',
            'handling_fee' => 'nullable|numeric|min:0',
            'courier_integration_id' => 'nullable|integer|exists:store_courier_integrations,id',
            'fulfillment_type' => 'nullable|string|in:manual,personal,courier',
            'courier_service_type' => 'nullable|string|max:50',
            'courier_price_mode' => 'nullable|string|in:api,fixed,free',
            'courier_fixed_price' => 'nullable|numeric|min:0',
        ], [], [
            'name' => __('Shipping Method Name'),
            'type' => __('Shipping Type'),
            'cost' => __('Shipping Cost'),
            'zone_type' => __('Shipping Zone'),
        ]);

        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if (!empty($request->courier_integration_id)) {
            $valid = \App\Models\StoreCourierIntegration::where('id', $request->courier_integration_id)->where('store_id', $currentStoreId)->exists();
            if (!$valid) {
                return back()->withErrors(['courier_integration_id'=>__('Invalid courier integration for this store')])->withInput();
            }
        }
        
        $shipping = Shipping::where('store_id', $currentStoreId)
            ->findOrFail($id);
        
        $data = $request->all();
        
        // If free shipping, set cost to 0
        if ($data['type'] === 'free_shipping') {
            $data['cost'] = 0;
        }
        
        // If the method covers all regions of the selected country, no specific city is needed
        if (!empty($data['all_regions'])) {
            $data['city_id'] = null;
        }

        $shipping->update($data);

        return redirect()->route('shipping.index')
            ->with('success', __('Shipping method updated successfully!'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;
        
        $shipping = Shipping::where('store_id', $currentStoreId)
            ->findOrFail($id);
        
        $shipping->delete();

        return redirect()->route('shipping.index')
            ->with('success', __('Shipping method deleted successfully!'));
    }
    
    public function updateFreeShipping(Request $request)
    {
        $request->validate([
            'enabled' => 'required|boolean',
            'threshold' => 'nullable|numeric|min:0.01',
        ]);
        $user = Auth::user();
        $storeId = $user->current_store;
        $enabled = (bool) $request->boolean('enabled');
        $threshold = $request->input('threshold');
        \App\Models\StoreConfiguration::setConfiguration($storeId, 'free_shipping_enabled', $enabled ? 'true' : 'false');
        if ($enabled && is_numeric($threshold) && (float)$threshold > 0) {
            \App\Models\StoreConfiguration::setConfiguration($storeId, 'free_shipping_threshold', (string) (float) $threshold);
        } else {
            // When disabled, keep threshold stored but UI hides it; when enabled without threshold, clear
            if (!$enabled) {
                // keep existing threshold for re-enable, do not clear
            } else {
                return back()->withErrors(['threshold' => 'حد الشحن المجاني مطلوب عند التفعيل']);
            }
        }
        return back()->with('success', __('تم حفظ إعدادات الشحن المجاني'));
    }

    /**
     * Export shipping methods data as CSV.
     */
    public function export()
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;
        
        $shippings = Shipping::where('store_id', $currentStoreId)
            ->orderBy('sort_order')
            ->get();
        
        $csvData = [];
        $csvData[] = ['Shipping Method', 'Type', 'Cost', 'Zone Type', 'Min Order Amount', 'Delivery Time', 'Max Weight', 'Tracking Available', 'Status', 'Created Date'];
        
        foreach ($shippings as $shipping) {
            $csvData[] = [
                $shipping->name,
                ucfirst(str_replace('_', ' ', $shipping->type)),
                $shipping->type === 'free_shipping' ? 'Free' : formatStoreCurrency($shipping->cost, $user->id, $currentStoreId),
                $shipping->zone_type ? ucfirst($shipping->zone_type) : 'All zones',
                $shipping->min_order_amount ? formatStoreCurrency($shipping->min_order_amount, $user->id, $currentStoreId) : 'No minimum',
                $shipping->delivery_time ?: 'Not specified',
                $shipping->max_weight ? $shipping->max_weight . ' kg' : 'No limit',
                $shipping->tracking_available ? 'Yes' : 'No',
                $shipping->is_active ? 'Active' : 'Inactive',
                $shipping->created_at->format('Y-m-d H:i:s')
            ];
        }
        
        $filename = 'shipping-methods-export-' . now()->format('Y-m-d') . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];
        
        $callback = function() use ($csvData) {
            $file = fopen('php://output', 'w');
            foreach ($csvData as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };
        
        return response()->stream($callback, 200, $headers);
    }
}