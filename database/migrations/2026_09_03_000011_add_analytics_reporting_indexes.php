<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Analytics & Reporting read-model indexes.
     *
     * The analytics aggregation queries filter on (store_id, created_at) with a
     * status/payment_status predicate. Existing indexes cover (store_id, status)
     * and (store_id, status, payment_status) but not the date-led scans this
     * feature adds, and the overlapping pairs below are not duplicates of them.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index(['store_id', 'created_at'], 'orders_store_created_idx');
            $table->index(['store_id', 'payment_status', 'created_at'], 'orders_store_payment_status_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_store_created_idx');
            $table->dropIndex('orders_store_payment_status_created_idx');
        });
    }
};