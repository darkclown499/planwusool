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
    /**
     * Setting keys considered "advanced" storefront features. These are only
     * persisted when the merchant's active plan explicitly includes them
     * (Growth/Professional). Values submitted for lower tiers are discarded so
     * a Free/Starter merchant can never enable them through the raw payload.
     */
    private const ADVANCED_SETTING_KEYS = [
        'whatsapp_widget_enabled',
        'whatsapp_widget_phone',
        'whatsapp_widget_message',
        'whatsapp_widget_position',
        'whatsapp_widget_show_on_mobile',
        'whatsapp_widget_show_on_desktop',
        'custom_css',
        'custom_javascript',
        'custom_head_scripts',
        'custom_body_scripts',
        'secondaryCurrency',
        'exchangeRate',
    ];

    private function resolveStore($storeId)
    {
        $user = Auth::user();

        return resolveStoreQuery($user)->findOrFail($storeId);
    }

    /**
     * Whether the merchant's active plan unlocks advanced (non-plan) storefront
     * settings (custom CSS/JS, WhatsApp widget, secondary currency, …).
     *
     * WARNING: this is a template-editor tier discriminator and must NOT be used
     * as a marketing/tracking entitlement. There is no canonical marketing
     * entitlement in the plans/features architecture (see marketing()).
     */
    private function hasAdvancedPlanTier(): bool
    {
        $user = Auth::user();
        $plan = $user->type === 'company' ? $user->plan : ($user->creator->plan ?? null);

        return $plan && !empty($plan->template_editor_level) && $plan->template_editor_level !== 'none';
    }

    public function show(Request $request, $storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to access store settings.'));
        }

        // Server-side legacy redirects — settings?tab=X -> canonical
        if ($request->has('tab')) {
            $tab = $request->query('tab');
            $map = [
                'shipping' => route('stores.shipping.canonical', $storeId),
                'payments' => route('stores.payments', $storeId),
                'taxes' => route('stores.taxes.canonical', $storeId),
                'domains' => route('stores.domains', $storeId),
                'features' => route('stores.features', $storeId),
                'erp' => route('stores.integrations', $storeId),
                'marketing' => route('stores.tracking', $storeId),
            ];
            if (isset($map[$tab])) {
                return redirect()->to($map[$tab]);
            }
            // only general/seo stay on settings; unknown tabs fall through to general
            if (!in_array($tab, ['general','seo'], true)) {
                return redirect()->route('stores.settings', $storeId);
            }
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
        
        // Publish readiness for frontend guard (mirrors Dashboard checklist but lightweight)
        $userForReadiness = Auth::user();
        $hasProducts = \App\Models\Product::where('store_id', $store->id)->exists();
        $hasShipping = \App\Models\Shipping::where('store_id', $store->id)->exists();
        if (!$hasShipping) $hasShipping = !empty($configuration['shipping_enabled']) || !empty($configuration['shipping_methods']);
        $hasPayments = count(getEnabledPaymentMethods($userForReadiness->id, $store->id)) > 0;
        $publishReadiness = [
            'hasProducts' => $hasProducts,
            'hasShipping' => $hasShipping,
            'hasPayments' => $hasPayments,
            'isReady' => $hasProducts && $hasShipping && $hasPayments,
            'missing' => array_values(array_filter([$hasProducts ? null : 'المنتجات', $hasShipping ? null : 'الشحن والتوصيل', $hasPayments ? null : 'طرق الدفع'])),
        ];

        return Inertia::render('stores/settings', [
            'store' => $store,
            'settings' => $configuration,
            'currencies' => $currencies,
            'timezones' => $timezones,
            'locationData' => $locationData,
            'availableThemes' => Auth::user()->getAvailableThemes(),
            'storeContent' => $store->getMergedStoreContent(),
            'demoStoreUrl' => app(\App\Services\DemoStoreService::class)->demoStoreUrl(),
            'publishReadiness' => $publishReadiness,
        ]);
    }

    /**
     * Legacy marketing route — now redirects to the canonical Marketing Tracking Hub.
     * Kept for backward compatibility (bookmarks, ?tab=marketing). The editable
     * tracking hub lives at stores.tracking (Marketing → التتبع والإعلانات).
     *
     * PLAN GATING DEFERRED: see tracking().
     */
    public function marketing(Request $request, $storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to access store tracking.'));
        }

        // Permanent handoff to the canonical Marketing Tracking Hub.
        return redirect()->route('stores.tracking', $storeId);
    }

    /**
     * Renders the Marketing Tracking Hub (Meta Pixel / TikTok Pixel / GA4)
     * for a store. Values persist through the shared stores.settings.update /
     * autosave endpoints and are exposed to the storefront via
     * ThemeController::getStoreConfig under config.*_pixel_id.
     *
     * This is the CANONICAL merchant-facing location (Marketing → التتبع والإعلانات).
     *
     * PLAN GATING DEFERRED: there is NO canonical marketing/pixel entitlement in
     * the plans/features architecture, so tracking is deliberately NOT coupled to
     * the template-editor tier (`template_editor_level`). Social Commerce is
     * available to every eligible store until a dedicated marketing entitlement
     * is introduced.
     */
    public function tracking(Request $request, $storeId)
    {
        if (!Auth::user()->can('settings-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to access store tracking.'));
        }

        $store = $this->resolveStore($storeId);

        return Inertia::render('marketing/tracking', [
            'store' => $store,
            'settings' => StoreConfiguration::getConfiguration($storeId),
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

        // Persist both the theme slug AND the matching theme.config.json schema
        // so engine themes (market-fast, fashion-luxe, fresh-produce) can render
        // with the exact applied styling/features on the store subdomain.
        $store->theme = $theme;
        $store->theme_config = \App\Services\ThemeConfigService::merge($store->theme_config, $theme);
        $store->save();

        return response()->json([
            'success' => true,
            'theme' => $theme,
            'theme_config' => $store->theme_config,
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
            'settings.custom_head_scripts' => 'nullable|string|max:50000',
            'settings.custom_body_scripts' => 'nullable|string|max:50000',
            'settings.meta_title' => 'nullable|string|max:70',
            'settings.meta_description' => 'nullable|string|max:160',
            'settings.meta_keywords' => 'nullable|string|max:500',
            'settings.og_image' => 'nullable|string|max:1000',
            // Social Commerce tracking IDs — strict allow-lists. Merchant input can
            // never become a raw <script>/HTML/URL: only the exact ID shapes below
            // (or an empty string to clear) pass validation.
            'settings.google_analytics_id' => ['nullable', 'string', 'max:100', function ($attribute, $value, $fail) {
                if ($value === null || trim((string) $value) === '') return;
                if (!preg_match('/^(G-|GT-|UA-|AW-|DC-|YT-)[A-Za-z0-9-]{4,}$/', trim((string) $value))) {
                    $fail(__('معرّف Google Analytics غير صالح. أدخل معرّفاً مثل G-XXXXXXX.'));
                }
            }],
            'settings.meta_pixel_id' => ['nullable', 'string', 'max:100', function ($attribute, $value, $fail) {
                if ($value === null || trim((string) $value) === '') return;
                if (!preg_match('/^\d{10,20}$/', trim((string) $value))) {
                    $fail(__('معرّف Meta Pixel غير صالح. أدخل الأرقام فقط (10-20 رقماً).'));
                }
            }],
            'settings.tiktok_pixel_id' => ['nullable', 'string', 'max:100', function ($attribute, $value, $fail) {
                if ($value === null || trim((string) $value) === '') return;
                if (!preg_match('/^[A-Za-z0-9]{16,24}$/', trim((string) $value))) {
                    $fail(__('معرّف TikTok Pixel غير صالح. أدخل 16-24 حرفاً/رقماً.'));
                }
            }],
            'settings.snapchat_pixel_id' => ['nullable', 'string', 'max:100', function ($attribute, $value, $fail) {
                if ($value === null || trim((string) $value) === '') return;
                if (!preg_match('/^[A-Za-z0-9-]{8,64}$/', trim((string) $value))) {
                    $fail(__('معرّف Snapchat Pixel غير صالح.'));
                }
            }],
            'settings.gtm_id' => ['nullable', 'string', 'max:100', function ($attribute, $value, $fail) {
                if ($value === null || trim((string) $value) === '') return;
                if (!preg_match('/^(GTM|GT)-[A-Z0-9]{4,}$/i', trim((string) $value))) {
                    $fail(__('معرّف Google Tag Manager غير صالح. أدخل معرّفاً مثل GTM-XXXXXXX.'));
                }
            }],
            'settings.logo' => 'nullable|string|max:1000',
            'settings.favicon' => 'nullable|string|max:1000',
            'settings.welcome_message' => 'nullable|string|max:500',
            'settings.store_description' => 'nullable|string|max:2000',
            'settings.copyright_text' => 'nullable|string|max:500',
            'settings.address' => 'nullable|string|max:255',
            'settings.city' => 'nullable|string|max:100',
            'settings.state' => 'nullable|string|max:100',
            'settings.country' => 'nullable|string|max:100',
            'settings.postal_code' => 'nullable|string|max:20',
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
            'settings.store_status' => 'nullable|boolean',
            'settings.maintenance_mode' => 'nullable|boolean',
            'settings.maintenance_message' => 'nullable|string|max:2000',
            'settings.whatsapp_widget_enabled' => 'nullable|boolean',
            'settings.whatsapp_widget_phone' => 'nullable|string|max:20',
            'settings.whatsapp_widget_message' => 'nullable|string|max:1000',
            'settings.whatsapp_widget_position' => 'nullable|in:left,right',
            'settings.whatsapp_widget_show_on_mobile' => 'nullable|boolean',
            'settings.whatsapp_widget_show_on_desktop' => 'nullable|boolean',
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

        // Only keys covered by the explicit whitelist above are persisted.
        // Deliberately NOT merged with the raw request payload, so unknown /
        // plan-gated keys cannot reach store_configurations.
        $settingsToSave = $validated['settings'] ?? [];

        // Normalize Social Commerce tracking IDs before persistence: strip
        // surrounding whitespace, uppercase TikTok IDs (their SDK is
        // case-sensitive), and drop any value that is only whitespace.
        foreach (['google_analytics_id', 'meta_pixel_id', 'tiktok_pixel_id', 'snapchat_pixel_id', 'gtm_id'] as $trackingKey) {
            if (!array_key_exists($trackingKey, $settingsToSave)) continue;
            $value = trim((string) $settingsToSave[$trackingKey]);
            if ($value === '') {
                $settingsToSave[$trackingKey] = '';
                continue;
            }
            if ($trackingKey === 'tiktok_pixel_id') {
                $value = strtoupper($value);
            }
            $settingsToSave[$trackingKey] = $value;
        }

        // Strip advanced (Growth/Pro) storefront features for plans that do
        // not explicitly include them. Skips the whole save for those keys.
        // NOTE: Social Commerce tracking IDs are NOT in ADVANCED_SETTING_KEYS —
        // plan gating is deferred (no canonical marketing entitlement), see
        // marketing().
        if (!$this->hasAdvancedPlanTier()) {
            foreach (self::ADVANCED_SETTING_KEYS as $advancedKey) {
                unset($settingsToSave[$advancedKey]);
            }
        }

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

        // Publish readiness guard — when enabling store_status, ensure merchant has completed the critical path
        // (at least one product + shipping method + payment method) unless the store type explicitly doesn't need them.
        // We do NOT block hard if the business logic indicates a digital/no-shipping store — respect existing flags.
        $enablingStore = isset($settingsToSave['store_status']) && ($settingsToSave['store_status'] === 'true' || $settingsToSave['store_status'] === true || $settingsToSave['store_status'] === 1 || $settingsToSave['store_status'] === '1');
        if ($enablingStore) {
            // Check if we're transitioning from disabled to enabled
            $currentStatusRecord = StoreConfiguration::where('store_id', $storeId)->where('key', 'store_status')->first();
            $currentlyEnabled = $currentStatusRecord ? ($currentStatusRecord->value === 'true') : true;
            $isTransitionToEnabled = !$currentlyEnabled;
            // Also treat first-time publish (no record) as transition if no product/shipping/payment yet
            if ($isTransitionToEnabled || !$currentStatusRecord) {
                $hasProducts = \App\Models\Product::where('store_id', $storeId)->exists();
                $hasShipping = \App\Models\Shipping::where('store_id', $storeId)->exists();
                if (!$hasShipping) {
                    $cfgTmp = StoreConfiguration::getConfiguration($storeId);
                    $hasShipping = !empty($cfgTmp['shipping_enabled']) || !empty($cfgTmp['shipping_methods']);
                }
                $hasPayments = count(getEnabledPaymentMethods($user->id, $storeId)) > 0;
                // Respect store type that doesn't require shipping (e.g. digital goods only)
                $cfgTmp = $cfgTmp ?? StoreConfiguration::getConfiguration($storeId);
                $isDigitalOnly = false; // extend if a flag like 'requires_shipping' exists
                $missing = [];
                if (!$hasProducts) $missing[] = 'المنتجات';
                if (!$hasShipping && !$isDigitalOnly) $missing[] = 'الشحن والتوصيل';
                if (!$hasPayments) $missing[] = 'طرق الدفع';
                if (count($missing) > 0) {
                    // Return structured error so frontend can show direct CTAs
                    return ['error' => __('المتجر غير جاهز للنشر') . ': ' . implode('، ', $missing) . '. ' . __('يرجى إكمال الإعدادات المطلوبة قبل النشر.'), 'missing' => $missing];
                }
            }
        }

        // Check if store_status is being enabled against plan limits
        if ($enablingStore) {
            $companyUser = $user->type === 'company' ? $user : $user->creator;
            if ($companyUser && $companyUser->plan) {
                $currentStatusRecord2 = StoreConfiguration::where('store_id', $storeId)
                    ->where('key', 'store_status')
                    ->first();
                $currentStatus = $currentStatusRecord2 ? ($currentStatusRecord2->value === 'true') : true;

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
            'section' => 'required|string|in:regional,inventory,branding,homepage,address,social,seo,tracking,custom_scripts,status',
        ]);

        $section = $request->input('section');

        $sections = [
            'regional' => ['default_currency', 'timezone', 'language'],
            'inventory' => ['low_stock_threshold'],
            'branding' => ['logo', 'favicon'],
            'homepage' => ['welcome_message', 'store_description', 'copyright_text'],
            'address' => ['address', 'city', 'state', 'country', 'postal_code'],
            'social' => ['social_links', 'facebook_url', 'instagram_url', 'twitter_url', 'youtube_url', 'whatsapp_url', 'email'],
            'seo' => ['meta_title', 'meta_description', 'meta_keywords', 'og_image'],
            'tracking' => ['google_analytics_id', 'meta_pixel_id', 'tiktok_pixel_id', 'snapchat_pixel_id', 'gtm_id'],
            'custom_scripts' => ['custom_head_scripts', 'custom_body_scripts'],
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
