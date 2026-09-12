<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\Shipping;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Models\StoreDomain;
use App\Models\StoreErpConfig;

class StoreHealthService
{
    public const SEVERITY_CRITICAL = 'critical';
    public const SEVERITY_WARNING  = 'warning';
    public const SEVERITY_INFO     = 'info';

    public const STATUS_HEALTHY         = 'healthy';
    public const STATUS_GOOD            = 'good';
    public const STATUS_NEEDS_ATTENTION = 'needs_attention';
    public const STATUS_CRITICAL        = 'critical';

    private const SCORE_WEIGHTS = [
        self::SEVERITY_CRITICAL => 25,
        self::SEVERITY_WARNING  => 10,
        self::SEVERITY_INFO     => 3,
    ];

    /**
     * Evaluate the health of a store.
     *
     * Every signal derives from persisted, store-scoped truth. No fake
     * scores, no manual "resolved" flags, no frontend-only overrides.
     *
     * @return array{score: int, status: string, counts: array{critical: int, warning: int, info: int}, issues: array}
     */
    public function evaluate(Store $store, $user): array
    {
        $issues = [];

        $canManageOrders   = $user->can('manage-orders');
        $canManageProducts = $user->can('manage-products');
        $canManageCarts    = $user->can('manage-abandoned-carts');
        $canManageSettings = $user->can('settings-stores') || $user->type === 'company';
        $storeId           = (int) $store->id;

        $this->checkStorePublished($store, $canManageSettings, $issues);
        $this->checkPaymentMethods($store, $user, $canManageSettings, $issues);
        $this->checkDeliveryMethods($store, $canManageSettings, $issues);
        $this->checkFailedPayments($storeId, $canManageOrders, $issues);
        $this->checkLowStock($storeId, $canManageProducts, $issues);
        $this->checkOutOfStock($storeId, $canManageProducts, $issues);
        $this->checkProductImages($storeId, $canManageProducts, $issues);
        $this->checkAbandonedCarts($storeId, $canManageCarts, $issues);
        $this->checkUnassignedDeliveries($storeId, $canManageOrders, $issues);
        $this->checkOrdersNeedingAction($storeId, $canManageOrders, $issues);
        $this->checkEmailStatus($store, $canManageSettings, $issues);
        $this->checkDomainIssues($store, $storeId, $canManageSettings, $issues);
        $this->checkIntegrationStatus($store, $storeId, $canManageSettings, $issues);

        $counts = ['critical' => 0, 'warning' => 0, 'info' => 0];
        foreach ($issues as $issue) {
            $counts[$issue['severity']]++;
        }

        $score = 100;
        foreach ($counts as $severity => $count) {
            $score -= $count * self::SCORE_WEIGHTS[$severity];
        }
        $score = max(0, min(100, $score));

        $status = match (true) {
            $score >= 90 => self::STATUS_HEALTHY,
            $score >= 70 => self::STATUS_GOOD,
            $score >= 40 => self::STATUS_NEEDS_ATTENTION,
            default      => self::STATUS_CRITICAL,
        };

        return [
            'score'  => $score,
            'status' => $status,
            'counts' => $counts,
            'issues' => array_values($issues),
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Signal checks                                                      */
    /* ------------------------------------------------------------------ */

    private function checkStorePublished(Store $store, bool $canManage, array &$issues): void
    {
        if (! $canManage) {
            return;
        }

        $config   = StoreConfiguration::getConfiguration($store->id);
        $published = ($config['store_status'] ?? null) === true
            || ($config['store_status'] ?? null) === 'true'
            || ! array_key_exists('store_status', $config);

        if (! $published) {
            $issues[] = [
                'key'          => 'store_unpublished',
                'severity'     => self::SEVERITY_CRITICAL,
                'title'        => 'المتجر غير منشور',
                'description'  => 'المتجر غير مرئي للعملاء. انشره لبدء استقبال الطلبات.',
                'count'        => 0,
                'action_label' => 'نشر المتجر',
                'action_route' => route('stores.settings', $store->id) . '?tab=general',
                'category'     => 'config',
            ];
        }
    }

    private function checkPaymentMethods(Store $store, $user, bool $canManage, array &$issues): void
    {
        if (! $canManage) {
            return;
        }

        if ($this->hasUsablePaymentMethod($store, $user)) {
            return;
        }

        $issues[] = [
            'key'          => 'no_payment_method',
            'severity'     => self::SEVERITY_CRITICAL,
            'title'        => 'لا توجد طريقة دفع متاحة',
            'description'  => 'العملاء لا يستطيعون إتمام الشراء. أضف طريقة دفع واحدة على الأقل.',
            'count'        => 0,
            'action_label' => 'إعداد طرق الدفع',
            'action_route' => route('stores.settings', $store->id) . '?tab=payments',
            'category'     => 'config',
        ];
    }

    private function checkDeliveryMethods(Store $store, bool $canManage, array &$issues): void
    {
        if (! $canManage) {
            return;
        }

        // Only flag when shipping is entitled; merchants cannot fix plan gating.
        if (! $store->canUsePlanFeature('shipping_method')) {
            return;
        }

        $hasActive = Shipping::where('store_id', $store->id)
            ->where('is_active', true)
            ->exists();

        if (! $hasActive) {
            $issues[] = [
                'key'          => 'no_delivery_method',
                'severity'     => self::SEVERITY_WARNING,
                'title'        => 'لا توجد طريقة توصيل نشطة',
                'description'  => 'لا يمكن للعملاء اختيار التوصيل عند الشراء.',
                'count'        => 0,
                'action_label' => 'إعداد التوصيل',
                'action_route' => route('delivery.index'),
                'category'     => 'config',
            ];
        }
    }

    private function checkFailedPayments(int $storeId, bool $canManage, array &$issues): void
    {
        if (! $canManage) {
            return;
        }

        $count = Order::where('store_id', $storeId)
            ->where('payment_status', 'failed')
            ->count();

        if ($count > 0) {
            $issues[] = [
                'key'          => 'failed_payments',
                'severity'     => self::SEVERITY_WARNING,
                'title'        => 'فشل في الدفع',
                'description'  => "هناك {$count} طلب بفشل في الدفع.",
                'count'        => $count,
                'action_label' => 'مراجعة الطلبات',
                'action_route' => route('orders.index', ['payment_status' => 'failed']),
                'category'     => 'orders',
            ];
        }
    }

    private function checkLowStock(int $storeId, bool $canManage, array &$issues): void
    {
        if (! $canManage) {
            return;
        }

        $count = $this->countLowStockProducts($storeId);

        if ($count > 0) {
            $issues[] = [
                'key'          => 'low_stock',
                'severity'     => self::SEVERITY_WARNING,
                'title'        => 'منتجات بمخزون منخفض',
                'description'  => "{$count} منتج مخزونه على وشك النفاد.",
                'count'        => $count,
                'action_label' => 'إدارة المخزون',
                'action_route' => route('products.index', ['status' => 'low_stock']),
                'category'     => 'products',
            ];
        }
    }

    private function checkOutOfStock(int $storeId, bool $canManage, array &$issues): void
    {
        if (! $canManage) {
            return;
        }

        $count = $this->countOutOfStockProducts($storeId);

        if ($count > 0) {
            $issues[] = [
                'key'          => 'out_of_stock',
                'severity'     => self::SEVERITY_WARNING,
                'title'        => 'منتجات نفدت من المخزون',
                'description'  => "{$count} منتج نفد مخزونه بالكامل.",
                'count'        => $count,
                'action_label' => 'إدارة المخزون',
                'action_route' => route('products.index', ['status' => 'out_of_stock']),
                'category'     => 'products',
            ];
        }
    }

    private function checkProductImages(int $storeId, bool $canManage, array &$issues): void
    {
        if (! $canManage) {
            return;
        }

        // cover_image accessor falls back to images[0], so check both columns.
        $count = Product::where('store_id', $storeId)
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('cover_image')->orWhere('cover_image', '');
            })
            ->where(function ($q) {
                $q->whereNull('images')->orWhere('images', '');
            })
            ->count();

        if ($count > 0) {
            $issues[] = [
                'key'          => 'products_without_images',
                'severity'     => self::SEVERITY_INFO,
                'title'        => 'منتجات بدون صور',
                'description'  => "{$count} منتج نشط بدون صورة.",
                'count'        => $count,
                'action_label' => 'إدارة المنتجات',
                'action_route' => route('products.index'),
                'category'     => 'products',
            ];
        }
    }

