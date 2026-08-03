<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * جدول قيود المناطق الجغرافية للكوبون المتقدم.
     * يتيح حصر الكوبون أو الشحن المجاني في:
     * - دولة محددة (country_id)
     * - ولاية/محافظة محددة (state_id)
     * - مدينة محددة (city_id)
     * أي صف يُعتبر قاعدة سماح مستقلة (يتم المطابقة بأي مستوى متوفر).
     */
    public function up(): void
    {
        Schema::create('coupon_regions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('coupon_id');

            $table->unsignedBigInteger('country_id')->nullable();
            $table->unsignedBigInteger('state_id')->nullable();
            $table->unsignedBigInteger('city_id')->nullable();

            $table->timestamps();

            $table->foreign('coupon_id')->references('id')->on('advanced_coupons')->onDelete('cascade');
            $table->foreign('country_id')->references('id')->on('countries')->onDelete('cascade');
            $table->foreign('state_id')->references('id')->on('states')->onDelete('cascade');
            $table->foreign('city_id')->references('id')->on('cities')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coupon_regions');
    }
};

