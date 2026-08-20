<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('provider', 32)->default('custom');
            $table->string('entity_type', 16)->default('product'); // product | stock | order
            $table->string('reference', 191)->nullable(); // matched sku/barcode
            $table->string('status', 16)->default('success'); // success | failed
            $table->text('message')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'synced_at']);
            $table->index(['store_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_sync_logs');
    }
};