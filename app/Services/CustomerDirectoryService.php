<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerTag;
use App\Models\Order;
use App\Models\Setting;

/**
 * Merchant customer directory read-model (Phase 1).
 *
 * Combines two sources into ONE tenant-scoped directory:
 *   1. canonical customers  (customers table — registered / manually created)
 *   2. guest identities     (orders with customer_id = NULL, aggregated by the
 *                            safe normalized phone — the canonical identity key
 *                            for Palestinian commerce — else email, else order id)
 *
 * All heavy lifting happens in SQL GROUP BY aggregates over the orders table;
 * order rows themselves are never loaded into PHP. Order rewrites are strictly
 * avoided in Phase 1 — this is a read model only.
 *
 * Performance note: the identity set is bounded by the number of distinct
 * aggregated identities (not order rows) for one store and is paginated before
 * it is sent to the browser. Multi-currency totals are returned as separately
 * grouped values and are NEVER summed into a fake combined total.
 */
class CustomerDirectoryService
{
    public const PER_PAGE_DEFAULT = 15;
    public const PER_PAGE_MAX = 50;
    public const DORMANT_DAYS_DEFAULT = 30;
    public const FILTERS = ['all', 'repeat', 'single', 'dormant', 'cancelled', 'vip'];

    public function __construct(protected CustomerIdentityService $identity)
    {
    }

