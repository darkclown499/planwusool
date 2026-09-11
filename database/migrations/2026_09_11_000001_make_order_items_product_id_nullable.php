<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * P1-4 launch blocker: product deletion must not cascade-destroy historical
 * order_items (sales history / analytics). Sever the link instead (SET NULL)
 * while keeping product_id nullable. Forward-only: do not edit the original
 * order_items migration (2025_01_31_120001).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->unsignedBigInteger('product_id')->nullable()->change();
            $table->foreign('product_id')->references('id')->on('products')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
        });

        // Safe rollback: never re-add NOT NULL while null product_id rows exist,
        // and never fabricate or delete history.
        $hasOrphaned = DB::table('order_items')->whereNull('product_id')->exists();

        if (!$hasOrphaned) {
            Schema::table('order_items', function (Blueprint $table) {
                $table->unsignedBigInteger('product_id')->nullable(false)->change();
            });
        }

        Schema::table('order_items', function (Blueprint $table) {
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });
    }
};