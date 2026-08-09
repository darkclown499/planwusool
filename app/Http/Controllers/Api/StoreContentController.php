<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;

class StoreContentController extends Controller
{
    /**
     * Get the store's content (merged over structural defaults).
     */
    public function show(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json([
            'content' => $store->getMergedStoreContent(),
        ]);
    }

    /**
     * Save the store's content blob.
     */
    public function update(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $request->validate([
            'content' => 'required|array',
        ]);

        $store->update([
            'store_content' => $request->content,
        ]);

        return response()->json([
            'success' => true,
            'content' => $store->getMergedStoreContent(),
        ]);
    }

    /**
     * Authorize that the authenticated user owns the store.
     */
    protected function authorizeStoreAccess(Request $request, Store $store): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        return $store->user_id === $user->id;
    }
}
