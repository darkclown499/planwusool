<?php

namespace App\Http\Controllers;

use App\Models\Referral;
use App\Models\PayoutRequest;
use App\Models\ReferralSetting;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReferralController extends BaseController
{
    public function index()
    {
        $user = Auth::user();
        $settings = ReferralSetting::current();
        
        if ($user->isSuperAdmin()) {
            return $this->superAdminView($settings);
        } else {
            return $this->companyView($user, $settings);
        }
    }

    private function superAdminView($settings)
    {
        $totalReferralUsers = User::whereNotNull('used_referral_code')
            ->where('type', '!=', 'superadmin')
            ->count();
        $pendingPayouts = PayoutRequest::where('status', 'pending')->count();
        $totalCommissionPaid = PayoutRequest::where('status', 'approved')->sum('amount');
        $formattedTotalCommissionPaid = formatCurrencyAmount($totalCommissionPaid);
        
        $monthlyReferrals = User::whereNotNull('used_referral_code')
            ->where('type', '!=', 'superadmin')
            ->selectRaw('MONTH(created_at) as month, COUNT(*) as count')
            ->whereYear('created_at', date('Y'))
            ->groupBy('month')
            ->pluck('count', 'month')
            ->toArray();

        $monthlyPayouts = PayoutRequest::where('status', 'approved')
            ->selectRaw('MONTH(created_at) as month, SUM(amount) as total')
            ->whereYear('created_at', date('Y'))
            ->groupBy('month')
            ->pluck('total', 'month')
            ->toArray();

        $topCompanies = User::select('users.id', 'users.name', 'users.email', 'users.referral_code')
            ->selectRaw('COUNT(referrals.id) as referral_count, SUM(referrals.amount) as total_earned')
            ->leftJoin('referrals', 'users.id', '=', 'referrals.company_id')
            ->where('users.type', 'company')
            ->whereNotNull('users.referral_code')
            ->groupBy('users.id', 'users.name', 'users.email', 'users.referral_code')
            ->orderByDesc('referral_count')
            ->limit(5)
            ->get()
            ->map(function ($company) {
                $company->formatted_total_earned = formatCurrencyAmount($company->total_earned ?? 0);
                return $company;
            });

        $payoutRequests = PayoutRequest::with('company')
            ->orderBy('created_at', 'desc')
            ->paginate(10);
        
        // Add formatted amounts using superadmin currency settings
        $payoutRequests->getCollection()->transform(function ($request) {
            $request->formatted_amount = formatCurrencyAmount($request->amount);
            return $request;
        });

        return Inertia::render('referral/index', [
            'userType' => 'superadmin',
            'settings' => $settings,
            'stats' => [
                'totalReferralUsers' => $totalReferralUsers,
                'pendingPayouts' => $pendingPayouts,
                'totalCommissionPaid' => $totalCommissionPaid,
                'formattedTotalCommissionPaid' => $formattedTotalCommissionPaid,
                'monthlyReferrals' => $monthlyReferrals,
                'monthlyPayouts' => $monthlyPayouts,
                'topCompanies' => $topCompanies,
            ],
            'payoutRequests' => $payoutRequests,
        ]);
    }

    private function companyView($user, $settings)
    {
        $totalReferrals = Referral::where('company_id', $user->id)->count();
        $totalEarned = Referral::where('company_id', $user->id)->sum('amount');
        $totalPayoutRequests = PayoutRequest::where('company_id', $user->id)->count();
        $availableBalance = max(0, $totalEarned - PayoutRequest::where('company_id', $user->id)
            ->whereIn('status', ['pending', 'approved'])
            ->sum('amount'));
        
        // Format currency amounts using superadmin settings
        $formattedTotalEarned = formatCurrencyAmount($totalEarned);
        $formattedAvailableBalance = formatCurrencyAmount($availableBalance);
        $formattedThresholdAmount = formatCurrencyAmount($settings->threshold_amount ?? 0);

        $payoutRequests = PayoutRequest::where('company_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);
        
        // Add formatted amounts using superadmin currency settings
        $payoutRequests->getCollection()->transform(function ($request) {
            $request->formatted_amount = formatCurrencyAmount($request->amount);
            return $request;
        });

        $recentReferredUsers = User::where('used_referral_code', $user->referral_code)
            ->with(['plan', 'planOrders' => function($query) {
                $query->where('status', 'approved')->orderBy('created_at', 'desc')->limit(1);
            }])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Generate referral code if not exists
        if (!$user->referral_code) {
            do {
                $referralCode = rand(100000, 999999);
            } while (User::where('referral_code', $referralCode)->exists());
            $user->referral_code = $referralCode;
            $user->save();
        }
        
        $referralLink = url('/register?ref=' . $user->referral_code);

        return Inertia::render('referral/index', [
            'userType' => 'company',
            'settings' => $settings,
            'stats' => [
                'totalReferrals' => $totalReferrals,
                'totalEarned' => $totalEarned,
                'formattedTotalEarned' => $formattedTotalEarned,
                'totalPayoutRequests' => $totalPayoutRequests,
                'availableBalance' => $availableBalance,
                'formattedAvailableBalance' => $formattedAvailableBalance,
            ],
            'formattedSettings' => [
                'formattedThresholdAmount' => $formattedThresholdAmount,
            ],
            'payoutRequests' => $payoutRequests,
            'referralLink' => $referralLink,
            'recentReferredUsers' => $recentReferredUsers,
        ]);
    }

    public function updateSettings(Request $request)
    {
        $validated = $request->validate([
            'commission_percentage' => 'required|numeric|min:0|max:100',
            'threshold_amount' => 'required|numeric|min:0',
            'guidelines' => 'nullable|string',
            'is_enabled' => 'boolean',
        ], [], [
            'commission_percentage' => __('Commission Percentage'),
            'threshold_amount' => __('Minimum Threshold Amount'),
            'guidelines' => __('Referral Guidelines'),
        ]);

        $settings = ReferralSetting::current();
        $settings->update($validated);

        return back()->with('success', __('Referral settings updated successfully'));
    }

    public function createPayoutRequest(Request $request)
    {
        $user = Auth::user();
        $settings = ReferralSetting::current();
        
        if ($user->type !== 'company') {
            return back()->withErrors(['amount' => __('Only company users can create payout requests')]);
        }
        
        $request->validate([
            'amount' => 'required|numeric|min:1',
        ], [], [
            'amount' => __('Amount'),
        ]);

        $totalEarned = Referral::where('company_id', $user->id)->sum('amount') ?? 0;
        $totalRequested = PayoutRequest::where('company_id', $user->id)
            ->whereIn('status', ['pending', 'approved'])
            ->sum('amount') ?? 0;
        $availableBalance = $totalEarned - $totalRequested;

        if ($request->amount > $availableBalance) {
            return back()->withErrors(['amount' => __('Insufficient balance')]);
        }

        if ($request->amount < $settings->threshold_amount) {
            return back()->withErrors(['amount' => __('Amount must be at least :amount', ['amount' => formatCurrencyAmount($settings->threshold_amount)])]);
        }

        PayoutRequest::create([
            'company_id' => $user->id,
            'amount' => $request->amount,
            'status' => 'pending',
        ]);

        return back()->with('success', __('Payout request submitted successfully'));
    }

    public function approvePayoutRequest(PayoutRequest $payoutRequest)
    {
        if ($payoutRequest->status !== 'pending') {
            return back()->withErrors(['error' => __('This request has already been processed.')]);
        }
        $payoutRequest->update(['status' => 'approved']);
        return back()->with('success', __('Payout request approved'));
    }

    public function rejectPayoutRequest(PayoutRequest $payoutRequest, Request $request)
    {
        if ($payoutRequest->status !== 'pending') {
            return back()->withErrors(['error' => __('This request has already been processed.')]);
        }
        $request->validate([
            'notes' => 'nullable|string',
        ], [], [
            'notes' => __('Rejection Reason'),
        ]);
        $payoutRequest->update([
            'status' => 'rejected',
            'notes' => $request->notes,
        ]);
        return back()->with('success', __('Payout request rejected'));
    }
    
    public function getReferredUsers(Request $request)
    {
        $user = Auth::user();
        if ($user->isSuperAdmin()) {
            $referredUsers = User::whereNotNull('used_referral_code')
                ->where('type', '!=', 'superadmin')
                ->with(['plan', 'referrals', 'planOrders' => function($query) {
                    $query->where('status', 'approved')->orderBy('created_at', 'desc')->limit(1);
                }])
                ->orderBy('created_at', 'desc')
                ->paginate(15)
                ->withQueryString();
        } else {
            $referredUsers = User::where('used_referral_code', $user->referral_code)
                ->with(['plan', 'referrals', 'planOrders' => function($query) {
                    $query->where('status', 'approved')->orderBy('created_at', 'desc')->limit(1);
                }])
                ->orderBy('created_at', 'desc')
                ->paginate(15)
                ->withQueryString();
        }
        
        // Add formatted currency amounts using superadmin settings
        $referredUsers->getCollection()->transform(function ($user) {
            if ($user->referrals) {
                $user->referrals->transform(function ($referral) {
                    $referral->formatted_amount = formatCurrencyAmount($referral->amount);
                    return $referral;
                });
            }
            if ($user->planOrders) {
                $user->planOrders->transform(function ($order) {
                    $order->formatted_final_price = formatCurrencyAmount($order->final_price);
                    return $order;
                });
            }
            return $user;
        });
        return Inertia::render('referral/referred-users', [
            'referredUsers' => $referredUsers,
            'userType' => $user->isSuperAdmin() ? 'superadmin' : 'company',
        ]);
    }

    public static function createReferralRecord(User $user, $billingCycle = null)
    {
        $settings = ReferralSetting::current();
        
        if (!$settings || !$settings->is_enabled || !$user->used_referral_code || !$user->plan) {
            return;
        }

        // Self-referral protection
        if ((string)$user->used_referral_code === (string)$user->referral_code) {
            return;
        }
        
        // Idempotency: any existing referral for this referred user blocks duplicate credit
        if (Referral::where('user_id', $user->id)->exists()) {
            return;
        }
        $existingReferral = Referral::where('user_id', $user->id)
            ->where('plan_id', $user->plan_id)
            ->first();
            
        if ($existingReferral) {
            return;
        }
        
        $referrer = User::where('referral_code', $user->used_referral_code)
            ->where('type', 'company')
            ->first();
            
        if (!$referrer) {
            return;
        }

        // Self-referral: referrer cannot be the referred user
        if ((int)$referrer->id === (int)$user->id) {
            return;
        }
        
        // Qualifying event: must have an approved paid plan order; do not reward before qualification
        $planOrder = \App\Models\PlanOrder::where('user_id', $user->id)
            ->where('plan_id', $user->plan_id)
            ->where('status', 'approved')
            ->orderBy('created_at', 'desc')
            ->first();
        
        if (!$planOrder) {
            return;
        }
        $actualPaidAmount = $planOrder->final_price > 0 ? (float)$planOrder->final_price : (float)$user->plan->getPriceForCycle($planOrder->billing_cycle ?? $billingCycle ?? 'monthly');
        if ($actualPaidAmount <= 0) {
            return;
        }
        
        $commissionAmount = ($actualPaidAmount * $settings->commission_percentage) / 100;
        
        if ($commissionAmount > 0) {
            Referral::create([
                'user_id' => $user->id,
                'company_id' => $referrer->id,
                'commission_percentage' => $settings->commission_percentage,
                'amount' => $commissionAmount,
                'plan_id' => $user->plan_id,
            ]);
        }
    }
}