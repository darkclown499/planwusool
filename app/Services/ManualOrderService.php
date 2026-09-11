<?php

namespace App\Services;

use App\Events\OrderCreated;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Shipping;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Manual merchant order — a real Wusool order placed on behalf of a customer
 * over phone/WhatsApp/offline by the merchant in the dashboard.
 *
 * It deliberately REUSES the canonical OrderService::createOrder (same order +
 * order-item + InventoryService ledger path as storefront and POS), so manual
 * stock decrement and online stock can never diverge. order_source = 'manual'.
 *
 * AUTHORITATIVE PRICING: every price/subtotal/tax/shipping/total is computed
 * here from canonical product/variant/tax/shipping data. Client-supplied
 * prices or totals are NEVER read (the forged-payload tests rely on this).
 */
class ManualOrderService
{
    public const ORDER_SOURCE = 'manual';

    public function createManualOrder(int $storeId, array $data): Order
    {
        $paymentMethod = (string) ($data['payment_method'] ?? '');
        if (!in_array($paymentMethod, OrderTransitionService::OFFLINE_PAYMENT_METHODS, true)) {
            throw new \Exception('طريقة الدفع غير مدعومة في الطلب اليدوي.');
        }

        $items = $data['items'] ?? [];
        if (empty($items)) {
            throw new \Exception('لا يمكن إنشاء طلب بدون أصناف.');
        }

        $customer = $this->resolveCustomer($storeId, $data);

        return DB::transaction(function () use ($storeId, $data, $items, $customer, $paymentMethod) {
            $currency = $this->storeCurrency($storeId);

            $subtotal = 0.0;
            $taxAmount = 0.0;
            $exclusiveTax = 0.0;
            $cartItems = [];
            foreach ($items as $i => $line) {
                $productId = (int) ($line['product_id'] ?? 0);
                $qty = (int) ($line['quantity'] ?? 0);
                if ($qty <= 0) {
                    throw new \Exception('الكمية يجب أن تكون أكبر من صفر للمنتج ' . ($i + 1) . '.');
                }

                $product = Product::with('tax')->where('id', $productId)
                    ->where('store_id', $storeId)
                    ->where('is_active', true)
                    ->first();
                if (!$product) {
                    throw new \Exception('منتج غير موجود في هذا المتجر.');
                }

                $variantId = $line['variant_id'] ?? $line['variant_combination_id'] ?? null;
                $variantUuid = $line['variant_uuid'] ?? null;
                $selection = null;
                if ($variantId || $variantUuid) {
                    $comboInfo = $this->resolveComboByRef($product, $variantId, $variantUuid);
                    if (!$comboInfo) {
                        throw new \Exception('خيار غير موجود للمنتج ' . $product->name . '.');
                    }
                    $selection = $comboInfo['id'] ?? $comboInfo;
                }

                $unitPrice = (float) $product->effectivePriceForVariant($selection);

                $sku = $product->sku;
                if ($selection) {
                    $resolved = $product->resolveVariantCombination($selection);
                    $sku = $resolved['sku'] ?? $product->sku;
                }

                $lineTotal = $unitPrice * $qty;

                $linePayload = [
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'sku' => $sku,
                    'price' => $unitPrice,
                    'quantity' => $qty,
                    'variants' => $selection,
                    'unit_cost' => $product->costPriceForVariant($selection),
                ];

                // Per-line tax mirrors CartCalculationService (discount = 0).
                $rate = 0.0;
                $inclusive = false;
                if ($product->tax && (float) $product->tax->rate > 0) {
                    $rate = (float) $product->tax->rate;
                    $inclusive = (bool) $product->is_tax_included;
                    $linePayload['taxName'] = $product->tax->name ?? null;
                    $linePayload['taxPercentage'] = $rate;
                    $linePayload['taxType'] = $product->tax->type ?? null;
                }
                $subtotal += $lineTotal;
                if ($inclusive) {
                    // Tax is embedded in the item price: report it, do not add it on top.
                    $taxAmount += $lineTotal - ($lineTotal / (1 + $rate / 100));
                } else {
                    $lineTax = $lineTotal * ($rate / 100);
                    $taxAmount += $lineTax;
                    $exclusiveTax += $lineTax;
                }

                $cartItems[] = $linePayload;
            }
            $subtotal = round($subtotal, 2);
            $taxAmount = round($taxAmount, 2);
            $exclusiveTax = round($exclusiveTax, 2);

            $shippingFee = $this->shippingFee($storeId, $data, $subtotal);
            $totalAmount = round($subtotal + $shippingFee + $exclusiveTax, 2);

            $address = (string) ($data['shipping_address'] ?? '');
            $city = (string) ($data['shipping_city'] ?? '');
            $state = (string) ($data['shipping_state'] ?? '');
            $country = (string) ($data['shipping_country'] ?? '');
            $postal = (string) ($data['shipping_postal_code'] ?? '');

            $orderData = [
                'store_id' => $storeId,
                'order_source' => self::ORDER_SOURCE,
                'payment_method' => $paymentMethod,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'shipping_amount' => $shippingFee,
                'discount_amount' => 0,
                'total_amount' => $totalAmount,
                'currency' => $currency,
                'customer_email' => $customer['email'],
                'customer_phone' => $customer['phone'],
                'customer_first_name' => $customer['first_name'],
                'customer_last_name' => $customer['last_name'],
                'shipping_address' => $address !== '' ? $address : 'كما هو',
                'shipping_city' => $city ?: '—',
                'shipping_state' => $state ?: '',
                'shipping_postal_code' => $postal,
                'shipping_country' => $country ?: '',
                'billing_address' => $address !== '' ? $address : 'كما هو',
                'billing_city' => $city ?: '—',
                'billing_state' => $state ?: '',
                'billing_postal_code' => $postal,
                'billing_country' => $country ?: '',
                'shipping_method_id' => $data['shipping_method_id'] ?? null,
                'idempotency_key' => $data['idempotency_key'] ?? null,
                'notes' => $data['notes'] ?? null,
                'payment_gateway' => $paymentMethod,
            ];

            $order = app(OrderService::class)->createOrder($orderData, $cartItems);

            if ($customer['id'] !== null) {
                $order->customer_id = $customer['id'];
            }
            $order->save();
            $order = $order->fresh();

            // Canonical event parity with the storefront offline methods:
            // OrderCreated fires exactly once, after creation. Listeners are
            // afterCommit + deduplicated, so no duplicate emails/notifications.
            event(new OrderCreated($order));

            return $order;
        });
    }

