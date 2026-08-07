<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Enable the Themes and FAQ sections on existing landing page settings rows,
     * and place them in the default section order (themes after features, faq after plans).
     */
    public function up(): void
    {
        $rows = DB::table('landing_page_settings')->get();

        foreach ($rows as $row) {
            $config = json_decode($row->config_sections, true);
            if (! is_array($config)) {
                continue;
            }

            $changed = false;

            $visibility = $config['section_visibility'] ?? [];
            if (($visibility['themes'] ?? false) !== true) {
                $visibility['themes'] = true;
                $changed = true;
            }
            if (($visibility['faq'] ?? false) !== true) {
                $visibility['faq'] = true;
                $changed = true;
            }
            $config['section_visibility'] = $visibility;

            $order = $config['section_order'] ?? [];
            if (! in_array('themes', $order, true)) {
                $order = $this->insertAfter($order, 'features', 'themes');
                $changed = true;
            }
            if (! in_array('faq', $order, true)) {
                $order = $this->insertAfter($order, 'plans', 'faq');
                $changed = true;
            }
            $config['section_order'] = $order;

            if ($changed) {
                DB::table('landing_page_settings')->where('id', $row->id)->update([
                    'config_sections' => json_encode($config, JSON_UNESCAPED_UNICODE),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        $rows = DB::table('landing_page_settings')->get();

        foreach ($rows as $row) {
            $config = json_decode($row->config_sections, true);
            if (! is_array($config)) {
                continue;
            }

            $visibility = $config['section_visibility'] ?? [];
            unset($visibility['themes'], $visibility['faq']);
            $config['section_visibility'] = $visibility;

            $order = $config['section_order'] ?? [];
            $config['section_order'] = array_values(array_filter($order, fn ($key) => ! in_array($key, ['themes', 'faq'], true)));

            DB::table('landing_page_settings')->where('id', $row->id)->update([
                'config_sections' => json_encode($config, JSON_UNESCAPED_UNICODE),
                'updated_at' => now(),
            ]);
        }
    }

    private function insertAfter(array $order, string $after, string $key): array
    {
        $out = [];
        foreach ($order as $item) {
            $out[] = $item;
            if ($item === $after) {
                $out[] = $key;
            }
        }
        return $out;
    }
};
