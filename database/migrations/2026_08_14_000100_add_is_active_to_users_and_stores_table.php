<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('is_active')->default(true)->after('plan_is_active');
            });
        }

        if (! Schema::hasColumn('stores', 'is_active')) {
            Schema::table('stores', function (Blueprint $table) {
                $table->boolean('is_active')->default(true)->after('user_id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_active');
        });

        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn('is_active');
        });
    }
};
