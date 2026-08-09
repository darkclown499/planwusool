<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add a per-store JSON content blob used by the banner/content system.
 * Stores structured, repeatable content (announcement bar, features,
 * testimonials, FAQs) that renders on the storefront pages.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->json('store_content')->nullable()->after('design_tokens');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('store_content');
        });
    }
};
