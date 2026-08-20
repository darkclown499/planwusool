<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Services\FeatureService;
use Illuminate\Http\Request;

class FeatureController extends Controller
{
    public function show(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'groups' => FeatureService::getFeatures($store),
            'integrations' => FeatureService::integrations($store),
        ]);
    }

    public function update(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'key' => 'required|string',
            'enabled' => 'required|boolean',
        ]);

        $ok = FeatureService::setFeature($store, $validated['key'], (bool) $validated['enabled']);

        if (!$ok) {
            return response()->json(['error' => 'This feature is locked or invalid.'], 422);
        }

        return response()->json([
            'success' => true,
            'groups' => FeatureService::getFeatures($store),
            'integrations' => FeatureService::integrations($store),
        ]);
    }

    protected function authorizeStoreAccess(Request $request, Store $store): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        if ($user->isSuperAdmin() || $user->isAdmin()) {
            return true;
        }

        return (int) $store->user_id === (int) $user->id
            || (int) $store->id === (int) ($user->current_store ?? 0);
    }
}