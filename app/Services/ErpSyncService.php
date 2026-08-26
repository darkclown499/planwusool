<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductSyncLog;
use App\Models\Store;
use App\Models\StoreErpConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * ERP & Inventory sync engine.
 *
 * Handles BOTH directions:
 *  - Inbound  (spec): external systems push products/stock into the store via
 *    POST /api/v1/store/sync/products | /stock. Matching is barcode → sku → create.
 *  - Outbound : testConnection() and initialSync() pull from the provider.
 */
class ErpSyncService
{
    /* ------------------------------------------------------------------ */
    /* Configuration                                                      */
    /* ------------------------------------------------------------------ */

    public function getConfig(Store $store): ?StoreErpConfig
    {
        return StoreErpConfig::where('store_id', $store->id)->where('is_active', true)->first();
    }

    public function configByProvider(Store $store, string $provider): ?StoreErpConfig
    {
        return StoreErpConfig::where('store_id', $store->id)->where('provider', $provider)->latest()->first();
    }

    /* ------------------------------------------------------------------ */
    /* Auth — API key header on inbound endpoints                          */
    /* ------------------------------------------------------------------ */

    public function verifyRequest(Request $request): ?Store
    {
        $storeId = $request->header('X-Store-Id') ?? $request->input('store_id');
        $key = (string) $request->header('X-API-Key', '');

        if (!$storeId || $key === '') {
            return null;
        }

        $store = Store::find($storeId);
        if (!$store) {
            return null;
        }

        $config = StoreErpConfig::where('store_id', $store->id)->where('is_active', true)->first();
        if (!$config || !is_string($config->api_key) || $config->api_key === '' || !hash_equals($config->api_key, $key)) {
            return null;
        }

        return $store;
    }

    /* ------------------------------------------------------------------ */
    /* Inbound sync handlers                                               */
    /* ------------------------------------------------------------------ */

    /**
     * Bulk create/update products. Payload: [{sku,barcode,name,price,sale_price,
     * stock,image,description,is_active}] (or wrapped in a "products" array).
     */
    public function syncProducts(Store $store, array $payload, ?StoreErpConfig $config = null): array
    {
        $provider = $config?->provider ?? 'custom';
        $settings = $config ? $config->syncSettings() : [];
        $items = is_array($payload['products'] ?? null) ? $payload['products'] : $payload;

        $imported = 0;
        $updated = 0;
        $errors = 0;
        $logs = [];

        foreach ($items as $item) {
            if (!is_array($item) || empty($item['name'])) {
                $errors++;
                continue;
            }

            $barcode = isset($item['barcode']) ? (string) $item['barcode'] : null;
            $sku = isset($item['sku']) ? (string) $item['sku'] : null;

            try {
                $product = $this->findProduct($store, $barcode, $sku);

                if ($product) {
                    $this->applyProductFields($product, $item, $settings);
                    $product->save();
                    $updated++;
                    $logs[] = ProductSyncLog::record($store->id, $provider, 'product', $sku ?: $barcode, 'success', 'تم تحديث المنتج: ' . $product->name, $item);
                } else {
                    $product = $this->createProduct($store, $item, $settings);
                    $imported++;
                    $logs[] = ProductSyncLog::record($store->id, $provider, 'product', $sku ?: $barcode, 'success', 'تم إنشاء المنتج: ' . $product->name, $item);
                }
            } catch (\Throwable $e) {
                $errors++;
                $logs[] = ProductSyncLog::record($store->id, $provider, 'product', $sku ?: $barcode, 'failed', $e->getMessage(), $item);
            }
        }

        $this->markSynced($config, $errors === 0 ? 'success' : 'failed', $errors ? 'تمت المزامنة مع ' . $errors . ' أخطاء' : null);

        return [
            'success' => $errors === 0,
            'imported' => $imported,
            'updated' => $updated,
            'failed' => $errors,
            'logs' => $logs,
        ];
    }

