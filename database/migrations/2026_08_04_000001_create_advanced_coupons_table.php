<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * الجدول الرئيسي لنظام الكوبونات المتقدمة.
     * يدعم: مبلغ ثابت، نسبة مئوية، شحن مجاني، Buy 1 Get 1
     * مع قيود مالية، استخدام، نطاق تطبيق، مناطق جغرافية، وجمهور/وقت.
     */
    public function up(): void
    {
        Schema::create('advanced_coupons', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');

            // التعريف العام
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('code')->nullable(); // null → يُولَّد تلقائياً
            $table->string('code_type')->default('manual'); // manual | auto

            // نوع الخصم
            $table->enum('discount_type', ['fixed', 'percentage', 'free_shipping', 'buy_one_get_one'])
                ->default('percentage');

            // القيمة: مبلغ ثابت أو نسبة مئوية
            $table->decimal('discount_value', 10, 2)->default(0);

            // حماية هامش الربح: الحد الأقصى لقيمة الخصم عند استخدام النسبة المئوية
            $table->decimal('max_discount_amount', 10, 2)->nullable();

            // إعدادات Buy 1 Get 1
            $table->unsignedBigInteger('bogo_product_id')->nullable(); // منتج محدد (اختياري)
            $table->integer('bogo_quantity')->default(1);      // الكمية المطلوب شراؤها
            $table->integer('bogo_free_quantity')->default(1); // الكمية المجانية

            // القيود المالية
            $table->decimal('minimum_order_amount', 10, 2)->default(0);

            // قيود الاستخدام
            $table->integer('usage_limit')->nullable();       // سقف الاستخدام الإجمالي (null = غير محدود)
            $table->integer('per_customer_limit')->nullable(); // حد استخدام العميل الواحد (null = غير محدود)
            $table->integer('used_count')->default(0);

            // نطاق التطبيق
            $table->boolean('exclude_on_sale_items')->default(false); // استثناء المنتجات المخفضة حالياً (منع تراكم الخصومات)
            $table->boolean('first_order_only')->default(false);      // كوبون للطلبات الأولى فقط (عملاء جدد)

            // الوقت
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('expires_at')->nullable();

            $table->boolean('status')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();

            $table->timestamps();

            // المفاتيح الأجنبية
            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->foreign('bogo_product_id')->references('id')->on('products')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');

            // الكود فريد داخل المتجر الواحد
            $table->unique(['store_id', 'code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('advanced_coupons');
    }
};

