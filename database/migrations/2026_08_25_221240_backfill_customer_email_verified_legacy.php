<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public const ENFORCED_AT = '2026-08-26 00:00:00';

    public function up(): void
    {
        // Deterministic cutoff: customers created before OTP feature rollout are considered legacy verified.
        // Guest checkout never creates customers (customer_id=null in orders), so all rows in customers are real accounts.
        // This is a one-time backfill, idempotent and non-destructive.
        $enforcedAt = self::ENFORCED_AT;
        \DB::table('customers')
            ->whereNull('email_verified_at')
            ->where('created_at', '<', $enforcedAt)
            ->update(['email_verified_at' => \DB::raw('created_at')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            //
        });
    }
};
