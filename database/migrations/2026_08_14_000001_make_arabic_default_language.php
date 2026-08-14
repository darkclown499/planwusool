<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Arabic is the default language for the whole app: make it the default
     * for the users.lang column and flip existing users that are still on the
     * old English default.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('lang')->default('ar')->nullable()->change();
        });

        DB::table('users')->where('lang', 'en')->update(['lang' => 'ar']);
    }

    public function down(): void
    {
        DB::table('users')->where('lang', 'ar')->update(['lang' => 'en']);

        Schema::table('users', function (Blueprint $table) {
            $table->string('lang')->default('en')->nullable()->change();
        });
    }
};
