<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add the "enable_theme_editor" plan feature.
     *
     * Manual template editing (the store appearance / code editor) is a
     * Professional-only feature, mirroring the existing enable_* plan flags.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('plans', 'enable_theme_editor')) {
            Schema::table('plans', function (Blueprint $table) {
                $table->string('enable_theme_editor')->default('off');
            });
        }

        DB::table('plans')->where('name', 'Professional')->update(['enable_theme_editor' => 'on']);
        DB::table('plans')->whereIn('name', ['Starter', 'Growth'])->update(['enable_theme_editor' => 'off']);
    }

    public function down(): void
    {
        if (Schema::hasColumn('plans', 'enable_theme_editor')) {
            Schema::table('plans', function (Blueprint $table) {
                $table->dropColumn('enable_theme_editor');
            });
        }
    }
};
