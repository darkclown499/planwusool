<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('fee', 10, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->string('est_time_text')->nullable();
            $table->decimal('free_delivery_threshold', 10, 2)->nullable();
            $table->decimal('min_order_amount', 10, 2)->nullable();
            $table->timestamps();

            $table->index(['store_id', 'is_active']);
            $table->index(['store_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_zones');
    }
};
