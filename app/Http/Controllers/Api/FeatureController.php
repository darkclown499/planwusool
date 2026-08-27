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

        $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
        $verificationMethod = $config['customer_verification_method'] ?? 'email';
        return response()->json([
            'success' => true,
            'groups' => FeatureService::getFeatures($store),
            'integrations' => FeatureService::integrations($store),
            'customer_verification_method' => $verificationMethod,
            'mail_status' => \App\Services\StoreMailService::getStatus($store),
            'mail_config' => \App\Services\StoreMailService::getMaskedConfig($store),
        ]);
    }

    public function update(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'key' => 'required|string',
            'enabled' => 'nullable|boolean',
            'value' => 'nullable|string',
        ]);

        $key = $validated['key'];

        // Enum handling: customer_verification_method expects value in [none, email]
        if ($key === 'customer_verification_method') {
            $method = strtolower(trim((string)($validated['value'] ?? '')));
            if ($method === '' && isset($validated['enabled'])) {
                // Allow boolean legacy mapping: enabled=true => email, false => none
                $method = filter_var($validated['enabled'], FILTER_VALIDATE_BOOLEAN) ? 'email' : 'none';
            }
            if ($method === 'email' && !\App\Services\StoreMailService::isConnected($store)) {
                return response()->json(['error' => 'لا يمكنك تفعيل التحقق عبر البريد قبل إعداد وسيلة إرسال البريد الخاصة بمتجرك.', 'needs_mail_config'=>true], 422);
            }
            $ok = FeatureService::setCustomerVerificationMethod($store, $method);
            if (!$ok) {
                return response()->json(['error' => 'Invalid verification method. Use none or email.'], 422);
            }
            return response()->json([
                'success' => true,
                'groups' => FeatureService::getFeatures($store),
                'integrations' => FeatureService::integrations($store),
                'customer_verification_method' => $method,
                'mail_status' => \App\Services\StoreMailService::getStatus($store),
                'mail_config' => \App\Services\StoreMailService::getMaskedConfig($store),
            ]);
        }

        if (!array_key_exists('enabled', $validated) || $validated['enabled'] === null) {
            return response()->json(['error' => 'Missing enabled field for this feature.'], 422);
        }

        // Strict boolean normalisation — "false"/"0"/0/"" must never become true.
        $enabled = filter_var($validated['enabled'], FILTER_VALIDATE_BOOLEAN);

        $ok = FeatureService::setFeature($store, $key, $enabled);

        if (!$ok) {
            return response()->json(['error' => 'This feature is locked or invalid.'], 422);
        }

        $config2 = \App\Models\StoreConfiguration::getConfiguration($store->id);
        return response()->json([
            'success' => true,
            'groups' => FeatureService::getFeatures($store),
            'integrations' => FeatureService::integrations($store),
            'customer_verification_method' => $config2['customer_verification_method'] ?? 'email',
            'mail_status' => \App\Services\StoreMailService::getStatus($store),
            'mail_config' => \App\Services\StoreMailService::getMaskedConfig($store),
        ]);
    }

    protected function authorizeStoreAccess(Request $request, Store $store): bool
    {
        $user = $request->user();
        if (!$user) return false;
        if ($user->isSuperAdmin() || $user->isAdmin()) return true;
        if ((int)$store->user_id === (int)$user->id) return true;
        if ((int)$store->id === (int)($user->current_store ?? 0)) {
            try { return $user->hasPermissionTo('settings-stores'); } catch (\Throwable $e) { return false; }
        }
        return false;
    }
}