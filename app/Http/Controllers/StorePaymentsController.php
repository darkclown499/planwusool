<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;

/**
 * Hand-off for the legacy per-store payment settings page. Enable/disable toggles
 * + API keys live in the Payments Hub ("المدفوعات والتحصيل") method configuration
 * tab — this route redirects there (GET only; no duplicate editable forms).
 */
class StorePaymentsController extends Controller
{
    public function show($storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to access payment settings.'));
        }

        $store = resolveStoreQuery(Auth::user())->findOrFail($storeId);

        return redirect()->route('cod-payments.index', ['tab' => 'methods']);
    }
}