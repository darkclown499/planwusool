<?php

namespace App\Http\Controllers;

use App\Services\StorePreviewService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StorePreviewController extends Controller
{
    /**
     * Generate a short-lived signed preview URL for an unpublished store.
     * Requires store ownership (via resolveStoreQuery). Returns JSON with
     * the URL so Dashboard/Designer can open a real storefront tab.
     */
    public function token(Request $request, $id)
    {
        $store = resolveStoreQuery(Auth::user())->findOrFail($id);

        // Also validate the token param for plan allowlist is respected later
        // — we just generate the base preview URL here; ThemeController
        // enforces template allowlist on actual render.
        $url = StorePreviewService::generatePreviewUrl($store, $request);

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                'preview_url' => $url,
                'expires_in' => StorePreviewService::EXPIRY_MINUTES * 60,
            ]);
        }

        return redirect()->away($url);
    }
}
