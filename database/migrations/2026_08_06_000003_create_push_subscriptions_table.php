<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * جدول اشتراكات إشعارات المتصفح (Web Push).
     * يُخزّن بيانات إشتراك Web Push API لكل عميل وجهاز.
     */
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->unsignedBigInteger('customer_id')->nullable()->comment('ربط اختياري إذا كان العميل مسجلاً');
            $table->string('session_id')->nullable()->comment('لربط الزائر غير المسجل');

            // بيانات اشتراك Web Push
            $table->text('endpoint')->comment('نقطة الاشتراك من المتصفح');
            $table->string('public_key')->nullable();
            $table->string('auth_token')->nullable();
            $table->string('content_encoding')->default('aes128gcm')->nullable();

            // معلومات الجهاز
            $table->string('device_name')->nullable();
            $table->string('browser')->nullable();
            $table->string('platform')->nullable();
            $table->string('user_agent')->nullable();

            // الحالة
            $table->boolean('is_active')->default(true);
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('last_notified_at')->nullable();

            $table->timestamps();

            // المفاتيح الأجنبية
            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');

            // فهارس
            $table->index(['store_id', 'customer_id']);
            $table->index(['store_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};

