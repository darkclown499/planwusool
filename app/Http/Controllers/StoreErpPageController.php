<?php

namespace App\Http\Controllers;

use App\Models\ProductSyncLog;
use App\Models\StoreErpConfig;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Renders the ERP & Inventory Integration dashboard for a store.
 * Live CRUD/test/sync/logs are handled by Api\StoreErpController.
 */
class StoreErpPageController extends Controller
{
    public function show($storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to access integrations.'));
        }

        $store = resolveStoreQuery(Auth::user())->findOrFail($storeId);

        return Inertia::render('stores/erp', [
            'store' => $store,
            'configs' => StoreErpConfig::where('store_id', $storeId)->orderByDesc('id')->get(),
            'logs' => ProductSyncLog::where('store_id', $storeId)->orderByDesc('synced_at')->limit(50)->get(),
        ]);
    }
}