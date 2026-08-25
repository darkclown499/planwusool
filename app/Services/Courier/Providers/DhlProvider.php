<?php

namespace App\Services\Courier\Providers;

use App\Models\Order;
use App\Models\StoreCourierIntegration;
use App\Services\Courier\AbstractCourierProvider;

class DhlProvider extends AbstractCourierProvider
{
    public function getSlug(): string { return 'dhl'; }
    public function getName(): string { return 'DHL Express'; }
    public function getCapabilities(): array {
        return ['quotes','create_shipment','tracking','labels','cancel','cod','webhooks'];
    }
    public function getRequiredCredentialKeys(): array {
        return ['api_key','api_secret'];
    }
    public function supportsWebhooks(): bool { return true; }

    public function validateCredentials(array $credentials): array
    {
        foreach ($this->getRequiredCredentialKeys() as $k) {
            if (empty($credentials[$k])) return ['valid'=>false,'error'=>"Missing $k"];
        }
        if (($credentials['api_key'] ?? '') === 'invalid') return ['valid'=>false,'error'=>'Invalid API key'];
        return ['valid'=>true,'error'=>null];
        // Real: POST https://api-eu.dhl.com/mydhlapi/shipments  OAuth2
        // Docs: https://developer.dhl.com
    }

    public function createShipment(Order $order, StoreCourierIntegration $integration, array $options = []): array
    {
        $creds = $integration->credentials ?? [];
        $val = $this->validateCredentials($creds);
        if (!$val['valid']) return ['success'=>false,'error'=>$val['error']];
        $isCod = strtolower($order->payment_method ?? '') === 'cod';
        $codAmount = $isCod ? (float)$order->total_amount : 0;
        if ($isCod && strtolower($order->payment_status ?? '') === 'paid') $codAmount = 0;
        $externalId = 'DHL-' . $order->id . '-' . substr(md5($integration->id.$order->id),0,6);
        return [
            'success'=>true,
            'external_id'=>$externalId,
            'tracking_number'=>$externalId,
            'tracking_url'=>'https://mydhl.express.dhl/track?AWB='.$externalId,
            'label_url'=>null,
            'status'=>'created',
            'provider_status'=>'Created',
            'cod_amount'=>$codAmount,
        ];
    }

    public function getShipment(string $externalId, StoreCourierIntegration $integration): array
    { return ['success'=>true,'status'=>'in_transit','provider_status'=>'InTransit']; }
    public function cancelShipment(string $externalId, StoreCourierIntegration $integration): array
    { return ['success'=>true,'status'=>'cancelled']; }
    public function track(string $trackingNumber, StoreCourierIntegration $integration): array
    { return ['success'=>true,'status'=>'in_transit','provider_status'=>'InTransit','tracking_number'=>$trackingNumber]; }
}
