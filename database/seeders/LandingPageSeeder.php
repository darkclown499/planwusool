<?php

namespace Database\Seeders;

use App\Models\LandingPageSetting;
use Illuminate\Database\Seeder;

class LandingPageSeeder extends Seeder
{
    public function run(): void
    {
        LandingPageSetting::updateOrCreate(
            ['id' => 1],
            [
                'company_name' => 'Wusool',
                'contact_email' => 'support@wusool.ps',
                'contact_phone' => '+972559886886',
                'contact_address' => 'وكالة بلانكتون، قلقيلية، فلسطين',
                'config_sections' => $this->getConfigSections()
            ]
        );

        $this->command->info('Landing page settings updated with Arabic content.');
    }

    private function getConfigSections(): array
    {
        return [
            'sections' => [
                [
                    'key' => 'header',
                    'transparent' => false,
                    'background_color' => '#ffffff',
                    'text_color' => '#1f2937',
                    'button_style' => 'gradient'
                ],
                [
                    'key' => 'hero',
                    'title' => 'ابدأ متجرك خلال دقائق',
                    'subtitle' => 'منصة متقدمة لبناء وإدارة متجرك على واتساب بسهولة وأدوات احترافية تساعدك على النمو والتوسع',
                    'announcement_text' => 'انضم الآن واستفد من التجربة المجانية',
                    'primary_button_text' => 'ابدأ تجربة مجانية',
                    'secondary_button_text' => 'الدخول',
                    'background_color' => '#0a0a0a',
                    'text_color' => '#ffffff',
                    'layout' => 'image-right',
                    'image_position' => 'right',
                    'stats' => [
                        ['value' => 'جاهز في دقائق', 'label' => 'أنشئ متجرك دون تعقيد'],
                        ['value' => 'أدوات تسويق مدمجة', 'label' => 'حملات وعروض بلمسة واحدة'],
                        ['value' => 'تحديثات مستمرة', 'label' => 'المنصة تتطور مع متجرك'],
                    ],
                ],
                [
                    'key' => 'features',
                    'title' => 'كل ما تحتاجه لإطلاق متجرك',
                    'description' => 'أدوات احترافية مصممة لنجاح متجرك عبر واتساب',
                    'background_color' => '#ffffff',
                    'layout' => 'grid',
                    'columns' => 3,
                    'show_icons' => true,
                    'features_list' => [
                        ['title' => 'متجر ذكي', 'description' => 'متجر تفاعلي متكامل يتيح للعملاء التصفح والشراء بسهولة تامة.', 'icon' => 'store'],
                        ['title' => 'تصميم احترافي قابل للتخصيص', 'description' => 'قوالب جاهزة بتصاميم عصرية يمكنك تخصيصها بالكامل لتناسب هوية متجرك.', 'icon' => 'palette'],
                        ['title' => 'لوحة تحكم شاملة', 'description' => 'تابع مبيعاتك وعملاءك ومخزونك من مكان واحد مع تقارير مفصلة وفورية.', 'icon' => 'bar-chart'],
                        ['title' => 'أداء فائق وسريع', 'description' => 'بنية تحتية محسّنة تضمن تصفحاً سلساً وتحميلاً فورياً لصفحات متجرك.', 'icon' => 'zap'],
                        ['title' => 'دعم متعدد اللغات والـ RTL', 'description' => 'وصول لعملائك بلغتهم مع دعم كامل للعربية والإنجليزية والتخطيط من اليمين لليسار.', 'icon' => 'globe'],
                        ['title' => 'أمان على مستوى المؤسسات', 'description' => 'تشفير على مستوى البنوك والامتثال الكامل لمعايير الأمان في كل معاملة.', 'icon' => 'shield'],
                        ['title' => 'ذكاء اصطناعي مدمج', 'description' => 'مساعد ذكاء اصطناعي مدمج يساعدك على توليد المحتوى والرد على الاستفسارات مباشرة من لوحة التحكم.', 'icon' => 'bot'],
                        ['title' => 'نظام محاسبة متكامل', 'description' => 'إدارة الضرائب والفواتير (بما فيها نسخ PDF) وإحصائيات الإيرادات، مع إمكانية الربط بنظامك المحاسبي الخارجي.', 'icon' => 'calculator'],
                        ['title' => 'حلول توصيل متكاملة', 'description' => 'تحديد مناطق الشحن والتكاليف وطريقة التسليم (شخصية أو عبر شركة موصيّة) مع خيار إظهار حالة التتبع.', 'icon' => 'truck']
                    ]
                ],
                [
                    'key' => 'screenshots',
                    'title' => 'شاهد وصول قيد التشغيل',
                    'subtitle' => 'استكشف لوحة التحكم البديهية وميزات إدارة المتجر القوية.',
                    'screenshots_list' => []
                ],
                [
                    'key' => 'why_choose_us',
                    'title' => 'لماذا تختار وصول؟',
                    'subtitle' => 'أدوات متكاملة لإدارة متجرك على واتساب دون تعقيد.',
                    'reasons' => [
                        ['title' => 'إدارة متاجر حسب باقتك', 'description' => 'أدر متجرك (وعدد المتاجر حسب باقتك) من لوحة تحكم موحدة.', 'icon' => 'stores'],
                        ['title' => 'تسعير شفاف حسب الباقة', 'description' => 'خطط واضحة تناسب نموك — من المجانية للأبد إلى الاحترافية.', 'icon' => 'money']
                    ],
                    'stats' => []
                ],
                [
                    'key' => 'themes',
                    'title' => 'اختر تصميم متجرك',
                    'subtitle' => 'اختر من بين تصاميمنا الاحترافية لتناسب أسلوب عملك',
                    'selected_themes' => ['gadgets', 'fashion', 'bakery'],
                    'cta_title' => 'جاهز لبدء متجرك؟',
                    'cta_description' => 'اختر التصميم المفضل لديك وابدأ في بناء متجرك الإلكتروني اليوم.',
                    'primary_button_text' => 'ابدأ مجاناً',
                    'secondary_button_text' => 'عرض جميع الميزات'
                ],
                [
                    'key' => 'about',
                    'title' => 'عن وصول',
                    'description' => 'منصة عربية لبناء وإدارة المتاجر على واتساب بأدوات احترافية ومتكاملة.',
                    'background_color' => '#f9fafb',
                    'stats' => []
                ],
                [
                    'key' => 'team',
                    'title' => 'تعرف على فريقنا',
                    'subtitle' => 'نحن فريق متنوع من المبتكرين وحلال المشكلات.',
                    'members' => []
                ],
                [
                    'key' => 'testimonials',
                    'title' => 'آراء العملاء',
                    'subtitle' => 'سيُعرض هنا فقط تقييمات موثقة من تجار حقيقيين بعد موافقتهم — لا توجد شهادات معروضة حالياً.',
                    'background_color' => '#ffffff',
                    'testimonials' => []
                ],
                [
                    'key' => 'plans',
                    'title' => 'اختر خطتك',
                    'subtitle' => 'ابدأ بخطتنا المجانية وترقِ مع نموك.',
                    'background_color' => '#f8fafc'
                ],
                [
                    'key' => 'faq',
                    'title' => 'الأسئلة الشائعة',
                    'subtitle' => 'لديك أسئلة؟ لدينا الإجابات.',
                    'background_color' => '#ffffff',
                    'faqs' => [
                        ['question' => 'كيف تعمل وصول؟', 'answer' => 'تتيح لك وصول إنشاء وإدارة متاجر إلكترونية متعددة من لوحة تحكم واحدة مع ميزات تجارة إلكترونية قوية.'],
                        ['question' => 'هل يمكنني إنشاء متاجر متعددة بحساب واحد؟', 'answer' => 'نعم! وصول مصممة كمنصة متاجر متعددة. يمكنك إنشاء وإدارة متاجر كثيرة من لوحة تحكم واحدة حسب خطتك.'],
                        ['question' => 'ما طرق الدفع المدعومة؟', 'answer' => 'ندعم أكثر من ٣٠ بوابة دفع بما في ذلك Stripe وPayPal وRazorpay وFlutterwave وغيرها الكثير.'],
                        ['question' => 'هل تتوفر تجربة مجانية؟', 'answer' => 'نعم! نقدم تجربة مجانية لمدة ١٤ يوماً مع وصول كامل لجميع الميزات. لا حاجة لبطاقة ائتمان للبدء.'],
                        ['question' => 'هل أحتاج خبرة تقنية لاستخدام وصول؟', 'answer' => 'على الإطلاق! وصول مصممة لرواد الأعمال غير التقنيين. واجهتنا البديهية ومنشئ المتجر بالسحب والإفلات يسهل إنشاء متاجر احترافية.'],
                        ['question' => 'ما نوع الدعم المقدم؟', 'answer' => 'نقدم دعماً على مدار الساعة عبر الدردشة المباشرة والبريد الإلكتروني وواتساب. فريقنا يشمل خبراء تجارة إلكترونية.']
                    ]
                ],
                [
                    'key' => 'newsletter',
                    'title' => 'ابقَ على اطلاع مع وصول',
                    'subtitle' => 'احصل على آخر التحديثات ونصائح التجارة الإلكترونية.',
                    'privacy_text' => 'بدون رسائل مزعجة، يمكنك إلغاء الاشتراك في أي وقت.'
                ],
                [
                    'key' => 'contact',
                    'title' => 'تواصل معنا',
                    'subtitle' => 'لديك أسئلة حول وصول؟ نحب أن نسمع منك. أرسل لنا رسالة وسنرد في أقرب وقت ممكن.',
                    'form_title' => 'أرسل لنا رسالة',
                    'info_title' => 'معلومات التواصل',
                    'info_description' => 'نحن هنا لمساعدتك والإجابة على أي سؤال لديك. نتطلع لسماع منك.',
                    'background_color' => '#f9fafb'
                ],
                [
                    'key' => 'footer',
                    'description' => 'نمكّن رواد الأعمال بحلول تجارة إلكترونية قوية متعددة المتاجر.',
                    'newsletter_title' => 'ابقَ على اطلاع مع وصول',
                    'newsletter_subtitle' => 'اشترك في نشرتنا الإخبارية لنصائح التجارة الإلكترونية والتحديثات',
                    'links' => [
                        'product' => [
                            ['name' => 'الميزات', 'href' => '#features'],
                            ['name' => 'القوالب', 'href' => '#features'],
                            ['name' => 'الأسعار', 'href' => '#pricing']
                        ],
                        'company' => [
                            ['name' => 'من نحن', 'href' => '/about'],
                            ['name' => 'المميزات', 'href' => '/features'],
                            ['name' => 'اتصل بنا', 'href' => '#contact']
                        ],
                        'support' => [
                            ['name' => 'المميزات', 'href' => '/features'],
                            ['name' => 'اتصل بنا', 'href' => '#contact'],
                            ['name' => 'الأسئلة الشائعة', 'href' => '#faq']
                        ],
                        'legal' => [
                            ['name' => 'سياسة الخصوصية', 'href' => '/privacy'],
                            ['name' => 'اتفاقية المستخدم', 'href' => '/terms']
                        ]
                    ],
                    'section_titles' => [
                        'product' => 'المنتج',
                        'company' => 'الشركة',
                        'support' => 'الدعم',
                        'legal' => 'قانوني'
                    ],
                    'social_links' => [
                        ['name' => 'Facebook', 'icon' => 'Facebook', 'href' => '#'],
                        ['name' => 'Twitter', 'icon' => 'Twitter', 'href' => '#'],
                        ['name' => 'Instagram', 'icon' => 'Instagram', 'href' => '#']
                    ]
                ]
            ],
            'colors' => [
                'primary' => '#10b77f',
                'secondary' => '#059669',
                'accent' => '#065f46'
            ],
            'seo' => [
                'meta_title' => 'وصول - منصة إدارة المتاجر المتعددة',
                'meta_description' => 'أنشئ وأدر متاجر إلكترونية متعددة مع وصول. منصة تجارة إلكترونية قوية مع تصاميم جميلة وميزات متقدمة.',
                'meta_keywords' => 'منصة متاجر متعددة، إدارة متاجر إلكترونية، حلول التجارة الإلكترونية، وصول'
            ],
            'section_order' => [
                'header', 'hero', 'trusted_by', 'features', 'plans', 'contact', 'footer'
            ],
            'section_visibility' => [
                'header' => true,
                'hero' => true,
                'trusted_by' => true,
                'features' => true,
                'screenshots' => false,
                'why_choose_us' => false,
                'themes' => false,
                'about' => false,
                'team' => false,
                'testimonials' => false,
                'plans' => true,
                'faq' => false,
                'newsletter' => false,
                'contact' => true,
                'footer' => true
            ]
        ];
    }
}
