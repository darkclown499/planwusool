<?php

namespace App\Http\Controllers;

use App\Services\FeatureService;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Renders the dedicated per-store payment settings page. Enable/disable
 * toggles + API keys are fetched/saved through Api\StorePaymentController.
 */
class StorePaymentsController extends Controller
{
    public function show($storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to access payment settings.'));
        }

        $store = resolveStoreQuery(Auth::user())->findOrFail($storeId);

        return Inertia::render('stores/payments', [
            'store' => $store,
            'methods' => FeatureService::PAYMENT_METHODS,
        ]);
    }
}