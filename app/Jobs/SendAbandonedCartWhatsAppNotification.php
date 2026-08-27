<?php

namespace App\Jobs;

use App\Models\AbandonedCart;
use App\Models\Store;
use App\Models\StoreWhatsappIntegration;
use App\Models\WhatsappMessage;
use App\Services\PhoneNormalizer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendAbandonedCartWhatsAppNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 20;
    public function backoff(): array { return [60, 300]; }

    public function __construct(public int $abandonedCartId) {
        $this->queue = config('services.whatsapp.queue', 'notifications');
    }

    public function handle(): void
    {
        $cart = AbandonedCart::with('store')->find($this->abandonedCartId);
        if (!$cart) return;
        if (in_array($cart->status, ['recovered', 'expired', 'unsubscribed'], true)) return;
        $store = $cart->store ?: Store::find($cart->store_id);
        if (!$store) return;
        $integration = StoreWhatsappIntegration::where('store_id', $cart->store_id)->first();
        if (!$integration || !$integration->is_enabled || $integration->connection_status !== 'connected') {
            Log::info('Abandoned cart WhatsApp skipped — not connected', ['cart_id' => $cart->id, 'store_id' => $cart->store_id]);
            return;
        }
        $token = $integration->access_token;
        $phoneId = $integration->phone_number_id;
        if (!$token || !$phoneId) {
            Log::info('Abandoned cart WhatsApp skipped — incomplete config', ['cart_id' => $cart->id]);
            return;
        }
        $customerPhone = PhoneNormalizer::normalize($cart->customer_phone ?? '');
        if (!$customerPhone) {
            Log::info('Abandoned cart WhatsApp skipped — invalid customer phone', ['cart_id' => $cart->id]);
            return;
        }
        if ($cart->whatsapp_status === 'sent' || $cart->whatsapp_status === 'delivered' || $cart->whatsapp_status === 'read') {
            return;
        }
        $tokenRecover = $cart->recovery_token ?: $cart->ensureRecoveryToken();
        $recoverUrl = url('/checkout?recover_token=' . $tokenRecover);
        $message = "مرحباً! تركت منتجات في سلتك\nأكمل طلبك الآن: {$recoverUrl}\nالمجموع: " . number_format((float) $cart->cart_total, 2);
        $mode = strtolower(trim((string) ($integration->message_mode ?? 'text')));
        if (!in_array($mode, ['text', 'template'], true)) $mode = 'text';
        if ($mode === 'template' && empty($integration->template_name) && empty(config('services.whatsapp.template_name'))) {
            Log::warning('Abandoned cart template missing', ['cart_id' => $cart->id, 'store_id' => $cart->store_id]);
            return;
        }
        try {
            $graphBase = rtrim(config('services.whatsapp.graph_url', 'https://graph.facebook.com'), '/') . '/' . ltrim(config('services.whatsapp.graph_version', 'v18.0'), '/');
            $url = $graphBase . "/{$phoneId}/messages";
            $toClean = ltrim($customerPhone, '+');
            $timeout = (int) config('services.whatsapp.timeout', 15);
            if ($mode === 'template') {
                $templateName = $integration->template_name ?: config('services.whatsapp.template_name');
                $templateLang = $integration->template_language ?: config('services.whatsapp.template_language', 'ar');
                $response = Http::withToken($token)->timeout($timeout)->post($url, [
                    'messaging_product' => 'whatsapp',
                    'to' => $toClean,
                    'type' => 'template',
                    'template' => [
                        'name' => $templateName,
                        'language' => ['code' => $templateLang],
                        'components' => [[
                            'type' => 'body',
                            'parameters' => [
                                ['type' => 'text', 'text' => substr($store->name ?? '', 0, 64)],
                                ['type' => 'text', 'text' => substr($recoverUrl, 0, 200)],
                                ['type' => 'text', 'text' => substr(number_format((float)$cart->cart_total, 2), 0, 32)],
                            ],
                        ]],
                    ],
                ]);
            } else {
                $response = Http::withToken($token)->timeout($timeout)->post($url, [
                    'messaging_product' => 'whatsapp',
                    'to' => $toClean,
                    'type' => 'text',
                    'text' => ['body' => $message],
                ]);
            }
            if ($response->successful()) {
                $data = $response->json();
                $messageId = $data['messages'][0]['id'] ?? null;
                $masked = PhoneNormalizer::mask($customerPhone);
                try {
                    WhatsappMessage::updateOrCreate(
                        ['store_id' => $cart->store_id, 'abandoned_cart_id' => $cart->id],
                        [
                            'recipient_phone' => $customerPhone,
                            'provider' => $integration->provider ?? 'meta',
                            'provider_message_id' => $messageId,
                            'direction' => 'outbound',
                            'message_type' => 'abandoned_cart_reminder',
                            'status' => 'sent',
                            'template_name' => $mode === 'template' ? ($integration->template_name ?? null) : null,
                            'sent_at' => now(),
                        ]
                    );
                } catch (\Throwable $e) {}
                AbandonedCart::where('id', $cart->id)->where(function ($q) {
                    $q->whereNull('whatsapp_status')->orWhere('whatsapp_status', '!=', 'sent');
                })->update([
                    'whatsapp_status' => 'sent',
                    'whatsapp_message_id' => $messageId,
                    'whatsapp_sent_at' => now(),
                    'status' => 'reminder_sent',
                    'reminder_sent_at' => now(),
                    'reminder_count' => $cart->reminder_count + 1,
                ]);
                Log::info('Abandoned cart WhatsApp sent', ['cart_id' => $cart->id, 'store_id' => $cart->store_id, 'masked' => $masked, 'message_id' => $messageId]);
                return;
            }
            $status = $response->status();
            $error = $response->json()['error']['message'] ?? $response->body();
            if ($status === 401 || $status === 403) {
                Log::warning('Abandoned cart WhatsApp auth error', ['cart_id' => $cart->id, 'error' => substr($error, 0, 200)]);
                $this->fail(new \RuntimeException("auth_error: {$error}", $status));
                return;
            }
            if ($status === 429) throw new \RuntimeException("rate_limited: {$error}", 429);
            if ($status >= 500) throw new \RuntimeException("provider_error: {$error}", $status);
            Log::warning('Abandoned cart WhatsApp provider failure', ['cart_id' => $cart->id, 'status' => $status, 'body' => substr($response->body(), 0, 500)]);
            return;
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            if (str_contains($msg, 'auth_error')) { $this->fail($e); return; }
            if (str_contains($msg, 'rate_limited') || str_contains($msg, 'provider_error') || str_contains($msg, 'cURL') || str_contains($msg, 'timed out')) {
                throw $e;
            }
            Log::error('Abandoned cart WhatsApp exception', ['cart_id' => $cart->id, 'error' => substr($msg, 0, 500)]);
            throw $e;
        }
    }

    public function failed(\Throwable $e): void
    {
        Log::warning('Abandoned cart WhatsApp job failed after retries', ['cart_id' => $this->abandonedCartId, 'error' => $e->getMessage()]);
    }
}
