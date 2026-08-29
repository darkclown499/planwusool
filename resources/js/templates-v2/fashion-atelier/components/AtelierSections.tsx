import React, { useRef, useState, useEffect } from 'react';
import { Shirt, Sparkles, ShoppingBag, Gem, Baby, Footprints, ChevronLeft } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { useStorefrontCore } from '../../shared/hooks';

/* ===================================================================== */
/* Mid-page editorial blocks shared by the Atelier homepage.              */
/* ===================================================================== */

/* ------------------------------------------------------------------ */
/* Category circles — "تسوّق حسب احتياجك"                                */
/* ------------------------------------------------------------------ */

interface CategoryCircleItem {
  id: string;
  name: string;
  slug?: string;
  image?: string | null;
}

const CATEGORY_FALLBACK_ICONS: Array<{ test: RegExp; icon: React.ReactNode }> = [
  { test: /فستان|عباية|حجاب|ملابس|أزياء|موضة/i, icon: <Shirt className="h-6 w-6" /> },
  { test: /أطفال|طفل|بيبي|ولادي|بناتي/i, icon: <Baby className="h-6 w-6" /> },
  { test: /حقيبة|شنطة|bag/i, icon: <ShoppingBag className="h-6 w-6" /> },
  { test: /حذاء|شوز|foot|shoe/i, icon: <Footprints className="h-6 w-6" /> },
  { test: /اكسسوار|مجوهرات|ذهب|jewel|gem/i, icon: <Gem className="h-6 w-6" /> },
];

function getCategoryFallbackIcon(name: string): React.ReactNode {
  const hit = CATEGORY_FALLBACK_ICONS.find((c) => c.test.test(name));
  return hit?.icon ?? <Sparkles className="h-6 w-6" />;
}

