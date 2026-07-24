<?php

namespace App\Listeners;

use App\Events\OrderCreated;
use Illuminate\Support\Facades\Cache;
use Exception;

class SendOrderCreatedMessaging
{
    public function handle(OrderCreated $event): void
    {
        $order = $event->order;
        
        // Prevent duplicate processing
        $cacheKey = 'order_notifications_' . $order->id;
        if (Cache::has($cacheKey)) return;
        Cache::put($cacheKey, true, 300);
        
        $store = $order->store;
        if (!$store) return;
        
        $userId = $store->user_id;
        $storeId = $store->id;
        
        // Only send notification based on selected payment method
        if ($order->payment_method === 'whatsapp') {
            // Send WhatsApp notification if WhatsApp payment was selected
            $isWhatsAppEnabled = getSetting('is_whatsapp_enabled', false, $userId, $storeId);
            
            if ($isWhatsAppEnabled && $order->whatsapp_number) {
                try {
                    $whatsappService = new \App\Services\WhatsAppService();
                    $success = $whatsappService->sendOrderConfirmation($order, $order->whatsapp_number);
                    
                    if (!$success) {
                        \Log::warning('WhatsApp notification failed for order', [
                            'order_id' => $order->id,
                            'store_id' => $storeId,
                            'reason' => 'Service returned false'
                        ]);
                    }
                } catch (Exception $e) {
                    \Log::error('WhatsApp notification failed with exception', [
                        'order_id' => $order->id,
                        'store_id' => $storeId,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            } else {
                \Log::warning('WhatsApp notification skipped - missing configuration', [
                    'order_id' => $order->id,
                    'store_id' => $storeId,
                    'has_whatsapp_enabled' => !empty($isWhatsAppEnabled),
                    'has_customer_whatsapp_number' => !empty($order->whatsapp_number)
                ]);
            }
        } elseif ($order->payment_method === 'telegram') {
            // Send Telegram notification if Telegram payment was selected
            $isTelegramEnabled = getSetting('is_telegram_enabled', false, $userId, $storeId);
            if ($isTelegramEnabled) {
                $botToken = getSetting('telegram_bot_token', null, $userId, $storeId);
                $chatId = getSetting('telegram_chat_id', null, $userId, $storeId);
                
                if ($botToken && $chatId) {
                    try {
                        $telegramService = new \App\Services\TelegramService();
                        $success = $telegramService->sendOrderConfirmation($order, $botToken, $chatId);
                        
                        if (!$success) {
                            \Log::warning('Telegram notification failed for order', [
                                'order_id' => $order->id,
                                'store_id' => $storeId,
                                'reason' => 'Service returned false'
                            ]);
                        }
                    } catch (Exception $e) {
                        \Log::error('Telegram notification failed with exception', [
                            'order_id' => $order->id,
                            'store_id' => $storeId,
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString()
                        ]);
                    }
                } else {
                    \Log::warning('Telegram notification skipped - missing configuration', [
                        'order_id' => $order->id,
                        'store_id' => $storeId,
                        'has_token' => !empty($botToken),
                        'has_chat_id' => !empty($chatId)
                    ]);
                }
            }
        }
    }
}