    /**
     * Fast stock updates. Payload: [{sku|barcode, quantity}].
     */
    public function syncStock(Store $store, array $payload, ?StoreErpConfig $config = null): array
    {
        $provider = $config?->provider ?? 'custom';
        $items = is_array($payload['stock'] ?? null) ? $payload['stock'] : $payload;
        $settings = $config ? $config->syncSettings() : [];

        $updated = 0;
        $errors = 0;
        $logs = [];

        if (!$this->wants($settings, 'sync_quantity')) {
            return ['success' => true, 'updated' => 0, 'failed' => 0, 'logs' => [], 'skipped' => 'مزامنة الكميات معطّلة في إعدادات التكامل'];
        }

        foreach ($items as $item) {
            if (!is_array($item)) {
                $errors++;
                continue;
            }

            $barcode = isset($item['barcode']) ? (string) $item['barcode'] : null;
            $sku = isset($item['sku']) ? (string) $item['sku'] : null;
            $quantity = isset($item['quantity']) ? (int) $item['quantity'] : (isset($item['stock']) ? (int) $item['stock'] : null);

            if (($barcode === null && $sku === null) || $quantity === null) {
                $errors++;
                $logs[] = ProductSyncLog::record($store->id, $provider, 'stock', $sku ?: $barcode, 'failed', 'معرّف المنتج أو الكمية مفقودة', $item);
                continue;
            }

            try {
                $product = $this->findProduct($store, $barcode, $sku);
                if (!$product) {
                    // Also try variant SKU inside combinations
                    $product = $this->findProductByVariantSku($store, $sku ?? $barcode);
                    if (!$product) {
                        $errors++;
                        $logs[] = ProductSyncLog::record($store->id, $provider, 'stock', $sku ?: $barcode, 'failed', 'لم يتم العثور على منتج مطابق', $item);
                        continue;
                    }
                }

                // Variant-aware: if product uses variant inventory and SKU matches a combination, update that variant stock
                $variantUpdated = false;
                if (\App\Services\InventoryService::isVariantInventory($product)) {
                    $combos = $product->variant_combinations ?? [];
                    foreach ($combos as $idx => $c) {
                        $variantSku = $c['sku'] ?? null;
                        if ($variantSku && $variantSku === ($sku ?? $barcode)) {
                            $combos[$idx]['stock'] = (string) $quantity;
                            $product->variant_combinations = $combos;
                            $product->save();
                            $variantUpdated = true;
                            break;
                        }
                    }
                }
                if (!$variantUpdated) {
                    $product->stock = $quantity;
                    $product->save();
                }
                $updated++;
                $logs[] = ProductSyncLog::record($store->id, $provider, 'stock', $sku ?: $barcode, 'success', 'تم تحديث الكمية إلى ' . $quantity, $item);
            } catch (\Throwable $e) {
                $errors++;
                $logs[] = ProductSyncLog::record($store->id, $provider, 'stock', $sku ?: $barcode, 'failed', $e->getMessage(), $item);
            }
        }

        $this->markSynced($config, $errors === 0 ? 'success' : 'failed', $errors ? 'تمت المزامنة مع ' . $errors . ' أخطاء' : null);

        return [
            'success' => $errors === 0,
            'updated' => $updated,
            'failed' => $errors,
            'logs' => $logs,
        ];
    }

    /* ------------------------------------------------------------------ */
    /* Matching & field mapping                                            */
    /* ------------------------------------------------------------------ */

    protected function findProduct(Store $store, ?string $barcode, ?string $sku): ?Product
    {
        return Product::where('store_id', $store->id)
            ->where(function ($q) use ($barcode, $sku) {
                if ($barcode !== null && $barcode !== '') {
                    $q->where('barcode', $barcode);
                }
                if ($sku !== null && $sku !== '') {
                    $q->orWhere('sku', $sku);
                }
            })
            ->first();
    }

    protected function findProductByVariantSku(Store $store, ?string $sku): ?Product
    {
        if (!$sku) return null;
        $all = Product::where('store_id', $store->id)->whereNotNull('variant_combinations')->get();
        foreach ($all as $p) {
            foreach (($p->variant_combinations ?? []) as $c) {
                if (($c['sku'] ?? null) === $sku) return $p;
            }
        }
        return null;
    }

