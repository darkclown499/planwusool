<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Log;

/**
 * Merchant WhatsApp notifier — orders → merchant WhatsApp.
 *
 * Truth: the platform does NOT have a Meta/Twilio WhatsApp Cloud API
 * integration configured by default. It stores the merchant's WhatsApp number
 * (is_whatsapp_enabled + whatsapp_number in PaymentSettings) and for
 * payment_method=whatsapp builds a wa.me redirect for the CUSTOMER.
 *
 * This service adds a best-effort merchant-side notification on EVERY order:
 *  - Always creates an internal MerchantNotification (DB bell) via
 *    MerchantNotificationService::orderCreated (handled separately).
 *  - Attempts to send a WhatsApp message to the merchant if a real provider is
 *    configured (env WHATSAPP_PROVIDER = twilio|meta + credentials). When no
 *    provider exists it logs a clear diagnostic so the merchant/admin can see
 *    that WhatsApp delivery is NOT configured rather than silently "connected".
 *
 * Failure to send WhatsApp NEVER rolls back the order. All errors are caught
 * and logged without exposing secrets.
 */
class MerchantWhatsAppNotifier
{
    /**
     * Attempt to notify the merchant about a new order via WhatsApp.
     *
     * Returns array with status for logging/UI diagnostics:
     *  - sent: bool
     *  - reason: string (sent|not_configured|no_provider|provider_error|exception)
     *  - provider: string|null
     */
    public function notify(Order $order): array
    {
        $store = $order->store;
        if (!$store) {
            Log::warning('Merchant WhatsApp skipped — no store', ['order_id' => $order->id]);
            return ['sent' => false, 'reason' => 'no_store', 'provider' => null];
        }

        $userId = $store->user_id;
        $storeId = $store->id;

        // Merchant's configured WhatsApp number (the one they think will receive notifications)
        $isEnabled = (bool) getSetting('is_whatsapp_enabled', false, $userId, $storeId);
        $rawNumber = (string) getSetting('whatsapp_number', '', $userId, $storeId);

        $cleanMerchant = $this->cleanNumber($rawNumber);

        if (!$isEnabled) {
            Log::info('Merchant WhatsApp not enabled for store', ['store_id' => $storeId, 'order_id' => $order->id]);
            return ['sent' => false, 'reason' => 'not_enabled', 'provider' => null];
        }
        if (!$cleanMerchant) {
            Log::warning('Merchant WhatsApp number missing/invalid', ['store_id' => $storeId, 'order_id' => $order->id, 'has_number' => !empty($rawNumber)]);
            return ['sent' => false, 'reason' => 'invalid_number', 'provider' => null];
        }

        // Determine provider: explicit env config, otherwise no real sending capability
        $provider = $this->detectProvider();

        if (!$provider) {
            // No API provider — we still log and return so UI can show "رقم محفوظ — إشعارات WhatsApp غير مفعلة (لا يوجد مزود API)"
            Log::info('Merchant WhatsApp skipped — no provider configured (wa.me only). Merchant notification remains as DB bell.', [
                'store_id' => $storeId,
                'order_id' => $order->id,
                'merchant_clean' => substr($cleanMerchant, 0, 4) . str_repeat('*', max(0, strlen($cleanMerchant) - 4)),
            ]);
            return ['sent' => false, 'reason' => 'no_provider', 'provider' => null];
        }

        $message = $this->buildMerchantMessage($order);

        try {
            $sent = match ($provider) {
                'twilio' => $this->sendViaTwilio($cleanMerchant, $message),
                'meta' => $this->sendViaMeta($cleanMerchant, $message),
                default => false,
            };

            if ($sent) {
                Log::info('Merchant WhatsApp sent', ['store_id' => $storeId, 'order_id' => $order->id, 'provider' => $provider]);
                return ['sent' => true, 'reason' => 'sent', 'provider' => $provider];
            }

            Log::warning('Merchant WhatsApp provider returned failure', ['store_id' => $storeId, 'order_id' => $order->id, 'provider' => $provider]);
            return ['sent' => false, 'reason' => 'provider_error', 'provider' => $provider];
        } catch (\Throwable $e) {
            Log::error('Merchant WhatsApp exception (order not rolled back)', [
                'store_id' => $storeId,
                'order_id' => $order->id,
                'provider' => $provider,
                'error' => $e->getMessage(),
            ]);
            return ['sent' => false, 'reason' => 'exception', 'provider' => $provider];
        }
    }

