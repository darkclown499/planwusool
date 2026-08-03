<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * جدول سجل الدفعات/الأقساط الجزئية لنظام COD.
     * يسجّل كل عملية تحصيل مبلغ على الطلب:
     * - من قام بالتحصيل (مندوب التوصيل / الأدمن)
     * - طريقة التحصيل (نقدي / جهاز كاشير / تحويل بنكي / أخرى)
     * - مرجع العملية إن وجد
     */
    public function up(): void
    {
        Schema::create('cod_payment_history', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('cod_payment_id');

            $table->decimal('amount', 10, 2); // المبلغ المحصّل في هذه الدفعة

            // طريقة التحصيل
            $table->enum('payment_method', ['cash', 'card_terminal', 'bank_transfer', 'other'])
                ->default('cash');

            // من قام بالتحصيل
            $table->string('collected_by_name')->nullable(); // اسم مندوب التوصيل / الموظف
            $table->unsignedBigInteger('collected_by_user_id')->nullable(); // حساب الأدمن إن وُجد

            $table->string('reference')->nullable(); // مرجع العملية
            $table->text('notes')->nullable();
            $table->timestamp('collected_at')->nullable();
            $table->timestamps();

            // المفاتيح الأجنبية
            $table->foreign('cod_payment_id')->references('id')->on('cod_payments')->onDelete('cascade');
            $table->foreign('collected_by_user_id')->references('id')->on('users')->onDelete('set null');

            $table->index(['cod_payment_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cod_payment_history');
    }
};

