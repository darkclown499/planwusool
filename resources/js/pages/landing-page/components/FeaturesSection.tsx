import React from 'react';
import {
  Store,
  Palette,
  BarChart3,
  Zap,
  Globe,
  Shield,
  Bot,
  Calculator,
  Truck,
} from 'lucide-react';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';

interface Feature {
  title: string;
  description: string;
  icon: string;
}

interface FeaturesSectionProps {
  brandColor?: string;
  settings: object;
  sectionData: {
    title?: string;
    description?: string;
    image?: string;
    background_color?: string;
    columns?: number;
    features_list?: Feature[];
  };
}

const features = [
  {
    icon: Store,
    title: 'متجر واتساب ذكي',
    description: 'أتمتة المبيعات والرد على العملاء على مدار الساعة عبر واتساب مع متجر ذكي يتكامل مع catalogue الخاص بك.',
    color: '#16a34a',
    gradient: 'from-emerald-500 to-green-600',
    bgLight: 'bg-emerald-50',
  },
  {
    icon: Palette,
    title: 'تصميم احترافي قابل للتخصيص',
    description: 'اختر من بين عشرات القوالب الاحترافية وعدّلها بالكامل لتتناسب مع هوية متجرك.',
    color: '#2563eb',
    gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
  },
  {
    icon: BarChart3,
    title: 'لوحة تحكم شاملة',
    description: 'تتبع مبيعاتك وسلوك عملائك ونمو متجرك في الوقت الحقيقي من مكان واحد.',
    color: '#9333ea',
    gradient: 'from-purple-500 to-violet-600',
    bgLight: 'bg-purple-50',
  },
  {
    icon: Zap,
    title: 'أداء فائق وسريع',
    description: 'بنية تحتية محسّنة تضمن تصفحاً سلساً وتحميلاً فورياً لصفحات متجرك.',
    color: '#d97706',
    gradient: 'from-amber-500 to-orange-600',
    bgLight: 'bg-amber-50',
  },
  {
    icon: Globe,
    title: 'دعم متعدد اللغات والـ RTL',
    description: 'وصول لعملائك بلغتهم مع دعم كامل للعربية والإنجليزية والتخطيط من اليمين لليسار.',
    color: '#0891b2',
    gradient: 'from-cyan-500 to-teal-600',
    bgLight: 'bg-cyan-50',
  },
  {
    icon: Shield,
    title: 'أمان على مستوى المؤسسات',
    description: 'تشفير على مستوى البنوك والامتثال الكامل لمعايير الأمان في كل معاملة.',
    color: '#dc2626',
    gradient: 'from-red-500 to-rose-600',
    bgLight: 'bg-red-50',
  },
  {
    icon: Bot,
    title: 'ذكاء اصطناعي مدمج',
    description: 'مساعد ذكاء اصطناعي يكتب وصف المنتجات ويترجم المحتوى ويقترح أسعاراً تنافسية.',
    color: '#7c3aed',
    gradient: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
  },
  {
    icon: Calculator,
    title: 'نظام محاسبة متكامل',
    description: 'أدر الشؤون المالية لمتجرك بسهولة عبر نظام مدمج يتيح لك تتبع الإيرادات، إصدار الفواتير، وتحليل الأرباح بدقة.',
    color: '#0284c7',
    gradient: 'from-sky-500 to-blue-600',
    bgLight: 'bg-sky-50',
  },
  {
    icon: Truck,
    title: 'حلول توصيل متكاملة',
    description: 'استفد من تعاقداتنا الجاهزة واربط متجرك بسلاسة مع أبرز شركات التوصيل لتسهيل شحن الطلبات وتتبعها آلياً.',
    color: '#ea580c',
    gradient: 'from-orange-500 to-red-500',
    bgLight: 'bg-orange-50',
  },
];

const BENTO_CSS = `
  .bento-card {
    opacity: 0;
    transform: translateY(18px);
    transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  .bento-card.on {
    opacity: 1;
    transform: translateY(0);
  }
  @media (prefers-reduced-motion: reduce) {
    .bento-card {
      opacity: 1 !important;
      transform: none !important;
    }
  }
`;

export default function FeaturesSection({
  sectionData,
}: FeaturesSectionProps) {
  const { ref, isVisible } = useScrollAnimation();

  const gridClass = (index: number) =>
    index === 0 ? 'sm:col-span-2 lg:col-span-2 lg:row-span-2' : '';

  return (
    <section
      id="features"
      className="relative overflow-hidden py-20 sm:py-28 lg:py-36"
      style={{ fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}
      ref={ref}
    >
      <style>{BENTO_CSS}</style>
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-gray-50" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ─── Section Header ─── */}
        <div
          className={`mx-auto max-w-2xl text-center transition-all duration-700 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}
        >
          <span className="mb-4 inline-block rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-[13px] font-semibold text-violet-700">
            المميزات
          </span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            كل ما تحتاجه لإطلاق{' '}
            <span className="bg-gradient-to-l from-emerald-600 via-blue-600 to-violet-600 bg-clip-text text-transparent">
              متجرك
            </span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-gray-500">
            {sectionData.description ||
              'منصة وصول تمنحك كل الأدوات اللازمة لإنشاء وإدارة متجر واتساب احترافي ومتكامل.'}
          </p>
        </div>

        {/* ─── Bento Grid ─── */}
        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isHero = index === 0;
            return (
              <div
                key={index}
                className={`bento-card ${isVisible ? 'on' : ''} ${gridClass(index)}`}
                style={{ transitionDelay: `${0.15 + index * 0.08}s` }}
              >
                <div
                  className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-200/60 sm:p-7 ${
                    isHero
                      ? `border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white shadow-sm`
                      : 'border-gray-200 bg-white shadow-sm hover:border-gray-300'
                  }`}
                >
                  {/* Decor — stays inside the tile, never over text */}
                  {isHero && (
                    <div
                      className={`pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gradient-to-br ${feature.gradient} opacity-[0.08] blur-2xl`}
                    />
                  )}

                  <div className="relative">
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} ring-1 ring-white/50 shadow-lg transition-transform duration-300 group-hover:scale-110 ${
                          isHero ? 'h-12 w-12' : 'h-10 w-10'
                        }`}
                        style={{ boxShadow: `0 10px 26px -6px ${feature.color}66` }}
                      >
                        <Icon
                          className={`text-white ${isHero ? 'h-6 w-6' : 'h-5 w-5'}`}
                          strokeWidth={1.9}
                        />
                      </div>
                      <span
                        className="text-[11px] font-bold tracking-widest"
                        style={{ color: `${feature.color}99` }}
                        dir="ltr"
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <h3
                      className={`mt-4 font-extrabold leading-snug text-gray-900 ${
                        isHero ? 'text-lg sm:text-xl' : 'text-[15px]'
                      }`}
                    >
                      {feature.title}
                    </h3>
                    <p
                      className={`mt-2.5 leading-relaxed text-gray-500 ${
                        isHero
                          ? 'max-w-md text-sm'
                          : 'text-[13px]'
                      }`}
                    >
                      {feature.description}
                    </p>
                  </div>

                  {isHero && (
                    <div className="relative mt-6 flex flex-wrap items-center gap-2">
                      {['رد آلي 24/7', 'تكامل كتالوج واتساب', 'روابط دفع فورية'].map(
                        (chip) => (
                          <span
                            key={chip}
                            className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700"
                          >
                            {chip}
                          </span>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}