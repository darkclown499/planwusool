import React, { useLayoutEffect, useRef, useState } from 'react';
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
  .feat-arrow {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    transition: stroke-dashoffset 0.7s cubic-bezier(0.3, 0.55, 0.2, 1);
  }
  .feat-arrow.on {
    stroke-dashoffset: 0;
  }
  .node-card {
    opacity: 0;
    transform: translateY(14px) scale(0.7);
    transition: opacity 0.35s ease, transform 0.5s cubic-bezier(0.34, 1.45, 0.44, 1);
  }
  .node-card.on {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  @media (prefers-reduced-motion: reduce) {
    .feat-arrow, .feat-arrow.on {
      transition: none !important;
      stroke-dashoffset: 0 !important;
    }
    .node-card, .node-card.on {
      transition: none !important;
      opacity: 1 !important;
      transform: none !important;
    }
  }
`;

interface ArtBox {
  l: number;
  r: number;
  t: number;
  b: number;
}

interface Metrics {
  w: number;
  h: number;
  logo: {
    cx: number;
    cy: number;
    hw: number;
    hh: number;
    art: ArtBox;
  } | null;
  cards: { cx: number; top: number }[] | null;
}

interface Arrow {
  id: number;
  color: string;
  path: string;
  sx: number;
  sy: number;
}

function scanArtwork(img: HTMLImageElement): ArtBox | null {
  try {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    let minX = c.width;
    let minY = c.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (data[(y * c.width + x) * 4 + 3] > 25) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    return { l: minX, r: maxX + 1, t: minY, b: maxY + 1 };
  } catch {
    return null;
  }
}

export default function FeaturesSection({
  sectionData,
}: FeaturesSectionProps) {
  const { ref, isVisible } = useScrollAnimation();
  const [hubBroken, setHubBroken] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const artCache = useRef<ArtBox | null | undefined>(undefined);
  const measureRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const wr = el.getBoundingClientRect();
      let logo: Metrics['logo'] = null;
      const im = logoRef.current;
      if (im && im.clientWidth > 0 && im.clientHeight > 0) {
        const lr = im.getBoundingClientRect();
        const artN = artCache.current === undefined ? scanArtwork(im) : artCache.current;
        if (artCache.current === undefined) artCache.current = artN;
        const scale = lr.width / im.naturalWidth;
        const art: ArtBox = artN
          ? {
              l: lr.left - wr.left + artN.l * scale,
              r: lr.left - wr.left + artN.r * scale,
              t: lr.top - wr.top + artN.t * scale,
              b: lr.top - wr.top + artN.b * scale,
            }
          : {
              l: lr.left - wr.left + 2,
              r: lr.right - wr.left - 2,
              t: lr.top - wr.top + 2,
              b: lr.bottom - wr.top - 2,
            };
        logo = {
          cx: lr.left - wr.left + lr.width / 2,
          cy: lr.top - wr.top + lr.height / 2,
          hw: lr.width / 2,
          hh: lr.height / 2,
          art,
        };
      }
      const cards = cardRefs.current.map((c) => {
        if (!c) return null;
        const cr = c.getBoundingClientRect();
        return { cx: cr.left - wr.left + cr.width / 2, top: cr.top - wr.top };
      });
      setMetrics((prev) => {
        const next = {
          w: el.clientWidth,
          h: el.clientHeight,
          logo,
          cards: cards.every(Boolean) ? (cards as { cx: number; top: number }[]) : null,
        };
        const same =
          prev &&
          Math.abs(prev.w - next.w) < 1 &&
          Math.abs(prev.h - next.h) < 1 &&
          prev.logo === null === (next.logo === null) &&
          prev.cards?.length === next.cards?.length &&
          next.cards?.every(
            (c, i) => Math.abs(c.cx - (prev.cards as { cx: number }[])[i].cx) < 1
          );
        return same ? prev : next;
      });
    };
    measure();
    measureRef.current = measure;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const arrows: Arrow[] = metrics?.logo && metrics.cards
    ? features.map((f, i) => {
        const art = metrics.logo!.art;
        const span = art.r - art.l;
        const frac = i / (features.length - 1) - 0.5;
        const sx = art.l + (0.5 + frac) * span;
        const sy = art.b + 4;
        const ex = metrics.cards![i].cx;
        const ey = metrics.cards![i].top + 6;
        const bend = (i % 2 === 0 ? 1 : -1) * Math.min(16, Math.abs(ex - sx) * 0.08);
        const mx = (sx + ex) / 2 + bend;
        const my = (sy + ey) / 2 - 8;
        return {
          id: i,
          color: f.color,
          path: `M ${sx} ${sy} Q ${mx} ${my}, ${ex} ${ey}`,
          sx,
          sy,
        };
      })
    : [];

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

        {/* ═══ Fountain — Desktop ═══ */}
        <div
          ref={wrapRef}
          className="radial-wrap relative mx-auto mt-10 hidden max-w-6xl lg:block"
        >
          {/* ─── Arrows ─── */}
          {metrics && (
            <svg
              className="absolute inset-0 z-0 h-full w-full"
              viewBox={`0 0 ${metrics.w} ${metrics.h}`}
              aria-hidden="true"
            >
              <defs>
                {arrows.map((a) => (
                  <marker
                    key={a.id}
                    id={`arr-${a.id}`}
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto"
                  >
                    <path d="M 0.8 0.8 L 9.2 5 L 0.8 9.2 z" fill={a.color} />
                  </marker>
                ))}
              </defs>
              {arrows.map((a) => (
                <g key={a.id}>
                  <circle
                    cx={a.sx}
                    cy={a.sy}
                    r="4"
                    fill={a.color}
                    opacity="0.25"
                    className={isVisible ? '' : 'opacity-0'}
                  />
                  <circle
                    cx={a.sx}
                    cy={a.sy}
                    r="1.8"
                    fill={a.color}
                    className={isVisible ? '' : 'opacity-0'}
                  />
                  <path
                    d={a.path}
                    pathLength={1}
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                    stroke={a.color}
                    strokeWidth={1.6}
                    strokeOpacity={0.85}
                    strokeLinecap="round"
                    markerEnd={`url(#arr-${a.id})`}
                    className={`feat-arrow ${isVisible ? 'on' : ''}`}
                    style={{ transitionDelay: `${0.15 + a.id * 0.13}s` }}
                  />
                </g>
              ))}
            </svg>
          )}

          {/* ─── Logo — plain, on top of arrow exits ─── */}
          <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
            {hubBroken ? (
              <span className="text-3xl font-black text-gray-900">وصول</span>
            ) : (
              <img
                ref={logoRef}
                src={HUB_URL}
                alt="وصول"
                className="h-auto w-[420px] max-w-full object-contain"
                onError={() => setHubBroken(true)}
                onLoad={() => measureRef.current()}
              />
            )}
          </div>

          {/* ─── Feature cards — 3×3 grid, pop when arrow arrives ─── */}
          <div className="mt-[196px] grid grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  className={`node-card group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/60 ${
                    isVisible ? 'on' : ''
                  }`}
                  style={{ transitionDelay: `${0.95 + index * 0.13}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} ring-1 ring-white/50`}
                      style={{ boxShadow: `0 6px 18px -4px ${feature.color}55` }}
                    >
                      <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                    </div>
                    <h3 className="text-[15px] font-extrabold leading-snug text-gray-900">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-gray-500">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ Branching list — Mobile ═══ */}
        <div className="lg:hidden">
          {/* Logo — plain, nothing behind it */}
          <div
            className={`relative mx-auto mt-12 flex justify-center transition-all duration-700 ${
              isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            {hubBroken ? (
              <span className="text-2xl font-black text-gray-900">وصول</span>
            ) : (
              <img
                src={HUB_URL}
                alt="وصول"
                className="h-auto w-[200px] object-contain"
                onError={() => setHubBroken(true)}
              />
            )}
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