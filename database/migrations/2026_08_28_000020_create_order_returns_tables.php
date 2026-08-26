<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add variant_uuid to order_items for stable historical mapping
        Schema::table('order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('order_items', 'variant_uuid')) {
                $table->string('variant_uuid')->nullable()->after('variant_combination_id');
            }
        });

        // Add refund aggregation to orders (no auto-restock coupling)
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'refunded_amount')) {
                $table->decimal('refunded_amount', 10, 2)->default(0)->after('total_amount');
            }
        });

        // order_returns main table
        Schema::create('order_returns', function (Blueprint $table) {
            $table->id();
            $table->string('return_number')->unique();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('customer_email')->nullable();
            // Return lifecycle: requested, approved, rejected, in_transit, received, completed, cancelled
            $table->string('status')->default('requested');
            $table->string('reason')->nullable();
            $table->text('customer_note')->nullable();
            $table->text('merchant_note')->nullable();
            // Refund tracking per return (financial)
            $table->string('refund_status')->default('none'); // none, pending, partial, refunded
            $table->decimal('refund_amount', 10, 2)->default(0);
            $table->string('refund_method')->nullable();
            $table->string('refund_reference')->nullable();
            $table->timestamp('requested_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->index(['store_id', 'status']);
            $table->index(['order_id']);
            $table->index(['customer_id']);
        });

        Schema::create('order_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('return_id')->constrained('order_returns')->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained('order_items')->cascadeOnDelete();
            $table->unsignedBigInteger('product_id')->nullable();
            $table->integer('quantity')->default(1); // returned qty requested
            $table->integer('restocked_quantity')->default(0); // physically restocked
            $table->decimal('refund_amount', 10, 2)->default(0); // per-item refund recorded
            $table->string('reason')->nullable();
            $table->string('condition')->nullable(); // good, damaged
            $table->timestamps();
            $table->index(['return_id']);
            $table->index(['order_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_return_items');
        Schema::dropIfExists('order_returns');
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'refunded_amount')) $table->dropColumn('refunded_amount');
        });
        Schema::table('order_items', function (Blueprint $table) {
            if (Schema::hasColumn('order_items', 'variant_uuid')) $table->dropColumn('variant_uuid');
        });
    }
};
