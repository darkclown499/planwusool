import React from 'react';
import { Shirt, Sparkles, ShoppingBag, Gem, Baby, Footprints } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';

/* ===================================================================== */
/* Mid-page editorial blocks shared by the Atelier homepage.              */
/* ===================================================================== */

/* ------------------------------------------------------------------ */
/* Category circles — "تسوقي حسب الفئة"                                */
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
  let catHeading = 'تسوقي حسب الفئة';
  try { const ctx = (useStorefrontCore as any)(); const raw = ctx?.content?.fashion_category_heading ?? ctx?.content?.fashion?.category_heading; if (typeof raw === 'string' && raw.trim()) catHeading = raw.trim(); } catch {}

  return (
    <section className="py-10 sm:py-12" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 block h-px w-10 bg-[#b08d57]" />
          <h2 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">{catHeading}</h2>
        </div>
        <div className="overflow-x-auto overflow-y-hidden pb-3 snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 lg:scroll-px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max min-w-full gap-4 sm:gap-5 justify-start sm:justify-center">
          {categories.slice(0, 12).map((c) => (
            <a
              key={c.id}
              href={`/category/${c.slug || c.id}`}
              className="group flex w-[88px] shrink-0 snap-start flex-col items-center gap-3 sm:w-[104px]"
            >
              <span className="relative block h-[88px] w-[88px] shrink-0 overflow-hidden rounded-full bg-stone-50 ring-1 ring-stone-200 transition-all duration-300 group-hover:ring-[#9d7463] group-hover:ring-offset-2 group-hover:ring-offset-white sm:h-[104px] sm:w-[104px]">
                {c.image ? (
                  <img src={getImageUrl(c.image)} alt={c.name} loading="lazy" className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f3ece4] to-[#e7d8c9] text-[#9d7463]" aria-hidden>
                    {getCategoryFallbackIcon(c.name)}
                  </span>
                )}
              </span>
              <span className="w-full max-w-[80px] break-words text-center text-xs font-medium leading-tight text-stone-700 transition-colors group-hover:text-[#9d7463] line-clamp-2">{c.name}</span>
            </a>
          ))}
          </div>
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
    { eyebrow: 'كولكشن', title: 'الموسم الجديد', cta_text: 'شاهدي التشكيلة', cta_link: '#atelier-new' },
    { eyebrow: 'الأكثر طلباً', title: 'قطع لا تُقاوم', cta_text: 'تسوقي الآن', cta_link: '#atelier-best' },
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
