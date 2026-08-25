<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shippings', function (Blueprint $table) {
            if (!Schema::hasColumn('shippings', 'courier_integration_id')) {
                $table->foreignId('courier_integration_id')->nullable()->after('store_id')->constrained('store_courier_integrations')->nullOnDelete();
            }
            if (!Schema::hasColumn('shippings', 'fulfillment_type')) {
                $table->string('fulfillment_type', 30)->default('manual')->after('delivery_method'); // manual, personal, courier
            }
            if (!Schema::hasColumn('shippings', 'courier_service_type')) {
                $table->string('courier_service_type', 50)->nullable()->after('courier_integration_id');
            }
            if (!Schema::hasColumn('shippings', 'courier_price_mode')) {
                $table->string('courier_price_mode', 20)->default('api')->after('courier_service_type'); // api, fixed, free
            }
            if (!Schema::hasColumn('shippings', 'courier_fixed_price')) {
                $table->decimal('courier_fixed_price', 10, 2)->nullable()->after('courier_price_mode');
            }
        });
    }

    public function down(): void
    {
        Schema::table('shippings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('courier_integration_id');
            $table->dropColumn(['fulfillment_type', 'courier_service_type', 'courier_price_mode', 'courier_fixed_price']);
        });
    }
};
