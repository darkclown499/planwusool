<?php

namespace App\Observers;

use App\Models\User;
use App\Models\Plan;

class UserObserver
{
    /**
     * Handle the User "creating" event.
     */
    public function creating(User $user): void
    {
        // If user is company type and has no plan_id, assign default plan
        if ($user->type === 'company' && is_null($user->plan_id)) {
            $defaultPlan = Plan::getDefaultPlan();
            if ($defaultPlan) {
                $user->plan_id = $defaultPlan->id;
                $user->plan_is_active = 1;
            }
        }
    }
    
    /**
     * Handle the User "created" event.
     */
    public function created(User $user): void
    {
        // Generate a unique referral code if not already set
        if ($user->type === 'company' && empty($user->referral_code)) {
            do {
                $code = rand(100000, 999999);
            } while (User::where('referral_code', $code)->exists());
            
            $user->referral_code = $code;
            $user->save();
        }
        
        // Create default settings for new users
        if ($user->type === 'superadmin') {
            createDefaultSettings($user->id);
        } elseif ($user->type === 'company') {
            // Create default store if current_store is null and not during seeding
            if (is_null($user->current_store) && $user->email !== 'company@example.com' && !app()->runningInConsole()) {
                $store = \App\Models\Store::create([
                    'name' => $user->name,
                    'slug' => \App\Models\Store::generateUniqueSlug($user->name),
                    'theme' => 'basic',
                    'user_id' => $user->id,
                    'email' => $user->email,
                ]);
                
                $user->update(['current_store' => $store->id]);
            }

            copySettingsFromSuperAdmin($user->id, $user->current_store);
        }
    }
}