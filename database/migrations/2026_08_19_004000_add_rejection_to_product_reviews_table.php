<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add rejection state to product reviews so admins can reject reviews separately from pending approvals.
     */
    public function up(): void
    {
        Schema::table('product_reviews', function (Blueprint $table) {
            $table->boolean('is_rejected')->default(false)->after('is_approved')->comment('Whether the review was rejected by the store admin');
        });

        Schema::table('product_reviews', function (Blueprint $table) {
            $table->index(['store_id', 'is_rejected']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_reviews', function (Blueprint $table) {
            $table->dropIndex(['store_id', 'is_rejected']);
            $table->dropColumn('is_rejected');
        });
    }
};