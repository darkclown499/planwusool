<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * جدول تفضيلات الإشعارات لكل عميل.
     * يحدد القنوات المفعّلة لكل نوع من أنواع الإشعارات.
     */
    public function up(): void
    {
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->unsignedBigInteger('customer_id');
            $table->string('type', 50)->comment('نوع الإشعار الذي ينطبق عليه هذا التفضيل');

            // قنوات التواصل المفعّلة
            $table->boolean('email_enabled')->default(true);
            $table->boolean('push_enabled')->default(true);
            $table->boolean('sms_enabled')->default(false);
            $table->boolean('in_app_enabled')->default(true);

            $table->timestamps();

            // المفاتيح الأجنبية
            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');

            // فهرس فريد لمنع التكرار (عميل + نوع)
            $table->unique(['store_id', 'customer_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }
};

