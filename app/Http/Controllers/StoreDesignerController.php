<?php

namespace App\Http\Controllers;

use App\Models\StoreConfiguration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Renders the visual designer page for a store. The actual editing state is
 * fetched/saved through Api\DesignerController (api/stores/{store}/designer).
 */
class StoreDesignerController extends Controller
{
    public function show($storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to access the store designer.'));
        }

        $store = resolveStoreQuery(Auth::user())->findOrFail($storeId);

        return Inertia::render('stores/designer', [
            'store' => $store,
            'availableThemes' => Auth::user()->getAvailableThemes(),
            'settings' => StoreConfiguration::getConfiguration($storeId),
        ]);
    }

    /**
     * Dedicated theme marketplace/gallery page (/stores/{id}/themes).
     * The template catalog itself lives client-side (resources/js/builder);
     * this only authorizes and resolves the target store.
     */
    public function themes($storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to browse store themes.'));
        }

        $store = resolveStoreQuery(Auth::user())->findOrFail($storeId);

        return Inertia::render('stores/themes', [
            'store' => $store,
            'availableThemes' => Auth::user()->getAvailableThemes(),
        ]);
    }
}