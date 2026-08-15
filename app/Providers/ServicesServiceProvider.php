<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class ServicesServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Settings Service
        $this->app->singleton(\App\Services\Settings\SettingsService::class, function () {
            return new \App\Services\Settings\SettingsService();
        });

        // Payment Settings Service
        $this->app->singleton(\App\Services\Payment\PaymentSettingsService::class, function () {
            return new \App\Services\Payment\PaymentSettingsService();
        });

        // Currency Service
        $this->app->singleton(\App\Services\Currency\CurrencyService::class, function () {
            return new \App\Services\Currency\CurrencyService();
        });

        // Plan Pricing Service
        $this->app->singleton(\App\Services\Plan\Pricing\PlanPricingService::class, function () {
            return new \App\Services\Plan\Pricing\PlanPricingService();
        });

        // Plan Service
        $this->app->singleton(\App\Services\Plan\PlanService::class, function () {
            return new \App\Services\Plan\PlanService();
        });

        // Store Service
        $this->app->singleton(\App\Services\Store\StoreService::class, function () {
            return new \App\Services\Store\StoreService();
        }

        // Domain Service
        $this->app->singleton(\App\Services\Domain\DomainService::class, function () {
            return new \App\Services\Domain\DomainService();
        }

        // Utility Service
        $this->app->singleton(\App\Services\Utility\UtilityService::class, function () {
            return new \App\Services\Utility\UtilityService();
        }

        // PWA Service
        $this->app->singleton(\App\Services\PWA\PWAService::class, function () {
            return new \App\Services\PWA\PWAService();
        }

        // Sensitive Data Service
        $this->app->singleton(\App\Services\SensitiveData\SensitiveDataService::class, function () {
            return new \App\Services\SensitiveData\SensitiveDataService();
        }

        // Plan Pricing Service
        $this->app->singleton(\App\Services\Plan\Pricing\PlanPricingService::class, function () {
            return new \App\Services\Plan\Pricing\PlanPricingService();
        });
    }

    public function boot(): void
    {
        //
    }
}