<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Convert the default brand/SEO settings stored in the database to Arabic.
     * Fixes English text (footer, meta description, meta keywords) that was
     * inserted by the original seeders/defaults on an Arabic-first site.
     */
    public function up(): void
    {
        $localized = [
            'footerText' => '© 2026 وصول. جميع الحقوق محفوظة.',
            'metaDescription' => 'وصول - منصة قوية لإنشاء وإدارة متاجر إلكترونية متعددة مع قوالب احترافية وميزات تجارة إلكترونية متكاملة.',
            'metaKeywords' => 'متجر الكتروني, متجر على واتساب, منصة متاجر, تجارة الكترونية, متجر متعدد, وصول',
        ];

        foreach ($localized as $key => $arabicValue) {
            DB::table('settings')
                ->where('key', $key)
                ->where(function ($query) use ($arabicValue) {
                    // Only overwrite non-empty English values; never clobber an
                    // existing Arabic value the admin has already customized.
                    $query->whereNull('value')
                        ->orWhere('value', '')
                        ->orWhere('value', 'LIKE', '©%')
                        ->orWhere('value', 'LIKE', '%rights reserved%')
                        ->orWhere('value', 'LIKE', '%powerful SaaS platform%')
                        ->orWhere('value', 'LIKE', 'ecommerce, online store%');
                })
                ->update(['value' => $arabicValue, 'updated_at' => now()]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Nothing to restore — original seeded values are non-recoverable here.
    }
};
