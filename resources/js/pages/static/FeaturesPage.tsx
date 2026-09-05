import React from 'react';
import StaticPageLayout from './StaticPageLayout';
import { useTranslation } from 'react-i18next';
import { Store, Palette, BarChart3, Zap, Globe, Shield, Smartphone, Bot, Users, Package, CreditCard, Headphones } from 'lucide-react';

const allFeatures = [
  { icon: Store, title: 'متجر ذكي', desc: 'أنشئ متجرك على واتساب في دقائق مع كتالوج منتجات تفاعلي يتيح للعملاء التصفح والشراء بسهولة تامة عبر واتساب.', color: '#16a34a' },
  { icon: Palette, title: 'تصميم احترافي قابل للتخصيص', desc: 'اختر من بين 6 قوالب قطاعية مصممة لأنواع مختلفة من المتاجر (bazaar-market، grocery-souq، bakery-house، electronics-hub، fashion-atelier، restaurant-menu) وخصّصها حسب الباقة.', color: '#2563eb' },
  { icon: BarChart3, title: 'لوحة تحكم شاملة', desc: 'تابع مبيعاتك وعملاءك ومخزونك من مكان واحد مع تقارير مفصلة ورسوم بيانية تساعدك على اتخاذ قرارات ذكية (حسب الباقة).', color: '#9333ea' },
  { icon: Zap, title: 'أداء سريع ومتجاوب', desc: 'صفحات خفيفة ومتجاوبة تعمل بسلاسة على الجوال والكمبيوتر مع تحسين للسرعة.', color: '#d97706' },
  { icon: Globe, title: 'دعم متعدد اللغات والـ RTL', desc: 'واجهة عربية بالكامل مع اتجاه من اليمين لليسار، وإمكانية إضافة الإنجليزية أو لغات أخرى لمحتوى متجرك.', color: '#0891b2' },
  { icon: Shield, title: 'أمان وتشفير', desc: 'تشفير SSL/TLS لحماية البيانات المنقولة مع نسخ احتياطي وضوابط وصول. الأمان مسؤولية مشتركة.', color: '#dc2626' },
  { icon: Smartphone, title: 'تطبيق ويب PWA (حسب الباقة)', desc: 'تطبيق ويب قابل للتثبيت على الأجهزة في الباقات المدعومة (Growth و Professional)؛ التطبيق الأصلي متاح في الباقة الاحترافية فقط حسب الإعداد والتوفر.', color: '#db2777' },
  { icon: Bot, title: 'ذكاء اصطناعي (حسب الباقة)', desc: 'مساعدة في كتابة أوصاف المنتجات وترجمتها في الباقات المدعومة (Growth و Professional) — حسب الإعداد والتوفر.', color: '#7c3aed' },
  { icon: Users, title: 'إدارة العملاء', desc: 'قاعدة بيانات شاملة للعملاء مع تاريخ المشتريات والتفضيلات وإمكانية التصنيف (حسب حدود الباقة).', color: '#059669' },
  { icon: Package, title: 'إدارة المخزون', desc: 'تتبع المخزون مع تنبيهات نفاد المخزون.', color: '#ea580c' },
  { icon: CreditCard, title: 'بوابات دفع متعددة (حسب التوفر)', desc: 'خيارات دفع متنوعة عبر بوابات إقليمية وعالمية حسب توفرها في بلدك وتفعيلك لها في المتجر، بالإضافة إلى الدفع عند الاستلام والتحويل البنكي.', color: '#0284c7' },
  { icon: Headphones, title: 'دعم فني (حسب الباقة)', desc: 'قنوات وساعات الدعم تختلف حسب الباقة: البريد (8 ساعات) للبداية، واتساب وبريد (12 ساعة) للنمو، ودعم VIP (24 ساعة) للاحترافية.', color: '#be185d' },
];

export default function FeaturesPage() {
  const { t } = useTranslation();

  return (
    <StaticPageLayout
      title={t('مميزات وصول')}
      meta={{
        title: t('مميزات وصول - كل أدوات متجر الواتساب في مكان واحد'),
        description: t('استعرض مميزات منصة وصول: إدارة المنتجات، الطلبات، العملاء، التقارير، والدفع الإلكتروني — كل ما تحتاجه للمتجر على واتساب.'),
      }}
    >
      <div className="space-y-16">
        <div className="text-center">
          <p className="text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto">
            {t('وصول توفر لك كل الأدوات اللازمة لإنشاء وإدارة متجر واتساب احترافي ومتكامل. اكتشف المميزات التي تجعل وصول المنصة الأولى لرواد الأعمال.')}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {allFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="group rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/50">
                <div
                  className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl shadow-lg"
                  style={{ backgroundColor: `${feature.color}15`, boxShadow: `0 4px 12px -2px ${feature.color}25` }}
                >
                  <Icon size={22} style={{ color: feature.color }} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{t(feature.title)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(feature.desc)}</p>
              </div>
            );
          })}
        </div>

        <section className="rounded-2xl bg-gray-950 p-8 text-white sm:p-12">
          <h2 className="text-2xl font-bold text-center mb-8">{t('لماذا يختار التجار وصول؟')}</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { title: t('سهولة الاستخدام'), desc: t('واجهة بديهية لا تحتاج لخبرة تقنية. أطلق متجرك في دقائق بفضل منشئ المتجر بالسحب والإفلات.') },
              { title: t('نمو مرن'), desc: t('ابدأ بمتجر واحد وتوسع حسب حدود باقتك (حتى متجرين في الاحترافية) من حساب واحد.') },
              { title: t('ادخار في التكاليف'), desc: t('احتفظ بـ ١٠٠٪ من أرباحك بدون رسوم معاملات. خطط مرنة تناسب جميع الميزانيات.') },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('جاهز لاكتشاف المزيد؟')}</h2>
          <p className="text-gray-500 mb-6">{t('ابدأ بالباقة المجانية للأبد، أو جرّب باقة النمو 14 يوماً مجاناً حسب التوفر.')}</p>
          <a href={route('register')} className="inline-flex items-center rounded-xl bg-gray-950 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-gray-800">
            {t('ابدأ مجاناً')}
          </a>
        </section>
      </div>
    </StaticPageLayout>
  );
}
