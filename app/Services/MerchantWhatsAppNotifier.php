<?php

namespace App\Services;

use App\Models\Order;
use App\Models\StoreWhatsappIntegration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Merchant WhatsApp notifier — per-store integration.
 *
 * Each store has its own Meta Cloud API credentials (access_token, phone_number_id, waba_id).
 * Platform does NOT provide a central provider for merchant notifications.
 * Merchant only provides: credentials + notification recipient phone + enabled toggle.
 */
class MerchantWhatsAppNotifier
{
    public function notify(Order $order): array
    {
        $store = $order->store;
        if (!$store) {
            Log::warning('Merchant WhatsApp skipped — no store', ['order_id' => $order->id]);
            return ['sent' => false, 'reason' => 'no_store', 'provider' => null];
        }

        $storeId = $store->id;

        // Idempotency
        $idempotencyKey = "merchant_whatsapp_{$storeId}_{$order->id}";
        if (Cache::has($idempotencyKey)) {
            Log::info('Merchant WhatsApp duplicate skipped (idempotent)', ['store_id' => $storeId, 'order_id' => $order->id]);
            return ['sent' => false, 'reason' => 'duplicate', 'provider' => null];
        }

        $integration = StoreWhatsappIntegration::where('store_id', $storeId)->first();

        if (!$integration) {
            Log::info('Merchant WhatsApp skipped — no integration', ['store_id' => $storeId, 'order_id' => $order->id]);
            return ['sent' => false, 'reason' => 'not_connected', 'provider' => null];
        }

        if (!$integration->is_enabled) {
            Log::info('Merchant WhatsApp not enabled for store', ['store_id' => $storeId, 'order_id' => $order->id]);
            return ['sent' => false, 'reason' => 'not_enabled', 'provider' => null];
        }

        if ($integration->connection_status !== 'connected') {
            Log::info('Merchant WhatsApp not connected', ['store_id' => $storeId, 'order_id' => $order->id, 'status' => $integration->connection_status]);
            return ['sent' => false, 'reason' => 'not_connected', 'provider' => $integration->provider];
        }

        $recipient = $integration->notification_phone ?: $integration->business_phone;
        $normalizedRecipient = $this->normalizeNumber($recipient);
        if (!$normalizedRecipient) {
            Log::warning('Merchant WhatsApp recipient invalid', ['store_id' => $storeId, 'order_id' => $order->id]);
            return ['sent' => false, 'reason' => 'invalid_number', 'provider' => $integration->provider];
        }

        $token = $integration->access_token;
        $phoneNumberId = $integration->phone_number_id;

        if (!$token || !$phoneNumberId) {
            Log::warning('Merchant WhatsApp credentials incomplete', ['store_id' => $storeId, 'order_id' => $order->id]);
            return ['sent' => false, 'reason' => 'incomplete_config', 'provider' => $integration->provider];
        }

        $message = $this->buildMerchantMessage($order);

        try {
            $sent = $integration->provider === 'twilio'
                ? $this->sendViaTwilio($normalizedRecipient, $message, $integration)
                : $this->sendViaMeta($normalizedRecipient, $message, $integration);

            if ($sent) {
                Cache::put($idempotencyKey, true, 86400);
                $masked = PhoneNormalizer::mask($normalizedRecipient);
                Log::info('Merchant WhatsApp sent', ['store_id' => $storeId, 'order_id' => $order->id, 'provider' => $integration->provider, 'masked' => $masked, 'message_id' => $sent['message_id'] ?? null]);
                return ['sent' => true, 'reason' => 'sent', 'provider' => $integration->provider, 'message_id' => $sent['message_id'] ?? null];
            }

            Log::warning('Merchant WhatsApp provider returned failure', ['store_id' => $storeId, 'order_id' => $order->id, 'provider' => $integration->provider]);
            return ['sent' => false, 'reason' => 'provider_error', 'provider' => $integration->provider];
        } catch (\Throwable $e) {
            Log::error('Merchant WhatsApp exception (order not rolled back)', [
                'store_id' => $storeId,
                'order_id' => $order->id,
                'provider' => $integration->provider,
                'error' => $e->getMessage(),
            ]);
            return ['sent' => false, 'reason' => 'exception', 'provider' => $integration->provider];
        }
    }

