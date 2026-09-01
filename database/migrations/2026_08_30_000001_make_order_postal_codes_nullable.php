<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Repair production schema drift: local orders routinely carry no postal
     * code, but some production databases enforce NOT NULL on these columns
     * even though the original migration declared them nullable — turning any
     * postal-code-less order into a 500 with a raw SQL leak.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('shipping_postal_code')->nullable()->change();
            $table->string('billing_postal_code')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('shipping_postal_code')->nullable(false)->change();
            $table->string('billing_postal_code')->nullable(false)->change();
        });
    }
};