<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phase 2 — financial operations fields.
     *
     * - paid_at:                real date the order was financially confirmed (COD collected,
     *                           bank transfer confirmed, or gateway captured).
     * - payment_confirmed_by:   admin user who manually confirmed the payment (COD/bank).
     * - refunded_at:            date the latest refund was recorded (set by ReturnService).
     *
     * Backfill: existing paid orders get paid_at from their last update time so historical
     * "collected" analytics have a sensible date anchor.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('paid_at')->nullable()->after('payment_status');
            $table->unsignedBigInteger('payment_confirmed_by')->nullable()->after('paid_at');
            $table->timestamp('refunded_at')->nullable()->after('refunded_amount');
        });

        DB::table('orders')
            ->where('payment_status', 'paid')
            ->whereNull('paid_at')
            ->update(['paid_at' => DB::raw('COALESCE(updated_at, created_at)')]);
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['paid_at', 'payment_confirmed_by', 'refunded_at']);
        });
    }
};