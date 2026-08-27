<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'idempotency_key')) {
            try {
                DB::statement('DROP INDEX orders_store_id_idempotency_key_index ON orders');
            } catch (\Throwable $e) {}
            try {
                Schema::table('orders', function (Blueprint $table) {
                    $table->unique(['store_id', 'idempotency_key'], 'orders_store_id_idempotency_unique');
                });
            } catch (\Throwable $e) {}
        }

        if (Schema::hasTable('users') && !Schema::hasColumn('users', 'storage_used')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedBigInteger('storage_used')->default(0)->after('storage_limit');
            });
            try {
                DB::statement('UPDATE users SET storage_used = storage_limit WHERE storage_used = 0 AND storage_limit IS NOT NULL');
            } catch (\Throwable $e) {}
        }

        if (Schema::hasTable('media') && Schema::hasColumn('media', 'store_id')) {
            try {
                DB::statement('CREATE INDEX media_store_id_size_index ON media (store_id, size)');
            } catch (\Throwable $e) {}
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            try { DB::statement('DROP INDEX orders_store_id_idempotency_unique ON orders'); } catch (\Throwable $e) {}
            try {
                Schema::table('orders', function (Blueprint $table) {
                    $table->index(['store_id', 'idempotency_key']);
                });
            } catch (\Throwable $e) {}
        }
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'storage_used')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('storage_used');
            });
        }
    }
};
