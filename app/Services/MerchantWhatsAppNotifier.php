<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Merchant WhatsApp notifier — orders → merchant WhatsApp.
 *
 * Platform-level provider credentials (.env):
 *   WHATSAPP_PROVIDER=meta|twilio
 *   WHATSAPP_CLOUD_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID
 *   TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 *
 * Merchant-level (per store):
 *   is_whatsapp_enabled + whatsapp_number (via getSetting)
 *
 * Features:
 *  - Phone normalization to E.164 via PhoneNormalizer
 *  - 5 honest UI statuses
 *  - Idempotency: store_id + order_id + type
 *  - Non-blocking: never rolls back order
 *  - Correct store isolation (always uses order->store)
 *  - Arabic message with order link
 *  - Test message support
 *  - Secrets never exposed in logs/responses
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

        // Idempotency: prevent duplicate merchant notifications for same order
        $idempotencyKey = "merchant_whatsapp_{$store->id}_{$order->id}";
        if (Cache::has($idempotencyKey)) {
            Log::info('Merchant WhatsApp duplicate skipped (idempotent)', ['store_id' => $store->id, 'order_id' => $order->id]);
            return ['sent' => false, 'reason' => 'duplicate', 'provider' => null];
        }

        $userId = $store->user_id;
        $storeId = $store->id;

        $isEnabled = (bool) getSetting('is_whatsapp_enabled', false, $userId, $storeId);
        $rawNumber = (string) getSetting('whatsapp_number', '', $userId, $storeId);

        $normalized = $this->normalizeNumber($rawNumber);

        if (!$normalized) {
            Log::info('Merchant WhatsApp skipped — no number', ['store_id' => $storeId, 'order_id' => $order->id]);
            return ['sent' => false, 'reason' => 'no_number', 'provider' => null];
        }

        if (!$isEnabled) {
            Log::info('Merchant WhatsApp not enabled for store', ['store_id' => $storeId, 'order_id' => $order->id]);
            return ['sent' => false, 'reason' => 'not_enabled', 'provider' => null];
        }

        $provider = $this->detectProvider();
        $providerStatus = $this->detectProviderStatus();

        if (!$provider) {
            $reason = $providerStatus === 'incomplete' ? 'incomplete_config' : 'no_provider';
            Log::info('Merchant WhatsApp skipped — provider not ready', [
                'store_id' => $storeId,
                'order_id' => $order->id,
                'provider_status' => $providerStatus,
                'masked' => PhoneNormalizer::mask($normalized),
            ]);
            return ['sent' => false, 'reason' => $reason, 'provider' => null];
        }

        $message = $this->buildMerchantMessage($order);

        try {
            $sent = match ($provider) {
                'twilio' => $this->sendViaTwilio($normalized, $message),
                'meta' => $this->sendViaMeta($normalized, $message),
                default => false,
            };

            if ($sent) {
                // Mark as sent for idempotency (24h)
                Cache::put($idempotencyKey, true, 86400);
                Log::info('Merchant WhatsApp sent', ['store_id' => $storeId, 'order_id' => $order->id, 'provider' => $provider, 'masked' => PhoneNormalizer::mask($normalized)]);
                return ['sent' => true, 'reason' => 'sent', 'provider' => $provider, 'message_id' => $sent['message_id'] ?? null];
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

    public function sendTestMessage(int $userId, int $storeId): array
    {
        $rawNumber = (string) getSetting('whatsapp_number', '', $userId, $storeId);
        $isEnabled = (bool) getSetting('is_whatsapp_enabled', false, $userId, $storeId);
        $normalized = $this->normalizeNumber($rawNumber);

        if (!$normalized) {
            return ['sent' => false, 'reason' => 'no_number', 'message' => 'لم يتم إضافة رقم واتساب'];
        }
        if (!$isEnabled) {
            return ['sent' => false, 'reason' => 'not_enabled', 'message' => 'إشعارات واتساب غير مفعلة'];
        }

        $provider = $this->detectProvider();
        $providerStatus = $this->detectProviderStatus();

        if (!$provider) {
            if ($providerStatus === 'incomplete') {
                return ['sent' => false, 'reason' => 'incomplete_config', 'message' => 'إعداد خدمة واتساب غير مكتمل'];
            }
            return ['sent' => false, 'reason' => 'no_provider', 'message' => 'خدمة واتساب غير متاحة حالياً'];
        }

        $message = "هذه رسالة اختبار من وصول. إشعارات الطلبات تعمل بنجاح ✅";

        try {
            $sent = match ($provider) {
                'twilio' => $this->sendViaTwilio($normalized, $message),
                'meta' => $this->sendViaMeta($normalized, $message),
                default => false,
            };

            if ($sent) {
                Log::info('Merchant WhatsApp test sent', ['store_id' => $storeId, 'provider' => $provider, 'masked' => PhoneNormalizer::mask($normalized)]);
                return ['sent' => true, 'reason' => 'sent', 'provider' => $provider, 'message' => 'تم إرسال رسالة الاختبار'];
            }

            return ['sent' => false, 'reason' => 'provider_error', 'message' => 'تعذر إرسال رسالة الاختبار'];
        } catch (\Throwable $e) {
            Log::error('Merchant WhatsApp test exception', ['store_id' => $storeId, 'provider' => $provider, 'error' => $e->getMessage()]);
            return ['sent' => false, 'reason' => 'exception', 'message' => 'تعذر إرسال رسالة الاختبار'];
        }
    }

    public function detectProvider(): ?string
    {
        $explicit = strtolower(trim((string) config('services.whatsapp.provider', env('WHATSAPP_PROVIDER', ''))));
        if (in_array($explicit, ['twilio', 'meta'], true)) {
            if ($explicit === 'twilio' && config('services.whatsapp.twilio_sid') && config('services.whatsapp.twilio_token')) return 'twilio';
            if ($explicit === 'meta' && config('services.whatsapp.cloud_token') && config('services.whatsapp.phone_number_id')) return 'meta';
            return null;
        }
        if (config('services.whatsapp.twilio_sid') && config('services.whatsapp.twilio_token') && config('services.whatsapp.twilio_from')) return 'twilio';
        if (config('services.whatsapp.cloud_token') && config('services.whatsapp.phone_number_id')) return 'meta';
        // Fallback to env direct
        if (env('TWILIO_SID') && env('TWILIO_AUTH_TOKEN') && env('TWILIO_WHATSAPP_FROM')) return 'twilio';
        if (env('WHATSAPP_CLOUD_TOKEN') && env('WHATSAPP_PHONE_NUMBER_ID')) return 'meta';
        return null;
    }

    public function detectProviderStatus(): string
    {
        $provider = strtolower(trim((string) config('services.whatsapp.provider', env('WHATSAPP_PROVIDER', ''))));
        $hasExplicit = in_array($provider, ['twilio', 'meta'], true);

        $twilioSid = config('services.whatsapp.twilio_sid') ?: env('TWILIO_SID');
        $twilioToken = config('services.whatsapp.twilio_token') ?: env('TWILIO_AUTH_TOKEN');
        $twilioFrom = config('services.whatsapp.twilio_from') ?: env('TWILIO_WHATSAPP_FROM');
        $metaToken = config('services.whatsapp.cloud_token') ?: env('WHATSAPP_CLOUD_TOKEN');
        $metaPhoneId = config('services.whatsapp.phone_number_id') ?: env('WHATSAPP_PHONE_NUMBER_ID');

        if ($hasExplicit) {
            if ($provider === 'twilio' && (!$twilioSid || !$twilioToken || !$twilioFrom)) return 'incomplete';
            if ($provider === 'meta' && (!$metaToken || !$metaPhoneId)) return 'incomplete';
            if ($provider === 'twilio' && $twilioSid && $twilioToken) return 'ready';
            if ($provider === 'meta' && $metaToken && $metaPhoneId) return 'ready';
            return 'not_configured';
        }

        // Auto-detect
        if (($twilioSid && $twilioToken && $twilioFrom) || ($metaToken && $metaPhoneId)) {
            return 'ready';
        }
        // Check if partially configured
        if ($twilioSid || $twilioToken || $twilioFrom || $metaToken || $metaPhoneId) {
            return 'incomplete';
        }
        return 'not_configured';
    }

    public function getStatusForStore(int $userId, int $storeId): array
    {
        $isEnabled = (bool) getSetting('is_whatsapp_enabled', false, $userId, $storeId);
        $rawNumber = (string) getSetting('whatsapp_number', '', $userId, $storeId);
        $normalized = $this->normalizeNumber($rawNumber);
        $provider = $this->detectProvider();
        $providerStatus = $this->detectProviderStatus();

        // 5 honest states
        if (!$normalized) {
            return [
                'is_enabled' => $isEnabled,
                'has_number' => false,
                'number_normalized' => '',
                'number_masked' => '',
                'provider' => $provider,
                'provider_status' => $providerStatus,
                'status' => 'no_number',
                'status_key' => 'no_number',
                'status_label' => 'لم يتم إضافة رقم واتساب',
                'badge' => 'gray',
                'is_ready' => false,
            ];
        }

        if (!$isEnabled) {
            return [
                'is_enabled' => false,
                'has_number' => true,
                'number_normalized' => $normalized,
                'number_masked' => PhoneNormalizer::mask($normalized),
                'provider' => $provider,
                'provider_status' => $providerStatus,
                'status' => 'not_enabled',
                'status_key' => 'not_enabled',
                'status_label' => 'إشعارات واتساب غير مفعلة',
                'badge' => 'gray',
                'is_ready' => false,
            ];
        }

        // Enabled and has number, check provider
        if (!$provider) {
            if ($providerStatus === 'incomplete') {
                return [
                    'is_enabled' => true,
                    'has_number' => true,
                    'number_normalized' => $normalized,
                    'number_masked' => PhoneNormalizer::mask($normalized),
                    'provider' => null,
                    'provider_status' => 'incomplete',
                    'status' => 'incomplete_config',
                    'status_key' => 'incomplete_config',
                    'status_label' => 'إعداد خدمة واتساب غير مكتمل',
                    'badge' => 'amber',
                    'is_ready' => false,
                ];
            }
            return [
                'is_enabled' => true,
                'has_number' => true,
                'number_normalized' => $normalized,
                'number_masked' => PhoneNormalizer::mask($normalized),
                'provider' => null,
                'provider_status' => 'not_configured',
                'status' => 'no_provider',
                'status_key' => 'no_provider',
                'status_label' => 'خدمة واتساب غير متاحة حالياً',
                'badge' => 'amber',
                'is_ready' => false,
            ];
        }

        // Fully configured
        return [
            'is_enabled' => true,
            'has_number' => true,
            'number_normalized' => $normalized,
            'number_masked' => PhoneNormalizer::mask($normalized),
            'provider' => $provider,
            'provider_status' => 'ready',
            'status' => 'ready',
            'status_key' => 'ready',
            'status_label' => 'إشعارات واتساب مفعلة',
            'badge' => 'green',
            'is_ready' => true,
        ];
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
            . "راجع الطلب:\n{$orderUrl}";
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

    private function normalizeNumber(string $number): ?string
    {
        return PhoneNormalizer::normalize($number);
    }

    private function sendViaTwilio(string $to, string $message): array|bool
    {
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
        Log::warning('Twilio WhatsApp failed', ['status' => $response->status(), 'body' => $response->body()]);
        return false;
    }

    private function sendViaMeta(string $to, string $message): array|bool
    {
        $token = config('services.whatsapp.cloud_token') ?: env('WHATSAPP_CLOUD_TOKEN');
        $phoneId = config('services.whatsapp.phone_number_id') ?: env('WHATSAPP_PHONE_NUMBER_ID');
        if (!$token || !$phoneId) return false;

        // Remove + for Meta API (expects number without +)
        $toClean = ltrim($to, '+');
        $url = "https://graph.facebook.com/v18.0/{$phoneId}/messages";
        $response = \Illuminate\Support\Facades\Http::withToken($token)
            ->post($url, [
                'messaging_product' => 'whatsapp',
                'to' => $toClean,
                'type' => 'text',
                'text' => ['body' => $message],
            ]);

        if ($response->successful()) {
            $data = $response->json();
            $messageId = $data['messages'][0]['id'] ?? $data['messages'][0]['message_id'] ?? null;
            return ['sent' => true, 'message_id' => $messageId];
        }
        Log::warning('Meta WhatsApp failed', ['status' => $response->status(), 'body' => $response->body()]);
        return false;
    }
}
