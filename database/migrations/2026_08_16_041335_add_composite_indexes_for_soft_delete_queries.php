<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add composite indexes for the most common store-scoped queries.
     *
     * These indexes significantly speed up storefront and admin queries:
     *   - WHERE store_id = ? AND is_active = true
     *   - WHERE store_id = ? AND category_id = ? AND is_active = true
     *   - WHERE store_id = ? AND (session_id = ? OR customer_id = ?)
     *   - WHERE store_id = ? AND status = ? AND payment_status = ?
     *
     * Note: These tables use a soft-disable flag (is_active) rather than
     * Eloquent SoftDeletes (no deleted_at column), so indexing focuses on
     * active-flag + store-scope combinations.
     */
    public function up(): void
    {
        // Products: store + active + category lookups (catalog & admin)
        Schema::table('products', function (Blueprint $table) {
            $table->index(['store_id', 'is_active'], 'idx_products_store_active');
            $table->index(['store_id', 'category_id', 'is_active'], 'idx_products_store_cat_active');
        });

        // Categories: store + parent + active + sort for nested navigation
        Schema::table('categories', function (Blueprint $table) {
            $table->index(['store_id', 'is_active'], 'idx_categories_store_active');
            $table->index(['store_id', 'parent_id', 'is_active', 'sort_order'], 'idx_categories_store_parent_active_sort');
        });

        // Orders: store + session/customer lookups and status filtering
        Schema::table('orders', function (Blueprint $table) {
            if (! Schema::hasIndex('orders', 'idx_orders_store_session')) {
                $table->index(['store_id', 'session_id'], 'idx_orders_store_session');
            }
            if (! Schema::hasIndex('orders', 'idx_orders_store_customer')) {
                $table->index(['store_id', 'customer_id'], 'idx_orders_store_customer');
            }
            if (! Schema::hasIndex('orders', 'idx_orders_store_status_payment')) {
                $table->index(['store_id', 'status', 'payment_status'], 'idx_orders_store_status_payment');
            }
        });

        // Cart items: store + session/customer lookups (already partly indexed)
        Schema::table('cart_items', function (Blueprint $table) {
            if (! Schema::hasIndex('cart_items', 'idx_cart_store_session_customer')) {
                $table->index(['store_id', 'session_id', 'customer_id'], 'idx_cart_store_session_customer');
            }
        });

        // Wishlist: store + session/customer lookups + product
        Schema::table('wishlist_items', function (Blueprint $table) {
            $table->index(['store_id', 'product_id'], 'idx_wishlist_store_product');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_store_active');
            $table->dropIndex('idx_products_store_cat_active');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropIndex('idx_categories_store_active');
            $table->dropIndex('idx_categories_store_parent_active_sort');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('idx_orders_store_session');
            $table->dropIndex('idx_orders_store_customer');
            $table->dropIndex('idx_orders_store_status_payment');
        });

        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropIndex('idx_cart_store_session_customer');
        });

        Schema::table('wishlist_items', function (Blueprint $table) {
            $table->dropIndex('idx_wishlist_store_product');
        });
    }
};
