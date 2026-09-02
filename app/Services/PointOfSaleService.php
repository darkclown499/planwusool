<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Customer;
use App\Models\InventoryMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Point of Sale (Phase 1) — merchant in-store checkout.
 *
 * POS deliberately REUSES the canonical Order + OrderItem + InventoryService:
 * a POS sale is a real Wusool order with order_source = 'pos', stock is
 * decremented from the SAME single inventory truth that online checkout uses
 * (so online and POS can never diverge), concurrency safety comes from the
 * existing row-locking InventoryService::decrementForCartLine, and the stock
 * ledger records a POS_SALE movement automatically.
 */
class PointOfSaleService
{
    /**
     * Create + complete a POS sale.
     *
     * @param int $storeId validated merchant-owned store
     * @param array<int,array{product_id:int,variant_id?:?string,variant_uuid?:?string,quantity:int}> $lineItems
     * @param string $paymentMethod cash | cod | bank (physical/manned methods only)
     * @param int|null $customerId optional linked CRM customer (must belong to store)
     * @param string|null $notes
     * @param bool $markCollected whether cashier physically collected payment (POS cash)
     * @return Order
     *
     * @throws \Exception with Arabic domain message on validation/insufficient stock
     */
    public function createPosSale(
        int $storeId,
        array $lineItems,
        string $paymentMethod,
        ?int $customerId = null,
        ?string $notes = null,
        bool $markCollected = true
    ): Order {
        if (empty($lineItems)) {
            throw new \Exception('لا يمكن إتمام بيع فارغ.');
        }
        if (!in_array($paymentMethod, ['cash', 'cod', 'bank', 'bank_transfer'], true)) {
            throw new \Exception('طريقة الدفع غير مدعومة في نقطة البيع.');
        }

        $currency = $this->storeCurrency($storeId);
        $walkInName = 'زبون مباشر';
        if ($customerId) {
            $customer = Customer::where('id', $customerId)->where('store_id', $storeId)->first();
            if (!$customer) {
                throw new \Exception('العميل المحدد غير موجود في هذا المتجر.');
            }
        } else {
            $customer = null;
        }
        // orders.customer_email is NOT NULL; walk-in POS keeps a deterministic placeholder
        // (multi-store safe) so no synthetic customer row is ever created.
        $posEmail = $customer?->email ?? sprintf('pos-walkin-%d@local', $storeId);

        $subtotal = 0.0;
        $cartItems = [];
        foreach ($lineItems as $i => $line) {
            $productId = (int) ($line['product_id'] ?? 0);
            $qty = (int) ($line['quantity'] ?? 0);
            if ($qty <= 0) {
                throw new \Exception('الكمية يجب أن تكون أكبر من صفر للمنتج ' . ($i + 1) . '.');
            }
            // Server-authoritative product load, store-scoped.
            $product = Product::where('id', $productId)->where('store_id', $storeId)->where('is_active', true)->first();
            if (!$product) {
                throw new \Exception('منتج غير موجود في هذا المتجر.');
            }

            // Build variant selection from validated combo id/uuid.
            $variantId = $line['variant_id'] ?? $line['variant_combination_id'] ?? null;
            $variantUuid = $line['variant_uuid'] ?? null;
            $selection = null;
            $comboIdForSnapshot = null;
            $comboUuidForSnapshot = null;
            if ($variantId || $variantUuid) {
                $comboInfo = $this->resolveComboByRef($product, $variantId, $variantUuid);
                if (!$comboInfo) {
                    throw new \Exception('خيار غير موجود للمنتج ' . $product->name . '.');
                }
                $selection = $comboInfo['id'] ?? null;
                if (!$selection) $selection = $comboInfo;
                $comboIdForSnapshot = $comboInfo['id'] ?? null;
                $comboUuidForSnapshot = $comboInfo['uuid'] ?? null;
            }

            // Reuse the canonical merchant price (base price / effective variant price).
            $unitPrice = $product->effectivePriceForVariant($selection);

            $sku = $product->sku;
            if ($selection) {
                $resolved = $product->resolveVariantCombination($selection);
                $sku = $resolved['sku'] ?? $product->sku;
            }

            // Cart-line payload compatible with OrderService::createOrder + InventoryService::decrementForCartLine.
            // 'variants' takes the combo id string so findCombination resolves the exact variant.
            $linePayload = [
                'product_id' => $product->id,
                'name' => $product->name,
                'sku' => $sku,
                'price' => $unitPrice,
                'quantity' => $qty,
                'variants' => $selection,
            ];
            if ($product->tax) {
                $linePayload['taxName'] = $product->tax->name ?? null;
                $linePayload['taxPercentage'] = $product->tax->rate ?? 0;
                $linePayload['taxType'] = $product->tax->type ?? null;
            }
            $cartItems[] = $linePayload;
            $subtotal += $unitPrice * $qty;
        }

        // POS line refs for post-order snapshot (variant id/uuid) keyed by product_id + combo id.
        $orderData = [
            'store_id' => $storeId,
            'order_source' => 'pos',
            'payment_method' => $paymentMethod,
            'subtotal' => round($subtotal, 2),
            'tax_amount' => 0,
            'shipping_amount' => 0,
            'discount_amount' => 0,
            'total_amount' => round($subtotal, 2),
            'currency' => $currency,
            'customer_email' => $posEmail,
            'customer_phone' => $customer?->phone,
            'customer_first_name' => $customer?->first_name ?? $walkInName,
            'customer_last_name' => $customer?->last_name ?? '',
            // orders requires non-null address strings; walk-in POS uses a clear in-store
            // sentinel so no synthetic mailing address is ever fabricated.
            'shipping_address' => 'In-Store',
            'shipping_city' => '',
            'shipping_state' => '',
            'shipping_country' => '',
            'billing_address' => 'In-Store',
            'billing_city' => '',
            'billing_state' => '',
            'billing_country' => '',
            'notes' => $notes,
        ];

        // Reuse canonical OrderService — creates Order, decrements stock (ledger POS_SALE),
        // persists OrderItems with variant/uuid/inventory_mode snapshots.
        $order = app(OrderService::class)->createOrder($orderData, $cartItems);

        // Link CRM customer if provided (server-validated to this store). customer_id is
        // guarded; set directly so it is persisted while remaining non-mass-assignable.
        if ($customer) {
            $order->customer_id = $customer->id;
        }

        // POS in-store completion — scoped strictly to order_source = 'pos'.
        $posState = [
            'status' => 'delivered',          // goods handed over at the register
            'delivered_at' => now(),
        ];
        if ($markCollected) {
            // Cashier physically collected (cash / manned methods): record as paid.
            $posState['payment_status'] = 'paid';
            $posState['paid_at'] = now();
            $posState['payment_confirmed_by'] = Auth::guard('web')->id();
        }
        $order->forceFill($posState);
        $order->save();

        return $order->fresh();
    }

