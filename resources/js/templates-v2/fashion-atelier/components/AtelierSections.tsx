import React from 'react';
import { CreditCard, Headphones, ShieldCheck, Truck } from 'lucide-react';
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

export const AtelierCategoryCircles: React.FC<{ categories: CategoryCircleItem[] }> = ({ categories }) => {
  if (!categories || categories.length === 0) return null;

  return (
    <section className="border-y border-stone-200/70 bg-white py-12 sm:py-16" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-3 block h-px w-10 bg-[#b08d57]" />
          <h2 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">تسوقي حسب الفئة</h2>
        </div>
        <div className="-mx-2 flex snap-x gap-5 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center">
          {categories.slice(0, 10).map((c) => (
            <a
              key={c.id}
              href={`/category/${c.slug || c.id}`}
              className="group flex w-[88px] shrink-0 snap-start flex-col items-center gap-3 sm:w-[104px]"
            >
              <span className="relative block h-[88px] w-[88px] overflow-hidden rounded-full ring-1 ring-stone-200 transition-all duration-300 group-hover:ring-[#9d7463] group-hover:ring-offset-2 group-hover:ring-offset-white sm:h-[104px] sm:w-[104px]">
                {c.image ? (
                  <img src={getImageUrl(c.image)} alt={c.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f3ece4] to-[#e7d8c9] font-serif text-xl text-[#9d7463]">
                    {c.name.charAt(0)}
                  </span>
                )}
              </span>
              <span className="line-clamp-1 text-[13px] font-medium text-stone-700 transition-colors group-hover:text-[#9d7463]">{c.name}</span>
            </a>
          ))}
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

/* ------------------------------------------------------------------ */
/* Trust strip — the four quiet promises above the footer              */
/* ------------------------------------------------------------------ */

const TRUST_ITEMS = [
  { icon: Truck, title: 'توصيل سريع', text: 'لجميع المناطق خلال أيام' },
  { icon: CreditCard, title: 'دفع آمن', text: 'خيارات دفع متعددة عند الاستلام' },
  { icon: ShieldCheck, title: 'جودة مضمونة', text: 'فحص كل قطعة قبل الشحن' },
  { icon: Headphones, title: 'خدمة شخصية', text: 'نجيب على استفساراتك عبر واتساب' },
];

export const AtelierTrustStrip: React.FC = () => (
  <section className="border-t border-stone-200/70 bg-[#f3ece4]/60 py-10" dir="rtl">
    <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
      {TRUST_ITEMS.map(({ icon: Icon, title, text }) => (
        <div key={title} className="flex items-start gap-3">
          <span className="mt-0.5 rounded-full bg-white p-2.5 shadow-sm ring-1 ring-stone-200/80">
            <Icon className="h-4 w-4 text-[#9d7463]" strokeWidth={1.8} />
          </span>
          <span>
            <span className="block text-sm font-bold text-stone-800">{title}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-stone-500">{text}</span>
          </span>
        </div>
      ))}
    </div>
  </section>
);
