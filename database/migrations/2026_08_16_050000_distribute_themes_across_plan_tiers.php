<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * The template catalog was consolidated into the 14 builder templates,
     * all of which are free. Every plan therefore unlocks the full catalog
     * via the "all" marker; per-plan theme restriction lists remain available
     * through the admin UI when paid tiers are re-introduced.
     */
    public function up(): void
    {
        DB::table('plans')->update([
            'themes' => json_encode(['all']),
        ]);
    }

    public function down(): void
    {
        // Not reversible by design.
    }
};