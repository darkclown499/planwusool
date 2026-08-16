<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PlanController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        
        // Company users see only active plans
        if ($user->type !== 'superadmin') {
            return $this->companyPlansView($request);
        }
        
        // Admin view
        $billingCycle = $request->input('billing_cycle', 'yearly');
        
        $dbPlans = Plan::all();
        $hasDefaultPlan = $dbPlans->where('is_default', true)->count() > 0;
        
        $plans = $dbPlans->map(function ($plan) use ($billingCycle) {
            // Determine features based on plan attributes
            $features = [];
            if ($plan->enable_custdomain === 'on') $features[] = 'Custom Domain';
            if ($plan->enable_custsubdomain === 'on') $features[] = 'Subdomain';
            if ($plan->pwa_business === 'on') $features[] = 'PWA';
            if ($plan->enable_chatgpt === 'on') $features[] = 'AI Integration';
            if ($plan->enable_shipping_method === 'on') $features[] = 'Shipping Method';
            if ($plan->enable_mobile_app === 'on') $features[] = 'Mobile App';
            
            // Always use yearly price
            $price = $plan->yearly_price ?? $plan->price;
            
            // Format price with currency symbol
            $formattedPrice = $this->formatPlanPrice($price);
            
            // Set duration as yearly
            $duration = 'Yearly';
            
            // Calculate savings for yearly plans
            $savings = 0;
            if ($billingCycle === 'yearly' && $plan->yearly_price && $plan->price > 0) {
                $savings = ($plan->price * 12) - $plan->yearly_price;
            }
            
            return [
                'id' => $plan->id,
                'name' => $plan->name,
                'price' => $price,
                'monthly_price' => $plan->price,
                'yearly_price' => $plan->yearly_price,
                'formattedPrice' => $formattedPrice,
                'duration' => $duration,
                'description' => $plan->description,
                'trial_days' => $plan->trial_day,
                'savings' => $savings,
                'features' => $features,
                'stats' => [
                    'stores' => $plan->max_stores ?? $plan->business ?? 0,
                    'users_per_store' => $plan->max_users_per_store ?? $plan->max_users ?? 0,
                    'products_per_store' => $plan->max_products_per_store ?? 0,
                    'warehouses' => $plan->max_warehouses ?? 0,
                    'storage' => $plan->storage_limit . ' GB',
                    'templates' => $this->getThemeCount($plan->themes),
                    'domain_type' => $plan->domain_type ?? 'subdomain',
                    'support_hours' => $plan->support_hours ?? 0,
                    'support_type' => $plan->support_type ?? 'email',
                ],
                'status' => $plan->is_plan_enable === 'on',
                'is_default' => $plan->is_default,
                'recommended' => $plan->is_recommended ?? false
            ];
        })->toArray();

        return Inertia::render('plans/index', [
            'plans' => $plans,
            'billingCycle' => $billingCycle,
            'hasDefaultPlan' => $hasDefaultPlan,
            'isAdmin' => true
        ]);
    }
    
    /**
     * Toggle plan status
     */
    public function toggleStatus(Plan $plan)
    {
        $plan->is_plan_enable = $plan->is_plan_enable === 'on' ? 'off' : 'on';
        $plan->save();
        
        return back();
    }
    
    /**
     * Show the form for creating a new plan
     */
    public function create()
    {
        $hasDefaultPlan = Plan::where('is_default', true)->exists();
        
        return Inertia::render('plans/create', [
            'hasDefaultPlan' => $hasDefaultPlan
        ]);
    }
    
    /**
     * Store a newly created plan
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:plans',
            'price' => 'required|numeric|min:0',
            'yearly_price' => 'nullable|numeric|min:0',
            'duration' => 'required|string',
            'domain_type' => 'nullable|string|in:subdomain,custom',
            'support_hours' => 'nullable|integer|min:0',
            'support_type' => 'nullable|string',
            'description' => 'nullable|string',
            'max_stores' => 'required|integer|min:0',
            'max_users_per_store' => 'required|integer|min:0',
            'max_products_per_store' => 'required|integer|min:0',
            'max_warehouses' => 'nullable|integer|min:0',
            'storage_limit' => 'required|numeric|min:0',
            'enable_custdomain' => 'nullable|in:on,off',
            'enable_custsubdomain' => 'nullable|in:on,off',
            'pwa_business' => 'nullable|in:on,off',
            'enable_chatgpt' => 'nullable|in:on,off',
            'enable_shipping_method' => 'nullable|in:on,off',
            'enable_mobile_app' => 'nullable|in:on,off',
            'enable_branding' => 'nullable|in:on,off',
            'enable_theme_editor' => 'nullable|in:on,off',
            'enable_accounting_integration' => 'nullable|in:on,off',
            'template_editor_level' => 'nullable|in:none,limited,full',
            'themes' => 'nullable|array',
            'is_trial' => 'nullable|in:on,off',
            'trial_day' => 'nullable|integer|min:0',
            'is_plan_enable' => 'nullable|in:on,off',
            'is_default' => 'nullable|boolean',
            'is_recommended' => 'nullable|boolean',
        ]);
        
        // Set default values for nullable fields
        $validated['enable_custdomain'] = $validated['enable_custdomain'] ?? 'off';
        $validated['enable_custsubdomain'] = $validated['enable_custsubdomain'] ?? 'off';
        $validated['pwa_business'] = $validated['pwa_business'] ?? 'off';
        $validated['enable_chatgpt'] = $validated['enable_chatgpt'] ?? 'off';
        $validated['enable_shipping_method'] = $validated['enable_shipping_method'] ?? 'off';
        $validated['enable_mobile_app'] = $validated['enable_mobile_app'] ?? 'off';
        $validated['enable_branding'] = $validated['enable_branding'] ?? 'off';
        $validated['enable_theme_editor'] = $validated['enable_theme_editor'] ?? 'off';
        $validated['enable_accounting_integration'] = $validated['enable_accounting_integration'] ?? 'off';
        $validated['template_editor_level'] = $validated['template_editor_level'] ?? 'none';
        $validated['is_trial'] = $validated['is_trial'] ?? null;
        $validated['is_plan_enable'] = $validated['is_plan_enable'] ?? 'on';
        $validated['is_default'] = $validated['is_default'] ?? false;
        $validated['is_recommended'] = $validated['is_recommended'] ?? false;
        $validated['domain_type'] = $validated['domain_type'] ?? 'subdomain';
        $validated['support_hours'] = $validated['support_hours'] ?? 0;
        $validated['support_type'] = $validated['support_type'] ?? 'email';
        $validated['max_warehouses'] = $validated['max_warehouses'] ?? 0;
        
        // If yearly_price is not provided, calculate it as 80% of monthly price * 12
        if (!isset($validated['yearly_price']) || $validated['yearly_price'] === null) {
            $validated['yearly_price'] = $validated['price'] * 12 * 0.8;
        }
        
        // If this plan is set as default, remove default status from other plans
        if ($validated['is_default']) {
            Plan::where('is_default', true)->update(['is_default' => false]);
        }
        
        // Ensure at least default theme is included
        if (!isset($validated['themes']) || !is_array($validated['themes']) || count($validated['themes']) === 0) {
            $validated['themes'] = ['gadgets']; // Default theme
        }
        
        // Create the plan
        Plan::create($validated);
        
        return redirect()->route('plans.index')->with('success', __('Plan created successfully.'));
    }
    
    /**
     * Show the form for editing a plan
     */
    public function edit(Plan $plan)
    {
        $otherDefaultPlanExists = Plan::where('is_default', true)
            ->where('id', '!=', $plan->id)
            ->exists();
            
        return Inertia::render('plans/edit', [
            'plan' => $plan,
            'otherDefaultPlanExists' => $otherDefaultPlanExists
        ]);
    }
    
    /**
     * Update a plan
     */
    public function update(Request $request, Plan $plan)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:plans,name,' . $plan->id,
            'price' => 'required|numeric|min:0',
            'yearly_price' => 'nullable|numeric|min:0',
            'duration' => 'required|string',
            'domain_type' => 'nullable|string|in:subdomain,custom',
            'support_hours' => 'nullable|integer|min:0',
            'support_type' => 'nullable|string',
            'description' => 'nullable|string',
            'max_stores' => 'required|integer|min:0',
            'max_users_per_store' => 'required|integer|min:0',
            'max_products_per_store' => 'required|integer|min:0',
            'max_warehouses' => 'nullable|integer|min:0',
            'storage_limit' => 'required|numeric|min:0',
            'enable_custdomain' => 'nullable|in:on,off',
            'enable_custsubdomain' => 'nullable|in:on,off',
            'pwa_business' => 'nullable|in:on,off',
            'enable_chatgpt' => 'nullable|in:on,off',
            'enable_shipping_method' => 'nullable|in:on,off',
            'enable_mobile_app' => 'nullable|in:on,off',
            'enable_branding' => 'nullable|in:on,off',
            'enable_theme_editor' => 'nullable|in:on,off',
            'enable_accounting_integration' => 'nullable|in:on,off',
            'template_editor_level' => 'nullable|in:none,limited,full',
            'themes' => 'nullable|array',
            'is_trial' => 'nullable|in:on,off',
            'trial_day' => 'nullable|integer|min:0',
            'is_plan_enable' => 'nullable|in:on,off',
            'is_default' => 'nullable|boolean',
            'is_recommended' => 'nullable|boolean',
        ]);
        
        // Set default values for nullable fields
        $validated['enable_custdomain'] = $validated['enable_custdomain'] ?? 'off';
        $validated['enable_custsubdomain'] = $validated['enable_custsubdomain'] ?? 'off';
        $validated['pwa_business'] = $validated['pwa_business'] ?? 'off';
        $validated['enable_chatgpt'] = $validated['enable_chatgpt'] ?? 'off';
        $validated['enable_shipping_method'] = $validated['enable_shipping_method'] ?? 'off';
        $validated['enable_mobile_app'] = $validated['enable_mobile_app'] ?? 'off';
        $validated['enable_branding'] = $validated['enable_branding'] ?? 'off';
        $validated['enable_theme_editor'] = $validated['enable_theme_editor'] ?? 'off';
        $validated['enable_accounting_integration'] = $validated['enable_accounting_integration'] ?? 'off';
        $validated['template_editor_level'] = $validated['template_editor_level'] ?? 'none';
        $validated['is_trial'] = $validated['is_trial'] ?? null;
        $validated['is_plan_enable'] = $validated['is_plan_enable'] ?? 'on';
        $validated['is_default'] = $validated['is_default'] ?? false;
        $validated['is_recommended'] = $validated['is_recommended'] ?? false;
        $validated['domain_type'] = $validated['domain_type'] ?? 'subdomain';
        $validated['support_hours'] = $validated['support_hours'] ?? 0;
        $validated['support_type'] = $validated['support_type'] ?? 'email';
        $validated['max_warehouses'] = $validated['max_warehouses'] ?? 0;
        
        // If yearly_price is not provided, calculate it as 80% of monthly price * 12
        if (!isset($validated['yearly_price']) || $validated['yearly_price'] === null) {
            $validated['yearly_price'] = $validated['price'] * 12 * 0.8;
        }
        
        // If this plan is set as default, remove default status from other plans
        if ($validated['is_default'] && !$plan->is_default) {
            Plan::where('is_default', true)->update(['is_default' => false]);
        }
        
        // Ensure at least default theme is included
        if (!isset($validated['themes']) || !is_array($validated['themes']) || count($validated['themes']) === 0) {
            $validated['themes'] = ['gadgets']; // Default theme
        }
        
        // Update the plan
        $plan->update($validated);
        
        return redirect()->route('plans.index')->with('success', __('Plan updated successfully.'));
    }
    
    /**
     * Delete a plan
     */
    public function destroy(Plan $plan)
    {
        // Don't allow deleting the default plan
        if ($plan->is_default) {
            return back()->with('error', __('Cannot delete the default plan.'));
        }
        
        $plan->delete();
        
        return redirect()->route('plans.index')->with('success', __('Plan deleted successfully.'));
    }
    
    private function companyPlansView(Request $request)
    {
        $user = auth()->user();
        // Dynamic duration calculation from AccountGo logic
        $detectedDuration = $user->plan_duration;
        if (empty($detectedDuration) && $user->plan_id) {
            if (!empty($user->plan_expire_date) && $user->plan_expire_date >= now()->format('Y-m-d')) {
                $latestOrder = \App\Models\PlanOrder::where('user_id', $user->id)
                    ->where('plan_id', $user->plan_id)
                    ->where('status', 'approved')
                    ->latest()
                    ->first();
                
                if ($latestOrder) {
                    $diffDays = \Carbon\Carbon::parse($latestOrder->ordered_at)->diffInDays(\Carbon\Carbon::parse($user->plan_expire_date));
                    $detectedDuration = ($diffDays > 40) ? 'yearly' : 'monthly';
                } else {
                    $detectedDuration = 'monthly';
                }
            } else if (!empty($user->trial_expire_date) && $user->trial_expire_date >= now()->format('Y-m-d')) {
                $detectedDuration = 'trial';
            } else if (empty($user->plan_expire_date)) {
                $detectedDuration = 'lifetime';
            }
        }

        // All plans are yearly only
        $billingCycle = 'yearly';
        
        $dbPlans = Plan::where('is_plan_enable', 'on')->get();
        
        $plans = $dbPlans->map(function ($plan) use ($user) {
            $price = $plan->yearly_price ?? $plan->price;
            
            $features = [];
            if ($plan->enable_custdomain === 'on') $features[] = 'Custom Domain';
            if ($plan->enable_custsubdomain === 'on') $features[] = 'Subdomain';
            if ($plan->pwa_business === 'on') $features[] = 'PWA';
            if ($plan->enable_chatgpt === 'on') $features[] = 'AI Integration';
            if ($plan->enable_shipping_method === 'on') $features[] = 'Shipping Method';
            if ($plan->enable_mobile_app === 'on') $features[] = 'Mobile App';
            
            return [
                'id' => $plan->id,
                'name' => $plan->name,
                'price' => $price,
                'monthly_price' => $plan->price,
                'yearly_price' => $plan->yearly_price,
                'formatted_price' => $this->formatPlanPrice($price),
                'duration' => 'Yearly',
                'description' => $plan->description,
                'trial_days' => $plan->trial_day,
                'features' => $features,
                'stats' => [
                    'stores' => $plan->max_stores ?? $plan->business ?? 0,
                    'users_per_store' => $plan->max_users_per_store ?? $plan->max_users ?? 0,
                    'products_per_store' => $plan->max_products_per_store ?? 0,
                    'warehouses' => $plan->max_warehouses ?? 0,
                    'storage' => $plan->storage_limit . ' GB',
                    'templates' => $this->getThemeCount($plan->themes),
                    'domain_type' => $plan->domain_type ?? 'subdomain',
                    'support_hours' => $plan->support_hours ?? 0,
                    'support_type' => $plan->support_type ?? 'email',
                ],
                'is_current' => $user->plan_id == $plan->id,
                'is_trial_available' => $plan->is_trial === 'on' && !$user->is_trial,
                'is_default' => $plan->is_default,
                'recommended' => $plan->is_recommended ?? false
            ];
        });
        
        return Inertia::render('plans/index', [
            'plans' => $plans,
            'billingCycle' => $billingCycle,
            'currentPlan' => $user->plan ? [
                ...$user->plan->toArray(),
                'duration' => $detectedDuration ?? 'monthly',
                'expires_at' => $user->plan_expire_date
            ] : null,
            'userTrialUsed' => $user->is_trial
        ]);
    }
    
    public function requestPlan(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'billing_cycle' => 'required|in:monthly,yearly'
        ]);
        
        $user = auth()->user();
        $plan = Plan::findOrFail($request->plan_id);
        
        \App\Models\PlanRequest::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'duration' => $request->billing_cycle,
            'status' => 'pending'
        ]);
        
        return back()->with('success', __('Plan request submitted successfully'));
    }
    
    public function startTrial(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|exists:plans,id'
        ]);
        
        $user = auth()->user();
        $plan = Plan::findOrFail($request->plan_id);
        if ($user->is_trial || $plan->is_trial !== 'on') {
            return back()->withErrors(['error' => 'Trial not available']);
        }
        
        $user->update([
            'plan_id' => $plan->id,
            'is_trial' => 1,
            'trial_day' => $plan->trial_day,
            'trial_expire_date' => now()->addDays($plan->trial_day)
        ]);
        
        return back()->with('success', __('Trial started successfully'));
    }
    
    public function subscribe(Request $request)
    {
        $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'billing_cycle' => 'required|in:monthly,yearly',
            'coupon_code' => 'nullable|string',
        ]);
        
        $user = auth()->user();
        $plan = Plan::findOrFail($request->plan_id);
        
        if ($user->plan_id == $plan->id && $user->hasActivePlan()) {
            return back()->withErrors(['error' => __('You already have this plan active.')]);
        }
        
        if ($plan->is_plan_enable !== 'on') {
            return back()->withErrors(['error' => __('This plan is not available for subscription.')]);
        }
        
        try {
            $pricing = calculatePlanPricing($plan, $request->coupon_code, $request->billing_cycle, $user->id);
            
            if ($request->coupon_code && !$pricing['coupon_id']) {
                return back()->withErrors(['coupon_code' => __('Invalid or expired coupon code.')]);
            }
            
            // If plan is free (price = 0), assign directly
            if ($pricing['final_price'] == 0) {
                $planOrder = \App\Models\PlanOrder::create([
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'coupon_id' => $pricing['coupon_id'],
                    'coupon_code' => $request->coupon_code,
                    'billing_cycle' => $request->billing_cycle,
                    'original_price' => $pricing['original_price'],
                    'discount_amount' => $pricing['discount_amount'],
                    'final_price' => $pricing['final_price'],
                    'status' => 'approved'
                ]);
                
                if ($pricing['coupon_id']) {
                    \App\Models\Coupon::where('id', $pricing['coupon_id'])->increment('used_count');
                }
                
                assignPlanToUser($user, $plan, $request->billing_cycle);
                
                return back()->with('success', __('Plan assigned successfully'));
            }
            
            // For paid plans, create pending order and redirect to payment
            $planOrder = \App\Models\PlanOrder::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'coupon_id' => $pricing['coupon_id'],
                'coupon_code' => $request->coupon_code,
                'billing_cycle' => $request->billing_cycle,
                'original_price' => $pricing['original_price'],
                'discount_amount' => $pricing['discount_amount'],
                'final_price' => $pricing['final_price'],
                'status' => 'pending'
            ]);
            
            // Redirect to payment gateway selection
            return redirect()->route('payment.select', ['plan_order_id' => $planOrder->id])
                ->with('success', __('Please complete the payment to activate your plan.'));
            
        } catch (\Exception $e) {
            \Log::error('Plan subscription failed: ' . $e->getMessage(), ['user_id' => $user->id, 'plan_id' => $plan->id]);
            return back()->withErrors(['error' => __('Plan subscription failed. Please try again.')]);
        }
    }
    
    /**
     * Get theme count for display
     */
    private function getThemeCount($themes)
    {
        if (is_array($themes)) {
            return count($themes);
        }
        return 29; // Default theme count (all available themes)
    }
    
    /**
     * Format plan price using superadmin currency settings
     */
    private function formatPlanPrice($price)
    {
        return formatCurrencyAmount($price);
    }
}