    protected function applyProductFields(Product $product, array $item, array $settings): void
    {
        if ($this->wants($settings, 'sync_product_details')) {
            if (!empty($item['name'])) {
                $product->name = $item['name'];
            }
            if (array_key_exists('description', $item)) {
                $product->description = $item['description'];
            }
            if (array_key_exists('short_description', $item)) {
                $product->short_description = $item['short_description'];
            }
        }

        if ($this->wants($settings, 'sync_prices')) {
            if (array_key_exists('price', $item)) {
                $product->price = (float) $item['price'];
            }
            if (array_key_exists('sale_price', $item)) {
                $product->sale_price = $item['sale_price'] !== null ? (float) $item['sale_price'] : null;
            }
        }

        if ($this->wants($settings, 'sync_quantity')) {
            if (array_key_exists('stock', $item)) {
                $product->stock = (int) $item['stock'];
            }
        }

        if ($this->wants($settings, 'sync_images')) {
            if (!empty($item['image'])) {
                $product->cover_image = $item['image'];
            }
            if (!empty($item['images'])) {
                $product->images = implode(',', array_map('strval', (array) $item['images']));
            }
        }

        if (array_key_exists('is_active', $item)) {
            $product->is_active = (bool) $item['is_active'];
        }
    }

    protected function createProduct(Store $store, array $item, array $settings): Product
    {
        $product = new Product();
        $product->store_id = $store->id;
        $product->name = $item['name'] ?? 'منتج جديد';
        $product->sku = isset($item['sku']) ? (string) $item['sku'] : null;
        $product->barcode = isset($item['barcode']) ? (string) $item['barcode'] : null;
        $product->price = (float) ($item['price'] ?? 0);
        $product->stock = (int) ($item['stock'] ?? 0);
        $product->is_active = ($item['is_active'] ?? true) !== false;

        if ($this->wants($settings, 'sync_product_details')) {
            $product->description = $item['description'] ?? null;
            $product->short_description = $item['short_description'] ?? null;
        }
        if ($this->wants($settings, 'sync_prices')) {
            $product->sale_price = isset($item['sale_price']) && $item['sale_price'] !== null ? (float) $item['sale_price'] : null;
        }
        if ($this->wants($settings, 'sync_images') && !empty($item['image'])) {
            $product->cover_image = $item['image'];
        }

        $product->save();
        return $product;
    }

    /** Whether a sync-setting toggle is ON (defaults to true when unset). */
    protected function wants(array $settings, string $key): bool
    {
        return (bool) ($settings[$key] ?? true);
    }

    /* ------------------------------------------------------------------ */
    /* Outbound / testing                                                  */
    /* ------------------------------------------------------------------ */

    public function testConnection(StoreErpConfig $config): array
    {
        $endpoint = rtrim((string) $config->api_endpoint, '/');

        try {
            $headers = ['Accept' => 'application/json', 'X-API-Key' => (string) $config->api_key];
            $response = Http::withHeaders($headers)->timeout(10)->get($endpoint);

            return [
                'success' => $response->successful() || $response->status() >= 400,
                'status' => $response->status(),
                'message' => $response->successful()
                    ? 'تم الاتصال بنجاح (' . $response->status() . ')'
                    : 'الخادم استجاب (' . $response->status() . ') — تحقق من الإعدادات.',
            ];
        } catch (\Throwable $e) {
            return ['success' => false, 'status' => 0, 'message' => 'فشل الاتصال: ' . $e->getMessage()];
        }
    }

    /**
     * Pull products from the provider endpoint (initial sync / resync).
     * Expects: GET {endpoint} → { data: [ {sku,barcode,name,price,stock,...} ] }.
     */
    public function initialSync(StoreErpConfig $config): array
    {
        $endpoint = rtrim((string) $config->api_endpoint, '/');
        $settings = $config->syncSettings();

        try {
            $response = Http::withHeaders(['Accept' => 'application/json', 'X-API-Key' => (string) $config->api_key])
                ->timeout(60)
                ->get($endpoint);

            if (!$response->successful()) {
                return ['success' => false, 'message' => 'فشل جلب المنتجات: ' . $response->status()];
            }

            $items = $response->json('data') ?? $response->json('products') ?? [];
            if (!is_array($items) || !count($items)) {
                return ['success' => false, 'message' => 'لا توجد منتجات في الاستجابة.'];
            }

            return $this->syncProducts($config->store, ['products' => $items], $config);
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => 'فشل المزامنة: ' . $e->getMessage()];
        }
    }

    protected function markSynced(?StoreErpConfig $config, string $status, ?string $error = null): void
    {
        if (!$config) {
            return;
        }
        $config->update([
            'last_sync_at' => now(),
            'last_sync_status' => $status,
            'last_sync_error' => $error,
        ]);
    }

    public static function log(string $message, array $context = []): void
    {
        Log::channel('stack')->info('[erp-sync] ' . $message, $context);
    }
}