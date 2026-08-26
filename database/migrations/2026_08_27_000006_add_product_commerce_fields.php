<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'cost_price')) {
                $table->decimal('cost_price', 10, 2)->nullable()->after('sale_price');
            }
            if (!Schema::hasColumn('products', 'is_tax_included')) {
                $table->boolean('is_tax_included')->default(true)->after('is_downloadable');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'cost_price')) {
                $table->dropColumn('cost_price');
            }
            if (Schema::hasColumn('products', 'is_tax_included')) {
                $table->dropColumn('is_tax_included');
            }
        });
    }
};
