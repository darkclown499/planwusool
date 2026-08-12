<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'price',
        'yearly_price',
        'duration',
        'domain_type',
        'support_hours',
        'support_type',
        'description',
        'max_stores',
        'max_users_per_store',
        'max_products_per_store',
        'max_warehouses',
        'themes',
        'enable_custdomain',
        'enable_custsubdomain',
        'enable_branding',
        'pwa_business',
        'enable_chatgpt',
        'enable_shipping_method',
        'enable_mobile_app',
        'enable_sms',
        'storage_limit',
        'is_trial',
        'trial_day',
        'is_plan_enable',
        'is_default',
        'is_recommended',
        'module',
        'template_config',
        'enable_advanced_builder',
    ];
    
    protected $casts = [
        'themes' => 'array',
        'module' => 'array', 
        'template_config' => 'array',
        'enable_advanced_builder' => 'boolean',
        'is_default' => 'boolean',
        'price' => 'float',
        'yearly_price' => 'float',
    ];
    
    /**
     * Get the default plan
     *
     * @return Plan|null
     */
    public static function getDefaultPlan()
    {
        return self::where('is_default', true)->first();
    }
    
    /**
     * Check if the plan is the default plan
     *
     * @return bool
     */
    public function isDefault()
    {
        return (bool) $this->is_default;
    }
    
    /**
     * Get the price based on billing cycle
     *
     * @param string $cycle 'monthly' or 'yearly'
     * @return float
     */
    public function getPriceForCycle($cycle = 'monthly')
    {
        if ($cycle === 'yearly' && $this->yearly_price) {
            return $this->yearly_price;
        }
        
        return $this->price;
    }
    
    /**
     * Get users subscribed to this plan
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get available template slugs for this plan.
     * Returns 'all' if plan allows all templates.
     */
    public function getAvailableTemplates(): array
    {
        if ($this->template_config && is_array($this->template_config)) {
            return $this->template_config;
        }

        // Fallback: free plans get free templates, paid plans get all
        if ($this->price <= 0 && $this->yearly_price <= 0) {
            return Template::where('is_free', true)->where('is_active', true)
                ->pluck('slug')->toArray();
        }

        return Template::where('is_active', true)->pluck('slug')->toArray();
    }

    /**
     * Check if plan has access to advanced builder.
     */
    public function hasAdvancedBuilder(): bool
    {
        return (bool) ($this->enable_advanced_builder ?? false);
    }

    /**
     * Get the plan tier key (starter, growth, professional).
     */
    public function getTier(): string
    {
        if ($this->enable_advanced_builder) {
            return 'professional';
        }

        if ($this->price <= 0 && $this->yearly_price <= 0) {
            return 'starter';
        }

        return 'growth';
    }

    /**
     * Get accessible templates as model instances.
     */
    public function getAccessibleTemplates()
    {
        $slugs = $this->getAvailableTemplates();

        if ($slugs === ['all'] || $this->getTier() === 'professional') {
            return Template::where('is_active', true)->orderBy('sort_order')->get();
        }

        return Template::where('is_active', true)
            ->where(function ($q) use ($slugs) {
                $q->whereIn('slug', $slugs)
                    ->orWhere('is_free', true);
            })
            ->orderBy('sort_order')
            ->get();
    }
}