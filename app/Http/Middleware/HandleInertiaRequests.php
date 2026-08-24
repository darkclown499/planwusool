<?php
namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;
use App\Models\Currency;
use App\Models\Setting;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        // OAuth callback URLs (and the public storage URL) must always use
        // https in production, otherwise Google/Apple/GitHub reject logins
        // with "redirect_uri_mismatch". Prefer the request scheme when it is
        // https, otherwise fall back to APP_URL so the scheme can never
        // regress to http (e.g. Cloudflare Flexible SSL sends the origin
        // plain HTTP plus an X-Forwarded-Proto header).
        $base = $request->getSchemeAndHttpHost();
        if (app()->isProduction() && ! str_starts_with($base, 'https://')) {
            $base = rtrim((string) config('app.url'), '/');
        }
        foreach (['google', 'facebook', 'apple', 'github', 'linkedin', 'plankton'] as $provider) {
            config(["services.{$provider}.redirect" => $base . '/auth/callback/' . $provider]);
        }
        // Also override the public filesystem URL
        config(['filesystems.disks.public.url' => $base . '/storage']);

        // Arabic-first: the auth pages display an Arabic quote instead of the
        // English quotes shipped with Laravel's Inspiring helper.
        $arabicQuotes = [
            'النجاح ليس غياب الفشل، بل هو الإصرار على المحاولة بعد كل فشل - أحمد الشقيري',
            'البداية هي أصعب خطوة، لكنها الأهم - وصول',
            'لا تنتظر الظروف المثالية، ابدأ بما لديك - وصول',
            'اجعل من متجرك علامة تجارية يتذكرها الناس - وصول',
            'التخطيط الجيد هو نصف النجاح، والنصف الآخر هو التنفيذ - وصول',
        ];
        [$message, $author] = explode('-', $arabicQuotes[array_rand($arabicQuotes)]);
        
        // Skip database queries during installation
        if ($request->is('install*') || $request->is('update*') || $request->is('installer*') || !file_exists(storage_path('installed'))) {
            $globalSettings = [
                'currencySymbol' => '₪',
                'currencyNname' => 'Israeli Shekel',
                'base_url' => $request->getSchemeAndHttpHost()
            ];
            $storeCurrency = [
                'code' => 'ILS',
                'symbol' => '₪',
                'name' => 'Israeli Shekel',
                'position' => 'before',
                'decimals' => 2,
                'decimal_separator' => '.',
                'thousands_separator' => ','
            ];
        } else {
            // Get system settings (will use superadmin for unauthenticated users)
            $settings = settings();
            // Get currency symbol
            $currencyCode = $settings['defaultCurrency'] ?? 'ILS';
            $currency = Currency::where('code', $currencyCode)->first();
            $currencySettings = [];
            if ($currency) {
                $currencySettings = [
                    'currencySymbol' => $currency->symbol, 
                    'currencyNname' => $currency->name
                ];
            } else {
                $currencySettings = [
                    'currencySymbol' =>  '$', 
                    'currencyNname' =>'US Dollar'
                ];
            }
            
            // Merge currency settings with other settings
            $globalSettings = array_merge($settings, $currencySettings);
            $globalSettings['base_url'] = $request->getSchemeAndHttpHost();
            
            
            // Get store-specific currency settings for authenticated users
            $storeCurrency = $this->getStoreCurrencySettings($request);
        }

        // SECURITY: strip secrets (payment credentials, S3/Wasabi, SMTP,
        // reCAPTCHA, AI keys, messaging tokens) before globalSettings reaches
        // the browser — including on unauthenticated pages that fall back to
        // the superadmin's settings.
        if (isset($globalSettings) && is_array($globalSettings)) {
            $globalSettings = filterSensitiveSettings($globalSettings);
        }
        
        return [
             ...parent::share($request),
            'name'  => config('app.name'),
            'base_url'  => $request->getSchemeAndHttpHost(),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'csrf_token' => csrf_token(),
            // Only expose which social providers are configured (names only — never secrets)
            'authProviders' => collect(['google', 'facebook', 'apple', 'github', 'linkedin', 'plankton'])
                ->filter(function ($provider) {
                    if ($provider === 'apple') {
                        return !empty(config('services.apple.client_id')) && !empty(config('services.apple.private_key'));
                    }

                    if ($provider === 'plankton') {
                        return !empty(config('services.plankton.client_id'));
                    }

                    // LinkedIn is always shown on the auth pages (branding choice).
                    // It becomes fully functional once services.linkedin is configured.
                    if ($provider === 'linkedin') {
                        return true;
                    }

                    return !empty(config("services.{$provider}.client_id"))
                        && !empty(config("services.{$provider}.client_secret"));
                })
                ->values()
                ->all(),
            // Customer auth (for store frontend)
            'isLoggedIn' => fn() => Auth::guard('customer')->check(),
            'customer' => fn() => Auth::guard('customer')->check() ? Auth::guard('customer')->user() : null,
            'customer_address' => fn() => Auth::guard('customer')->check() && Auth::guard('customer')->user()->addresses 
                ? Auth::guard('customer')->user()->addresses 
                : [],
            'auth'  => function() use ($request) {
                $user = $request->user() ? $request->user()->load('stores', 'plan') : null;
                
                // Get stores for the current user
                $stores = [];
                if ($user) {
                    if ($user->type === 'company') {
                        // Company users have their own stores
                        $stores = $user->stores;
                    } elseif ($user->type === 'user' && $user->created_by) {
                        // Regular users access their creator's stores
                        $creator = \App\Models\User::find($user->created_by);
                        if ($creator) {
                            $stores = $creator->stores;
                        }
                    } elseif ($user->isSuperAdmin()) {
                        // Superadmins can access every store
                        $stores = \App\Models\Store::all();
                    }
                }
                
                // Check if demo mode is enabled and there's a demo store cookie
                if ($user && config('app.is_demo') && $request->cookie('demo_store_id')) {
                    $storeId = (int) $request->cookie('demo_store_id');
                    
                    // Verify the store belongs to the user or their creator
                    $storeExists = false;
                    if ($user->type === 'company') {
                        $storeExists = $user->stores->contains('id', $storeId);
                    } elseif ($user->type === 'user' && $user->created_by) {
                        $creator = \App\Models\User::find($user->created_by);
                        if ($creator) {
                            $storeExists = $creator->stores->contains('id', $storeId);
                        }
                    }
                    
                    if ($storeExists) {
                        // In demo mode, override current_store with cookie value for this request only
                        $user->current_store = $storeId;
                    }
                }
                
                // In demo mode, check cookie for temporary language preference
                if (config('app.is_demo', false) && $request->cookie('demo_language')) {
                    $locale = $request->cookie('demo_language');
                } else {
                    $locale = $user ? ($user->lang ?? 'ar') : 'ar';
                }
                
                return [
                    'user'        => $user,
                    'roles'       => $request->user()?->roles->pluck('name'),
                    'permissions' => $request->user()?->getAllPermissions()->pluck('name'),
                    'lang' => $locale,
                    'stores' => $stores
                ];
            },
            'stores' => function() use ($request) {
                $user = $request->user();
                if (!$user) return [];
                
                $stores = [];
                if ($user->type === 'company') {
                    $stores = $user->stores;
                } elseif ($user->type === 'user' && $user->created_by) {
                    $creator = \App\Models\User::find($user->created_by);
                    $stores = $creator ? $creator->stores : [];
                } elseif ($user->isSuperAdmin()) {
                    // Superadmins can access every store
                    $stores = \App\Models\Store::all();
                }
                
                // In demo mode, ensure current_store reflects the cookie value
                if (config('app.is_demo') && $request->cookie('demo_store_id')) {
                    $storeId = (int) $request->cookie('demo_store_id');
                    $storeExists = collect($stores)->contains('id', $storeId);
                    if ($storeExists && $user) {
                        $user->current_store = $storeId;
                    }
                }
                
                return $stores;
            },
            'isImpersonating' => session('impersonated_by') ? true : false,
            'ziggy' => fn(): array=> [
                 ...array_merge((new Ziggy)->toArray(), [
                    'url' => $request->getSchemeAndHttpHost(),
                    'port' => $request->getPort() ?: null,
                ]),
                'location' => $request->url(),
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
            ],
            'cspNonce' => $request->attributes->get('csp_nonce'),
            'globalSettings' => $globalSettings,
            // Filter sensitive keys (API secrets, passwords, etc.) before sharing with frontend
            'superadminSettings' => filterSensitiveSettings(settings(getSuperadminId())),
            'storeCurrency' => $storeCurrency,
            'is_demo' => config('app.is_demo', false),
        ];
    }
    
    /**
     * Get store-specific currency settings for the current user
     */
    private function getStoreCurrencySettings(Request $request): array
    {
        $user = $request->user();
        
        // Default currency settings
        $defaultCurrency = [
            'code' => 'ILS',
            'symbol' => '₪',
            'name' => 'Israeli Shekel',
            'position' => 'after',
            'decimals' => 2,
            'decimal_separator' => '.',
            'thousands_separator' => ','
        ];
        
        // Return default if no user
        if (!$user) {
            return $defaultCurrency;
        }
        
        // Handle demo mode cookie override first
        if (config('app.is_demo') && $request->cookie('demo_store_id')) {
            $storeId = (int) $request->cookie('demo_store_id');
            
            // Verify the store belongs to the user or their creator
            $storeExists = false;
            if ($user->type === 'company') {
                $storeExists = $user->stores->contains('id', $storeId);
            } elseif ($user->type === 'user' && $user->created_by) {
                $creator = \App\Models\User::find($user->created_by);
                if ($creator) {
                    $storeExists = $creator->stores->contains('id', $storeId);
                }
            }
            
            if ($storeExists) {
                $currentStoreId = $storeId;
            } else {
                $currentStoreId = $user->current_store;
            }
        } else {
            $currentStoreId = $user->current_store;
        }
        
        if (!$currentStoreId) {
            return $defaultCurrency;
        }
        
        try {
            // Get store-specific currency settings
            $storeSettings = Setting::getUserSettings($user->id, $currentStoreId);
            
            // Get currency code from store settings or fall back to global settings
            $currencyCode = $storeSettings['defaultCurrency'] ?? settings($user->id)['defaultCurrency'] ?? 'ILS';
            
            // Get currency details from currencies table
            $currency = Currency::where('code', $currencyCode)->first();
            
            if ($currency) {
                return [
                    'code' => $currency->code,
                    'symbol' => $currency->symbol,
                    'name' => $currency->name,
                    'position' => $storeSettings['currencySymbolPosition'] ?? 'after',
                    'decimals' => (int)($storeSettings['decimalFormat'] ?? 2),
                    'decimal_separator' => $storeSettings['decimalSeparator'] ?? '.',
                    'thousands_separator' => $storeSettings['thousandsSeparator'] ?? ','
                ];
            }
            
            return $defaultCurrency;
        } catch (\Exception $e) {
            // Return default currency if any error occurs
            return $defaultCurrency;
        }
    }
}