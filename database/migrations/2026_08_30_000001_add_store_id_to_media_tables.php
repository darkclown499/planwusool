<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('media', 'store_id')) {
            Schema::table('media', function (Blueprint $table) {
                $table->unsignedBigInteger('store_id')->nullable()->after('user_id');
                $table->foreign('store_id')->references('id')->on('stores')->onDelete('set null');
                $table->index(['store_id', 'user_id']);
            });
        }

        if (!Schema::hasColumn('media_items', 'store_id')) {
            Schema::table('media_items', function (Blueprint $table) {
                $table->unsignedBigInteger('store_id')->nullable()->after('id');
                $table->foreign('store_id')->references('id')->on('stores')->onDelete('set null');
                $table->index('store_id');
            });
        }

        // Backfill deterministically where possible: assign to user's current_store
        try {
            $rows = DB::table('media')->whereNull('store_id')->whereNotNull('user_id')->get(['id','user_id']);
            foreach ($rows as $row) {
                $user = DB::table('users')->where('id', $row->user_id)->first();
                if ($user && !empty($user->current_store)) {
                    $storeExists = DB::table('stores')->where('id', $user->current_store)->where('user_id', $user->id)->exists();
                    if ($storeExists) {
                        DB::table('media')->where('id', $row->id)->update(['store_id' => $user->current_store]);
                    }
                }
            }
            // Media items backfill from media
            $items = DB::table('media_items')->whereNull('store_id')->get(['id']);
            foreach ($items as $item) {
                $linkedStore = DB::table('media')->where('model_type', 'App\\Models\\MediaItem')->where('model_id', $item->id)->whereNotNull('store_id')->value('store_id');
                if ($linkedStore) {
                    DB::table('media_items')->where('id', $item->id)->update(['store_id' => $linkedStore]);
                }
            }
        } catch (\Throwable $e) {
            // backfill best-effort only; unassigned rows remain null and isolated by user_id fallback
        }
    }

    public function down(): void
    {
        try {
            Schema::table('media', function (Blueprint $table) {
                try { $table->dropForeign(['store_id']); } catch (\Throwable $e) {}
                try { $table->dropColumn('store_id'); } catch (\Throwable $e) {}
            });
        } catch (\Throwable $e) {}
        try {
            Schema::table('media_items', function (Blueprint $table) {
                try { $table->dropForeign(['store_id']); } catch (\Throwable $e) {}
                try { $table->dropColumn('store_id'); } catch (\Throwable $e) {}
            });
        } catch (\Throwable $e) {}
    }
};
