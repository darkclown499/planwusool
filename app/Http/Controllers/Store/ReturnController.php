<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\ReturnService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReturnController extends Controller
{
    /**
     * Customer requests a return for own order.
     * Supports authenticated customer + guest via session/orderNumber.
     */
    public function request(Request $request, $storeSlug)
    {
        $request->validate([
            'order_id' => 'required|integer',
            'order_number' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.order_item_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.reason' => 'nullable|string|max:50',
            'reason' => 'nullable|string|max:50',
            'customer_note' => 'nullable|string|max:1000',
        ]);

        // Resolve order with ownership
        $order = $this->findOwnedOrder($request->input('order_id'), $request->input('order_number'), $request);
        if (!$order) {
            return response()->json(['success'=>false,'message'=>'الطلب غير موجود أو لا تملك صلاحية'], 404);
        }

        try {
            $customerId = Auth::guard('customer')->id();
            $ret = ReturnService::createReturn($order, $request->input('items'), $request->input('reason'), $request->input('customer_note'), $customerId);
            try {
                $store = $order->store;
                if ($store && \App\Services\StoreMailService::isConnected($store)) {
                    \Illuminate\Support\Facades\Log::info('Return requested email', ['return_id'=>$ret->id]);
                }
            } catch (\Throwable $e) {}
            return response()->json(['success'=>true,'return_number'=>$ret->return_number,'return_id'=>$ret->id]);
        } catch (\Exception $e) {
            return response()->json(['success'=>false,'message'=>$e->getMessage()], 422);
        }
    }

    public function history(Request $request, $storeSlug)
    {
        // Customer order history already exists via other endpoints; provide returns for owned orders
        $customer = Auth::guard('customer')->user();
        if (!$customer) return response()->json(['returns'=>[]]);
        $storeId = $request->attributes->get('resolved_store')?->id ?? $request->input('store_id');
        if (!$storeId) return response()->json(['returns'=>[]]);
        $returns = \App\Models\OrderReturn::where('store_id',$storeId)->where('customer_id',$customer->id)->with(['items.orderItem','order'])->orderBy('created_at','desc')->get();
        return response()->json(['returns'=>$returns]);
    }

    private function findOwnedOrder(int $orderId, ?string $orderNumber, Request $request): ?Order
    {
        $store = $request->attributes->get('resolved_store');
        $storeId = $store?->id ?? $request->input('store_id');
        if (!$storeId) return null;

        $query = Order::where('id',$orderId)->where('store_id',$storeId);
        if ($orderNumber) $query->where('order_number',$orderNumber);

        $order = $query->with('items.product')->first();
        if (!$order) return null;

        $customer = Auth::guard('customer')->user();
        if ($customer) {
            if ((int)$order->customer_id !== (int)$customer->id && strtolower($order->customer_email ?? '') !== strtolower($customer->email ?? '')) return null;
        } else {
            // Guest: check session_id
            if ((string)$order->session_id !== (string)session()->getId()) return null;
        }
        return $order;
    }
}
