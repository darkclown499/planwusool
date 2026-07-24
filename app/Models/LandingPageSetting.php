<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LandingPageSetting extends Model
{
    protected $fillable = [
        'company_name', 'contact_email', 'contact_phone', 'contact_address', 'config_sections',
    ];

    protected $attributes = [
        'company_name' => 'Wusool',
        'contact_email' => 'info@wusool.ps',
        'contact_phone' => '+970 59 123 4567',
        'contact_address' => 'وكالة بلانكتون، قلقيلية، فلسطين',
    ];

    protected $casts = [
        'config_sections' => 'array',
    ];

    public static function getSettings()
    {
        $settings = self::first();

        if (! $settings) {
            // Import default sections from the template file structure
            $defaultConfig = include database_path('seeders/landing_page_sections.php') ?? [];

            $settings = self::create([
                'config_sections' => $defaultConfig,
            ]);
        }

        return $settings;
    }
}
