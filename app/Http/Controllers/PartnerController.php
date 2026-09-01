<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PartnerController extends Controller
{
    /**
     * Show the partner application / status page for the current user.
     */
    public function apply()
    {
        $user = Auth::user();
        // Fresh lookup: the stored user instance may carry a stale cached
        // relationship across long-running/long-lived request contexts.
        $partner = Partner::query()->where('user_id', $user->id)->first();

        return Inertia::render('partner/apply', [
            'partner' => $partner ? $this->presentPartner($partner) : null,
        ]);
    }

    /**
     * Submit a partner application. A user can only hold one partner profile.
     */
    public function storeApplication(Request $request)
    {
        $user = Auth::user();

        if ($user->partner) {
            return back()->withErrors(['error' => __('You already have a partner application.')]);
        }

        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'website' => ['nullable', 'string', 'max:255'],
            'social' => ['nullable', 'string', 'max:255'],
            'business_type' => ['required', 'string', 'max:60'],
        ], [], [
            'company_name' => __('Company name'),
            'contact_person' => __('Contact person'),
            'email' => __('Email'),
            'phone' => __('Phone'),
            'website' => __('Website'),
            'social' => __('Social profile'),
            'business_type' => __('Business type'),
        ]);

        $partner = Partner::forceCreate(array_merge($validated, [
            'user_id' => $user->id,
            'email' => $validated['email'] ?: $user->email,
            'referral_code' => Partner::generateReferralCode(),
            'status' => Partner::STATUS_PENDING,
        ]));

        return redirect()->route('partner.dashboard')
            ->with('success', __('Your partner application has been submitted for review.'));
    }

    /**
     * Partner dashboard (Phase 1): referred stores, activation state and the
     * partner's own status. No financial values are displayed/calculated.
     */
    public function dashboard()
    {
        $user = Auth::user();
        // Fresh lookup (see apply()): never trust a possibly-stale relationship.
        $partner = Partner::query()->where('user_id', $user->id)->first();

        if (!$partner) {
            return redirect()->route('partner.apply');
        }

        if ($partner->isSuspended()) {
            return Inertia::render('partner/dashboard', [
                'partner' => $this->presentPartner($partner),
                'referredStores' => [],
                'stats' => [
                    'referredStores' => 0,
                    'activatedStores' => 0,
                ],
            ]);
        }

        $stores = $this->attributedStores($partner);

        return Inertia::render('partner/dashboard', [
            'partner' => $this->presentPartner($partner),
            'referredStores' => $stores,
            'stats' => [
                'referredStores' => count($stores),
                'activatedStores' => collect($stores)->where('activated', true)->count(),
            ],
        ]);
    }

    /**
     * Stores attributed to this partner. Only minimal, policy-permitted data is
     * exposed: store name, creation date and activation/subscription state.
     * Orders, customers, revenue and payment details are never exposed.
     */
    private function attributedStores(Partner $partner): array
    {
        return Store::where('partner_id', $partner->id)
            ->with(['user' => fn ($q) => $q->select('id', 'partner_id', 'plan_id', 'plan_is_active', 'plan_expire_date', 'onboarded_at')])
            ->orderByDesc('created_at')
            ->get()
            ->map(function (Store $store) {
                $owner = $store->user;
                $activated = (bool) ($owner?->onboarded_at) && (bool) $store->is_active;

                return [
                    'id' => $store->id,
                    'name' => $store->name,
                    'slug' => $store->slug,
                    'created_at' => $store->created_at?->toISOString(),
                    'activated' => $activated,
                    'plan_is_active' => (bool) ($owner?->plan_is_active ?? false),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Present the partner record for the frontend (whitelisted fields only).
     */
    private function presentPartner(Partner $partner): array
    {
        return [
            'id' => $partner->id,
            'status' => $partner->status,
            'company_name' => $partner->company_name,
            'contact_person' => $partner->contact_person,
            'email' => $partner->email,
            'phone' => $partner->phone,
            'website' => $partner->website,
            'social' => $partner->social,
            'business_type' => $partner->business_type,
            'referral_code' => $partner->referral_code,
            'referral_link' => $partner->referral_code ? route('register', ['ref' => $partner->referral_code]) : null,
            'approved_at' => $partner->approved_at?->toISOString(),
            'created_at' => $partner->created_at?->toISOString(),
        ];
    }

    /**
     * Admin / superadmin list of partner applications.
     */
    public function adminIndex(Request $request)
    {
        $partners = Partner::withCount('stores')
            ->with('user:id,name,email')
            // CASE expression instead of MySQL-only FIELD(): portable across
            // MySQL and SQLite (test) drivers.
            ->orderByRaw("CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'suspended' THEN 2 ELSE 3 END")
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        $partners->getCollection()->transform(fn ($partner) => $this->presentAdminPartner($partner));

        return Inertia::render('partner/admin', [
            'partners' => $partners,
        ]);
    }

    /**
     * Present a partner row for the admin list.
     */
    private function presentAdminPartner(Partner $partner): array
    {
        return array_merge($this->presentPartner($partner), [
            'user' => $partner->user ? [
                'id' => $partner->user->id,
                'name' => $partner->user->name,
                'email' => $partner->user->email,
            ] : null,
            'stores_count' => $partner->stores_count,
            'notes' => $partner->notes,
        ]);
    }

    /**
     * Approve a pending partner.
     */
    public function approve(Partner $partner)
    {
        if ($partner->status !== Partner::STATUS_PENDING) {
            return back()->withErrors(['error' => __('Only pending applications can be approved.')]);
        }

        $partner->status = Partner::STATUS_APPROVED;
        $partner->approved_at = now();
        $partner->rejected_at = null;
        $partner->suspended_at = null;
        $partner->save();

        return back()->with('success', __('Partner approved.'));
    }

    /**
     * Reject a pending partner.
     */
    public function reject(Partner $partner, Request $request)
    {
        if (in_array($partner->status, [Partner::STATUS_APPROVED, Partner::STATUS_SUSPENDED], true)) {
            return back()->withErrors(['error' => __('Only pending applications can be rejected.')]);
        }

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $partner->status = Partner::STATUS_REJECTED;
        $partner->rejected_at = now();
        $partner->approved_at = null;
        $partner->suspended_at = null;
        $partner->notes = $validated['notes'] ?? null;
        $partner->save();

        return back()->with('success', __('Partner application rejected.'));
    }

    /**
     * Suspend an approved partner. Suspension freezes the partner dashboard;
     * existing store attribution is preserved but no new referral can happen
     * while suspended (registration only honors approved partners).
     */
    public function suspend(Partner $partner, Request $request)
    {
        if ($partner->status !== Partner::STATUS_APPROVED) {
            return back()->withErrors(['error' => __('Only approved partners can be suspended.')]);
        }

        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $partner->status = Partner::STATUS_SUSPENDED;
        $partner->suspended_at = now();
        $partner->notes = $validated['notes'] ?? $partner->notes;
        $partner->save();

        return back()->with('success', __('Partner suspended.'));
    }

    /**
     * Reinstate a suspended partner.
     */
    public function reinstate(Partner $partner)
    {
        if ($partner->status !== Partner::STATUS_SUSPENDED) {
            return back()->withErrors(['error' => __('Only suspended partners can be reinstated.')]);
        }

        $partner->status = Partner::STATUS_APPROVED;
        $partner->suspended_at = null;
        $partner->save();

        return back()->with('success', __('Partner reinstated.'));
    }
}