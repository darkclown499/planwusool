<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PaymentSetting;
use App\Models\User;
use App\Models\Store;

class MessagingSettingsSeeder extends Seeder
{
    public function run()
    {
        // Check if messaging settings already exist
        if (PaymentSetting::where('key', 'messaging_order_variables')->exists()) {
            $this->command->info('Messaging settings already exist. Skipping seeder to preserve existing data.');
            return;
        }

        // Get all company users
        $companyUsers = User::where('type', 'company')->get();
        
        if ($companyUsers->isEmpty()) {
            $this->command->info('No company users found. Skipping messaging settings seeder.');
            return;
        }
        
        $totalSettings = 0;        
        foreach ($companyUsers as $companyUser) {
            $stores = Store::where('user_id', $companyUser->id)->get();
            
            foreach ($stores as $store) {
                $this->createMessagingSettings($companyUser->id, $store->id);
                $totalSettings++;
            }
        }
        
    }

    private function createMessagingSettings($userId, $storeId)
    {
        $settings = $this->getMessagingSettings();
        
        foreach ($settings as $key => $value) {
            PaymentSetting::updateOrCreate(
                [
                    'user_id' => $userId,
                    'store_id' => $storeId,
                    'key' => $key
                ],
                ['value' => $value]
            );
        }
    }

    private function getMessagingSettings(): array
    {
        $orderVariables = [
            'store_name', 'order_no', 'customer_name', 'shipping_address', 'shipping_country', 
            'shipping_city', 'shipping_postalcode', 'item_variable', 'qty_total', 
            'sub_total', 'discount_amount', 'shipping_amount', 'total_tax', 'final_total'
        ];

        $itemVariables = [
            'sku', 'quantity', 'product_name', 'variant_name', 'item_tax', 'item_total'
        ];

        return [
            'is_whatsapp_enabled' => '0',
            'whatsapp_phone_number' => '',
            'is_telegram_enabled' => '0',
            'telegram_bot_token' => '',
            'telegram_chat_id' => '',
            'messaging_message_template' => 'Your order #{order_no} from {store_name} 🛍️\n\nHi {customer_name}!\n\nYour order has been confirmed!\n\n📦 Items ({qty_total} items):\n{item_variable}\n\n💰 Order Summary:\nSubtotal: {sub_total}\nDiscount: {discount_amount}\nShipping: {shipping_amount}\nTax: {total_tax}\nTotal: {final_total}\n\n🚚 Shipping Address:\n{shipping_address}\n{shipping_city}, {shipping_country} - {shipping_postalcode}\n\nThank you for shopping with us!',
            'messaging_item_template' => '• {product_name} ({variant_name})\n  Qty: {quantity}\n  Price: {item_total} (Tax: {item_tax})\n  SKU: {sku}',
            'messaging_order_variables' => json_encode($orderVariables),
            'messaging_item_variables' => json_encode($itemVariables)
        ];
    }
}