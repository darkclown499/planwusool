import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, Minus, Plus, ShoppingBag, ShoppingCart, Timer, Truck, Weight } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useScrollAnimation } from '../../../hooks/useScrollAnimation';

/**
 * Niche Themes Showcase
 * ---------------------
 * Interactive tabs presenting the three schema-driven Theme Engine niches
 * (market-fast / fashion-luxe / fresh-produce). Each tab renders a CSS mobile
 * mock-up that simulates the niche's signature UX (sticky cart, quick variant
 * pickers, side drawer, weight calculator, delivery slots) plus a "live demo"
 * CTA pointing to the pre-configured demo store URL for that theme.
 *
 * Visual language follows the light SaaS system: slate canvas, frosted glass
 * cards (backdrop-blur), slate-200 borders, emerald ambient glows and Tajawal.
 */

type NicheId = 'market-fast' | 'fashion-luxe' | 'fresh-produce';

export const NICHE_DEMO_BASE = 'https://demo.wusool.ps';

interface Niche {
  id: NicheId;
  label: string;
  emoji: string;
  color: string;
  gradient: string;
  title: string;
  tagline: string;
  highlights: string[];
  demoLabel: string;
}

const NICHES: Niche[] = [
  {
    id: 'market-fast',
    label: 'السوبر ماركت والبقالة',
    emoji: '🛒',
    color: '#059669',
    gradient: 'from-emerald-600 to-green-700',
    title: 'طلبات سريعة بدون احتكاك',
    tagline: 'سلة عائمة تعرض الإجمالي لحظياً، وإضافة بالكميات مباشرة من بطاقة المنتج.',
    highlights: [
      'شريط سلة سفلي ثابت يعرض الإجمالي وعدد القطع أثناء التصفح',
      'إضافة بالكميات + / − (bulk add) دون فتح صفحة المنتج',
      'أشرطة أقسام لاصقة تسرّع الانتقال بين أقسام المتجر',
    ],
    demoLabel: 'تصفح متجر السوبر ماركت التجريبي',
  },
  {
    id: 'fashion-luxe',
    label: 'الأزياء والموضة الفاخرة',
    emoji: '👗',
    color: '#e11d48',
    gradient: 'from-rose-500 to-pink-600',
    title: 'تجربة تسوّق غامرة بحس فاخر',
    tagline: 'هيرو فيديو كامل مع منتقي مقاسات وألوان فوري، وسلة جانبية منزلقة.',
    highlights: [
      'هيرو فيديو يحرّك الهوية البصرية للمتجر',
      'منتقي حجم ولون فوري (المقاس/اللون) بداخل البطاقة',
      'سلة جانبية منزلقة مع شريط تقدم الشحن المجاني',
    ],
    demoLabel: 'تصفح متجر الأزياء التجريبي',
  },
  {
    id: 'fresh-produce',
    label: 'المنتجات الطازجة واللحوم',
    emoji: '🥬',
    color: '#65a30d',
    gradient: 'from-lime-500 to-green-600',
    title: 'بيع بالوزن وشحن مظبوط',
    tagline: 'آلة حاسبة مباشرة للأوزان (كغ / جم / قطعة) مع مواعيد توصيل محددة.',
    highlights: [
      'حاسبة وزن حية تحوّل السعر حسب الوحدة المختارة (كغ/جم/رطل/قطعة)',
      'سلة سريعة بنافذة منبثقة لإتمام الطلب الظرفي',
      'منتقي مواعيد التوصيل داخل السلة مع تحقق برسالة نصية',
    ],
    demoLabel: 'تصفح متجر المنتجات الطازجة التجريبي',
  },
];

const NICHE_CSS = `
  .niche-tab-panel { animation: nicheFade 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) both; }
  @keyframes nicheFade {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .phone-screen-in { animation: phoneIn 0.7s cubic-bezier(0.2, 0.8, 0.3, 1) both; }
  @keyframes phoneIn {
    from { opacity: 0; transform: translateY(22px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .bar-slide-up { animation: barSlideUp 0.8s 0.35s cubic-bezier(0.2, 0.8, 0.3, 1) both; }
  @keyframes barSlideUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .stepper-pop { animation: stepperPop 0.5s 0.55s ease both; }
  @keyframes stepperPop {
    0% { opacity: 0; transform: scale(0.6); }
    70% { transform: scale(1.08); }
    100% { opacity: 1; transform: scale(1); }
  }
  .drawer-slide { animation: drawerSlide 0.8s 0.35s cubic-bezier(0.2, 0.8, 0.3, 1) both; }
  @keyframes drawerSlide {
    from { opacity: 0; transform: translateX(34px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .hero-fade-in { animation: heroFade 1s 0.15s ease both; }
  @keyframes heroFade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .slot-blink { animation: slotBlink 2.4s 0.7s ease-in-out infinite; }
  @keyframes slotBlink {
    0%, 100% { box-shadow: 0 0 0 0 rgba(101, 163, 13, 0.35); }
    50% { box-shadow: 0 0 0 6px rgba(101, 163, 13, 0.08); }
  }
  .soft-bounce { animation: softBounce 2.6s ease-in-out infinite; }
  @keyframes softBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .niche-tab-panel, .phone-screen-in, .bar-slide-up, .stepper-pop,
    .drawer-slide, .hero-fade-in, .slot-blink, .soft-bounce {
      animation: none !important;
    }
  }
`;