export const AtelierCategoryCircles: React.FC<{ categories: CategoryCircleItem[] }> = ({ categories }) => {
  if (!categories || categories.length === 0) return null;
  let catHeading = 'تسوّق حسب احتياجك';
  try { const ctx = (useStorefrontCore as any)(); const raw = ctx?.content?.fashion_category_heading ?? ctx?.content?.fashion?.category_heading; if (typeof raw === 'string' && raw.trim()) catHeading = raw.trim(); } catch {}

  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [visible, setVisible] = useState(false);
  const initialScrollRef = useRef<number | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (initialScrollRef.current === null) initialScrollRef.current = el.scrollLeft;
      if (Math.abs(el.scrollLeft - initialScrollRef.current) > 8) setHasScrolled(true);
    };
    initialScrollRef.current = el.scrollLeft;
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  // subtle reveal on mount
  useEffect(() => { const t = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(t); }, []);

  return (
    <section className="pt-3 pb-4 sm:py-6" dir="rtl">
      <style>{`@media(prefers-reduced-motion:reduce){.atelier-cat{transition:none!important}}`}</style>
      <div className="mx-auto max-w-7xl px-0 sm:px-6 lg:px-8">
        <div className={`mb-3 sm:mb-7 text-center px-4 sm:px-0 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} motion-reduce:transition-none`}>
          <span className="mx-auto mb-2.5 block h-px w-10 bg-[#b08d57]" />
          <h2 className="font-serif text-[19px] font-semibold tracking-wide text-stone-900 sm:text-2xl sm:font-bold">{catHeading}</h2>
          {!hasScrolled && categories.length > 3 && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium tracking-wide text-stone-500">
              اسحب للمزيد
              <ChevronLeft className="h-3 w-3" />
            </p>
          )}
        </div>
        <div className="relative">
          <div
            ref={scrollRef}
            className="overflow-x-auto overflow-y-hidden pb-2 snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 lg:scroll-px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex w-max gap-3 sm:gap-5 px-4 sm:px-0 justify-start sm:justify-center after:content-[''] after:block after:w-8 after:shrink-0 sm:after:hidden">
            {categories.slice(0, 12).map((c, idx) => (
              <a
                key={c.id}
                href={`/category/${c.slug || c.id}`}
                className={`atelier-cat group flex w-[78px] shrink-0 snap-start flex-col items-center sm:w-[88px] transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.97] motion-reduce:transition-none ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                style={{ transitionDelay: visible ? `${idx * 22}ms` : '0ms' } as any}
              >
                <span className="relative block h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full bg-[#fffdf9] ring-1 ring-stone-200/40 shadow-[0_1px_6px_rgba(40,30,20,0.06)] transition-all duration-200 group-hover:shadow-[0_4px_14px_rgba(40,30,20,0.08)] group-hover:ring-stone-200/60 sm:h-[76px] sm:w-[76px] aspect-square">
                  {c.image ? (
                    <img src={getImageUrl(c.image)} alt={c.name} loading="lazy" className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f3ece4] to-[#e7d8c9] text-[#9d7463]" aria-hidden>
                      {getCategoryFallbackIcon(c.name)}
                    </span>
                  )}
                </span>
                <span className="mt-2 flex min-h-[32px] w-full max-w-[76px] items-center justify-center break-words text-center text-[11px] font-medium leading-[1.35] text-stone-700 transition-colors group-hover:text-[#9d7463] line-clamp-2 sm:max-w-[84px] sm:text-[11.5px] sm:leading-[1.35]">{c.name}</span>
              </a>
            ))}
            </div>
          </div>
          {!hasScrolled && categories.length > 3 && (
            <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-8 bg-gradient-to-l from-[#faf7f2] via-[#faf7f2]/50 to-transparent sm:hidden max-[430px]:block" aria-hidden />
          )}
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/* Lookbook split — two tall editorial banners with copy               */
/* ------------------------------------------------------------------ */

interface LookbookPanel {
  eyebrow?: string;
  title?: string;
  cta_text?: string;
  cta_link?: string;
  image?: string;
}

export const AtelierLookbook: React.FC<{ panels: [LookbookPanel?, LookbookPanel?] }> = ({ panels }) => {
  const defaults: LookbookPanel[] = [
    { eyebrow: 'كولكشن', title: 'الموسم الجديد', cta_text: 'استكشف التشكيلة', cta_link: '#atelier-new' },
    { eyebrow: 'الأكثر طلباً', title: 'قطع مميزة', cta_text: 'تسوّق الآن', cta_link: '#atelier-best' },
  ];
  const [a, b] = [panels[0] || defaults[0], panels[1] || defaults[1]];

  const Panel = ({ p, flip }: { p: LookbookPanel; flip: boolean }) => (
    <a href={p.cta_link || '#'} className="group relative block h-[380px] overflow-hidden sm:h-[460px]">
      <img src={getImageUrl(p.image || '')} alt="" className="h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-[1.05]" />
      <div className={`absolute inset-0 ${flip ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-black/55 via-black/15 to-transparent`} />
      <div className={`absolute inset-y-0 ${flip ? 'left-0 pl-6' : 'right-0 pr-6'} flex max-w-xs flex-col justify-center`}>
        {p.eyebrow && <p className="mb-2 text-[11px] font-bold tracking-[0.25em] text-[#e8cfa8]">{p.eyebrow}</p>}
        <h3 className="font-serif text-3xl font-bold leading-snug text-white">{p.title}</h3>
        {p.cta_text && (
          <span className="mt-4 inline-flex w-fit items-center gap-2 border-b border-white/60 pb-1 text-sm font-semibold text-white transition-all group-hover:border-[#e8cfa8] group-hover:text-[#e8cfa8]">
            {p.cta_text} ←
          </span>
        )}
      </div>
    </a>
  );

  return (
    <section className="grid grid-cols-1 gap-1 py-1 md:grid-cols-2" dir="rtl">
      <Panel p={a} flip={false} />
      <Panel p={b} flip />
    </section>
  );
};
