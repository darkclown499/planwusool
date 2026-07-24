<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id'
        ]);

        if (!Auth::guard('customer')->check()) {
            return response()->json(['orders' => []]);
        }

        $orders = Order::where('store_id', $request->store_id)
            ->where('customer_id', Auth::guard('customer')->id())
            ->with('items')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->order_number,
                    'date' => $order->created_at->toISOString(),
                    'status' => $order->status,
                    'total' => (float) $order->total_amount,
                    'items' => $order->items->count()
                ];
            });

        return response()->json([
            'orders' => $orders
        ]);
    }

    public function show(Request $request, $orderNumber)
    {
        $request->validate([
            'store_slug' => 'required|string'
        ]);

        if (!Auth::guard('customer')->check()) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $store = \App\Models\Store::where('slug', $request->store_slug)->first();
        if (!$store) {
            return response()->json(['error' => 'Store not found'], 404);
        }

        $order = Order::where('order_number', $orderNumber)
            ->where('store_id', $store->id)
            ->where('customer_id', Auth::guard('customer')->id())
            ->with(['items.product'])
            ->first();

        if (!$order) {
            return response()->json(['error' => 'Order not found'], 404);
        }

        $storeSettings = \App\Models\Setting::getUserSettings($store->user->id, $store->id);

        return response()->json([
            'order' => [
                'id' => $order->order_number,
                'date' => $order->created_at->toISOString(),
                'status' => ucfirst($order->status),
                'total' => (float) $order->total_amount,
                'subtotal' => (float) $order->subtotal,
                'discount' => (float) $order->discount_amount,
                'shipping' => (float) $order->shipping_amount,
                'tax' => (float) $order->tax_amount,
                'currency' => $storeSettings['currency_symbol'] ?? '$',
                'coupon' => $order->coupon_code,
                'payment_method' => $order->payment_method === 'cod' ? 'Cash on Delivery' : ucfirst(str_replace('_', ' ', $order->payment_method)),
                'customer' => [
                    'name' => $order->customer_first_name . ' ' . $order->customer_last_name,
                    'email' => $order->customer_email,
                    'phone' => $order->customer_phone,
                ],
                'shipping_address' => [
                    'name' => $order->customer_first_name . ' ' . $order->customer_last_name,
                    'address' => $order->shipping_address,
                    'city' => is_numeric($order->shipping_city) ? (\App\Models\City::find($order->shipping_city)->name ?? $order->shipping_city) : $order->shipping_city,
                    'state' => is_numeric($order->shipping_state) ? (\App\Models\State::find($order->shipping_state)->name ?? $order->shipping_state) : $order->shipping_state,
                    'postal_code' => $order->shipping_postal_code,
                    'country' => is_numeric($order->shipping_country) ? (\App\Models\Country::find($order->shipping_country)->name ?? $order->shipping_country) : $order->shipping_country,
                ],
                'items' => $order->items->map(function ($item) {
                    $taxDetails = json_decode($item->tax_details, true) ?? [];
                    return [
                        'name' => $item->product_name,
                        'price' => (float) $item->unit_price,
                        'quantity' => $item->quantity,
                        'variants' => $item->product_variants,
                        'tax_name' => $taxDetails['tax_name'] ?? null,
                        'tax_percentage' => $taxDetails['tax_percentage'] ?? null,
                        'tax_amount' => (float) ($taxDetails['tax_amount'] ?? 0),
                    ];
                })->toArray(),
            ]
        ]);
    }
}