    public function sendTestMessage(int $userId, int $storeId): array
    {
        $integration = StoreWhatsappIntegration::where('store_id', $storeId)->first();
        if (!$integration) {
            return ['sent' => false, 'reason' => 'not_connected', 'message' => 'لم يتم ربط واتساب بعد'];
        }
        if (!$integration->is_enabled) {
            return ['sent' => false, 'reason' => 'not_enabled', 'message' => 'إشعارات واتساب غير مفعلة'];
        }
        if ($integration->connection_status !== 'connected') {
            return ['sent' => false, 'reason' => 'not_connected', 'message' => 'حالة الاتصال غير متصلة — اختبر الاتصال أولاً'];
        }

        $recipient = $integration->notification_phone ?: $integration->business_phone;
        $normalized = $this->normalizeNumber($recipient);
        if (!$normalized) {
            return ['sent' => false, 'reason' => 'invalid_number', 'message' => 'رقم الاستقبال غير صالح'];
        }

        $token = $integration->access_token;
        $phoneNumberId = $integration->phone_number_id;
        if (!$token || !$phoneNumberId) {
            return ['sent' => false, 'reason' => 'incomplete_config', 'message' => 'إعداد واتساب غير مكتمل'];
        }

        $message = "هذه رسالة اختبار من وصول. إشعارات الطلبات تعمل بنجاح ✅";

        try {
            $sent = $integration->provider === 'twilio'
                ? $this->sendViaTwilio($normalized, $message, $integration)
                : $this->sendViaMeta($normalized, $message, $integration);

            if ($sent) {
                Log::info('Merchant WhatsApp test sent', ['store_id' => $storeId, 'masked' => PhoneNormalizer::mask($normalized)]);
                return ['sent' => true, 'reason' => 'sent', 'provider' => $integration->provider, 'message' => 'تم إرسال رسالة الاختبار'];
            }
            return ['sent' => false, 'reason' => 'provider_error', 'message' => 'تعذر إرسال رسالة الاختبار'];
        } catch (\Throwable $e) {
            Log::error('Merchant WhatsApp test exception', ['store_id' => $storeId, 'error' => $e->getMessage()]);
            return ['sent' => false, 'reason' => 'exception', 'message' => 'تعذر إرسال رسالة الاختبار'];
        }
    }

    public function verifyConnection(StoreWhatsappIntegration $integration): array
    {
        $token = $integration->access_token;
        $phoneNumberId = $integration->phone_number_id;

        if (!$token || !$phoneNumberId) {
            return ['connected' => false, 'error' => 'بيانات الاعتماد ناقصة'];
        }

        try {
            // Verify by fetching phone number details from Meta
            $url = "https://graph.facebook.com/v18.0/{$phoneNumberId}?fields=display_phone_number,verified_name";
            $response = \Illuminate\Support\Facades\Http::withToken($token)->get($url);

            if ($response->successful()) {
                $data = $response->json();
                $integration->update([
                    'connection_status' => 'connected',
                    'last_verified_at' => now(),
                    'last_error' => null,
                ]);
                return ['connected' => true, 'data' => $data];
            }

            $error = $response->json()['error']['message'] ?? $response->body();
            $integration->update([
                'connection_status' => 'error',
                'last_error' => substr($error, 0, 500),
            ]);
            return ['connected' => false, 'error' => $error];
        } catch (\Throwable $e) {
            $integration->update([
                'connection_status' => 'error',
                'last_error' => substr($e->getMessage(), 0, 500),
            ]);
            return ['connected' => false, 'error' => $e->getMessage()];
        }
    }

