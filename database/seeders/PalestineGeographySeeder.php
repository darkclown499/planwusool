<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PalestineGeographySeeder extends Seeder
{
    public function run(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS = 0');

        DB::table('cities')->truncate();
        DB::table('states')->truncate();
        DB::table('countries')->truncate();

        DB::statement('SET FOREIGN_KEY_CHECKS = 1');

        // ── Country: Palestine ──
        $countryId = DB::table('countries')->insertGetId([
            'name'       => 'فلسطين',
            'code'       => 'PSE',
            'status'     => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // ── Governorates (States) ──
        $governorates = [
            ['name' => 'القدس',             'code' => 'JEM'],
            ['name' => 'رام الله والبيرة',   'code' => 'RBH'],
            ['name' => 'الخليل',             'code' => 'HBN'],
            ['name' => 'نابلس',              'code' => 'NBS'],
            ['name' => 'جنين',               'code' => 'JEN'],
            ['name' => 'طولكرم',             'code' => 'TBS'],
            ['name' => 'قلقيلية',            'code' => 'QQA'],
            ['name' => 'سلفيت',             'code' => 'SLT'],
            ['name' => 'طوباس',             'code' => 'TBM'],
            ['name' => 'أريحا',             'code' => 'JRH'],
            ['name' => 'بيت لحم',           'code' => 'BTH'],
            ['name' => 'غزة',               'code' => 'GZA'],
            ['name' => 'خانيونس',           'code' => 'KYS'],
            ['name' => 'دير البلح',         'code' => 'DEB'],
            ['name' => 'رفح',               'code' => 'RFH'],
            ['name' => 'شمال غزة',          'code' => 'NGZ'],
        ];

        $stateIds = [];
        foreach ($governorates as $gov) {
            $stateIds[$gov['code']] = DB::table('states')->insertGetId([
                'country_id' => $countryId,
                'name'       => $gov['name'],
                'code'       => $gov['code'],
                'status'     => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // ── Cities & Towns ──
        // Format: state_code => [city names]
        $cities = [
            // القدس
            'JEM' => [
                'القدس', 'بيت ساحور', 'بيت جالا', 'العيزرية', 'أبو ديس', 'الرام', 'الإسكان',
            ],

            // رام الله والبيرة
            'RBH' => [
                'رام الله', 'البيرة', 'بيرزيت', 'بيت أمر', 'دير دودا', 'عين يبرود', 'سلواد',
                'كفر عين', 'المزرعة الشرقية', 'عتيل', 'كفر مالك', 'الجانية', 'نعلين', 'دير عمار',
            ],

            // الخليل
            'HBN' => [
                'الخليل', 'دورا', 'يطا', 'السموع', 'الظاهرية', 'بني نعيم', 'سعير',
                'حلحول', 'بننعما', 'شيوخ', 'اذنا', 'خاراس', 'ترقوميا', 'فلح القدس',
            ],

            // نابلس
            'NBS' => [
                'نابلس', 'حوارة', 'بلاطة', 'بديا', 'عصيرا', 'قوصورة', 'ياسيت',
                'رفيدا', 'عوريف', 'عقربا', 'بيت فوريك', 'صوفا', 'المخيم',
            ],

            // جنين
            'JEN' => [
                'جنين', 'سلّيم', 'القبيا', 'عرانة', 'الزبابدة', 'جملة', 'عبا',
                'سانور', 'فحمة', 'الملاحي', 'عرعرة', 'برقين', 'دير غسانه',
            ],

            // طولكرم
            'TBS' => [
                'طولكرم', 'عبلين', 'الزباباة', 'إنتابا', 'دير الغصون', 'عتيل',
                'شوفه', 'بلعا', 'المغير', 'علار', 'كفر جمال', 'الراس',
            ],

            // قلقيلية
            'QQA' => [
                'قلقيلية', 'عزون', 'حبلة', 'جيوس', 'كفر قدوم', 'الزبائد',
                'حجة', 'عقابا', 'كفر عبوش', 'مكمودة', 'الفندق',
            ],

            // سلفيت
            'SLT' => [
                'سلفيت', 'برقا', 'بروقين', 'قراوة بني زيد', 'دار إبراهيم',
                'ياسوف', 'علقم', 'سفسات', 'كفر سلط', 'ربيا',
            ],

            // طوباس
            'TBM' => [
                'طوباس', 'تلمسان', 'العقبة', 'خربة الفريش', 'فاكوس',
                'جمجم', 'المسكة', 'طمون', 'الناصرة',
            ],

            // أريحا
            'JRH' => [
                'أريحا', 'الأعجام', 'عين دفلا', 'نعيمة', 'العور',
                'البويب', 'عين السلوشة', 'مردفة',
            ],

            // بيت لحم
            'BTH' => [
                'بيت لحم', 'بيت ساحور', 'بيت جالا', 'النعمة', 'حوسان',
                'ارتاس', 'الدهيشة', 'الفارس', 'خضر', 'العبيدية',
            ],

            // غزة
            'GZA' => [
                'غزة', 'جباليا', 'الشجاعية', 'تفح', 'الزوايدة', 'الصفا',
                'النصر', 'تل الهوا', 'زيتون', 'الجليل',
            ],

            // خانيونس
            'KYS' => [
                'خانيونس', 'الفخارة', 'عبسان', 'بني سهيلة', 'دورة',
                'الزنة', 'أم ناصر', 'كلكول', 'التل',
            ],

            // دير البلح
            'DEB' => [
                'دير البلح', 'المغراقة', 'المصيلحة', 'البريج',
                'النصيرات', 'وادي غزة', 'المغازي', 'المتوسط',
            ],

            // رفح
            'RFH' => [
                'رفح', 'الشعوت', 'الجورة', 'تل السلطان', 'العطوش',
                'الخزنة', 'الشامل', 'أم الكيرون',
            ],

            // شمال غزة
            'NGZ' => [
                'جباليا', 'بيت حانون', 'بيت لاهيا', 'الصورة',
                'بددو', 'البرة', 'شمال غزة',
            ],
        ];

        foreach ($cities as $stateCode => $cityNames) {
            $stateId = $stateIds[$stateCode] ?? null;
            if (!$stateId) continue;

            foreach ($cityNames as $cityName) {
                DB::table('cities')->insert([
                    'state_id'   => $stateId,
                    'name'       => $cityName,
                    'status'     => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $this->command->info('✓ Palestine geography seeded successfully.');
        $this->command->info('  Country: Palestine (PSE)');
        $this->command->info('  Governorates: ' . count($governorates));
        $this->command->info('  Cities: ' . DB::table('cities')->count());
    }
}
