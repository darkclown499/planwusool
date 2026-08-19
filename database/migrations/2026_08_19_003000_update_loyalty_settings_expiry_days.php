<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Convert loyalty points expiry from months to days and add a customer reminder setting.
     */
    public function up(): void
    {
        Schema::table('loyalty_settings', function (Blueprint $table) {
            $table->integer('expiry_days')->default(90)->after('expiry_months')->comment('Points validity in days from earning');
            $table->integer('expiry_reminder_days')->default(7)->after('expiry_days')->comment('Notify the customer this many days before their points expire');
        });

        DB::table('loyalty_settings')->get(['id', 'expiry_months'])->each(function ($row) {
            DB::table('loyalty_settings')->where('id', $row->id)->update([
                'expiry_days' => max(1, min(3650, (int) ($row->expiry_months ?: 1) * 30)),
                'expiry_reminder_days' => 7,
            ]);
        });

        Schema::table('loyalty_settings', function (Blueprint $table) {
            $table->dropColumn('expiry_months');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loyalty_settings', function (Blueprint $table) {
            $table->integer('expiry_months')->default(12)->comment('Points validity in months from earning');
        });

        DB::table('loyalty_settings')->get(['id', 'expiry_days'])->each(function ($row) {
            DB::table('loyalty_settings')->where('id', $row->id)->update([
                'expiry_months' => max(1, (int) round((int) ($row->expiry_days ?: 90) / 30)),
            ]);
        });

        Schema::table('loyalty_settings', function (Blueprint $table) {
            $table->dropColumn(['expiry_days', 'expiry_reminder_days']);
        });
    }
};