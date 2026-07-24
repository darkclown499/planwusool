<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->string('domain_type')->default('subdomain')->after('duration');
            $table->integer('support_hours')->default(0)->after('domain_type');
            $table->integer('max_warehouses')->default(0)->after('max_products_per_store');
            $table->string('enable_mobile_app')->default('off')->after('enable_shipping_method');
            $table->string('support_type')->default('email')->after('support_hours');
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['domain_type', 'support_hours', 'max_warehouses', 'enable_mobile_app', 'support_type']);
        });
    }
};
