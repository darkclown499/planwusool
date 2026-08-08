import React, { useState } from 'react';
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

const hubLogo = '/images/logos/features-hub.png';
const toAsset = (path: string) =>
  `${window.appSettings?.baseUrl || window.location.origin}${path}`;

const HUB_URL = toAsset(hubLogo);

const FAN_CSS = `
  .feat-line {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    transition: stroke-dashoffset 1.1s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .feat-line.on {
    stroke-dashoffset: 0;
  }
  .feat-flow {
    stroke-dasharray: 0.02 0.045;
    stroke-dashoffset: 1;
    opacity: 0;
    transition: opacity 0.25s ease var(--flow-delay, 1.2s);
  }
  .feat-flow.on {
    opacity: 0.85;
    animation: featFlow 2.8s linear infinite var(--flow-delay, 1.2s);
  }
  @keyframes featFlow {
    from { stroke-dashoffset: 1; }
    to { stroke-dashoffset: -0.23; }
  }
  .node-card {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
    transition: opacity 0.55s ease, transform 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.15);
  }
  .node-card.on {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  .hub-halo {
    animation: hubPulse 5.5s ease-in-out infinite;
  }
  @keyframes hubPulse {
    0%, 100% { transform: scale(1); opacity: 0.55; }
    50% { transform: scale(1.14); opacity: 0.22; }
  }
  .radial-wrap:has(.node-card:hover) path[data-highlight] {
    stroke-opacity: 0.75;
    stroke-width: 2;
  }
  @media (prefers-reduced-motion: reduce) {
    .feat-line, .feat-flow, .node-card, .hub-halo {
      transition: none;
      animation: none;
      opacity: 1;
      stroke-dashoffset: 0;
    }
  }
`;

