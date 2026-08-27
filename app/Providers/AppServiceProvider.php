<?php

namespace App\Providers;

use App\Models\User;
use App\Models\Plan;
use App\Observers\UserObserver;
use App\Observers\PlanObserver;
use App\Social\AppleProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;
use Laravel\Socialite\Facades\Socialite;

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
        // Force all generated URLs, asset paths and API calls to use HTTPS
        // in production so the browser never blocks resources as Mixed Content.
        if (config('app.env') === 'production' || env('APP_ENV') === 'production') {
            URL::forceScheme('https');
        }

        // Ensure the public/storage symlink exists (equivalent to `storage:link`).
        // On shared hosts / new deployments the link is often missing or broken,
        // which makes uploaded images 404 in the browser.
        if (! File::exists(public_path('storage'))) {
            if (is_link(public_path('storage')) || is_dir(public_path('storage'))) {
                @unlink(public_path('storage'));
            }
            try {
                \Illuminate\Support\Facades\Artisan::call('storage:link');
            } catch (\Exception $e) {
                // Silently ignore if the link cannot be created (e.g. no permissions).
            }
        }

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

        // Register the Apple Sign In driver (not bundled with laravel/socialite).
        Socialite::extend('apple', function ($app) {
            $config = $app['config']['services.apple'];

            return (new AppleProvider(
                $app['request'],
                $config['client_id'],
                $config['client_secret'],
                $config['redirect']
            ))->configure($config['team_id'], $config['key_id'], $config['private_key']);
        });

        // P0 Abuse hardening ΓÇö store-scoped rate limiters (reuse Laravel limiter infra)
        RateLimiter::for('order-place', function (Request $request) {
            $storeId = $request->input('store_id') ?? $request->route('storeSlug') ?? 'global';
            $ip = $request->ip() ?? 'unknown';
            // Key includes store + IP so one attacker cannot DoS all stores via global bucket.
            // 5 orders/min per store per IP ΓÇö moderate for NAT, blocks COD flooding.
            return Limit::perMinute(5)->by('order-place:' . $storeId . ':' . $ip)->response(function () {
                return response()->json(['success' => false, 'message' => 'Too many orders. Please try again later.', 'retry_after' => 60], 429);
            });
        });

        RateLimiter::for('coupon-validate', function (Request $request) {
            $storeId = $request->input('store_id') ?? $request->input('storeId') ?? 'global';
            $ip = $request->ip() ?? 'unknown';
            // 10 coupon validations/min per store per IP ΓÇö blocks brute force, one store abuse not blocking another.
            return Limit::perMinute(10)->by('coupon:' . $storeId . ':' . $ip)->response(function () {
                return response()->json(['valid' => false, 'message' => 'Too many coupon attempts. Please try again later.'], 429);
            });
        });

        RateLimiter::for('coupon-plan', function (Request $request) {
            $ip = $request->ip() ?? 'unknown';
            $userId = $request->user()?->id ?? $ip;
            return Limit::perMinute(10)->by('coupon-plan:' . $userId)->response(function () {
                return response()->json(['valid' => false, 'message' => 'Too many coupon attempts. Please try again later.'], 429);
            });
        });

        RateLimiter::for('password-reset', function (Request $request) {
            return Limit::perMinute(3)->by('pw-reset:' . ($request->ip() ?? 'unknown'))->response(function () {
                return response()->json(['message' => 'Too many requests. Please try again later.'], 429);
            });
        });
    }
}