import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
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
  QrCode,
  Smartphone,
  Share2,
  Users,
  Lock,
  Wifi,
  Heart,
  Star,
  Sparkles,
  ArrowLeft,
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

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  store: Store,
  palette: Palette,
  'bar-chart': BarChart3,
  'qr-code': QrCode,
  smartphone: Smartphone,
  share: Share2,
  globe: Globe,
  shield: Shield,
  star: Star,
  zap: Zap,
  users: Users,
  lock: Lock,
  wifi: Wifi,
  heart: Heart,
  bot: Bot,
  calculator: Calculator,
  truck: Truck,
};

const DEFAULT_FEATURES = [
  {
    icon: 'store',
    title: 'متجر ذكي',
    description: 'متجرك الإلكتروني يرسل طلبات العملاء عبر واتساب برسالة معبأة آلياً بكل التفاصيل، متكامل مع كتالوج منتجاتك وبوابات دفع آمنة متعددة.',
  },
  {
    icon: 'palette',
    title: 'تصميم احترافي قابل للتخصيص',
    description: 'اختر من بين عشرات القوالب الاحترافية وعدّلها بالكامل لتتناسب مع هوية متجرك.',
  },
  {
    icon: 'bar-chart',
    title: 'لوحة تحكم شاملة',
    description: 'تتبع مبيعاتك وسلوك عملائك ونمو متجرك في الوقت الحقيقي من مكان واحد.',
  },
  {
    icon: 'zap',
    title: 'أداء فائق وسريع',
    description: 'بنية تحتية محسّنة تضمن تصفحاً سلساً وتحميلاً فورياً لصفحات متجرك.',
  },
  {
    icon: 'globe',
    title: 'دعم متعدد اللغات والـ RTL',
    description: 'وصول لعملائك بلغتهم مع دعم كامل للعربية والإنجليزية والتخطيط من اليمين لليسار.',
  },
  {
    icon: 'shield',
    title: 'أمان على مستوى المؤسسات',
    description: 'تشفير على مستوى البنوك والامتثال الكامل لمعايير الأمان في كل معاملة.',
  },
  {
    icon: 'bot',
    title: 'ذكاء اصطناعي مدمج',
    description: 'مساعد ذكاء اصطناعي مدمج يساعدك على توليد المحتوى والرد على الاستفسارات مباشرة من لوحة التحكم.',
  },
  {
    icon: 'calculator',
    title: 'نظام محاسبة متكامل',
    description: 'إدارة الضرائب والفواتير (بما فيها نسخ PDF) وإحصائيات الإيرادات، مع إمكانية الربط بنظامك المحاسبي الخارجي.',
  },
  {
    icon: 'truck',
    title: 'حلول توصيل متكاملة',
    description: 'تحديد مناطق الشحن والتكاليف وطريقة التسليم (شخصية أو عبر شركة موصيّة) مع خيار إظهار حالة التتبع.',
  },
];

const CARD_PALETTE = [
  { color: '#16a34a', gradient: 'from-emerald-500 to-green-600' },
  { color: '#2563eb', gradient: 'from-blue-500 to-indigo-600' },
  { color: '#9333ea', gradient: 'from-purple-500 to-violet-600' },
  { color: '#d97706', gradient: 'from-amber-500 to-orange-600' },
  { color: '#0891b2', gradient: 'from-cyan-500 to-teal-600' },
  { color: '#dc2626', gradient: 'from-red-500 to-rose-600' },
  { color: '#7c3aed', gradient: 'from-violet-500 to-purple-600' },
  { color: '#0284c7', gradient: 'from-sky-500 to-blue-600' },
  { color: '#ea580c', gradient: 'from-orange-500 to-red-500' },
];

const HERO_CHIPS = ['سريع', 'ذكي', 'منظم', 'دعم متعدد العمولات'];

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

