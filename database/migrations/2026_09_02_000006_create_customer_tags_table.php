<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lightweight per-store merchant tags (VIP, زبون دائم, جملة, ...).
     *
     * Each row carries store_id explicitly — Store A tags can never leak into
     * Store B. Tags are merchant-managed; system indicators (repeat customer,
     * has cancelled orders) are always derived at query time and never stored.
     */
    public function up(): void
    {
        Schema::create('customer_tags', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->string('customer_ref', 190);
            $table->string('name', 60);
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->unique(['store_id', 'customer_ref', 'name'], 'customer_tags_store_ref_name_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_tags');
    }
};