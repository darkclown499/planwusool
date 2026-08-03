<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * جدول إشعارات التاجر (لوحة التحكم).
     * يُسجّل كل إشعار يخص التاجر / المسؤول عن المتجر:
     * - طلب جديد
     * - منتج منخفض المخزون
     * - تقييم جديد
     * - طلب ملغي
     * - اشتراك خطة على وشك الانتهاء
     * - طلب ترقية خطة
     * - إلخ
     */
    public function up(): void
    {
        Schema::create('merchant_notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->comment('المستخدم المتجر (التاجر)');
            $table->unsignedBigInteger('store_id')->nullable()->comment('المتجر المرتبط (إن وجد)');
            $table->string('type', 50)->comment('نوع الإشعار: new_order, low_stock, new_review, order_cancelled, plan_expiring, plan_request, cod_collected, etc.');
            $table->string('title');
            $table->text('body');
            $table->string('icon', 50)->nullable()->comment('أيقونة Lucide');
            $table->string('color', 20)->nullable()->comment('لون الأيقونة: green, red, amber, blue, purple');
            $table->string('action_url')->nullable()->comment('الرابط عند النقر (مثل route orders.show)');
            $table->unsignedBigInteger('related_id')->nullable()->comment('ID العنصر المرتبط');
            $table->string('related_type', 50)->nullable()->comment('نوع العنصر: order, product, review, plan, etc.');
            $table->json('data')->nullable()->comment('بيانات إضافية');
            
            // حالات القراءة
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->boolean('is_urgent')->default(false)->comment('إشعار عاجل (يظهر في التنبيهات الهامة)');
            
            $table->timestamps();

            // المفاتيح الأجنبية
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');

            // فهارس
            $table->index(['user_id', 'is_read']);
            $table->index(['user_id', 'created_at']);
            $table->index(['store_id', 'type']);
            $table->index(['is_urgent', 'is_read']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('merchant_notifications');
    }
};

