<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CRM directory/profile lookups aggregate orders by store + customer identity.
     * Add composite indexes for the exact query patterns the CRM uses:
     *   - canonical customers: WHERE store_id = ? AND customer_id IN (...)
     *   - guest aggregation:   WHERE store_id = ? AND customer_phone = ...
     *   - guest aggregation:   WHERE store_id = ? AND customer_email = ...
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (! $this->hasIndex('orders_store_customer_idx')) {
                $table->index(['store_id', 'customer_id'], 'orders_store_customer_idx');
            }
            if (! $this->hasIndex('orders_store_phone_idx')) {
                $table->index(['store_id', 'customer_phone'], 'orders_store_phone_idx');
            }
            if (! $this->hasIndex('orders_store_email_idx')) {
                $table->index(['store_id', 'customer_email'], 'orders_store_email_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_store_customer_idx');
            $table->dropIndex('orders_store_phone_idx');
            $table->dropIndex('orders_store_email_idx');
        });
    }

    private function hasIndex(string $name): bool
    {
        try {
            return collect(Schema::getIndexes('orders'))
                ->pluck('name')
                ->contains($name);
        } catch (\Throwable $e) {
            return false;
        }
    }
};