    // For UI status — per-store
    public function getStatusForStore(int $userId, int $storeId): array
    {
        $integration = StoreWhatsappIntegration::where('store_id', $storeId)->first();

        if (!$integration) {
            return [
                'is_enabled' => false,
                'has_number' => false,
                'has_integration' => false,
                'number_normalized' => null,
                'number_masked' => '',
                'business_phone_masked' => '',
                'provider' => null,
                'provider_status' => 'not_configured',
                'status' => 'not_connected',
                'status_key' => 'not_connected',
                'status_label' => 'غير مربوط',
                'badge' => 'gray',
                'is_ready' => false,
                'connection_status' => 'disconnected',
            ];
        }

        $recipient = $integration->notification_phone ?: $integration->business_phone;
        $normalized = $this->normalizeNumber($recipient);
        $businessMasked = $integration->business_phone ? PhoneNormalizer::mask(PhoneNormalizer::normalize($integration->business_phone) ?: $integration->business_phone) : '';
        $recipientMasked = $normalized ? PhoneNormalizer::mask($normalized) : '';

        if (!$integration->access_token || !$integration->phone_number_id) {
            return [
                'is_enabled' => (bool) $integration->is_enabled,
                'has_number' => !empty($normalized),
                'has_integration' => true,
                'number_normalized' => $normalized,
                'number_masked' => $recipientMasked,
                'business_phone_masked' => $businessMasked,
                'provider' => $integration->provider,
                'provider_status' => 'incomplete',
                'status' => 'incomplete',
                'status_key' => 'incomplete',
                'status_label' => 'يحتاج إعداد',
                'badge' => 'amber',
                'is_ready' => false,
                'connection_status' => $integration->connection_status,
            ];
        }

        if ($integration->connection_status !== 'connected') {
            $label = $integration->connection_status === 'error' ? 'خطأ في الاتصال' : ($integration->is_enabled ? 'غير متصل' : 'متوقف');
            return [
                'is_enabled' => (bool) $integration->is_enabled,
                'has_number' => !empty($normalized),
                'has_integration' => true,
                'number_normalized' => $normalized,
                'number_masked' => $recipientMasked,
                'business_phone_masked' => $businessMasked,
                'provider' => $integration->provider,
                'provider_status' => $integration->connection_status,
                'status' => $integration->connection_status,
                'status_key' => $integration->connection_status,
                'status_label' => $label,
                'badge' => $integration->connection_status === 'error' ? 'red' : 'gray',
                'is_ready' => false,
                'connection_status' => $integration->connection_status,
                'last_verified_at' => $integration->last_verified_at,
                'last_error' => $integration->last_error,
            ];
        }

        if (!$integration->is_enabled) {
            return [
                'is_enabled' => false,
                'has_number' => !empty($normalized),
                'has_integration' => true,
                'number_normalized' => $normalized,
                'number_masked' => $recipientMasked,
                'business_phone_masked' => $businessMasked,
                'provider' => $integration->provider,
                'provider_status' => 'connected',
                'status' => 'disabled',
                'status_key' => 'disabled',
                'status_label' => 'متوقف',
                'badge' => 'gray',
                'is_ready' => false,
                'connection_status' => 'connected',
            ];
        }

        return [
            'is_enabled' => true,
            'has_number' => !empty($normalized),
            'has_integration' => true,
            'number_normalized' => $normalized,
            'number_masked' => $recipientMasked,
            'business_phone_masked' => $businessMasked,
            'provider' => $integration->provider,
            'provider_status' => 'ready',
            'status' => 'connected',
            'status_key' => 'connected',
            'status_label' => 'متصل',
            'badge' => 'green',
            'is_ready' => true,
            'connection_status' => 'connected',
            'last_verified_at' => $integration->last_verified_at,
        ];
    }

    // Legacy method for backward compatibility (platform provider) — now delegates to per-store
    public function detectProvider(): ?string
    {
        // For per-store, we don't use platform provider; return null to indicate per-store
        // But keep for UI that checks platform provider
        $explicit = strtolower(trim((string) config('services.whatsapp.provider', env('WHATSAPP_PROVIDER', ''))));
        if (in_array($explicit, ['twilio', 'meta'], true)) {
            if ($explicit === 'twilio' && (config('services.whatsapp.twilio_sid') || env('TWILIO_SID'))) return 'twilio';
            if ($explicit === 'meta' && (config('services.whatsapp.cloud_token') || env('WHATSAPP_CLOUD_TOKEN'))) return 'meta';
        }
        return null;
    }

    public function detectProviderStatus(): string
    {
        $provider = $this->detectProvider();
        if ($provider) return 'ready';
        $hasAny = config('services.whatsapp.cloud_token') || env('WHATSAPP_CLOUD_TOKEN') || config('services.whatsapp.twilio_sid') || env('TWILIO_SID');
        return $hasAny ? 'incomplete' : 'not_configured';
    }

    private function buildMerchantMessage(Order $order): string
    {
        $customer = trim($order->customer_first_name . ' ' . $order->customer_last_name);
        $store = $order->store;
        $total = number_format((float) $order->total_amount, 2);
        $payment = $this->formatPaymentMethod($order->payment_method);
        $shipping = $order->shippingMethod ? $order->shippingMethod->name : 'غير محدد';
        $orderUrl = $this->getMerchantOrderUrl($order);

        return "🔔 طلب جديد على متجرك\n\n"
            . "المتجر: {$store->name}\n"
            . "رقم الطلب: #{$order->order_number}\n"
            . "العميل: {$customer}\n"
            . "الهاتف: {$order->customer_phone}\n"
            . "الإجمالي: {$total} ₪\n"
            . "طريقة الدفع: {$payment}\n"
            . "طريقة التوصيل: {$shipping}\n\n"
            . "مراجعة الطلب:\n{$orderUrl}";
    }

