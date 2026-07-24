<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Plan;
use App\Models\User;

class CheckPlanAccess
{
    public function handle(Request $request, Closure $next)
    {
        $user = auth()->user();
        
        if (!$user) {
            return $next($request);
        }

        // Super admin has full access
        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        // Only company users need plan checks
        if ($user->type !== 'company') {
            $company = User::find($user->created_by);
            if ($company && $company->type === 'company' && $company->isPlanExpired()) {
                auth()->logout();
                return redirect()->route('login')->with('error', __('Access denied. Only company users can access this area.'));
            }
        }

        // Check if user needs plan subscription
        if ($user->needsPlanSubscription()) {
            $message = __('Please subscribe to a plan to continue.');
            
            if ($user->isTrialExpired()) {
                $message = __('Your trial period has expired. Please subscribe to a plan to continue.');
                $defaultPlan = Plan::getDefaultPlan();
                if ($defaultPlan) {
                    $user->update([
                        'plan_id' => $defaultPlan->id,
                        'is_trial' => 0,
                        'trial_expire_date' => null,
                        'plan_is_active' => 1
                    ]);
                    enforcePlanLimitations($user->fresh());
                } else {
                    \Log::warning('No default plan found for expired trial user', ['user_id' => $user->id]);
                }
            } elseif ($user->isPlanExpired()) {
                $message = __('Your plan has expired. Please renew your subscription.');
                $defaultPlan = Plan::getDefaultPlan();
                if ($defaultPlan) {
                    $user->update([
                        'plan_id' => $defaultPlan->id,
                        'plan_expire_date' => null,
                        'plan_is_active' => 1
                    ]);
                    enforcePlanLimitations($user->fresh());
                } else {
                    \Log::warning('No default plan found for expired plan user', ['user_id' => $user->id]);
                }
            }
            
            return redirect()->route('plans.index')->with('error', $message);
        }

        return $next($request);
    }
    
    /**
     * Check if user can create a new store
     */
    public static function checkStoreLimit($user)
    {
        if (!$user->plan) {
            return ['allowed' => false, 'message' => __('No active plan found.')];
        }
        
        $currentStores = $user->stores()->count();
        $maxStores = $user->plan->max_stores ?? $user->plan->business ?? 0;
        
        if ($currentStores >= $maxStores) {
            return [
                'allowed' => false, 
                'message' => __('You have reached your store limit (:current/:max). Please upgrade your plan.', [
                    'current' => $currentStores,
                    'max' => $maxStores
                ])
            ];
        }
        
        return ['allowed' => true];
    }
    
    /**
     * Check if user can add more users to a store
     */
    public static function checkUserLimit($user, $storeId)
    {
        if (!$user->plan) {
            return ['allowed' => false, 'message' => __('No active plan found.')];
        }
        
        // Count users excluding company users (type = 'company')
        $currentUsers = \App\Models\User::where('current_store', $storeId)
            ->where('type', '!=', 'company')
            ->count();
        $maxUsers = $user->plan->max_users_per_store ?? $user->plan->max_users ?? 0;
        
        if ($currentUsers >= $maxUsers) {
            return [
                'allowed' => false,
                'message' => __('You have reached your user limit for this store (:current/:max). Please upgrade your plan.', [
                    'current' => $currentUsers,
                    'max' => $maxUsers
                ])
            ];
        }
        
        return ['allowed' => true];
    }
    
    /**
     * Check if user can add more products to a store
     */
    public static function checkProductLimit($user, $storeId)
    {
        if (!$user->plan) {
            return ['allowed' => false, 'message' => __('No active plan found.')];
        }
        
        $currentProducts = \App\Models\Product::where('store_id', $storeId)->count();
        $maxProducts = $user->plan->max_products_per_store ?? 0;
        
        if ($maxProducts > 0 && $currentProducts >= $maxProducts) {
            return [
                'allowed' => false,
                'message' => __('You have reached your product limit for this store (:current/:max). Please upgrade your plan.', [
                    'current' => $currentProducts,
                    'max' => $maxProducts
                ])
            ];
        }
        
        return ['allowed' => true];
    }
    
    /**
     * Check if user has access to a specific feature
     */
    public static function checkFeatureAccess($user, $feature)
    {
        if (!$user->plan) {
            return ['allowed' => false, 'message' => __('No active plan found.')];
        }
        
        $featureMap = [
            'shipping_method' => 'enable_shipping_method',
            'pwa' => 'pwa_business',
            'custom_domain' => 'enable_custdomain',
            'custom_subdomain' => 'enable_custsubdomain',
            'chatgpt' => 'enable_chatgpt'
        ];
        
        if (!isset($featureMap[$feature])) {
            return ['allowed' => true]; // Unknown feature, allow by default
        }
        
        $planFeature = $featureMap[$feature];
        $isEnabled = $user->plan->$planFeature === 'on';
        
        if (!$isEnabled) {
            return [
                'allowed' => false,
                'message' => __('This feature is not included in your current plan. Please upgrade to access :feature.', [
                    'feature' => ucfirst(str_replace('_', ' ', $feature))
                ])
            ];
        }
        
        return ['allowed' => true];
    }
    
    /**
     * Check if resource can be manually activated
     */
    public static function canActivateResource($user, $type, $storeId = null, $excludeId = null)
    {
        $plan = $user->plan;
        if (!$plan) {
            return false;
        }
        
        switch ($type) {
            case 'store':
                $maxStores = $plan->max_stores ?? 0;
                $activeStores = 0;
                foreach ($user->stores as $store) {
                    $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
                    if ($config['store_status'] ?? true) {
                        $activeStores++;
                    }
                }
                return $activeStores < $maxStores;
                
            case 'user':
                $maxUsers = $plan->max_users_per_store ?? 0;
                $query = \App\Models\User::where('current_store', $storeId)
                    ->where('type', '!=', 'company')
                    ->where('status', 'active');
                    
                if ($excludeId) {
                    $query->where('id', '!=', $excludeId);
                }
                
                return $query->count() < $maxUsers;
                
            case 'product':
                $maxProducts = $plan->max_products_per_store ?? 0;
                if ($maxProducts <= 0) return true;
                
                $query = \App\Models\Product::where('store_id', $storeId)
                    ->where('is_active', true);
                    
                if ($excludeId) {
                    $query->where('id', '!=', $excludeId);
                }
                
                return $query->count() < $maxProducts;
        }
        
        return false;
    }
}