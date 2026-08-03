<?php

namespace App\Http\Controllers\Store;

use App\Http\Controllers\Controller;
use App\Services\AbandonedCartService;
use Illuminate\Http\Request;

class CartTrackingController extends Controller
{
    protected $abandonedCartService;

    public function __construct(AbandonedCartService $abandonedCartService)
    {
        $this->abandonedCartService = $abandonedCartService;
    }

    /**
     * Track cart state for abandoned cart recovery.
     */
    public function track(Request $request)
    {
        $request->validate([
            'store_id' => 'required|exists:stores,id',
            'items' => 'nullable|array',
            'items.*.name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric',
        ]);

        $storeId = $request->store_id;
        $sessionId = session()->getId();
        $customerId = \Auth::guard('customer')->id();

        // Build cart items
        $items = [];
        $total = 0;
        foreach ($request->items ?? [] as $item) {
            $items[] = [
                'name' => $item['name'],
                'quantity' => $item['quantity'],
                'price' => $item['price'],
            ];
            $total += $item['price'] * $item['quantity'];
        }

        // If cart is empty, don't track
        if (empty($items)) {
            return response()->json(['success' => true, 'tracked' => false]);
        }

        // Get customer info if logged in
        $customerEmail = null;
        $customerPhone = null;
        $customerName = null;
        if ($customerId) {
            $customer = \App\Models\Customer::find($customerId);
            if ($customer) {
                $customerEmail = $customer->email;
                $customerPhone = $customer->phone;
                $customerName = $customer->full_name;
            }
        }

        $cart = $this->abandonedCartService->trackCart(
            $storeId,
            $sessionId,
            $customerId,
            $customerEmail,
            $customerPhone,
            $customerName,
            $items,
            $total
        );

        return response()->json([
            'success' => true,
            'tracked' => true,
            'cart_id' => $cart->id,
        ]);
    }
}
