<?php

namespace App\Services;

use App\Models\AdvancedCoupon;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

/**
 * Promotion reporting (Section 18).
 *
 * Reports REAL, meaningful metrics only:
 *   - number of uses
 *   - valid order value influenced ('valid order value using this promotion')
 *   - total discount granted
 *
 * Only VALID orders count as successful promotion usage. Cancelled, failed,
 * and refunded orders are excluded, mirroring the canonical valid-order rules.
 *
 * We intentionally do NOT claim "revenue generated" / ROI — order value is
 * reported as "valid order value using this promotion".
 */
class PromotionAnalyticsService
{
    /**
     * Order statuses that are NOT considered valid/successful revenue.
     * Mirrors canonical valid-order business rules used elsewhere in CRM.
     */
    public const EXCLUDED_STATUSES = ['cancelled', 'failed', 'refunded'];

    /**
     * Aggregate analytics for every promotion in a store.
     *
     * @return array{overall: array, per_promotion: array, paginated: mixed}
     */
    public function forStore(int $storeId, ?string $search = null, ?string $statusFilter = null, int $perPage = 15): array
    {
        $query = AdvancedCoupon::where('store_id', $storeId);

        if ($search) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%"));
        }
        if ($statusFilter && $statusFilter !== 'all') {
            $query->where('status', $statusFilter === 'active');
        }

        $paginated = $query->orderByDesc('created_at')->paginate($perPage);

        $promotions = $paginated->getCollection()
            ->map(fn ($coupon) => $this->forPromotion($coupon))
            ->values()
            ->toArray();

        $overall = $this->overall($storeId);

        return [
            'overall' => $overall,
            'per_promotion' => $promotions,
            'paginated' => $paginated,
        ];
    }

    /**
     * Metrics for a single promotion.
     */
    public function forPromotion(AdvancedCoupon $coupon): array
    {
        // Uses counted from coupon_usages joined to VALID orders only.
        $base = DB::table('coupon_usages as cu')
            ->leftJoin('orders as o', 'o.id', '=', 'cu.order_id')
            ->where('cu.coupon_id', $coupon->id);

        $uses = (clone $base)
            ->whereNull('o.id')
            ->orWhereNotIn('o.status', self::EXCLUDED_STATUSES)
            ->count();

        // Total discount granted across valid orders.
        $totalDiscount = (clone $base)
            ->where(function ($q) {
                $q->whereNull('o.id')->orWhereNotIn('o.status', self::EXCLUDED_STATUSES);
            })
            ->sum('cu.discount_amount');

        // Sum of valid order totals influenced by this promotion.
        $orderValue = (clone $base)
            ->where('o.order_source', '!=', 'test')
            ->where(function ($q) {
                $q->whereNull('o.id')->orWhereNotIn('o.status', self::EXCLUDED_STATUSES);
            })
            ->sum('o.total_amount');

        return [
            'id' => $coupon->id,
            'name' => $coupon->name,
            'code' => $coupon->code,
            'code_type' => $coupon->code_type,
            'discount_type' => $coupon->discount_type,
            'status' => (bool) $coupon->status,
            'starts_at' => $coupon->starts_at,
            'expires_at' => $coupon->expires_at,
            'used_count' => (int) $coupon->used_count,
            'uses' => (int) $uses,
            'valid_order_value' => round((float) $orderValue, 2),
            'total_discount_granted' => round((float) $totalDiscount, 2),
        ];
    }

    /**
     * Store-wide aggregate promotion metrics over valid orders.
     */
    public function overall(int $storeId): array
    {
        $promoIds = AdvancedCoupon::where('store_id', $storeId)->pluck('id')->toArray();
        if (empty($promoIds)) {
            return ['total_promotions' => 0, 'total_uses' => 0, 'total_discount_granted' => 0, 'valid_order_value' => 0];
        }

        $base = DB::table('coupon_usages as cu')
            ->leftJoin('orders as o', 'o.id', '=', 'cu.order_id')
            ->whereIn('cu.coupon_id', $promoIds)
            ->where(function ($q) {
                $q->whereNull('o.id')->orWhereNotIn('o.status', self::EXCLUDED_STATUSES);
            });

        return [
            'total_promotions' => count($promoIds),
            'total_uses' => (int) $base->count(),
            'total_discount_granted' => round((float) $base->sum('cu.discount_amount'), 2),
            'valid_order_value' => round((float) (clone $base)
                ->whereNotIn('o.status', self::EXCLUDED_STATUSES)
                ->sum('o.total_amount'), 2),
        ];
    }
}
