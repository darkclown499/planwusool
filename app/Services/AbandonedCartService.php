<?php

namespace App\Services;

use App\Models\AbandonedCart;
use App\Models\Store;
use App\Models\CartItem;
use App\Services\WhatsAppService;
use App\Services\HotsmsService;
use Illuminate\Support\Facades\Log;

class AbandonedCartService
{
    /**
     * Track or update an abandoned cart (draft capture).
     * Ensures recovery_token is generated for /checkout?recover_token flow.
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
            $update = [
                'customer_id' => $customerId ?: $cart->customer_id,
                'customer_email' => $customerEmail ?: $cart->customer_email,
                'customer_phone' => $customerPhone ?: $cart->customer_phone,
                'customer_name' => $customerName ?: $cart->customer_name,
                'cart_items' => $cartItems,
                'cart_total' => $cartTotal,
                'last_activity_at' => now(),
            ];
            if (empty($cart->recovery_token)) {
                $update['recovery_token'] = bin2hex(random_bytes(32));
                $update['expires_at'] = now()->addDays(7);
            }
            $cart->update($update);
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
                'status' => 'draft',
                'recovery_token' => bin2hex(random_bytes(32)),
                'expires_at' => now()->addDays(7),
            ]);
        }

        return $cart;
    }

    /**
     * Scheduled worker: mark draft carts as ABANDONED if idle >30 minutes.
     * Runs every 15 minutes, generates recovery token & triggers WhatsApp automation.
     */
    public function markStaleDraftsAsAbandoned(int $minutes = 30): int
    {
        $cutoff = now()->subMinutes($minutes);
        $carts = AbandonedCart::whereIn('status', ['new', 'draft'])
            ->where('last_activity_at', '<=', $cutoff)
            ->where(function ($q) {
                $q->whereNotNull('customer_email')->orWhereNotNull('customer_phone');
            })
            ->get();

        $count = 0;
        foreach ($carts as $cart) {
            if (empty($cart->recovery_token)) {
                $cart->recovery_token = bin2hex(random_bytes(32));
                $cart->expires_at = now()->addDays(7);
            }
            $cart->update([
                'status' => 'abandoned',
                'abandoned_at' => now(),
                'recovery_token' => $cart->recovery_token,
                'expires_at' => $cart->expires_at,
            ]);
            $count++;
            $this->triggerAbandonedAutomation($cart);
        }

        return $count;
    }

