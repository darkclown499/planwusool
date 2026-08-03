<?php

namespace App\Services;

use App\Models\AbandonedCart;
use App\Models\Store;
use App\Models\CartItem;
use Illuminate\Support\Facades\Log;

class AbandonedCartService
{
    /**
     * Track or update an abandoned cart.
     */
    public function trackCart(int $storeId, string $sessionId, ?int $customerId = null, ?string $customerEmail = null, ?string $customerPhone = null, ?string $customerName = null, array $cartItems = [], float $cartTotal = 0): AbandonedCart
    {
        $cart = AbandonedCart::where('store_id', $storeId)
            ->where(function ($q) use ($sessionId, $customerId) {
                $q->where('session_id', $sessionId);
                if ($customerId) {
                    $q->orWhere('customer_id', $customerId);
                }
            })
            ->whereNotIn('status', ['recovered', 'expired', 'unsubscribed'])
            ->first();

        if ($cart) {
            $cart->update([
                'customer_id' => $customerId ?: $cart->customer_id,
                'customer_email' => $customerEmail ?: $cart->customer_email,
                'customer_phone' => $customerPhone ?: $cart->customer_phone,
                'customer_name' => $customerName ?: $cart->customer_name,
                'cart_items' => $cartItems,
                'cart_total' => $cartTotal,
                'last_activity_at' => now(),
            ]);
        } else {
            $cart = AbandonedCart::create([
                'store_id' => $storeId,
                'session_id' => $sessionId,
                'customer_id' => $customerId,
                'customer_email' => $customerEmail,
                'customer_phone' => $customerPhone,
                'customer_name' => $customerName,
                'cart_items' => $cartItems,
                'cart_total' => $cartTotal,
                'last_activity_at' => now(),
                'status' => 'new',
            ]);
        }

        return $cart;
    }

    /**
     * Mark an abandoned cart as recovered when an order is placed.
     */
    public function markRecovered(string $sessionId, int $orderId): void
    {
        AbandonedCart::where('session_id', $sessionId)
            ->where('status', '!=', 'recovered')
            ->update([
                'status' => 'recovered',
                'recovered_at' => now(),
                'recovered_order_id' => $orderId,
            ]);
    }

    /**
     * Find carts that are eligible for a reminder.
     */
    public function getCartsPendingReminder(int $storeId, int $hours = 24)
    {
        return AbandonedCart::pendingReminder($storeId, $hours)
            ->orderBy('last_activity_at', 'asc')
            ->get();
    }

    /**
     * Send a reminder for a single abandoned cart.
     */
    public function sendReminder(AbandonedCart $cart): void
    {
        try {
            // Determine what channel to use
            $hasEmail = !empty($cart->customer_email);
            $hasPhone = !empty($cart->customer_phone);

            if (!$hasEmail && !$hasPhone) {
                return;
            }

            // Build cart items summary for the message
            $itemsSummary = '';
            $items = is_array($cart->cart_items) ? $cart->cart_items : [];
            foreach ($items as $item) {
                $itemName = $item['name'] ?? 'Product';
                $itemQty = $item['quantity'] ?? 1;
                $itemsSummary .= "- {$itemName} x{$itemQty}\n";
            }

            $message = "Hello! You left some items in your cart:\n\n{$itemsSummary}\n"
                . "Don't miss out! Complete your order now.\n"
                . "Total: " . number_format($cart->cart_total, 2);

            // Send WhatsApp reminder if phone is available
            if ($hasPhone && $this->canSendWhatsApp($cart->store_id)) {
                try {
                    $whatsappService = app(WhatsAppService::class);
                    $whatsappService->sendMessage($cart->customer_phone, $message);
                } catch (\Exception $e) {
                    Log::error('Abandoned cart WhatsApp reminder failed: ' . $e->getMessage(), [
                        'cart_id' => $cart->id,
                        'store_id' => $cart->store_id,
                    ]);
                }
            }

            // Send email reminder if email is available
            if ($hasEmail) {
                try {
                    \Mail::to($cart->customer_email)->send(new \App\Mail\AbandonedCartReminderMail($cart));
                } catch (\Exception $e) {
                    Log::error('Abandoned cart email reminder failed: ' . $e->getMessage(), [
                        'cart_id' => $cart->id,
                        'store_id' => $cart->store_id,
                    ]);
                }
            }

            $cart->update([
                'status' => 'reminder_sent',
                'reminder_sent_at' => now(),
                'reminder_count' => $cart->reminder_count + 1,
            ]);
        } catch (\Exception $e) {
            Log::error('Abandoned cart reminder failed: ' . $e->getMessage(), [
                'cart_id' => $cart->id,
                'store_id' => $cart->store_id,
            ]);
        }
    }

    /**
     * Check if the store has WhatsApp service configured.
     */
    private function canSendWhatsApp(int $storeId): bool
    {
        try {
            $store = Store::find($storeId);
            if (!$store || !$store->user) {
                return false;
            }

            $settings = \App\Models\Setting::getUserSettings($store->user->id, $storeId);
            return !empty($settings['whatsapp_phone'] ?? '');
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get abandoned cart statistics for a store.
     */
    public function getStats(int $storeId): array
    {
        $total = AbandonedCart::where('store_id', $storeId)->count();
        $new = AbandonedCart::where('store_id', $storeId)->where('status', 'new')->count();
        $reminderSent = AbandonedCart::where('store_id', $storeId)->where('status', 'reminder_sent')->count();
        $recovered = AbandonedCart::where('store_id', $storeId)->where('status', 'recovered')->count();
        $expired = AbandonedCart::where('store_id', $storeId)->where('status', 'expired')->count();

        $recoveredAmount = AbandonedCart::where('store_id', $storeId)
            ->where('status', 'recovered')
            ->sum('cart_total');

        $totalAbandonedAmount = AbandonedCart::where('store_id', $storeId)
            ->whereIn('status', ['new', 'reminder_sent'])
            ->sum('cart_total');

        $recoveryRate = $total > 0 ? round(($recovered / $total) * 100, 1) : 0;

        return [
            'total' => $total,
            'new' => $new,
            'reminder_sent' => $reminderSent,
            'recovered' => $recovered,
            'expired' => $expired,
            'recovered_amount' => $recoveredAmount,
            'total_abandoned_amount' => $totalAbandonedAmount,
            'recovery_rate' => $recoveryRate,
        ];
    }
}
