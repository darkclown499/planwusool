<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\CustomerNote;
use App\Models\CustomerTag;
use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Customer 360 profile read-model (Phase 1).
 *
 * Resolves the identity ref (canonical or guest) into a tenant-scoped profile:
 * overview metrics, order history, addresses, internal notes and merchant tags.
 *
 * Order history is limited and links to the canonical merchant order detail
 * page — this service never re-implements the order management screen.
 * Currency amounts are grouped per currency and never silently combined.
 */
class CustomerProfileService
{
    public const HISTORY_LIMIT = 20;

    public function __construct(protected CustomerIdentityService $identity)
    {
    }

    /**
     * @return array<string,mixed>
     */
    public function profileForRef(int $storeId, string $ref): array
    {
        if ($this->identity->isCanonicalRef($ref)) {
            $id = $this->identity->canonicalIdFromRef($ref);
            if ($id === null) {
                throw (new ModelNotFoundException)->setModel(Customer::class);
            }

            return $this->profileForCanonical($storeId, $id);
        }

        return $this->profileForGuest($storeId, $ref);
    }

    /**
     * @return array<string,mixed>
     */
    private function profileForCanonical(int $storeId, int $customerId): array
    {
        $customer = Customer::where('store_id', $storeId)->with('addresses')->find($customerId);
        if (! $customer) {
            throw (new ModelNotFoundException)->setModel(Customer::class);
        }

        $metricsRows = $this->aggregateOrders(
            Order::where('store_id', $storeId)->where('customer_id', $customerId)
        );
        $orders = Order::where('store_id', $storeId)
            ->where('customer_id', $customerId)
            ->withCount('items')
            ->orderBy('created_at', 'desc')
            ->limit(self::HISTORY_LIMIT)
            ->get();

        $ref = $this->identity->refForCanonical((int) $customer->id);
        $addresses = $this->addressesFromCustomerRow($customer);
        $addresses = array_merge($addresses, $this->addressesFromOrders($orders->take(5)));

        $notes = CustomerNote::where('store_id', $storeId)->where('customer_ref', $ref)
            ->orderBy('created_at', 'desc')->get();
        $tags = CustomerTag::where('store_id', $storeId)->where('customer_ref', $ref)
            ->orderBy('name')->get();

        return $this->assemble(
            $storeId,
            $ref,
            [
                'kind' => 'registered',
                'id' => $customer->id,
                'full_name' => cleanUtf8(trim($customer->first_name . ' ' . $customer->last_name)),
                'email' => cleanUtf8($customer->email),
                'phone' => $customer->phone,
                'is_active' => (bool) $customer->is_active,
                'customer_group' => $customer->customer_group,
                'created_at' => $customer->created_at?->toISOString(),
                'legacy_note' => cleanUtf8((string) $customer->notes),
            ],
            $metricsRows,
            $orders,
            $addresses,
            $notes,
            $tags,
        );
    }

    /**
     * @return array<string,mixed>
     */
    private function profileForGuest(int $storeId, string $ref): array
    {
        $match = $this->resolveGuestMatch($storeId, $ref);
        $query = Order::where('store_id', $storeId)->whereNull('customer_id');
        if (! empty($match['order_ids'])) {
            $query->whereIn('id', $match['order_ids']);
        } else {
            $query->where(function ($q) use ($match): void {
                if (! empty($match['phones'])) {
                    $q->whereIn('customer_phone', $match['phones']);
                }
                if (! empty($match['emails'])) {
                    $q->orWhereIn('customer_email', $match['emails']);
                }
            });
        }

        $latest = (clone $query)->orderBy('created_at', 'desc')->first();
        if (! $latest) {
            throw (new ModelNotFoundException)->setModel(Order::class);
        }

        $metricsRows = $this->aggregateOrders((clone $query));
        $orders = (clone $query)->withCount('items')->orderBy('created_at', 'desc')->limit(self::HISTORY_LIMIT)->get();

        $notes = CustomerNote::where('store_id', $storeId)->where('customer_ref', $ref)
            ->orderBy('created_at', 'desc')->get();
        $tags = CustomerTag::where('store_id', $storeId)->where('customer_ref', $ref)
            ->orderBy('name')->get();

        return $this->assemble(
            $storeId,
            $ref,
            [
                'kind' => 'guest',
                'id' => null,
                'full_name' => cleanUtf8(trim($latest->customer_first_name . ' ' . $latest->customer_last_name)),
                'email' => cleanUtf8((string) $latest->customer_email),
                'phone' => $latest->customer_phone,
                'is_active' => null,
                'customer_group' => 'guest',
                'created_at' => $latest->created_at?->toISOString(),
                'legacy_note' => null,
            ],
            $metricsRows,
            $orders,
            $this->addressesFromOrders($orders),
            $notes,
            $tags,
        );
    }