    protected function triggerAbandonedAutomation(AbandonedCart $cart): void
    {
        try {
            $store = Store::find($cart->store_id);
            if (!$store || !$store->user) return;
            $settings = \App\Models\Setting::getUserSettings($store->user->id, $cart->store_id);
            $autoEnabled = $settings['abandoned_cart_automation'] ?? $settings['whatsapp_automation'] ?? $settings['hotsms_automation'] ?? true;
            if ($autoEnabled === false || $autoEnabled === 'off' || $autoEnabled === 0 || $autoEnabled === '0') {
                return;
            }
            $hasPhone = !empty($cart->customer_phone);
            if ($hasPhone && $this->canSendWhatsApp($cart->store_id)) {
                $token = $cart->recovery_token ?: $cart->ensureRecoveryToken();
                $recoverUrl = url('/checkout?recover_token=' . $token);
                $message = "مرحباً! تركت منتجات في سلتك\nأكمل طلبك الآن: {$recoverUrl}\nالمجموع: " . number_format($cart->cart_total, 2);
                try {
                    $whatsappService = app(WhatsAppService::class);
                    $whatsappService->sendMessage($cart->customer_phone, $message);
                } catch (\Throwable $e) {
                    try {
                        $smsService = app(HotsmsService::class);
                        if (method_exists($smsService, 'sendSms')) {
                            $smsService->sendSms($cart->customer_phone, $message);
                        }
                    } catch (\Throwable $ee) {
                        Log::warning('Abandoned automation fallback failed', ['cart_id' => $cart->id, 'error' => $ee->getMessage()]);
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::error('Abandoned automation trigger failed: ' . $e->getMessage(), ['cart_id' => $cart->id]);
        }
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
     *
     * @return array{success: bool, message: string}
     */
    public function sendReminder(AbandonedCart $cart): array
    {
        try {
            $hasEmail = !empty($cart->customer_email);
            $hasPhone = !empty($cart->customer_phone);

            if (!$hasEmail && !$hasPhone) {
                return ['success' => false, 'message' => 'لا توجد وسيلة تواصل متاحة لهذه السلة.'];
            }

            $itemsSummary = '';
            $items = is_array($cart->cart_items) ? $cart->cart_items : [];
            foreach ($items as $item) {
                $itemName = $item['name'] ?? 'منتج';
                $itemQty = $item['quantity'] ?? 1;
                $itemsSummary .= "- {$itemName} x{$itemQty}\n";
            }

            $message = "مرحباً! تركت منتجات في سلتك:\n\n{$itemsSummary}\n"
                . "لا تفوت الفرصة! أكمل طلبك الآن.\n"
                . "المجموع: " . number_format($cart->cart_total, 2);

            $whatsappSent = false;
            $emailSent = false;

            if ($hasPhone && $this->canSendWhatsApp($cart->store_id)) {
                try {
                    $whatsappService = app(WhatsAppService::class);
                    $whatsappService->sendMessage($cart->customer_phone, $message);
                    $whatsappSent = true;
                } catch (\Throwable $e) {
                    Log::error('Abandoned cart WhatsApp reminder failed: ' . $e->getMessage(), [
                        'cart_id' => $cart->id,
                        'store_id' => $cart->store_id,
                    ]);
                }
            }

            if ($hasEmail) {
                try {
                    $store = $cart->store;
                    $storeName = $store->name ?? 'المتجر';
                    \Mail::to($cart->customer_email)->send(new \App\Mail\AbandonedCartReminderMail($cart));
                    $emailSent = true;
                } catch (\Throwable $e) {
                    Log::error('Abandoned cart email reminder failed: ' . $e->getMessage(), [
                        'cart_id' => $cart->id,
                        'store_id' => $cart->store_id,
                    ]);
                }
            }

            if (!$whatsappSent && !$emailSent) {
                return ['success' => false, 'message' => 'تعذر إرسال التذكير. تحقق من إعدادات التواصل.'];
            }

            $cart->update([
                'status' => 'reminder_sent',
                'reminder_sent_at' => now(),
                'reminder_count' => $cart->reminder_count + 1,
            ]);

            $sentVia = [];
            if ($whatsappSent) $sentVia[] = 'واتساب';
            if ($emailSent) $sentVia[] = 'البريد الإلكتروني';

            return ['success' => true, 'message' => 'تم إرسال التذكير بنجاح عبر ' . implode(' و ', $sentVia) . '.'];
        } catch (\Throwable $e) {
            Log::error('Abandoned cart reminder failed: ' . $e->getMessage(), [
                'cart_id' => $cart->id,
                'store_id' => $cart->store_id,
            ]);
            return ['success' => false, 'message' => 'حدث خطأ أثناء إرسال التذكير.'];
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
        } catch (\Throwable $e) {
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
        $draft = AbandonedCart::where('store_id', $storeId)->where('status', 'draft')->count();
        $abandoned = AbandonedCart::where('store_id', $storeId)->where('status', 'abandoned')->count();
        $reminderSent = AbandonedCart::where('store_id', $storeId)->where('status', 'reminder_sent')->count();
        $recovered = AbandonedCart::where('store_id', $storeId)->where('status', 'recovered')->count();
        $expired = AbandonedCart::where('store_id', $storeId)->where('status', 'expired')->count();

        $recoveredAmount = AbandonedCart::where('store_id', $storeId)
            ->where('status', 'recovered')
            ->sum('cart_total');

        $totalAbandonedAmount = AbandonedCart::where('store_id', $storeId)
            ->whereIn('status', ['new', 'draft', 'abandoned', 'reminder_sent'])
            ->sum('cart_total');

        $pendingCount = $new + $draft + $abandoned + $reminderSent;
        $recoveryRate = $total > 0 ? round(($recovered / $total) * 100, 1) : 0;

        return [
            'total' => $total,
            'new' => $new,
            'draft' => $draft,
            'abandoned' => $abandoned,
            'reminder_sent' => $reminderSent,
            'recovered' => $recovered,
            'expired' => $expired,
            'pending' => $pendingCount,
            'recovered_amount' => $recoveredAmount,
            'total_abandoned_amount' => $totalAbandonedAmount,
            'recovery_rate' => $recoveryRate,
        ];
    }
}
