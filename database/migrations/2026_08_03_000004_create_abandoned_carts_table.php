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
        Schema::create('abandoned_carts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->string('session_id')->nullable();
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->string('customer_email')->nullable();
            $table->string('customer_phone')->nullable();
            $table->string('customer_name')->nullable();
            $table->json('cart_items')->nullable();
            $table->decimal('cart_total', 10, 2)->default(0);
            $table->enum('status', ['new', 'reminder_sent', 'recovered', 'expired', 'unsubscribed'])->default('new');
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamp('reminder_sent_at')->nullable();
            $table->timestamp('recovered_at')->nullable();
            $table->unsignedBigInteger('recovered_order_id')->nullable();
            $table->integer('reminder_count')->default(0);
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->foreign('recovered_order_id')->references('id')->on('orders')->onDelete('set null');

            $table->index(['store_id', 'status']);
            $table->index(['store_id', 'last_activity_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('abandoned_carts');
    }
};

