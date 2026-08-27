<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Services\StoreMailService;
use Illuminate\Http\Request;

class StoreEmailConfigController extends Controller
{
    public function show(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error'=>'Unauthorized'], 403);
        }
        return response()->json([
            'success'=>true,
            'config'=> StoreMailService::getMaskedConfig($store),
        ]);
    }

    public function update(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error'=>'Unauthorized'], 403);
        }
        $validated = $request->validate([
            'provider' => 'nullable|string',
            'driver' => 'nullable|string',
            'host' => 'required|string|max:255',
            'port' => 'required|integer|min:1|max:65535',
            'username' => 'required|string|max:255',
            'password' => 'nullable|string|max:1000',
            'encryption' => 'required|string|in:tls,ssl,none',
            'from_address' => 'required|email|max:255',
            'from_name' => 'required|string|max:255',
        ]);

        // Normalize
        $data = [
            'provider' => $validated['provider'] ?? 'smtp',
            'driver' => $validated['driver'] ?? 'smtp',
            'host' => trim($validated['host']),
            'port' => (string)$validated['port'],
            'username' => trim($validated['username']),
            'encryption' => strtolower(trim($validated['encryption'])),
            'from_address' => trim($validated['from_address']),
            'from_name' => trim($validated['from_name']),
        ];
        // password handling: if blank/masked => preserve
        if (array_key_exists('password', $validated) && $validated['password'] !== null) {
            $data['password'] = $validated['password'];
        }

        StoreMailService::updateConfig($store, $data);

        return response()->json([
            'success'=>true,
            'message'=>'تم حفظ إعدادات البريد',
            'config'=> StoreMailService::getMaskedConfig($store),
        ]);
    }

    public function test(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error'=>'Unauthorized'], 403);
        }
        $validated = $request->validate([
            'email' => 'required|email|max:255',
        ]);

        $result = StoreMailService::testAndSend($store, $validated['email']);

        if ($result['ok']) {
            return response()->json([
                'success'=>true,
                'message'=> $result['message'],
                'config'=> StoreMailService::getMaskedConfig($store),
            ]);
        }
        return response()->json([
            'success'=>false,
            'message'=> $result['message'],
            'error'=> $result['error'] ?? 'send_failed',
            'config'=> StoreMailService::getMaskedConfig($store),
        ], 422);
    }

    protected function authorizeStoreAccess(Request $request, Store $store): bool
    {
        $user = $request->user();
        if (!$user) return false;
        if ($user->isSuperAdmin() || $user->isAdmin()) return true;
        if ((int)$store->user_id === (int)$user->id) return true;
        if ((int)$store->id === (int)($user->current_store ?? 0)) {
            try { return $user->hasPermissionTo('manage-email-settings') || $user->hasPermissionTo('manage-settings'); } catch (\Throwable $e) { return false; }
        }
        return false;
    }
}
