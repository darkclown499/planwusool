<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('delivery_zone_id')->nullable()->after('shipping_method_id')->constrained('delivery_zones')->nullOnDelete();
            $table->foreignId('delivery_driver_id')->nullable()->after('delivery_zone_id')->constrained('delivery_drivers')->nullOnDelete();
            $table->string('delivery_zone_name')->nullable()->after('delivery_driver_id');
            $table->decimal('delivery_fee', 10, 2)->default(0)->after('delivery_zone_name');
            $table->string('delivery_status', 30)->default('unassigned')->after('delivery_fee');
            $table->timestamp('delivery_assigned_at')->nullable()->after('delivery_status');

            $table->index(['store_id', 'delivery_status']);
            $table->index(['store_id', 'delivery_driver_id', 'delivery_status']);
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('delivery_zone_id');
            $table->dropConstrainedForeignId('delivery_driver_id');
            $table->dropColumn(['delivery_zone_name', 'delivery_fee', 'delivery_status', 'delivery_assigned_at']);
        });
    }
};