    /**
     * Resolve a variant combination by id or stable uuid within a product's own list.
     *
     * @return array{id?:string, uuid?:string, label?:string, values?:array}|null
     */
    private function resolveComboByRef(Product $product, ?string $variantId, ?string $variantUuid): ?array
    {
        $combos = $product->variant_combinations ?? [];
        if (!is_array($combos)) return null;
        foreach ($combos as $c) {
            if ($variantUuid && (($c['uuid'] ?? null) === $variantUuid)) return $c;
        }
        foreach ($combos as $c) {
            if ($variantId && (($c['id'] ?? null) === $variantId)) return $c;
        }
        return null;
    }

    /**
     * Resolve the store's active currency, falling back to defaults.
     */
    private function storeCurrency(int $storeId): string
    {
        $store = \App\Models\Store::find($storeId);
        if ($store && !empty($store->currency)) return strtoupper($store->currency);
        try {
            $settings = app(\App\Services\Currency\CurrencyService::class)->getCurrencySettings(
                Auth::guard('web')->id(),
                $storeId
            );
            $code = $settings['defaultCurrency'] ?? null;
            if ($code) return strtoupper($code);
        } catch (\Throwable $e) {
            Log::warning('POS currency lookup failed', ['store_id' => $storeId, 'error' => $e->getMessage()]);
        }
        return 'ILS';
    }
}
