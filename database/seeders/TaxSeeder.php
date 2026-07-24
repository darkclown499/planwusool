<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Tax;
use App\Models\Store;
use Carbon\Carbon;

class TaxSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (config('app.is_demo')) {
            $this->createDemoTaxes();
        } else {
            $this->createMainVersionTaxes();
        }
    }

    private function createDemoTaxes()
    {
        $stores = Store::all();
        
        foreach ($stores as $storeIndex => $store) {
            // Skip if taxes already exist for this store - preserve existing client data
            if (Tax::where('store_id', $store->id)->exists()) {
                $this->command->info('Taxes already exist for store: ' . $store->name . '. Skipping.');
                continue;
            }
            $taxes = [
                ['name' => 'Standard VAT', 'rate' => 20.0, 'priority' => 1, 'region' => 'EU'],
                ['name' => 'Reduced Rate', 'rate' => 5.0, 'priority' => 2, 'region' => 'EU'],
                ['name' => 'Sales Tax', 'rate' => 8.25, 'priority' => 3, 'region' => 'US'],
                ['name' => 'Service Tax', 'rate' => 15.0, 'priority' => 4, 'region' => 'IN'],
                ['name' => 'Zero Rate', 'rate' => 0.0, 'priority' => 5, 'region' => 'Global'],
            ];
            
            foreach ($taxes as $taxIndex => $taxData) {
                $createdDaysAgo = rand(30, 90) + ($storeIndex * 2) + $taxIndex;
                $createdAt = Carbon::now()->subDays($createdDaysAgo);
                $updatedDaysAgo = rand(1, $createdDaysAgo - 1);
                $updatedAt = Carbon::now()->subDays($updatedDaysAgo);
                
                Tax::firstOrCreate(
                    [
                        'name' => $taxData['name'],
                        'store_id' => $store->id,
                    ],
                    [
                        'rate' => $taxData['rate'],
                        'type' => 'percentage',
                        'region' => $taxData['region'],
                        'priority' => $taxData['priority'],
                        'compound' => false,
                        'is_active' => true,
                        'created_at' => $createdAt,
                        'updated_at' => $updatedAt,
                    ]
                );
            }
        }

        $totalTaxes = Tax::count();
        $this->command->info("Created {$totalTaxes} tax records for demo version.");
    }

    private function createMainVersionTaxes()
    {
        $store = Store::whereHas('user', function($query) {
            $query->where('email', 'company@example.com');
        })->first();

        if (!$store) {
            $this->command->error('No store found for company@example.com');
            return;
        }

        // Skip if taxes already exist - preserve existing client data
        if (Tax::where('store_id', $store->id)->exists()) {
            $this->command->info('Taxes already exist for store. Skipping.');
            return;
        }

        $taxes = [
            ['name' => 'Standard VAT', 'rate' => 20.0, 'priority' => 1, 'region' => 'EU'],
            ['name' => 'Reduced Rate', 'rate' => 5.0, 'priority' => 2, 'region' => 'EU'],
            ['name' => 'Sales Tax', 'rate' => 8.25, 'priority' => 3, 'region' => 'US'],
            ['name' => 'Zero Rate', 'rate' => 0.0, 'priority' => 4, 'region' => 'Global'],
        ];
        
        foreach ($taxes as $taxData) {
            Tax::firstOrCreate(
                [
                    'name' => $taxData['name'],
                    'store_id' => $store->id
                ],
                [
                    'rate' => $taxData['rate'],
                    'type' => 'percentage',
                    'region' => $taxData['region'],
                    'priority' => $taxData['priority'],
                    'compound' => false,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $this->command->info('Created ' . count($taxes) . ' tax records for main version.');
    }
}
