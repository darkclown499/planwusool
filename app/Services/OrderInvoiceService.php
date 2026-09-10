<?php

namespace App\Services;

use App\Models\Currency;
use App\Models\Order;
use App\Models\Setting;
use App\Models\Store;
use Barryvdh\DomPDF\Facade\Pdf;

class OrderInvoiceService
{
    /**
     * Render an order as the canonical PDF invoice. Shared by the customer
     * storefront (ThemeController::downloadOrderPdf) and the merchant dashboard
     * (OrderController::invoice) so there is exactly ONE invoice renderer.
     * Ownership/membership checks are the caller's responsibility — this
     * service never resolves the tenant on its own.
     */
    public function download(Order $order, Store $store)
    {
        $pdf = Pdf::loadView('pdf.invoice', $this->buildInvoiceData($order, $store));

        return $pdf->download("invoice-{$order->order_number}.pdf");
    }

    /**
     * Build the exact data contract expected by resources/views/pdf/invoice.blade.php.
     */
    public function buildInvoiceData(Order $order, Store $store): array
    {
        $storeSettings = [];
        $currencies = [];

        if ($store->user_id) {
            $storeSettings = Setting::getUserSettings($store->user_id, $store->id);
            $currencies = Currency::all()->map(function ($currency) {
                return [
                    'code' => $currency->code,
                    'symbol' => $currency->symbol,
                    'name' => $currency->name,
                ];
            })->toArray();
        }

        $orderData = [
            'id' => $order->order_number,
            'date' => $order->created_at->toISOString(),
            'status' => ucfirst($order->status),
            'total' => (float) $order->total_amount,
            'subtotal' => (float) $order->subtotal,
            'discount' => (float) $order->discount_amount,
            'shipping' => (float) $order->shipping_amount,
            'tax' => (float) $order->tax_amount,
            'currency' => $storeSettings['currency_symbol'] ?? '$',
            'coupon' => $order->coupon_code,
            'payment_method' => $order->payment_method === 'cod'
                ? 'Cash on Delivery'
                : ucfirst(str_replace('_', ' ', (string) $order->payment_method)),
            'customer' => [
                'name' => $order->customer_first_name . ' ' . $order->customer_last_name,
                'email' => $order->customer_email,
                'phone' => $order->customer_phone,
            ],
            'shipping_address' => [
                'name' => $order->customer_first_name . ' ' . $order->customer_last_name,
                'address' => $order->shipping_address,
                'city' => is_numeric($order->shipping_city) ? (\App\Models\City::find($order->shipping_city)->name ?? $order->shipping_city) : $order->shipping_city,
                'state' => is_numeric($order->shipping_state) ? (\App\Models\State::find($order->shipping_state)->name ?? $order->shipping_state) : $order->shipping_state,
                'postal_code' => $order->shipping_postal_code,
                'country' => is_numeric($order->shipping_country) ? (\App\Models\Country::find($order->shipping_country)->name ?? $order->shipping_country) : $order->shipping_country,
            ],
            'items' => $order->items->map(function ($item) {
                $taxDetails = json_decode((string) ($item->tax_details ?? ''), true) ?? [];

                return [
                    'name' => $item->product_name,
                    'price' => (float) $item->unit_price,
                    'quantity' => $item->quantity,
                    'variants' => $item->product_variants,
                    'tax_name' => $taxDetails['tax_name'] ?? null,
                    'tax_percentage' => $taxDetails['tax_percentage'] ?? null,
                    'tax_amount' => (float) ($taxDetails['tax_amount'] ?? 0),
                ];
            })->toArray(),
        ];

        $config = [
            'storeName' => $store->name,
            'email' => $store->email,
            'phoneNumber' => $storeSettings['phone'] ?? '',
            'locale' => $storeSettings['language'] ?? 'ar',
            'vat' => [
                'vat_number' => $storeSettings['vat_number'] ?? null,
                'tax_registration_number' => $storeSettings['tax_registration_number'] ?? null,
            ],
        ];

        return [
            'orderNumber' => $order->order_number,
            'order' => $orderData,
            'config' => $config,
            'storeSettings' => $storeSettings,
            'currencies' => $currencies,
            'secondaryCurrency' => $this->resolveSecondaryCurrency($storeSettings),
            'vat' => $config['vat'],
            'locale' => $config['locale'],
        ];
    }

    private function resolveSecondaryCurrency(array $storeSettings): ?array
    {
        $secondaryCurrencyCode = $storeSettings['secondaryCurrency'] ?? null;
        if (!$secondaryCurrencyCode) {
            return null;
        }

        $secondaryCurrencyModel = Currency::where('code', $secondaryCurrencyCode)->first();
        if (!$secondaryCurrencyModel) {
            return null;
        }

        return [
            'code' => $secondaryCurrencyModel->code,
            'symbol' => $secondaryCurrencyModel->symbol,
            'name' => $secondaryCurrencyModel->name,
            'exchangeRate' => (float) ($storeSettings['exchangeRate'] ?? 0),
        ];
    }
}