    private function checkAbandonedCarts(int $storeId, bool $canManage, array &$issues): void
    {
        if (! $canManage) {
            return;
        }

        $stats  = app(AbandonedCartService::class)->getStats($storeId);
        $pending = (int) ($stats['pending'] ?? 0);

        if ($pending > 0) {
            $issues[] = [
                'key'          => 'abandoned_carts',
                'severity'     => self::SEVERITY_INFO,
                'title'        => 'سلال متروكة',
                'description'  => "{$pending} سلة متروكة بانتظار المتابعة.",
                'count'        => $pending,
                'action_label' => 'متابعة السلال',
                'action_route' => route('abandoned-carts.index'),
                'category'     => 'orders',
            ];
        }
    }

    private function checkUnassignedDeliveries(int $storeId, bool $canManage, array &$issues): void
    {
        if (! $canManage) {
            return;
        }

        $operational = \App\Http\Controllers\DeliveryController::OPERATIONAL_DELIVERY_STATUSES;

        $count = Order::where('store_id', $storeId)
            ->where('delivery_status', 'unassigned')
            ->whereIn('status', $operational)
            ->count();

        if ($count > 0) {
            $issues[] = [
                'key'          => 'unassigned_deliveries',
                'severity'     => self::SEVERITY_WARNING,
                'title'        => 'طلبات بدون مندوب توصيل',
                'description'  => "{$count} طلب بانتظار تعيين مندوب.",
                'count'        => $count,
                'action_label' => 'إدارة التوصيل',
                'action_route' => route('delivery.index', ['bucket' => 'unassigned']),
                'category'     => 'orders',
            ];
        }
    }

