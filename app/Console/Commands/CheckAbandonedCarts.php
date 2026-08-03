<?php

namespace App\Console\Commands;

use App\Models\Store;
use App\Services\AbandonedCartService;
use Illuminate\Console\Command;

class CheckAbandonedCarts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:check-abandoned-carts {--store= : Process only a specific store ID} {--hours=24 : Minimum hours since last activity}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for abandoned carts and send reminders to customers';

    /**
     * Execute the console command.
     */
    public function handle(AbandonedCartService $abandonedCartService)
    {
        $hours = (int) $this->option('hours');
        $specificStoreId = $this->option('store');

        $this->info("Checking for abandoned carts older than {$hours} hours...");

        // Get stores
        $stores = Store::query();
        if ($specificStoreId) {
            $stores->where('id', $specificStoreId);
        }

        $totalRemindersSent = 0;
        $totalProcessed = 0;

        foreach ($stores->cursor() as $store) {
            $carts = $abandonedCartService->getCartsPendingReminder($store->id, $hours);

            foreach ($carts as $cart) {
                $this->line("  Sending reminder for cart #{$cart->id} (customer: {$cart->customer_email})");
                $abandonedCartService->sendReminder($cart);
                $totalRemindersSent++;
            }

            $totalProcessed += $carts->count();
        }

        $this->newLine();
        $this->info("Done! Processed {$totalProcessed} carts, sent {$totalRemindersSent} reminders.");

        return Command::SUCCESS;
    }
}
