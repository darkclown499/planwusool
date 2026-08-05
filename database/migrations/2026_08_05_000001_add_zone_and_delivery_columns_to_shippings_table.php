<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shippings', function (Blueprint $table) {
            $table->foreignId('country_id')->nullable()->constrained('countries')->nullOnDelete();
            $table->foreignId('city_id')->nullable()->constrained('cities')->nullOnDelete();
            $table->boolean('all_regions')->default(true);
            $table->string('delivery_method')->nullable();
            $table->string('delivery_company')->nullable();
            $table->string('currency', 10)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('shippings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('country_id');
            $table->dropConstrainedForeignId('city_id');
            $table->dropColumn(['all_regions', 'delivery_method', 'delivery_company', 'currency']);
        });
    }
};
