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
        Schema::create('digital_downloads', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('store_id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->string('file_path');
            $table->string('file_name')->nullable();
            $table->string('file_size')->nullable();
            $table->string('download_token', 64)->unique();
            $table->integer('download_count')->default(0);
            $table->integer('max_downloads')->default(5);
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('last_download_at')->nullable();
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');

            $table->index(['order_id', 'product_id']);
            $table->index(['token' => 'download_token']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('digital_downloads');
    }
};