    /**
     * Build the full directory payload for Inertia.
     *
     * @return array<string,mixed>
     */
    public function directory(int $storeId, array $params): array
    {
        $search = trim((string) ($params['search'] ?? ''));
        $requestedFilter = $params['filter'] ?? 'all';
        $filter = in_array($requestedFilter, self::FILTERS, true) ? $requestedFilter : 'all';
        $perPage = $this->normalizePerPage($params['per_page'] ?? self::PER_PAGE_DEFAULT);
        $page = max(1, (int) ($params['page'] ?? 1));

        $data = $this->all($storeId, $params);
        $identities = $data['identities'];

        $total = count($identities);
        $lastPage = max(1, (int) ceil($total / $perPage));
        $page = min($page, $lastPage);
        $items = array_slice($identities, ($page - 1) * $perPage, $perPage);

        return [
            'customers' => array_map(fn (array $row) => $this->present($row), $items),
            'pagination' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
            ],
            'filters' => [
                'search' => $search,
                'filter' => $filter,
                'per_page' => $perPage,
                'dormant_days' => (int) ($params['dormant_days'] ?? self::DORMANT_DAYS_DEFAULT),
            ],
            'stats' => $data['stats'],
        ];
    }

    /**
     * All tenant-scoped identities (sorted by most recent activity) plus stats.
     * Used by the paginated directory and the CSV export (export ignores filters).
     *
     * @return array{identities:list<array<string,mixed>>,stats:array<string,mixed>}
     */
    public function all(int $storeId, array $params): array
    {
        $search = trim((string) ($params['search'] ?? ''));
        $requestedFilter = $params['filter'] ?? 'all';
        $filter = in_array($requestedFilter, self::FILTERS, true) ? $requestedFilter : 'all';

        $identities = $this->buildIdentities($storeId, $search, $filter);
        $stats = $this->buildStats($identities);

        if ($filter !== 'all') {
            $identities = $this->applyFilter($identities, $filter);
        }

        // Sort: most recent activity first (nulls last).
        usort($identities, function (array $a, array $b): int {
            $ka = $a['last_order_at'] ?? $a['created_at'] ?? null;
            $kb = $b['last_order_at'] ?? $b['created_at'] ?? null;
            $ta = $ka ? strtotime((string) $ka) : 0;
            $tb = $kb ? strtotime((string) $kb) : 0;

            return $tb <=> $ta;
        });

        return ['identities' => $identities, 'stats' => $stats];
    }

    private function normalizePerPage(mixed $value): int
    {
        $perPage = (int) $value;

        return max(1, min(self::PER_PAGE_MAX, $perPage));
    }

    /**
     * Build tenant-scoped identities (canonical + guest) with SQL aggregates.
     *
     * @return list<array<string,mixed>>
     */
    private function buildIdentities(int $storeId, string $search, string $filter): array
    {
        $canonicalMetrics = $this->aggregateCanonicalMetrics($storeId);
        $guestAggregates = $this->aggregateGuestIdentities($storeId, $search);

        $tagsByRef = CustomerTag::where('store_id', $storeId)
            ->get(['customer_ref', 'name'])
            ->reduce(function (array $carry, CustomerTag $tag): array {
                $carry[$tag->customer_ref][] = $tag->name;

                return $carry;
            }, []);

        $identities = [];

        $customers = Customer::where('store_id', $storeId)
            ->orderBy('created_at', 'desc')
            ->get(['id', 'first_name', 'last_name', 'email', 'phone', 'created_at', 'is_active', 'customer_group']);

        foreach ($customers as $customer) {
            if ($search !== '' && ! $this->matchesSearch($customer->first_name, $customer->last_name, $customer->email, $customer->phone, $search)) {
                continue;
            }
            $ref = $this->identity->refForCanonical($customer->id);
            $metrics = $canonicalMetrics[$customer->id] ?? null;
            $identities[] = $this->makeCanonicalIdentity($customer, $ref, $metrics, $tagsByRef[$ref] ?? []);
        }

        foreach ($guestAggregates as $ref => $guest) {
            $identities[] = $this->makeGuestIdentity($ref, $guest, $tagsByRef[$ref] ?? []);
        }

        return $identities;
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    private function aggregateCanonicalMetrics(int $storeId): array
    {
        $rows = Order::where('store_id', $storeId)
            ->whereNotNull('customer_id')
            ->selectRaw(
                "customer_id,
                 COALESCE(NULLIF(currency, ''), '') AS currency,
                 COUNT(*) AS orders_count,
                 SUM(CASE WHEN status IN ('cancelled','failed','refunded') THEN 1 ELSE 0 END) AS cancelled_count,
                 SUM(CASE WHEN status NOT IN ('cancelled','failed','refunded') THEN 1 ELSE 0 END) AS valid_count,
                 SUM(total_amount) AS total_value,
                 MIN(created_at) AS first_order_at,
                 MAX(created_at) AS last_order_at"
            )
            ->groupBy('customer_id', 'currency')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $id = (int) $row->customer_id;
            $currency = ($row->currency ?: 'ILS');
            $map[$id] = $map[$id] ?? $this->emptyMetrics($currency);
            $this->mergeMetricRow($map[$id], $row, $currency);
        }

        return $map;
    }

    /**
     * SQL aggregation over guest orders, then PHP merge by identity ref so raw
     * phone variants that normalize to the same E.164 collapse into ONE customer.
     *
     * @return array<string,array<string,mixed>> keyed by customer_ref
     */
    private function aggregateGuestIdentities(int $storeId, string $search): array
    {
        $query = Order::where('store_id', $storeId)
            ->whereNull('customer_id')
            ->selectRaw(
                "COALESCE(NULLIF(customer_phone, ''), '') AS raw_phone,
                 COALESCE(NULLIF(customer_email, ''), '') AS raw_email,
                 COALESCE(NULLIF(customer_first_name, ''), '') AS first_name,
                 COALESCE(NULLIF(customer_last_name, ''), '') AS last_name,
                 COALESCE(NULLIF(currency, ''), '') AS currency,
                 COUNT(*) AS orders_count,
                 SUM(CASE WHEN status IN ('cancelled','failed','refunded') THEN 1 ELSE 0 END) AS cancelled_count,
                 SUM(CASE WHEN status NOT IN ('cancelled','failed','refunded') THEN 1 ELSE 0 END) AS valid_count,
                 SUM(total_amount) AS total_value,
                 MIN(created_at) AS first_order_at,
                 MAX(created_at) AS last_order_at,
                 MIN(id) AS reference_order_id"
            );

        $rows = $query
            ->groupBy('raw_phone', 'raw_email', 'first_name', 'last_name', 'currency')
            ->get();

        $groups = [];
        foreach ($rows as $row) {
            $ref = $this->identity->refForOrder([
                'customer_id' => null,
                'customer_phone' => $row->raw_phone !== '' ? $row->raw_phone : null,
                'customer_email' => $row->raw_email,
                'id' => (int) $row->reference_order_id,
            ]);

            $currency = ($row->currency ?: 'ILS');
            if (! isset($groups[$ref])) {
                $groups[$ref] = $this->emptyMetrics($currency);
                $groups[$ref]['first_name'] = $row->first_name;
                $groups[$ref]['last_name'] = $row->last_name;
                $groups[$ref]['phone'] = $row->raw_phone !== '' ? $row->raw_phone : null;
                $groups[$ref]['email'] = $row->raw_email !== '' ? $row->raw_email : null;
            }
            $this->mergeMetricRow($groups[$ref], $row, $currency);

            // Prefer contact/name fields from the most recent order group so the
            // directory shows the freshest data a guest left us with.
            $rowLast = strtotime((string) $row->last_order_at);
            $curLast = $groups[$ref]['last_order_at'] ? strtotime((string) $groups[$ref]['last_order_at']) : 0;
            if ($row->first_name !== '' && $rowLast >= $curLast) {
                $groups[$ref]['first_name'] = $row->first_name;
                $groups[$ref]['last_name'] = $row->last_name;
                if ($row->raw_phone !== '') {
                    $groups[$ref]['phone'] = $row->raw_phone;
                }
                if ($row->raw_email !== '') {
                    $groups[$ref]['email'] = $row->raw_email;
                }
            }
        }

        if ($search !== '') {
            $term = mb_strtolower(trim($search));
            $groups = array_filter($groups, function (array $g) use ($term): bool {
                $full = trim((string) ($g['first_name'] ?? '') . ' ' . (string) ($g['last_name'] ?? ''));
                foreach ([$full, $g['first_name'] ?? '', $g['last_name'] ?? '', $g['phone'] ?? '', $g['email'] ?? ''] as $field) {
                    if ($field !== '' && mb_strpos(mb_strtolower((string) $field), $term) !== false) {
                        return true;
                    }
                }

                return false;
            });
        }

        return $groups;
    }

    /**
     * @param  array<string,mixed>  $metrics
     */
    private function mergeMetricRow(array &$metrics, object $row, string $currency): void
    {
        $metrics['orders_count'] += (int) $row->orders_count;
        $metrics['valid_count'] += (int) $row->valid_count;
        $metrics['cancelled_count'] += (int) $row->cancelled_count;

        if (! isset($metrics['totals'][$currency])) {
            $metrics['totals'][$currency] = ['currency' => $currency, 'total' => 0.0, 'count' => 0];
        }
        $metrics['totals'][$currency]['total'] += (float) $row->total_value;
        $metrics['totals'][$currency]['count'] += (int) $row->orders_count;

        $first = $row->first_order_at ? strtotime((string) $row->first_order_at) : null;
        $last = $row->last_order_at ? strtotime((string) $row->last_order_at) : null;

        if ($first !== null && ($metrics['first_order_at'] === null || $first < strtotime((string) $metrics['first_order_at']))) {
            $metrics['first_order_at'] = (string) $row->first_order_at;
        }
        if ($last !== null && ($metrics['last_order_at'] === null || $last > strtotime((string) $metrics['last_order_at']))) {
            $metrics['last_order_at'] = (string) $row->last_order_at;
        }
    }

    /**
     * @return array<string,mixed>
     */
    private function emptyMetrics(string $currency): array
    {
        return [
            'orders_count' => 0,
            'valid_count' => 0,
            'cancelled_count' => 0,
            'totals' => [],
            'first_order_at' => null,
            'last_order_at' => null,
        ];
    }

    /**
     * @param  array<string,mixed>|null  $metrics
     * @param  list<string>  $tags
     * @return array<string,mixed>
     */
    private function makeCanonicalIdentity(Customer $customer, string $ref, ?array $metrics, array $tags): array
    {
        $metrics = $metrics ?? $this->emptyMetrics('ILS');

        return [
            'ref' => $ref,
            'token' => $this->identity->tokenForRef($ref),
            'kind' => 'registered',
            'id' => $customer->id,
            'first_name' => cleanUtf8($customer->first_name),
            'last_name' => cleanUtf8($customer->last_name),
            'full_name' => cleanUtf8(trim($customer->first_name . ' ' . $customer->last_name)),
            'email' => cleanUtf8($customer->email),
            'phone' => $customer->phone,
            'phone_e164' => $this->identity->normalizePhone($customer->phone),
            'is_active' => (bool) $customer->is_active,
            'customer_group' => $customer->customer_group,
            'created_at' => $customer->created_at?->toISOString(),
            ...$this->metricSlice($metrics),
            'tags' => $tags,
        ];
    }

    /**
     * @param  array<string,mixed>  $guest
     * @param  list<string>  $tags
     * @return array<string,mixed>
     */
    private function makeGuestIdentity(string $ref, array $guest, array $tags): array
    {
        $phoneE164 = $this->identity->normalizePhone($guest['phone'] ?? null);

        return [
            'ref' => $ref,
            'token' => $this->identity->tokenForRef($ref),
            'kind' => 'guest',
            'id' => null,
            'first_name' => cleanUtf8($guest['first_name'] ?? ''),
            'last_name' => cleanUtf8($guest['last_name'] ?? ''),
            'full_name' => cleanUtf8(trim(($guest['first_name'] ?? '') . ' ' . ($guest['last_name'] ?? ''))),
            'email' => $guest['email'] ?? null,
            'phone' => $guest['phone'] ?? null,
            'phone_e164' => $phoneE164,
            'is_active' => null,
            'customer_group' => 'guest',
            'created_at' => $guest['first_order_at'] ? date('c', strtotime((string) $guest['first_order_at'])) : null,
            ...$this->metricSlice($guest),
            'tags' => $tags,
        ];
    }

    /**
     * @param  array<string,mixed>  $metrics
     * @return array<string,mixed>
     */
    private function metricSlice(array $metrics): array
    {
        $totals = array_values($metrics['totals'] ?? []);
        $valid = (int) ($metrics['valid_count'] ?? 0);
        $totalOrders = (int) ($metrics['orders_count'] ?? 0);

        return [
            'orders_count' => $totalOrders,
            'valid_count' => $valid,
            'cancelled_count' => (int) ($metrics['cancelled_count'] ?? 0),
            'totals' => $totals,
            'is_repeat' => $valid >= 2,
            'first_order_at' => isset($metrics['first_order_at']) ? date('c', strtotime((string) $metrics['first_order_at'])) : null,
            'last_order_at' => isset($metrics['last_order_at']) ? date('c', strtotime((string) $metrics['last_order_at'])) : null,
        ];
    }

    /**
     * @param  list<array<string,mixed>>  $identities
     * @return list<array<string,mixed>>
     */
    private function applyFilter(array $identities, string $filter): array
    {
        $dormantDays = (int) (request()->input('dormant_days', self::DORMANT_DAYS_DEFAULT));
        $dormantBefore = now()->subDays(max(1, $dormantDays));

        return array_values(array_filter($identities, function (array $row) use ($filter, $dormantBefore): bool {
            return match ($filter) {
                'repeat' => (bool) $row['is_repeat'],
                'single' => (int) $row['valid_count'] === 1,
                'dormant' => $row['last_order_at'] !== null && strtotime((string) $row['last_order_at']) < $dormantBefore->timestamp,
                'cancelled' => (int) $row['cancelled_count'] > 0,
                'vip' => in_array('vip', array_map(fn ($t) => mb_strtolower((string) $t), $row['tags']), true),
                default => true,
            };
        }));
    }

    private function matchesSearch(?string $first, ?string $last, ?string $email, ?string $phone, string $search): bool
    {
        $full = trim(($first ?? '') . ' ' . ($last ?? ''));
        $term = mb_strtolower($search);

        foreach ([$first, $last, $full, $email, $phone] as $field) {
            if ($field !== null && $field !== '' && mb_strpos(mb_strtolower($field), $term) !== false) {
                return true;
            }
        }

        return false;
    }

    private function escapeLike(string $value): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);
    }

    /**
     * @return array<string,mixed>
     */
    private function buildStats(array $identities): array
    {
        $newThisMonth = 0;
        $repeat = 0;
        $hasCancelled = 0;
        $totalByCurrency = [];

        foreach ($identities as $row) {
            if ((int) $row['valid_count'] >= 2) {
                $repeat++;
            }
            if ((int) $row['cancelled_count'] > 0) {
                $hasCancelled++;
            }
            $anchor = $row['created_at'] ?? $row['first_order_at'] ?? null;
            if ($anchor !== null && strtotime((string) $anchor) >= now()->startOfMonth()->timestamp) {
                $newThisMonth++;
            }
            foreach ($row['totals'] as $group) {
                $code = $group['currency'];
                if (! isset($totalByCurrency[$code])) {
                    $totalByCurrency[$code] = 0.0;
                }
                $totalByCurrency[$code] += (float) $group['total'];
            }
        }

        return [
            'totalCustomers' => count($identities),
            'repeatCustomers' => $repeat,
            'newThisMonth' => $newThisMonth,
            'hasCancelled' => $hasCancelled,
            'totalByCurrency' => collect($totalByCurrency)
                ->map(fn (float $total, string $code) => ['currency' => $code, 'total' => round($total, 2)])
                ->values()
                ->all(),
        ];
    }

    /**
     * @param  array<string,mixed>  $row
     * @return array<string,mixed>
     */
    private function present(array $row): array
    {
        $row['whatsapp_url'] = $row['phone_e164'] ? $this->identity->whatsappUrl($row['phone_e164']) : null;
        $row['call_url'] = $row['phone_e164'] ? $this->identity->callUrl($row['phone_e164']) : null;

        return $row;
    }
}