    /**
     * @return array{phones:list<string>,emails:list<string>,order_ids:list<int>}
     */
    private function resolveGuestMatch(int $storeId, string $ref): array
    {
        $prefix = substr($ref, 0, 2);
        $value = substr($ref, 2);

        if ($prefix === CustomerIdentityService::PREFIX_ORDER) {
            return ['phones' => [], 'emails' => [], 'order_ids' => [(int) $value]];
        }

        if ($prefix === CustomerIdentityService::PREFIX_EMAIL) {
            return ['phones' => [], 'emails' => [$value], 'order_ids' => []];
        }

        // Phone ref — find every raw stored variant that normalizes to the E.164.
        $raw = Order::where('store_id', $storeId)
            ->whereNull('customer_id')
            ->whereNotNull('customer_phone')
            ->where('customer_phone', '<>', '')
            ->distinct()
            ->pluck('customer_phone');

        $phones = [];
        foreach ($raw as $candidate) {
            if ($this->identity->normalizePhone($candidate) === $value) {
                $phones[] = (string) $candidate;
            }
        }

        return ['phones' => $phones, 'emails' => [], 'order_ids' => []];
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<mixed>  $query
     * @return \Illuminate\Support\Collection<int,object>
     */
    private function aggregateOrders($query)
    {
        $nonValid = CustomerIdentityService::nonValidStatusesSql();

        return $query
            ->selectRaw(
                "COALESCE(NULLIF(currency, ''), '') AS currency,
                 COUNT(*) AS orders_count,
                 SUM(CASE WHEN status IN ({$nonValid}) THEN 1 ELSE 0 END) AS cancelled_count,
                 SUM(CASE WHEN status NOT IN ({$nonValid}) THEN 1 ELSE 0 END) AS valid_count,
                 SUM(CASE WHEN status NOT IN ({$nonValid}) THEN total_amount ELSE 0 END) AS total_value,
                 MIN(created_at) AS first_order_at,
                 MAX(created_at) AS last_order_at"
            )
            ->groupBy('currency')
            ->get();
    }

    /**
     * @param  array<string,mixed>  $identity
     * @param  \Illuminate\Support\Collection<int,object>  $metricsRows
     * @param  \Illuminate\Database\Eloquent\Collection<int,Order>  $orders
     * @param  list<array<string,mixed>>  $addresses
     * @param  \Illuminate\Database\Eloquent\Collection<int,CustomerNote>  $notes
     * @param  \Illuminate\Database\Eloquent\Collection<int,CustomerTag>  $tags
     * @return array<string,mixed>
     */
    private function assemble(int $storeId, string $ref, array $identity, $metricsRows, $orders, array $addresses, $notes, $tags): array
    {
        $refToken = $this->identity->tokenForRef($ref);

        $phoneE164 = $this->identity->normalizePhone($identity['phone']);
        $noteIds = $notes->pluck('created_by')->filter()->unique()->values()->all();
        $creators = User::whereIn('id', $noteIds)->get()->pluck('name', 'id');

        $totals = $this->buildTotals($metricsRows);
        $ordersCount = 0;
        $validCount = 0;
        $cancelledCount = 0;
        foreach ($metricsRows as $row) {
            $ordersCount += (int) $row->orders_count;
            $validCount += (int) $row->valid_count;
            $cancelledCount += (int) $row->cancelled_count;
        }

        return [
            'identity' => [
                'ref_token' => $refToken,
                'kind' => $identity['kind'],
                'id' => $identity['id'],
                'full_name' => $identity['full_name'],
                'email' => $identity['email'],
                'phone' => $identity['phone'],
                'phone_e164' => $phoneE164,
                'whatsapp_url' => $this->identity->whatsappUrl($phoneE164),
                'call_url' => $this->identity->callUrl($phoneE164),
                'is_active' => $identity['is_active'],
                'customer_group' => $identity['customer_group'],
                'created_at' => $identity['created_at'],
                'legacy_note' => $identity['legacy_note'],
            ],
            'overview' => [
                'orders_count' => $ordersCount,
                'valid_count' => $validCount,
                'cancelled_count' => $cancelledCount,
                'is_repeat' => $validCount >= 2,
                'totals' => $totals,
                'first_order_at' => $metricsRows->min('first_order_at') ? date('c', strtotime((string) $metricsRows->min('first_order_at'))) : null,
                'last_order_at' => $metricsRows->max('last_order_at') ? date('c', strtotime((string) $metricsRows->max('last_order_at'))) : null,
            ],
            'orders' => $orders->map(function (Order $order): array {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'total' => (float) $order->total_amount,
                    'currency' => $order->currency ?: 'ILS',
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'payment_method' => $order->payment_method,
                    'items_count' => $order->items_count ?? $order->items()->count(),
                    'date' => $order->created_at->toISOString(),
                    'url' => route('orders.show', $order->id, false),
                ];
            })->values()->all(),
            'addresses' => array_slice($addresses, 0, 10),
            'notes' => $notes->map(function (CustomerNote $note) use ($creators) {
                return [
                    'id' => $note->id,
                    'note' => cleanUtf8($note->note),
                    'created_at' => $note->created_at?->toISOString(),
                    'created_by_name' => $creators->get($note->created_by) ?? null,
                ];
            })->values()->all(),
            'tags' => $tags->map(fn (CustomerTag $tag) => ['id' => $tag->id, 'name' => $tag->name])->values()->all(),
        ];
    }

