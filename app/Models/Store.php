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
        'user_id',
        'custom_domain',
        'custom_subdomain',
        'enable_custom_domain',
        'enable_custom_subdomain',
        'email',
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
    
    protected $casts = [
        'enable_custom_domain' => 'boolean',
        'enable_custom_subdomain' => 'boolean',
        'enable_pwa' => 'boolean',
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
     * Generate a unique slug for the store.
     */
    public static function generateUniqueSlug($name)
    {
        $slug = \Illuminate\Support\Str::slug($name);
        $count = static::whereRaw("slug RLIKE '^{$slug}(-[0-9]+)?$'")->count();
        
        return $count ? "{$slug}-{$count}" : $slug;
    }
    
    /**
     * Get the store URL based on domain configuration
     */
    public function getStoreUrl()
    {
        if ($this->enable_custom_domain && !empty($this->custom_domain)) {
            return $this->getProtocol() . $this->custom_domain;
        }
        
        if ($this->enable_custom_subdomain && !empty($this->custom_subdomain)) {
            $baseDomain = $this->getBaseDomain();
            if ($baseDomain) {
                return $this->getProtocol() . $this->custom_subdomain . '.' . $baseDomain;
            }
        }
        
        // Default: every store is served on its own subdomain, e.g. techvibe.wusool.ps
        return $this->getStoreSubdomainUrl();
    }
    
    /**
     * Get the default store subdomain URL, e.g. http://techvibe.localhost:8000
     */
    public function getStoreSubdomainUrl(): string
    {
        $port = request()->getPort();
        $port = in_array($port, [80, 443]) || $port === null ? '' : ':' . $port;
        return $this->getProtocol() . $this->slug . '.' . config('app.store_domain') . $port;
    }
    
    /**
     * Get domain type
     */
    public function getDomainType()
    {
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
    public function route($path = '', $parameters = [])
    {
        $baseUrl = $this->getStoreUrl();
        
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
     */
    private function getProtocol(): string
    {
        return request()->isSecure() ? 'https://' : 'http://';
    }
    
    /**
     * Get base domain for subdomain generation
     */
    private function getBaseDomain(): string
    {
        $host = request()->getHost();
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
        
        $query = static::where('custom_domain', $domain)->where('enable_custom_domain', true);
        if ($excludeStoreId) $query->where('id', '!=', $excludeStoreId);
        
        return !$query->exists();
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




}