    /**
     * Resolve the customer (store-scoped) or guest fields.
     * @return array{id:?int,first_name:string,last_name:string,email:string,phone:string}
     */
    private function resolveCustomer(int $storeId, array $data): array
    {
        $customerId = $data['customer_id'] ?? null;
        if ($customerId) {
            $customer = Customer::where('id', $customerId)->where('store_id', $storeId)->first();
            if (!$customer) {
                throw new \Exception('العميل المحدد غير موجود في هذا المتجر.');
            }
            return [
                'id' => $customer->id,
                'first_name' => $customer->first_name ?? '',
                'last_name' => $customer->last_name ?? '',
                'email' => $customer->email ?: sprintf('manual-%d@local', $storeId),
                'phone' => $customer->phone ?? '',
            ];
        }

        $first = (string) ($data['first_name'] ?? '');
        if ($first === '') {
            throw new \Exception('اسم العميل مطلوب.');
        }
        // orders.customer_email is NOT NULL; keep a deterministic store-scoped
        // placeholder when the merchant has no email on file (multi-store safe,
        // no synthetic customer row is ever created).
        $email = (string) ($data['email'] ?? '');
        if ($email === '') {
            $email = sprintf('manual-%d@local', $storeId);
        }
        return [
            'id' => null,
            'first_name' => $first,
            'last_name' => (string) ($data['last_name'] ?? ''),
            'email' => $email,
            'phone' => (string) ($data['phone'] ?? ''),
        ];
    }

    /**
     * Shipping fee mirror of CartCalculationService (no free-shipping threshold override).
     * free_shipping → 0; percentage_based → subtotal*cost% + handling; else cost + handling.
     */
    private function shippingFee(int $storeId, array $data, float $subtotal): float
    {
        $id = $data['shipping_method_id'] ?? null;
        if (!$id) {
            return 0.0;
        }
        $method = Shipping::where('id', $id)->where('store_id', $storeId)->where('is_active', true)->first();
        if (!$method) {
            throw new \Exception('طريقة التوصيل المحددة غير موجودة في هذا المتجر.');
        }
        $cost = (float) ($method->cost ?? 0);
        $handling = (float) ($method->handling_fee ?? 0);
        $type = strtolower((string) $method->type);
        if (in_array($type, ['free_shipping', 'free'], true)) {
            return 0.0;
        }
        if (in_array($type, ['percentage_based', 'percentage'], true)) {
            return round(($subtotal * $cost / 100) + $handling, 2);
        }
        return round($cost + $handling, 2);
    }

    private function resolveComboByRef(Product $product, ?string $variantId, ?string $variantUuid): ?array
    {
        $combos = $product->variant_combinations ?? [];
        if (!is_array($combos)) {
            return null;
        }
        foreach ($combos as $c) {
            if ($variantUuid && (($c['uuid'] ?? null) === $variantUuid)) {
                return $c;
            }
        }
        foreach ($combos as $c) {
            if ($variantId && (($c['id'] ?? null) === $variantId)) {
                return $c;
            }
        }
        return null;
    }

    private function storeCurrency(int $storeId): string
    {
        $store = \App\Models\Store::find($storeId);
        if ($store && !empty($store->currency)) {
            return strtoupper($store->currency);
        }
        try {
            $settings = app(\App\Services\Currency\CurrencyService::class)->getCurrencySettings(
                Auth::guard('web')->id(),
                $storeId
            );
            $code = $settings['defaultCurrency'] ?? null;
            if ($code) {
                return strtoupper($code);
            }
        } catch (\Throwable $e) {
            Log::warning('Manual order currency lookup failed', ['store_id' => $storeId, 'error' => $e->getMessage()]);
        }
        return 'ILS';
    }
}