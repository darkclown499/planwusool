<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Persist an immutable promotion snapshot on completed orders.
     *
     * Historical order totals must NOT depend on live promotion records.
     * If a merchant later edits or deletes a promotion, previously recorded
     * order totals and applied-discount metadata must remain unchanged.
     *
     * We store: promotion_id (safe FK, nullable) plus a JSON snapshot
     * (name/code/type/amounts/currency) captured at order creation time.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('promotion_type')->nullable()->after('coupon_discount');
            $table->string('promotion_name')->nullable()->after('promotion_type');
            $table->unsignedBigInteger('promotion_id')->nullable()->after('promotion_name');
            $table->json('promotion_snapshot')->nullable()->after('promotion_id');
            $table->index(['promotion_id'], 'orders_promotion_id_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_promotion_id_index');
            $table->dropColumn([
                'promotion_type',
                'promotion_name',
                'promotion_id',
                'promotion_snapshot',
            ]);
        });
    }
};
