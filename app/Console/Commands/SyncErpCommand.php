<?php

namespace App\Console\Commands;

use App\Models\StoreErpConfig;
use App\Services\ErpSyncService;
use Illuminate\Console\Command;

class SyncErpCommand extends Command
{
    protected $signature = 'erp:sync {--store= : Optional store id} {--interval= : hourly|daily|realtime (defaults to hourly)} {--force : Sync all intervals}';

    protected $description = 'Pull products from active ERP integrations (scheduled sync).';

    public function handle(ErpSyncService $service): int
    {
        $query = StoreErpConfig::where('is_active', true);

        if ($this->option('store')) {
            $query->where('store_id', (int) $this->option('store'));
        }

        $configs = $query->get()->filter(function (StoreErpConfig $config) {
            if ($this->option('force')) {
                return true;
            }
            $interval = $this->option('interval') ?: 'hourly';
            return $config->auto_sync_interval === $interval;
        });

        if ($configs->isEmpty()) {
            $this->warn('No active ERP configs matched for the scheduled sync.');
            return self::SUCCESS;
        }

        foreach ($configs as $config) {
            $result = $service->initialSync($config);
            $status = ($result['success'] ?? false) ? 'OK' : 'FAILED';
            $this->line(sprintf(
                '[erp:sync] store=%s provider=%s → %s (%s)',
                $config->store_id,
                $config->provider,
                $status,
                $result['message'] ?? ''
            ));
        }

        return self::SUCCESS;
    }
}