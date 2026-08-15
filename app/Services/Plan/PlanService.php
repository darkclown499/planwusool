<?php

namespace App\Services\Plan;

use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\User;
use App\Services\Plan\Pricing\PlanPricingService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PlanService
{
    public function __construct(
        protected PlanPricingService $pricingService
    ) {}

    /**
     * Assign plan to user with all side effects
     */
    public function assignToUser(User $user, Plan $plan, string $billingCycle): bool
    {
        $expiresAt = $billingCycle === 'yearly' ? now()->addYear() : now()->addMonth();

        $oldPlan = $user->plan;

        try {
            DB::beginTransaction();

            $updated = $user->update([
                'plan_id' => $plan->id,
                'plan_duration' => $billingCycle,
                'plan_expire_date' => $expiresAt,
                'plan_is_active' => 1,
                'is_trial' => 0,
                'trial_expire_date' => null,
            ]);

            if ($updated) {
                $user = $user->fresh();

                // Create referral record if user was referred
                if (class_exists('\App\Http\Controllers\ReferralController')) {
                    \App\Http\Controllers\ReferralController::createReferralRecord($user, $billingCycle);
                }

                // If upgrading (higher limits), reactivate resources first
                if ($oldPlan && $this->isPlanUpgrade($oldPlan, $plan)) {
                    $this->reactivateResources($user);
                }

                // Then enforce current plan limitations
                $this->enforcePlanLimitations($user);
            }

            DB::commit();
            return $updated;

        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Plan assignment failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Check if new plan is an upgrade from old plan
     */
    public function isPlanUpgrade(Plan $oldPlan, Plan $newPlan): bool
    {
        if (!$oldPlan || !$newPlan) {
            return false;
        }

        return (
            ($newPlan->max_stores ?? 0) > ($oldPlan->max_stores ?? 0) ||
            ($newPlan->max_users_per_store ?? 0) > ($oldPlan->max_users_per_store ?? 0) ||
            ($newPlan->max_products_per_store ?? 0) > ($oldPlan->max_products_per_store ?? 0)
        );
    }

    /**
     * Reactivate resources when plan is upgraded
     */
    public function reactivateResources(User $user): void
    {
        if (!$user->plan) {
            return;
        }

        $plan = $user->plan;
        $maxStores = $plan->max_stores ?? 0;
        $maxUsersPerStore = $plan->max_users_per_store ?? 0;
        $maxProductsPerStore = $plan->max_products_per_store ?? 0;

        // Reactivate stores within new limit
        $allStores = $user->stores()->orderBy('created_at', 'asc')->take($maxStores)->get();
        foreach ($allStores as $store) {
            \App\Models\StoreConfiguration::updateOrCreate(
                ['store_id' => $store->id, 'key' => 'store_status'],
                ['value' => 'true']
            );
        }

        // Reactivate users within new limit for each active store
        foreach ($user->stores as $store) {
            $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
            if (!($config['store_status'] ?? true)) continue;

            $deactivatedUsers = \App\Models\User::where('current_store', $store->id)
                ->where('type', '!=', 'company')
                ->where('status', 'inactive')
                ->orderBy('created_at', 'asc')
                ->limit($maxUsersPerStore)
                ->get();

            foreach ($deactivatedUsers as $storeUser) {
                $storeUser->update(['status' => 'active']);
            }
        }

        // Reactivate products within new limit for each active store
        if ($maxProductsPerStore > 0) {
            foreach ($user->stores as $store) {
                $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
                if (!($config['store_status'] ?? true)) continue;

                $deactivatedProducts = \App\Models\Product::where('store_id', $store->id)
                    ->where('is_active', false)
                    ->orderBy('created_at', 'asc')
                    ->limit($maxProductsPerStore)
                    ->get();

                foreach ($deactivatedProducts as $product) {
                    $product->update(['is_active' => true]);
                }
            }
        }
    }

    /**
     * Enforce plan limitations when plan changes
     */
    public function enforcePlanLimitations(User $user): void
    {
        if (!$user->plan) {
            return;
        }

        $plan = $user->plan;
        $maxStores = $plan->max_stores ?? 0;
        $maxUsersPerStore = $plan->max_users_per_store ?? 0;
        $maxProductsPerStore = $plan->max_products_per_store ?? 0;

        // Enforce store limitations
        $stores = $user->stores()->orderBy('created_at', 'asc')->get();
        $activeCount = 0;
        foreach ($stores as $store) {
            $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
            if ($config['store_status'] ?? true) {
                $activeCount++;
                if ($activeCount > $maxStores) {
                    \App\Models\StoreConfiguration::updateOrCreate(
                        ['store_id' => $store->id, 'key' => 'store_status'],
                        ['value' => 'false']
                    );
                }
            }
        }

        // Enforce user limitations per store (only for active stores)
        foreach ($user->stores as $store) {
            $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
            if (!($config['store_status'] ?? true)) continue;

            $storeUsers = \App\Models\User::where('current_store', $store->id)
                ->where('type', '!=', 'company')
                ->where('status', 'active')
                ->orderBy('created_at', 'desc')
                ->get();

            if ($storeUsers->count() > $maxUsersPerStore) {
                $usersToDeactivate = $storeUsers->skip($maxUsersPerStore);
                foreach ($usersToDeactivate as $storeUser) {
                    $storeUser->update(['status' => 'inactive']);
                }
            }
        }

        // Enforce product limitations per store (only for active stores)
        if ($maxProductsPerStore > 0) {
            foreach ($user->stores as $store) {
                $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
                if (!($config['store_status'] ?? true)) continue;

                $products = \App\Models\Product::where('store_id', $store->id)
                    ->where('is_active', true)
                    ->orderBy('created_at', 'desc')
                    ->get();

                if ($products->count() > $maxProductsPerStore) {
                    $productsToDeactivate = $products->skip($maxProductsPerStore);
                    foreach ($productsToDeactivate as $product) {
                        $product->update(['is_active' => false]);
                    }
                }
            }
        }

        // Enforce theme limitations: downgrade any store whose theme is no
        // longer available to the plan back to the default "basic" theme.
        $availableThemes = $user->getAvailableThemes();
        if (is_array($availableThemes) && count($availableThemes) > 0) {
            $user->stores()
                ->whereNotIn('theme', $availableThemes)
                ->update(['theme' => 'basic']);
        }
    }

    /**
     * Check if new plan is an upgrade from old plan
     */
    public function isPlanUpgrade($oldPlan, $newPlan): bool
    {
        if (!$oldPlan || !$newPlan) {
            return false;
        }

        return (
            ($newPlan->max_stores ?? 0) > ($oldPlan->max_stores ?? 0) ||
            ($newPlan->max_users_per_store ?? 0) > ($oldPlan->max_users_per_store ?? 0) ||
            ($newPlan->max_products_per_store ?? 0) > ($oldPlan->max_products_per_store ?? 0)
        );
    }
}