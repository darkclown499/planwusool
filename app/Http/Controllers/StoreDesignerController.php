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
            // Computed server-side (with the current request) so the live
            // preview link carries the right scheme/port on local/dev hosts
            // instead of the client hardcoding https with no port.
            'storeUrl' => $store->getStoreUrl(request()),
        ]);
    }

    /**
     * Legacy theme gallery route — now consolidated into the Designer.
     * Redirects to /stores/{id}/designer?tab=templates so there is a single
     * source of truth for the template selection UI (StoreTemplatesGrid).
     */
    public function templates($storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to browse store themes.'));
        }

        // Ensure the store exists / user owns it before redirecting.
        resolveStoreQuery(Auth::user())->findOrFail($storeId);

        return redirect()->route('stores.designer', ['id' => $storeId, 'tab' => 'templates']);
    }

    /**
     * Standalone, full-page template preview — opened in its own browser
     * tab so merchants can inspect a candidate theme without losing the
     * gallery in the original tab.
     */
    public function previewTemplate($storeId, $slug)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to browse store themes.'));
        }

        $store = resolveStoreQuery(Auth::user())->findOrFail($storeId);
        $configuration = StoreConfiguration::getConfiguration($store->id);

        return Inertia::render('stores/template-preview', [
            'store' => $store,
            'templateSlug' => $slug,
            'storeBranding' => [
                'name' => $store->name,
                'logo' => $configuration['logo'] ?? null,
                'phone' => $configuration['phone_number'] ?? null,
            ],
        ]);
    }
}