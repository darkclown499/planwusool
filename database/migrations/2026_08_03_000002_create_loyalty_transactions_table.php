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
        Schema::create('loyalty_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->unsignedBigInteger('order_id')->nullable();
            $table->enum('type', ['earn', 'redeem', 'signup_bonus', 'review_bonus', 'adjustment', 'expired', 'refund'])->default('earn');
            $table->decimal('points', 12, 2)->comment('Positive for earned, negative for spent');
            $table->decimal('balance_after', 12, 2)->default(0)->comment('Customer balance after this transaction');
            $table->string('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('set null');

            $table->index(['store_id', 'customer_id']);
            $table->index(['customer_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loyalty_transactions');
    }
};

