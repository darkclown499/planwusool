<?php

namespace App\Services;

use App\Models\AbandonedCart;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\CustomerNote;
use App\Models\CustomerTag;
use App\Models\LoyaltySetting;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\OrderReturn;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;

/**
 * Customer 360 profile read-model (Phase 1).
 *
 * Resolves the identity ref (canonical or guest) into a tenant-scoped profile:
 * overview metrics, order history, addresses, internal notes, merchant tags,
 * loyalty ledger, abandoned carts and order-linked returns.
 *
 * Order history is limited and links to the canonical merchant order detail
 * page — this service never re-implements the order management screen.
 * Currency amounts are grouped per currency and never silently combined.
 */
class CustomerProfileService
{
    public const HISTORY_LIMIT = 20;
    public const LOYALTY_LIMIT = 10;
    public const CART_LIMIT = 5;
    public const RETURNS_LIMIT = 5;

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

        $customerOrderIds = Order::where('store_id', $storeId)->where('customer_id', $customerId)->pluck('id')->all();

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
            [
                'loyalty' => $this->buildLoyaltySection($storeId, (int) $customer->id),
                'abandoned_carts' => $this->buildCartsSection($storeId, (int) $customer->id, null),
                'returns' => $this->buildReturnsSection($storeId, $customerOrderIds),
            ],
        );
    }

    /**
     * @return array<string,mixed>
     */
    private function profileForGuest(int $storeId, string $ref): array
    {
        $match = $this->resolveGuestMatch($storeId, $ref);
        if (empty($match['order_ids']) && empty($match['phones']) && empty($match['emails'])) {
            // Fail closed: an identity ref that matches nothing (no phones, no
            // emails, no order ids) is NOT this store's customer. Never fall
            // back to whatever newest guest order exists — that would leak one
            // customer's data under another customer's token.
            throw (new ModelNotFoundException)->setModel(Order::class);
        }
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

        $guestOrderIds = (clone $query)->pluck('id')->all();

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
            [
                'loyalty' => $this->buildLoyaltySection($storeId, null),
                'abandoned_carts' => $this->buildCartsSection($storeId, null, $ref),
                'returns' => $this->buildReturnsSection($storeId, $guestOrderIds),
            ],
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
     * @param  array<string,array<string,mixed>>  $sections
     * @return array<string,mixed>
     */
    private function assemble(int $storeId, string $ref, array $identity, $metricsRows, $orders, array $addresses, $notes, $tags, array $sections): array
    {
        $refToken = $this->identity->tokenForRef($ref);

        $phoneE164 = $this->identity->normalizePhone($identity['phone']);
        $noteIds = $notes->pluck('created_by')->filter()->unique()->values()->all();
        $creators = User::whereIn('id', $noteIds)->get()->pluck('name', 'id');

        // WhatsApp Commerce deep-link follow-up action for this customer
        // (Phase 1: wa.me only, edited by merchant before opening).
        $whatsapp = app(WhatsAppCommerceService::class)->customerAction(
            (int) $storeId,
            $phoneE164,
            $identity['full_name']
        );

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
            'whatsapp' => $whatsapp,
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
            'loyalty' => $sections['loyalty'],
            'abandoned_carts' => $sections['abandoned_carts'],
            'returns' => $sections['returns'],
        ];
    }

    /**
     * Loyalty ledger section. Canonical customers get a balance + bounded recent
     * transactions via the canonical loyalty tables. Guest profiles truthfully
     * show "no loyalty account" — a guest has no ledger rows to read.
     *
     * @return array{enabled:bool,has_account:bool,balance:float,transactions:list<array<string,mixed>>}
     */
    private function buildLoyaltySection(int $storeId, ?int $customerId): array
    {
        $enabled = (bool) LoyaltySetting::forStore($storeId)->is_enabled;

        if ($customerId === null) {
            return ['enabled' => $enabled, 'has_account' => false, 'balance' => 0.0, 'transactions' => []];
        }

        $hasAccount = LoyaltyTransaction::where('store_id', $storeId)->where('customer_id', $customerId)->exists();
        $transactions = LoyaltyTransaction::where('store_id', $storeId)
            ->where('customer_id', $customerId)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->limit(self::LOYALTY_LIMIT)
            ->get();

        return [
            'enabled' => $enabled,
            'has_account' => $hasAccount,
            'balance' => round(LoyaltyTransaction::balanceFor($storeId, $customerId), 2),
            'transactions' => $transactions->map(function (LoyaltyTransaction $tx): array {
                return [
                    'id' => $tx->id,
                    'type' => $tx->type,
                    'points' => (float) $tx->points,
                    'balance_after' => (float) $tx->balance_after,
                    'description' => $tx->description,
                    'order_id' => $tx->order_id,
                    'expires_at' => $tx->expires_at?->toISOString(),
                    'created_at' => $tx->created_at?->toISOString(),
                ];
            })->values()->all(),
        ];
    }

    /**
     * Abandoned carts section. Registered customers resolve through the cart's
     * own canonical customer_id FK; guest identities resolve through the same
     * store-scoped contact fields the cart recovery pipeline already uses
     * (normalized phone, email, or the recovered-order link). The recovery
     * token is never exposed.
     *
     * @return array{count:int,recent:list<array<string,mixed>>}
     */
    private function buildCartsSection(int $storeId, ?int $customerId, ?string $ref): array
    {
        $query = AbandonedCart::where('store_id', $storeId);

        if ($customerId !== null) {
            $query->where('customer_id', $customerId);
        } elseif ($ref !== null) {
            $prefix = substr($ref, 0, 2);
            $value = substr($ref, 2);
            switch ($prefix) {
                case CustomerIdentityService::PREFIX_ORDER:
                    $query->where('recovered_order_id', (int) $value);
                    break;
                case CustomerIdentityService::PREFIX_EMAIL:
                    $query->where('customer_email', $value);
                    break;
                case CustomerIdentityService::PREFIX_PHONE:
                    $query->whereIn('customer_phone', $this->matchingGuestCartPhones($storeId, $value));
                    break;
                default:
                    $query->whereRaw('1 = 0');
            }
        } else {
            return ['count' => 0, 'recent' => []];
        }

        $count = (clone $query)->count();
        $recent = $query
            ->orderByRaw('COALESCE(last_activity_at, created_at) DESC, id DESC')
            ->limit(self::CART_LIMIT)
            ->get();

        $recoveredIds = $recent->pluck('recovered_order_id')->filter()->values()->all();
        $orderNumbers = $recoveredIds === []
            ? []
            : Order::whereIn('id', $recoveredIds)->get(['id', 'order_number'])->pluck('order_number', 'id');

        $items = $recent->map(function (AbandonedCart $cart) use ($orderNumbers): array {
            return [
                'id' => $cart->id,
                'status' => $cart->status,
                'value' => round((float) $cart->cart_total, 2),
                'last_activity_at' => $cart->last_activity_at?->toISOString(),
                'reminder_sent_at' => $cart->reminder_sent_at?->toISOString(),
                'whatsapp_status' => $cart->whatsapp_status,
                'recovered_order_id' => $cart->recovered_order_id,
                'recovered_order_number' => $cart->recovered_order_id ? ($orderNumbers->get($cart->recovered_order_id) ?? null) : null,
            ];
        })->values()->all();

        return ['count' => $count, 'recent' => $items];
    }

    /**
     * Every raw phone stored on this store's abandoned carts that normalizes to
     * the exact E.164 — same matching rule the order identity uses.
     *
     * @return list<string>
     */
    private function matchingGuestCartPhones(int $storeId, string $e164): array
    {
        $raw = AbandonedCart::where('store_id', $storeId)
            ->whereNotNull('customer_phone')
            ->where('customer_phone', '<>', '')
            ->distinct()
            ->pluck('customer_phone');

        $phones = [];
        foreach ($raw as $candidate) {
            if ($this->identity->normalizePhone($candidate) === $e164) {
                $phones[] = (string) $candidate;
            }
        }

        return $phones;
    }

    /**
     * Returns section. Returns are linked THROUGH the store-scoped orders of
     * the resolved identity (never by weak email/phone field matching), so a
     * GDPR-erased person's request-time PII can never be re-surfaced here.
     *
     * @param  list<int>  $orderIds
     * @return array{count:int,recent:list<array<string,mixed>>}
     */
    private function buildReturnsSection(int $storeId, array $orderIds): array
    {
        if ($orderIds === []) {
            return ['count' => 0, 'recent' => []];
        }

        $query = OrderReturn::where('store_id', $storeId)->whereIn('order_id', $orderIds);
        $count = (clone $query)->count();
        $recent = $query
            ->orderBy('requested_at', 'desc')
            ->orderBy('id', 'desc')
            ->limit(self::RETURNS_LIMIT)
            ->get();

        $linkedOrderIds = $recent->pluck('order_id')->filter()->values()->all();
        $orderNumbers = $linkedOrderIds === []
            ? []
            : Order::whereIn('id', $linkedOrderIds)->get(['id', 'order_number'])->pluck('order_number', 'id');

        $items = $recent->map(function (OrderReturn $return) use ($orderNumbers): array {
            return [
                'id' => $return->id,
                'return_number' => $return->return_number,
                'status' => $return->status,
                'refund_status' => $return->refund_status,
                'refund_amount' => round((float) $return->refund_amount, 2),
                'requested_at' => $return->requested_at?->toISOString(),
                'order_id' => $return->order_id,
                'order_number' => $orderNumbers->get($return->order_id) ?? null,
                'order_url' => $return->order_id ? route('orders.show', $return->order_id, false) : null,
                'url' => route('returns.show', $return->id, false),
            ];
        })->values()->all();

        return ['count' => $count, 'recent' => $items];
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