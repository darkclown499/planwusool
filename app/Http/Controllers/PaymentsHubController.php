<?php

namespace App\Http\Controllers;

use App\Models\CodPayment;
use App\Services\CodPaymentService;
use App\Services\FeatureService;
use App\Services\PaymentFinancialMetrics;
use App\Services\PaymentOperationsData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Payments Hub — the single canonical merchant entry for everything payments:
 * https://.../cod-payments  (title: "المدفوعات والتحصيل")
 *
 * Consolidates the previously separate entry points into one IA with internal tabs:
 *   overview      — financial snapshot (GMV / Collected / Pending / Refunded / Net) + COD health
 *   methods       — payment method configuration (single canonical provider truth, no fake connect)
 *   operations    — transaction ledger, filters, CSV export (delegates to PaymentOperationsData)
 *   cod           — cash-on-delivery tracking & collection
 *   settlements   — COD settlement batches (draft → settle)
 *
 * No financial logic is duplicated here: figures come from PaymentFinancialMetrics and
 * COD rules come from CodPaymentService / CodSettlementService. Data access is scoped to
 * the current store via getCurrentStoreId().
 */
class PaymentsHubController extends Controller
{
    private const TABS = ['overview', 'methods', 'operations', 'cod', 'settlements'];

    public function index(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $tab = $this->resolveTab($request->input('tab'));

        $required = $this->requiredPermissionForTab($tab);
        if ($required !== null && !$user->can($required)) {
            abort(403);
        }

        $overview = $this->overview($storeId);

        $props = [
            'tab' => $tab,
            'tabs' => $this->tabs($user),
            'store' => ['id' => $storeId],
            'overview' => $overview,
            'currencies' => $overview['metrics']['currencies'] ?? [],
        ];

        switch ($tab) {
            case 'operations':
                $props += $this->operationsProps($request, $storeId);
                break;
            case 'cod':
                $props += $this->codProps($request, $storeId, $overview);
                break;
            case 'settlements':
                $props += $this->settlementsProps($storeId);
                break;
            case 'methods':
                $props['methods'] = FeatureService::PAYMENT_METHODS;
                break;
        }

        return Inertia::render('cod-payments/hub', $props);
    }

    private function resolveTab($tab): string
    {
        $tab = is_string($tab) ? strtolower(trim($tab)) : 'overview';
        return in_array($tab, self::TABS, true) ? $tab : 'overview';
    }

    private function requiredPermissionForTab(string $tab): ?string
    {
        return match ($tab) {
            'methods' => 'settings-stores',
            'operations' => 'manage-orders',
            'cod' => 'manage-cod-payments',
            'settlements' => 'manage-orders',
            default => null,
        };
    }

    /**
     * Legacy /payments/operations GET → hands off to the hub's operations tab,
     * forwarding existing filter/bookmark query params so nothing is lost.
     */
    public function legacyOperationsRedirect(Request $request)
    {
        return redirect()->route('cod-payments.index', array_merge(
            ['tab' => 'operations'],
            $request->only(['search', 'collection_state', 'payment_method', 'date_from', 'date_to'])
        ));
    }

    /**
     * Legacy /stores/{store}/payments GET → hands off to the hub's methods tab.
     * GET only; mutations are not redirected.
     */
    public function legacyStoreMethodsRedirect()
    {
        return redirect()->route('cod-payments.index', ['tab' => 'methods']);
    }

    private function tabs($user): array
    {
        $canOrders = $user->can('manage-orders');
        $canCod = $user->can('manage-cod-payments');
        $canSettings = $user->can('settings-stores');

        $tabs = [];
        $tabs[] = ['id' => 'overview', 'label' => 'Overview', 'permission' => null];
        $tabs[] = ['id' => 'methods', 'label' => 'Payment Methods', 'permission' => $canSettings ? null : 'settings-stores'];
        $tabs[] = ['id' => 'operations', 'label' => 'Payment Operations', 'permission' => $canOrders ? null : 'manage-orders'];
        $tabs[] = ['id' => 'cod', 'label' => 'COD Payments', 'permission' => $canCod ? null : 'manage-cod-payments'];
        $tabs[] = ['id' => 'settlements', 'label' => 'Settlements', 'permission' => $canOrders ? null : 'manage-orders'];
        return $tabs;
    }

