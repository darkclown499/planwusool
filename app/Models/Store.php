<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Store extends BaseModel
{
    use HasFactory;

protected $fillable = [
        'name',
        'slug',
        'description',
        'theme',
        'currency',
        'theme_config',
        'design_tokens',
        'template_overrides',
        'custom_domain',
        'custom_subdomain',
        'enable_custom_domain',
        'enable_custom_subdomain',
        'email',
        'user_id',
        // SEO Settings
        'seo_title',
        'seo_description',
        'seo_keywords',
        'seo_image',
        // PWA Settings
        'enable_pwa',
        'pwa_name',
        'pwa_short_name',
        'pwa_description',
        'pwa_theme_color',
        'pwa_background_color',
        'pwa_display',
        'pwa_orientation',
    ];

    /**
     * user_id (ownership) and store_content (raw HTML rendered on the
     * storefront) are never mass assignable — they are set explicitly by the
     * owning controllers/services to prevent cross-tenant ownership changes
     * and stored-XSS via a mass-assigned content blob.
     *
     * @var list<string>
     */
    protected $guarded = [
        'id',
        'store_content',
    ];
    
    protected $casts = [
        'enable_custom_domain' => 'boolean',
        'enable_custom_subdomain' => 'boolean',
        'enable_pwa' => 'boolean',
        'store_content' => 'array',
        'theme_config' => 'array',
        'design_tokens' => 'array',
        'template_overrides' => 'array',
        'currency' => 'string',
    ];

    /**
     * Ensure currency always falls back to ILS / ₪ when null.
     */
    public function getCurrencyAttribute($value): string
    {
        return $value ? strtoupper($value) : 'ILS';
    }

    public function getCurrencySymbolAttribute(): string
    {
        $code = $this->currency ?? 'ILS';
        $currency = \App\Models\Currency::where('code', $code)->first();
        return $currency ? $currency->symbol : '₪';
    }

    /**
     * Storefront behavior toggles stored in store_configurations.
     */
    public const BEHAVIOR_KEYS = [
        'enable_customer_login',
        'enable_customer_registration',
        'require_login_checkout',
        'show_whatsapp_order_button',
        'show_search',
        'show_cart',
        'show_auth_button',
    ];

    /**
     * Get the user that owns the store.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the store configurations.
     */
    public function configurations()
    {
        return $this->hasMany(StoreConfiguration::class);
    }

    /**
     * Custom pages belonging to the store.
     */
    public function pages()
    {
        return $this->hasMany(StorePage::class)->orderBy('sort_order');
    }

    /**
     * Promo/offer cards belonging to the store.
     */
    public function offers()
    {
        return $this->hasMany(StoreOffer::class)->orderBy('sort_order');
    }

    /**
     * All custom domains attached to the store.
     */
    public function storeDomains()
    {
        return $this->hasMany(StoreDomain::class);
    }

    /**
     * Custom domains that passed ownership verification.
     */
    public function verifiedDomains()
    {
        return $this->hasMany(StoreDomain::class)->where('is_verified', true);
    }

    /**
     * Get the active custom domain used for the store, if any.
     */
    public function getVerifiedDomain(): ?StoreDomain
    {
        $domain = $this->verifiedDomains()
            ->orderByDesc('is_primary')
            ->orderBy('id')
            ->first();

        return $domain ?: null;
    }

    /**
     * Generate a unique slug for the store.
     */
    public static function generateUniqueSlug($name)
    {
        $slug = \Illuminate\Support\Str::slug($name);
        // RLIKE is MySQL-only, so pull the candidates with LIKE and match
        // the "base" or "base-123" pattern in PHP for DB portability.
        $count = static::where('slug', 'LIKE', $slug . '%')
            ->pluck('slug')
            ->filter(function ($existing) use ($slug) {
                return preg_match('/^' . preg_quote($slug, '/') . '(-\d+)?$/', $existing) === 1;
            })
            ->count();

        return $count ? "{$slug}-{$count}" : $slug;
    }
    
    /**
     * Get the store URL based on domain configuration
     * 
     * @param \Illuminate\Http\Request|null $request Optional request for port detection
     */
    public function getStoreUrl($request = null)
    {
        // Priority 1: Verified custom domain from the store_domains table
        $verifiedDomain = $this->getVerifiedDomain();
        if ($verifiedDomain) {
            return $this->getProtocol($request) . $verifiedDomain->domain_name;
        }

        // Priority 2: Legacy custom domain column
        if ($this->enable_custom_domain && !empty($this->custom_domain)) {
            return $this->getProtocol($request) . $this->custom_domain;
        }
        
        // Priority 3: Legacy custom subdomain column
        if ($this->enable_custom_subdomain && !empty($this->custom_subdomain)) {
            $baseDomain = $this->getBaseDomain($request);
            if ($baseDomain) {
                return $this->getProtocol($request) . $this->custom_subdomain . '.' . $baseDomain;
            }
        }
        
        // Default: every store is served on its own subdomain, e.g. techvibe.wusool.ps
        return $this->getStoreSubdomainUrl($request);
    }
    
    /**
     * Get the default store subdomain URL, e.g. http://techvibe.localhost:8000
     * 
     * @param \Illuminate\Http\Request|null $request Optional request for port detection
     */
    public function getStoreSubdomainUrl($request = null): string
    {
        $port = $request ? $request->getPort() : null;
        $port = in_array($port, [80, 443]) || $port === null ? '' : ':' . $port;
        return $this->getProtocol($request) . $this->slug . '.' . config('app.store_domain') . $port;
    }
    
    /**
     * Get domain type
     */
    public function getDomainType()
    {
        if ($this->getVerifiedDomain()) {
            return 'custom_domain';
        }

        if ($this->enable_custom_domain && $this->custom_domain) {
            return 'custom_domain';
        }
        
        if ($this->enable_custom_subdomain && $this->custom_subdomain) {
            return 'custom_subdomain';
        }
        
        return 'default';
    }
    
    /**
     * Check if store can use custom domain based on plan
     * Super admin / store owners testing bypass via current authenticated user is handled in controller; this helper checks plan features.
     */
    public function canUseCustomDomain(): bool
    {
        // Direct plan feature check
        $plan = $this->user?->getCurrentPlan();
        if ($plan && $plan->enable_custdomain === 'on') {
            return true;
        }
        // Current authenticated user is super admin -> allow for testing/bypass
        $authUser = \Illuminate\Support\Facades\Auth::user();
        if ($authUser && $authUser->isSuperAdmin()) {
            return true;
        }
        return false;
    }
    
    /**
     * Check if store can use custom subdomain based on plan
     */
    public function canUseCustomSubdomain()
    {
        $plan = $this->user->getCurrentPlan();
        return $plan && $plan->enable_custsubdomain === 'on';
    }
    
    /**
     * Generate store route with custom domain support
     */
    public function route($path = '', $parameters = [], $request = null)
    {
        $baseUrl = $this->getStoreUrl($request);
        
        if ($path) {
            $url = rtrim($baseUrl, '/') . '/' . ltrim($path, '/');
            if (!empty($parameters)) {
                $url .= '?' . http_build_query($parameters);
            }
            return $url;
        }
        
        return $baseUrl;
    }
    
    /**
     * Check if current request is for this store's custom domain
     */
    public function isCurrentDomain(): bool
    {
        $host = request()->getHost();

        // Verified custom domains from the store_domains table
        if ($this->storeDomains()->where('domain_name', $host)->where('is_verified', true)->exists()) {
            return true;
        }

        if ($this->enable_custom_domain && $this->custom_domain === $host) {
            return true;
        }
        
        if ($this->enable_custom_subdomain && str_contains($host, '.')) {
            $subdomain = explode('.', $host)[0];
            return $this->custom_subdomain === $subdomain;
        }
        
        return false;
    }
    
    /**
     * Get protocol for URL generation
     * 
     * @param \Illuminate\Http\Request|null $request
     */
    private function getProtocol($request = null): string
    {
        if ($request) {
            return $request->isSecure() ? 'https://' : 'http://';
        }
        // Fallback for CLI/queue contexts - use config
        return config('app.url') ? (str_starts_with(config('app.url'), 'https') ? 'https://' : 'http://') : 'https://';
    }
    
    /**
     * Get base domain for subdomain generation
     * 
     * @param \Illuminate\Http\Request|null $request
     */
    private function getBaseDomain($request = null): string
    {
        $host = $request ? $request->getHost() : config('app.store_domain', 'localhost');
        $parts = explode('.', $host);
        
        // Return last two parts for base domain (e.g., example.com from sub.example.com)
        return count($parts) >= 2 ? implode('.', array_slice($parts, -2)) : $host;
    }
    
    /**
     * Check if a custom domain is available
     */
    public static function isDomainAvailable(string $domain, ?int $excludeStoreId = null): bool
    {
        if (empty($domain)) return true;

        $query = static::where(function ($q) use ($domain) {
            $q->where(function ($legacy) use ($domain) {
                $legacy->where('custom_domain', $domain)->where('enable_custom_domain', true);
            })->orWhereHas('storeDomains', function ($domains) use ($domain) {
                $domains->where('domain_name', $domain);
            });
        });
        if ($excludeStoreId) $query->where('id', '!=', $excludeStoreId);
        
        return !$query->exists();
    }

    /**
     * Find a store by its custom domain (store_domains table).
     */
    public static function findByDomain(string $domain): ?self
    {
        return static::whereHas('storeDomains', function ($query) use ($domain) {
            $query->where('domain_name', $domain)
                ->where('is_verified', true);
        })->first();
    }
    
    /**
     * Check if a custom subdomain is available
     */
    public static function isSubdomainAvailable(string $subdomain, ?int $excludeStoreId = null): bool
    {
        if (empty($subdomain)) return true;
        
        $query = static::where('custom_subdomain', $subdomain)->where('enable_custom_subdomain', true);
        if ($excludeStoreId) $query->where('id', '!=', $excludeStoreId);
        
        return !$query->exists();
    }
    
    /**
     * Validate store domain data
     */
    public static function validateDomains(array $data, ?int $excludeStoreId = null): array
    {
        $errors = [];
        
        if (!empty($data['custom_domain']) && $data['enable_custom_domain']) {
            $domain = strtolower(trim($data['custom_domain']));
            $domain = str_replace(['http://', 'https://'], '', $domain);
            $domain = rtrim($domain, '/');
            
            // Critical: Don't allow main app domain as custom domain
            $mainAppDomain = str_replace(['http://', 'https://'], '', config('app.url'));
            $mainAppDomain = rtrim($mainAppDomain, '/');
            $mainAppDomainWithoutWww = str_starts_with($mainAppDomain, 'www.') ? substr($mainAppDomain, 4) : $mainAppDomain;
            $domainWithoutWww = str_starts_with($domain, 'www.') ? substr($domain, 4) : $domain;

            if ($domain === $mainAppDomain || $domainWithoutWww === $mainAppDomainWithoutWww || $domain === 'www.' . $mainAppDomainWithoutWww) {
                $errors['custom_domain'] = 'You cannot use the main application domain as a custom domain.';
            }
            
            if (empty($errors['custom_domain']) && !static::isDomainAvailable($domain, $excludeStoreId)) {
                $errors['custom_domain'] = 'This domain is already taken.';
            }
            if (!filter_var($domain, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME)) {
                $errors['custom_domain'] = 'Invalid domain format.';
            }
            if (in_array($domain, ['localhost', '127.0.0.1', 'admin', 'www', 'api'])) {
                $errors['custom_domain'] = 'This domain is reserved.';
            }
        }
        
        if (!empty($data['custom_subdomain']) && $data['enable_custom_subdomain']) {
            $subdomain = strtolower(trim($data['custom_subdomain']));
            
            if (!static::isSubdomainAvailable($subdomain, $excludeStoreId)) {
                $errors['custom_subdomain'] = 'This subdomain is already taken.';
            }
            if (!preg_match('/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/', $subdomain) || strlen($subdomain) < 3) {
                $errors['custom_subdomain'] = 'Invalid subdomain format.';
            }
            if (in_array($subdomain, ['www', 'admin', 'api', 'mail', 'ftp'])) {
                $errors['custom_subdomain'] = 'This subdomain is reserved.';
            }
        }
        
        return $errors;
    }

    /**
     * Get the template slug for this store.
     * Falls back to "basic" when the saved theme is not a known slug.
     */
    public function getTemplateSlug(): string
    {
        return static::normalizeThemeSlug($this->theme);
    }

    /**
     * The v2 template system — six fully bespoke sector templates. Every
     * template is its own self-contained storefront application (own layout,
     * product cards and shopping-flow overlays); nothing visual is shared.
     * Mirrors resources/js/templates-v2/registry.tsx.
     */
    public const FREE_TEMPLATES = [
        'fashion-atelier',
        'grocery-souq',
        'bakery-house',
        'restaurant-menu',
        'electronics-hub',
        'bazaar-market',
    ];

    public const GROWTH_TEMPLATES = [];

    public const PRO_TEMPLATES = [];

    /** Default template for brand-new stores and unknown slugs. */
    public const DEFAULT_TEMPLATE = 'bazaar-market';

    /**
     * Schema-driven "engine" themes are retired: the slugs below normalize to
     * the closest catalog template like every other legacy value.
     */
    public const ENGINE_THEMES = [];

    public const ALL_TEMPLATES = self::FREE_TEMPLATES;

    /**
     * Legacy slugs → closest new-catalog template by visual personality
     * (dark→e-storefront, pink/beauty→cosmetic-store, green/fresh→grocery…)
     * so old stores migrate automatically with zero database changes (the
     * value is normalized at read time).
     */
    /**
     * Legacy slugs → closest v2 sector template. Covers every slug the
     * platform has ever shipped (pre-consolidation names, the 17-template
     * catalog, growth/pro sector themes and schema-engine themes) so old
     * stores migrate automatically with zero database changes — the value
     * is normalized at read time.
     */
    public const LEGACY_TEMPLATE_MAP = [
        // ---- Fashion / boutique / beauty / kids → fashion-atelier ----
        'zen' => 'fashion-atelier',
        'elegant' => 'fashion-atelier',
        'rose' => 'fashion-atelier',
        'luxe' => 'fashion-atelier',
        'fashion-designer-mart' => 'fashion-atelier',
        'ecommerce-clothing' => 'fashion-atelier',
        'kids-fashion' => 'fashion-atelier',
        'cosmetic-store' => 'fashion-atelier',
        'toys-school-store' => 'fashion-atelier',
        'baby-buds-store' => 'fashion-atelier',
        'growth-fashion' => 'fashion-atelier',
        'growth-cosmetics' => 'fashion-atelier',
        'growth-pharmacy' => 'fashion-atelier',
        'pro-beauty' => 'fashion-atelier',
        'pro-flowers' => 'fashion-atelier',
        'pro-fragrances' => 'fashion-atelier',
        'pro-kids' => 'fashion-atelier',
        'pro-pets' => 'fashion-atelier',
        'pro-boutique' => 'fashion-atelier',
        'pro-clothing' => 'fashion-atelier',
        'fashion-luxe' => 'fashion-atelier',

        // ---- Grocery / supermarket / spices → grocery-souq ----
        'fresh' => 'grocery-souq',
        'grocery-shopping' => 'grocery-souq',
        'super-mart-store' => 'grocery-souq',
        'core-bold' => 'grocery-souq',
        'growth-supermarket' => 'grocery-souq',
        'market-fast' => 'grocery-souq',
        'fresh-produce' => 'grocery-souq',
        'supermarket' => 'grocery-souq',
        'pro-spices' => 'grocery-souq',

        // ---- Bakery / coffee / fresh → bakery-house ----
        'fresh-bakers' => 'bakery-house',
        'bakery' => 'bakery-house',
        'pro-coffee' => 'bakery-house',

        // ---- Restaurant / food delivery → restaurant-menu ----
        'restaurant-food-delivery' => 'restaurant-menu',
        'growth-food' => 'restaurant-menu',

        // ---- Electronics / tech / garage → electronics-hub ----
        'ocean' => 'electronics-hub',
        'night' => 'electronics-hub',
        'e-storefront' => 'electronics-hub',
        'auto-garage-store' => 'electronics-hub',
        'core-dark' => 'electronics-hub',
        'growth-electronics' => 'electronics-hub',
        'pro-tech' => 'electronics-hub',
        'gadgets' => 'electronics-hub',
        'arabic-gadgets' => 'electronics-hub',

        // ---- General marketplace → bazaar-market (default) ----
        'classic' => 'bazaar-market',
        'basic' => 'bazaar-market',
        'bazaar' => 'bazaar-market',
        'wefaq' => 'bazaar-market',
        'ecommece-marketplace' => 'bazaar-market',
        'marketplace-shop' => 'bazaar-market',
        'ecommerce-mega-store' => 'bazaar-market',
        'mega-store-woocommerce' => 'bazaar-market',
        'core-minimal' => 'bazaar-market',
        'core-sidebar' => 'bazaar-market',
        'core-bazaar' => 'bazaar-market',
        'core-elegant' => 'bazaar-market',
        'core-showcase' => 'bazaar-market',
        'home-decor' => 'bazaar-market',
        'growth-home-decor' => 'bazaar-market',
        'pro-books' => 'bazaar-market',
        'pro-stationery' => 'bazaar-market',
        'pro-home-tools' => 'bazaar-market',
        'pro-sport' => 'bazaar-market',
        'pro-sports' => 'bazaar-market',
    ];

    /**
     * Normalize a theme/template value into a valid known slug. Known slugs
     * pass through; unknown/legacy values resolve via LEGACY_TEMPLATE_MAP to
     * their closest sector template, defaulting to the general bazaar.
     */
    public static function normalizeThemeSlug(?string $slug): string
    {
        $slug = trim((string) $slug);
        if ($slug === '') {
            return self::DEFAULT_TEMPLATE;
        }
        if (in_array($slug, self::ALL_TEMPLATES, true)) {
            return $slug;
        }
        return self::LEGACY_TEMPLATE_MAP[$slug] ?? self::DEFAULT_TEMPLATE;
    }

    /**
     * Translate a plan's stored theme list into the current template catalog.
     * Plans seeded before the catalog consolidation carry legacy slugs
     * ("basic", "core-minimal", ...); mapping them through the legacy table
     * keeps those subscriptions valid instead of silently locking their owners
     * out of every template. Returns a de-duplicated list in catalog order.
     *
     * @param  mixed  $themes  Raw plan themes column (array|null).
     * @return list<string>
     */
    public static function normalizeThemeList(mixed $themes): array
    {
        if (!is_array($themes)) {
            return [];
        }

        // Full-catalog markers pass through untouched so callers can detect them.
        foreach (['all', '*'] as $marker) {
            if (in_array($marker, $themes, true)) {
                return [$marker];
            }
        }

        $resolved = [];
        $meaningful = false;
        foreach ($themes as $slug) {
            $raw = is_string($slug) ? trim($slug) : '';
            if ($raw === '') {
                continue;
            }
            // Only entries that are either current-catalog slugs or recognised
            // legacy slugs carry intent; anything else is dead seed data.
            if (!in_array($raw, self::ALL_TEMPLATES, true) && !isset(self::LEGACY_TEMPLATE_MAP[$raw])) {
                continue;
            }
            $meaningful = true;
            $normalized = self::LEGACY_TEMPLATE_MAP[$raw] ?? $raw;
            if (!in_array($normalized, $resolved, true)) {
                $resolved[] = $normalized;
            }
        }

        // A list with no recognisable entries restricts nothing — let callers
        // apply their default (free catalog) instead of locking users out.
        return $meaningful ? $resolved : [];
    }

    /**
     * Structural defaults for the store content blob. Empty collections mean
     * "not configured" — the storefront components fall back to their own
     * built-in Arabic defaults until the owner saves real content.
     */
    public const DEFAULT_STORE_CONTENT = [
        'announcement' => [
            'enabled' => true,
            'text' => '',
            'link' => '',
        ],
        'features' => [],
        'testimonials' => [],
        'faqs' => [],
        'trust_bar' => ['enabled' => true],
        'newsletter' => ['enabled' => true],
        'banner' => [
            'enabled' => false,
            'title' => '',
            'subtitle' => '',
            'button_text' => 'تسوّق الآن',
            'button_link' => '#template-products',
            'image' => '',
            'background' => '',
        ],
        'hero' => [
            'enabled' => true,
            'title' => '',
            'subtitle' => '',
            'badge' => '',
            'image' => '',
            'video' => '',
            'button_text' => 'تسوّق الآن',
            'button_link' => '#template-products',
        ],
        'video' => [
            'enabled' => false,
            'type' => 'hero', // hero | section
            'title' => '',
            'video_url' => '',
            'poster' => '',
        ],
        'settings' => [
            'show_categories_bar' => false,
            'show_latest_products' => true,
            'show_best_sellers' => true,
            'homepage_categories' => [],
            'homepage_products_per_category' => 8,
        ],
        'homepage' => [
            'show_categories_bar' => false,
            'show_latest_products' => true,
            'show_best_sellers' => true,
            'homepage_categories' => [],
            'homepage_products_per_category' => 8,
        ],
    ];

    /**
     * Get the store content (store values merged over structural defaults).
     * The frontend uses this to drive announcements, features, testimonials,
     * FAQs and banners across both dedicated pages and JSON-section templates.
     */
    public function getMergedStoreContent(): array
    {
        return array_replace_recursive(self::DEFAULT_STORE_CONTENT, $this->store_content ?? []);
    }
}