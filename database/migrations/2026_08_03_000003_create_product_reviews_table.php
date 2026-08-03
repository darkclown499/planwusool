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
        Schema::create('product_reviews', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('store_id');
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->unsignedBigInteger('order_id')->nullable();
            $table->unsignedTinyInteger('rating')->default(5)->comment('1-5 stars');
            $table->text('title')->nullable();
            $table->text('comment')->nullable();
            $table->json('images')->nullable();
            $table->boolean('is_approved')->default(true);
            $table->boolean('is_verified_purchase')->default(false);
            $table->text('admin_reply')->nullable();
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('set null');

            $table->index(['product_id', 'is_approved']);
            $table->index(['store_id', 'rating']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_reviews');
    }
};

