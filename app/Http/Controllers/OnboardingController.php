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

        $plans = Plan::where('is_plan_enable', 1)->orderBy('price')->get()->map(function ($plan) {
            return [
                'id' => $plan->id,
                'name' => $plan->name,
                'price' => (float) $plan->price,
                'duration' => $plan->duration,
                'description' => $plan->description,
                'max_stores' => $plan->max_stores,
                'max_products_per_store' => $plan->max_products_per_store,
                'is_recommended' => (bool) $plan->is_recommended,
            ];
        })->values();

        return Inertia::render('onboarding', [
            'demoStoreUrl' => $demoStoreUrl,
            'storeDomain' => config('app.store_domain', 'localhost'),
            'currencies' => $currencies,
            'plans' => $plans,
            'referralCode' => $user->referral_code,
            'referralUrl' => $user->referral_code ? route('register', ['ref' => $user->referral_code]) : null,
            'defaults' => [
                'name' => $user->name,
                'storeName' => $store->name,
                'language' => in_array($user->lang, ['ar', 'en']) ? $user->lang : 'ar',
                'currency' => $configuration['default_currency'] ?? 'ils',
                'theme' => $store->theme,
            ],
        ]);
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
        $store->theme = $request->theme;
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
        ];

        foreach ($settingsKeys as $key => $value) {
            if ($value !== null && $value !== '') {
                Setting::setSetting($key, $value, $user->id, $store->id);
            }
        }

        $user->name = $request->name;
        $user->lang = $request->language;
        $user->onboarded_at = now();
        $user->save();

        return redirect()->route('dashboard');
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
            $user->update(['current_store' => $store->id]);

            return $store;
        }

        $store = Store::create([
            'name' => $user->name,
            'slug' => Store::generateUniqueSlug($user->name),
            'theme' => 'gadgets',
            'user_id' => $user->id,
            'email' => $user->email,
        ]);

        $user->update(['current_store' => $store->id]);

        return $store;
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
