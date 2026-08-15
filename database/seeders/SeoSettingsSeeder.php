<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Setting;
use Illuminate\Database\Seeder;

class SeoSettingsSeeder extends Seeder
{
    public function run(): void
    {
        // Check if SEO settings already exist
        if (Setting::where('key', 'metaKeywords')->exists()) {
            $this->command->info('SEO settings already exist. Skipping seeder to preserve existing data.');
            return;
        }

        $seoDefaults = $this->getSeoSettings();

        // Add SEO settings to superadmin
        $superAdmin = User::where('type', 'superadmin')->first();
        if ($superAdmin) {
            foreach ($seoDefaults as $key => $value) {
                Setting::updateOrCreate(
                    ['user_id' => $superAdmin->id, 'key' => $key, 'store_id' => null],
                    ['value' => $value]
                );
            }
        }

        // Update company users mode field to 'light'
        $companyUsers = User::where('type', 'company')->get();
        foreach ($companyUsers as $user) {
            $user->update(['mode' => 'light']);
        }

        $version = config('app.is_demo') ? 'demo' : 'main';
        $this->command->info("Created SEO settings for {$version} version.");
    }

    private function getSeoSettings(): array
    {
        return [
            'metaKeywords' => 'متجر الكتروني, متجر على واتساب, منصة متاجر, تجارة الكترونية, متجر متعدد, وصول',
            'metaDescription' => 'وصول - منصة قوية لإنشاء وإدارة متاجر إلكترونية متعددة مع قوالب احترافية وميزات تجارة إلكترونية متكاملة.',
            'metaImage' => '/images/logos/wusool.png',
            'titleText' => 'Wusool',
            'timeFormat' => 'H:i',
            'dateFormat' => 'Y-m-d',
            'defaultTimezone' => 'UTC',
        ];
    }
}