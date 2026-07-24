<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipping;
use Illuminate\Http\Request;

class ShippingController extends Controller
{
    public function getMethods(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id'
        ]);

        $shippingMethods = Shipping::where('store_id', $request->store_id)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(function ($method) {
                return [
                    'id' => $method->id,
                    'name' => $method->name,
                    'description' => $method->description,
                    'cost' => $method->cost,
                    'delivery_time' => $method->delivery_time,
                    'type' => $method->type,
                    'zone_type' => $method->zone_type,
                    'min_order_amount' => $method->min_order_amount,
                    'handling_fee' => $method->handling_fee,
                ];
            });

        return response()->json([
            'shipping_methods' => $shippingMethods
        ]);
    }
}