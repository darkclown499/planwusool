import React, { useMemo } from 'react';
import { router } from '@inertiajs/react';
import { ChevronLeft, PackageSearch } from 'lucide-react';
import type { TemplateRootProps } from '../types';
import { useStorefrontCore } from '../shared/hooks';
import { AnnouncementBar } from './components/AnnouncementBar';
import { AtelierHeader } from './components/AtelierHeader';
import { AtelierHero } from './components/AtelierHero';
import { AtelierRail } from './components/AtelierRail';
import { AtelierProductCard } from './components/AtelierProductCard';
import { AtelierCategoryCircles, AtelierLookbook } from './components/AtelierSections';

/* ===================================================================== */
/* Fashion Atelier — أتيليه الموضة                                        */
/*                                                                        */
/* An editorial boutique storefront for fashion/hijab/clothing stores.    */
/* Warm ivory palette, serif display type, portrait photography with      */
/* hover angle-swap and April-style inline quick-add. Every pixel here is */
/* owned by this template — nothing renders through a generic pipeline.   */
/* ===================================================================== */

const SORTS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر: من الأقل للأعلى' },
  { value: 'price_desc', label: 'السعر: من الأعلى للأقل' },
  { value: 'name', label: 'أبجدياً' },
];

const byNewest = (a: any, b: any) => String(b.id).localeCompare(String(a.id), undefined, { numeric: true });
const byPriceAsc = (a: any, b: any) => Number(a.price) - Number(b.price);
const byPriceDesc = (a: any, b: any) => Number(b.price) - Number(a.price);
const byName = (a: any, b: any) => String(a.name).localeCompare(String(b.name), 'ar');

export const FashionAtelierRoot: React.FC<TemplateRootProps> = ({ storeData, mode, page, categoryData }) => {
  if (mode === 'category') {
    return <AtelierCategoryMode storeData={storeData} categoryData={categoryData} />;
  }
  if (mode === 'page') {
    return <AtelierPageMode storeData={storeData} page={page} />;
  }
  return <AtelierHome storeData={storeData} />;
};

/* ------------------------------ Home ------------------------------ */

