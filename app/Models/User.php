<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Lab404\Impersonate\Models\Impersonate;
use App\Models\Plan;
use App\Models\Referral;
use App\Models\PayoutRequest;
use App\Models\Store;
use App\Services\MailConfigService;

class User extends BaseAuthenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasRoles, HasFactory, Notifiable, Impersonate;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    /**
     * P0: Mass-assignment hardening ΓÇö only explicitly validated safe fields are fillable.
     * Privilege/ownership/billing fields must never be set via $request->all() or $request->validated() mass assignment.
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'avatar',
        'lang',
    ];

    /**
     * Security-sensitive and ownership-sensitive fields that must never be mass-assigned from public request data.
     * Even if some appear in $fillable for internal forceCreate usage, guarded takes precedence.
     *
     * @var list<string>
     */
    protected $guarded = [
        'id',
        'type',
        'plan_id',
        'plan_duration',
        'plan_expire_date',
        'requested_plan',
        'plan_is_active',
        'is_trial',
        'trial_day',
        'trial_expire_date',
        'created_by',
        'google2fa_secret',
        'google2fa_enable',
        'referral_code',
        'used_referral_code',
        'partner_id',
        'password',
        'remember_token',
        'current_store',
        'commission_amount',
        'last_login_ip',
        'last_login_ua',
        'storage_limit',
        'storage_used',
        'is_enable_login',
        'delete_status',
        'mode',
        'active_module',
        'terms_accepted_at',
        'onboarded_at',
        'last_login_at',
        'email_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'google2fa_secret',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'plan_expire_date' => 'date',
            'trial_expire_date' => 'date',
            'plan_is_active' => 'integer',
            'is_active' => 'integer',
            'is_enable_login' => 'integer',
            'google2fa_enable' => 'integer',
            'storage_limit' => 'float',
            'storage_used' => 'integer',
            'terms_accepted_at' => 'datetime',
            'onboarded_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * Get the creator ID based on user type
     */
    public function creatorId()
    {
        if ($this->type == 'superadmin') {
            return $this->id;
        } else {
            return $this->created_by;
        }
    }
    
    /**
     * Get current store - for sub-users, get from company user
     */
    public function getCurrentStoreAttribute($value)
    {
        // If company user, return their own current_store
        if ($this->type === 'company' || $this->type === 'superadmin') {
            return $value;
        }
        
        // If sub-user, get current_store from company user
        if ($this->created_by) {
            $companyUser = static::find($this->created_by);
            return $companyUser ? $companyUser->getOriginal('current_store') : $value;
        }
        
        return $value;
    }

    /**
     * Accessor for profile avatar using dynamic URL generating helper
     */
    public function getAvatarAttribute($value)
    {
        if (!$value) {
            return null;
        }
        
        return get_file($value);
    }

    /**
     * Check if user is super admin
     */
    public function isSuperAdmin()
    {
        return $this->type === 'superadmin';
    }

    /**
     * Check if user is admin
     */
    public function isAdmin()
    {
        return $this->type === 'admin';
    }
        

    
    /**
     * Get the plan associated with the user.
     */
    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }
    
    /**
     * Check if user is on free plan
     */
    public function isOnFreePlan()
    {
        return $this->plan && $this->plan->is_default;
    }
    
    /**
     * Get current plan or default plan
     */
    public function getCurrentPlan()
    {
        if ($this->plan) {
            return $this->plan;
        }
        
        return Plan::getDefaultPlan();
    }
    
    /**
     * Check if user has an active plan subscription
     */
    public function hasActivePlan()
    {
        return $this->plan_id && 
               $this->plan_is_active && 
               ($this->plan_expire_date === null || $this->plan_expire_date > now());
    }
    
    /**
     * Check if user's plan has expired
     */
    public function isPlanExpired()
    {
        return $this->plan_expire_date && $this->plan_expire_date < now();
    }
    
    /**
     * Check if user's trial has expired
     */
    public function isTrialExpired()
    {
        return $this->is_trial && $this->trial_expire_date && $this->trial_expire_date < now();
    }
    
    /**
     * Check if user needs to subscribe to a plan
     */
    public function needsPlanSubscription()
    {
        if ($this->isSuperAdmin()) {
            return false;
        }
        
        if ($this->type !== 'company') {
            return false;
        }
        
        // Check if user has no plan
        if (!$this->plan_id) {
            return true;
        }
        
        // Check if trial is expired
        if ($this->isTrialExpired()) {
            return true;
        }
        
        // Check if plan is expired (but not on trial)
        if (!$this->is_trial && $this->isPlanExpired()) {
            return true;
        }
        
        return false;
    }

    /**
     * Check if user can be impersonated
     */
    public function canBeImpersonated()
    {
        return $this->type === 'company';
    }

    /**
     * Check if user can impersonate others
     */
    public function canImpersonate()
    {
        return $this->isSuperAdmin();
    }

    /**
     * Get referrals made by this company
     */
    public function referrals()
    {
        return $this->hasMany(Referral::class, 'company_id');
    }

    /**
     * Get payout requests made by this company
     */
    public function payoutRequests()
    {
        return $this->hasMany(PayoutRequest::class, 'company_id');
    }
    
    /**
     * Get plan orders made by this user
     */
    public function planOrders()
    {
        return $this->hasMany(PlanOrder::class);
    }
    
    /**
     * Get stores owned by this user
     */
    public function stores()
    {
        return $this->hasMany(Store::class);
    }

    /**
     * The partner profile attached to this user, if any.
     */
    public function partner(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(\App\Models\Partner::class);
    }

    /**
     * Whether this user carries an approved partner profile.
     */
    public function isApprovedPartner(): bool
    {
        return $this->partner && $this->partner->isApproved();
    }

    /**
     * Get the user who created this user
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get referral balance for company
     */
    public function getReferralBalance()
    {
        $totalEarned = $this->referrals()->sum('amount');
        $totalRequested = $this->payoutRequests()->whereIn('status', ['pending', 'approved'])->sum('amount');
        return $totalEarned - $totalRequested;
    }
    
    /**
     * Send the email verification notification with dynamic config.
     */
    public function sendEmailVerificationNotification()
    {
        $mailConfigured = MailConfigService::setDynamicConfig();
        if ($mailConfigured) {
            parent::sendEmailVerificationNotification();
        }
    }

    /**
     * Check if user can create a new store
     */
    public function canCreateStore()
    {
        return \App\Http\Middleware\CheckPlanAccess::checkStoreLimit($this);
    }
    
    /**
     * Check if user can add more users to a store
     */
    public function canAddUserToStore($storeId)
    {
        return \App\Http\Middleware\CheckPlanAccess::checkUserLimit($this, $storeId);
    }
    
    /**
     * Check if user can add more products to a store
     */
    public function canAddProductToStore($storeId)
    {
        return \App\Http\Middleware\CheckPlanAccess::checkProductLimit($this, $storeId);
    }
    
    /**
     * Check if user has access to a specific feature
     */
    public function hasFeatureAccess($feature)
    {
        return \App\Http\Middleware\CheckPlanAccess::checkFeatureAccess($this, $feature);
    }
    
    /**
     * Get available themes based on the user's plan tier.
     *
     * The plan stores the exact 29-slug catalog, distributed by tier
     * (Free=7, Growth=14, Professional=29). Superadmin can use all of them.
     */
    public function getAvailableThemes()
    {
        if ($this->isSuperAdmin() || $this->isAdmin()) {
            return \App\Models\Store::ALL_TEMPLATES;
        }

        $plan = $this->plan;

        if (!$plan || empty($plan->themes)) {
            $plan = Plan::getDefaultPlan();
        }

        if (!$plan) {
            return \App\Models\Store::FREE_TEMPLATES;
        }

        // Pro/professional subscribers must never be treated as free:
        // a paid plan without an explicit theme restriction unlocks the
        // entire catalog (bugfix — empty `themes` used to downgrade them).
        if ($this->planHasFullCatalog($plan)) {
            return \App\Models\Store::ALL_TEMPLATES;
        }

        $themes = \App\Models\Store::normalizeThemeList($plan->themes ?? []);

        return count($themes) > 0 ? $themes : \App\Models\Store::FREE_TEMPLATES;
    }

    /**
     * A plan grants the full template catalog when its name marks it as
     * pro/professional/premium/enterprise/business, when it explicitly
     * opts in ('all' / '*'), or when it is a paid plan that simply has no
     * per-theme configuration yet.
     */
    private function planHasFullCatalog(?Plan $plan): bool
    {
        if (!$plan) {
            return false;
        }

        $name = strtolower((string) $plan->name);
        foreach (['pro', 'professional', 'premium', 'enterprise', 'business'] as $needle) {
            if ($needle !== '' && str_contains($name, $needle)) {
                return true;
            }
        }

        $themes = is_array($plan->themes) ? $plan->themes : [];
        if (in_array('all', $themes, true) || in_array('*', $themes, true)) {
            return true;
        }

        return ((float) $plan->price > 0 || (float) $plan->yearly_price > 0) && count($themes) === 0;
    }

    /**
     * Boot method to handle model events
     */
    protected static function boot()
    {
        parent::boot();
        
        static::updating(function ($user) {
            // Check if status is being changed from inactive to active
            if ($user->isDirty('status') && $user->status === 'active' && $user->getOriginal('status') !== 'active') {
                if ($user->type !== 'company' && $user->current_store) {
                    $store = Store::find($user->current_store);
                    $companyUser = $store?->user;
                    if ($companyUser?->plan) {
                        $canActivate = \App\Http\Middleware\CheckPlanAccess::canActivateResource(
                            $companyUser, 'user', $user->current_store, $user->id
                        );
                        if (!$canActivate) {
                            // Set status back to inactive instead of throwing exception
                            $user->status = 'inactive';
                            \Log::warning('User activation blocked due to plan limit', ['user_id' => $user->id]);
                        }
                    }
                }
            }
        });
        
        static::updated(function ($user) {
            try {
                // Enforce plan limitations after user is activated
                if ($user->status === 'active' && $user->wasChanged('status') && $user->type !== 'company') {
                    if ($user->current_store) {
                        $store = Store::find($user->current_store);
                        $companyUser = $store ? $store->user : null;
                        if ($companyUser) {
                            enforcePlanLimitations($companyUser->fresh());
                        }
                    }
                }
                
                // Handle plan changes
                if ($user->wasChanged('plan_id') && $user->type === 'company') {
                    $oldPlan = $user->getOriginal('plan_id') ? Plan::find($user->getOriginal('plan_id')) : null;
                    $newPlan = $user->plan;
                    
                    if ($oldPlan && $newPlan && isPlanUpgrade($oldPlan, $newPlan)) {
                        reactivateResources($user);
                    }
                    
                    if ($newPlan) {
                        enforcePlanLimitations($user);
                    }
                }
            } catch (\Exception $e) {
                \Log::error('User updated event failed: ' . $e->getMessage(), ['user_id' => $user->id]);
            }
        });
        
        static::created(function ($user) {
            // Assign default plan to company users if no default plan exists
            if ($user->type === 'company' && !$user->plan_id) {
                $defaultPlan = Plan::getDefaultPlan();
                if ($defaultPlan) {
                    $user->plan_id = $defaultPlan->id;
                    $user->plan_is_active = 1;
                    $user->save();
                }
            }
        });
    }
}