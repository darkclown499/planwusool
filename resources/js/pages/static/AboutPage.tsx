import React from 'react';
import { useTranslation } from 'react-i18next';
import StaticPageLayout from './StaticPageLayout';
import { Eye, Target, ShieldCheck, Sparkles, HeadphonesIcon, Globe, Zap, ArrowLeft } from 'lucide-react';
import { Link } from '@inertiajs/react';

export default function AboutPage() {
  const { t, i18n } = useTranslation();
  const currentLocale = (i18n.language || 'ar').split('-')[0];
  const isRtl = ['ar', 'he'].includes(currentLocale);

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: t('سهولة الاستخدام'),
      desc: t('واجهة بديهية لا تتطلب خبرة تقنية لإدارة متجرك بكفاءة'),
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: t('إدارة شاملة'),
      desc: t('منتجات، عملاء، طلبات، وتحليلات من مكان واحد'),
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: t('أمان متقدم'),
      desc: t('حماية بياناتك وبيانات عملائك بأعلى معايير الأمان'),
    },
    {
      icon: <HeadphonesIcon className="w-6 h-6" />,
      title: t('دعم فني حسب الباقة'),
      desc: t('قنوات وساعات الدعم تختلف حسب الباقة — من البريد إلى واتساب و VIP'),
    },
  ];

  return (
    <StaticPageLayout
      title={t('عن وصول')}
      meta={{
        title: t('عن وصول - منصة متاجر واتساب'),
        description: t('تعرف على منصة وصول لإنشاء وإدارة المتاجر على واتساب: إدارة المنتجات والعملاء والطلبات بسهولة وبدون خبرة تقنية.'),
      }}
    >
      <div className="space-y-16">

        {/* Hero intro */}
        <section className="text-center max-w-3xl mx-auto">
          <p className="text-xl leading-relaxed text-gray-300">
            {t('وصول منصة إلكترونية متكاملة لإنشاء وإدارة المتاجر على واتساب. نوفر لأصحاب المتاجر أدوات احترافية لإدارة منتجاتهم وعملاءهم وطلباتهم بسهولة وفعالية.')}
          </p>
        </section>

        {/* Vision + Mission Grid */}
        <section className="grid md:grid-cols-2 gap-6">
          {/* Vision */}
          <div className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition-all duration-300 hover:border-emerald-500/30 hover:bg-white/[0.05]">
            <div className="mb-5 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Eye className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white mb-4">{t('رؤيتنا')}</h2>
            <p className="text-gray-400 leading-relaxed">
              {t('نسعى لإنشاء أكبر منصة عربية لإدارة المتاجر على واتساب، تمكّن رواد الأعمال من بيع منتجاتهم بسهولة وتحقيق أرباح أعلى مع تجربة مبيعات سلسة واحترافية لعملائهم.')}
            </p>
          </div>

          {/* Mission */}
          <div className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition-all duration-300 hover:border-emerald-500/30 hover:bg-white/[0.05]">
            <div className="mb-5 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Target className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white mb-4">{t('مهمتنا')}</h2>
            <p className="text-gray-400 leading-relaxed">
              {t('تقديم حلول بيع ذكية وسهلة الاستخدام على واتساب تساعد أصحاب المتاجر على النمو والتوسع، مع توفير تجربة شراء مميزة للعملاء تجمع بين سهولة واتساب وقوة الأدوات الرقمية الحديثة.')}
            </p>
          </div>
        </section>

        {/* Why Wusool */}
        <section>
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white">{t('لماذا وصول؟')}</h2>
            <p className="mt-2 text-gray-500">{t('كل ما تحتاجه لإدارة متجرك بنجاح')}</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((item, i) => (
              <div
                key={i}
                className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-all duration-300 hover:border-emerald-500/30 hover:bg-white/[0.05]"
              >
                <div className="flex-shrink-0 mt-0.5 text-emerald-400 group-hover:text-emerald-300 transition-colors">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-white mb-1.5">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-900/20 to-teal-900/10 p-8 sm:p-10">
          <h2 className="text-xl font-bold text-white mb-4">{t('تواصل معنا')}</h2>
          <p className="text-gray-400 leading-relaxed mb-6">
            {t('لأي استفسارات أو دعم فني، يُرجى التواصل معنا عبر البريد الإلكتروني')}{' '}
            <a href="mailto:support@wusool.ps" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors">support@wusool.ps</a>
            {' '}{t('أو عبر الواتساب على الرقم')}{' '}
            <a href="https://wa.me/972559886886" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors">+972 55 988 6886</a>
          </p>
          <Link
            href={route('home')}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
          >
            <ArrowLeft size={16} className={isRtl ? 'rotate-180' : ''} />
            {isRtl ? 'العودة للرئيسية' : 'Back to Home'}
          </Link>
        </section>

      </div>
    </StaticPageLayout>
  );
}
