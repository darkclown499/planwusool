<?php

namespace App\Http\Controllers;

use App\Models\StoreConfiguration;
use App\Models\Currency;
use App\Models\Country;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class StoreSettingsController extends Controller
{
    private function resolveStore($storeId)
    {
        $user = Auth::user();

        return resolveStoreQuery($user)->findOrFail($storeId);
    }

    public function show($storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to access store settings.'));
        }
        
        $store = $this->resolveStore($storeId);
        $configuration = StoreConfiguration::getConfiguration($storeId);
        $currencies = Currency::select('code', 'name', 'symbol')->get();
        $timezones = config('timezones');

        $locationData = Country::active()->get()->map(function ($country) {
            return [
                'id' => $country->id,
                'name' => $country->name,
                'code' => $country->code,
                'states' => $country->states
                    ->filter(function ($state) { return $state->status; })
                    ->values()
                    ->map(function ($state) {
                        return [
                            'id' => $state->id,
                            'name' => $state->name,
                            'cities' => $state->cities
                                ->filter(function ($city) { return $city->status; })
                                ->values()
                                ->map(function ($city) {
                                    return ['id' => $city->id, 'name' => $city->name];
                                }),
                        ];
                    }),
            ];
        })->values();
        
        return Inertia::render('stores/settings', [
            'store' => $store,
            'settings' => $configuration,
            'currencies' => $currencies,
            'timezones' => $timezones,
            'locationData' => $locationData,
            'availableThemes' => Auth::user()->getAvailableThemes(),
            'storeContent' => $store->getMergedStoreContent(),
            'demoStoreUrl' => app(\App\Services\DemoStoreService::class)->demoStoreUrl(),
        ]);
    }

    /**
     * Update the store's selected theme/template slug.
     */
    public function updateTheme(Request $request, $storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return response()->json(['error' => __('You do not have permission to update the template.')], 403);
        }

        $store = $this->resolveStore($storeId);

        $request->validate([
            'theme' => 'required|string|max:50',
        ]);

        $theme = \App\Models\Store::normalizeThemeSlug($request->theme);
        $available = Auth::user()->getAvailableThemes();

        if (!in_array($theme, $available, true)) {
            return response()->json(['error' => __('This template is not available on your current plan.')], 422);
        }

        $store->update(['theme' => $theme]);

        return response()->json([
            'success' => true,
            'theme' => $theme,
        ]);
    }

    /**
     * Shared validation rules for settings payloads.
     */
    private function validatedRules(): array
    {
        return [
            'settings' => 'required|array',
            'settings.custom_css' => 'nullable|string|max:50000',
            'settings.custom_javascript' => 'nullable|string|max:50000',
            'settings.meta_title' => 'nullable|string|max:70',
            'settings.meta_description' => 'nullable|string|max:160',
            'settings.google_analytics_id' => 'nullable|string|max:100',
            'settings.meta_pixel_id' => 'nullable|string|max:100',
            'settings.default_currency' => 'nullable|string|exists:currencies,code',
            'settings.defaultCurrency' => 'nullable|string|exists:currencies,code',
            'settings.secondaryCurrency' => 'nullable|string|exists:currencies,code',
            'settings.exchangeRate' => 'nullable|numeric|min:0',
            'settings.vat_number' => 'nullable|string|max:100',
            'settings.tax_registration_number' => 'nullable|string|max:100',
            'settings.timezone' => 'nullable|string|max:100',
            'settings.defaultTimezone' => 'nullable|string|max:100',
            'settings.language' => 'nullable|string|max:10',
            'settings.email' => 'nullable|email|max:255',
            'settings.facebook_url' => 'nullable|url|max:500',
            'settings.instagram_url' => 'nullable|url|max:500',
            'settings.twitter_url' => 'nullable|url|max:500',
            'settings.youtube_url' => 'nullable|url|max:500',
            'settings.whatsapp_url' => 'nullable|url|max:500',
            'settings.social_links' => 'nullable|array',
            'settings.social_links.*.platform' => 'required|string|max:50',
            'settings.social_links.*.url' => 'nullable|url|max:500',
            'settings.social_links.*.enabled' => 'nullable|boolean',
            'settings.maintenance_message' => 'nullable|string|max:2000',
            'settings.low_stock_threshold' => 'nullable|integer|min:0|max:9999',
            'settings.low_stock_warning' => 'nullable|integer|min:0|max:9999',
        ];
    }

    /**
     * Persist settings (shared between full save and autosave).
     */
    private function persistSettings(Request $request, $storeId): array
    {
        $user = Auth::user();
        $validated = $request->validate($this->validatedRules());

        // Get all settings from request (not just validated ones)
        $allSettings = $request->input('settings', []);
        $settingsToSave = array_merge($validated['settings'], $allSettings);

        // Normalize social_links and keep legacy keys in sync
        if (array_key_exists('social_links', $settingsToSave) && is_array($settingsToSave['social_links'])) {
            $socialLinks = array_values(array_filter($settingsToSave['social_links'], function ($item) {
                return !empty($item['platform']) && !empty($item['url']);
            }));

            $settingsToSave['social_links'] = $socialLinks;

            $legacyMap = [
                'facebook' => 'facebook_url',
                'instagram' => 'instagram_url',
                'twitter' => 'twitter_url',
                'youtube' => 'youtube_url',
                'whatsapp' => 'whatsapp_url',
            ];

            foreach ($legacyMap as $platform => $legacyKey) {
                $matched = null;
                foreach ($socialLinks as $link) {
                    if ($link['platform'] === $platform && (!isset($link['enabled']) || $link['enabled'])) {
                        $matched = $link['url'];
                        break;
                    }
                }
                $settingsToSave[$legacyKey] = $matched;
            }
        }

        // Validate WhatsApp widget settings only if enabled
        $whatsappEnabled = $settingsToSave['whatsapp_widget_enabled'] ?? false;
        if ($whatsappEnabled === true || $whatsappEnabled === 'true') {
            $phone = $settingsToSave['whatsapp_widget_phone'] ?? '';

            if (empty(trim($phone))) {
                return ['errors' => [
                    'whatsapp_widget_phone' => __('WhatsApp phone number is required when widget is enabled.')
                ]];
            }

            $cleanPhone = preg_replace('/[^0-9+]/', '', $phone);
            if (!str_starts_with($cleanPhone, '+')) {
                $cleanPhone = '+' . ltrim($cleanPhone, '0');
            }

            if (!preg_match('/^\+[1-9]\d{1,14}$/', $cleanPhone)) {
                return ['errors' => [
                    'whatsapp_widget_phone' => __('Invalid WhatsApp phone number. Use international format like +919876543210')
                ]];
            }

            $settingsToSave['whatsapp_widget_phone'] = $cleanPhone;
        }

        // Check if store_status is being enabled against plan limits
        if (isset($settingsToSave['store_status']) && ($settingsToSave['store_status'] === 'true' || $settingsToSave['store_status'] === true)) {
            $companyUser = $user->type === 'company' ? $user : $user->creator;
            if ($companyUser && $companyUser->plan) {
                $currentStatusRecord = StoreConfiguration::where('store_id', $storeId)
                    ->where('key', 'store_status')
                    ->first();
                $currentStatus = $currentStatusRecord ? ($currentStatusRecord->value === 'true') : true;

                if (!$currentStatus) {
                    $activeStores = 0;
                    foreach ($companyUser->stores as $userStore) {
                        if ($userStore->id == $storeId) continue;

                        $storeStatusRecord = StoreConfiguration::where('store_id', $userStore->id)
                            ->where('key', 'store_status')
                            ->first();
                        $storeStatus = $storeStatusRecord ? ($storeStatusRecord->value === 'true') : true;

                        if ($storeStatus) {
                            $activeStores++;
                        }
                    }

                    $maxStores = $companyUser->plan->max_stores ?? 0;
                    if ($activeStores >= $maxStores) {
                        return ['error' => __('Cannot enable store. You have reached your plan limit of :max stores. Please upgrade your plan or disable another store first.', ['max' => $maxStores])];
                    }
                }
            }
        }

        StoreConfiguration::updateConfiguration($storeId, $settingsToSave);

        // Sync regional settings to the settings table so helpers reading
        // camelCase keys (defaultCurrency, defaultTimezone, defaultLanguage)
        // pick up the store-level values.
        $settingsUserId = $user->type === 'company' ? $user->id : $user->created_by;
        $currentStoreId = getCurrentStoreId($user);

        $regionalKeys = [
            'defaultCurrency' => $settingsToSave['defaultCurrency'] ?? ($settingsToSave['default_currency'] ?? null),
            'defaultTimezone' => $settingsToSave['defaultTimezone'] ?? ($settingsToSave['timezone'] ?? null),
            'defaultLanguage' => $settingsToSave['language'] ?? null,
            'secondaryCurrency' => $settingsToSave['secondaryCurrency'] ?? null,
            'exchangeRate' => $settingsToSave['exchangeRate'] ?? null,
            'vat_number' => $settingsToSave['vat_number'] ?? null,
            'tax_registration_number' => $settingsToSave['tax_registration_number'] ?? null,
            'low_stock_threshold' => array_key_exists('low_stock_threshold', $settingsToSave) ? (int) $settingsToSave['low_stock_threshold'] : null,
        ];

        foreach ($regionalKeys as $key => $value) {
            if ($value !== null && $value !== '') {
                updateSetting($key, $value, $settingsUserId, $currentStoreId);
            }
        }

        return ['errors' => []];
    }

    public function update(Request $request, $storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to update store settings.'));
        }

        $store = $this->resolveStore($storeId);

        $result = $this->persistSettings($request, $storeId);

        if (!empty($result['error'])) {
            return redirect()->back()->with('error', $result['error']);
        }

        if (!empty($result['errors'])) {
            return redirect()->back()->withErrors($result['errors'])->withInput();
        }

        return redirect()->back()->with('success', __('Store configuration updated successfully.'));
    }

    public function autosave(Request $request, $storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return response()->json(['status' => 'error', 'message' => __('Permission denied')], 403);
        }

        $store = $this->resolveStore($storeId);

        $result = $this->persistSettings($request, $storeId);

        if (!empty($result['error'])) {
            return response()->json(['status' => 'error', 'message' => $result['error']], 422);
        }

        if (!empty($result['errors'])) {
            return response()->json(['status' => 'error', 'errors' => $result['errors']], 422);
        }

        return response()->json(['status' => 'ok', 'message' => __('Draft saved automatically.')]);
    }

    public function resetSection(Request $request, $storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to update store settings.'));
        }

        $store = $this->resolveStore($storeId);

        $request->validate([
            'section' => 'required|string|in:regional,inventory,branding,homepage,address,social,seo,tracking,status',
        ]);

        $section = $request->input('section');

        $sections = [
            'regional' => ['default_currency', 'timezone', 'language'],
            'inventory' => ['low_stock_threshold'],
            'branding' => ['logo', 'favicon'],
            'homepage' => ['welcome_message', 'store_description', 'copyright_text'],
            'address' => ['address', 'city', 'state', 'country', 'postal_code'],
            'social' => ['social_links', 'facebook_url', 'instagram_url', 'twitter_url', 'youtube_url', 'whatsapp_url', 'email'],
            'seo' => ['meta_title', 'meta_description'],
            'tracking' => ['google_analytics_id', 'meta_pixel_id'],
            'status' => ['store_status', 'maintenance_mode', 'maintenance_message'],
        ];

        StoreConfiguration::resetKeys($storeId, $sections[$section]);

        // Also clear regional camelCase keys in the settings table
        if ($section === 'regional') {
            $user = Auth::user();
            $settingsUserId = $user->type === 'company' ? $user->id : $user->created_by;
            $currentStoreId = getCurrentStoreId($user);
            foreach (['defaultCurrency', 'defaultTimezone', 'defaultLanguage'] as $key) {
                \App\Models\Setting::where('user_id', $settingsUserId)
                    ->where('store_id', $currentStoreId)
                    ->where('key', $key)
                    ->delete();
            }
        }

        return redirect()->back()->with('success', __('Settings have been reset to default.'));
    }
}
