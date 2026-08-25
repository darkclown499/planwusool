<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_courier_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('provider', 50); // e.g. aramex, dhl, mock
            $table->string('display_name')->nullable();
            $table->text('credentials')->nullable(); // encrypted
            $table->json('settings')->nullable(); // service type, cod handling etc
            $table->string('status', 20)->default('not_connected'); // not_connected, testing, connected, error, disabled
            $table->text('last_error')->nullable();
            $table->timestamp('last_tested_at')->nullable();
            $table->boolean('auto_submit_orders')->default(false);
            $table->boolean('auto_sync_status')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['store_id', 'provider']);
            $table->index(['store_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_courier_integrations');
    }
};
