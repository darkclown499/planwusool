<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Set default platform currency to ILS (Shekel / ₪) across stores.
     */
    public function up(): void
    {
        // Ensure stores table has currency column with default ILS
        if (Schema::hasTable('stores')) {
            if (!Schema::hasColumn('stores', 'currency')) {
                Schema::table('stores', function (Blueprint $table) {
                    $table->string('currency', 10)->default('ILS')->after('theme');
                });
            } else {
                // Update existing column default to ILS (requires doctrine/dbal for change, fallback to raw)
                try {
                    Schema::table('stores', function (Blueprint $table) {
                        $table->string('currency', 10)->default('ILS')->change();
                    });
                } catch (\Throwable $e) {
                    // Fallback raw SQL for MySQL
                    try {
                        DB::statement("ALTER TABLE `stores` MODIFY `currency` VARCHAR(10) NOT NULL DEFAULT 'ILS'");
                    } catch (\Throwable $e2) {
                        // SQLite or other – ignore, application fallback will handle
                    }
                }
                // Backfill null/empty currencies to ILS
                try {
                    DB::table('stores')->whereNull('currency')->orWhere('currency', '')->update(['currency' => 'ILS']);
                } catch (\Throwable $e) {}
            }
        }

        // Ensure existing store_configurations default_currency is ILS where empty
        try {
            DB::table('store_configurations')
                ->where('key', 'default_currency')
                ->where(function ($q) {
                    $q->whereNull('value')->orWhere('value', '')->orWhere('value', 'usd')->orWhere('value', 'USD');
                })
                ->update(['value' => 'ILS']);
        } catch (\Throwable $e) {}

        // Ensure currencies table has ILS as default
        try {
            DB::table('currencies')->where('is_default', true)->update(['is_default' => false]);
            DB::table('currencies')->where('code', 'ILS')->update(['is_default' => true]);
        } catch (\Throwable $e) {}
    }

    public function down(): void
    {
        // No rollback for currency default change
    }
};
