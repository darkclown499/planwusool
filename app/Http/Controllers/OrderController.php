<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Shipping;
use App\Models\Country;
use App\Models\State;
use App\Models\City;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class OrderController extends Controller
{
    /**
     * Workflow groups for the merchant order tabs. Each group maps plain
     * order statuses (the raw taxonomy is never renamed) to a merchant-facing
     * bucket. 'new' + 'in_progress' + 'completed' + 'issues' cover every
     * possible order status exactly once.
     */
    public const ORDER_GROUPS = [
        'new'         => ['pending', 'confirmed'],
        'in_progress' => ['processing', 'shipped'],
        'completed'   => ['delivered'],
        'issues'      => ['cancelled', 'failed', 'refunded'],
    ];

    /**
     * Display a listing of orders with search, filtering, and pagination.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $query = Order::where('store_id', $storeId)
            ->with(['customer', 'items']);

        // ── Search by order number, customer name, phone, email ──
        if ($search = $request->input('search')) {
            $search = trim($search);
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhere('customer_first_name', 'like', "%{$search}%")
                  ->orWhere('customer_last_name', 'like', "%{$search}%")
                  ->orWhere('customer_email', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        // ── Filter by workflow group (preferred) or raw status (backward compatible) ──
        if ($group = $request->input('group')) {
            $group = strtolower($group);
            if (isset(self::ORDER_GROUPS[$group])) {
                $query->whereIn('status', self::ORDER_GROUPS[$group]);
            }
        } elseif ($status = $request->input('status')) {
            $query->where('status', strtolower($status));
        }

        // ── Filter by payment status ──
        if ($paymentStatus = $request->input('payment_status')) {
            $query->where('payment_status', strtolower($paymentStatus));
        }

        // ── Filter by payment method ──
        if ($paymentMethod = $request->input('payment_method')) {
            $query->where('payment_method', strtolower($paymentMethod));
        }

        // ── Filter by order source ──
        if ($source = $request->input('source')) {
            $query->where('order_source', $source);
        }

        // ── Date range filter ──
        if ($dateFrom = $request->input('date_from')) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }
        if ($dateTo = $request->input('date_to')) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        // ── Stats (computed on filtered set for context) ──
        $statsQuery = Order::where('store_id', $storeId);
        $totalOrders = $statsQuery->count();
        $pendingOrders = (clone $statsQuery)->where('status', 'pending')->count();
        $paidOrders = (clone $statsQuery)->where('payment_status', 'paid');
        $totalRevenue = $paidOrders->sum('total_amount');
        $avgOrderValue = $paidOrders->count() > 0 ? $totalRevenue / $paidOrders->count() : 0;

        // ── Per-group tab counts, always store-scoped and filter-free ──
        $groupCounts = ['total' => $totalOrders];
        foreach (self::ORDER_GROUPS as $groupKey => $rawStatuses) {
            $groupCounts[$groupKey] = (clone $statsQuery)->whereIn('status', $rawStatuses)->count();
        }

        // ── Pagination ──
        $perPage = min((int) $request->input('per_page', 15), 50);
        $paginated = $query->orderBy('created_at', 'desc')->paginate($perPage);

        $formattedOrders = $paginated->getCollection()->map(function ($order) {
            $ship = $order->shippingMethod;
            $fulfillmentLabel = 'توصيل شخصي';
            $fulfillmentStatus = $order->status;
            if ($ship) {
                if (!empty($ship->courier_integration_id)) {
                    $shipment = \App\Models\OrderShipment::where('order_id', $order->id)->first();
                    if ($shipment) $fulfillmentStatus = $shipment->status;
                    $fulfillmentLabel = ($ship->delivery_company ?: $ship->courierIntegration?->provider ?? 'شركة مربوطة') . ' — ' . ($shipment ? $shipment->status : 'قيد التجهيز');
                    if ($shipment && $shipment->status === 'delivered') $fulfillmentLabel = ($ship->delivery_company ?: 'شركة') . ' — تم التسليم';
                } elseif (!empty($ship->delivery_company)) {
                    $fulfillmentLabel = $ship->delivery_company . ' — يدوي';
                }
            }
            return [
                'id' => $order->id,
                'orderNumber' => $order->order_number,
                'customer' => $order->customer_first_name . ' ' . $order->customer_last_name,
                'email' => $order->customer_email,
                'phone' => $order->customer_phone,
                'total' => (float) $order->total_amount,
                'status' => ucfirst($order->status),
                'paymentStatus' => ucfirst($order->payment_status),
                'fulfillment' => $fulfillmentLabel,
                'fulfillmentRaw' => $fulfillmentStatus,
                'items' => $order->items->count(),
                'date' => $order->created_at->format('Y-m-d'),
                'paymentMethod' => $order->payment_method,
                'paymentMethodLabel' => $order->payment_method === 'cod' ? 'Cash on Delivery' : ucfirst(str_replace('_', ' ', $order->payment_method)),
                'order_source' => $order->order_source ?? 'storefront',
            ];
        });

        return Inertia::render('orders/index', [
            'orders' => $formattedOrders,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'filters' => [
                'search' => $request->input('search', ''),
                'group' => $request->input('group', ''),
                'status' => $request->input('status', ''),
                'payment_status' => $request->input('payment_status', ''),
                'payment_method' => $request->input('payment_method', ''),
                'source' => $request->input('source', ''),
                'date_from' => $request->input('date_from', ''),
                'date_to' => $request->input('date_to', ''),
            ],
            'stats' => [
                'totalOrders' => $totalOrders,
                'pendingOrders' => $pendingOrders,
                'totalRevenue' => $totalRevenue,
                'avgOrderValue' => $avgOrderValue,
            ],
            'groupCounts' => $groupCounts,
        ]);
    }

    /**
     * Canonical fulfillment validation — delegated to OrderTransitionService
     */
    private function isValidOrderTransition(string $from, string $to): bool
    {
        return \App\Services\OrderTransitionService::isValidTransition($from, $to);
    }

    public function show($id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        
        $order = Order::where('store_id', $storeId)
            ->where('id', $id)
            ->with(['items.product', 'shippingMethod.courierIntegration', 'shippingMethod', 'deliveryDriver:id,name,phone', 'deliveryAssignments' => fn($q) => $q->orderByDesc('id'), 'posTerminal'])
            ->firstOrFail();

        // Load shipments
        $shipments = \App\Models\OrderShipment::where('store_id', $storeId)->where('order_id', $order->id)->with('courierIntegration')->orderBy('created_at')->get();
        $primaryShipment = $shipments->first();
        $shipping = $order->shippingMethod;
        $fulfillmentType = 'personal';
        if ($shipping) {
            if (!empty($shipping->courier_integration_id)) $fulfillmentType = 'connected';
            elseif (!empty($shipping->delivery_company)) $fulfillmentType = 'manual';
            elseif (($shipping->fulfillment_type ?? '') === 'courier') $fulfillmentType = 'connected';
            elseif (($shipping->fulfillment_type ?? '') === 'manual') $fulfillmentType = 'manual';
        }
            
        // Customer order count for history context
        $customerOrderCount = Order::where('store_id', $storeId)
            ->where(function ($q) use ($order) {
                if (!empty($order->customer_email)) {
                    $q->where('customer_email', $order->customer_email);
                } elseif (!empty($order->customer_phone)) {
                    $q->where('customer_phone', $order->customer_phone);
                }
            })->count();

        $formattedOrder = [
            'id' => $order->id,
            'orderNumber' => $order->order_number,
            'store_id' => $order->store_id,
            'order_source' => $order->order_source ?? 'storefront',
            // Safe POS attribution (presentation only). posTerminal is eager-loaded but is
            // resolved/looked up within the same store only; if the terminal was deleted the
            // relation is null and we fall back to the immutable cashier-username snapshot.
            // pos_terminal_id is intentionally NOT exposed to the merchant (it is an internal
            // FK); only the terminal display name and the cashier snapshot are surfaced.
            'pos_attribution' => [
                'is_pos' => strtolower((string) $order->order_source) === 'pos',
                'terminal_name' => ($order->posTerminal && (int) $order->posTerminal->store_id === (int) $storeId)
                    ? $order->posTerminal->name
                    : null,
                'cashier_username' => $order->pos_cashier_username,
            ],
            'whatsapp_number' => $order->whatsapp_number,
            'date' => $order->created_at->format('F j, Y'),
            'status' => $order->status,
            'paymentStatus' => $order->payment_status,
            'paymentMethod' => $order->payment_method,
            'bankTransferReceipt' => $order->bank_transfer_receipt ? route('orders.receipt', $order->id, false) : null,
            'customer' => [
                'name' => $order->customer_first_name . ' ' . $order->customer_last_name,
                'email' => $order->customer_email,
                'phone' => $order->customer_phone,
                'order_count' => $customerOrderCount,
            ],
            // invoice_pdf_url: storefront route is in a domain group — frontend must construct via store slug
            'invoice_pdf_url' => null,
            'shippingAddress' => [
                'name' => $order->customer_first_name . ' ' . $order->customer_last_name,
                'street' => $order->shipping_address,
                'city' => \App\Models\City::find($order->shipping_city)->name ?? $order->shipping_city,
                'state' => \App\Models\State::find($order->shipping_state)->name ?? $order->shipping_state,
                'zip' => $order->shipping_postal_code,
                'country' => \App\Models\Country::find($order->shipping_country)->name ?? $order->shipping_country,
            ],
            'items' => $order->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'name' => $item->product_name,
                    'sku' => $item->product_sku,
                    'quantity' => $item->quantity,
                    'price' => (float) $item->unit_price,
                    'image' => $item->product->cover_image ?? '/placeholder.jpg',
                    'variant' => $item->product_variants,
                    'product_variants' => $item->product_variants,
                ];
            }),
            'summary' => [
                'subtotal' => (float) $order->subtotal,
                'shipping' => (float) $order->shipping_amount,
                'tax' => (float) $order->tax_amount,
                'discount' => (float) $order->discount_amount,
                'total' => (float) $order->total_amount,
            ],
            'shippingMethod' => $order->shippingMethod->name ?? ' ',
            'trackingNumber' => $order->tracking_number,
            'notes' => $order->notes,
            'createdAt' => $order->created_at->format('M j, Y g:i A'),
            'updatedAt' => $order->updated_at->format('M j, Y g:i A'),
            'stats' => [
                'items_count' => $order->items->count(),
                'total_quantity' => $order->items->sum('quantity'),
                'avg_item_price' => $order->items->count() > 0 ? $order->items->avg('unit_price') : 0,
            ],
            'timeline' => $this->buildFulfillmentTimeline($order, $primaryShipment, $fulfillmentType),
            'shipments' => $shipments->map(fn($s)=>[
                'id'=>$s->id,
                'provider'=>$s->provider,
                'provider_ar'=> $s->courierIntegration?->display_name ?? $s->provider,
                'status'=>$s->status,
                'provider_status'=>$s->provider_status,
                'tracking_number'=>$s->tracking_number,
                'tracking_url'=>$s->tracking_url,
                'label_url'=>$s->label_url,
                'last_error'=>$s->last_error,
                'submitted_at'=>$s->submitted_at?->format('Y-m-d H:i'),
                'delivered_at'=>$s->delivered_at?->format('Y-m-d H:i'),
                'can_cancel'=> in_array($s->status, ['pending','created','picked_up','in_transit'], true),
                'can_retry'=> $s->status==='failed',
            ])->values(),
            'fulfillment' => [
                'type'=>$fulfillmentType,
                'shipping_name'=>$shipping->name ?? null,
                'delivery_company'=>$shipping->delivery_company ?? null,
                'courier_integration'=>$primaryShipment?->courierIntegration ? ['provider'=>$primaryShipment->provider, 'status'=>$primaryShipment->courierIntegration->status] : null,
                'primary_shipment'=>$primaryShipment ? [
                    'status'=>$primaryShipment->status,
                    'tracking_number'=>$primaryShipment->tracking_number,
                    'tracking_url'=>$primaryShipment->tracking_url,
                    'label_url'=>$primaryShipment->label_url,
                    'last_error'=>$primaryShipment->last_error,
                ] : null,
                'cod_amount'=> (strtolower($order->payment_method ?? '')==='cod' && strtolower($order->payment_status ?? '')!=='paid') ? (float)$order->total_amount : 0,
            ],
            'payment' => [
                'method'=>$order->payment_method,
                'status'=>$order->payment_status,
                'total'=>(float)$order->total_amount,
                'paid_at'=>$order->paid_at?->format('Y-m-d H:i'),
                'confirmed_by'=>$order->payment_confirmed_by,
                'refunded_amount'=>(float)($order->refunded_amount ?? 0),
                'refunded_at'=>$order->refunded_at?->format('Y-m-d H:i'),
                'cod_amount'=> (strtolower($order->payment_method ?? '')==='cod' && strtolower($order->payment_status ?? '')!=='paid') ? (float)$order->total_amount : 0,
            ],
            // Canonical allowed actions — backend authoritative
            'allowed_actions' => \App\Services\OrderTransitionService::allowedActions($order),
            'allowed_payment_actions' => \App\Services\OrderTransitionService::allowedPaymentActions($order),
            'can_edit' => !in_array(strtolower($order->status), ['cancelled','failed','refunded'], true),
            'delivery' => [
                'zone_id' => $order->delivery_zone_id,
                'zone_name' => $order->delivery_zone_name,
                'fee' => (float) $order->delivery_fee,
                'status' => $order->delivery_status,
                'status_label' => \App\Services\DeliveryLifecycleService::label($order->delivery_status),
                'assigned_at' => $order->delivery_assigned_at?->format('Y-m-d H:i'),
                'driver' => $order->deliveryDriver ? [
                    'id' => $order->deliveryDriver->id,
                    'name' => $order->deliveryDriver->name,
                    'phone' => $order->deliveryDriver->phone,
                ] : null,
                'cod' => (strtolower($order->payment_method ?? '') === 'cod') ? [
                    'amount_expected' => (float) $order->total_amount,
                    'delivery_complete' => strtolower((string) $order->delivery_status) === 'delivered',
                    'collection_status' => strtolower((string) $order->payment_status),
                ] : null,
                'assignments' => $order->deliveryAssignments->map(fn($a) => [
                    'id' => $a->id,
                    'driver_id' => $a->driver_id,
                    'zone_name' => $a->zone_name_snapshot,
                    'delivery_fee' => (float) $a->delivery_fee_snapshot,
                    'status' => $a->delivery_status,
                    'assigned_at' => $a->assigned_at?->format('Y-m-d H:i'),
                    'delivered_at' => $a->delivered_at?->format('Y-m-d H:i'),
                    'failed_at' => $a->failed_at?->format('Y-m-d H:i'),
                    'fail_reason' => $a->fail_reason,
                    'cancelled_at' => $a->cancelled_at?->format('Y-m-d H:i'),
                    'cancel_reason' => $a->cancel_reason,
                ])->values(),
                'allowed_transitions' => $this->deliveryAllowedTransitions($order->delivery_status),
            ],
        ];
        
        // Returns for this order
        $returns = \App\Models\OrderReturn::where('store_id',$storeId)->where('order_id',$order->id)->with('items.orderItem')->orderBy('created_at','desc')->get()->map(function($r){
            return [
                'id'=>$r->id,
                'return_number'=>$r->return_number,
                'status'=>$r->status,
                'refund_status'=>$r->refund_status,
                'refund_amount'=>(float)$r->refund_amount,
                'reason'=>$r->reason,
                'customer_note'=>$r->customer_note,
                'merchant_note'=>$r->merchant_note,
                'created_at'=>$r->created_at->format('Y-m-d H:i'),
                'items'=>$r->items->map(fn($i)=>['id'=>$i->id,'order_item_id'=>$i->order_item_id,'product_name'=>$i->orderItem?->product_name,'quantity'=>$i->quantity,'restocked'=>$i->restocked_quantity,'refund'=>(float)$i->refund_amount,'reason'=>$i->reason])->values(),
            ];
        });

        // WhatsApp Commerce — contextual deep-link actions for this order.
        // Phase 1: wa.me links only; the page lets the merchant edit the message
        // before opening. Never automated.
        $formattedOrder['whatsapp'] = $this->buildWhatsAppOrderBlock($order, $storeId);

        return Inertia::render('orders/show', [
            'order' => $formattedOrder,
            'returns' => $returns,
        ]);
    }

    /**
     * Build the order->whatsapp block: feature flag + available deep-link
     * actions scoped by order status/payment status. Uses the store locale.
     *
     * @return array{enabled: bool, phone: string|null, locale: string, actions: list<array<string,mixed>>}
     */
    private function buildWhatsAppOrderBlock(Order $order, int $storeId): array
    {
        $service = app(\App\Services\WhatsAppCommerceService::class);
        $storeModel = \App\Models\Store::find($storeId);
        $locale = 'ar';
        if ($storeModel) {
            $cfg = \App\Models\StoreConfiguration::getConfiguration($storeId);
            $locale = in_array(($cfg['language'] ?? 'ar'), ['ar', 'en'], true)
                ? (string) $cfg['language']
                : 'ar';
        }

        $enabled = $service->areOrderActionsEnabled($storeId);
        $phoneE164 = \App\Services\PhoneNormalizer::normalize((string) ($order->customer_phone ?? ''));
        $overallEnabled = $enabled && $phoneE164 !== null;

        $actionKeys = [];
        $status = strtolower((string) $order->status);
        $payment = strtolower((string) $order->payment_status);

        // Generic confirmations are always useful.
        $actionKeys[] = 'order_confirmed';
        if ($status === 'pending' || $payment === 'unpaid' || $payment === 'pending') {
            $actionKeys[] = 'payment_reminder';
        }
        if (in_array($status, ['confirmed', 'processing', 'preparing'], true)) {
            $actionKeys[] = 'preparing';
            $actionKeys[] = 'order_received';
        }
        if ($status === 'shipped') {
            $actionKeys[] = 'shipped';
        }
        if ($status === 'delivered') {
            $actionKeys[] = 'delivered';
        }
        if ($status === 'cancelled' || $status === 'failed') {
            $actionKeys[] = 'order_received';
        }
        $actionKeys = array_values(array_unique($actionKeys));

        $actions = [];
        foreach ($actionKeys as $key) {
            $action = $service->orderAction($order, $key, $locale);
            if ($action) {
                $actions[] = $action;
            }
        }

        return [
            'enabled' => $overallEnabled,
            'phone' => $phoneE164,
            'locale' => $locale,
            'actions' => $actions,
        ];
    }

    /**
     * Allowed delivery state transitions for an order (authoritative list).
     */
    private function deliveryAllowedTransitions(?string $status): array
    {
        $status = strtolower((string) $status);
        if (empty($status)) $status = \App\Models\DeliveryAssignment::STATUS_UNASSIGNED;

        $allowed = \App\Services\DeliveryLifecycleService::ALLOWED[$status] ?? [];

        $out = [];
        foreach ($allowed as $to) {
            $out[] = ['status' => $to, 'label' => \App\Services\DeliveryLifecycleService::label($to)];
        }
        return $out;
    }

    private function buildFulfillmentTimeline($order, $shipment, string $fulfillmentType): array
    {
        $isConnected = $fulfillmentType==='connected' && $shipment;
        if ($isConnected) {
            $s = $shipment->status;
            $map = [
                'pending'=>0, 'created'=>1, 'picked_up'=>2, 'in_transit'=>3, 'out_for_delivery'=>3, 'delivered'=>4, 'failed'=>-1, 'returned'=>-1, 'cancelled'=>-1,
            ];
            $idx = $map[$s] ?? 0;
            return [
                ['status'=>'تم استلام الطلب','date'=>$order->created_at->format('Y-m-d H:i'),'completed'=>true, 'current'=>false],
                ['status'=>'قيد التجهيز','date'=>in_array($order->status, ['confirmed','processing','shipped','delivered']) ? $order->updated_at->format('Y-m-d H:i') : null,'completed'=> $idx>=1 || in_array($order->status,['processing','shipped','delivered']),'current'=> $idx===1],
                ['status'=>'جاهز للشحن','date'=> $shipment->submitted_at?->format('Y-m-d H:i'), 'completed'=> $idx>=1,'current'=>false],
                ['status'=>'تم إرسال الطلب إلى شركة التوصيل','date'=>$shipment->submitted_at?->format('Y-m-d H:i'),'completed'=> $idx>=1,'current'=> $idx===1],
                ['status'=>'قيد التوصيل','date'=> in_array($s,['picked_up','in_transit','out_for_delivery']) ? ($shipment->updated_at->format('Y-m-d H:i')) : null,'completed'=> $idx>=3,'current'=> in_array($s,['picked_up','in_transit','out_for_delivery'])],
                ['status'=>'تم التسليم','date'=> $s==='delivered' ? ($shipment->delivered_at?->format('Y-m-d H:i') ?? $shipment->updated_at->format('Y-m-d H:i')) : null,'completed'=> $s==='delivered','current'=> $s==='delivered'],
            ];
        }
        if ($fulfillmentType==='manual') {
            return [
                ['status'=>'تم استلام الطلب','date'=>$order->created_at->format('Y-m-d H:i'),'completed'=>true,'current'=>false],
                ['status'=>'قيد التجهيز','date'=>in_array($order->status,['confirmed','processing','shipped','delivered']) ? $order->updated_at->format('Y-m-d H:i') : null,'completed'=> in_array($order->status,['processing','shipped','delivered']),'current'=> $order->status==='processing'],
                ['status'=>'خرج للتوصيل','date'=>in_array($order->status,['shipped','delivered']) ? $order->updated_at->format('Y-m-d H:i') : null,'completed'=> in_array($order->status,['shipped','delivered']),'current'=> $order->status==='shipped'],
                ['status'=>'تم التسليم','date'=>$order->status==='delivered' ? $order->updated_at->format('Y-m-d H:i') : null,'completed'=> $order->status==='delivered','current'=> $order->status==='delivered'],
            ];
        }
        // personal
        return [
            ['status'=>'تم استلام الطلب','date'=>$order->created_at->format('Y-m-d H:i'),'completed'=>true,'current'=>false],
            ['status'=>'قيد التجهيز','date'=>in_array($order->status,['confirmed','processing','shipped','delivered']) ? $order->updated_at->format('Y-m-d H:i') : null,'completed'=> in_array($order->status,['processing','shipped','delivered']),'current'=> $order->status==='processing'],
            ['status'=>'جاهز للتوصيل','date'=> $order->status==='shipped' ? $order->updated_at->format('Y-m-d H:i') : null,'completed'=> in_array($order->status,['shipped','delivered']),'current'=> $order->status==='shipped'],
            ['status'=>'تم التسليم','date'=>$order->status==='delivered' ? $order->updated_at->format('Y-m-d H:i') : null,'completed'=> $order->status==='delivered','current'=> $order->status==='delivered'],
        ];
    }

    /**
     * Show the form for creating a new order.
     */
    public function create()
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        
        // Get customers for dropdown
        $customers = Customer::where('store_id', $storeId)
            ->select('id', 'first_name', 'last_name', 'email')
            ->get()
            ->map(function ($customer) {
                return [
                    'id' => $customer->id,
                    'name' => cleanUtf8($customer->first_name . ' ' . $customer->last_name),
                    'email' => cleanUtf8($customer->email),
                ];
            });
            
        // Get products for dropdown
        $products = Product::where('store_id', $storeId)
            ->where('is_active', true)
            ->select('id', 'name', 'price', 'sale_price')
            ->get()
            ->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'price' => (float) ($product->sale_price ?? $product->price),
                ];
            });
            
        // Get shipping methods
        $shippingMethods = Shipping::where('store_id', $storeId)
            ->where('is_active', true)
            ->select('id', 'name', 'cost')
            ->get();
        
        return Inertia::render('orders/create', [
            'customers' => $customers,
            'products' => $products,
            'shippingMethods' => $shippingMethods,
        ]);
    }

    /**
     * Show the form for editing the specified order.
     */
    public function edit($id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        
        $order = Order::where('store_id', $storeId)
            ->where('id', $id)
            ->with(['items.product', 'shippingMethod'])
            ->firstOrFail();
            
        // Get customers for dropdown
        $customers = Customer::where('store_id', $storeId)
            ->select('id', 'first_name', 'last_name', 'email')
            ->get()
            ->map(function ($customer) {
                return [
                    'id' => $customer->id,
                    'name' => cleanUtf8($customer->first_name . ' ' . $customer->last_name),
                    'email' => cleanUtf8($customer->email),
                ];
            });
            
        // Get products for dropdown
        $products = Product::where('store_id', $storeId)
            ->where('is_active', true)
            ->select('id', 'name', 'price', 'sale_price')
            ->get()
            ->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'price' => (float) ($product->sale_price ?? $product->price),
                ];
            });
            
        // Get shipping methods
        $shippingMethods = Shipping::where('store_id', $storeId)
            ->where('is_active', true)
            ->select('id', 'name', 'cost')
            ->get();
            
        // Update products to include variants
        $products = Product::where('store_id', $storeId)
            ->where('is_active', true)
            ->select('id', 'name', 'price', 'sale_price', 'variants')
            ->get()
            ->map(function ($product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'price' => (float) ($product->sale_price ?? $product->price),
                    'variants' => is_string($product->variants) ? json_decode($product->variants, true) : ($product->variants ?? []),
                ];
            });
        
        $formattedOrder = [
            'id' => $order->id,
            'orderNumber' => $order->order_number,
            'status' => $order->status,
            'paymentStatus' => $order->payment_status,
            'paymentMethod' => $order->payment_method,
            'customer' => [
                'id' => $order->customer_id,
                'name' => $order->customer_first_name . ' ' . $order->customer_last_name,
                'email' => $order->customer_email,
                'phone' => $order->customer_phone,
            ],
            'shippingAddress' => [
                'address' => $order->shipping_address,
                'city' => \App\Models\City::find($order->shipping_city)->name ?? $order->shipping_city,
                'state' => \App\Models\State::find($order->shipping_state)->name ?? $order->shipping_state,
                'postalCode' => $order->shipping_postal_code,
                'country' => \App\Models\Country::find($order->shipping_country)->name ?? $order->shipping_country,
            ],
            'items' => $order->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'productId' => $item->product_id,
                    'name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'price' => (float) $item->unit_price,
                ];
            }),
            'summary' => [
                'subtotal' => (float) $order->subtotal,
                'shipping' => (float) $order->shipping_amount,
                'tax' => (float) $order->tax_amount,
                'total' => (float) $order->total_amount,
            ],
            'shippingMethodId' => $order->shipping_method_id,
            'trackingNumber' => $order->tracking_number,
            'notes' => $order->notes,
        ];
        
        return Inertia::render('orders/edit', [
            'order' => $formattedOrder,
            'customers' => $customers,
            'products' => $products,
            'shippingMethods' => $shippingMethods,
        ]);
    }

    /**
     * Update the specified order — hardened, transactional, Arabic domain errors.
     * Fulfillment transitions are canonical via OrderTransitionService.
     * Payment status is domain-aware (COD collect semantic, online gateway authority).
     * Edit page: corrects customer/shipping/tracking/notes; status is not edited here — use primary action.
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
         
        $order = Order::where('store_id', $storeId)
            ->where('id', $id)
            ->firstOrFail();
            
        $oldStatus = strtolower((string)$order->status);
        $oldPayment = strtolower((string)$order->payment_status);

        // Validation: status/payment_status now nullable because edit page does not drive workflow.
        // Show page primary action still sends them. Generic edit form omits them.
        $request->validate([
            'status' => 'nullable|string',
            'payment_status' => 'nullable|string',
            'tracking_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:2000',
            // Editable customer/shipping fields (edit page)
            'customer_first_name' => 'nullable|string|max:255',
            'customer_last_name' => 'nullable|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'shipping_address' => 'nullable|string|max:255',
            'shipping_city' => 'nullable|string|max:255',
            'shipping_state' => 'nullable|string|max:255',
            'shipping_postal_code' => 'nullable|string|max:20',
            'shipping_country' => 'nullable|string|max:255',
            'shipping_method_id' => 'nullable|exists:shippings,id',
            'items' => 'nullable|array',
        ], [], [
            'status' => __('Order Status'),
            'payment_status' => __('Payment Status'),
        ]);

        // --- Fulfillment transition (if requested) ---
        $newStatus = $request->filled('status') ? strtolower(trim((string)$request->status)) : $oldStatus;
        if ($newStatus !== $oldStatus) {
            // Prevent delivered/cancelled edits via generic update — use dedicated flows
            if (in_array($oldStatus, ['delivered','cancelled','refunded','failed'], true) && !\App\Services\OrderTransitionService::isValidTransition($oldStatus, $newStatus)) {
                $msg = 'الطلب في حالة نهائية ولا يمكن تغييره';
                if ($request->wantsJson() || $request->expectsJson()) return response()->json(['message'=>$msg,'errors'=>['status'=>[$msg]]], 422);
                return redirect()->back()->withErrors(['status'=>$msg]);
            }
            if (!\App\Services\OrderTransitionService::isValidTransition($oldStatus, $newStatus)) {
                $msg = \App\Services\OrderTransitionService::errorMessage($oldStatus, $newStatus);
                if ($request->wantsJson() || $request->expectsJson()) return response()->json(['message'=>$msg,'errors'=>['status'=>[$msg]]], 422);
                return redirect()->back()->withErrors(['status'=>$msg]);
            }
            // Connected courier: processing → shipped should go via shipment creation, but manual/personal uses this transition.
            // Allow it — service will handle timestamps.
            try {
                $order = \App\Services\OrderTransitionService::transition($order, $newStatus);
            } catch (\Exception $e) {
                $msg = $e->getMessage() ?: 'تعذر تحديث حالة الطلب';
                if ($request->wantsJson() || $request->expectsJson()) return response()->json(['message'=>$msg,'errors'=>['status'=>[$msg]]], 422);
                return redirect()->back()->withErrors(['status'=>$msg]);
            }
            $oldStatus = $newStatus; // for payment checks below
        }

        // --- Payment transition (if requested) ---
        $newPayment = $request->filled('payment_status') ? strtolower(trim((string)$request->payment_status)) : $oldPayment;
        if ($newPayment !== $oldPayment) {
            $pm = strtolower((string)($order->payment_method ?? ''));
            // Block arbitrary online gateway marking as paid
            if ($newPayment === 'paid' && $oldPayment !== 'paid') {
                $canManual = \App\Services\OrderTransitionService::canManuallyMarkPaid($order);
                if (!$canManual) {
                    $msg = 'لا يمكن تأكيد هذا الدفع يدوياً — يتم التحقق عبر بوابة الدفع. استخدم سجل الدفع أو انتظر تأكيد البوابة.';
                    if ($request->wantsJson() || $request->expectsJson()) return response()->json(['message'=>$msg,'errors'=>['payment_status'=>[$msg]]], 422);
                    return redirect()->back()->withErrors(['payment_status'=>$msg]);
                }
                // COD pending → paid must use semantic collect (clearer workflow), but allow here for backwards compat with transition
                if (in_array($pm, ['cod','cash','cash_on_delivery'], true)) {
                    try {
                        $order = \App\Services\OrderTransitionService::collectCod($order);
                    } catch (\Exception $e) {
                        $msg = $e->getMessage();
                        if ($request->wantsJson() || $request->expectsJson()) return response()->json(['message'=>$msg,'errors'=>['payment_status'=>[$msg]]], 422);
                        return redirect()->back()->withErrors(['payment_status'=>$msg]);
                    }
                    $newPayment = 'paid';
                } else {
                    // bank/offline: use the canonical confirm path (sets paid_at + confirmed_by +
                    // idempotent notification + email), same as the dedicated bank endpoints.
                    try {
                        $order = \App\Services\OrderTransitionService::confirmBankTransfer($order);
                    } catch (\Exception $e) {
                        $msg = $e->getMessage();
                        if ($request->wantsJson() || $request->expectsJson()) return response()->json(['message'=>$msg,'errors'=>['payment_status'=>[$msg]]], 422);
                        return redirect()->back()->withErrors(['payment_status'=>$msg]);
                    }
                    $newPayment = 'paid';
                }
            } elseif (in_array($newPayment, ['refunded','partially_refunded','failed'], true)) {
                $msg = 'حالة الدفع هذه تتم عبر مسار الاسترجاع/فشل الدفع النظامي — لا يمكن تغييرها يدوياً من هنا';
                if ($request->wantsJson() || $request->expectsJson()) return response()->json(['message'=>$msg,'errors'=>['payment_status'=>[$msg]]], 422);
                return redirect()->back()->withErrors(['payment_status'=>$msg]);
            } else {
                // generic pending change — allow only for offline if needed
                $order->forceFill(['payment_status'=>$newPayment])->save();
            }
        }

        // --- Editable fields ---
        $updates = [];
        if ($request->filled('tracking_number') || $request->has('tracking_number')) $updates['tracking_number'] = $request->input('tracking_number');
        if ($request->has('notes')) $updates['notes'] = $request->input('notes');
        if ($request->filled('customer_first_name')) $updates['customer_first_name'] = $request->input('customer_first_name');
        if ($request->filled('customer_last_name')) $updates['customer_last_name'] = $request->input('customer_last_name');
        if ($request->filled('customer_email')) $updates['customer_email'] = $request->input('customer_email');
        if ($request->filled('customer_phone')) $updates['customer_phone'] = $request->input('customer_phone');
        if ($request->filled('shipping_address')) $updates['shipping_address'] = $request->input('shipping_address');
        if ($request->filled('shipping_city')) $updates['shipping_city'] = $request->input('shipping_city');
        if ($request->filled('shipping_state')) $updates['shipping_state'] = $request->input('shipping_state');
        if ($request->filled('shipping_postal_code')) $updates['shipping_postal_code'] = $request->input('shipping_postal_code');
        if ($request->filled('shipping_country')) $updates['shipping_country'] = $request->input('shipping_country');
        if ($request->filled('shipping_method_id')) {
            $ship = \App\Models\Shipping::where('id', $request->input('shipping_method_id'))->where('store_id', $storeId)->where('is_active', true)->first();
            if (!$ship) {
                $msg = 'طريقة الشحن غير صالحة لهذا المتجر';
                if ($request->wantsJson() || $request->expectsJson()) return response()->json(['message'=>$msg,'errors'=>['shipping_method_id'=>[$msg]]], 422);
                return redirect()->back()->withErrors(['shipping_method_id'=>$msg]);
            }
            $updates['shipping_method_id'] = $ship->id;
        }
        if (!empty($updates)) {
            try {
                \Illuminate\Support\Facades\DB::transaction(function () use ($order, $updates) {
                    \App\Models\Order::where('id',$order->id)->lockForUpdate()->first();
                    $order->update($updates);
                });
            } catch (\Throwable $e) {
                $msg = 'تعذر حفظ التعديلات: '.$e->getMessage();
                if ($request->wantsJson() || $request->expectsJson()) return response()->json(['message'=>$msg], 500);
                return redirect()->back()->withErrors(['general'=>$msg]);
            }
        }
        
        if ($request->wantsJson() || $request->expectsJson()) {
            return response()->json(['message'=>'تم تحديث الطلب بنجاح','order'=>['id'=>$order->id,'status'=>$order->fresh()->status,'payment_status'=>$order->fresh()->payment_status]]);
        }
        return redirect()->route('orders.show', $id)->with('success', __('Order updated successfully.'));
    }

    /**
     * Semantic: transition via action name — preferred for primary CTA.
     */
    public function transition(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $order = Order::where('store_id',$storeId)->where('id',$id)->firstOrFail();
        $request->validate(['action'=>'required|string']);
        $action = strtolower((string)$request->input('action'));
        $map = [
            'confirm' => 'confirmed',
            'start_processing' => 'processing',
            'mark_shipped' => 'shipped',
            'mark_delivered' => 'delivered',
            'cancel' => 'cancelled',
            'mark_failed' => 'failed',
        ];
        if (!isset($map[$action])) {
            return response()->json(['message'=>'إجراء غير معروف'], 422);
        }
        $target = $map[$action];
        try {
            $fresh = \App\Services\OrderTransitionService::transition($order, $target);
            // Keep the delivery lifecycle consistent: cancelling an order invalidates
            // any active delivery assignment.
            if ($target === 'cancelled') {
                try {
                    \App\Services\DeliveryLifecycleService::cancelActiveAssignment($fresh, 'إلغاء الطلب');
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Delivery cancel on order cancel failed', ['order_id' => $fresh->id, 'error' => $e->getMessage()]);
                }
            }
            return response()->json(['message'=>'تم تحديث حالة الطلب','order'=>['id'=>$fresh->id,'status'=>$fresh->status,'payment_status'=>$fresh->payment_status]]);
        } catch (\Exception $e) {
            return response()->json(['message'=>$e->getMessage(),'errors'=>['status'=>[$e->getMessage()]]], 422);
        }
    }

    /**
     * Semantic COD collect.
     */
    public function collectCod(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $order = Order::where('store_id',$storeId)->where('id',$id)->firstOrFail();
        try {
            $fresh = \App\Services\OrderTransitionService::collectCod($order);
            return response()->json(['message'=>'تم تأكيد استلام المبلغ','order'=>['id'=>$fresh->id,'status'=>$fresh->status,'payment_status'=>$fresh->payment_status]]);
        } catch (\Exception $e) {
            return response()->json(['message'=>$e->getMessage(),'errors'=>['payment_status'=>[$e->getMessage()]]], 422);
        }
    }

    /**
     * Confirm a bank transfer receipt (semantic payment action).
     */
    public function confirmBank(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $order = Order::where('store_id',$storeId)->where('id',$id)->firstOrFail();
        try {
            $fresh = \App\Services\OrderTransitionService::confirmBankTransfer($order);
            return response()->json(['message'=>'تم تأكيد استلام التحويل البنكي','order'=>['id'=>$fresh->id,'status'=>$fresh->status,'payment_status'=>$fresh->payment_status]]);
        } catch (\Exception $e) {
            return response()->json(['message'=>$e->getMessage(),'errors'=>['payment_status'=>[$e->getMessage()]]], 422);
        }
    }

    /**
     * Reject a bank transfer proof. Does NOT delete the order.
     */
    public function rejectBank(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $order = Order::where('store_id',$storeId)->where('id',$id)->firstOrFail();

        $note = null;
        if ($request->filled('note')) {
            $request->validate(['note'=>'nullable|string|max:2000', 'reason'=>'nullable|string|max:2000']);
            $note = trim((string)($request->input('note') ?: $request->input('reason')));
        }

        try {
            $fresh = \App\Services\OrderTransitionService::rejectBankProof($order, $note, $user->id);
            return response()->json(['message'=>'تم رفض إثبات التحويل وإخفاء الطلب من الإيراد المحصّل','order'=>['id'=>$fresh->id,'status'=>$fresh->status,'payment_status'=>$fresh->payment_status]]);
        } catch (\Exception $e) {
            return response()->json(['message'=>$e->getMessage(),'errors'=>['payment_status'=>[$e->getMessage()]]], 422);
        }
    }

    /**
     * Tenant-scoped streaming of a bank transfer receipt (stored on the private/local disk).
     * Only the owning merchant's store may view it — never a public /storage URL.
     */
    public function receipt(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $order = Order::where('store_id',$storeId)->where('id',$id)->firstOrFail();

        $path = $order->bank_transfer_receipt;
        if (!$path) {
            abort(404);
        }

        $disk = \Illuminate\Support\Facades\Storage::disk('local');
        if (!$disk->exists($path)) {
            abort(404);
        }

        $mime = $disk->mimeType($path) ?: 'application/octet-stream';
        return $disk->response($path, null, ['Content-Type' => $mime]);
    }

    /**
     * Remove the specified order.
     */
    public function destroy($id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        
        $order = Order::where('store_id', $storeId)
            ->where('id', $id)
            ->firstOrFail();
        
        // Restore inventory for tracked products before deleting
        if (in_array($order->status, ['pending', 'confirmed', 'processing'])) {
            foreach ($order->items as $item) {
                if ($item->track_inventory && $item->product) {
                    app(\App\Services\InventoryService::class)->restore($item->product->id, $item->quantity, $item->product_variants ? json_decode($item->product_variants, true) : null);
                }
            }
        }
        
        $order->delete();
        
        return redirect()->route('orders.index')->with('success', __('Order deleted successfully.'));
    }
    
    /**
     * Export orders data as CSV.
     */
    public function export()
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        
        $orders = Order::where('store_id', $storeId)
            ->with(['customer', 'items'])
            ->orderBy('created_at', 'desc')
            ->get();
        
        $csvData = [];
        $csvData[] = ['Order Number', 'Customer Name', 'Email', 'Phone', 'Status', 'Payment Status', 'Payment Method', 'Items Count', 'Subtotal', 'Tax', 'Shipping', 'Total', 'Shipping Address', 'Order Date'];
        
        foreach ($orders as $order) {
            $shippingAddress = $order->shipping_address . ', ' . 
                (City::find($order->shipping_city)->name ?? $order->shipping_city) . ', ' . 
                (State::find($order->shipping_state)->name ?? $order->shipping_state) . ' ' . 
                $order->shipping_postal_code . ', ' . 
                (Country::find($order->shipping_country)->name ?? $order->shipping_country);
                
            $csvData[] = [
                $order->order_number,
                $order->customer_first_name . ' ' . $order->customer_last_name,
                $order->customer_email,
                $order->customer_phone ?: 'Not provided',
                ucfirst($order->status),
                ucfirst($order->payment_status),
                $order->payment_method === 'cod' ? 'Cash on Delivery' : ucfirst(str_replace('_', ' ', $order->payment_method)),
                $order->items->count(),
                formatStoreCurrency($order->subtotal, $user->id, $storeId),
                formatStoreCurrency($order->tax_amount, $user->id, $storeId),
                formatStoreCurrency($order->shipping_amount, $user->id, $storeId),
                formatStoreCurrency($order->total_amount, $user->id, $storeId),
                $shippingAddress,
                $order->created_at->format('Y-m-d H:i:s')
            ];
        }
        
        $filename = 'orders-export-' . now()->format('Y-m-d') . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];
        
        $callback = function() use ($csvData) {
            $file = fopen('php://output', 'w');
            foreach ($csvData as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };
        
        return response()->stream($callback, 200, $headers);
    }
}