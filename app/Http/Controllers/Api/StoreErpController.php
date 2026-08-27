<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductSyncLog;
use App\Models\Store;
use App\Models\StoreErpConfig;
use App\Services\ErpSyncService;
use Illuminate\Http\Request;

class StoreErpController extends Controller
{
    public function __construct(private ErpSyncService $service)
    {
    }

    public function index(Request $request, Store $store)
    {
        if (!$this->authorize($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'configs' => StoreErpConfig::where('store_id', $store->id)->orderByDesc('id')->get(),
            'logs' => ProductSyncLog::where('store_id', $store->id)->orderByDesc('synced_at')->limit(50)->get(),
        ]);
    }

    public function store(Request $request, Store $store)
    {
        if (!$this->authorize($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $this->validateConfig($request, $store, false);

        $config = StoreErpConfig::create(array_merge([
            'store_id' => $store->id,
            'last_sync_status' => 'never',
        ], $validated));

        return response()->json(['success' => true, 'config' => $config], 201);
    }

    public function update(Request $request, Store $store, StoreErpConfig $config)
    {
        if (!$this->authorize($request, $store) || (int) $config->store_id !== (int) $store->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $this->validateConfig($request, $store, true, $config);

        if (!array_key_exists('api_key', $validated)) {
            unset($validated['api_key']);
        }

        $config->update($validated);

        return response()->json(['success' => true, 'config' => $config]);
    }

    public function destroy(Request $request, Store $store, StoreErpConfig $config)
    {
        if (!$this->authorize($request, $store) || (int) $config->store_id !== (int) $store->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $config->delete();

        return response()->json(['success' => true]);
    }

    public function test(Request $request, Store $store, StoreErpConfig $config)
    {
        if (!$this->authorize($request, $store) || (int) $config->store_id !== (int) $store->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        return response()->json(['success' => true, 'result' => $this->service->testConnection($config)]);
    }

    public function sync(Request $request, Store $store, StoreErpConfig $config)
    {
        if (!$this->authorize($request, $store) || (int) $config->store_id !== (int) $store->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $result = $this->service->initialSync($config);

        return response()->json(['success' => $result['success'] ?? false, 'result' => $result]);
    }

    public function logs(Request $request, Store $store)
    {
        if (!$this->authorize($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $query = ProductSyncLog::where('store_id', $store->id);

        if ($request->filled('provider')) {
            $query->where('provider', $request->input('provider'));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        return response()->json([
            'success' => true,
            'logs' => $query->orderByDesc('synced_at')->paginate(25),
        ]);
    }

    protected function validateConfig(Request $request, Store $store, bool $isUpdate = false, ?StoreErpConfig $config = null): array
    {
        $validated = $request->validate([
            'provider' => ['required', 'string', 'in:' . implode(',', StoreErpConfig::PROVIDERS)],
            'name' => ['nullable', 'string', 'max:120'],
            'api_endpoint' => ['required', 'string', 'url'],
            'api_key' => ['nullable', 'string'],
            'api_username' => ['nullable', 'string', 'max:120'],
            'api_password' => ['nullable', 'string', 'max:120'],
            'auto_sync_interval' => ['required', 'in:' . implode(',', StoreErpConfig::INTERVALS)],
            'is_active' => ['nullable', 'boolean'],
            'sync_settings' => ['nullable', 'array'],
            'sync_settings.sync_quantity' => ['nullable', 'boolean'],
            'sync_settings.sync_prices' => ['nullable', 'boolean'],
            'sync_settings.sync_images' => ['nullable', 'boolean'],
            'sync_settings.sync_product_details' => ['nullable', 'boolean'],
            'sync_settings.sync_orders' => ['nullable', 'boolean'],
        ]);

        $validated['is_active'] = (bool) ($request->input('is_active', false));

        // Preserve existing secrets when fields are left empty on update (encrypted at rest)
        foreach (['api_key', 'api_password', 'api_username'] as $field) {
            if (($validated[$field] ?? '') === '' && $config) {
                unset($validated[$field]);
            }
        }

        return $validated;
    }

    protected function authorize(Request $request, Store $store): bool
    {
        $user = $request->user();
        if (!$user) return false;
        if ($user->isSuperAdmin() || $user->isAdmin()) return true;
        if ((int)$store->user_id === (int)$user->id) return true;
        if ((int)$store->id === (int)($user->current_store ?? 0)) {
            try { return $user->hasPermissionTo('manage-settings'); } catch (\Throwable $e) { return false; }
        }
        return false;
    }
}