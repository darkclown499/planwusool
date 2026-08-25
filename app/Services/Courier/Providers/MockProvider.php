<?php

namespace App\Services\Courier\Providers;

use App\Models\Order;
use App\Models\StoreCourierIntegration;
use App\Services\Courier\AbstractCourierProvider;

class MockProvider extends AbstractCourierProvider
{
    public function getSlug(): string { return 'mock'; }
    public function getName(): string { return 'Mock Courier (Test)'; }
    public function getCapabilities(): array {
        return ['quotes','create_shipment','tracking','labels','cancel','cod','areas'];
    }
    public function getRequiredCredentialKeys(): array { return ['api_key']; }
    public function supportsWebhooks(): bool { return true; }

    public function validateCredentials(array $credentials): array
    {
        $key = $credentials['api_key'] ?? '';
        if ($key === 'valid_mock_key') return ['valid'=>true, 'error'=>null];
        return ['valid'=>false, 'error'=>'Invalid mock API key. Use valid_mock_key for testing.'];
    }

    public function createShipment(Order $order, StoreCourierIntegration $integration, array $options = []): array
    {
        $creds = $integration->credentials ?? [];
        $val = $this->validateCredentials($creds);
        if (!$val['valid']) return ['success'=>false, 'error'=>$val['error']];

        // COD handling
        $cod = 0;
        if (($order->payment_method ?? '') === 'cod' || ($order->payment_status ?? '') === 'pending') {
            // If prepaid, COD 0
            $cod = (float) ($order->total_amount ?? 0);
            if (($order->payment_status ?? '') === 'paid') $cod = 0;
        }

        $externalId = 'MOCK-' . $order->id . '-' . substr(md5($integration->id . $order->id), 0, 6);
        return [
            'success'=>true,
            'external_id'=>$externalId,
            'tracking_number'=>'TRK' . str_pad((string)$order->id, 8, '0', STR_PAD_LEFT),
            'tracking_url'=> 'https://mock.example/track/' . $externalId,
            'label_url'=> 'https://mock.example/label/' . $externalId . '.pdf',
            'status'=>'created',
            'provider_status'=>'Booked',
            'cod_amount'=>$cod,
        ];
    }

    public function getShipment(string $externalId, StoreCourierIntegration $integration): array
    {
        return ['success'=>true, 'status'=>'in_transit', 'provider_status'=>'In Transit'];
    }

    public function cancelShipment(string $externalId, StoreCourierIntegration $integration): array
    {
        return ['success'=>true, 'status'=>'cancelled'];
    }

    public function track(string $trackingNumber, StoreCourierIntegration $integration): array
    {
        return ['success'=>true, 'status'=>'in_transit', 'provider_status'=>'In Transit', 'tracking_number'=>$trackingNumber];
    }
}
