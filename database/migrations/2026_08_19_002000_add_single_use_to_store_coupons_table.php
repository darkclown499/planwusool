<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add the single_use (non-stacking) flag for the basic coupon system.
     * When enabled, the coupon cannot be combined with other discount coupons.
     */
    public function up(): void
    {
        Schema::table('store_coupons', function (Blueprint $table) {
            $table->boolean('single_use')->default(false)->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('store_coupons', function (Blueprint $table) {
            $table->dropColumn('single_use');
        });
    }
};