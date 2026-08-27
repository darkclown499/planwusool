<?php

namespace App\Services;

use App\Jobs\SendAbandonedCartWhatsAppNotification;
use App\Models\AbandonedCart;
use App\Models\Store;
use App\Models\StoreWhatsappIntegration;
use Illuminate\Support\Facades\Log;

class AbandonedCartService
{
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
            $affected = AbandonedCart::where('id', $cart->id)
                ->whereIn('status', ['new', 'draft'])
                ->update([
                    'status' => 'abandoned',
                    'abandoned_at' => now(),
                    'recovery_token' => $cart->recovery_token,
                    'expires_at' => $cart->expires_at,
                ]);
            if ($affected === 0) continue;
            $count++;
            $cart->refresh();
            $this->triggerAbandonedAutomation($cart);
        }
        return $count;
    }
    protected function triggerAbandonedAutomation(AbandonedCart $cart): void
    {
        try {
            $store = Store::find($cart->store_id);
            if (!$store || !$store->user) return;
            if (!empty($cart->whatsapp_message_id) || in_array($cart->whatsapp_status, ['sent','delivered','read'], true)) {
                return;
            }
            $settings = \App\Models\Setting::getUserSettings($store->user->id, $cart->store_id);
            $autoEnabled = $settings['abandoned_cart_automation'] ?? $settings['whatsapp_automation'] ?? $settings['hotsms_automation'] ?? true;
            if ($autoEnabled === false || $autoEnabled === 'off' || $autoEnabled === 0 || $autoEnabled === '0') {
                return;
            }
            $hasPhone = !empty($cart->customer_phone);
            if (!$hasPhone) return;
            if (!$this->canSendWhatsApp($cart->store_id)) {
                Log::info('Abandoned automation skipped — store WhatsApp not configured', ['cart_id' => $cart->id, 'store_id' => $cart->store_id]);
                return;
            }
            SendAbandonedCartWhatsAppNotification::dispatch($cart->id)->onQueue(config('services.whatsapp.queue', 'notifications'))->afterCommit();
        } catch (\Throwable $e) {
            Log::error('Abandoned automation trigger failed: ' . $e->getMessage(), ['cart_id' => $cart->id]);
        }
    }
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
    public function getCartsPendingReminder(int $storeId, int $hours = 24)
    {
        return AbandonedCart::pendingReminder($storeId, $hours)
            ->orderBy('last_activity_at', 'asc')
            ->get();
    }
    public function sendReminder(AbandonedCart $cart): array
    {
        try {
            $hasEmail = !empty($cart->customer_email);
            $hasPhone = !empty($cart->customer_phone);
            if (!$hasEmail && !$hasPhone) {
                return ['success' => false, 'message' => 'لا توجد وسيلة تواصل متاحة لهذه السلة.'];
            }
            if (!empty($cart->whatsapp_message_id) && in_array($cart->whatsapp_status, ['sent','delivered','read'], true)) {
                return ['success' => false, 'message' => 'تم إرسال التذكير مسبقاً.'];
            }
            if ($cart->reminder_sent_at && $cart->reminder_sent_at->gt(now()->subHours(23))) {
                $hasPhone = false;
            }
            $whatsappQueued = false;
            $emailSent = false;
            if ($hasPhone && $this->canSendWhatsApp($cart->store_id)) {
                $normalized = \App\Services\PhoneNormalizer::normalize($cart->customer_phone);
                if ($normalized) {
                    SendAbandonedCartWhatsAppNotification::dispatch($cart->id)->onQueue(config('services.whatsapp.queue', 'notifications'))->afterCommit();
                    $whatsappQueued = true;
                }
            } elseif ($hasPhone) {
                Log::info('Abandoned cart WhatsApp not configured for store', ['cart_id' => $cart->id, 'store_id' => $cart->store_id]);
            }
            if ($hasEmail) {
                try {
                    \Mail::to($cart->customer_email)->send(new \App\Mail\AbandonedCartReminderMail($cart));
                    $emailSent = true;
                } catch (\Throwable $e) {
                    Log::error('Abandoned cart email reminder failed: ' . $e->getMessage(), [
                        'cart_id' => $cart->id,
                        'store_id' => $cart->store_id,
                    ]);
                }
            }
            if (!$whatsappQueued && !$emailSent) {
                return ['success' => false, 'message' => 'تعذر إرسال التذكير. تحقق من إعدادات التواصل.'];
            }
            if ($emailSent) {
                $cart->update([
                    'status' => 'reminder_sent',
                    'reminder_sent_at' => now(),
                    'reminder_count' => $cart->reminder_count + 1,
                ]);
            } elseif ($whatsappQueued) {
                $cart->update([
                    'reminder_sent_at' => $cart->reminder_sent_at ?? now(),
                ]);
                if (empty($cart->whatsapp_status)) {
                    $cart->update(['whatsapp_status' => 'queued']);
                }
            }
            $sentVia = [];
            if ($whatsappQueued) $sentVia[] = 'واتساب (قيد الإرسال)';
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
    private function canSendWhatsApp(int $storeId): bool
    {
        try {
            $integration = StoreWhatsappIntegration::where('store_id', $storeId)->first();
            if (!$integration) return false;
            if (!$integration->is_enabled) return false;
            if ($integration->connection_status !== 'connected') return false;
            if (empty($integration->access_token) || empty($integration->phone_number_id)) return false;
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }
    public function getStats(int $storeId): array
    {
        $total = AbandonedCart::where('store_id', $storeId)->count();
        $new = AbandonedCart::where('store_id', $storeId)->where('status', 'new')->count();
        $draft = AbandonedCart::where('store_id', $storeId)->where('status', 'draft')->count();
        $abandoned = AbandonedCart::where('store_id', $storeId)->where('status', 'abandoned')->count();
        $reminderSent = AbandonedCart::where('store_id', $storeId)->where('status', 'reminder_sent')->count();
        $recovered = AbandonedCart::where('store_id', $storeId)->where('status', 'recovered')->count();
        $expired = AbandonedCart::where('store_id', $storeId)->where('status', 'expired')->count();
        $recoveredAmount = AbandonedCart::where('store_id', $storeId)->where('status', 'recovered')->sum('cart_total');
        $totalAbandonedAmount = AbandonedCart::where('store_id', $storeId)->whereIn('status', ['new', 'draft', 'abandoned', 'reminder_sent'])->sum('cart_total');
        $pendingCount = $new + $draft + $abandoned + $reminderSent;
        $recoveryRate = $total > 0 ? round(($recovered / $total) * 100, 1) : 0;
        return ['total'=>$total,'new'=>$new,'draft'=>$draft,'abandoned'=>$abandoned,'reminder_sent'=>$reminderSent,'recovered'=>$recovered,'expired'=>$expired,'pending'=>$pendingCount,'recovered_amount'=>$recoveredAmount,'total_abandoned_amount'=>$totalAbandonedAmount,'recovery_rate'=>$recoveryRate];
    }
}