<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Auditable stock-movement ledger (Phase 1 POS + unified inventory).
     *
     * Every stock mutation (online sale, POS sale, cancel/fail restock, return
     * restock, manual adjustment) records an immutable row here so merchants can
     * audit HOW stock changed and WHY. It is NOT a separate stock truth — the
     * authoritative quantity stays on products.stock / variant_combinations[*].stock.
     *
     * store_id is always carried explicitly so Store A movements can never leak
     * into Store B.
     */
    public function up(): void
    {
        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->unsignedBigInteger('product_id')->nullable();
            // Variant identity — combination JSON ids can regenerate, but uuid is
            // stable. We store both for read convenience + stable lookup.
            $table->string('variant_uuid', 100)->nullable();
            $table->string('variant_combination_id', 100)->nullable();
            // Signed delta: negative = consumption, positive = replenishment/adjustment-up
            $table->integer('quantity_delta');
            // Canonical movement type (see InventoryMovement ::MOVEMENT_* constants)
            $table->string('movement_type', 40);
            // Generic reference e.g. order type+id, return id, import batch
            $table->string('reference_type', 40)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('reference_number', 100)->nullable();
            // Stock before/after this movement (NULL when not determinable e.g. import set)
            $table->integer('before_quantity')->nullable();
            $table->integer('after_quantity')->nullable();
            // Who caused it, when attributable
            $table->string('actor_type', 20)->nullable(); // user | customer | system
            $table->unsignedBigInteger('actor_id')->nullable();
            // Optional safe free-text note (server-derived, never raw client text)
            $table->string('note', 500)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('store_id');
            $table->index('product_id');
            $table->index('variant_uuid');
            $table->index('variant_combination_id');
            $table->index('movement_type');
            $table->index(['store_id', 'reference_type', 'reference_id']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_movements');
    }
};
