<?php

namespace App\Services;

use App\Models\Order;
use App\Models\StoreConfiguration;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    public function sendOrderConfirmation(Order $order, string $customerWhatsappNumber): bool
    {
        $store = $order->store;
        if (!$store) return false;

        // Get Store Owner's WhatsApp Number from Payment Settings
        $whatsappConfig = getPaymentMethodConfig('whatsapp', $store->user_id, $store->id);
        $storeWhatsappNumber = $whatsappConfig['number'] ?? '';

        $cleanNumber = $this->cleanNumber($storeWhatsappNumber);
        if (!$cleanNumber) return false;

        $message = $this->buildMessage($order);
        $whatsappUrl = "https://wa.me/{$cleanNumber}?text=" . urlencode($message);
        
        // Store in session for backend and also prepare for frontend
        session([
            'whatsapp_redirect_url' => $whatsappUrl,
            'whatsapp_order_id' => $order->id
        ]);
        
        // Also store in a way that frontend can access via JavaScript
        session()->flash('whatsapp_data', [
            'url' => $whatsappUrl,
            'order_id' => $order->id
        ]);
        
        return true;
    }

    private function buildMessage(Order $order): string
    {
        $store = $order->store;
        $template = $this->getTemplate($store->user_id, $store->id);
        $itemTemplate = $this->getItemTemplate($store->user_id, $store->id);
        
        // Convert literal \n to actual newlines
        $template = stripcslashes($template);
        $itemTemplate = stripcslashes($itemTemplate);
        
        $items = '';
        foreach ($order->items as $item) {
            $variants = $item->product_variants;
            if (is_array($variants) && !empty($variants)) {
                $variant = implode(', ', $variants);
            } elseif (is_string($variants) && $variants && $variants !== '[]' && $variants !== 'null') {
                $variant = $variants;
            } else {
                $variant = 'No Variants';
            }
            
            // Get actual tax from order item tax_details
            $itemTax = 0;
            if ($item->tax_details) {
                $taxDetails = json_decode($item->tax_details, true);
                $itemTax = $taxDetails['tax_amount'] ?? 0;
            }
            
            $items .= str_replace(
                ['{product_name}', '{variant_name}', '{quantity}', '{item_total}', '{item_tax}', '{sku}'],
                [$item->product_name, $variant, $item->quantity, number_format($item->total_price, 2), number_format($itemTax, 2), $item->product_sku ?? 'N/A'],
                $itemTemplate
            ) . "\n";
        }

        // Get individual address components with proper names
        $shippingCity = $order->shipping_city ? (\App\Models\City::find($order->shipping_city)->name ?? $order->shipping_city) : '';
        $shippingCountry = $order->shipping_country ? (\App\Models\Country::find($order->shipping_country)->name ?? $order->shipping_country) : '';
        $shippingPostal = $order->shipping_postal_code ?? '';
        
        $variables = [
            '{store_name}' => $store->name,
            '{order_no}' => $order->order_number,
            '{customer_name}' => trim($order->customer_first_name . ' ' . $order->customer_last_name),
            '{shipping_address}' => $this->formatAddress($order, 'shipping'),
            '{shipping_city}' => $shippingCity,
            '{shipping_country}' => $shippingCountry,
            '{shipping_postalcode}' => $shippingPostal,
            '{item_variable}' => trim($items),
            '{qty_total}' => $order->items->sum('quantity'),
            '{sub_total}' => number_format($order->subtotal, 2),
            '{discount_amount}' => number_format($order->discount_amount, 2),
            '{shipping_amount}' => number_format($order->shipping_amount, 2),
            '{total_tax}' => number_format($order->tax_amount, 2),
            '{final_total}' => number_format($order->total_amount, 2),
            '{order_date}' => $order->created_at->format('d/m/Y H:i'),
            '{payment_method}' => ucfirst($order->payment_method),
        ];

        return str_replace(array_keys($variables), array_values($variables), $template);
    }

    private function formatAddress(Order $order, string $type): string
    {
        $address = $order->{$type . '_address'};
            
        // Get city name
        $cityId = $order->{$type . '_city'};
        $city = $cityId ? (\App\Models\City::find($cityId)->name ?? $cityId) : '';
        
        // Get state name  
        $stateId = $order->{$type . '_state'};
        $state = $stateId ? (\App\Models\State::find($stateId)->name ?? $stateId) : '';
        
        // Get country name
        $countryId = $order->{$type . '_country'};
        $country = $countryId ? (\App\Models\Country::find($countryId)->name ?? $countryId) : '';
        
        $postal = $order->{$type . '_postal_code'};
        
        $parts = array_filter([$address, $city, $state, $postal, $country]);
        return implode(', ', $parts);
    }

    private function getTemplate(int $userId, int $storeId): string
    {
        return getSetting('messaging_message_template', 
            "Hi,\nWelcome to {store_name},\nYour order is confirmed & your order no. is #{order_no}\nYour order detail is:\nName : {customer_name}\nAddress : {shipping_city}, {shipping_country} - {shipping_postalcode}\n~~~~~~~~~~~~~~~~\n{item_variable}\n~~~~~~~~~~~~~~~~\nQty Total : {qty_total}\nSub Total : {sub_total}\nDiscount Price : {discount_amount}\nShipping Price : {shipping_amount}\nTax : {total_tax}\nTotal : {final_total}\n~~~~~~~~~~~~~~~~~~\nTo collect the order you need to show the receipt at the counter.\nThanks {store_name}",
            $userId, $storeId
        );
    }

    private function getItemTemplate(int $userId, int $storeId): string
    {
        return getSetting('messaging_item_template', 
            "• {product_name} ({variant_name}) Qty: {quantity} x Price: {item_total} (Tax: {item_tax}) SKU: {sku}",
            $userId, $storeId
        );
    }

    private function cleanNumber(string $number): ?string
    {
        $cleaned = preg_replace('/[^0-9]/', '', $number);
        return (strlen($cleaned) >= 10 && strlen($cleaned) <= 15) ? $cleaned : null;
    }

    public static function getWhatsAppRedirectUrl(): ?string
    {
        return session('whatsapp_redirect_url');
    }

    public static function clearWhatsAppSession(): void
    {
        session()->forget(['whatsapp_redirect_url', 'whatsapp_order_id']);
    }
}