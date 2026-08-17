import React from 'react';
import StaticPageLayout from './StaticPageLayout';
import { useTranslation } from 'react-i18next';
import { Store, Palette, BarChart3, Zap, Globe, Shield, Smartphone, Bot, Users, Package, CreditCard, Headphones } from 'lucide-react';

const allFeatures = [
  { icon: Store, title: 'متجر ذكي', desc: 'أنشئ متجرك على واتساب في دقائق مع كتالوج منتجات تفاعلي يتيح للعملاء التصفح والشراء بسهولة تامة عبر واتساب.', color: '#16a34a' },
  { icon: Palette, title: 'تصميم احترافي قابل للتخصيص', desc: 'اختر من بين عشرات القوالب الاحترافية المصممة لفئات مختلفة وخصّصها بالكامل لتتناسب مع هوية متجرك.', color: '#2563eb' },
  { icon: BarChart3, title: 'لوحة تحكم شاملة', desc: 'تابع مبيعاتك وعملاءك ومخزونك من مكان واحد مع تقارير مفصلة ورسوم بيانية تفاعلية تساعدك على اتخاذ قرارات ذكية.', color: '#9333ea' },
  { icon: Zap, title: 'أداء فائق وسريع', desc: 'بنية تحتية محسّنة على السحابة تضمن تصفحاً سلساً وتحميلاً فورياً لصفحات متجرك مع أوقات استجابة أقل من ثانية واحدة.', color: '#d97706' },
  { icon: Globe, title: 'دعم متعدد اللغات والـ RTL', desc: 'وصول لعملائك بلغتهم مع دعم كامل لأكثر من ١٥ لغة بما فيها العربية والإنجليزية مع تخطيط RTL سلس واحترافي.', color: '#0891b2' },
  { icon: Shield, title: 'أمان على مستوى المؤسسات', desc: 'تشفير بيانات ٢٥٦ بت لحماية جميع المعاملات والبيانات مع امتثال كامل لمعايير PCI-DSS وحماية GDPR.', color: '#dc2626' },
  { icon: Smartphone, title: 'تطبيق موبايل أصلي', desc: 'تطبيق موبايل احترافي لأصحاب المتاجر يتيح إدارة المنتجات والطلبات والعملاء من أي مكان وفي أي وقت.', color: '#db2777' },
  { icon: Bot, title: 'ذكاء اصطناعي مدمج', desc: 'مساعد ذكاء اصطناعي يكتب وصف المنتجات تلقائياً ويترجم المحتوى ويقترح أسعاراً تنافسية ويحلل سلوك العملاء.', color: '#7c3aed' },
  { icon: Users, title: 'إدارة العملاء', desc: 'قاعدة بيانات شاملة للعملاء مع تاريخ المشتريات والتفضيلات والملاحظات مع إمكانية تصنيف العملاء ومجموعاتهم.', color: '#059669' },
  { icon: Package, title: 'إدارة المخزون', desc: 'تتبع المخزون في الوقت الحقيقي مع تنبيهات نفاد المخزون وإمكانية إدارة مخزون متعدد الفروع.', color: '#ea580c' },
  { icon: CreditCard, title: 'بوابات دفع متعددة', desc: 'ندعم أكثر من ٣٠ بوابة دفع عالمية ومحلية بما فيها Stripe وPayPal وRazorpay والتحويل البنكي المباشر.', color: '#0284c7' },
  { icon: Headphones, title: 'دعم فني على مدار الساعة', desc: 'فريق دعم فني متخصص متاح ٢٤ ساعة عبر الدردشة المباشرة والبريد الإلكتروني وواتساب لمساعدتك في أي وقت.', color: '#be185d' },
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
              { title: t('نمو غير محدود'), desc: t('ابدأ بمتجر واحد وتوسع إلى متاجر متعددة من حساب واحد مع لوحة تحكم موحدة.') },
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
          <p className="text-gray-500 mb-6">{t('ابدأ تجربتك المجانية لمدة ١٤ يوماً مع وصول كامل لجميع الميزات.')}</p>
          <a href={route('register')} className="inline-flex items-center rounded-xl bg-gray-950 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-gray-800">
            {t('ابدأ مجاناً')}
          </a>
        </section>
      </div>
    </StaticPageLayout>
  );
}
