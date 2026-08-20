<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_erp_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('provider', 32)->default('custom'); // odoo | al_shamel | custom
            $table->string('name', 120)->nullable();
            $table->string('api_endpoint')->nullable();
            $table->text('api_key')->nullable();
            $table->string('api_username')->nullable();
            $table->string('api_password')->nullable();
            $table->json('sync_settings')->nullable(); // {sync_quantity, sync_prices, sync_images, sync_product_details, sync_orders}
            $table->string('auto_sync_interval', 16)->default('realtime'); // realtime | hourly | daily
            $table->boolean('is_active')->default(false);
            $table->timestamp('last_sync_at')->nullable();
            $table->string('last_sync_status', 16)->default('never'); // never | success | failed
            $table->text('last_sync_error')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_erp_configs');
    }
};