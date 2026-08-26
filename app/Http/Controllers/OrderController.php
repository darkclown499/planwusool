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
     * Display a listing of orders.
     */
    public function index()
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        
        // Get orders for current store
        $orders = Order::where('store_id', $storeId)
            ->with(['customer', 'items'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        // Calculate stats
        $totalOrders = $orders->count();
        $pendingOrders = $orders->where('status', 'pending')->count();
        $paidOrders = $orders->where('payment_status', 'paid');
        $totalRevenue = $paidOrders->sum('total_amount');
        $avgOrderValue = $paidOrders->count() > 0 ? $totalRevenue / $paidOrders->count() : 0;
        // Format orders for frontend with fulfillment column
        $formattedOrders = $orders->map(function ($order) {
            $ship = $order->shippingMethod;
            $fulfillmentLabel = 'توصيل شخصي';
            $fulfillmentStatus = $order->status;
            if ($ship) {
                if (!empty($ship->courier_integration_id)) {
                    // try to get shipment status if exists
                    $shipment = \App\Models\OrderShipment::where('order_id',$order->id)->first();
                    if ($shipment) $fulfillmentStatus = $shipment->status;
                    $fulfillmentLabel = ($ship->delivery_company ?: $ship->courierIntegration?->provider ?? 'شركة مربوطة') . ' — ' . ($shipment ? $shipment->status : 'قيد التجهيز');
                    if ($shipment && $shipment->status==='delivered') $fulfillmentLabel = ($ship->delivery_company ?: 'شركة') . ' — تم التسليم';
                } elseif (!empty($ship->delivery_company)) {
                    $fulfillmentLabel = $ship->delivery_company . ' — يدوي';
                }
            }
            return [
                'id' => $order->id,
                'orderNumber' => $order->order_number,
                'customer' => $order->customer_first_name . ' ' . $order->customer_last_name,
                'email' => $order->customer_email,
                'total' => (float) $order->total_amount,
                'status' => ucfirst($order->status),
                'paymentStatus' => ucfirst($order->payment_status),
                'fulfillment' => $fulfillmentLabel,
                'fulfillmentRaw' => $fulfillmentStatus,
                'items' => $order->items->count(),
                'date' => $order->created_at->format('Y-m-d'),
                'paymentMethod' => $order->payment_method === 'cod' ? 'Cash on Delivery' : ucfirst(str_replace('_', ' ', $order->payment_method)),
            ];
        });
        
        return Inertia::render('orders/index', [
            'orders' => $formattedOrders,
            'stats' => [
                'totalOrders' => $totalOrders,
                'pendingOrders' => $pendingOrders,
                'totalRevenue' => $totalRevenue,
                'avgOrderValue' => $avgOrderValue,
            ]
        ]);
    }

    /**
     * Display the specified order.
     */
    private function isValidOrderTransition(string $from, string $to): bool
    {
        $from = strtolower($from); $to = strtolower($to);
        if ($from === $to) return true;
        $allowed = [
            'pending' => ['confirmed','processing','cancelled'],
            'confirmed' => ['processing','cancelled'],
            'processing' => ['shipped','delivered','cancelled'],
            'shipped' => ['delivered','cancelled','failed','returned'],
            'delivered' => ['returned','refunded'],
            'cancelled' => [],
            'refunded' => [],
            'failed' => [],
        ];
        return in_array($to, $allowed[$from] ?? [], true);
    }

    public function show($id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        
        $order = Order::where('store_id', $storeId)
            ->where('id', $id)
            ->with(['items.product', 'shippingMethod.courierIntegration', 'shippingMethod'])
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
            
        $formattedOrder = [
            'id' => $order->id,
            'orderNumber' => $order->order_number,
            'date' => $order->created_at->format('F j, Y'),
            'status' => ucfirst($order->status),
            'paymentStatus' => ucfirst($order->payment_status),
            'paymentMethod' => $order->payment_method === 'cod' ? 'Cash on Delivery' : ucfirst(str_replace('_', ' ', $order->payment_method)),
            'bankTransferReceipt' => $order->bank_transfer_receipt ? '/storage/' . $order->bank_transfer_receipt : null,
            'customer' => [
                'name' => $order->customer_first_name . ' ' . $order->customer_last_name,
                'email' => $order->customer_email,
                'phone' => $order->customer_phone,
            ],
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
                'cod_amount'=> (strtolower($order->payment_method ?? '')==='cod' && strtolower($order->payment_status ?? '')!=='paid') ? (float)$order->total_amount : 0,
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

        return Inertia::render('orders/show', [
            'order' => $formattedOrder,
            'returns' => $returns,
        ]);
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
     * Update the specified order.
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        
        $order = Order::where('store_id', $storeId)
            ->where('id', $id)
            ->firstOrFail();
            
        // Store old status for event
        $oldStatus = $order->status;
        
        $request->validate([
            'status' => 'required|string',
            'payment_status' => 'required|string',
            'tracking_number' => 'nullable|string',
            'notes' => 'nullable|string',
        ], [], [
            'status' => __('Order Status'),
            'payment_status' => __('Payment Status'),
        ]);

        if (!$this->isValidOrderTransition($oldStatus, $request->status)) {
            return redirect()->back()->withErrors(['status' => __('Invalid status transition from :from to :to', ['from'=>$oldStatus, 'to'=>$request->status])]);
        }

        // Prevent cancelled order from submitting courier shipment later (job will also check)
        $order->update([
            'status' => $request->status,
            'payment_status' => $request->payment_status,
            'tracking_number' => $request->tracking_number,
            'notes' => $request->notes,
        ]);
        
        // Dispatch OrderStatusChanged event if status changed
        if ($oldStatus !== $request->status) {
            event(new \App\Events\OrderStatusChanged($order, $oldStatus, $request->status));
        }
        // Dispatch payment email if payment_status changed to paid (store isolated, afterCommit)
        $oldPayment = $order->getOriginal('payment_status');
        if ($oldPayment !== $request->payment_status && strtolower((string)$request->payment_status)==='paid') {
            try { \App\Jobs\SendStoreCustomerEmail::dispatch($order->store_id, 'payment_received', $order->customer_email, $order->id, null, $order->customer_id)->afterCommit(); } catch (\Throwable $e) {}
        }
        
        // Update order items if provided
        if ($request->has('items')) {
            foreach ($request->items as $itemData) {
                if (isset($itemData['id'])) {
                    $orderItem = $order->items()->find($itemData['id']);
                    if ($orderItem && isset($itemData['variants'])) {
                        $orderItem->update([
                            'product_variants' => json_encode($itemData['variants'])
                        ]);
                    }
                }
            }
        }
        
        return redirect()->route('orders.show', $id)->with('success', __('Order updated successfully.'));
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