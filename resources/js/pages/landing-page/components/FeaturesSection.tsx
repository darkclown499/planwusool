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
  MessageCircle,
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
    description: 'متجرك الإلكتروني يرسل طلبات العملاء عبر واتساب برسالة معبأة آلياً بكل التفاصيل، متكامل مع كتالوج منتجاتك وبوابات دفع آمنة متعددة.',
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
    description: 'مساعد ذكاء اصطناعي مدمج يساعدك على توليد المحتوى والرد على الاستفسارات مباشرة من لوحة التحكم.',
    color: '#7c3aed',
    gradient: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
  },
  {
    icon: Calculator,
    title: 'نظام محاسبة متكامل',
    description: 'إدارة الضرائب والفواتير (بما فيها نسخ PDF) وإحصائيات الإيرادات، مع إمكانية الربط بنظامك المحاسبي الخارجي.',
    color: '#0284c7',
    gradient: 'from-sky-500 to-blue-600',
    bgLight: 'bg-sky-50',
  },
  {
    icon: Truck,
    title: 'حلول توصيل متكاملة',
    description: 'تحديد مناطق الشحن والتكاليف وطريقة التسليم (شخصية أو عبر شركة موصيّة) مع خيار إظهار حالة التتبع.',
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
  .typing-dot {
    animation: typingBounce 1.3s ease-in-out infinite;
  }
  .typing-dot:nth-child(2) {
    animation-delay: 0.15s;
  }
  .typing-dot:nth-child(3) {
    animation-delay: 0.3s;
  }
  @keyframes typingBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
    30% { transform: translateY(-3px); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .bento-card {
      opacity: 1 !important;
      transform: none !important;
    }
    .typing-dot {
      animation: none !important;
      opacity: 0.8;
    }
  }
`;

const chatBubbles = [
  { type: 'customer', text: 'السلام عليكم، عندكم مقاس L؟' },
  {
    type: 'bot',
    product: true,
    name: 'حذاء رياضي — مقاس L',
    price: '120 ر.س',
    note: 'متوفر الآن — اطلبه بضغطة واحدة',
  },
  {
    type: 'bot',
    text: 'يصل طلبك للتاجر برسالة واتساب جاهزة بكل التفاصيل',
    action: 'أكمل الطلب عبر واتساب',
  },
];

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
                  className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-7 ${
                    isHero
                      ? 'border-emerald-800/50 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 hover:shadow-emerald-900/30'
                      : 'border-gray-200 bg-white shadow-sm hover:border-gray-300 hover:shadow-gray-200/60'
                  }`}
                >
                  {/* Decor */}
                  {isHero ? (
                    <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 opacity-15 blur-2xl" />
                  ) : (
                    <div
                      className={`pointer-events-none absolute -top-12 -left-12 h-40 w-40 rounded-full bg-gradient-to-br ${feature.gradient} opacity-[0.1] blur-2xl transition-opacity duration-500 group-hover:opacity-[0.18]`}
                    />
                  )}

                  {isHero ? (
                    /* ═══ Hero tile — dark Store + chat preview ═══ */
                    <div className="relative flex h-full flex-col items-center gap-8 md:flex-row md:items-center">
                      {/* Content */}
                      <div className="flex-1">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} ring-1 ring-white/40 shadow-lg transition-transform duration-300 group-hover:scale-110`}
                          style={{ boxShadow: `0 12px 28px -8px ${feature.color}99` }}
                        >
                          <Icon className="h-6 w-6 text-white" strokeWidth={1.9} />
                        </div>
                        <h3 className="mt-5 text-xl font-extrabold leading-snug text-white">
                          {feature.title}
                        </h3>
                        <p className="mt-3 max-w-md text-sm leading-relaxed text-emerald-100/85">
                          {feature.description}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-2">
                          {['أطلب عبر واتساب', 'كتالوج منتجاتك', 'بوابات دفع آمنة'].map(
                            (chip) => (
                              <span
                                key={chip}
                                className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-emerald-50"
                              >
                                {chip}
                              </span>
                            )
                          )}
                        </div>
                      </div>

                      {/* Chat preview */}
                      <div className="w-full max-w-[300px] shrink-0 rounded-2xl border border-white/15 bg-white/10 p-3.5 shadow-lg backdrop-blur-md md:w-[300px]">
                        <div className="flex items-center gap-2 rounded-xl rounded-br-sm border-b border-white/10 pb-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 text-[11px] font-black text-white">
                            و
                          </span>
                          <div className="flex-1">
                            <p className="text-[11px] font-bold leading-tight text-white">
                              متجر وصول
                            </p>
                            <p className="text-[9.5px] text-emerald-200">متصل الآن</p>
                          </div>
                          <MessageCircle className="h-3.5 w-3.5 text-white/50" />
                        </div>

                        <div className="mt-3 space-y-2">
                          {chatBubbles.map((b, bi) =>
                            b.type === 'customer' ? (
                              <div
                                key={bi}
                                className="max-w-[85%] rounded-xl rounded-tr-sm bg-white/15 px-3 py-1.5 text-[10.5px] leading-relaxed text-white"
                              >
                                {b.text}
                              </div>
                            ) : b.product ? (
                              <div
                                key={bi}
                                className="max-w-[92%] rounded-xl rounded-tl-sm bg-emerald-500 px-2.5 py-2 text-white shadow-lg shadow-emerald-900/40"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/20">
                                    <Store className="h-4 w-4 text-white" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-[10px] font-bold">{b.name}</p>
                                    <p className="text-[10px] font-semibold text-white/95">
                                      {b.price}
                                    </p>
                                  </div>
                                </div>
                                <p className="mt-1.5 text-[9.5px] text-white/80">{b.note}</p>
                              </div>
                            ) : (
                              <div
                                key={bi}
                                className="max-w-[92%] rounded-xl rounded-tl-sm bg-emerald-500 px-3 py-2 text-white shadow-lg shadow-emerald-900/40"
                              >
                                <p className="text-[10px] leading-relaxed text-white/90">
                                  {b.text}
                                </p>
                                <div className="mt-1.5 w-fit rounded-lg bg-white px-3 py-1 text-[10px] font-bold text-emerald-600">
                                  {b.action} ←
                                </div>
                              </div>
                            )
                          )}
                        </div>

                        <div className="mt-3 flex w-fit items-center gap-1 rounded-full bg-white/10 px-2.5 py-1.5">
                          <span className="typing-dot h-1 w-1 rounded-full bg-emerald-200" />
                          <span className="typing-dot h-1 w-1 rounded-full bg-emerald-200" />
                          <span className="typing-dot h-1 w-1 rounded-full bg-emerald-200" />
                          <span className="ms-1 text-[9px] text-white/70">يكتب…</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ═══ Regular cards ═══ */
                    <div className="relative">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.gradient} ring-1 ring-white/50 shadow-lg transition-transform duration-300 group-hover:scale-110`}
                        style={{ boxShadow: `0 10px 26px -6px ${feature.color}66` }}
                      >
                        <Icon className="h-5 w-5 text-white" strokeWidth={1.9} />
                      </div>
                      <h3 className="mt-4 text-[15px] font-extrabold leading-snug text-gray-900">
                        {feature.title}
                      </h3>
                      <p className="mt-2.5 text-[13px] leading-relaxed text-gray-500">
                        {feature.description}
                      </p>
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