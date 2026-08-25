<?php

namespace App\Http\Controllers;

use App\Models\StoreCourierIntegration;
use App\Services\Courier\CourierRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class StoreCourierIntegrationController extends Controller
{
    private function resolveStore($storeId)
    {
        return resolveStoreQuery(Auth::user())->findOrFail($storeId);
    }

    public function index(Request $request, $storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission.'));
        }
        $store = $this->resolveStore($storeId);
        $integrations = StoreCourierIntegration::where('store_id', $store->id)->get()->map(function ($i) {
            return [
                'id' => $i->id,
                'provider' => $i->provider,
                'display_name' => $i->display_name,
                'status' => $i->status,
                'is_active' => $i->is_active,
                'last_tested_at' => $i->last_tested_at,
                'last_error' => $i->last_error,
                'credentials_masked' => $i->masked_credentials,
                'settings' => $i->settings,
            ];
        });
        return Inertia::render('stores/courier-integrations', [
            'store' => $store,
            'integrations' => $integrations,
            'catalog' => CourierRegistry::catalog(),
        ]);
    }
}
