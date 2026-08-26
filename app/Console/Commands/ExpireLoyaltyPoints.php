<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\LoyaltyService;

class ExpireLoyaltyPoints extends Command
{
    protected $signature = 'loyalty:expire {--store= : Optional store ID to limit }';
    protected $description = 'Expire loyalty points whose expires_at has passed (idempotent, store-scoped)';

    public function handle(LoyaltyService $service): int
    {
        $storeId = $this->option('store') ? (int) $this->option('store') : null;
        $count = $service->processExpirations($storeId);
        $this->info("Expired {$count} loyalty ledger entries.");
        return self::SUCCESS;
    }
}
