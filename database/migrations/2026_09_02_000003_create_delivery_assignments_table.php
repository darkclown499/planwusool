<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('driver_id')->nullable()->constrained('delivery_drivers')->nullOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained('delivery_zones')->nullOnDelete();

            // Zone snapshot (historical accuracy — edits to the zone must not change past orders)
            $table->string('zone_name_snapshot')->nullable();
            $table->decimal('delivery_fee_snapshot', 10, 2)->default(0);

            // Delivery state machine (independent of order status & payment status)
            $table->string('delivery_status', 30)->default('assigned');
            // assigned, picked_up, out_for_delivery, delivered, delivery_failed, returned, cancelled, unassigned

            $table->string('fail_reason')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->string('assigned_by_user_id')->nullable()->index();

            $table->timestamp('assigned_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('out_for_delivery_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index(['store_id', 'delivery_status']);
            $table->index(['store_id', 'driver_id', 'delivery_status']);
            $table->index(['order_id']);
            $table->index(['driver_id', 'delivered_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_assignments');
    }
};
