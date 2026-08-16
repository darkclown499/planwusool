<?php

namespace App\Services;

use App\Models\AdvancedCoupon;
use App\Models\StoreCoupon;
use App\Services\AdvancedCouponService;
use Illuminate\Support\Collection;

/**
 * Unified coupon service — a single facade over the legacy StoreCoupon
 * and the AdvancedCoupon systems.
 *
 * During the migration window both systems coexist; this service provides a
 * single lookup/validation entry point that resolves a coupon by code from
 * whichever system owns it, so calling code no longer needs to know which
 * system a coupon belongs to.
 */
class CouponService
{
    public function __construct(
        protected AdvancedCouponService $advancedCouponService
    ) {}

    /**
     * Resolve a coupon by code within a given store.
     * Prefers the advanced system, falls back to the legacy system.
     *
     * @return array{system: string, model: StoreCoupon|AdvancedCoupon|null, config: array}
     */
    public function resolve(string $code, int $storeId): array
    {
        $code = trim($code);
        if ($code === '') {
            return ['system' => 'none', 'model' => null, 'config' => []];
        }

        // Prefer advanced system (the canonical target post-migration).
        $advanced = AdvancedCoupon::where('store_id', $storeId)
            ->where('code', $code)
            ->first();
        if ($advanced) {
            return [
                'system' => 'advanced',
                'model' => $advanced,
                'config' => $this->advancedCouponService->describe($advanced),
            ];
        }

        // Fallback to legacy system.
        $legacy = StoreCoupon::where('store_id', $storeId)
            ->where('code', $code)
            ->first();
        if ($legacy) {
            return [
                'system' => 'legacy',
                'model' => $legacy,
                'config' => $this->describeLegacy($legacy),
            ];
        }

        return ['system' => 'none', 'model' => null, 'config' => []];
    }

    /**
     * List all coupons across both systems for a store, normalized.
     *
     * @return Collection
     */
    public function listForStore(int $storeId): Collection
    {
        $advanced = AdvancedCoupon::where('store_id', $storeId)->get()
            ->map(fn ($c) => array_merge(
                ['system' => 'advanced', 'id' => $c->id],
                $this->advancedCouponService->describe($c)
            ));

        $legacy = StoreCoupon::where('store_id', $storeId)->get()
            ->map(fn ($c) => array_merge(
                ['system' => 'legacy', 'id' => $c->id],
                $this->describeLegacy($c)
            ));

        return $advanced->merge($legacy);
    }

    /**
     * Check whether a code is already in use in either system.
     */
    public function codeExists(string $code, int $storeId, ?int $excludeAdvancedId = null, ?int $excludeLegacyId = null): bool
    {
        $advancedQuery = AdvancedCoupon::where('store_id', $storeId)->where('code', $code);
        if ($excludeAdvancedId) {
            $advancedQuery->where('id', '!=', $excludeAdvancedId);
        }
        if ($advancedQuery->exists()) {
            return true;
        }

        $legacyQuery = StoreCoupon::where('store_id', $storeId)->where('code', $code);
        if ($excludeLegacyId) {
            $legacyQuery->where('id', '!=', $excludeLegacyId);
        }
        return $legacyQuery->exists();
    }

    /**
     * Normalized description for a legacy coupon.
     */
    protected function describeLegacy(StoreCoupon $coupon): array
    {
        $discountType = match ($coupon->type) {
            'percentage', 'Percent' => 'percentage',
            'free_shipping', 'FreeShipping' => 'free_shipping',
            default => 'fixed',
        };

        return [
            'name' => $coupon->name,
            'code' => $coupon->code,
            'code_type' => $coupon->code_type,
            'discount_type' => $discountType,
            'discount_value' => $coupon->discount_type === 'percent'
                ? (float) $coupon->discount_amount
                : (float) $coupon->discount_amount,
            'minimum_order_amount' => (float) ($coupon->minimum_spend ?? 0),
            'usage_limit' => $coupon->use_limit_per_coupon,
            'per_customer_limit' => $coupon->use_limit_per_user,
            'used_count' => (int) $coupon->used_count,
            'starts_at' => $coupon->start_date,
            'expires_at' => $coupon->expiry_date,
            'status' => (bool) $coupon->status,
            'store_id' => $coupon->store_id,
        ];
    }
}
