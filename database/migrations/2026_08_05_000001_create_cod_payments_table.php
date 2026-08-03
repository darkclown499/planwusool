<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * الجدول الرئيسي لنظام الدفع عند الاستلام المتقدم.
     * يتبع حالة تحصيل المبلغ لكل طلب COD:
     * - المبلغ الإجمالي المطلوب تحصيله
     * - المبلغ المحصّل حتى الآن
     * - المبلغ المتبقي
     * - حالة الدفع (معلق / جزئي / مدفوع / فاشل / ملغي / مرتجع)
     * - شركة التوصيل المسؤولة عن التحصيل
     */
    public function up(): void
    {
        Schema::create('cod_payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('store_id');
            $table->unsignedBigInteger('customer_id')->nullable();

            // لقطة بيانات العميل وقت الطلب
            $table->string('customer_name')->nullable();
            $table->string('customer_phone')->nullable();
            $table->string('customer_email')->nullable();

            // المبالغ
            $table->decimal('total_amount', 10, 2);          // إجمالي الطلب المستحق عند الاستلام
            $table->decimal('cod_fee', 10, 2)->default(0);   // رسوم الدفع عند الاستلام (إن وجدت)
            $table->decimal('amount_collected', 10, 2)->default(0); // المحصّل حتى الآن
            $table->decimal('amount_remaining', 10, 2)->default(0); // المتبقي (يُحسب عند الإنشاء)

            // الحالة
            $table->enum('status', ['pending', 'partial', 'paid', 'failed', 'cancelled', 'returned'])
                ->default('pending');

            // شركة التوصيل
            $table->string('delivery_company')->nullable();
            $table->string('delivery_tracking_number')->nullable();

            $table->text('notes')->nullable();
            $table->timestamp('collected_at')->nullable(); // تاريخ اكتمال التحصيل
            $table->timestamps();

            // المفاتيح الأجنبية
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');

            // فهارس
            $table->index(['store_id', 'status']);
            $table->index(['order_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cod_payments');
    }
};

