<?php

namespace App\Http\Controllers;

use App\Models\Tax;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class StoreTaxController extends Controller
{
    public function index($storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            abort(403);
        }
        $store = resolveStoreQuery(Auth::user())->findOrFail($storeId);

        $taxes = Tax::where('store_id', $store->id)->get();
        $totalTaxes = $taxes->count();
        $activeTaxes = $taxes->where('is_active', true)->count();
        $averageRate = $taxes->count() > 0 ? $taxes->avg('rate') : 0;

        $taxCollected = 0;
        if ($taxes->count() > 0) {
            $taxIds = $taxes->pluck('id');
            $productsWithTax = \App\Models\Product::whereIn('tax_id', $taxIds)->where('store_id', $store->id)->pluck('id');
            $items = \App\Models\OrderItem::whereIn('product_id', $productsWithTax)->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year)->get();
            foreach ($items as $item) {
                $product = \App\Models\Product::find($item->product_id);
                if ($product && $product->tax) {
                    $taxCollected += ($item->total_price * $product->tax->rate) / 100;
                }
            }
        }

        $user = Auth::user();
        $storeSettings = settings($user->creatorId(), $store->id);
        $currencyCode = $storeSettings['defaultCurrency'] ?? 'ILS';
        $currency = \App\Models\Currency::where('code', $currencyCode)->first();
        $currencySymbol = $currency ? $currency->symbol : '₪';
        $userId = $user->type === 'company' ? $user->id : $user->created_by;
        $pricesIncludeTax = \App\Models\Setting::getSetting('prices_include_tax', $userId, $store->id) === '1';

        return Inertia::render('tax/index', [
            'taxes' => $taxes,
            'store' => $store,
            'stats' => [
                'total' => $totalTaxes,
                'active' => $activeTaxes,
                'averageRate' => round($averageRate, 2),
                'collected' => round($taxCollected, 2),
            ],
            'currencySymbol' => $currencySymbol,
            'pricesIncludeTax' => $pricesIncludeTax,
        ]);
    }
}