/* ──────────────────────────────────────────────────────────────── */
/* Phone mockups (pure CSS, per-niche simulated UX)                 */
/* ──────────────────────────────────────────────────────────────── */

const PhoneFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative mx-auto w-[270px] max-w-full select-none">
    {/* status bar */}
    <div className="flex items-center justify-between rounded-t-[2rem] bg-slate-900 px-6 pb-2 pt-3">
      <span className="h-2.5 w-8 rounded-full bg-slate-700" />
      <span className="h-1.5 w-16 rounded-full bg-slate-700" />
      <span className="h-2.5 w-4 rounded-full bg-emerald-400/80" />
    </div>
    <div className="overflow-hidden rounded-b-[2rem] border-x-[6px] border-b-[6px] border-slate-900 bg-slate-100">
      <div className="phone-screen-in relative h-[430px] w-full bg-white">{children}</div>
    </div>
  </div>
);

const MarketFastPhone: React.FC<{ color: string }> = ({ color }) => (
  <div className="flex h-full flex-col">
    {/* mini header */}
    <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] text-white" style={{ backgroundColor: color }}>🛒</span>
        <span className="text-[10px] font-extrabold text-slate-800">ماركت</span>
      </div>
      <div className="relative">
        <ShoppingCart className="h-4 w-4 text-slate-500" />
        <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ backgroundColor: color }}>3</span>
      </div>
    </div>

    {/* product card with inline + / − */}
    <div className="flex flex-1 flex-col justify-start gap-2 p-3">
      {[
        { emoji: '🍎', name: 'تفاح أحمر', price: '8.00' },
        { emoji: '🥛', name: 'حليب طبيعي 1ل', price: '11.00' },
      ].map((p) => (
        <div key={p.name} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-lg">{p.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-bold text-slate-800">{p.name}</p>
            <p className="text-[10px] font-extrabold" style={{ color }}>{p.price} ₪</p>
          </div>
          <div className="stepper-pop flex items-center gap-1 rounded-full bg-slate-50 p-0.5">
            <button type="button" aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-600 shadow-[0_1px_3px_rgba(15,23,42,0.12)]">
              <Minus className="h-2.5 w-2.5" />
            </button>
            <span className="text-[10px] font-extrabold text-slate-900">2</span>
            <button type="button" aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ backgroundColor: color }}>
              <Plus className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      ))}
    </div>

    {/* floating sticky bottom cart bar */}
    <div className="bar-slide-up border-t border-slate-100 bg-white/95 px-3 py-2 backdrop-blur">
      <div className="flex items-center justify-between rounded-xl px-3 py-2 text-white shadow-lg" style={{ backgroundColor: color }}>
        <div>
          <p className="text-[9px] font-semibold text-white/80">إجمالي السلة</p>
          <p className="text-sm font-extrabold">49.5 ₪</p>
        </div>
        <span className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold" style={{ color }}>
          إتمام الطلب السريع
        </span>
      </div>
    </div>
  </div>
);

