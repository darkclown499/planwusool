<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add the last live DNS/SSL probe timestamp so the merchant UI can show
     * when a domain was last checked (and to keep recheck honest about age).
     */
    public function up(): void
    {
        Schema::table('store_domains', function (Blueprint $table) {
            $table->timestamp('last_checked_at')->nullable()->after('verified_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('store_domains', function (Blueprint $table) {
            $table->dropColumn('last_checked_at');
        });
    }
};