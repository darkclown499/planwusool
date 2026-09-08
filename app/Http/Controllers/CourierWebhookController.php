<?php

namespace App\Http\Controllers;

use App\Models\OrderShipment;
use App\Models\StoreCourierIntegration;
use App\Services\Courier\CourierRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CourierWebhookController extends Controller
{
    public function handle(Request $request, string $provider)
    {
        $provider = strtolower($provider);
        $registryProvider = CourierRegistry::make($provider);
        if (!$registryProvider) {
            return response()->json(['error'=>'Unknown provider'],404);
        }
        if (!$registryProvider->supportsWebhooks()) {
            return response()->json(['error'=>'Webhooks not supported'],422);
        }

        // Resolve the target shipment and its integration from payload, never from an untrusted store_id.
        $data = $request->all();
        $tracking = $data['tracking_number'] ?? $data['trackingNumber'] ?? $data['external_id'] ?? null;
        $status = $data['status'] ?? $data['event'] ?? null;
        if (!$tracking || !$status) {
            return response()->json(['error'=>'Missing fields'],422);
        }

        $shipment = OrderShipment::where('tracking_number', $tracking)->orWhere('external_id', $tracking)->first();
        if (!$shipment) {
            Log::warning('Courier webhook: shipment not found', ['provider'=>$provider,'tracking'=>$tracking]);
            return response()->json(['error'=>'Shipment not found'],404);
        }

        $integration = StoreCourierIntegration::find($shipment->courier_integration_id);
        if (!$integration || $integration->provider !== $provider) {
            return response()->json(['error'=>'Integration not found'],404);
        }

        // Fail closed: a webhook callback is only accepted when the integration is active and
        // authenticated. Missing/empty auth configuration, missing/invalid signatures must deny.
        $payload = $request->getContent();
        $signature = trim((string)($request->header('X-Courier-Signature') ?? $request->header('X-Signature') ?? $request->input('signature') ?? ''));
        $secret = trim((string)($integration->settings['webhook_secret'] ?? ''));

        if (!$integration->is_active || $integration->status !== 'connected') {
            Log::warning('Courier webhook rejected: integration not active', ['provider'=>$provider,'integration_id'=>$integration->id]);
            return response()->json(['error'=>'Unauthorized'],401);
        }

        if ($secret === '') {
            Log::warning('Courier webhook rejected: no webhook secret configured', ['provider'=>$provider,'integration_id'=>$integration->id]);
            return response()->json(['error'=>'Unauthorized'],401);
        }

        if ($signature === '') {
            Log::warning('Courier webhook rejected: missing signature', ['provider'=>$provider,'integration_id'=>$integration->id]);
            return response()->json(['error'=>'Unauthorized'],401);
        }

        $expected = hash_hmac('sha256', $payload, $secret);
        if (!hash_equals($expected, $signature)) {
            Log::warning('Courier webhook rejected: invalid signature', ['provider'=>$provider,'integration_id'=>$integration->id]);
            return response()->json(['error'=>'Unauthorized'],401);
        }

        // Map status
        $canonical = $registryProvider->mapStatus($status);
        $old = $shipment->status;
        $shipment->update([
            'status'=>$canonical,
            'provider_status'=>$status,
            'delivered_at'=> ($canonical === 'delivered' && !$shipment->delivered_at) ? now() : $shipment->delivered_at,
        ]);

        // Dispatch merchant email for shipment status changes (afterCommit, store isolated)
        try {
            $order = $shipment->order;
            if ($order && $order->customer_email && $old !== $canonical) {
                $map = ['in_transit'=>'shipment_in_transit','out_for_delivery'=>'shipment_out_for_delivery','delivered'=>'shipment_delivered','failed'=>'shipment_failed','returned'=>'shipment_returned'];
                $type = $map[$canonical] ?? null;
                if ($type) {
                    \App\Jobs\SendStoreCustomerEmail::dispatch($shipment->store_id, $type, $order->customer_email, $order->id, $shipment->id, $order->customer_id)->afterCommit();
                }
            }
        } catch (\Throwable $e) { \Log::warning('Shipment webhook email failed', ['shipment_id'=>$shipment->id,'error'=>$e->getMessage()]); }

        return response()->json(['success'=>true]);
    }
}