const FashionLuxePhone: React.FC<{ color: string }> = ({ color }) => (
  <div className="relative flex h-full flex-col overflow-hidden">
    {/* looping-video hero feel */}
    <div className="relative flex h-[150px] items-end bg-gradient-to-br from-rose-500 via-pink-500 to-rose-700 px-3 pb-2.5">
      <div className="hero-fade-in">
        <span className="mb-1 inline-block rounded-full border border-white/30 px-2 py-0.5 text-[7px] font-bold uppercase tracking-[0.2em] text-white/85">أزياء · موضة</span>
        <p className="text-lg font-black leading-tight text-white">أناقة تليق بك</p>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:14px_14px]" aria-hidden="true" />
    </div>

    {/* product card with instant variant pickers */}
    <div className="flex flex-1 flex-col gap-1.5 p-3">
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-lg">👗</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-slate-800">فستان مسائي أنيق</p>
          <p className="text-[10px] font-extrabold" style={{ color }}>179 ₪</p>
        </div>
        <span className="rounded-md bg-slate-900 px-2 py-1 text-[8px] font-bold text-white">أضف</span>
      </div>
      {/* colour swatches */}
      <div className="flex items-center gap-1.5 px-1">
        {['#e11d48', '#f59e0b', '#0ea5e9', '#0f172a'].map((c, i) => (
          <span key={c} className="h-3.5 w-3.5 rounded-full border-2 border-white shadow" style={{ backgroundColor: c, outline: i === 0 ? `2px solid ${color}` : 'none', outlineOffset: 1 }} />
        ))}
        <span className="mr-auto text-[8px] font-semibold text-slate-500">اللون: عنابي</span>
      </div>
    </div>

    {/* slide-over side drawer with free-delivery progress */}
    <div className="drawer-slide absolute inset-y-0 left-0 w-[78%] border border-slate-200 bg-white/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between px-3 py-2 text-white" style={{ backgroundColor: color }}>
        <span className="flex items-center gap-1 text-[10px] font-extrabold"><ShoppingBag className="h-3 w-3" /> سلة التسوق</span>
        <span className="rounded-full bg-white/20 px-1.5 text-[8px] font-bold">3</span>
      </div>
      <div className="p-2.5">
        <div className="rounded-xl bg-emerald-50 px-2.5 py-2">
          <p className="flex items-center gap-1 text-[8px] font-bold text-emerald-800">
            <Truck className="h-3 w-3" /> أضف 21₪ للحصول على توصيل مجاني
          </p>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-emerald-200/70">
            <div className="h-full w-[86%] rounded-full bg-emerald-500" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-100 p-1.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-50 text-xs">👗</span>
          <div className="flex-1">
            <p className="text-[8px] font-bold text-slate-800">فستان مسائي · M</p>
            <p className="text-[8px] text-slate-400">179 ₪ × 1</p>
          </div>
          <span className="text-[9px] font-extrabold text-slate-900">179 ₪</span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-2.5">
        <button type="button" aria-hidden="true" className="w-full rounded-lg py-2 text-[10px] font-bold text-white" style={{ backgroundColor: color }}>إتمام الطلب</button>
      </div>
    </div>
  </div>
);

