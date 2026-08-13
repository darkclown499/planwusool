<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * بحث عالمي في المنتجات والطلبات والعملاء الخاصة بالمتجر الحالي.
     */
    public function search(Request $request)
    {
        $query = trim($request->get('q', ''));
        $user = auth()->user();

        if ($query === '' || $user->type === 'superadmin') {
            return response()->json([
                'products' => [],
                'orders' => [],
                'customers' => [],
            ]);
        }

        $storeId = getCurrentStoreId($user);
        if (!$storeId) {
            return response()->json([
                'products' => [],
                'orders' => [],
                'customers' => [],
            ]);
        }

        $term = '%' . $query . '%';

        $products = Product::where('store_id', $storeId)
            ->where(function ($q) use ($term) {
                $q->where('name', 'like', $term)
                    ->orWhere('sku', 'like', $term)
                    ->orWhere('description', 'like', $term);
            })
            ->limit(6)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'price' => $p->price,
                'sale_price' => $p->sale_price,
            ]);

        $orders = Order::where('store_id', $storeId)
            ->where(function ($q) use ($term) {
                $q->where('order_number', 'like', $term)
                    ->orWhere('customer_first_name', 'like', $term)
                    ->orWhere('customer_last_name', 'like', $term)
                    ->orWhere('customer_email', 'like', $term)
                    ->orWhere('customer_phone', 'like', $term);
            })
            ->limit(6)
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'order_number' => $o->order_number,
                'customer' => trim($o->customer_first_name . ' ' . $o->customer_last_name),
                'status' => $o->status,
                'total_amount' => $o->total_amount,
            ]);

        $customers = Customer::where('store_id', $storeId)
            ->where(function ($q) use ($term) {
                $q->where('first_name', 'like', $term)
                    ->orWhere('last_name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('phone', 'like', $term);
            })
            ->limit(6)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => trim($c->first_name . ' ' . $c->last_name),
                'email' => $c->email,
                'phone' => $c->phone,
            ]);

        return response()->json([
            'products' => $products,
            'orders' => $orders,
            'customers' => $customers,
        ]);
    }
}
