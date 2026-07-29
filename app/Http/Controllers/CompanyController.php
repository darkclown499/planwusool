<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Plan;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class CompanyController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query()
            ->where('type', 'company')
            ->with('plan')
            ->withCount('stores');
            
        // Apply search filter
        if ($request->has('search') && !empty($request->search)) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            });
        }
        
        // Apply status filter
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Apply plan filter
        if ($request->has('plan_id') && !empty($request->plan_id)) {
            $query->where('plan_id', $request->plan_id);
        }
        
        // Apply date filters
        if ($request->has('start_date') && !empty($request->start_date)) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        
        if ($request->has('end_date') && !empty($request->end_date)) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }
        
        // Apply sorting
        $allowedSortFields = ['name', 'email', 'status', 'created_at', 'plan_id', 'id'];
        $sortField = $request->input('sort_field', 'created_at');
        if (!in_array($sortField, $allowedSortFields)) {
            $sortField = 'created_at';
        }
        
        $sortDirection = $request->input('sort_direction', 'desc');
        if (!in_array(strtolower($sortDirection), ['asc', 'desc'])) {
            $sortDirection = 'desc';
        }
        
        // In demo mode, show demo account first
        if (config('app.is_demo')) {
            $query->orderByRaw("CASE WHEN email = 'company@example.com' THEN 0 ELSE 1 END ASC");
        }
        
        $query->orderBy($sortField, $sortDirection);
        
        // Get paginated results
        $perPage = $request->input('per_page', 10);
        $companies = $query->paginate($perPage)->withQueryString();
        
        // Transform data for frontend
        $companies->getCollection()->transform(function ($company) {
            // Determine subscription status
            if ($company->plan_is_active && $company->plan_expire_date === null) {
                $subscription_status = 'active';
            } elseif ($company->plan_expire_date && $company->plan_expire_date->isFuture()) {
                $subscription_status = 'active';
            } elseif ($company->is_trial && $company->trial_expire_date && $company->trial_expire_date->isFuture()) {
                $subscription_status = 'trial';
            } elseif ($company->plan_expire_date && $company->plan_expire_date->isPast()) {
                $subscription_status = 'expired';
            } else {
                $subscription_status = 'pending';
            }

            return [
                'id' => $company->id,
                'name' => $company->name,
                'email' => $company->email,
                'status' => $company->status,
                'avatar' => $company->avatar,
                'created_at' => $company->created_at,
                'plan_name' => $company->plan ? $company->plan->name : __('No Plan'),
                'plan_id' => $company->plan_id,
                'plan_expiry_date' => $company->plan_expire_date,
                'plan_duration' => $company->plan_duration ?? null,
                'stores_count' => $company->stores_count ?? 0,
                'subscription_status' => $subscription_status,
            ];
        });
        
        // Get plans for dropdown
        $plans = Plan::all(['id', 'name']);
        
        return Inertia::render('companies/index', [
            'companies' => $companies,
            'plans' => $plans,
            'filters' => $request->only(['search', 'status', 'start_date', 'end_date', 'sort_field', 'sort_direction', 'per_page', 'plan_id'])
        ]);
    }
    
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'nullable|string|min:8',
            'status' => 'required|in:active,inactive',
        ]);
        
        $company = new User();
        $company->name = $validated['name'];
        $company->email = $validated['email'];
        
        // Only set password if provided
        if (isset($validated['password'])) {
            $company->password = Hash::make($validated['password']);
        }
        
        $company->type = 'company';
        $company->status = $validated['status'];
        
        // Set company language same as creator (superadmin)
        $creator = auth()->user();
        if ($creator && $creator->lang) {
            $company->lang = $creator->lang;
        }
        
        // Assign default plan
        $defaultPlan = Plan::where('is_default', true)->first();
        if ($defaultPlan) {
            $company->plan_id = $defaultPlan->id;
            
            // Set plan expiry date based on plan duration
            if ($defaultPlan->duration === 'yearly') {
                $company->plan_expire_date = now()->addYear();
            } else {
                $company->plan_expire_date = now()->addMonth();
            }
            
            // Set plan is active
            $company->plan_is_active = 1;
        }
        
        $company->save();
        
        // Assign role and settings to the user
        defaultRoleAndSetting($company);
        
        // Trigger email notification
        event(new \App\Events\UserCreated($company, $validated['password'] ?? ''));
        
        // Check for email errors
        if (session()->has('email_error')) {
            return redirect()->back()->with('warning', __('Company created successfully, but welcome email failed: ') . session('email_error'));
        }
        
        return redirect()->back()->with('success', __('Company created successfully'));
    }
    
    public function update(Request $request, User $company)
    {
        // Ensure this is a company type user
        if ($company->type !== 'company') {
            return redirect()->back()->with('error', __('Invalid company record'));
        }
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $company->id,
            'status' => 'required|in:active,inactive',
        ]);
        
        $company->name = $validated['name'];
        $company->email = $validated['email'];
        $company->status = $validated['status'];
        
        $company->save();
        
        return redirect()->back()->with('success', __('Company updated successfully'));
    }
    
    public function destroy(User $company)
    {
        // Ensure this is a company type user
        if ($company->type !== 'company') {
            return redirect()->back()->with('error', __('Invalid company record'));
        }
        
        $company->delete();
        
        return redirect()->back()->with('success', __('Company deleted successfully'));
    }
    
    public function resetPassword(Request $request, User $company)
    {
        // Ensure this is a company type user
        if ($company->type !== 'company') {
            return redirect()->back()->with('error', __('Invalid company record'));
        }
        
        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8'],
        ]);
        
        $company->password = Hash::make($validated['password']);
        $company->save();
        
        return redirect()->back()->with('success', __('Password reset successfully'));
    }
    
    public function toggleStatus(User $company)
    {
        // Ensure this is a company type user
        if ($company->type !== 'company') {
            return redirect()->back()->with('error', __('Invalid company record'));
        }
        
        $company->status = $company->status === 'active' ? 'inactive' : 'active';
        $company->save();
        
        return redirect()->back()->with('success', __('Company status updated successfully'));
    }
    
    /**
     * Get available plans for upgrade
     */
    public function getPlans(User $company)
    {
        // Ensure this is a company type user
        if ($company->type !== 'company') {
            return response()->json(['error' => __('Invalid company record')], 400);
        }
        
        $plans = Plan::where('is_plan_enable', 'on')->get();
        
        // Detect company's actual plan duration using AccountGo logic
        $detectedDuration = $company->plan_duration;
        if (empty($detectedDuration) && $company->plan_id) {
            if (!empty($company->plan_expire_date) && $company->plan_expire_date >= now()->format('Y-m-d')) {
                $latestOrder = \App\Models\PlanOrder::where('user_id', $company->id)
                    ->where('plan_id', $company->plan_id)
                    ->where('status', 'approved')
                    ->latest()
                    ->first();

                if ($latestOrder) {
                    $diffDays = \Carbon\Carbon::parse($latestOrder->ordered_at)
                        ->diffInDays(\Carbon\Carbon::parse($company->plan_expire_date));
                    $detectedDuration = ($diffDays > 40) ? 'yearly' : 'monthly';
                } else {
                    $detectedDuration = 'monthly';
                }
            } elseif (!empty($company->trial_expire_date) && $company->trial_expire_date >= now()->format('Y-m-d')) {
                $detectedDuration = 'trial';
            } elseif (empty($company->plan_expire_date)) {
                $detectedDuration = 'lifetime';
            } else {
                $detectedDuration = 'monthly';
            }
        }
        
        $formattedPlans = $plans->map(function ($plan) use ($company, $detectedDuration) {
            // Format features
            $features = [];
            if ($plan->enable_custdomain === 'on') $features[] = __('Custom Domain');
            if ($plan->enable_custsubdomain === 'on') $features[] = __('Subdomain');
            if ($plan->enable_chatgpt === 'on') $features[] = __('AI Integration');
            
            // Calculate yearly price
            $yearlyPrice = $plan->yearly_price;
            if ($yearlyPrice === null) {
                $yearlyPrice = $plan->price * 12 * 0.8;
            }
            
            return [
                'id' => $plan->id,
                'name' => $plan->name,
                'monthly_price' => formatCurrencyAmount($plan->price),
                'yearly_price' => formatCurrencyAmount($yearlyPrice),
                // IMPORTANT: For current plan, use company's actual duration, not plan's default duration
                'duration' => ($plan->id === $company->plan_id) ? ($detectedDuration ?? 'monthly') : null,
                'description' => $plan->description,
                'features' => $features,
                'business' => $plan->business,
                'max_users' => $plan->max_users,
                'storage_limit' => $plan->storage_limit . ' ' . __('GB'),
                'is_current' => $company->plan_id === $plan->id,
                'is_default' => $plan->is_default
            ];
        });
        
        return response()->json([
            'plans' => $formattedPlans,
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'current_plan_id' => $company->plan_id,
                'current_plan_duration' => $detectedDuration ?? null
            ]
        ]);
    }
    
    /**
     * Upgrade company plan
     */
    public function upgradePlan(Request $request, User $company)
    {
        // Ensure this is a company type user
        if ($company->type !== 'company') {
            return back()->with('error', __('Invalid company record'));
        }
        
        $validated = $request->validate([
            'plan_id' => 'required|exists:plans,id',
            'billing_cycle' => 'required|in:monthly,yearly'
        ]);
        
        $plan = Plan::find($validated['plan_id']);
        if (!$plan) {
            return back()->with('error', __('Plan not found'));
        }
        
        // Update company plan
        $company->plan_id = $plan->id;
        
        // Save billing cycle
        $company->plan_duration = $validated['billing_cycle'];
        
        // Set plan expiry date based on billing cycle
        if ($validated['billing_cycle'] === 'yearly') {
            $company->plan_expire_date = now()->addYear();
        } else {
            $company->plan_expire_date = now()->addMonth();
        }
        
        // Set plan is active
        $company->plan_is_active = 1;
        
        $company->save();
        
        return back()->with('success', __('Plan upgraded successfully'));
    }
}