    private function checkOrdersNeedingAction(int $storeId, bool $canManage, array &$issues): void
    {
        if (! $canManage) {
            return;
        }

        $operational = \App\Http\Controllers\DeliveryController::OPERATIONAL_DELIVERY_STATUSES;

        $count = Order::where('store_id', $storeId)
            ->whereIn('status', $operational)
            ->count();

        if ($count > 0) {
            $issues[] = [
                'key'          => 'orders_needing_action',
                'severity'     => self::SEVERITY_INFO,
                'title'        => 'طلبات بانتظار المعالجة',
                'description'  => "{$count} طلب في مرحلة تشغيلية.",
                'count'        => $count,
                'action_label' => 'إدارة الطلبات',
                'action_route' => route('orders.index'),
                'category'     => 'orders',
            ];
        }
    }

    private function checkEmailStatus(Store $store, bool $canManage, array &$issues): void
    {
        if (! $canManage) {
            return;
        }

        $status = StoreMailService::getStatus($store);

        if ($status === StoreMailService::STATUS_CONNECTED) {
            return;
        }

        $isError = in_array($status, [StoreMailService::STATUS_ERROR, StoreMailService::STATUS_INCOMPLETE], true);

        $issues[] = [
            'key'          => 'email_not_ready',
            'severity'     => $isError ? self::SEVERITY_WARNING : self::SEVERITY_INFO,
            'title'        => 'البريد الإلكتروني غير جاهز',
            'description'  => $isError
                ? 'إعداد البريد الإلكتروني غير مكتمل أو به خطأ.'
                : 'لم يتم إعداد خدمة البريد الإلكتروني بعد.',
            'count'        => 0,
            'action_label' => 'إعداد البريد',
            'action_route' => route('stores.settings', $store->id) . '?tab=email',
            'category'     => 'config',
        ];
    }

    private function checkDomainIssues(Store $store, int $storeId, bool $canManage, array &$issues): void
    {
        if (! $canManage) {
            return;
        }

        // Only surface when the merchant is entitled to custom domains and a
        // custom domain has actually been added (StoreDomain rows are the
        // canonical "configured" truth used by DomainHealthService).
        if (! $store->canUsePlanFeature('custom_domain') && ! $store->canUsePlanFeature('custom_subdomain')) {
            return;
        }

        if (! StoreDomain::where('store_id', $storeId)->exists()) {
            return;
        }

        $hasUnverified = StoreDomain::where('store_id', $storeId)
            ->where('is_verified', false)
            ->exists();

        $hasSslError = StoreDomain::where('store_id', $storeId)
            ->where('is_verified', true)
            ->where('ssl_status', 'error')
            ->exists();

        if ($hasUnverified || $hasSslError) {
            $issues[] = [
                'key'          => 'domain_issue',
                'severity'     => self::SEVERITY_WARNING,
                'title'        => 'مشكلة في النطاق',
                'description'  => $hasUnverified
                    ? 'النطاق المخصص غير مُتحقق منه.'
                    : 'شهادة SSL للنطاق المخصص بها مشكلة.',
                'count'        => 0,
                'action_label' => 'إدارة النطاق',
                'action_route' => route('stores.settings', $store->id) . '?tab=domain',
                'category'     => 'config',
            ];
        }
    }

