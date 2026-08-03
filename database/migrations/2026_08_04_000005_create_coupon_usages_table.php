<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * جدول تتبع استخدام الكوبون المتقدم.
     * يسجّل كل استخدام للكوبون مع تعريف العميل
     * (المعرّف يعتمد على رقم الهاتف أو البريد للزوار غير المسجلين).
     */
    public function up(): void
    {
        Schema::create('coupon_usages', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('coupon_id');
            $table->unsignedBigInteger('order_id')->nullable();
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->string('customer_identifier')->nullable(); // رقم الهاتف أو البريد الإلكتروني للزوار
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->timestamps();

            $table->foreign('coupon_id')->references('id')->on('advanced_coupons')->onDelete('cascade');
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('set null');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');

            $table->index(['coupon_id', 'customer_identifier']);
            $table->index(['coupon_id', 'customer_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coupon_usages');
    }
};

