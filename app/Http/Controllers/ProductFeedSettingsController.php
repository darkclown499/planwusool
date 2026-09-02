<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Services\Feeds\ProductFeedService;

/**
 * Merchant-facing Product Feeds page (Marketing → Product Feeds).
 *
 * Provides the store's Google Merchant Center feed URL plus Wusool-side feed
 * eligibility diagnostics. This is a feed-URL integration only — it does NOT
 * claim any Google API/approval integration.
 */
class ProductFeedSettingsController extends Controller
{
    public function index()
    {
        if (!auth()->user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to access product feeds.'));
        }

        $user = auth()->user();
        $storeId = $user->current_store;
        $store = $storeId ? Store::where('id', $storeId)->first() : null;
        if (!$store) {
            return redirect()->back()->with('error', __('No store selected.'));
        }

        $service = app(ProductFeedService::class);
        $stats = $service->dashboardStats($store);
        $canonicalStoreUrl = rtrim($store->getStoreUrl(), '/');

        return inertia('feeds/product-feeds', [
            'store' => $store,
            'googleFeedUrl' => $canonicalStoreUrl . '/feeds/google.xml',
            'csvFeedUrl' => $canonicalStoreUrl . '/feeds/products.csv',
            'stats' => [
                'eligible_items' => $stats['eligible_items'],
                'excluded_products' => $stats['excluded_products'],
                'reasons' => $stats['reasons'],
            ],
        ]);
    }
}
