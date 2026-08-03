<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('loyalty_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->boolean('is_enabled')->default(false);
            $table->decimal('points_per_currency', 10, 2)->default(1)->comment('Number of points earned per 1 unit of currency spent');
            $table->decimal('points_value', 10, 2)->default(0.01)->comment('Monetary value of a single point in currency');
            $table->decimal('minimum_redemption_points', 10, 2)->default(100)->comment('Minimum points required to redeem');
            $table->decimal('maximum_discount_percentage', 10, 2)->default(50)->comment('Max % of order total that can be paid with points');
            $table->decimal('signup_bonus_points', 10, 2)->default(0)->comment('Points awarded for creating an account');
            $table->decimal('review_bonus_points', 10, 2)->default(0)->comment('Points awarded for writing a product review');
            $table->boolean('points_expire')->default(false);
            $table->integer('expiry_months')->default(12)->comment('Points validity in months from earning');
            $table->json('earning_rules')->nullable()->comment('Extra earning rules (e.g. double points on certain days)');
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->unique('store_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loyalty_settings');
    }
};

