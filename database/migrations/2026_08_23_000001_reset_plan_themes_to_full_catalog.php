<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Production data fix: installs that already ran the old (stale) version
     * of 2026_08_16_050000 carry legacy template slugs ("core-minimal",
     * "growth-*", "pro-*") in plans.themes. The catalog has since been
     * consolidated into the free builder templates, so every plan now unlocks
     * the full catalog via the "all" marker. Runtime normalizers already map
     * legacy slugs defensively; this migration repairs the stored values.
     */
    public function up(): void
    {
        DB::table('plans')->update([
            'themes' => json_encode(['all']),
        ]);
    }

    public function down(): void
    {
        // Not reversible by design — restoring stale slug lists would lock
        // merchants out of templates they are entitled to.
    }
};
