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
        'enable_theme_editor',
        'enable_accounting_integration',
        'template_editor_level',
        'storage_limit',
        'is_trial',
        'trial_day',
        'is_plan_enable',
        'is_default',
        'is_recommended',
        'module',
    ];
    
    protected $casts = [
        'themes' => 'array',
        'module' => 'array', 
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
     * Get the plan tier key (starter, growth, professional).
     */
    public function getTier(): string
    {
        if ($this->price <= 0 && $this->yearly_price <= 0) {
            return 'starter';
        }

        return 'growth';
    }
}