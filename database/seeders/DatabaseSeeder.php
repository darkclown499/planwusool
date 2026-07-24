<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (config('app.is_demo')) {
            // Demo mode: Run all seeders for full demo data
            $this->call([
                PermissionSeeder::class,
                RoleSeeder::class,
                PlanSeeder::class,
                UserSeeder::class,
                AdditionalUserSeeder::class,
                StoreSeeder::class,
                TaxSeeder::class,
                
                CategorySeeder::class,
                ProductSeeder::class,
                
                CustomerSeeder::class,
                ShippingSeeder::class,
                CouponSeeder::class,
                StoreCouponSeeder::class,
                LocationSeeder::class,
                ExpressCheckoutSeeder::class,
                PlanOrderSeeder::class,
                PlanRequestSeeder::class,
                CurrencySeeder::class,

                OrderSeeder::class,
                
                ReferralSettingSeeder::class,
                SeoSettingsSeeder::class,
                CompanyStoreSettingsSeeder::class,
                MessagingSettingsSeeder::class,
                EmailTemplateSeeder::class,
                NotificationTemplatesSeeder::class,
                CustomPageSeeder::class,
                LandingPageDataSeeder::class
            ]);
        } else {
            // Main version: Run only essential seeders with minimal data
            $this->call([
                PermissionSeeder::class,
                RoleSeeder::class,
                PlanSeeder::class,
                UserSeeder::class,
                StoreSeeder::class,
                TaxSeeder::class,
                
                CategorySeeder::class,
                ProductSeeder::class,
                
                ShippingSeeder::class,
                LocationSeeder::class,
                CurrencySeeder::class,
                
                ReferralSettingSeeder::class,
                SeoSettingsSeeder::class,
                CompanyStoreSettingsSeeder::class,
                MessagingSettingsSeeder::class,
                EmailTemplateSeeder::class,
                NotificationTemplatesSeeder::class,
            ]);
        }
    }
}