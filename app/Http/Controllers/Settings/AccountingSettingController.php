<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AccountingIntegration;
use App\Models\Store;
use App\Services\AccountingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AccountingSettingController extends Controller
{
 protected AccountingService $accountingService;

    public function __construct(AccountingService $accountingService)
    {
        $this->accountingService = $accountingService;
    }

    public function index()
    {
        $user = Auth::user();
        $storeId = $user->type === 'company' ? getCurrentStoreId($user) : null;

        $integration = $storeId
            ? AccountingIntegration::where('store_id', $storeId)->first()
            : null;

        if ($integration) {
            $integration->makeHidden('api_key');
        }

        return response()->json(['integration' => $integration]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'base_url' => 'required|url',
            'api_key' => 'required|string',
            'sync_orders' => 'boolean',
            'sync_inventory' => 'boolean',
            'is_active' => 'boolean',
        ]);

        $user = Auth::user();
        $storeId = $user->type === 'company' ? getCurrentStoreId($user) : null;

        if (!$storeId) {
            return response()->json(['message' => 'No store selected'], 400);
        }

        $integration = AccountingIntegration::updateOrCreate(
            ['store_id' => $storeId],
            [
                'user_id' => $user->id,
                'base_url' => rtrim($validated['base_url'], '/'),
                'api_key' => $validated['api_key'],
                'sync_orders' => $validated['sync_orders'] ?? true,
                'sync_inventory' => $validated['sync_inventory'] ?? false,
                'is_active' => $validated['is_active'] ?? true,
            ]
        );

        $integration->makeHidden('api_key');

        return response()->json([
            'message' => 'Accounting integration saved successfully',
            'integration' => $integration,
        ]);
    }

    public function destroy()
    {
        $user = Auth::user();
        $storeId = $user->type === 'company' ? getCurrentStoreId($user) : null;

        if (!$storeId) {
            return response()->json(['message' => 'No store selected'], 400);
        }

        AccountingIntegration::where('store_id', $storeId)->delete();

        return response()->json(['message' => 'Accounting integration disconnected']);
    }

    public function testConnection()
    {
        $user = Auth::user();
        $storeId = $user->type === 'company' ? getCurrentStoreId($user) : null;

        if (!$storeId) {
            return response()->json(['message' => 'No store selected'], 400);
        }

        $config = $this->accountingService->getConfig(Store::find($storeId));

        if (!$config) {
            return response()->json(['message' => 'No active integration found'], 404);
        }

        $result = $this->accountingService->testConnection($config);

        return response()->json($result);
    }

    public function syncNow()
    {
        $user = Auth::user();
        $storeId = $user->type === 'company' ? getCurrentStoreId($user) : null;

        if (!$storeId) {
            return response()->json(['message' => 'No store selected'], 400);
        }

        $result = $this->accountingService->initialSync(Store::find($storeId));

        return response()->json($result);
    }
}
