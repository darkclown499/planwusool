<?php

namespace App\Http\Controllers;

use App\Services\FeatureService;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Renders the unified Features Hub page for a store. Toggles are
 * fetched/saved through Api\FeatureController (api/stores/{store}/features).
 */
class StoreFeaturesController extends Controller
{
    public function show($storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to access store features.'));
        }

        $store = resolveStoreQuery(Auth::user())->findOrFail($storeId);

        return Inertia::render('stores/features', [
            'store' => $store,
            'groups' => FeatureService::getFeatures($store),
            'integrations' => FeatureService::integrations($store),
        ]);
    }
}