    /**
     * @param  \Illuminate\Support\Collection<int,object>  $metricsRows
     * @return list<array{currency:string,total:float,count:int,avg:float}>
     */
    private function buildTotals($metricsRows): array
    {
        return $metricsRows
            ->map(function (object $row): array {
                $currency = ($row->currency ?: 'ILS');
                $count = (int) $row->valid_count;
                $total = (float) $row->total_value;

                return [
                    'currency' => $currency,
                    'total' => round($total, 2),
                    'count' => $count,
                    'avg' => $count > 0 ? round($total / $count, 2) : 0,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function addressesFromCustomerRow(Customer $customer): array
    {
        return $customer->addresses->map(function (CustomerAddress $address): array {
            return [
                'source' => 'book',
                'label' => $address->type === 'billing' ? 'billing' : ($address->type === 'shipping' ? 'shipping' : $address->type),
                'address' => cleanUtf8((string) $address->address),
                'city' => cleanUtf8((string) $address->city),
                'state' => cleanUtf8((string) $address->state),
                'postal_code' => cleanUtf8((string) $address->postal_code),
                'country' => cleanUtf8((string) $address->country),
            ];
        })->values()->all();
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Collection<int,Order>|iterable<Order>  $orders
     * @return list<array<string,mixed>>
     */
    private function addressesFromOrders($orders): array
    {
        $seen = [];
        $addresses = [];
        foreach ($orders as $order) {
            $key = strtolower(trim((string) $order->shipping_address . '|' . $order->shipping_city . '|' . $order->shipping_state));
            if ($key === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $addresses[] = [
                'source' => 'order',
                'label' => 'shipping',
                'address' => cleanUtf8((string) $order->shipping_address),
                'city' => cleanUtf8((string) $order->shipping_city),
                'state' => cleanUtf8((string) $order->shipping_state),
                'postal_code' => cleanUtf8((string) $order->shipping_postal_code),
                'country' => cleanUtf8((string) $order->shipping_country),
            ];
        }

        return $addresses;
    }
}