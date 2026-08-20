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
    ];

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
     */
    public function canUseCustomDomain()
    {
        $plan = $this->user->getCurrentPlan();
        return $plan && $plan->enable_custdomain === 'on';
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
     * The 29-template catalog. One core design system branching into seven
     * free variations, plus premium "ready-made" layouts for Growth (7 more)
     * and Professional (all 29).
     */
    public const FREE_TEMPLATES = [
        'core-minimal', 'core-bold', 'core-sidebar', 'core-dark',
        'core-bazaar', 'core-elegant', 'core-showcase',
    ];

    public const GROWTH_TEMPLATES = [
        'growth-electronics', 'growth-fashion', 'growth-food',
        'growth-cosmetics', 'growth-supermarket', 'growth-home-decor',
        'growth-pharmacy',
    ];

    public const PRO_TEMPLATES = [
        'pro-tech', 'pro-beauty', 'pro-books', 'pro-sport', 'pro-pets',
        'pro-flowers', 'pro-coffee', 'pro-stationery', 'pro-spices',
        'pro-clothing', 'pro-fragrances', 'pro-home-tools', 'pro-kids',
        'pro-sports', 'pro-boutique',
    ];

    /**
     * Schema-driven "engine" themes (see resources/js/components/theme).
     * These are rendered by the ThemeEngine (theme.config.json driven) instead
     * of the JSON template renderer, but are still valid theme slugs.
     */
    public const ENGINE_THEMES = [
        'market-fast', 'fashion-luxe', 'fresh-produce',
    ];

    public const ALL_TEMPLATES = [
        ...self::FREE_TEMPLATES,
        ...self::GROWTH_TEMPLATES,
        ...self::PRO_TEMPLATES,
        ...self::ENGINE_THEMES,
    ];

    /** Legacy slugs → canonical core template mapping for one-time migration. */
    public const LEGACY_TEMPLATE_MAP = [
        'basic' => 'core-minimal',
        'gadgets' => 'core-bold',
        'arabic-gadgets' => 'core-bold',
        'home-decor' => 'core-elegant',
        'bakery' => 'core-bazaar',
        'supermarket' => 'core-bazaar',
        'wefaq' => 'core-sidebar',
    ];

    /**
     * Normalize a theme/template value into a valid known slug.
     * Unknown/legacy values map to a canonical core template.
     */
    public static function normalizeThemeSlug(?string $slug): string
    {
        $slug = trim((string) $slug);
        if ($slug === '') {
            return 'core-minimal';
        }
        if (in_array($slug, self::ALL_TEMPLATES, true)) {
            return $slug;
        }
        return self::LEGACY_TEMPLATE_MAP[$slug] ?? 'core-minimal';
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