    private function formatPaymentMethod(string $method): string
    {
        $map = [
            'cod' => 'الدفع عند الاستلام',
            'bank' => 'تحويل بنكي',
            'whatsapp' => 'واتساب',
            'stripe' => 'بطاقة',
            'paypal' => 'PayPal',
        ];
        return $map[$method] ?? ucfirst(str_replace('_', ' ', $method));
    }

    private function getMerchantOrderUrl(Order $order): string
    {
        try {
            return route('orders.show', $order->id, true);
        } catch (\Throwable $e) {
            return config('app.url') . "/orders/{$order->id}";
        }
    }

    private function normalizeNumber(?string $number): ?string
    {
        if (!$number) return null;
        return PhoneNormalizer::normalize($number);
    }

    private function sendViaTwilio(string $to, string $message, StoreWhatsappIntegration $integration): array|bool
    {
        // For per-store twilio, use integration's token (if stored) or fallback to env
        $sid = $integration->access_token ? explode(':', $integration->access_token)[0] ?? null : null;
        // For simplicity, per-store twilio not fully implemented; use env fallback
        $sid = config('services.whatsapp.twilio_sid') ?: env('TWILIO_SID');
        $token = config('services.whatsapp.twilio_token') ?: env('TWILIO_AUTH_TOKEN');
        $from = config('services.whatsapp.twilio_from') ?: env('TWILIO_WHATSAPP_FROM');
        if (!$sid || !$token || !$from) return false;

        $url = "https://api.twilio.com/2010-04-01/Accounts/{$sid}/Messages.json";
        $response = \Illuminate\Support\Facades\Http::withBasicAuth($sid, $token)
            ->asForm()
            ->post($url, [
                'From' => str_starts_with($from, 'whatsapp:') ? $from : "whatsapp:{$from}",
                'To' => "whatsapp:{$to}",
                'Body' => $message,
            ]);

        if ($response->successful()) {
            $data = $response->json();
            return ['sent' => true, 'message_id' => $data['sid'] ?? null];
        }
        return false;
    }

    private function sendViaMeta(string $to, string $message, StoreWhatsappIntegration $integration): array|bool
    {
        $token = $integration->access_token;
        $phoneId = $integration->phone_number_id;
        if (!$token || !$phoneId) return false;

        $toClean = ltrim($to, '+');
        $url = "https://graph.facebook.com/v18.0/{$phoneId}/messages";

        // Try plain text first
        $response = \Illuminate\Support\Facades\Http::withToken($token)
            ->post($url, [
                'messaging_product' => 'whatsapp',
                'to' => $toClean,
                'type' => 'text',
                'text' => ['body' => $message],
            ]);

        if ($response->successful()) {
            $data = $response->json();
            $messageId = $data['messages'][0]['id'] ?? null;
            return ['sent' => true, 'message_id' => $messageId];
        }

        // If Meta requires template, try to fallback to template if configured
        $error = $response->json()['error']['message'] ?? '';
        if (str_contains(strtolower($error), 'template')) {
            // Attempt to send as template (merchant_new_order) if available
            $templateResponse = \Illuminate\Support\Facades\Http::withToken($token)
                ->post($url, [
                    'messaging_product' => 'whatsapp',
                    'to' => $toClean,
                    'type' => 'template',
                    'template' => [
                        'name' => 'merchant_new_order',
                        'language' => ['code' => 'ar'],
                        'components' => [
                            [
                                'type' => 'body',
                                'parameters' => [
                                    ['type' => 'text', 'text' => $message],
                                ],
                            ],
                        ],
                    ],
                ]);
            if ($templateResponse->successful()) {
                $data = $templateResponse->json();
                $messageId = $data['messages'][0]['id'] ?? null;
                return ['sent' => true, 'message_id' => $messageId];
            }
        }

        \Illuminate\Support\Facades\Log::warning('Meta WhatsApp failed', ['status' => $response->status(), 'body' => $response->body()]);
        return false;
    }
}
