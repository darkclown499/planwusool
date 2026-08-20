<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Schema-driven theme config (theme.config.json) for engine themes.
     * Holds the runtime styling/layout/commerce/features/content used by the
     * ThemeEngine storefront so applied themes fully reflect on store subdomains.
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->json('theme_config')->nullable()->after('theme');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('theme_config');
        });
    }
};