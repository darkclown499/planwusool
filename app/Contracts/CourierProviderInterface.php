<?php

namespace App\Contracts;

use App\Models\Order;
use App\Models\StoreCourierIntegration;

interface CourierProviderInterface
{
    public function getSlug(): string;
    public function getName(): string;
    public function getCapabilities(): array;
    public function getRequiredCredentialKeys(): array;
    public function validateCredentials(array $credentials): array; // ['valid'=>bool, 'error'=>string|null]
    public function createShipment(Order $order, StoreCourierIntegration $integration, array $options = []): array;
    public function getShipment(string $externalId, StoreCourierIntegration $integration): array;
    public function cancelShipment(string $externalId, StoreCourierIntegration $integration): array;
    public function track(string $trackingNumber, StoreCourierIntegration $integration): array;
    public function getLabel(string $externalId, StoreCourierIntegration $integration): array;
    public function supportsWebhooks(): bool;
    public function mapStatus(string $providerStatus): string;
}
