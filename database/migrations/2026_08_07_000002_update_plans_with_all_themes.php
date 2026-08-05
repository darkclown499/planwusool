<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Update all plans to include the full list of available store themes
     * so every template is shown regardless of the stored plan settings.
     */
    public function up(): void
    {
        $allThemes = [
            'gadgets', 'fashion', 'home-decor', 'bakery', 'supermarket', 'car-accessories',
            'toy', 'perfumes', 'jewelry', 'beauty', 'pharmacy', 'books', 'sport', 'pets',
            'flowers', 'coffee', 'stationery', 'spices', 'clothing', 'electronics',
            'cosmetics', 'food', 'fragrances', 'home-tools', 'coffee-dates',
            'jewelry-gold', 'kids', 'sports', 'stationery-books',
        ];

        DB::table('plans')->get()->each(function ($plan) use ($allThemes) {
            DB::table('plans')->where('id', $plan->id)->update([
                'themes' => json_encode($allThemes),
            ]);
        });
    }

    public function down(): void
    {
        // Nothing to roll back
    }
};
