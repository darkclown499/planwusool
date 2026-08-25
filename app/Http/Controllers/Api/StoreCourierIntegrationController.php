<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreCourierIntegration;
use App\Services\Courier\CourierRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StoreCourierIntegrationController extends Controller
{
    private function authorizeStoreAccess(Request $request, Store $store): bool
    {
        $user = $request->user();
        if (!$user) return false;
        if ($user->isSuperAdmin() || $user->isAdmin()) return true;
        return (int)$store->user_id === (int)$user->id || (int)$store->id === (int)($user->current_store ?? 0);
    }

    private function validateNoSecretsLeak($integration)
    {
        $data = $integration->toArray();
        unset($data['credentials']);
        $data['credentials_masked'] = $integration->masked_credentials;
        return $data;
    }

    public function index(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) return response()->json(['error'=>'Unauthorized'],403);
        $integrations = StoreCourierIntegration::where('store_id', $store->id)->get()->map(fn($i)=>$this->validateNoSecretsLeak($i));
        return response()->json(['success'=>true,'integrations'=>$integrations,'catalog'=>CourierRegistry::catalog()]);
    }

    public function store(Request $request, Store $store)
    {
        if (!$this->authorizeStoreAccess($request, $store)) return response()->json(['error'=>'Unauthorized'],403);
        $validated = $request->validate([
            'provider' => 'required|string|max:50',
            'credentials' => 'required|array',
            'settings' => 'sometimes|array',
            'display_name' => 'nullable|string|max:100',
        ]);
        $provider = strtolower(trim($validated['provider']));
        // Validate provider is in catalog
        $catalog = collect(CourierRegistry::catalog())->pluck('slug')->toArray();
        if (!in_array($provider, $catalog, true)) {
            return response()->json(['error'=>'Unknown provider'],422);
        }
        // Only allow connecting to supported adapters; others are manual/coming_soon
        $isSupported = CourierRegistry::isSupported($provider);
        if (!$isSupported && !in_array($provider, ['custom'], true)) {
            return response()->json(['error'=>'This provider requires manual coordination. Use طلب ربط.'],422);
        }
        // SSRF protection for custom provider base URL if provided
        if ($provider === 'custom' && !empty($validated['settings']['base_url'])) {
            $url = trim($validated['settings']['base_url']);
            if (!filter_var($url, FILTER_VALIDATE_URL) || !str_starts_with($url, 'https://')) {
                return response()->json(['error'=>'Custom base URL must be a valid https URL'],422);
            }
            $host = parse_url($url, PHP_URL_HOST);
            $blocked = ['localhost','127.0.0.1','0.0.0.0','::1','169.254.169.254'];
            if (in_array(strtolower($host), $blocked, true)) {
                return response()->json(['error'=>'Blocked host'],422);
            }
            // SSRF check for private IP ranges
            $ip = gethostbyname($host);
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
                return response()->json(['error'=>'Private IP not allowed'],422);
            }
        }

        // Encrypt credentials; never log secrets
        $integration = StoreCourierIntegration::updateOrCreate(
            ['store_id'=>$store->id, 'provider'=>$provider],
            [
                'display_name'=>$validated['display_name'] ?? null,
                'credentials'=>$validated['credentials'],
                'settings'=>$validated['settings'] ?? [],
                'status'=>'not_connected',
            ]
        );
        return response()->json(['success'=>true,'integration'=>$this->validateNoSecretsLeak($integration)]);
    }

    public function test(Request $request, Store $store, $integrationId)
    {
        if (!$this->authorizeStoreAccess($request, $store)) return response()->json(['error'=>'Unauthorized'],403);
        $integration = StoreCourierIntegration::where('store_id',$store->id)->where('id',$integrationId)->firstOrFail();
        $provider = CourierRegistry::make($integration->provider);
        if (!$provider) return response()->json(['error'=>'Provider not supported'],422);

        // Rate limit: max 5 tests per minute per integration
        $cacheKey = "courier_test:{$integration->id}";
        $attempts = cache()->get($cacheKey, 0);
        if ($attempts >= 5) return response()->json(['error'=>'Too many tests, try later'],429);
        cache()->put($cacheKey, $attempts+1, 60);

        $integration->update(['status'=>'testing']);
        try {
            $creds = $integration->credentials ?? [];
            $result = $provider->validateCredentials($creds);
            if (!empty($result['valid'])) {
                $integration->update(['status'=>'connected','last_tested_at'=>now(),'last_error'=>null]);
                return response()->json(['success'=>true,'status'=>'connected']);
            } else {
                $integration->update(['status'=>'error','last_tested_at'=>now(),'last_error'=>$result['error'] ?? 'Invalid credentials']);
                return response()->json(['success'=>false,'error'=>$result['error'] ?? 'Invalid'],422);
            }
        } catch (\Throwable $e) {
            Log::warning('Courier test failed', ['integration_id'=>$integration->id, 'error'=>$e->getMessage()]);
            $integration->update(['status'=>'error','last_tested_at'=>now(),'last_error'=>$e->getMessage()]);
            return response()->json(['success'=>false,'error'=>'Connection failed'],500);
        }
    }

    public function destroy(Request $request, Store $store, $integrationId)
    {
        if (!$this->authorizeStoreAccess($request, $store)) return response()->json(['error'=>'Unauthorized'],403);
        $integration = StoreCourierIntegration::where('store_id',$store->id)->where('id',$integrationId)->firstOrFail();
        $integration->delete();
        return response()->json(['success'=>true]);
    }

    public function update(Request $request, Store $store, $integrationId)
    {
        if (!$this->authorizeStoreAccess($request, $store)) return response()->json(['error'=>'Unauthorized'],403);
        $integration = StoreCourierIntegration::where('store_id',$store->id)->where('id',$integrationId)->firstOrFail();
        $validated = $request->validate([
            'is_active'=>'sometimes|boolean',
            'settings'=>'sometimes|array',
            'auto_submit_orders'=>'sometimes|boolean',
            'auto_sync_status'=>'sometimes|boolean',
        ]);
        $integration->update($validated);
        return response()->json(['success'=>true,'integration'=>$this->validateNoSecretsLeak($integration)]);
    }
}
