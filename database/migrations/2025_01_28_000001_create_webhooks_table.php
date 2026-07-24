<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhooks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('store_id')->nullable();
            $table->string('module', 50);
            $table->enum('method', ['GET', 'POST'])->default('POST');
            $table->text('url');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->index(['user_id', 'store_id']);
            $table->index(['module', 'is_active']);
            $table->unique(['user_id', 'store_id', 'module']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhooks');
    }
};