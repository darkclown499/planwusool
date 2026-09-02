<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Merchant-internal CRM notes.
     *
     * Keyed by a tenant-scoped identity reference (customer_ref) instead of a
     * hard FK so BOTH canonical customers (ref "c:{id}") and guest identities
     * (ref "p:{e164}", "e:{email}", "o:{order_id}") can carry notes without
     * rewriting order or customer rows. store_id is always required and every
     * query is scoped by it, so Store A can never read/write Store B notes.
     *
     * Notes are INTERNAL to the merchant dashboard — never exposed on the
     * storefront or to customers.
     */
    public function up(): void
    {
        Schema::create('customer_notes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->string('customer_ref', 190);
            $table->text('note');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->index(['store_id', 'customer_ref'], 'customer_notes_store_ref_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_notes');
    }
};