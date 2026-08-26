<?php

namespace App\Http\Controllers;

use App\Models\LoyaltySetting;
use App\Models\LoyaltyTransaction;
use App\Services\LoyaltyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class LoyaltyController extends Controller
{
    protected $loyaltyService;

    public function __construct(LoyaltyService $loyaltyService)
    {
        $this->loyaltyService = $loyaltyService;
    }

    /**
     * Display the loyalty settings page.
     */
    public function settings()
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $settings = $currentStoreId ? LoyaltySetting::forStore($currentStoreId) : new LoyaltySetting();

        $currencySymbol = '₪';
        if ($currentStoreId) {
            try {
                $currencySettings = app(\App\Services\Currency\CurrencyService::class)
                    ->getCurrencySettings($user->id, $currentStoreId);
                $currency = \App\Models\Currency::where('code', $currencySettings['defaultCurrency'] ?? 'ILS')->first();
                $currencySymbol = $currency ? $currency->symbol : '₪';
            } catch (\Throwable $e) {
                $currencySymbol = '₪';
            }
        }

        return Inertia::render('loyalty/settings', [
            'settings' => $settings,
            'currency_symbol' => $currencySymbol,
        ]);
    }

    /**
     * Update loyalty settings.
     */
    public function updateSettings(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $request->validate([
            'is_enabled' => 'boolean',
            'points_per_currency' => 'required|numeric|min:0|max:999999.99',
            'points_value' => 'required|numeric|min:0|max:999999.9999',
            'minimum_redemption_points' => 'required|numeric|min:0|max:999999.99',
            'maximum_discount_percentage' => 'required|numeric|min:0|max:100',
            'signup_bonus_points' => 'required|numeric|min:0|max:999999.99',
            'review_bonus_points' => 'required|numeric|min:0|max:999999.99',
            'points_expire' => 'boolean',
            'expiry_days' => 'required_if:points_expire,true|integer|min:1|max:3650',
            'expiry_reminder_days' => 'required_if:points_expire,true|integer|min:0|max:365',
        ]);

        $settings = LoyaltySetting::updateOrCreate(
            ['store_id' => $currentStoreId],
            [
                'is_enabled' => $request->boolean('is_enabled', false),
                'points_per_currency' => $request->points_per_currency,
                'points_value' => $request->points_value,
                'minimum_redemption_points' => $request->minimum_redemption_points,
                'maximum_discount_percentage' => $request->maximum_discount_percentage,
                'signup_bonus_points' => $request->signup_bonus_points,
                'review_bonus_points' => $request->review_bonus_points,
                'points_expire' => $request->boolean('points_expire', false),
                'expiry_days' => $request->points_expire ? $request->expiry_days : 90,
                'expiry_reminder_days' => $request->points_expire ? $request->expiry_reminder_days : 7,
            ]
        );

        return redirect()->back()->with('success', __('Loyalty settings updated successfully!'));
    }

    /**
     * Display the loyalty transactions history.
     */
    public function transactions(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $query = LoyaltyTransaction::where('store_id', $currentStoreId)
            ->with('customer:id,first_name,last_name,email');

        // Apply filters
        if ($request->has('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->whereHas('customer', function ($cq) use ($search) {
                    $cq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })->orWhere('description', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 15);
        $transactions = $query->latest()->paginate($perPage);

        // Get statistics
        $totalPointsEarned = LoyaltyTransaction::where('store_id', $currentStoreId)
            ->where('points', '>', 0)
            ->sum('points');

        $totalPointsRedeemed = LoyaltyTransaction::where('store_id', $currentStoreId)
            ->where('points', '<', 0)
            ->sum('points');

        $totalCustomers = LoyaltyTransaction::where('store_id', $currentStoreId)
            ->distinct('customer_id')
            ->count('customer_id');

        return Inertia::render('loyalty/transactions', [
            'transactions' => $transactions,
            'filters' => $request->only(['search', 'type', 'per_page']),
            'stats' => [
                'total_points_earned' => abs($totalPointsEarned),
                'total_points_redeemed' => abs($totalPointsRedeemed),
                'total_customers' => $totalCustomers,
            ],
        ]);
    }

    /**
     * API: Get customer points balance (storefront).
     */
    public function getBalance(Request $request)
    {
        $customerId = Auth::guard('customer')->id();
        $storeId = $request->store_id;

        if (!$customerId || !$storeId) {
            return response()->json(['success' => false, 'message' => 'Authentication required'], 401);
        }
        $customer = Auth::guard('customer')->user();
        // Cross-store guard: customer must belong to requested store
        if ($customer && (int)$customer->store_id !== (int)$storeId) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }
        $enforcedAt = \App\Services\CustomerEmailOtpService::ENFORCED_AT;
        if ($customer && is_null($customer->email_verified_at) && $customer->created_at && $customer->created_at->gte(\Carbon\Carbon::parse($enforcedAt))) {
            return response()->json(['success' => false, 'message' => 'يجب تأكيد البريد الإلكتروني أولاً'], 403);
        }

        $balance = $this->loyaltyService->getBalance($storeId, $customerId);
        $settings = LoyaltySetting::forStore($storeId);

        return response()->json([
            'success' => true,
            'balance' => $balance,
            'settings' => [
                'points_per_currency' => $settings->points_per_currency,
                'points_value' => $settings->points_value,
                'minimum_redemption_points' => $settings->minimum_redemption_points,
                'maximum_discount_percentage' => $settings->maximum_discount_percentage,
                'is_enabled' => $settings->is_enabled,
            ],
        ]);
    }

    /**
     * API: Public loyalty settings (storefront, no auth required).
     */
    public function settingsApi(Request $request)
    {
        $storeId = $request->query('store_id') ?? $request->input('store_id');
        if (!$storeId) {
            $storeSlug = $request->attributes->get('resolved_store')['id'] ?? null;
            $storeId = $storeSlug;
        }
        if (!$storeId) {
            $storeSlug = $request->header('X-Store-Id') ?? $request->query('store_id');
            if (!$storeSlug) {
                return response()->json(['success' => false, 'message' => 'store_id required'], 422);
            }
            $storeId = $storeSlug;
        }
        $settings = LoyaltySetting::forStore((int) $storeId);
        return response()->json([
            'success' => true,
            'settings' => [
                'points_per_currency' => $settings->points_per_currency,
                'points_value' => $settings->points_value,
                'minimum_redemption_points' => $settings->minimum_redemption_points,
                'maximum_discount_percentage' => $settings->maximum_discount_percentage,
                'is_enabled' => $settings->is_enabled,
            ],
        ]);
    }

    /**
     * API: Get customer points history (storefront).
     */
    public function history(Request $request)
    {
        $customerId = Auth::guard('customer')->id();
        $storeId = $request->store_id;

        if (!$customerId || !$storeId) {
            return response()->json(['success' => false, 'message' => 'Authentication required'], 401);
        }
        $customer = Auth::guard('customer')->user();
        if ($customer && (int)$customer->store_id !== (int)$storeId) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }
        $enforcedAt = \App\Services\CustomerEmailOtpService::ENFORCED_AT;
        if ($customer && is_null($customer->email_verified_at) && $customer->created_at && $customer->created_at->gte(\Carbon\Carbon::parse($enforcedAt))) {
            return response()->json(['success' => false, 'message' => 'يجب تأكيد البريد الإلكتروني أولاً'], 403);
        }

        $history = $this->loyaltyService->getHistory($storeId, $customerId, $request->get('limit', 50));

        return response()->json([
            'success' => true,
            'history' => $history,
        ]);
    }
}
