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
            'store_id' => 'required|exists:stores,id',
            'email' => 'nullable|email',
        ]);

        $storeId = $request->store_id;

        if (Auth::guard('customer')->check()) {
            $orders = Order::where('store_id', $storeId)
                ->where('customer_id', Auth::guard('customer')->id())
                ->with('items')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($order) {
                    return [
                        'id' => $order->order_number,
                        'order_number' => $order->order_number,
                        'date' => $order->created_at->toISOString(),
                        'created_at' => $order->created_at->toISOString(),
                        'status' => $order->status,
                        'total' => (float) $order->total_amount,
                        'items' => $order->items->count()
                    ];
                });

            return response()->json(['orders' => $orders]);
        }

        // Guest: strictly session-bound. Email alone must NOT retrieve orders without
        // knowing the session that created them; otherwise an attacker who knows a
        // victim's email + store_id could enumerate leaked PII (IDOR). Authenticated
        // customers are handled above via customer_id.
        $sessionId = session()->getId();

        $query = Order::where('store_id', $storeId)
            ->where('session_id', $sessionId)
            ->with('items')->orderBy('created_at', 'desc');

        // If no session match and no email, still try session_id only; empty result will be returned
        $orders = $query->get()->map(function ($order) {
            return [
                'id' => $order->order_number,
                'order_number' => $order->order_number,
                'date' => $order->created_at->toISOString(),
                'created_at' => $order->created_at->toISOString(),
                'status' => $order->status,
                'total' => (float) $order->total_amount,
                'items' => $order->items->count()
            ];
        });

        return response()->json(['orders' => $orders]);
    }

    public function show(Request $request, $orderNumber)
    {
        $request->validate([
            'store_slug' => 'required|string'
        ]);

        $store = \App\Models\Store::where('slug', $request->store_slug)->first();
        if (!$store) {
            return response()->json(['error' => 'Store not found'], 404);
        }

        $query = Order::where('order_number', $orderNumber)
            ->where('store_id', $store->id)
            ->with(['items.product']);

        if (Auth::guard('customer')->check()) {
            $query->where('customer_id', Auth::guard('customer')->id());
        } else {
            $sessionId = session()->getId();
            $query->where('session_id', $sessionId);
        }

        $order = $query->first();

        if (!$order) {
            return response()->json(['error' => 'Order not found'], 404);
        }

        $storeSettings = \App\Models\Setting::getUserSettings($store->user->id, $store->id);

        // Build timeline from real data only — no invented statuses
        $timeline = [];
        $rawStatus = strtolower(trim((string) $order->status));
        // Known statuses in system: pending, processing, shipped, delivered, cancelled, failed, refunded, confirmed
        // We map only those that actually exist; timeline is derived from timestamps available.
        $statusLabels = [
            'pending' => 'تم استلام الطلب',
            'confirmed' => 'تم تأكيد الطلب',
            'processing' => 'قيد التجهيز',
            'shipped' => 'تم الشحن',
            'delivered' => 'تم التسليم',
            'cancelled' => 'ملغي',
            'failed' => 'فشل',
            'refunded' => 'تم الاسترجاع',
        ];
        // Always include creation
        $timeline[] = ['key' => 'created', 'label' => $statusLabels[$rawStatus] ?? ucfirst($order->status), 'at' => $order->created_at->toISOString(), 'done' => true];
        if ($order->shipped_at) $timeline[] = ['key' => 'shipped', 'label' => 'تم الشحن', 'at' => $order->shipped_at->toISOString(), 'done' => true];
        if ($order->delivered_at) $timeline[] = ['key' => 'delivered', 'label' => 'تم التسليم', 'at' => $order->delivered_at->toISOString(), 'done' => true];

        return response()->json([
            'order' => [
                'id' => $order->order_number,
                'date' => $order->created_at->toISOString(),
                'status' => $order->status,
                'status_label' => $statusLabels[$rawStatus] ?? ucfirst($order->status),
                'timeline' => $timeline,
                'tracking_number' => $order->tracking_number,
                'shipped_at' => $order->shipped_at?->toISOString(),
                'delivered_at' => $order->delivered_at?->toISOString(),
                'total' => (float) $order->total_amount,
                'subtotal' => (float) $order->subtotal,
                'discount' => (float) $order->discount_amount,
                'shipping' => (float) $order->shipping_amount,
                'tax' => (float) $order->tax_amount,
                'currency' => $storeSettings['currency_symbol'] ?? '$',
                'coupon' => $order->coupon_code,
                'payment_method' => $order->payment_method === 'cod' ? 'الدفع عند الاستلام' : ucfirst(str_replace('_', ' ', $order->payment_method)),
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