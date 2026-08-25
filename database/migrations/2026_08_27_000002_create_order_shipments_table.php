<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('shipping_id')->nullable()->constrained('shippings')->nullOnDelete();
            $table->foreignId('courier_integration_id')->nullable()->constrained('store_courier_integrations')->nullOnDelete();
            $table->string('provider', 50);
            $table->string('external_id')->nullable();
            $table->string('tracking_number')->nullable();
            $table->string('tracking_url')->nullable();
            $table->string('label_url')->nullable();
            $table->string('status', 30)->default('pending'); // pending, created, picked_up, in_transit, out_for_delivery, delivered, failed, returned, cancelled
            $table->string('provider_status')->nullable();
            $table->json('payload_snapshot')->nullable();
            $table->text('last_error')->nullable();
            $table->unsignedInteger('attempt_count')->default(0);
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();

            $table->unique(['order_id', 'courier_integration_id']);
            $table->index(['store_id', 'status']);
            $table->index(['tracking_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_shipments');
    }
};
