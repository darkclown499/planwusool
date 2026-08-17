<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Plan;
use App\Models\Contact;
use App\Models\Newsletter;
use App\Models\LandingPageSetting;
use App\Models\LandingPageCustomPage;
use App\Models\Store;
use App\Services\DemoStoreService;
use App\Http\Requests\ContactRequest;

class LandingPageController extends Controller
{
    public function show(Request $request)
    {
        $host = $request->getHost();
        $store = null;
        
        // Check if it's a subdomain request for stores
        $hostParts = explode('.', $host);
        if (count($hostParts) > 2) {
            $subdomain = $hostParts[0];
            $store = Store::where('slug', $subdomain)
                ->whereHas('configurations', function($q) {
                    $q->where('key', 'store_status')->where('value', 'true');
                })
                ->first();
        }
        
        // Check for store custom domain
        if (!$store) {
            $store = Store::where('custom_domain', rtrim(preg_replace('/^https?:\/\//', '', $host), '/'))
                ->whereHas('configurations', function($q) {
                    $q->where('key', 'store_status')->where('value', 'true');
                })
                ->first();
        }

        if ($store) {
            // Redirect to store frontend
            return redirect()->route('store.home', ['storeSlug' => $store->slug]);
        }
        
        // Check if landing page is enabled in settings
        if (!isLandingPageEnabled()) {
            return redirect()->route('login');
        }
        
        $landingSettings = LandingPageSetting::getSettings();
        
        $plans = Plan::where('is_plan_enable', 'on')->get()->map(function ($plan) {
            // Build features array based on plan settings
            $features = [];
            if ($plan->enable_custdomain === 'on') $features[] = __('Custom Domain');
            if ($plan->enable_custsubdomain === 'on') $features[] = __('Subdomain');
            if ($plan->pwa_business === 'on') $features[] = __('PWA');
            if ($plan->enable_chatgpt === 'on') $features[] = __('AI Integration');
            if ($plan->enable_shipping_method === 'on') $features[] = __('Shipping Method');
            if ($plan->enable_mobile_app === 'on') $features[] = __('Mobile App');
            if ($plan->enable_branding === 'on') $features[] = __('White Label');
            if ($plan->enable_theme_editor === 'on') $features[] = __('Theme Editor');
            if ($plan->enable_accounting_integration === 'on') $features[] = __('Accounting Integration');

            // Use database prices (yearly only since duration is yearly)
            $yearlyPrice = $plan->yearly_price ?? $plan->price;
            $monthlyPrice = $plan->price;

            return [
                'id' => $plan->id,
                'name' => $plan->name,
                'price' => $monthlyPrice, // Monthly price (for reference)
                'yearly_price' => $yearlyPrice, // Yearly price (primary)
                'duration' => 'yearly', // Yearly only
                'description' => $plan->description,
                'features' => $features,
                // Direct field mapping for frontend
                'max_stores' => $plan->max_stores ?? 0,
                'max_users_per_store' => $plan->max_users_per_store ?? 0,
                'max_products_per_store' => $plan->max_products_per_store ?? 0,
                'max_warehouses' => $plan->max_warehouses ?? 0,
                'storage_limit' => $plan->storage_limit ?? 0,
                'themes' => is_array($plan->themes) ? $plan->themes : [],
                'enable_custdomain' => $plan->enable_custdomain,
                'enable_custsubdomain' => $plan->enable_custsubdomain,
                'enable_branding' => $plan->enable_branding,
                'pwa_business' => $plan->pwa_business,
                'enable_chatgpt' => $plan->enable_chatgpt,
                'enable_shipping_method' => $plan->enable_shipping_method,
                'enable_mobile_app' => $plan->enable_mobile_app,
                'enable_theme_editor' => $plan->enable_theme_editor,
                'enable_accounting_integration' => $plan->enable_accounting_integration,
                'support_hours' => $plan->support_hours ?? 0,
                'support_type' => $plan->support_type ?? 'email',
                'is_trial' => $plan->is_trial,
                'trial_day' => $plan->trial_day ?? 0,
                'domain_type' => $plan->domain_type ?? 'subdomain',
                'is_plan_enable' => $plan->is_plan_enable,
                'is_popular' => (bool) $plan->is_recommended, // Use DB is_recommended field
            ];
        });
        
        // No longer override is_popular based on subscriber count
        // The DB is_recommended field is used instead
        
        // Get featured stores instead of campaigns
        $featuredStores = Store::whereHas('configurations', function($q) {
                $q->where('key', 'store_status')->where('value', 'true');
            })
            ->where('is_featured', true)
            ->limit(6)
            ->get()
            ->map(function ($store) {
                return [
                    'id' => $store->id,
                    'name' => $store->name,
                    'description' => $store->description,
                    'slug' => $store->slug,
                    'logo' => $store->logo,
                ];
            });
        
        return Inertia::render('landing-page/index', [
            'title' => getSetting('metaTitle', '') ?: getSetting('titleText', config('app.name', 'Wusool')),
            'plans' => $plans,
            'testimonials' => [],
            'faqs' => [],
            'customPages' => LandingPageCustomPage::active()->ordered()->get() ?? [],
            'settings' => $landingSettings,
            'featuredStores' => $featuredStores,
            'demoStoreUrl' => app(DemoStoreService::class)->demoStoreUrl(),
            'superadminLogoDark' => \App\Models\Setting::getSetting('logoDark', getSuperadminId(), null),
            'superadminLogoLight' => \App\Models\Setting::getSetting('logoLight', getSuperadminId(), null)
        ]);
    }