const AtelierHome: React.FC<{ storeData: any }> = ({ storeData }) => {
  const { product } = useStorefrontCore();
  const products: any[] = product?.products || storeData?.products || [];
  const categories: any[] = product?.categories || storeData?.categories || [];
  const banners: any[] = storeData?.content?.banners || [];

  const newest = useMemo(() => [...products].sort(byNewest).slice(0, 14), [products]);
  const bestsellers = useMemo(() => {
    const discounted = products.filter((p) => p.originalPrice && Number(p.originalPrice) > Number(p.price));
    return (discounted.length >= 4 ? discounted : [...products].sort(byNewest).reverse()).slice(0, 10);
  }, [products]);

  const lookbookA = banners[1] || banners[0];
  const lookbookB = banners[2] || banners[banners.length - 1];

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf7f2] text-stone-800 antialiased">
      <AnnouncementBar />
      <AtelierHeader />
      <main>
        <AtelierHero
          slides={(banners.length > 0 ? banners : []).map((b) => ({
            title: b.title,
            subtitle: b.subtitle,
            image: b.image,
            button_text: b.button_text,
            button_link: b.button_link,
          }))}
        />

        <AtelierCategoryCircles categories={categories} />

        <div id="atelier-new">
          <AtelierRail title="وصل حديثاً" subtitle="أحدث القطع التي انضمت للأتيليه" products={newest} viewAllHref="/products" />
        </div>

        {(lookbookA || lookbookB) && (
          <AtelierLookbook
            panels={[
              lookbookA && { eyebrow: 'كولكشن', title: lookbookA.title || 'الموسم الجديد', cta_text: 'شاهدي التشكيلة', cta_link: '#atelier-new', image: lookbookA.image },
              lookbookB && { eyebrow: 'مختارات', title: lookbookB.title || 'قطع لا تُقاوم', cta_text: 'تسوقي الآن', cta_link: '#atelier-best', image: lookupImage(lookbookB) },
            ]}
          />
        )}

        <div id="atelier-best" className="bg-white">
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <span className="mb-2 block h-px w-10 bg-[#b08d57]" />
                <h2 className="font-serif text-2xl font-bold text-stone-900 sm:text-3xl">الأكثر مبيعاً</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:gap-x-5 lg:grid-cols-5">
              {bestsellers.map((p) => (
                <AtelierProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        </div>

      </main>
    </div>
  );
};

function lookupImage(banner: any): string | undefined {
  return banner?.image;
}

/* ---------------------------- Category ---------------------------- */

const AtelierCategoryMode: React.FC<{ storeData: any; categoryData?: any | null }> = ({ categoryData }) => {
  const { product } = useStorefrontCore();
  const products = useMemo(() => {
    const list: any[] = product?.products || [];
    return categoryData ? [...list].sort(sortFor(categoryData.sort)) : list;
  }, [product?.products, categoryData?.sort]);

  const cat = categoryData?.category;
  if (!cat) return null;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(`شاهدي قسم "${cat.name}" في المتجر: ${shareUrl}`)}`;

  const navigate = (next: Record<string, any>) => {
    router.get(window.location.pathname, next, { preserveScroll: true, preserveState: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#faf7f2] text-stone-800 antialiased">
      <AnnouncementBar />
      <AtelierHeader homeHref="/" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-1.5 text-[13px] text-stone-500" aria-label="مسار التنقل">
          <a href="/" className="transition hover:text-[#9d7463]">الرئيسية</a>
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="font-semibold text-stone-800">{cat.name}</span>
        </nav>

        {/* Heading */}
        <header className="mb-8 border-b border-stone-200 pb-6 text-center">
          <h1 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl">{cat.name}</h1>
          {!!cat.description && <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-stone-500">{cat.description}</p>}
          <p className="mt-2 text-xs tracking-wide text-stone-400">
            {categoryData.total} قطعة متوفرة ·{' '}
            <a href={whatsappShare} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-[#9d7463]">
              شاركي القسم عبر واتساب
            </a>
          </p>
        </header>

        {/* Sort */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-stone-700">ترتيب حسب:</span>
          <select
            value={categoryData.sort}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 focus:border-[#9d7463] focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <PackageSearch className="h-12 w-12 text-stone-300" />
            <p className="text-lg font-semibold text-stone-600">لا توجد قطع في هذا القسم بعد</p>
            <a href="/" className="rounded-full bg-[#9d7463] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#85604f]">
              تصفحي بقية الأتيليه
            </a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:gap-x-5 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((p: any) => (
                <AtelierProductCard key={p.id} product={p} />
              ))}
            </div>

            {categoryData.lastPage > 1 && (
              <nav className="mt-12 flex items-center justify-center gap-1.5" aria-label="ترقيم الصفحات">
                {Array.from({ length: categoryData.lastPage }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => navigate({ page: n })}
                    aria-current={n === categoryData.currentPage ? 'page' : undefined}
                    className={`h-9 min-w-9 rounded-full px-2 text-sm font-semibold transition ${
                      n === categoryData.currentPage
                        ? 'bg-stone-900 text-white'
                        : 'border border-stone-300 text-stone-600 hover:border-[#9d7463] hover:text-[#9d7463]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
};

function sortFor(sort: string): (a: any, b: any) => number {
  switch (sort) {
    case 'price_asc': return byPriceAsc;
    case 'price_desc': return byPriceDesc;
    case 'name': return byName;
    default: return (a, b) => 0; // server order (newest/paginated)
  }
}

/* --------------------------- Custom page --------------------------- */

const AtelierPageMode: React.FC<{ storeData: any; page?: any | null }> = ({ page }) => (
  <div dir="rtl" className="min-h-screen bg-[#faf7f2] text-stone-800 antialiased">
    <AnnouncementBar />
    <AtelierHeader homeHref="/" />
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {page?.title && (
        <h1 className="mb-6 border-b border-stone-200 pb-4 font-serif text-3xl font-bold text-stone-900">{page.title}</h1>
      )}
      <article className="prose-custom2" dangerouslySetInnerHTML={{ __html: page?.content || '' }} />
    </main>
  </div>
);

export default FashionAtelierRoot;
