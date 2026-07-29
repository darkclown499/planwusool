<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\AccountingService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncOrderToAccounting implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = [60, 300, 900];

    protected Order $order;

    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    public function handle(AccountingService $accountingService): void
    {
        $store = $this->order->store;
        $config = $accountingService->getConfig($store);

        if (!$config || !$config->sync_orders) {
            return;
        }

        $accountingService->sendOrderToAccounting($this->order, $config);
    }

    public function failed(\Throwable $exception): void
    {
        \Log::error('SyncOrderToAccounting job failed', [
            'order_id' => $this->order->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