    /**
     * Detect configured provider from env / config.
     * Valid providers: twilio (TWILIO_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM)
     *                  meta   (WHATSAPP_CLOUD_TOKEN + WHATSAPP_PHONE_NUMBER_ID)
     */
    public function detectProvider(): ?string
    {
        $explicit = strtolower(trim((string) env('WHATSAPP_PROVIDER', config('services.whatsapp.provider', ''))));
        if (in_array($explicit, ['twilio', 'meta'], true)) {
            if ($explicit === 'twilio' && env('TWILIO_SID') && env('TWILIO_AUTH_TOKEN')) return 'twilio';
            if ($explicit === 'meta' && env('WHATSAPP_CLOUD_TOKEN') && env('WHATSAPP_PHONE_NUMBER_ID')) return 'meta';
            // explicit set but creds missing => no provider
            return null;
        }
        // auto-detect
        if (env('TWILIO_SID') && env('TWILIO_AUTH_TOKEN') && env('TWILIO_WHATSAPP_FROM')) return 'twilio';
        if (env('WHATSAPP_CLOUD_TOKEN') && env('WHATSAPP_PHONE_NUMBER_ID')) return 'meta';
        return null;
    }

    public function getStatusForStore(int $userId, int $storeId): array
    {
        $isEnabled = (bool) getSetting('is_whatsapp_enabled', false, $userId, $storeId);
        $rawNumber = (string) getSetting('whatsapp_number', '', $userId, $storeId);
        $clean = $this->cleanNumber($rawNumber);
        $provider = $this->detectProvider();

        return [
            'is_enabled' => $isEnabled,
            'has_number' => !empty($clean),
            'number_normalized' => $clean ? substr($clean, 0, 4) . str_repeat('*', max(0, strlen($clean) - 4)) : '',
            'provider' => $provider,
            // Three honest states UI should display:
            // saved_only | enabled_but_no_provider | fully_configured
            'status' => !$isEnabled || !$clean ? 'not_configured' : (!$provider ? 'enabled_but_no_provider' : 'fully_configured'),
            'status_label' => !$isEnabled || !$clean
                ? 'رقم WhatsApp غير محفوظ'
                : (!$provider ? 'رقم محفوظ — إشعارات WhatsApp التلقائية غير مفعلة (لا يوجد مزود API)' : 'إشعارات WhatsApp مفعلة'),
        ];
    }

    private function buildMerchantMessage(Order $order): string
    {
        $customer = trim($order->customer_first_name . ' ' . $order->customer_last_name);
        $store = $order->store;
        $total = number_format($order->total_amount, 2);
        $items = $order->items->map(fn($i) => $i->product_name . ' x' . $i->quantity)->implode(', ');
        return "طلب جديد #{$order->order_number} في متجر {$store->name}\nالعميل: {$customer}\nالمبلغ: {$total}\nالمنتجات: {$items}\nراجع لوحة التحكم للتفاصيل.";
    }

    private function cleanNumber(string $number): ?string
    {
        $cleaned = preg_replace('/[^0-9]/', '', $number);
        return (strlen($cleaned) >= 10 && strlen($cleaned) <= 15) ? $cleaned : null;
    }

    private function sendViaTwilio(string $to, string $message): bool
    {
        $sid = env('TWILIO_SID');
        $token = env('TWILIO_AUTH_TOKEN');
        $from = env('TWILIO_WHATSAPP_FROM'); // e.g. whatsapp:+14155238886
        if (!$sid || !$token || !$from) return false;

        $url = "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";
        $response = \Illuminate\Support\Facades\Http::withBasicAuth($sid, $token)
            ->asForm()
            ->post($url, [
                'From' => str_starts_with($from, 'whatsapp:') ? $from : "whatsapp:{$from}",
                'To' => "whatsapp:+{$to}",
                'Body' => $message,
            ]);

        return $response->successful();
    }

    private function sendViaMeta(string $to, string $message): bool
    {
        $token = env('WHATSAPP_CLOUD_TOKEN');
        $phoneId = env('WHATSAPP_PHONE_NUMBER_ID');
        if (!$token || !$phoneId) return false;

        // For merchant notifications we use a plain text message (no template).
        // Note: Meta requires approved templates for outbound outside 24h window;
        // this will succeed only when the recipient has opted in / recent contact.
        $url = "https://graph.facebook.com/v18.0/{$phoneId}/messages";
        $response = \Illuminate\Support\Facades\Http::withToken($token)
            ->post($url, [
                'messaging_product' => 'whatsapp',
                'to' => $to,
                'type' => 'text',
                'text' => ['body' => $message],
            ]);

        return $response->successful();
    }
}
