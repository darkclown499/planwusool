export const defaultLandingPageSections = {
 sections: [
 {
 key: 'header',
 transparent: false,
 background_color: '#ffffff',
 text_color: '#1f2937',
 button_style: 'gradient'
 },
 {
 key: 'hero',
 title: 'ابدأ متجرك خلال دقائق',
 subtitle: 'منصة متقدمة لبناء وإدارة متجرك على واتساب بسهولة وأدوات احترافية تساعدك على النمو والتوسع',
 announcement_text: 'موثوق من أكثر من ١٠,٠٠٠ متجر حول العالم',
 primary_button_text: 'ابدأ تجربة مجانية',
 secondary_button_text: 'الدخول',
 image: '/images/hero-dashboard.png',
 background_color: '#0a0a0a',
 text_color: '#ffffff',
 layout: 'image-right',
 height: 600,
 image_position: 'right',
 overlay: false,
 overlay_color: 'rgba(0,0,0,0.5)',
 button_primary_color: '#10b77f',
 button_secondary_color: '#6b7280',
 button_text_color: '#ffffff',
 stats: [
 { value: '١٠ آلاف+', label: 'متجر' },
 { value: '+٥٠', label: 'دولة' },
 { value: '٩٩.٩٪', label: 'وقت تشغيل' }
 ],
 },
 {
 key: 'features',
 title: 'كل ما تحتاجه لإطلاق متجرك',
 description: 'أدوات احترافية مصممة لنجاح متجرك عبر واتساب',
 background_color: '#ffffff',
 layout: 'grid',
 columns: 3,
 image: '',
 show_icons: true,
 features_list: [
 {
 title: 'متجر ذكي',
 description: 'متجر تفاعلي متكامل يتيح للعملاء التصفح والشراء بسهولة تامة.',
 icon: 'store'
 },
 {
 title: 'تصميم احترافي قابل للتخصيص',
 description: 'قوالب جاهزة بتصاميم عصرية يمكنك تخصيصها بالكامل لتناسب هوية متجرك.',
 icon: 'palette'
 },
 {
 title: 'لوحة تحكم شاملة',
 description: 'تابع مبيعاتك وعملاءك ومخزونك من مكان واحد مع تقارير مفصلة وفورية.',
 icon: 'bar-chart'
 }
 ]
 },
 {
 key: 'screenshots',
 title: 'شاهد وصول قيد التشغيل',
 subtitle: 'استكشف لوحة التحكم البديهية وميزات إدارة المتجر القوية.',
 screenshots_list: [
 {
 src: '/screenshots/hero.png',
 alt: 'لوحة تحكم وصول',
 title: 'نظرة عامة على لوحة التحكم',
 description: 'لوحة تحكم شاملة تحتوي على جميع متاجرك وتحليلاتك'
 },
 {
 src: '/screenshots/store-builder.png',
 alt: 'منشئ المتجر',
 title: 'منشئ المتجر',
 description: 'واجهة بديهية لإنشاء وإدارة المتاجر الإلكترونية'
 }
 ]
 },
 {
 key: 'why_choose_us',
 title: 'لماذا تختار وصول؟',
 subtitle: 'الحل الشامل للتجارة الإلكترونية للمؤسسات الحديثة.',
 reasons: [
 { title: 'بنية متعددة المتاجر', description: 'أدر متاجر غير محدودة من حساب واحد مع لوحة تحكم موحدة.', icon: 'stores' },
 { title: 'بدون رسوم معاملات', description: 'احتفظ بـ ١٠٠٪ من أرباحك مع تسعير شفاف.', icon: 'money' }
 ],
 stats: [
 { value: '١٠ آلاف+', label: 'مستخدم نشط', color: 'blue' },
 { value: '٩٩٪', label: 'رضا العملاء', color: 'green' }
 ]
 },
 {
  key: 'about',
  title: 'عن وصول',
 description: 'نحن شغوفون بتمكين رواد الأعمال من بناء أعمال تجارة إلكترونية ناجحة.',
 story_title: 'نحدث ثورة في التجارة الإلكترونية متعددة المتاجر منذ ٢٠١٩',
 story_content: 'تأسست وصول على يد خبراء في التجارة الإلكترونية ومبتكرين في التكنولوجيا، لحل تحديات إدارة المتاجر الإلكترونية المتعددة.',
 image: '',
 background_color: '#f9fafb',
 layout: 'image-right',
 stats: [
 { value: '+٤ سنوات', label: 'خبرة', color: 'blue' },
 { value: '١٠ آلاف+', label: 'مستخدم سعيد', color: 'green' },
 { value: '+٥٠', label: 'دولة', color: 'purple' }
 ]
 },
 {
 key: 'team',
 title: 'تعرف على فريقنا',
 subtitle: 'نحن فريق متنوع من المبتكرين وحلال المشكلات.',
 cta_title: 'هل تريد الانضمام لفريقنا؟',
 cta_description: 'نبحث دائماً عن أفراد موهوبين.',
 cta_button_text: 'عرض الوظائف الشاغرة',
 members: [
 { name: 'أحمد محمد', role: 'الرئيس التنفيذي والمؤسس', bio: 'مدير تقني سابق بخبرة تزيد عن ١٥ عاماً.', image: '', linkedin: '#', email: 'ahmed@wusool.ps' }
 ]
 },
 {
 key: 'testimonials',
 title: 'ماذا يقول عملاؤنا',
 subtitle: 'آراء حقيقية من أصحاب متاجر ناجحة استخدموا وصول',
 trust_title: 'موثوق من المحترفين حول العالم',
 trust_stats: [
 { value: '٤.٩/٥', label: 'متوسط التقييم', color: 'blue' },
 { value: '١٠ آلاف+', label: 'مستخدم سعيد', color: 'green' }
 ],
 testimonials: [
 { name: 'أحمد منصور', role: 'صاحب متجر إلكتروني', company: 'متجر التقنية', content: 'وصول غيّرت طريقة عملنا بالكامل. أصبحنا ندير متاجرنا عبر واتساب بسهولة والمبيعات تضاعفت خلال ثلاثة أشهر.', rating: 5 }
 ]
 },
 {
 key: 'active_campaigns',
 title: 'رواجع أعمال مميزة',
 subtitle: 'استكشف الأعمال التي نروج لها حالياً واكتشف خدمات مذهلة',
 background_color: '#f8fafc',
 show_view_all: true,
 max_display: 6
 },
 {
 key: 'plans',
 title: 'اختر خطتك',
 subtitle: 'ابدأ بخطتنا المجانية وترقِ مع نموك.',
 faq_text: 'لديك أسئلة关于我们的套餐؟ تواصل مع فريق المبيعات'
 },
 {
 key: 'faq',
 title: 'الأسئلة الشائعة',
 subtitle: 'لديك أسئلة؟ لدينا الإجابات.',
 cta_text: 'لا تزال لديك أسئلة؟',
 button_text: 'تواصل مع الدعم',
 faqs: [
 { question: 'كيف تعمل وصول؟', answer: 'تتيح لك وصول إنشاء وإدارة متاجر إلكترونية متعددة من لوحة تحكم واحدة مع ميزات تجارة إلكترونية قوية.' }
 ]
 },
 {
 key: 'newsletter',
 title: 'ابقَ على اطلاع مع وصول',
 subtitle: 'احصل على آخر التحديثات ونصائح التجارة الإلكترونية وإعلانات الميزات.',
 privacy_text: 'بدون رسائل مزعجة، يمكنك إلغاء الاشتراك في أي وقت.',
 benefits: [
 { icon: '📧', title: 'تحديثات أسبوعية', description: 'آخر الميزات والتحسينات' }
 ]
 },
 {
 key: 'contact',
 title: 'تواصل معنا',
 subtitle: 'لديك أسئلة حول وصول؟ نحب أن نسمع منك. أرسل لنا رسالة وسنرد في أقرب وقت ممكن.',
 form_title: 'أرسل لنا رسالة',
 info_title: 'معلومات التواصل',
 info_description: 'نحن هنا لمساعدتك والإجابة على أي سؤال لديك. نتطلع لسماع منك.',
 layout: 'split',
 background_color: '#f9fafb'
 },
 {
 key: 'footer',
 description: 'نمكّن رواد الأعمال بحلول تجارة إلكترونية قوية متعددة المتاجر.',
 newsletter_title: 'ابقَ على اطلاع مع وصول',
 newsletter_subtitle: 'اشترك في نشرتنا الإخبارية لنصائح التجارة الإلكترونية والتحديثات',
 links: {
  product: [
  { name: 'الميزات', href: '#features' },
  { name: 'الأسعار', href: '#pricing' },
  { name: 'التحليلات', href: '#analytics' }
  ],
 company: [
 { name: 'من نحن', href: '#about' },
 { name: 'فريقنا', href: '#team' },
 { name: 'اتصل بنا', href: '#contact' },
 { name: 'وظائف', href: '#careers' }
 ],
 support: [
 { name: 'مركز المساعدة', href: '#help' },
 { name: 'التوثيق', href: '#docs' },
 { name: 'الأسئلة الشائعة', href: '#faq' },
 { name: 'تواصل مع الدعم', href: '#support' }
 ],
 legal: [
 { name: 'سياسة الخصوصية', href: '#privacy' },
 { name: 'شروط الخدمة', href: '#terms' },
 { name: 'سياسة ملفات تعريف الارتباط', href: '#cookies' },
 { name: 'حماية البيانات', href: '#gdpr' }
 ]
 },
 social_links: [
 { name: 'Facebook', icon: 'Facebook', href: '#' },
 { name: 'Twitter', icon: 'Twitter', href: '#' },
 { name: 'LinkedIn', icon: 'Linkedin', href: '#' },
 { name: 'Instagram', icon: 'Instagram', href: '#' }
 ],
 section_titles: {
 product: 'المنتج',
 company: 'الشركة',
 support: 'الدعم',
 legal: 'قانوني'
 }
 }
 ],
 colors: {
 primary: '#10b77f',
 secondary: '#059669',
 accent: '#065f46'
 },
 theme: {
 primary_color: '#10b77f',
 secondary_color: '#ffffff',
 accent_color: '#f7f7f7',
 logo_light: '',
 logo_dark: '',
 favicon: ''
 },
 seo: {
 meta_title: 'وصول - منصة إدارة المتاجر المتعددة',
 meta_description: 'أنشئ وأدر متاجر إلكترونية متعددة مع وصول. منصة تجارة إلكترونية قوية مع تصاميم جميلة وميزات متقدمة.',
 meta_keywords: 'منصة متاجر متعددة، إدارة متاجر إلكترونية، حلول التجارة الإلكترونية، منشئ المتاجر، وصول'
 },
 custom_css: '',
 custom_js: '',
 section_order: ['header', 'hero', 'features', 'testimonials', 'plans', 'contact', 'footer'],
 section_visibility: {
 header: true,
 hero: true,
 features: true,
 screenshots: false,
  why_choose_us: false,
  about: false,
 team: false,
 testimonials: true,
 active_campaigns: false,
 plans: true,
 faq: false,
 newsletter: false,
 contact: true,
 footer: true
 }
};
