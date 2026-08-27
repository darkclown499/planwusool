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

        $payload = $this->buildOrderPayload($order);
        $mode = $this->resolveMessageMode($integration);

        // Validate template config early
        if ($mode === 'template') {
            if (empty($integration->template_name) && empty(config('services.whatsapp.template_name'))) {
                Log::warning('Merchant WhatsApp template name missing', ['store_id'=>$storeId]);
                return ['sent'=>false,'reason'=>'template_config_missing','provider'=>$integration->provider];
            }
        }

        try {
            $sent = $integration->provider === 'twilio'
                ? $this->sendViaTwilio($normalizedRecipient, $payload, $integration)
                : $this->sendViaMeta($normalizedRecipient, $payload, $integration, $mode);

            if ($sent) {
                Cache::put($idempotencyKey, true, 86400);
                $masked = PhoneNormalizer::mask($normalizedRecipient);
                Log::info('Merchant WhatsApp sent', ['store_id' => $storeId, 'order_id' => $order->id, 'provider' => $integration->provider, 'masked' => $masked, 'message_id' => $sent['message_id'] ?? null]);
                return ['sent' => true, 'reason' => 'sent', 'provider' => $integration->provider, 'message_id' => $sent['message_id'] ?? null];
            }

            Log::warning('Merchant WhatsApp provider returned failure', ['store_id' => $storeId, 'order_id' => $order->id, 'provider' => $integration->provider]);
            return ['sent' => false, 'reason' => 'provider_error', 'provider' => $integration->provider];
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            $code = $e->getCode();
            if (str_starts_with($msg, 'auth_error') || $code === 401 || $code === 403) {
                Log::warning('Merchant WhatsApp auth error', ['store_id'=>$storeId,'order_id'=>$order->id,'error'=>$msg]);
                return ['sent'=>false,'reason'=>'auth_error','provider'=>$integration->provider];
            }
            if (str_starts_with($msg, 'rate_limited') || $code === 429) {
                Log::warning('Merchant WhatsApp rate limited', ['store_id'=>$storeId,'order_id'=>$order->id,'error'=>$msg]);
                return ['sent'=>false,'reason'=>'rate_limited','provider'=>$integration->provider];
            }
            if (str_contains($msg, 'cURL') || str_contains($msg, 'timed out') || str_contains($msg, 'Connection')) {
                return ['sent'=>false,'reason'=>'timeout','provider'=>$integration->provider];
            }
            Log::error('Merchant WhatsApp exception (order not rolled back)', [
                'store_id' => $storeId,
                'order_id' => $order->id,
                'provider' => $integration->provider,
                'error' => $msg,
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

        $mode = $this->resolveMessageMode($integration);
        if ($mode === 'template' && empty($integration->template_name) && empty(config('services.whatsapp.template_name'))) {
            return ['sent'=>false,'reason'=>'template_config_missing','message'=>'قالب واتساب غير مُكوّن — أدخل اسم القالب واللغة'];
        }
        $store = \App\Models\Store::find($storeId);
        $testPayload = [
            'store_name'=>$store->name ?? 'متجر','order_number'=>'TEST-0000','customer'=>'اختبار','phone'=>$normalized,'total'=>'0.00','currency'=>'ILS','symbol'=>'₪','payment'=>'اختبار','shipping'=>'اختبار','address'=>'—','items_summary'=>'منتج اختبار × 1','items'=>[['name'=>'منتج اختبار','qty'=>1,'variant'=>'']],'items_count'=>1,'order_url'=>config('app.url'),
        ];
        $messageOrPayload = $mode === 'template' ? $testPayload : "هذه رسالة اختبار من وصول. إشعارات الطلبات تعمل بنجاح ✅";

        try {
            $sent = $integration->provider === 'twilio'
                ? $this->sendViaTwilio($normalized, $messageOrPayload, $integration)
                : $this->sendViaMeta($normalized, $messageOrPayload, $integration, $mode);

            if ($sent) {
                Log::info('Merchant WhatsApp test sent', ['store_id' => $storeId, 'masked' => PhoneNormalizer::mask($normalized)]);
                return ['sent' => true, 'reason' => 'sent', 'provider' => $integration->provider, 'message' => 'تم إرسال رسالة الاختبار'];
            }
            return ['sent' => false, 'reason' => 'provider_error', 'message' => 'تعذر إرسال رسالة الاختبار'];
        } catch (\Throwable $e) {
            Log::error('Merchant WhatsApp test exception', ['store_id' => $storeId, 'error' => $e->getMessage()]);
            return ['sent' => false, 'reason' => 'exception', 'message' => 'تعذر إرسال رسالة الاختبار', 'error' => $e->getMessage()];
        }
    }

    private function graphBase(): string
    {
        $base = rtrim(config('services.whatsapp.graph_url', 'https://graph.facebook.com'), '/');
        $ver = ltrim(config('services.whatsapp.graph_version', 'v18.0'), '/');
        return "{$base}/{$ver}";
    }

    public function verifyConnection(StoreWhatsappIntegration $integration): array
    {
        $token = $integration->access_token;
        $phoneNumberId = $integration->phone_number_id;

        if (!$token || !$phoneNumberId) {
            return ['connected' => false, 'error' => 'بيانات الاعتماد ناقصة'];
        }

        try {
            $url = $this->graphBase() . "/{$phoneNumberId}?fields=display_phone_number,verified_name";
            $response = \Illuminate\Support\Facades\Http::withToken($token)->timeout((int) config('services.whatsapp.timeout', 15))->get($url);

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

    // ---------- Shared payload (single source of truth) ----------
    public function buildOrderPayload(Order $order): array
    {
        $customer = trim(($order->customer_first_name ?? '') . ' ' . ($order->customer_last_name ?? ''));
        if ($customer === '') $customer = $order->customer_email ?? '—';
        $store = $order->store;
        $total = number_format((float) $order->total_amount, 2);
        $currency = $order->currency ?? 'ILS';
        $symbol = $currency === 'ILS' ? '₪' : $currency;
        $payment = $this->formatPaymentMethod($order->payment_method ?? 'cod');
        $shippingName = 'توصيل شخصي';
        if ($order->shippingMethod) {
            $shippingName = $order->shippingMethod->name;
            try {
                if ($order->shippingMethod->courier_integration_id) {
                    $ci = \App\Models\StoreCourierIntegration::find($order->shippingMethod->courier_integration_id);
                    if ($ci && $ci->provider) $shippingName .= ' (' . $ci->provider . ')';
                }
            } catch (\Throwable $e) {}
        }
        $orderUrl = $this->getMerchantOrderUrl($order);
        $addrParts = array_filter([$order->shipping_address, $order->shipping_city, $order->shipping_state]);
        $address = $addrParts ? implode(' - ', $addrParts) : '—';
        $items = [];
        $itemsSummary = '';
        try {
            $collection = $order->items()->with('product')->get();
            if ($collection->count() > 0) {
                $summaryParts = [];
                foreach ($collection->take(10) as $it) {
                    $name = $it->product_name ?? $it->name ?? 'منتج';
                    $qty = (int) $it->quantity;
                    $variant = '';
                    if (!empty($it->product_variants)) {
                        $v = $it->product_variants;
                        if (is_string($v)) { $decoded = json_decode($v, true); $v = is_array($decoded) ? $decoded : $v; }
                        if (is_array($v)) {
                            $parts = [];
                            foreach ($v as $k=>$val) {
                                if (is_numeric($k)) $parts[] = is_string($val) ? $val : json_encode($val, JSON_UNESCAPED_UNICODE);
                                else $parts[] = "$k: $val";
                            }
                            if ($parts) $variant = ' (' . implode('، ', $parts) . ')';
                        } elseif (is_string($v) && $v !== '') $variant = " ($v)";
                    }
                    $items[] = ['name'=>$name,'qty'=>$qty,'variant'=>$variant];
                    $summaryParts[] = "{$name} × {$qty}";
                }
                if ($collection->count() > 10) $summaryParts[] = "و " . ($collection->count()-10) . " أخرى";
                $itemsSummary = implode('، ', $summaryParts);
                if ($itemsSummary === '') $itemsSummary = $collection->count() . ' منتجات';
            }
        } catch (\Throwable $e) {}
        if ($itemsSummary === '') $itemsSummary = '—';
        return [
            'store_name' => $store->name ?? '',
            'order_number' => $order->order_number,
            'customer' => $customer,
            'phone' => $order->customer_phone ?? '',
            'total' => $total,
            'currency' => $currency,
            'symbol' => $symbol,
            'payment' => $payment,
            'shipping' => $shippingName,
            'address' => $address,
            'items' => $items,
            'items_summary' => $itemsSummary,
            'items_count' => count($items) ?: (int) $order->items()->count(),
            'notes' => $order->notes ?? '',
            'order_url' => $orderUrl,
        ];
    }

    public function resolveMessageMode(StoreWhatsappIntegration $integration): string
    {
        $mode = strtolower(trim((string) ($integration->message_mode ?? '')));
        if (in_array($mode, ['template','text'], true)) return $mode;
        $envMode = strtolower(trim((string) config('services.whatsapp.message_mode', 'text')));
        return in_array($envMode, ['template','text'], true) ? $envMode : 'text';
    }

    public function buildTextMessage(array $payload): string
    {
        $itemsLine = '';
        if (!empty($payload['items'])) {
            $lines = [];
            foreach ($payload['items'] as $it) $lines[] = "• {$it['name']}{$it['variant']} × {$it['qty']}";
            $itemsLine = "\nالمنتجات:\n" . implode("\n", $lines) . "\n";
        } elseif (!empty($payload['items_summary']) && $payload['items_summary'] !== '—') {
            $itemsLine = "\nالمنتجات: {$payload['items_summary']}\n";
        }
        $notes = !empty($payload['notes']) ? "\nملاحظات: {$payload['notes']}\n" : '';
        return "طلب جديد 🛍️\n\n"
            . "المتجر: {$payload['store_name']}\n"
            . "رقم الطلب: #{$payload['order_number']}\n"
            . "العميل: {$payload['customer']}\n"
            . "الهاتف: {$payload['phone']}\n"
            . "الإجمالي: {$payload['total']} {$payload['symbol']}\n"
            . "الدفع: {$payload['payment']}\n"
            . "التوصيل: {$payload['shipping']}\n"
            . "العنوان: {$payload['address']}\n"
            . $itemsLine . $notes
            . "\nرابط الطلب:\n{$payload['order_url']}";
    }

    // Kept for backward compat — delegates to new payload/text
    private function buildMerchantMessage(Order $order): string
    {
        return $this->buildTextMessage($this->buildOrderPayload($order));
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

    private function sendViaTwilio(string $to, $payloadOrMessage, StoreWhatsappIntegration $integration): array|bool
    {
        $message = is_array($payloadOrMessage) ? $this->buildTextMessage($payloadOrMessage) : (string) $payloadOrMessage;
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

    private function sendViaMeta(string $to, $payloadOrMessage, StoreWhatsappIntegration $integration, string $mode = 'text'): array|bool
    {
        $token = $integration->access_token;
        $phoneId = $integration->phone_number_id;
        if (!$token || !$phoneId) return false;

        $toClean = ltrim($to, '+');
        $url = $this->graphBase() . "/{$phoneId}/messages";
        $timeout = (int) config('services.whatsapp.timeout', 15);

        $isPayload = is_array($payloadOrMessage);
        $payload = $isPayload ? $payloadOrMessage : null;
        $textMessage = $isPayload ? $this->buildTextMessage($payload) : (string) $payloadOrMessage;

        // Template mode: build template request only
        if ($mode === 'template') {
            $templateName = $integration->template_name ?: config('services.whatsapp.template_name');
            $templateLang = $integration->template_language ?: config('services.whatsapp.template_language', 'ar');
            if (!$templateName) {
                \Illuminate\Support\Facades\Log::warning('Meta WhatsApp template name missing', ['store_id'=>$integration->store_id]);
                return false;
            }
            $components = $this->buildTemplateComponents($payload ?? ['order_number'=>'','customer'=>'','total'=>'','symbol'=>'','payment'=>'','order_url'=>'','items_summary'=>'']);
            try {
                $response = \Illuminate\Support\Facades\Http::withToken($token)->timeout($timeout)->post($url, [
                    'messaging_product' => 'whatsapp',
                    'to' => $toClean,
                    'type' => 'template',
                    'template' => [
                        'name' => $templateName,
                        'language' => ['code' => $templateLang],
                        'components' => $components,
                    ],
                ]);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Meta WhatsApp template timeout/exception', ['error'=>$e->getMessage()]);
                throw $e;
            }
            if ($response->successful()) {
                $data = $response->json();
                return ['sent'=>true,'message_id'=>$data['messages'][0]['id'] ?? null];
            }
            $status = $response->status();
            $errorMsg = $response->json()['error']['message'] ?? $response->body();
            if ($status===401||$status===403) throw new \RuntimeException("auth_error: {$errorMsg}", $status);
            if ($status===429) throw new \RuntimeException("rate_limited: {$errorMsg}", 429);
            if ($status>=500) throw new \RuntimeException("provider_error: {$errorMsg}", $status);
            \Illuminate\Support\Facades\Log::warning('Meta WhatsApp template failed (no fallback)', ['status'=>$status,'body'=>$response->body()]);
            return false;
        }

        // Text mode only — no silent template fallback
        try {
            $response = \Illuminate\Support\Facades\Http::withToken($token)->timeout($timeout)->post($url, [
                'messaging_product' => 'whatsapp',
                'to' => $toClean,
                'type' => 'text',
                'text' => ['body' => $textMessage],
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Meta WhatsApp timeout/exception', ['error' => $e->getMessage()]);
            throw $e;
        }

        if ($response->successful()) {
            $data = $response->json();
            return ['sent' => true, 'message_id' => $data['messages'][0]['id'] ?? null];
        }

        $status = $response->status();
        $body = $response->json();
        $errorMsg = $body['error']['message'] ?? $response->body();

        if ($status === 401 || $status === 403) throw new \RuntimeException("auth_error: {$errorMsg}", $status);
        if ($status === 429) throw new \RuntimeException("rate_limited: {$errorMsg}", 429);
        if ($status >= 500) throw new \RuntimeException("provider_error: {$errorMsg}", $status);
        \Illuminate\Support\Facades\Log::warning('Meta WhatsApp failed', ['status' => $status, 'body' => $response->body()]);
        return false;
    }

    private function buildTemplateComponents(array $payload): array
    {
        // Meta template expects ordered {{1}},{{2}}... params — map from single payload
        // Keep summary short to fit template limits (1024 chars per param)
        $orderNumber = substr((string)($payload['order_number'] ?? ''),0,64);
        $customer = substr((string)($payload['customer'] ?? ''),0,64);
        $total = substr(trim(($payload['total'] ?? '').' '.($payload['symbol'] ?? '')),0,64);
        $payment = substr((string)($payload['payment'] ?? ''),0,64);
        $items = substr((string)($payload['items_summary'] ?? ''),0,200);
        if ($items === '' || $items === '—') $items = ($payload['items_count'] ?? 0) . ' منتجات';
        $orderUrl = substr((string)($payload['order_url'] ?? ''),0,200);
        return [
            ['type'=>'body','parameters'=>[
                ['type'=>'text','text'=>$orderNumber],
                ['type'=>'text','text'=>$customer],
                ['type'=>'text','text'=>$total],
                ['type'=>'text','text'=>$payment],
                ['type'=>'text','text'=>$items],
                ['type'=>'text','text'=>$orderUrl],
            ]]
        ];
    }
}
