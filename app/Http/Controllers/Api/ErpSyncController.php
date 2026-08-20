<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Services\ErpSyncService;
use Illuminate\Http\Request;

/**
 * Inbound ERP sync endpoints.
 *
 * External/accounting systems push data into a store through these routes.
 * Authentication: X-Store-Id header + X-API-Key header matching an ACTIVE
 * StoreErpConfig for that store.
 */
class ErpSyncController extends Controller
{
    public function __construct(private ErpSyncService $service)
    {
    }

    public function products(Request $request)
    {
        $store = $this->service->verifyRequest($request);
        if (!$store) {
            return response()->json(['success' => false, 'error' => 'Unauthorized: invalid store or API key.'], 401);
        }

        $result = $this->service->syncProducts($store, $request->json()->all(), $this->service->getConfig($store));

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    public function stock(Request $request)
    {
        $store = $this->service->verifyRequest($request);
        if (!$store) {
            return response()->json(['success' => false, 'error' => 'Unauthorized: invalid store or API key.'], 401);
        }

        $result = $this->service->syncStock($store, $request->json()->all(), $this->service->getConfig($store));

        return response()->json($result, $result['success'] ? 200 : 422);
    }
}