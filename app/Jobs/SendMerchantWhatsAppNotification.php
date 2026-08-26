<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\MerchantWhatsAppNotifier;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendMerchantWhatsAppNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $timeout = 20;
    // backoff seconds for attempts 2 and 3
    public function backoff(): array { return [60, 300]; }

    public function __construct(public int $orderId) {
        $this->queue = config('services.whatsapp.queue', 'notifications');
    }

    public function handle(MerchantWhatsAppNotifier $notifier): void
    {
        $order = Order::with(['store','shippingMethod','items'])->find($this->orderId);
        if (!$order) return;

        $result = $notifier->notify($order);

        // Decision on retry — based on reason
        if (($result['sent'] ?? false) === true) return; // success or duplicate -> done
        $reason = $result['reason'] ?? 'unknown';
        // Do NOT retry on permanent failures
        if (in_array($reason, ['not_enabled','not_connected','invalid_number','incomplete_config','duplicate','no_store'], true)) {
            return;
        }
        // For 401/403 invalid credentials — do not infinite retry, fail fast
        if ($reason === 'auth_error' || $reason === 'invalid_token') {
            $this->fail(new \RuntimeException("WhatsApp auth error: {$reason}"));
            return;
        }
        // For rate limit / provider_error / exception / timeout — throw to trigger retry/backoff
        if (in_array($reason, ['rate_limited','provider_error','exception','timeout'], true)) {
            throw new \RuntimeException("WhatsApp retryable: {$reason}");
        }
        // default: don't throw for unknown to avoid loop
        Log::warning('Merchant WhatsApp job non-retryable', ['order_id'=>$order->id,'reason'=>$reason]);
    }

    public function failed(\Throwable $e): void
    {
        Log::warning('Merchant WhatsApp job failed after retries', ['order_id'=>$this->orderId,'error'=>$e->getMessage()]);
    }
}
