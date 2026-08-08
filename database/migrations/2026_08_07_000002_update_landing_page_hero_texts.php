<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Update the hero section on existing landing page settings rows:
     * title   -> "ابدأ متجرك مع وصول خلال دقائق"
     * stats   -> +١٠,٠٠٠ متجر / +٥٠٠,٠٠٠ منتج / ٩٩.٩٪ وقت تشغيل
     */
    public function up(): void
    {
        $this->updateHero(
            'ابدأ متجرك مع وصول خلال دقائق',
            [
                ['value' => '+١٠,٠٠٠', 'label' => 'متجر'],
                ['value' => '+٥٠٠,٠٠٠', 'label' => 'منتج'],
                ['value' => '٩٩.٩٪', 'label' => 'وقت تشغيل'],
            ]
        );
    }

    public function down(): void
    {
        $this->updateHero(
            'وصول',
            [
                ['value' => '١٠ آلاف+', 'label' => 'متجر'],
                ['value' => '+٥٠', 'label' => 'دولة'],
                ['value' => '٩٩.٩٪', 'label' => 'وقت تشغيل'],
            ]
        );
    }

    private function updateHero(string $title, array $stats): void
    {
        $rows = DB::table('landing_page_settings')->get();

        foreach ($rows as $row) {
            $config = json_decode($row->config_sections, true);
            if (! is_array($config)) {
                continue;
            }

            $changed = false;
            foreach (($config['sections'] ?? []) as $i => $section) {
                if (($section['key'] ?? '') !== 'hero') {
                    continue;
                }
                if (($config['sections'][$i]['title'] ?? '') !== $title) {
                    $config['sections'][$i]['title'] = $title;
                    $changed = true;
                }
                $config['sections'][$i]['stats'] = $stats;
                $changed = true;
            }

            if ($changed) {
                DB::table('landing_page_settings')->where('id', $row->id)->update([
                    'config_sections' => json_encode($config, JSON_UNESCAPED_UNICODE),
                    'updated_at' => now(),
                ]);
            }
        }
    }
};
