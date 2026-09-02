<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Customer-segment eligibility + explicit stacking policy on promotions.
     *
     * Segment foundation (Section 16):
     *   - audience: everyone | registered | first_order | repeat
     *   - registered_only: require an authenticated customer
     *
     * Stacking policy (Section 7): centralized flag that records whether a
     * free-shipping promotion is allowed to coexist with a merchandise
     * discount. At most ONE merchandise discount may apply per order.
     */
    public function up(): void
    {
        Schema::table('advanced_coupons', function (Blueprint $table) {
            $table->string('audience')->default('everyone')->after('first_order_only');
            $table->boolean('stackable')->default(false)->after('audience');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('advanced_coupons', function (Blueprint $table) {
            $table->dropColumn(['audience', 'stackable']);
        });
    }
};
