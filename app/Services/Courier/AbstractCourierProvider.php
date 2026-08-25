<?php

namespace App\Services\Courier;

use App\Contracts\CourierProviderInterface;
use App\Models\Order;
use App\Models\StoreCourierIntegration;
use Illuminate\Support\Facades\Http;

abstract class AbstractCourierProvider implements CourierProviderInterface
{
    protected int $timeout = 12;

    protected function http(array $credentials)
    {
        return Http::timeout($this->timeout)->withHeaders($this->headers($credentials));
    }

    protected function headers(array $credentials): array
    {
        return ['Accept' => 'application/json', 'Content-Type' => 'application/json'];
    }

    public function getLabel(string $externalId, StoreCourierIntegration $integration): array
    {
        return ['success' => false, 'error' => 'Labels not supported by this provider'];
    }

    public function getCapabilities(): array
    {
        return [];
    }

    public function mapStatus(string $providerStatus): string
    {
        $s = strtolower($providerStatus);
        return match (true) {
            str_contains($s, 'delivered') => 'delivered',
            str_contains($s, 'out_for_delivery'), str_contains($s, 'out for delivery') => 'out_for_delivery',
            str_contains($s, 'in_transit'), str_contains($s, 'in transit'), str_contains($s, 'transit') => 'in_transit',
            str_contains($s, 'picked'), str_contains($s, 'pickup') => 'picked_up',
            str_contains($s, 'created'), str_contains($s, 'pending'), str_contains($s, 'booked') => 'created',
            str_contains($s, 'cancel') => 'cancelled',
            str_contains($s, 'fail'), str_contains($s, 'error') => 'failed',
            str_contains($s, 'return') => 'returned',
            default => 'in_transit',
        };
    }

    protected function normalizePhone(string $phone): string
    {
        $p = preg_replace('/[^0-9+]/', '', $phone);
        if (!str_starts_with($p, '+')) {
            $p = '+970' . ltrim($p, '0');
        }
        return $p;
    }
}
