<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * 29-template catalog, distributed across the three plan tiers.
     *
     *   Free        (7):  core-minimal … core-showcase  — one core design
     *                      system, seven variations. Switchable by every plan.
     *   Growth     (14):  + 7 "ready-made" premium layouts.
     *   Professional (29): all templates.
     */
    public function up(): void
    {
        $free = [
            'core-minimal', 'core-bold', 'core-sidebar', 'core-dark',
            'core-bazaar', 'core-elegant', 'core-showcase',
        ];

        $growth = array_merge($free, [
            'growth-electronics', 'growth-fashion', 'growth-food',
            'growth-cosmetics', 'growth-supermarket', 'growth-home-decor',
            'growth-pharmacy',
        ]);

        $professional = array_merge($growth, [
            'pro-tech', 'pro-beauty', 'pro-books', 'pro-sport', 'pro-pets',
            'pro-flowers', 'pro-coffee', 'pro-stationery', 'pro-spices',
            'pro-clothing', 'pro-fragrances', 'pro-home-tools', 'pro-kids',
            'pro-sports', 'pro-boutique',
        ]);

        DB::table('plans')->get()->each(function ($plan) use ($free, $growth, $professional) {
            $tier = $plan->is_default ?? false ? 'free' : (($plan->is_recommended ?? false) ? 'growth' : 'pro');
            $list = match ($plan->name ?? null) {
                'Growth'    => $growth,
                'Professional' => $professional,
                default     => $tier === 'pro' ? $professional : ($tier === 'growth' ? $growth : $free),
            };

            DB::table('plans')->where('id', $plan->id)->update([
                'themes' => json_encode($list),
            ]);
        });
    }

    public function down(): void
    {
        // Not reversible by design.
    }
};