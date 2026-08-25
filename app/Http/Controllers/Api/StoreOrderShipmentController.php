<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\CreateCourierShipment;
use App\Models\Order;
use App\Models\OrderShipment;
use App\Models\Store;
use App\Models\StoreCourierIntegration;
use App\Services\Courier\CourierRegistry;
use Illuminate\Http\Request;

class StoreOrderShipmentController extends Controller
{
    private function authorizeStoreAccess(Request $request, Store $store): bool
    {
        $user = $request->user();
        if (!$user) return false;
        if ($user->isSuperAdmin() || $user->isAdmin()) return true;
        return (int)$store->user_id === (int)$user->id || (int)$store->id === (int)($user->current_store ?? 0);
    }

    public function index(Request $request, Store $store, $orderId)
    {
        if (!$this->authorizeStoreAccess($request, $store)) return response()->json(['error'=>'Unauthorized'],403);
        $order = Order::where('store_id',$store->id)->where('id',$orderId)->firstOrFail();
        $shipments = OrderShipment::where('order_id',$order->id)->with('courierIntegration')->get();
        return response()->json(['success'=>true,'shipments'=>$shipments]);
    }

    public function store(Request $request, Store $store, $orderId)
    {
        if (!$this->authorizeStoreAccess($request, $store)) return response()->json(['error'=>'Unauthorized'],403);
        $order = Order::where('store_id',$store->id)->where('id',$orderId)->firstOrFail();

        $shipping = $order->shippingMethod;
        if (!$shipping || !$shipping->courier_integration_id) {
            return response()->json(['error'=>'Shipping method not linked to courier'],422);
        }

        // Idempotency check
        $existing = OrderShipment::where('order_id',$order->id)->where('courier_integration_id',$shipping->courier_integration_id)->first();
        if ($existing && $existing->external_id) {
            return response()->json(['success'=>true,'shipment'=>$existing,'message'=>'Shipment already exists']);
        }

        // Dispatch job synchronously for immediate feedback (dispatch + run inline if queue sync)
        try {
            dispatch(new CreateCourierShipment($order->id));
        } catch (\Throwable $e) {
            return response()->json(['error'=>'Failed to queue shipment: '.$e->getMessage()],500);
        }

        // Return pending shipment record (job will update)
        $shipment = OrderShipment::where('order_id',$order->id)->where('courier_integration_id',$shipping->courier_integration_id)->first();
        if (!$shipment) {
            $shipment = OrderShipment::create([
                'store_id'=>$store->id,
                'order_id'=>$order->id,
                'shipping_id'=>$shipping->id,
                'courier_integration_id'=>$shipping->courier_integration_id,
                'provider'=>StoreCourierIntegration::find($shipping->courier_integration_id)?->provider ?? 'unknown',
                'status'=>'pending',
            ]);
        }
        return response()->json(['success'=>true,'shipment'=>$shipment]);
    }

    public function cancel(Request $request, Store $store, $orderId, $shipmentId)
    {
        if (!$this->authorizeStoreAccess($request, $store)) return response()->json(['error'=>'Unauthorized'],403);
        $shipment = OrderShipment::where('store_id',$store->id)->where('order_id',$orderId)->where('id',$shipmentId)->firstOrFail();
        $integration = StoreCourierIntegration::find($shipment->courier_integration_id);
        if (!$integration) return response()->json(['error'=>'Integration not found'],404);
        $provider = CourierRegistry::make($integration->provider);
        if (!$provider || !$shipment->external_id) return response()->json(['error'=>'Cannot cancel'],422);
        // Capability check
        if (!in_array('cancel', $provider->getCapabilities(), true)) {
            return response()->json(['error'=>'Cancel not supported by this provider'],422);
        }
        $result = $provider->cancelShipment($shipment->external_id, $integration);
        if (!empty($result['success'])) {
            $shipment->update(['status'=>'cancelled','provider_status'=>'Cancelled']);
            return response()->json(['success'=>true,'shipment'=>$shipment]);
        }
        return response()->json(['error'=>$result['error'] ?? 'Cancel failed'],500);
    }

    public function retry(Request $request, Store $store, $orderId, $shipmentId)
    {
        if (!$this->authorizeStoreAccess($request, $store)) return response()->json(['error'=>'Unauthorized'],403);
        $shipment = OrderShipment::where('store_id',$store->id)->where('order_id',$orderId)->where('id',$shipmentId)->firstOrFail();
        // Only allow retry if failed
        if ($shipment->status !== 'failed') return response()->json(['error'=>'Only failed shipments can be retried'],422);
        dispatch(new CreateCourierShipment((int)$orderId));
        return response()->json(['success'=>true,'message'=>'Retry queued']);
    }
}
