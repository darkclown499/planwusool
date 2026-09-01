<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phase 2 — COD settlement batches.
     *
     * cod_settlements: a merchant creates a batch of pending COD payments (typically handed
     * to a courier), optionally applies courier fees + manual adjustments, then confirms
     * the settlement. Confirming marks every included COD payment as collected and flips
     * the matching orders to paid — exactly once (idempotent).
     *
     * cod_settlement_items: rows per included COD payment. cod_payment_id is UNIQUE so the
     * database itself blocks a COD payment from ever being settled into two batches.
     */
    public function up(): void
    {
        Schema::create('cod_settlements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');

            $table->string('reference')->unique();
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->string('courier_company')->nullable();

            $table->decimal('gross_amount', 12, 2)->default(0);   // sum of included amount_remaining
            $table->decimal('courier_fees', 12, 2)->default(0);
            $table->decimal('adjustment', 12, 2)->default(0);     // +/- manual correction
            $table->decimal('net_amount', 12, 2)->default(0);     // gross + adjustment - fees

            $table->enum('status', ['draft', 'settled'])->default('draft');
            $table->unsignedBigInteger('confirmed_by')->nullable();
            $table->timestamp('settled_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->onDelete('cascade');
            $table->foreign('confirmed_by')->references('id')->on('users')->onDelete('set null');

            $table->index(['store_id', 'status']);
        });

        Schema::create('cod_settlement_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('settlement_id');
            $table->unsignedBigInteger('cod_payment_id');
            $table->unsignedBigInteger('order_id');
            $table->decimal('amount', 12, 2);

            $table->timestamps();

            $table->foreign('settlement_id')->references('id')->on('cod_settlements')->onDelete('cascade');
            $table->foreign('cod_payment_id')->references('id')->on('cod_payments')->onDelete('cascade');
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');

            $table->unique('cod_payment_id'); // blocks double settlement at the DB level
            $table->index('settlement_id');
            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cod_settlement_items');
        Schema::dropIfExists('cod_settlements');
    }
};