export default function FeaturesSection({
  sectionData,
  brandColor = '#3b82f6',
}: FeaturesSectionProps) {
  const { ref, isVisible } = useScrollAnimation();
  const [hubBroken, setHubBroken] = useState(false);

  const count = features.length;
  const startAngle = -Math.PI / 2;
  const step = (Math.PI * 2) / count;
  const RX = 38;
  const RY = 39;

  const nodes = features.map((feature, i) => {
    const angle = startAngle + step * i;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
      ...feature,
      index: i,
      left: 50 + RX * cos,
      top: 50 + RY * sin,
      path: `M 50 50 C ${50 + RX * 0.3 * cos} ${50 + RY * 0.3 * sin}, ${
        50 + RX * 0.62 * cos
      } ${50 + RY * 0.62 * sin}, ${50 + RX * cos} ${50 + RY * sin}`,
    };
  });

  return (
    <section
      id="features"
      className="relative overflow-hidden py-20 sm:py-28 lg:py-36"
      style={{ fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}
      ref={ref}
    >
      <style>{FAN_CSS}</style>
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

        {/* ═══ Radial fan — Desktop ═══ */}
        <div className="radial-wrap relative mx-auto mt-6 hidden h-[880px] max-w-6xl lg:block">
          {/* ─── Spokes ─── */}
          <svg
            className="absolute inset-0 z-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {nodes.map((node) => (
              <g key={node.index}>
                <path
                  d={node.path}
                  pathLength={1}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  stroke={node.color}
                  strokeWidth={1.3}
                  strokeOpacity={0.22}
                  className={`feat-line ${isVisible ? 'on' : ''}`}
                  data-highlight={node.index}
                  style={{ transitionDelay: `${0.35 + node.index * 0.14}s` }}
                />
                <path
                  d={node.path}
                  pathLength={1}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  stroke={node.color}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  className={`feat-flow ${isVisible ? 'on' : ''}`}
                  data-highlight={node.index}
                  style={
                    {
                      transitionDelay: `${0.35 + node.index * 0.14}s`,
                      '--flow-delay': `${1.35 + node.index * 0.14}s`,
                    } as React.CSSProperties
                  }
                />
              </g>
            ))}
          </svg>

          {/* ─── Hub logo ─── */}
          <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
            <div
              className="hub-halo absolute -inset-8 rounded-full"
              style={{
                background: `radial-gradient(circle, ${brandColor}66 0%, ${brandColor}22 45%, transparent 70%)`,
                filter: 'blur(14px)',
              }}
            />
            <div
              className="relative flex h-[176px] w-[176px] items-center justify-center rounded-full"
              style={{
                background: 'radial-gradient(circle at 32% 26%, #1b2a4a, #070d1c)',
                boxShadow: `0 0 0 10px ${brandColor}1f, 0 30px 70px -25px rgba(2, 6, 23, 0.6), 0 0 70px ${brandColor}4d`,
              }}
            >
              <div className="pointer-events-none absolute inset-1.5 rounded-full border border-white/10" />
              <div className="pointer-events-none absolute inset-0 rounded-full border border-white/5" />
              {hubBroken ? (
                <span className="bg-gradient-to-br from-white to-gray-300 bg-clip-text text-6xl font-black text-transparent">
                  و
                </span>
              ) : (
                <img
                  src={HUB_URL}
                  alt="وصول"
                  className="h-20 w-auto max-w-[128px] object-contain"
                  onError={() => setHubBroken(true)}
                />
              )}
            </div>
          </div>

          {/* ─── Feature cards ─── */}
          {nodes.map((node) => {
            const Icon = node.icon;
            return (
              <div
                key={node.index}
                className={`node-card group absolute z-10 w-[232px] ${
                  isVisible ? 'on' : ''
                }`}
                style={{
                  left: `${node.left}%`,
                  top: `${node.top}%`,
                  transitionDelay: `${0.5 + node.index * 0.14}s`,
                }}
              >
                <div className="cursor-default rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-gray-300 group-hover:shadow-lg group-hover:shadow-gray-200/60">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${node.gradient} ring-1 ring-white/50`}
                      style={{ boxShadow: `0 6px 18px -4px ${node.color}55` }}
                    >
                      <Icon className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-[13px] font-extrabold leading-snug text-gray-900">
                      {node.title}
                    </h3>
                  </div>
                  <p className="mt-2.5 text-[11px] leading-[1.65] text-gray-500">
                    {node.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ Branching list — Mobile ═══ */}
        <div className="lg:hidden">
          {/* Mini hub */}
          <div className="relative mx-auto mt-12 flex h-28 w-28 items-center justify-center rounded-full">
            <div
              className="hub-halo absolute -inset-5 rounded-full"
              style={{
                background: `radial-gradient(circle, ${brandColor}66 0%, transparent 70%)`,
                filter: 'blur(12px)',
              }}
            />
            <div
              className="relative flex h-28 w-28 items-center justify-center rounded-full"
              style={{
                background: 'radial-gradient(circle at 32% 26%, #1b2a4a, #070d1c)',
                boxShadow: `0 0 0 8px ${brandColor}1f, 0 20px 50px -20px rgba(2, 6, 23, 0.6), 0 0 50px ${brandColor}4d`,
              }}
            >
              <div className="pointer-events-none absolute inset-1.5 rounded-full border border-white/10" />
              {hubBroken ? (
                <span className="bg-gradient-to-br from-white to-gray-300 bg-clip-text text-4xl font-black text-transparent">
                  و
                </span>
              ) : (
                <img
                  src={HUB_URL}
                  alt="وصول"
                  className="h-9 w-auto max-w-[72px] object-contain"
                  onError={() => setHubBroken(true)}
                />
              )}
            </div>
          </div>

          {/* Connector rail + rows */}
          <div className="relative mx-auto mt-10 max-w-md space-y-4 ps-8">
            <span className="absolute bottom-2 start-[15px] top-2 w-px border-s-2 border-dashed border-gray-200" />
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`relative transition-all duration-500 ${
                    isVisible
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-6 opacity-0'
                  }`}
                  style={{ transitionDelay: `${0.1 + index * 0.07}s` }}
                >
                  <span
                    className="absolute -start-7 top-5 h-2.5 w-2.5 rounded-full ring-2 ring-white"
                    style={{
                      background: feature.color,
                      boxShadow: `0 0 10px ${feature.color}88`,
                    }}
                  />
                  <div className="cursor-default rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} ring-1 ring-white/50`}
                        style={{ boxShadow: `0 6px 18px -4px ${feature.color}55` }}
                      >
                        <Icon className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                      </div>
                      <h3 className="text-sm font-extrabold leading-snug text-gray-900">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-500">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
