<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class StoreEmailNotificationsController extends Controller
{
    public function show($storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission.'));
        }
        $store = resolveStoreQuery(Auth::user())->findOrFail($storeId);
        return Inertia::render('stores/email-notifications', ['store'=>$store]);
    }
}
