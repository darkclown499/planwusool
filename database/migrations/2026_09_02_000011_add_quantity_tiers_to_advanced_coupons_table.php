<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Quantity discount tiers for AdvancedCoupon.
     *
     * A quantity discount promotion stores an ordered list of tiers, e.g.:
     *   buy 2+  -> 5% off
     *   buy 3+  -> 10% off
     *   buy 5+  -> 15% off
     *
     * Applied per parent product (variant quantities belonging to the same
     * parent product are aggregated) and only over the matching merchandise.
     *
     * Stored as JSON: [{ "min_qty": 2, "discount_value": 5, "max_discount_amount": null }, ...]
     */
    public function up(): void
    {
        Schema::table('advanced_coupons', function (Blueprint $table) {
            $table->json('quantity_tiers')->nullable()->after('bogo_free_quantity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('advanced_coupons', function (Blueprint $table) {
            $table->dropColumn('quantity_tiers');
        });
    }
};
