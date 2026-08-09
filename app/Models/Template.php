<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Template extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'slug',
        'name',
        'name_en',
        'description',
        'category',
        'is_free',
        'plan_required',
        'config',
        'design_tokens',
        'advanced_components',
        'is_active',
        'sort_order',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_free' => 'boolean',
        'is_active' => 'boolean',
        'config' => 'array',
        'design_tokens' => 'array',
        'advanced_components' => 'array',
        'sort_order' => 'integer',
    ];

    /**
     * Check if template is accessible for a given plan tier.
     */
    public function isAccessibleForPlan(string $planTier): bool
    {
        $planHierarchy = [
            'starter' => 1,
            'growth' => 2,
            'professional' => 3,
        ];

        $userTier = $planHierarchy[$planTier] ?? 0;
        $requiredTier = $planHierarchy[$this->plan_required] ?? 1;

        return $userTier >= $requiredTier;
    }

    /**
     * Get active templates.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get free templates.
     */
    public function scopeFree($query)
    {
        return $query->where('is_free', true);
    }

    /**
     * Get paid templates.
     */
    public function scopePaid($query)
    {
        return $query->where('is_free', false);
    }
}