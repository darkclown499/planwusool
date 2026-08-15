<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

abstract class WebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = [10, 30, 60];
    public $timeout = 120;

    protected array $payload;
    protected string $gateway;

    public function __construct(array $payload, string $gateway)
    {
        $this->payload = $payload;
        $this->gateway = $gateway;
    }

    public function handle(): void
    {
        try {
            $this->processWebhook($this->payload);
            Log::info("Webhook processed successfully", ['gateway' => $this->gateway]);
        } catch (\Exception $e) {
            Log::error("Webhook processing failed", [
                'gateway' => $this->gateway,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Re-throw to trigger retry
            throw $e;
        }
    }

    abstract protected function processWebhook(array $payload): void;

    protected function logError(string $message, array $context = []): void
    {
        Log::error("{$this->gateway} webhook: {$message}", array_merge($context, ['gateway' => $this->gateway]));
    }

    protected function logInfo(string $message, array $context = []): void
    {
        Log::info("{$this->gateway} webhook: {$message}", array_merge($context, ['gateway' => $this->gateway]));
    }
}