    private function overview(?int $storeId): array
    {
        if (!$storeId) {
            return [
                'metrics' => null,
                'cod_stats' => null,
                'cod_pending_count' => 0,
                'enabled_methods' => 0,
                'total_methods' => count(FeatureService::PAYMENT_METHODS),
            ];
        }

        $metrics = PaymentFinancialMetrics::summary($storeId);
        $cod = app(CodPaymentService::class);

        return [
            'metrics' => $metrics,
            'cod_stats' => $cod->getStats($storeId),
            'cod_pending_count' => app(PaymentOperationsData::class)->codPending($storeId)->count(),
            'settlement_drafts' => \App\Models\CodSettlement::where('store_id', $storeId)
                ->where('status', 'draft')->count(),
            'enabled_methods' => \App\Models\PaymentSetting::where('user_id', \App\Models\Store::find($storeId)?->user_id)
                ->where('store_id', $storeId)
                ->where('key', 'like', 'is_%_enabled')
                ->where('value', '1')
                ->count(),
            'total_methods' => count(FeatureService::PAYMENT_METHODS),
        ];
    }

    private function operationsProps(Request $request, ?int $storeId): array
    {
        $data = app(PaymentOperationsData::class);
        $filters = $data->filters($request);
        $metrics = $storeId ? PaymentFinancialMetrics::summary($storeId) : $this->emptyMetrics();

        return [
            'metrics' => $metrics,
            'rows' => $storeId ? $data->ledger($storeId, $filters) : ['data' => [], 'links' => [], 'from' => 0, 'to' => 0, 'total' => 0],
            'filters' => $filters,
            'codPending' => $storeId ? $data->codPending($storeId) : [],
            'settlements' => $storeId ? $data->settlements($storeId, $metrics) : [],
            'currencies' => $metrics['currencies'] ?? [],
        ];
    }

    private function codProps(Request $request, ?int $storeId, array $overview): array
    {
        $query = CodPayment::query()->with(['order', 'history'])->where('store_id', $storeId);

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%")
                    ->orWhereHas('order', fn ($oq) => $oq->where('order_number', 'like', "%{$search}%"));
            });
        }
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        return [
            'payments' => $query->latest()->paginate($request->get('per_page', 15)),
            'filters' => $request->only(['search', 'status', 'date_from', 'date_to', 'per_page']),
            'stats' => $overview['cod_stats'],
            'currency_symbol' => $this->currencySymbol($storeId),
        ];
    }

    private function settlementsProps(?int $storeId): array
    {
        $data = app(PaymentOperationsData::class);
        $metrics = $storeId ? PaymentFinancialMetrics::summary($storeId) : $this->emptyMetrics();
        return [
            'metrics' => $metrics,
            'codPending' => $storeId ? $data->codPending($storeId) : [],
            'settlements' => $storeId ? $data->settlements($storeId, $metrics) : [],
            'currencies' => $metrics['currencies'] ?? [],
        ];
    }

    private function emptyMetrics(): array
    {
        return [
            'gmv' => [], 'gmv_total' => 0,
            'collected' => [], 'collected_total' => 0,
            'pending_collection' => [], 'pending_collection_total' => 0,
            'refunded' => [], 'refunded_total' => 0,
            'net_collected' => [], 'net_collected_total' => 0,
            'currencies' => [],
            'cod_pending_count' => 0, 'bank_pending_count' => 0,
        ];
    }

    private function currencySymbol(?int $storeId): string
    {
        if (!$storeId) return '₪';
        try {
            $settings = app(\App\Services\Currency\CurrencyService::class)
                ->getCurrencySettings(auth()->id(), $storeId);
            $currency = \App\Models\Currency::where('code', $settings['defaultCurrency'] ?? 'ILS')->first();
            return $currency ? $currency->symbol : '₪';
        } catch (\Throwable $e) {
            return '₪';
        }
    }
}
