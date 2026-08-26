<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'inventory_mode')) {
                // product = single quantity for whole product, variant = per-combination stock
                $table->string('inventory_mode')->default('product')->after('allow_backorder');
            }
        });

        Schema::table('order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('order_items', 'variant_combination_id')) {
                $table->string('variant_combination_id')->nullable()->after('product_variants');
            }
            if (!Schema::hasColumn('order_items', 'inventory_mode')) {
                $table->string('inventory_mode')->nullable()->after('variant_combination_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'inventory_mode')) {
                $table->dropColumn('inventory_mode');
            }
        });
        Schema::table('order_items', function (Blueprint $table) {
            $cols = [];
            if (Schema::hasColumn('order_items', 'variant_combination_id')) $cols[] = 'variant_combination_id';
            if (Schema::hasColumn('order_items', 'inventory_mode')) $cols[] = 'inventory_mode';
            if ($cols) $table->dropColumn($cols);
        });
    }
};
