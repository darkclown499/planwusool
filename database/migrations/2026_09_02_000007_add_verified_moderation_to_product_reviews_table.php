<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_reviews', function (Blueprint $table) {
            // Provenance: which purchased line-item this review is anchored to.
            // Server-computed during submission so the "verified purchase" badge
            // can never be forged by client-supplied flags.
            $table->unsignedBigInteger('order_item_id')->nullable()->after('order_id');

            // Merchant moderation (Option A: valid verified reviews auto-publish,
            // merchant hides problematic ones with a required reason).
            $table->string('hide_reason')->nullable()->after('is_rejected');

            // Timestamp the merchant actually replied (distinct from "has text").
            $table->timestamp('merchant_replied_at')->nullable()->after('admin_reply');
        });

        Schema::table('product_reviews', function (Blueprint $table) {
            $table->foreign('order_item_id')->references('id')->on('order_items')->onDelete('set null');
            // One active review per (store, product, customer) — verified purchase
            // reviews update in place. NULL customer_id rows (legacy guests) are
            // still allowed by SQLite/MySQL unique semantics.
            $table->unique(['store_id', 'product_id', 'customer_id'], 'product_reviews_customer_unique');
        });

        // Defensive dedupe: if legacy data already has multiple reviews from the
        // same customer for the same product, keep the most recent one only so
        // the partial unique index above applies cleanly.
        $dupes = DB::table('product_reviews as r1')
            ->join('product_reviews as r2', function ($join) {
                $join->on('r1.store_id', '=', 'r2.store_id')
                    ->on('r1.product_id', '=', 'r2.product_id')
                    ->on('r1.customer_id', '=', 'r2.customer_id');
            })
            ->whereNotNull('r1.customer_id')
            ->whereRaw('r1.created_at < r2.created_at')
            ->distinct()
            ->pluck('r1.id');

        foreach ($dupes->chunk(500) as $ids) {
            DB::table('product_reviews')->whereIn('id', $ids)->delete();
        }
    }

    public function down(): void
    {
        Schema::table('product_reviews', function (Blueprint $table) {
            $table->dropUnique('product_reviews_customer_unique');
            $table->dropForeign(['order_item_id']);
            $table->dropColumn(['order_item_id', 'hide_reason', 'merchant_replied_at']);
        });
    }
};