    public function submitContact(ContactRequest $request)
    {
        Contact::create([
            'name' => $request->name,
            'email' => $request->email,
            'subject' => $request->subject,
            'message' => $request->message,
            'is_landing_page' => true,
            'business_id' => null
        ]);

        return back()->with('success', __('Thank you for your message. We will get back to you soon!'));
    }

    public function subscribe(Request $request)
    {
        $request->validate([
            'email' => 'required|email|max:255'
        ]);

        // firstOrCreate keeps the response identical whether or not the email
        // is already subscribed, so the endpoint cannot be used to enumerate
        // newsletter subscribers.
        Newsletter::firstOrCreate(
            ['email' => strtolower(trim($request->email))],
            ['status' => 'active', 'subscribed_at' => now()]
        );

        return back()->with('success', __('Thank you for subscribing to our newsletter!'));
    }

    public function settings()
    {
        $landingSettings = LandingPageSetting::getSettings();
        
        return Inertia::render('landing-page/settings', [
            'settings' => $landingSettings
        ]);
    }

    public function updateSettings(Request $request)
    {
        $request->validate([
            'company_name' => 'required|string|max:255',
            'contact_email' => 'required|email|max:255',
            'contact_phone' => 'required|string|max:255',
            'contact_address' => 'required|string|max:255',
            'config_sections' => 'required|array'
        ]);
        $landingSettings = LandingPageSetting::getSettings();
        $landingSettings->update($request->all());

        return back()->with('success', __('Landing page settings updated successfully!'));
    }

    /**
     * Encrypt plan ID for secure registration links
     */
    public function encryptPlanId(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|integer|exists:plans,id',
        ]);

        $encrypted = \Illuminate\Support\Facades\Crypt::encryptString((string)$request->plan_id);

        return response()->json(['encrypted_plan_id' => $encrypted]);
    }

    public function about()
    {
        return Inertia::render('static/AboutPage');
    }

    public function features()
    {
        return Inertia::render('static/FeaturesPage');
    }

    public function terms()
    {
        return Inertia::render('static/TermsPage');
    }

    public function privacy()
    {
        return Inertia::render('static/PrivacyPage');
    }
}