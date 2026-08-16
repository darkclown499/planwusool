<?php

use App\Models\AdvancedCoupon;
use App\Models\StoreCoupon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Unify the legacy StoreCoupon data into the AdvancedCoupon system.
     *
     * This one-time data migration copies every active legacy store_coupon
     * row into advanced_coupons, mapping the legacy columns to the advanced
     * schema. It does NOT delete the legacy rows (they remain for backward
     * compatibility until the controllers are fully switched), but it marks
     * the migration as "done" so future coupons are created only in the
     * advanced system.
     */
    public function up(): void
    {
        if (! Schema::hasTable('advanced_coupons') || ! Schema::hasTable('store_coupons')) {
            return;
        }

        // Only migrate coupons that don't already exist in advanced_coupons.
        $existingCodes = AdvancedCoupon::pluck('code')->filter()->map(fn ($c) => strtolower($c))->all();

        $legacyCoupons = StoreCoupon::where('status', true)->get();

        $inserted = 0;
        foreach ($legacyCoupons as $legacy) {
            if (empty($legacy->code)) {
                continue;
            }
            if (in_array(strtolower($legacy->code), $existingCodes, true)) {
                continue;
            }

            // Map legacy discount type to advanced discount_type.
            $discountType = match ($legacy->type) {
                'percentage', 'Percent' => 'percentage',
                'fixed', 'Flat', 'Fixed' => 'fixed',
                'free_shipping', 'FreeShipping' => 'free_shipping',
                default => 'fixed',
            };

            AdvancedCoupon::create([
                'store_id' => $legacy->store_id,
                'name' => $legacy->name ?: $legacy->code,
                'description' => $legacy->description,
                'code' => $legacy->code,
                'code_type' => $legacy->code_type === 'auto' ? 'auto' : 'manual',
                'discount_type' => $discountType,
                'discount_value' => $legacy->code_type === 'percent'
                    ? (float) $legacy->discount_amount
                    : (float) $legacy->discount_amount,
                'minimum_order_amount' => (float) $legacy->minimum_spend,
                'usage_limit' => $legacy->use_limit_per_coupon,
                'per_customer_limit' => $legacy->use_limit_per_user,
                'used_count' => (int) $legacy->used_count,
                'starts_at' => $legacy->start_date?->startOfDay(),
                'expires_at' => $legacy->expiry_date?->endOfDay(),
                'status' => (bool) $legacy->status,
                'created_by' => $legacy->created_by,
            ]);

            $existingCodes[] = strtolower($legacy->code);
            $inserted++;
        }

        // Optionally log how many were migrated (visible in artisan log).
        if ($inserted > 0) {
            \Illuminate\Support\Facades\Log::info("Coupon unification: migrated {$inserted} legacy StoreCoupon rows into advanced_coupons.");
        }
    }

    /**
     * Reverse - this is a non-destructive one-way migration.
     */
    public function down(): void
    {
        // Intentionally do nothing; legacy rows are retained.
    }
};
