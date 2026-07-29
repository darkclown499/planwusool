<?php

namespace App\Services;

use App\Models\AccountingIntegration;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AccountingService
{
    public function getConfig(Store $store): ?AccountingIntegration
    {
        return AccountingIntegration::where('store_id', $store->id)
            ->where('is_active', true)
            ->first();
    }

    public function testConnection(AccountingIntegration $config): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $config->api_key,
                'Accept' => 'application/json',
            ])->timeout(10)->get(rtrim($config->base_url, '/') . '/api/v1/health');

            if ($response->successful()) {
                return ['success' => true, 'message' => 'Connection successful'];
            }

            return ['success' => false, 'message' => 'Connection failed: ' . $response->body()];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Connection error: ' . $e->getMessage()];
        }
    }

    public function syncOrder(Order $order): bool
    {
        $store = $order->store;
        $config = $this->getConfig($store);

        if (!$config || !$config->sync_orders) {
            return false;
        }

        if ($config->last_sync_status === 'failed') {
            Log::info('Accounting sync skipped for order ' . $order->id . ' - previous sync failed, queued for retry');
            dispatch(new \App\Jobs\SyncOrderToAccounting($order))->onQueue('accounting');
            return false;
        }

        return $this->sendOrderToAccounting($order, $config);
    }

    public function sendOrderToAccounting(Order $order, AccountingIntegration $config): bool
    {
        try {
            $orderData = $this->buildOrderPayload($order);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $config->api_key,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->timeout(15)->post(rtrim($config->base_url, '/') . '/api/v1/orders', $orderData);

            if ($response->successful()) {
                $config->update([
                    'last_sync_at' => now(),
                    'last_sync_status' => 'success',
                    'last_sync_error' => null,
                ]);
                return true;
            }

            $config->update([
                'last_sync_at' => now(),
                'last_sync_status' => 'failed',
                'last_sync_error' => $response->body(),
            ]);
            return false;
        } catch (\Exception $e) {
            $config->update([
                'last_sync_status' => 'failed',
                'last_sync_error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function syncInventory(Store $store): bool
    {
        $config = $this->getConfig($store);
        if (!$config || !$config->sync_inventory) {
            return false;
        }

        try {
            $products = Product::where('store_id', $store->id)->get(['id', 'name', 'sku', 'stock', 'sale_price', 'price']);

            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $config->api_key,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ])->timeout(30)->post(rtrim($config->base_url, '/') . '/api/v1/inventory/sync', [
                'products' => $products->toArray(),
            ]);

            if ($response->successful()) {
                $config->update([
                    'last_sync_at' => now(),
                    'last_sync_status' => 'success',
                    'last_sync_error' => null,
                ]);
                return true;
            }

            $config->update([
                'last_sync_at' => now(),
                'last_sync_status' => 'failed',
                'last_sync_error' => $response->body(),
            ]);
            return false;
        } catch (\Exception $e) {
            $config->update([
                'last_sync_status' => 'failed',
                'last_sync_error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    public function initialSync(Store $store): array
    {
        $config = $this->getConfig($store);
        if (!$config) {
            return ['success' => false, 'message' => 'No active accounting integration found'];
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $config->api_key,
                'Accept' => 'application/json',
            ])->timeout(60)->get(rtrim($config->base_url, '/') . '/api/v1/products');

            if (!$response->successful()) {
                return ['success' => false, 'message' => 'Failed to fetch products: ' . $response->body()];
            }

            $products = $response->json()['data'] ?? $response->json()['products'] ?? [];
            $imported = 0;

            foreach ($products as $productData) {
                $existingProduct = Product::where('store_id', $store->id)
                    ->where('sku', $productData['sku'] ?? $productData['code'] ?? null)
                    ->first();

                if ($existingProduct) {
                    $existingProduct->update([
                        'name' => $productData['name'] ?? $existingProduct->name,
                        'stock' => $productData['stock'] ?? $productData['quantity'] ?? $existingProduct->stock,
                        'price' => $productData['price'] ?? $existingProduct->price,
                    ]);
                } else {
                    Product::create([
                        'store_id' => $store->id,
                        'created_by' => $store->user_id,
                        'name' => $productData['name'],
                        'sku' => $productData['sku'] ?? $productData['code'] ?? null,
                        'stock' => $productData['stock'] ?? $productData['quantity'] ?? 0,
                        'price' => $productData['price'] ?? 0,
                        'is_active' => true,
                    ]);
                }
                $imported++;
            }

            $config->update([
                'last_sync_at' => now(),
                'last_sync_status' => 'success',
                'last_sync_error' => null,
            ]);

            return ['success' => true, 'message' => "Imported {$imported} products"];
        } catch (\Exception $e) {
            $config->update([
                'last_sync_status' => 'failed',
                'last_sync_error' => $e->getMessage(),
            ]);
            return ['success' => false, 'message' => 'Sync failed: ' . $e->getMessage()];
        }
    }

    public function handleWebhook(\Illuminate\Http\Request $request, Store $store): array
    {
        $config = $this->getConfig($store);
        if (!$config) {
            return ['success' => false, 'message' => 'No active integration'];
        }

        $signature = $request->header('X-Signature');
        if ($signature && !$this->verifySignature($request->getContent(), $signature, $config->api_key)) {
            return ['success' => false, 'message' => 'Invalid signature'];
        }

        $event = $request->input('event');
        $data = $request->input('data', []);

        switch ($event) {
            case 'product.updated':
                $this->handleProductUpdated($store, $data);
                break;
            case 'product.created':
                $this->handleProductCreated($store, $data);
                break;
            case 'inventory.updated':
                $this->handleInventoryUpdated($store, $data);
                break;
            default:
                Log::info('Unknown accounting webhook event', ['event' => $event]);
        }

        return ['success' => true];
    }

    private function handleProductUpdated(Store $store, array $data): void
    {
        $product = Product::where('store_id', $store->id)
            ->where(function ($q) use ($data) {
                if (isset($data['sku'])) $q->where('sku', $data['sku']);
                elseif (isset($data['id'])) $q->where('id', $data['id']);
            })->first();

        if ($product) {
            $product->update([
                'name' => $data['name'] ?? $product->name,
                'price' => $data['price'] ?? $product->price,
                'stock' => $data['stock'] ?? $data['quantity'] ?? $product->stock,
            ]);
        }
    }

    private function handleProductCreated(Store $store, array $data): void
    {
        Product::create([
            'store_id' => $store->id,
            'created_by' => $store->user_id,
            'name' => $data['name'],
            'sku' => $data['sku'] ?? $data['code'] ?? null,
            'stock' => $data['stock'] ?? $data['quantity'] ?? 0,
            'price' => $data['price'] ?? 0,
            'is_active' => true,
        ]);
    }

    private function handleInventoryUpdated(Store $store, array $data): void
    {
        if (isset($data['sku'])) {
            Product::where('store_id', $store->id)
                ->where('sku', $data['sku'])
                ->update(['stock' => $data['stock'] ?? $data['quantity'] ?? 0]);
        }
    }

    private function verifySignature(string $payload, string $signature, string $secret): bool
    {
        $expected = hash_hmac('sha256', $payload, $secret);
        return hash_equals($expected, $signature);
    }

    private function buildOrderPayload(Order $order): array
    {
        return [
            'order_number' => $order->order_number,
            'status' => $order->status,
            'payment_status' => $order->payment_status,
            'payment_method' => $order->payment_method,
            'customer' => [
                'first_name' => $order->customer_first_name,
                'last_name' => $order->customer_last_name,
                'email' => $order->customer_email,
                'phone' => $order->customer_phone,
            ],
            'shipping_address' => [
                'address' => $order->shipping_address,
                'city' => $order->shipping_city,
                'state' => $order->shipping_state,
                'postal_code' => $order->shipping_postal_code,
                'country' => $order->shipping_country,
            ],
            'items' => $order->items->map(fn($item) => [
                'product_name' => $item->product_name,
                'product_sku' => $item->product_sku,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'total_price' => $item->total_price,
            ]),
            'subtotal' => $order->subtotal,
            'tax_amount' => $order->tax_amount,
            'shipping_amount' => $order->shipping_amount,
            'discount_amount' => $order->discount_amount,
            'total_amount' => $order->total_amount,
            'created_at' => $order->created_at->toIso8601String(),
        ];
    }
}
