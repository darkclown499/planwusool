<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Replace the fictional hero numbers on existing landing page settings rows
     * with launch value propositions (speed/readiness copy):
     *   announcement_text -> "انضم الآن واستفد من التجربة المجانية"
     *   stats             -> جاهز في دقائق / أدوات تسويق مدمجة / تحديثات مستمرة
     */
    public function up(): void
    {
        $this->updateHero(
            'انضم الآن واستفد من التجربة المجانية',
            [
                ['value' => 'جاهز في دقائق', 'label' => 'أنشئ متجرك دون تعقيد'],
                ['value' => 'أدوات تسويق مدمجة', 'label' => 'حملات وعروض بلمسة واحدة'],
                ['value' => 'تحديثات مستمرة', 'label' => 'المنصة تتطور مع متجرك'],
            ]
        );
    }

    public function down(): void
    {
        $this->updateHero(
            'موثوق من أكثر من ١٠,٠٠٠ متجر حول العالم',
            [
                ['value' => '+١٠,٠٠٠', 'label' => 'متجر'],
                ['value' => '+٥٠٠,٠٠٠', 'label' => 'منتج'],
                ['value' => '٩٩.٩٪', 'label' => 'وقت تشغيل'],
            ]
        );
    }

    private function updateHero(string $announcementText, array $stats): void
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
                $config['sections'][$i]['announcement_text'] = $announcementText;
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
