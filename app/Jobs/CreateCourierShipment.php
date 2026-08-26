<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\OrderShipment;
use App\Models\Shipping;
use App\Models\StoreCourierIntegration;
use App\Services\Courier\CourierRegistry;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CreateCourierShipment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(public int $orderId) {}

    public function handle(): void
    {
        $order = Order::find($this->orderId);
        if (!$order) return;

        $shipping = $order->shipping_method_id ? Shipping::find($order->shipping_method_id) : null;
        if (!$shipping) return;

        $integrationId = $shipping->courier_integration_id ?? null;
        if (!$integrationId) return;

        $integration = StoreCourierIntegration::find($integrationId);
        if (!$integration || !$integration->is_active || $integration->status !== 'connected') {
            Log::info('Courier shipment skipped: integration not connected', ['order_id'=>$order->id]);
            return;
        }

        // Store isolation check (redundant but explicit)
        if ((int)$integration->store_id !== (int)$order->store_id) {
            Log::warning('Courier store isolation violation', ['order_id'=>$order->id, 'integration_store'=>$integration->store_id, 'order_store'=>$order->store_id]);
            return;
        }

        // Idempotency: check existing shipment for this order+integration
        $existing = OrderShipment::where('order_id', $order->id)->where('courier_integration_id', $integration->id)->first();
        if ($existing && $existing->external_id) {
            return; // already created
        }

        $provider = CourierRegistry::make($integration->provider);
        if (!$provider) {
            Log::warning('Unknown courier provider', ['provider'=>$integration->provider]);
            return;
        }

        // COD amount logic
        $isCod = strtolower($order->payment_method ?? '') === 'cod';
        $codAmount = $isCod ? (float)$order->total_amount : 0;
        if ($isCod && strtolower($order->payment_status ?? '') === 'paid') $codAmount = 0;

        $payload = [
            'order_id'=>$order->id,
            'order_number'=>$order->order_number,
            'customer_name'=> trim(($order->customer_first_name ?? '').' '.($order->customer_last_name ?? '')),
            'phone'=>$order->customer_phone ?? $order->whatsapp_number ?? '',
            'address'=>$order->shipping_address ?? '',
            'city'=>$order->shipping_city ?? '',
            'state'=>$order->shipping_state ?? '',
            'country'=>$order->shipping_country ?? 'PS',
            'postal_code'=>$order->shipping_postal_code ?? '',
            'notes'=>$order->notes ?? '',
            'total'=>$order->total_amount,
            'cod_amount'=>$codAmount,
            'currency'=>$order->currency ?? 'ILS',
            'items'=>$order->items()->get()->map(fn($i)=>['name'=>$i->product_name ?? $i->name ?? 'Item','qty'=>$i->quantity,'price'=>$i->price])->toArray(),
        ];

        $result = $provider->createShipment($order, $integration, ['payload'=>$payload]);

        if (!empty($result['success'])) {
            $shipment = $existing ?? new OrderShipment();
            $shipment->store_id = $order->store_id;
            $shipment->order_id = $order->id;
            $shipment->shipping_id = $shipping->id;
            $shipment->courier_integration_id = $integration->id;
            $shipment->provider = $integration->provider;
            $shipment->external_id = $result['external_id'] ?? null;
            $shipment->tracking_number = $result['tracking_number'] ?? $result['external_id'] ?? null;
            $shipment->tracking_url = $result['tracking_url'] ?? null;
            $shipment->label_url = $result['label_url'] ?? null;
            $shipment->status = $result['status'] ?? 'created';
            $shipment->provider_status = $result['provider_status'] ?? $result['status'] ?? null;
            $shipment->payload_snapshot = $payload;
            $shipment->last_error = null;
            $shipment->attempt_count = ($existing?->attempt_count ?? 0) + 1;
            $shipment->submitted_at = now();
            $shipment->save();

            // Optionally update order tracking_number for legacy field
            if (!empty($shipment->tracking_number) && empty($order->tracking_number)) {
                $order->forceFill(['tracking_number'=>$shipment->tracking_number])->saveQuietly();
            }

            // Merchant-owned email: shipment_created (store isolated, afterCommit, failure never breaks shipment)
            try {
                if (($shipment->status ?? '') === 'created' && $order->customer_email) {
                    \App\Jobs\SendStoreCustomerEmail::dispatch($order->store_id, 'shipment_created', $order->customer_email, $order->id, $shipment->id, $order->customer_id)->afterCommit();
                }
            } catch (\Throwable $e) { \Log::warning('Shipment email dispatch failed', ['order_id'=>$order->id,'error'=>$e->getMessage()]); }
        } else {
            $err = $result['error'] ?? 'Unknown courier error';
            // create or update failed record for retry visibility
            $shipment = $existing ?? new OrderShipment();
            $shipment->store_id = $order->store_id;
            $shipment->order_id = $order->id;
            $shipment->shipping_id = $shipping->id;
            $shipment->courier_integration_id = $integration->id;
            $shipment->provider = $integration->provider;
            $shipment->status = 'failed';
            $shipment->provider_status = $err;
            $shipment->payload_snapshot = $payload;
            $shipment->last_error = $err;
            $shipment->attempt_count = ($existing?->attempt_count ?? 0) + 1;
            $shipment->save();

            Log::warning('Courier shipment failed', ['order_id'=>$order->id,'error'=>$err]);
            // Do not throw to avoid retry loop beyond tries; job will retry via queue if exception
        }
    }
}
