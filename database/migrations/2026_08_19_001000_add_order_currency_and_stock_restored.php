<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add per-order currency tracking (gateway payloads must charge the store's
     * real currency instead of hard-coded USD) and a flag that prevents double
     * inventory restoration when an order is failed, cancelled or refunded.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('orders', 'currency')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->string('currency', 10)->nullable()->after('total_amount');
            });
        }

        if (!Schema::hasColumn('orders', 'stock_restored')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->boolean('stock_restored')->default(false)->after('currency');
            });
        }
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'currency')) {
                $table->dropColumn('currency');
            }
            if (Schema::hasColumn('orders', 'stock_restored')) {
                $table->dropColumn('stock_restored');
            }
        });
    }
};