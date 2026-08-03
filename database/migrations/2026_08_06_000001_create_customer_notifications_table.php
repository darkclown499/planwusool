<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * جدول سجل الإشعارات المرسلة لكل عميل.
     * يُسجّل كل إشعار يُرسل للعميل مع حالة قراءته ونوعه.
     */
    public function up(): void
    {
        Schema::create('customer_notifications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->unsignedBigInteger('customer_id');
            $table->string('type', 50)->comment('نوع الإشعار: order_confirmed, order_shipped, review_reply, back_in_stock, price_drop, abandoned_cart_reminder, loyalty_earned, welcome, custom');
            $table->string('title');
            $table->text('body');
            $table->string('icon')->nullable();
            $table->string('image_url')->nullable();
            $table->string('action_url')->nullable()->comment('رابط عند النقر على الإشعار');
            $table->json('data')->nullable()->comment('بيانات إضافية مرتبطة بالإشعار');
            $table->unsignedBigInteger('related_id')->nullable()->comment('ID العنصر المرتبط (طلب، منتج، إلخ)');
            $table->string('related_type', 50)->nullable()->comment('نوع العنصر المرتبط: order, product, review, etc');
            
            // حالات الإيصال والقراءة
            $table->enum('channel', ['in_app', 'push', 'email', 'sms'])->default('in_app')->comment('قناة الإرسال');
            $table->boolean('is_sent')->default(false);
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('clicked_at')->nullable()->comment('وقت النقر على الإشعار');
            $table->boolean('is_read')->default(false);

            $table->timestamps();

            // المفاتيح الأجنبية
            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');

            // فهارس
            $table->index(['customer_id', 'is_read']);
            $table->index(['customer_id', 'created_at']);
            $table->index(['store_id', 'type']);
            $table->index(['store_id', 'is_sent']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_notifications');
    }
};