    private function checkIntegrationStatus(Store $store, int $storeId, bool $canManage, array &$issues): void
    {
        if (! $canManage) {
            return;
        }

        // Only surface when the accounting entitlement is present.
        if (! $store->canUsePlanFeature('accounting_integration')) {
            return;
        }

        // Only surface when an ERP integration is configured.
        $hasFailedSync = StoreErpConfig::where('store_id', $storeId)
            ->where('is_active', true)
            ->where('last_sync_status', 'failed')
            ->exists();

        if ($hasFailedSync) {
            $issues[] = [
                'key'          => 'integration_failed',
                'severity'     => self::SEVERITY_WARNING,
                'title'        => 'فشل في المزامنة',
                'description'  => 'آخر مزامنة مع نظام ERP فشلت.',
                'count'        => 0,
                'action_label' => 'إعداد المحاسبة',
                'action_route' => route('stores.settings', $store->id) . '?tab=accounting',
                'category'     => 'config',
            ];
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Payment usability                                                  */
    /* ------------------------------------------------------------------ */

    /**
     * Determine if at least one payment method can actually process a checkout.
     *
     * Delegates to the canonical shared helper (same truth as the onboarding
     * readiness snapshot): manual methods usable when enabled, partner methods
     * never usable, connected/international methods need a saved credential.
     */
    private function hasUsablePaymentMethod(Store $store, $user): bool
    {
        return hasUsablePaymentMethods($user->id, $store->id) > 0;
    }

    /* ------------------------------------------------------------------ */
    /*  Inventory counting (variant-aware)                                 */
    /* ------------------------------------------------------------------ */

    /**
     * Count active tracked, non-backorder products where 0 < stock <= threshold.
     * Variant products: count once if any combo falls in (0, threshold].
     * Disjoint from out-of-stock — products fully at 0 are NOT counted here.
     */
    private function countLowStockProducts(int $storeId): int
    {
        $threshold = (int) getSetting('low_stock_threshold', 5) ?: 5;

        $nonVariant = Product::where('store_id', $storeId)
            ->where('is_active', true)
            ->where('track_inventory', true)
            ->where('allow_backorder', false)
            ->where('stock', '>', 0)
            ->where('stock', '<=', $threshold)
            ->where(function ($q) {
                $q->where('inventory_mode', '!=', 'variant')
                    ->orWhereNull('inventory_mode');
            })
            ->count();

        $variantCount = 0;
        $variants = Product::where('store_id', $storeId)
            ->where('is_active', true)
            ->where('track_inventory', true)
            ->where('allow_backorder', false)
            ->where('inventory_mode', 'variant')
            ->get(['id', 'stock', 'low_stock_warning', 'variant_combinations']);

        foreach ($variants as $product) {
            $combos = $product->variant_combinations ?? [];
            if (empty($combos)) {
                if ($product->stock > 0 && $product->stock <= $threshold) {
                    $variantCount++;
                }
                continue;
            }

            $allOut = true;
            $anyLow = false;
            foreach ($combos as $combo) {
                $s  = (int) ($combo['stock'] ?? 0);
                $th = (int) ($combo['low_stock_warning'] ?? $product->low_stock_warning ?? $threshold) ?: $threshold;
                if ($s > 0) {
                    $allOut = false;
                }
                if ($s > 0 && $s <= $th) {
                    $anyLow = true;
                }
            }

            if (! $allOut && $anyLow) {
                $variantCount++;
            }
        }

        return $nonVariant + $variantCount;
    }

    /**
     * Count active tracked, non-backorder products where stock <= 0.
     * Variant products: count only if ALL combos have stock <= 0.
     */
    private function countOutOfStockProducts(int $storeId): int
    {
        $nonVariant = Product::where('store_id', $storeId)
            ->where('is_active', true)
            ->where('track_inventory', true)
            ->where('allow_backorder', false)
            ->where('stock', '<=', 0)
            ->where(function ($q) {
                $q->where('inventory_mode', '!=', 'variant')
                    ->orWhereNull('inventory_mode');
            })
            ->count();

        $variantCount = 0;
        $variants = Product::where('store_id', $storeId)
            ->where('is_active', true)
            ->where('track_inventory', true)
            ->where('allow_backorder', false)
            ->where('inventory_mode', 'variant')
            ->get(['id', 'stock', 'variant_combinations']);

        foreach ($variants as $product) {
            $combos = $product->variant_combinations ?? [];
            if (empty($combos)) {
                if ($product->stock <= 0) {
                    $variantCount++;
                }
                continue;
            }

            $allOut = true;
            foreach ($combos as $combo) {
                if ((int) ($combo['stock'] ?? 0) > 0) {
                    $allOut = false;
                    break;
                }
            }

            if ($allOut) {
                $variantCount++;
            }
        }

        return $nonVariant + $variantCount;
    }
}