const FreshProducePhone: React.FC<{ color: string }> = ({ color }) => (
  <div className="flex h-full flex-col">
    {/* produce card */}
    <div className="flex flex-1 flex-col gap-2 p-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
        <div className="relative">
          <span className="flex h-16 w-full items-center justify-center rounded-xl bg-lime-50 text-3xl">🍅</span>
          <span className="slot-blink absolute right-2 top-2 rounded-full px-2 py-0.5 text-[8px] font-bold text-white" style={{ backgroundColor: color }}>
            طازج اليوم
          </span>
        </div>
        <p className="mt-2 text-[11px] font-bold text-slate-800">طماطم بلدية</p>
        <p className="text-[9px] font-semibold" style={{ color }}>السعر بالكيلو: 9.00 ₪</p>

        {/* weight unit calculator */}
        <div className="mt-2 flex items-center gap-1">
          {['كجم', 'جم', 'قطعة'].map((u, i) => (
            <button
              key={u}
              type="button"
              aria-hidden="true"
              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold transition-colors ${i === 0 ? 'text-white' : 'border-slate-200 text-slate-600'}`}
              style={i === 0 ? { backgroundColor: color, borderColor: color } : undefined}
            >
              {u}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[9px] font-bold text-slate-700">
            <Weight className="h-3 w-3 text-slate-400" /> 1.5 كجم
          </div>
          <span className="text-sm font-extrabold text-slate-900">13.50 ₪</span>
        </div>
      </div>

      {/* delivery slot selector */}
      <div className="flex items-center gap-2 rounded-xl border border-lime-200 bg-lime-50 px-2.5 py-2">
        <Timer className="h-3.5 w-3.5 shrink-0" style={{ color }} />
        <div className="flex-1">
          <p className="text-[8px] font-bold text-slate-700">اختر وقت التوصيل</p>
          <p className="text-[9px] font-extrabold" style={{ color }}>اليوم 12:00 – 15:00</p>
        </div>
        <span className="text-slate-400 text-[8px]">▾</span>
      </div>
    </div>

    {/* express checkout trigger */}
    <div className="border-t border-slate-100 px-3 py-2">
      <div className="flex items-center justify-between rounded-xl px-3 py-2 text-white shadow-lg" style={{ backgroundColor: color }}>
        <span className="text-[9px] font-semibold text-white/85">الإجمالي: 13.50 ₪</span>
        <span className="rounded-lg bg-white px-2.5 py-1.5 text-[9px] font-bold" style={{ color }}>متابعة لإتمام الطلب</span>
      </div>
    </div>
  </div>
);

/* ──────────────────────────────────────────────────────────────── */
/* Main section                                                     */
/* ──────────────────────────────────────────────────────────────── */

export default function NicheThemesSection({ brandColor = '#10b77f' }: { brandColor?: string }) {
  const { t } = useTranslation();
  const { ref, isVisible } = useScrollAnimation();
  const [activeId, setActiveId] = useState<NicheId>('market-fast');
  const active = NICHES.find((n) => n.id === activeId)!;

  // Re-trigger entrance animations every time the active tab changes.
  const [tabKey, setTabKey] = useState(0);
  useEffect(() => setTabKey((k) => k + 1), [activeId]);

  const demoUrl = `${NICHE_DEMO_BASE}/?theme=${active.id}&preview=1`;

  const renderPhone = () => {
    switch (active.id) {
      case 'market-fast':
        return <MarketFastPhone color={active.color} />;
      case 'fashion-luxe':
        return <FashionLuxePhone color={active.color} />;
      case 'fresh-produce':
        return <FreshProducePhone color={active.color} />;
    }
  };

  return (
    <section
      id="niche-themes"
      className="relative overflow-hidden bg-slate-50 py-20 text-slate-900 sm:py-28"
      style={{ fontFamily: 'Tajawal, sans-serif', direction: 'rtl' }}
      ref={ref}
    >
      <style>{NICHE_CSS}</style>

      {/* Ambient light backdrop (matches the design system) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] opacity-70 [background-size:20px_20px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-emerald-200/40 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute left-0 top-1/2 h-96 w-96 rounded-full bg-emerald-200/40 blur-[120px]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{ background: `rgba(16, 185, 129, 0.08)` }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ─── Section header ─── */}
        <div className={`mx-auto max-w-2xl text-center transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <span className="mb-4 inline-block rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
            قوالب النخبة
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
            قوالب مصممة{' '}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to left, ${brandColor}, #0f766e)` }}>
              خصيصاً لقطاعك
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base font-normal text-slate-600 sm:text-lg">
            ثلاثة محركات تنسيق ديناميكية جاهزة — السوبر ماركت، الأزياء، والمنتجات الطازجة — تشغّل جميعها نفس نظام الطلب والدفع الموحد.
          </p>
        </div>

        {/* ─── Tab bar ─── */}
        <div className={`mx-auto mt-10 flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-slate-200/80 bg-white/70 p-1.5 shadow-lg shadow-slate-900/5 backdrop-blur-xl transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`} role="tablist" aria-label="قوالب القطاعات">
          {NICHES.map((niche) => {
            const isActive = activeId === niche.id;
            return (
              <button
                key={niche.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveId(niche.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all duration-300 sm:px-5 ${isActive ? 'text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}
                style={isActive ? { background: `linear-gradient(135deg, ${niche.color}, ${niche.color})`, boxShadow: `0 10px 24px -8px ${niche.color}66` } : undefined}
              >
                <span aria-hidden="true">{niche.emoji}</span>
                {niche.label}
              </button>
            );
          })}
        </div>

        {/* ─── Active panel ─── */}
        <div key={tabKey} className="niche-tab-panel mx-auto mt-10 max-w-6xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/70 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
            <div className="grid gap-0 lg:grid-cols-[1.05fr_1fr]">
              {/* Phone mockup side */}
              <div
                className="relative flex items-center justify-center overflow-hidden p-8 sm:p-12"
                style={{
                  background: `radial-gradient(120% 120% at 50% 0%, ${active.color}14 0%, rgba(248,250,252,0) 52%), linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)`,
                }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-10 -top-10 h-52 w-52 rounded-full blur-3xl"
                  style={{ background: `${active.color}22` }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-[0.05]"
                  style={{ backgroundImage: `radial-gradient(${active.color} 1px, transparent 1px)`, backgroundSize: '20px 20px' }}
                />
                <div className="soft-bounce relative">{renderPhone()}</div>
              </div>

              {/* Details side */}
              <div className="flex flex-col justify-center gap-6 border-t border-slate-200/80 bg-white/60 p-8 sm:p-12 lg:border-r lg:border-t-0">
                <div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-l ${active.gradient} px-3 py-1 text-[10px] font-bold tracking-wide text-white shadow-md`}>
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    theme.config.json · {active.id}
                  </span>
                  <h3 className="mt-4 text-2xl font-black leading-snug text-slate-900 sm:text-3xl">{active.title}</h3>
                  <p className="mt-3 max-w-md text-[15px] leading-relaxed text-slate-600">{active.tagline}</p>
                </div>

                <ul className="space-y-3">
                  {active.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: active.color }} />
                      <span className="text-sm font-medium leading-relaxed text-slate-700">{highlight}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href={demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-l ${active.gradient} px-6 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02]`}
                    style={{ boxShadow: `0 16px 30px -10px ${active.color}66` }}
                  >
                    {active.demoLabel}
                    <ArrowLeft size={16} />
                  </a>
                  <span className="text-xs text-slate-400">يفتح في نافذة جديدة</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}