<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('abandoned_carts', function (Blueprint $table) {
            if (!Schema::hasColumn('abandoned_carts', 'recovery_token')) {
                $table->string('recovery_token', 64)->nullable()->unique()->after('status');
            }
            if (!Schema::hasColumn('abandoned_carts', 'abandoned_at')) {
                $table->timestamp('abandoned_at')->nullable()->after('recovery_token');
            }
            if (!Schema::hasColumn('abandoned_carts', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('abandoned_at');
            }
            // Expand enum to include 'abandoned' if needed (MySQL enum alteration)
            // We keep string type for flexibility; ensure index
            $table->index(['recovery_token']);
            $table->index(['store_id', 'abandoned_at']);
        });
        // For MySQL enum column - alter to include 'abandoned'
        try {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE abandoned_carts MODIFY status ENUM('new','reminder_sent','recovered','expired','unsubscribed','abandoned','draft') DEFAULT 'new'");
        } catch (\Throwable $e) {
            // Fallback for SQLite / other - ignore
        }
    }

    public function down(): void
    {
        Schema::table('abandoned_carts', function (Blueprint $table) {
            $table->dropIndex(['recovery_token']);
            $table->dropIndex(['store_id', 'abandoned_at']);
            if (Schema::hasColumn('abandoned_carts', 'recovery_token')) {
                $table->dropColumn('recovery_token');
            }
            if (Schema::hasColumn('abandoned_carts', 'abandoned_at')) {
                $table->dropColumn('abandoned_at');
            }
            if (Schema::hasColumn('abandoned_carts', 'expires_at')) {
                $table->dropColumn('expires_at');
            }
        });
        try {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE abandoned_carts MODIFY status ENUM('new','reminder_sent','recovered','expired','unsubscribed') DEFAULT 'new'");
        } catch (\Throwable $e) {}
    }
};
