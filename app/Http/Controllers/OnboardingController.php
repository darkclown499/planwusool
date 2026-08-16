<?php

namespace App\Http\Controllers;

use App\Models\Currency;
use App\Models\Order;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\Store;
use App\Models\StoreConfiguration;
use App\Services\DemoStoreService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class OnboardingController extends Controller
{
    /**
     * Show the onboarding wizard.
     */
    public function index()
    {
        $user = Auth::user();

        if ($user->onboarded_at) {
            return redirect()->route('dashboard');
        }

        $demoStoreService = app(DemoStoreService::class);
        $demoStoreUrl = $demoStoreService->demoStoreUrl();

        $store = $this->resolveStore($user);
        $configuration = StoreConfiguration::getConfiguration($store->id);

        $currencies = Currency::orderBy('name')->get()->map(function ($currency) {
            return [
                'code' => $currency->code,
                'symbol' => $currency->symbol,
                'name' => $currency->name,
            ];
        })->values();

        $defaults = [
            'name' => $user->name,
            'storeName' => $store->name,
            'language' => 'ar',
            'currency' => strtoupper($configuration['default_currency'] ?? 'ils'),
            'theme' => $store->getTemplateSlug(),
            // The onboarding wizard always starts clean: detail fields are
            // NOT pre-filled from previously saved store data so old values
            // (or test data) never leak back into the form.
            'storeEmail' => $user->email,
            'storeDescription' => '',
            'welcomeMessage' => '',
            'whatsappEnabled' => false,
            'whatsappPhone' => '',
            'address' => '',
            'city' => '',
            'country' => '',
            'logo' => '',
            'timezone' => (
                in_array($tz = getSetting('defaultTimezone'), array_keys(config('timezones', [])), true)
                    ? $tz
                    : 'Asia/Gaza'
            ),
            'publishStore' => true,
        ];

        // Restore autosaved wizard progress so a user who refreshed mid-way
        // keeps what they already typed. Only whitelisted keys are merged.
        $progress = $this->getWizardProgress($store);
        if (!empty($progress)) {
            foreach ($defaults as $key => $value) {
                if (array_key_exists($key, $progress)) {
                    $defaults[$key] = $progress[$key];
                }
            }
        }

        $progressStep = (int) (StoreConfiguration::getConfiguration($store->id)['onboarding_step'] ?? 0);

        return Inertia::render('onboarding', [
            'demoStoreUrl' => $demoStoreUrl,
            'storeDomain' => config('app.store_domain', 'localhost'),
            'currencies' => $currencies,
            'timezones' => config('timezones', []),
            'initialStep' => $progressStep,
            'defaults' => $defaults,
        ]);
    }

    /**
     * Autosave the wizard progress without completing onboarding. The user can
     * refresh or close the tab and pick up right where they left off.
     */
    public function progress(Request $request)
    {
        $user = Auth::user();

        if ($user->onboarded_at) {
            return response()->json(['saved' => false]);
        }

        $request->validate([
            'step' => ['nullable', 'integer', 'min:1', 'max:20'],
            'data' => ['nullable', 'array'],
        ]);

        $store = $this->resolveStore($user);

        $allowed = [
            'name', 'storeName', 'storeSubdomain', 'storeEmail', 'storeDescription',
            'welcomeMessage', 'whatsappEnabled', 'whatsappPhone', 'address', 'city',
            'country', 'logo', 'timezone', 'language', 'currency', 'theme', 'publishStore',
        ];

        $data = $request->input('data', []);
        if (!is_array($data)) {
            $data = [];
        }
        $data = array_intersect_key($data, array_flip($allowed));

        StoreConfiguration::setConfiguration($store->id, 'onboarding_step', (string) $request->integer('step', 1));
        StoreConfiguration::setConfiguration($store->id, 'onboarding_progress', json_encode($data, JSON_UNESCAPED_UNICODE));

        return response()->json(['saved' => true]);
    }

    /**
     * Save the onboarding data.
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        if ($user->onboarded_at) {
            return redirect()->route('dashboard');
        }

        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'store_name' => ['required', 'string', 'max:255'],
            'store_subdomain' => ['required', 'string', 'max:255'],
            'language' => ['required', 'in:ar,en'],
            'currency' => ['required', 'exists:currencies,code'],
            'theme' => ['required', 'string', 'max:100'],
            'store_email' => ['nullable', 'email', 'max:255'],
            'store_description' => ['nullable', 'string', 'max:1000'],
            'welcome_message' => ['nullable', 'string', 'max:500'],
            'whatsapp_enabled' => ['boolean'],
            'whatsapp_phone' => ['nullable', 'string', 'regex:/^\+[1-9]\d{1,14}$/'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'logo' => ['nullable', 'string', 'max:255'],
            'timezone' => ['required', 'string', 'max:100'],
            'publish_store' => ['boolean'],
            'import_demo_products' => ['boolean'],
        ]);

        $store = $this->resolveStore($user);

        $subdomainResult = $this->checkSubdomainAvailability($request->store_subdomain, $store->id);
        if (!$subdomainResult['available']) {
            return back()->withErrors(['store_subdomain' => $subdomainResult['message']])->withInput();
        }

        if ($this->containsBlockedWord($request->store_name)) {
            return back()->withErrors(['store_name' => __('This store name is not allowed.')])->withInput();
        }

        // Only change the slug when the store has no orders yet so existing
        // links and customer history are not broken.
        if (!Order::where('store_id', $store->id)->exists()) {
            $store->slug = $request->store_subdomain;
        }
        $store->name = $request->store_name;
        $store->theme = Store::normalizeThemeSlug($request->theme);
        $store->save();

        $currency = Currency::where('code', $request->currency)->first();

        // Store-level configuration
        StoreConfiguration::setConfiguration($store->id, 'default_currency', $request->currency);
        StoreConfiguration::setConfiguration($store->id, 'language', $request->language);

        // User-level settings consumed by the storefront and helpers
        $settingsKeys = [
            'defaultCurrency' => $request->currency,
            'language' => $request->language,
            'defaultLanguage' => $request->language,
            'currency_code' => $request->currency,
            'currency_symbol' => $currency?->symbol,
            'currency_name' => $currency?->name,
            'currency_position' => 'before',
            'currency_decimals' => 2,
            'decimal_separator' => '.',
            'thousands_separator' => ',',
            'defaultTimezone' => $request->timezone,
        ];

        foreach ($settingsKeys as $key => $value) {
            if ($value !== null && $value !== '') {
                Setting::setSetting($key, $value, $user->id, $store->id);
            }
        }

        // Store-level store details / contact settings
        StoreConfiguration::setConfiguration($store->id, 'email', $request->store_email ?? '');
        StoreConfiguration::setConfiguration($store->id, 'store_description', $request->store_description ?? '');
        StoreConfiguration::setConfiguration($store->id, 'welcome_message', $request->welcome_message ?? '');
        StoreConfiguration::setConfiguration($store->id, 'address', $request->address ?? '');
        StoreConfiguration::setConfiguration($store->id, 'city', $request->city ?? '');
        StoreConfiguration::setConfiguration($store->id, 'country', $request->country ?? '');
        StoreConfiguration::setConfiguration($store->id, 'logo', $request->logo ?? '');

        $whatsappEnabled = $request->boolean('whatsapp_enabled');
        StoreConfiguration::setConfiguration($store->id, 'whatsapp_widget_enabled', $whatsappEnabled ? 'true' : 'false');
        if ($request->whatsapp_phone) {
            StoreConfiguration::setConfiguration($store->id, 'whatsapp_widget_phone', $request->whatsapp_phone);
        }

        // Regional + publish settings
        StoreConfiguration::setConfiguration($store->id, 'timezone', $request->timezone);
        StoreConfiguration::setConfiguration(
            $store->id,
            'store_status',
            $request->boolean('publish_store') ? 'true' : 'false'
        );

        if ($request->boolean('import_demo_products')) {
            // Demo catalog import is best-effort: a failure here must never
            // block the merchant from finishing onboarding.
            try {
                $this->importDemoData($store, $request->language ?? 'ar');
            } catch (\Throwable $e) {
                report($e);
            }
        }

        $user->name = $request->name;
        $user->lang = $request->language;

        // Assign the default (free) plan so the user lands on the dashboard
        // directly instead of being bounced to the plans page.
        if (!$user->plan_id) {
            $defaultPlan = Plan::getDefaultPlan();
            if ($defaultPlan) {
                $user->plan_id = $defaultPlan->id;
                $user->plan_is_active = 1;
            }
        }

        $user->onboarded_at = now();
        $user->save();

        // Onboarding is complete: clear the autosaved wizard progress.
        StoreConfiguration::resetKeys($store->id, ['onboarding_step', 'onboarding_progress']);

        // Show a short "store ready" confirmation page instead of jumping
        // straight into the dashboard.
        return Inertia::render('onboarding/success', [
            'storeName' => $store->name,
            'storeId' => $store->id,
            'storeUrl' => $store->getStoreUrl(),
            'publishStore' => $request->boolean('publish_store'),
            'referralCode' => $user->referral_code,
            'referralUrl' => $user->referral_code ? route('register', ['ref' => $user->referral_code]) : null,
        ]);
    }

    /**
     * Import a sample catalog into the new store in the merchant's language so
     * a fresh merchant starts with a real catalog instead of an empty store.
     */
    private function importDemoData(Store $store, string $lang = 'ar'): void
    {
        app(DemoStoreService::class)->importCatalog($store, $lang);
    }

    /**
     * Live availability check for the chosen subdomain.
     */
    public function checkSubdomain(Request $request)
    {
        $request->validate([
            'subdomain' => ['required', 'string', 'max:255'],
        ]);

        $storeId = Auth::user()->current_store;

        return response()->json(
            $this->checkSubdomainAvailability($request->subdomain, $storeId)
        );
    }

    /**
     * Get the user's store, falling back to creating a new one.
     */
    private function resolveStore($user): Store
    {
        if ($user->current_store) {
            $store = Store::find($user->current_store);
            if ($store) {
                return $store;
            }
        }

        $store = $user->stores()->first();

        if ($store) {
            $user->current_store = $store->id;
            $user->save();

            return $store;
        }

        $store = Store::create([
            'name' => $user->name,
            'slug' => Store::generateUniqueSlug($user->name),
            'theme' => 'basic',
            'email' => $user->email,
        ]);

        // user_id is guarded against mass assignment; assign explicitly.
        $store->user_id = $user->id;
        $store->save();

        $user->current_store = $store->id;
        $user->save();

        return $store;
    }

    /**
     * Read the autosaved wizard progress for a store, if any.
     */
    private function getWizardProgress(Store $store): array
    {
        $raw = StoreConfiguration::getConfiguration($store->id)['onboarding_progress'] ?? '';
        if (!is_string($raw) || $raw === '') {
            return [];
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Check if a subdomain is available, respecting the onboarding rules.
     */
    public function checkSubdomainAvailability(string $subdomain, ?int $storeId = null): array
    {
        $config = config('onboarding');
        $min = $config['subdomain']['min_length'];
        $max = $config['subdomain']['max_length'];
        $pattern = $config['subdomain']['pattern'];

        $slug = strtolower(trim($subdomain));

        if (mb_strlen($slug) < $min || mb_strlen($slug) > $max) {
            return [
                'available' => false,
                'message' => __('Subdomain must be between :min and :max characters long.', ['min' => $min, 'max' => $max]),
            ];
        }

        if (!preg_match($pattern, $slug)) {
            return [
                'available' => false,
                'message' => __('Subdomain may only contain lowercase letters, numbers and hyphens. It cannot start or end with a hyphen.'),
            ];
        }

        if (in_array($slug, $config['reserved_subdomains'], true)) {
            return ['available' => false, 'message' => __('This name is reserved and cannot be used.')];
        }

        if ($this->containsBlockedWord($slug)) {
            return ['available' => false, 'message' => __('This name is not allowed.')];
        }

        $query = Store::where('slug', $slug);
        if ($storeId) {
            $query->where('id', '!=', $storeId);
        }

        if ($query->exists()) {
            return ['available' => false, 'message' => __('This subdomain is already taken.')];
        }

        $customQuery = Store::where('custom_subdomain', $slug)->where('enable_custom_subdomain', true);
        if ($storeId) {
            $customQuery->where('id', '!=', $storeId);
        }

        if ($customQuery->exists()) {
            return ['available' => false, 'message' => __('This subdomain is already taken.')];
        }

        return ['available' => true, 'message' => __('This subdomain is available!')];
    }

    /**
     * Check whether a piece of text contains any blocked word.
     */
    private function containsBlockedWord(string $text): bool
    {
        $normalized = mb_strtolower(preg_replace('/[0-9\-\s_.]/u', '', $text));

        foreach (config('onboarding.blocked_words') as $word) {
            $word = mb_strtolower(trim($word));
            if ($word !== '' && str_contains($normalized, $word)) {
                return true;
            }
        }

        return false;
    }
}
