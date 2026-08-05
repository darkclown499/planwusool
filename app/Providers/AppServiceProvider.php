<?php

namespace App\Providers;

use App\Models\User;
use App\Models\Plan;
use App\Observers\UserObserver;
use App\Observers\PlanObserver;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(\App\Services\WebhookService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Register the UserObserver
        User::observe(UserObserver::class);
        
        // Register the PlanObserver
        Plan::observe(PlanObserver::class);

        // Super admin bypass: grant super admin access to every permission/gate.
        // This prevents "403 User does not have the right permissions" for super
        // admin even when a permission row is missing or role assignment is stale.
        Gate::before(function ($user, $ability) {
            if ($user instanceof User && $user->isSuperAdmin()) {
                return true;
            }
        });
        


        // Configure dynamic storage disks
        try {
            \App\Services\DynamicStorageService::configureDynamicDisks();
        } catch (\Exception $e) {
            // Silently fail during migrations or when database is not ready
        }
    }
}