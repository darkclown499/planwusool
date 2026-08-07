<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Update the themes section CTA texts on existing landing page settings rows:
     * cta_title -> "ابدأ معنا لتكتشف العديد من القوالب الأخرى"
     * secondary_button_text -> "عرض جميع القوالب"
     */
    public function up(): void
    {
        $this->updateThemesSection(
            'ابدأ معنا لتكتشف العديد من القوالب الأخرى',
            'عرض جميع القوالب'
        );
    }

    public function down(): void
    {
        $this->updateThemesSection('جاهز لبدء متجرك؟', 'عرض جميع الميزات');
    }

    private function updateThemesSection(string $ctaTitle, string $secondaryButtonText): void
    {
        $rows = DB::table('landing_page_settings')->get();

        foreach ($rows as $row) {
            $config = json_decode($row->config_sections, true);
            if (! is_array($config)) {
                continue;
            }

            $changed = false;
            foreach (($config['sections'] ?? []) as $i => $section) {
                if (($section['key'] ?? '') !== 'themes') {
                    continue;
                }
                if (($config['sections'][$i]['cta_title'] ?? '') !== $ctaTitle) {
                    $config['sections'][$i]['cta_title'] = $ctaTitle;
                    $changed = true;
                }
                if (($config['sections'][$i]['secondary_button_text'] ?? '') !== $secondaryButtonText) {
                    $config['sections'][$i]['secondary_button_text'] = $secondaryButtonText;
                    $changed = true;
                }
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
