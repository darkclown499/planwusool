<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IsraelGeographySeeder extends Seeder
{
    public function run(): void
    {
        $existing = DB::table('countries')->where('code', 'ISR')->first();
        $countryId = $existing
            ? $existing->id
            : DB::table('countries')->insertGetId([
                'name'       => 'إسرائيل',
                'code'       => 'ISR',
                'status'     => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

        $districts = [
            ['name' => 'لواء تل أبيب',       'code' => 'TLV'],
            ['name' => 'لواء حيفا',           'code' => 'HFA'],
            ['name' => 'اللواء الأوسط',       'code' => 'MCD'],
            ['name' => 'اللواء الشمالي',      'code' => 'NEN'],
            ['name' => 'اللواء الجنوبي',      'code' => 'SDN'],
            ['name' => 'لواء القدس',          'code' => 'JMS'],
            ['name' => 'لواء ريشون لتسيون',   'code' => 'RSG'],
        ];

        $districtIds = [];
        foreach ($districts as $district) {
            $existing = DB::table('states')
                ->where('country_id', $countryId)
                ->where('code', $district['code'])
                ->first();

            $districtIds[$district['code']] = $existing
                ? $existing->id
                : DB::table('states')->insertGetId([
                    'country_id' => $countryId,
                    'name'       => $district['name'],
                    'code'       => $district['code'],
                    'status'     => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
        }

        $cities = [
            'TLV' => [
                'تل أبيب', 'بات يام', 'هرتسليا', 'رامات هاشارون',
                'غفعاتاييم', 'كفار عصا',
            ],
            'HFA' => [
                'حيفا', 'كرميئيل', 'عتليت', 'أبو سنان',
                'طيرة الكرمل', 'الخضيرة',
            ],
            'MCD' => [
                'لود', 'رعنانة', 'بيت شيمش', 'المجدل',
            ],
            'NEN' => [
                'نتانيا', 'كريات أتا', 'عمك افا',
                'حيفا الجديدة', 'عنوتا',
            ],
            'SDN' => [
                'أشدود', 'بئر السبع', 'عراد', 'سديروت',
                'نتيفوت', 'متسبي رامون', 'عسقلان',
            ],
            'JMS' => [
                'القدس', 'بيت حنينا', 'معاليه أدوخيم',
            ],
            'RSG' => [
                'ريشون لتسيون', 'بيت داغان', 'نيس زيونا',
            ],
        ];

        foreach ($cities as $districtCode => $cityNames) {
            $districtId = $districtIds[$districtCode] ?? null;
            if (!$districtId) continue;

            foreach ($cityNames as $cityName) {
                $exists = DB::table('cities')
                    ->where('state_id', $districtId)
                    ->where('name', $cityName)
                    ->exists();

                if (!$exists) {
                    DB::table('cities')->insert([
                        'state_id'   => $districtId,
                        'name'       => $cityName,
                        'status'     => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        $this->command->info('✓ Israel geography seeded successfully.');
        $this->command->info('  Country: Israel (ISR)');
        $this->command->info('  Districts: ' . count($districts));
        $this->command->info('  Cities: ' . DB::table('cities')->whereIn('state_id', array_values($districtIds))->count());
    }
}