function hexToRgba(hex: string, alpha: number): string {
  let h = (hex || '').replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(h, 16);
  if (isNaN(num)) {
    return `rgba(16, 183, 127, ${alpha})`;
  }
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function FeaturesSection({
  brandColor = '#10b77f',
  sectionData,
}: FeaturesSectionProps) {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation();

  const rawFeatures =
    sectionData.features_list && sectionData.features_list.length > 0
      ? sectionData.features_list
      : DEFAULT_FEATURES;

  const features = rawFeatures.map((feature, index) => {
    const IconComp =
      ICON_MAP[(feature.icon || '').toLowerCase()] || ICON_MAP.store || Store;
    const palette = CARD_PALETTE[index % CARD_PALETTE.length];
    return {
      ...feature,
      IconComp,
      color: palette.color,
      gradient: palette.gradient,
    };
  });

  const hero = features[0];
  const HeroIcon = hero.IconComp;
  const rest = features.slice(1);

  const gridClass = 'md:col-span-2 md:row-span-2';

  return (
    <section
      id="features"
      className="relative overflow-hidden bg-slate-50 py-20 text-slate-900 sm:py-28"
      style={{ fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}
      ref={ref}
    >
      <style>{BENTO_CSS}</style>
      {/* Subtle light mesh dots */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] opacity-70 [background-size:20px_20px]"
      />
      {/* Ambient emerald radial glow spheres */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-emerald-200/40 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute right-0 top-1/3 h-96 w-96 rounded-full bg-emerald-200/40 blur-[120px]" />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: hexToRgba(brandColor, 0.08) }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(${hexToRgba(brandColor, 0.14)} 1px, transparent 1px)`,
          backgroundSize: '34px 34px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 72%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 72%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ─── Section Header ─── */}
        <div
          className={`mx-auto max-w-2xl text-center transition-all duration-700 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}
        >
          <span className="mb-4 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
            المميزات
          </span>
          <h2 className="mx-auto mt-3 mb-2 text-center text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
            {sectionData.title || (
              <>
                كل ما تحتاجه لإطلاق{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(to left, ${brandColor}, #7c3aed)`,
                  }}
                >
                  متجرك
                </span>
              </>
            )}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-center text-base font-normal text-slate-600 sm:text-lg">
            {sectionData.description ||
              'منصة وصول تمنحك كل الأدوات اللازمة لإنشاء وإدارة متجر واتساب احترافي ومتكامل.'}
          </p>
        </div>

        {/* ─── Bento Grid ─── */}
        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {/* ═══ Hero tile — rich content ═══ */}
          <div
            className={`bento-card ${isVisible ? 'on' : ''} ${gridClass}`}
            style={{ transitionDelay: '0.15s' }}
          >
            <div
              className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-white via-emerald-50/50 to-white p-8 text-slate-900 shadow-xl transition-all duration-300"
            >
              {/* Decor */}
              <div
                className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full blur-3xl"
                style={{ background: hexToRgba(brandColor, 0.18) }}
              />
              <div
                className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full opacity-70 blur-3xl"
                style={{ background: hexToRgba(brandColor, 0.12) }}
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: `radial-gradient(${hexToRgba(brandColor, 0.5)} 1px, transparent 1px)`,
                  backgroundSize: '18px 18px',
                }}
              />

              {/* Content */}
              <div className="relative">
                <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold tracking-wide text-emerald-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  متوفر الآن
                </span>
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${brandColor}, ${hexToRgba(brandColor, 0.75)})`,
                    boxShadow: `0 16px 40px -10px ${hexToRgba(brandColor, 0.5)}`,
                  }}
                >
                  <HeroIcon className="h-8 w-8 text-white" strokeWidth={1.8} />
                </div>
                <h3 className="mt-6 text-2xl font-extrabold leading-snug text-slate-900 sm:text-[1.65rem]">
                  {hero.title}
                </h3>
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-slate-600">
                  {hero.description}
                </p>
              </div>

              {/* Bottom block */}
              <div className="relative mt-auto pt-8">
                <div className="flex flex-wrap gap-2">
                  {HERO_CHIPS.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                <Link
                  href={route('register')}
                  className="mt-7 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-emerald-700"
                >
                  ابدأ متجرك مجاناً
                  <ArrowLeft size={16} />
                </Link>
              </div>
            </div>
          </div>

          {/* ═══ Regular cards ═══ */}
          {rest.map((feature, index) => {
            const Icon = feature.IconComp;
            return (
              <div
                key={index}
                className={`bento-card ${isVisible ? 'on' : ''}`}
                style={{ transitionDelay: `${0.2 + index * 0.08}s` }}
              >
                <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-xl">
                  <div className="relative flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shadow-sm transition-all duration-300 group-hover:bg-emerald-500 group-hover:text-white">
                        <Icon className="h-5 w-5" strokeWidth={1.9} />
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-600">
                        {String(index + 2).padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="mt-4 text-[15px] font-extrabold leading-snug text-slate-900">
                      {feature.title}
                    </h3>
                    <p className="mt-2.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── More features strip ─── */}
        <div
          className={`mt-12 text-center transition-all duration-700 delay-300 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <Button
            type="button"
            variant="outline"
            className="group gap-2 rounded-full border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-md transition-all hover:border-emerald-500/40 hover:bg-slate-100"
            onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <Sparkles size={16} className="text-emerald-600" />
            ومميزات أكثر تكتشفها بنفسك
            <ArrowLeft size={16} className="transition-transform duration-300 group-hover:-translate-x-1" />
          </Button>
        </div>
      </div>
    </section>
  );
}
