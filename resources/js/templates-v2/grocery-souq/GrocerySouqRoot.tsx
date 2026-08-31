import React, { useMemo } from 'react';
import { router } from '@inertiajs/react';
import { PackageSearch } from 'lucide-react';
import type { TemplateRootProps } from '../types';
import { createSafeHtml } from '@/utils/xss-protection';
import { getImageUrl } from '@/utils/image-helper';
import { useStorefrontCore } from '../shared/hooks';
import { useHomepageSettings } from '../shared/CategorySections';
import { SouqDealsRail, SouqHeader, SouqHero, SouqProductCard, SouqStickyCartBar } from './SouqComponents';
import { souqOverlays } from './SouqOverlays';

/* ===================================================================== */
/* سوق البقالة — Grocery Souq                                             */
/* A deal-driven supermarket: green header with inline live search,       */
/* category chip rail, flash-deal countdowns, dense product grid with     */
/* instant add steppers and a sticky mobile cart bar.                     */
/* ===================================================================== */

const SORTS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'الأرخص أولاً' },
  { value: 'price_desc', label: 'الأغلى أولاً' },
  { value: 'name', label: 'أبجدياً' },
];

export const GrocerySouqRoot: React.FC<TemplateRootProps> = ({ storeData, mode, page, categoryData }) => {
  if (mode === 'category') return <SouqCategoryMode categoryData={categoryData} storeData={storeData} />;
  if (mode === 'page') {
    return (
      <div dir="rtl" className="min-h-screen bg-[#FDF9F1]">
        <SouqHeader />
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="mb-6 border-b border-black/5 pb-3 text-2xl font-black text-stone-900">{page?.title}</h1>
          <article className="prose-custom2" dangerouslySetInnerHTML={createSafeHtml(page?.content || '')} />
        </main>
      </div>
    );
  }
  return <SouqHome storeData={storeData} />;
};

const byPriceAsc = (a: any, b: any) => Number(a.price) - Number(b.price);
const byPriceDesc = (a: any, b: any) => Number(b.price) - Number(a.price);
const byName = (a: any, b: any) => String(a.name).localeCompare(String(b.name), 'ar');

const SouqHome: React.FC<{ storeData: any }> = ({ storeData }) => {
  const { product } = useStorefrontCore();
  const products: any[] = product?.products || storeData?.products || [];
  const categories: any[] = product?.categories || storeData?.categories || [];
  const banners: any[] = storeData?.content?.banners || [];

  const { showLatest, showBest, homepageCategories, productsPerCategory } = useHomepageSettings(storeData);

  // Truthful latest — products already desc by created_at from ThemeController
  const fresh = useMemo(() => [...products].slice(0, 14), [products]);
  const pantry = useMemo(() => [...products].sort(byPriceAsc).slice(0, 10), [products]);

  // Category wall scalable: initial limit, expand via [عرض جميع الأقسام]
  const [catsExpanded, setCatsExpanded] = React.useState(false);
  const CATS_INITIAL = 12;
  const visibleCats = catsExpanded ? categories : categories.slice(0, CATS_INITIAL);

  return (
    <div dir="rtl" className="min-h-screen bg-[#FDF9F1] text-stone-800 antialiased">
      <SouqHeader />
      <main>
        <SouqHero banners={banners} />

        {/* Category gallery — premium balanced (5-col desktop, centered last row, RTL swipe on mobile) */}
        {categories.length > 0 && (
          <section className="mx-auto max-w-[1600px] px-3 py-5 lg:px-6" dir="rtl">
            {/* Coherent section header: title + subdued count inline */}
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-black tracking-tight text-stone-900 lg:text-[16px]">التصنيفات</h2>
              <span className="inline-flex shrink-0 items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-bold leading-none text-stone-600 ring-1 ring-black/5">
                {categories.length === 1 ? 'قسم واحد' : `${categories.length} أقسام`}
              </span>
            </div>
            {/* Mobile: horizontal RTL swipe rail with peek, smooth scroll, no horizontal page overflow */}
            <div
              className="flex gap-3 overflow-x-auto overflow-y-hidden pb-2 md:hidden snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain"
              style={{ scrollbarWidth: 'none' } as any}
            >
              {visibleCats.map((c: any) => (
                <a
                  key={c.id}
                  href={`/category/${c.slug || c.id}`}
                  className="group flex w-[108px] shrink-0 snap-start flex-col overflow-hidden rounded-[16px] bg-white p-1.5 shadow-sm ring-1 ring-black/5 transition-colors duration-200 hover:ring-black/10 sm:w-[120px]"
                >
                  <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[12px] bg-[#F5F5F4]">
                    {c.image ? (
                      <img
                        src={getImageUrl(c.image || '')}
                        alt={c.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = getImageUrl(c.image || ''); }}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-[11px] font-black text-stone-600">{String(c.name).slice(0,2)}</span>
                    )}
                  </span>
                  <span className="flex min-h-[36px] items-center justify-center px-1.5 py-2 text-center text-xs font-bold leading-tight text-stone-700 line-clamp-2 group-hover:text-stone-900">{c.name}</span>
                </a>
              ))}
            </div>
            {/* Desktop/Tablet: balanced premium gallery — flex-wrap centered so last row never sticks to one side */}
            <div className="hidden md:flex flex-wrap justify-center gap-3">
              {visibleCats.map((c: any) => (
                <a
                  key={c.id}
                  href={`/category/${c.slug || c.id}`}
                  className="group flex flex-col overflow-hidden rounded-[16px] bg-white p-1.5 shadow-sm ring-1 ring-black/[0.06] transition-all duration-200 hover:shadow-md hover:ring-black/10
                    w-[calc((100%-24px)/3)] lg:w-[calc((100%-36px)/4)] xl:w-[calc((100%-48px)/5)]"
                >
                  <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[12px] bg-[#F5F5F4]">
                    {c.image ? (
                      <img
                        src={getImageUrl(c.image || '')}
                        alt={c.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-300 will-change-transform group-hover:scale-[1.03]"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = getImageUrl(c.image || ''); }}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-xs font-black text-stone-600">{String(c.name).slice(0,2)}</span>
                    )}
                  </span>
                  <span className="flex min-h-[38px] items-center justify-center px-2 py-2 text-center text-[13px] font-bold leading-tight text-stone-700 line-clamp-2 group-hover:text-stone-900">{c.name}</span>
                </a>
              ))}
            </div>
            {categories.length > CATS_INITIAL && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setCatsExpanded((v) => !v)}
                  className="rounded-full border border-black/10 bg-white px-5 py-2 text-xs font-black text-stone-700 transition hover:bg-black hover:text-white"
                >
                  {catsExpanded ? 'عرض أقل' : `عرض جميع الأقسام (${categories.length})`}
                </button>
              </div>
            )}
          </section>
        )}

        <SouqDealsRail products={products} />

        {/* Truthful sections — neutral titles, real latest */}
        {showLatest && (
          <section className="mx-auto max-w-[1600px] px-3 pb-6 lg:px-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-black text-stone-900">وصل حديثاً</h2>
              <span className="text-xs text-stone-500">{fresh.length} منتج</span>
            </div>
            <div className="grid auto-rows-fr grid-cols-2 items-stretch gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {fresh.map((p) => (
                <SouqProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Pantry — renamed to truthful selected */}
        {showBest && pantry.length > 0 && (
          <section className="bg-white py-6">
            <div className="mx-auto max-w-[1600px] px-3 lg:px-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-black text-stone-900">منتجات مختارة</h2>
                <span className="text-xs text-stone-500">{pantry.length} منتج</span>
              </div>
              <div className="grid auto-rows-fr grid-cols-2 items-stretch gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {pantry.map((p) => (
                  <SouqProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Dynamic category sections — sparse-aware */}
        {homepageCategories.length > 0 && (
          <div className="space-y-6 bg-white py-6">
            {homepageCategories.map((catId: string) => {
              const cat = categories.find((c: any) => String(c.id) === String(catId));
              if (!cat) return null;
              const catProducts = products.filter((p: any) => String(p.categoryId ?? p.category_id) === String(cat.id)).slice(0, productsPerCategory);
              if (!catProducts.length) return null;
              const sparse = catProducts.length <= 3;
              return (
                <section key={cat.id} className="mx-auto max-w-[1600px] px-3 lg:px-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-black text-stone-900">{cat.name}</h2>
                    <a href={`/category/${cat.slug || cat.id}`} className="text-xs font-bold text-stone-600 hover:text-black">عرض الكل ←</a>
                  </div>
                  {sparse ? (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                      {catProducts.map((p: any) => (
                        <div key={p.id} className="w-[48%] shrink-0 snap-start sm:w-[32%] md:w-[28%] lg:w-[22%] xl:w-[18%]">
                          <SouqProductCard product={p} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid auto-rows-fr grid-cols-2 items-stretch gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {catProducts.map((p: any) => (
                        <SouqProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
      <SouqStickyCartBar />
    </div>
  );
};

const SouqCategoryMode: React.FC<{ categoryData?: any | null; storeData?: any }> = ({ categoryData, storeData }) => {
  const { product } = useStorefrontCore();
  const products = useMemo(() => {
    const list: any[] = [...(product?.products || [])];
    switch (categoryData?.sort) {
      case 'price_asc': return list.sort(byPriceAsc);
      case 'price_desc': return list.sort(byPriceDesc);
      case 'name': return list.sort(byName);
      default: return list;
    }
  }, [product?.products, categoryData?.sort]);

  const cat = categoryData?.category;
  if (!cat) return null;

  const navigate = (next: Record<string, any>) => {
    router.get(window.location.pathname, next, { preserveScroll: true, preserveState: true });
  };

  // All categories for top pill bar (Biddi style horizontal scroll)
  const allCategories: any[] = (product?.categories || storeData?.categories || []).slice(0, 30);

  return (
    <div dir="rtl" className="min-h-screen bg-[#FDF9F1] text-stone-800 antialiased">
      <SouqHeader />
      <main className="mx-auto max-w-[1600px] px-3 py-4 lg:px-6">
        {/* Biddi-like horizontal category icon bar */}
        {allCategories.length > 0 && (
          <div className="scrollbar-none -mx-3 mb-4 flex gap-2 overflow-x-auto px-3 pb-2 lg:mx-0 lg:px-0">
            <a href="/" className="flex shrink-0 flex-col items-center gap-1">
              <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#FFC20E] text-xs font-black text-black shadow-sm">الكل</span>
              <span className="text-xs font-bold text-black">الكل</span>
            </a>
            {allCategories.map((c: any) => {
              const active = String(c.id) === String(cat.id) || String(c.slug) === String(cat.slug);
              return (
                <a key={c.id} href={`/category/${c.slug || c.id}`} className="flex shrink-0 flex-col items-center gap-1">
                  <span className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px] shadow-sm ring-1 ${active ? 'bg-[#FFC20E] ring-[#FFC20E] text-black' : 'bg-white ring-black/5'}`}>
                    {c.image ? <img src={c.image} alt={c.name} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 text-xs font-black text-stone-600">{String(c.name).slice(0,2)}</span>}
                  </span>
                  <span className={`max-w-[64px] truncate text-xs ${active ? 'font-black text-black' : 'font-semibold text-stone-600'}`}>{c.name}</span>
                </a>
              );
            })}
          </div>
        )}

        <nav className="mb-3 flex items-center gap-1.5 text-xs text-stone-500" aria-label="مسار التنقل">
          <a href="/" className="font-bold hover:text-black">الرئيسية</a>
          <span>/</span>
          <span className="font-black text-stone-800">{cat.name}</span>
          <span className="ms-auto rounded-full bg-white px-2 py-1 text-xs font-bold text-stone-600 ring-1 ring-black/5">{categoryData.total ?? products.length} نتيجة</span>
        </nav>
        <header className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-stone-900 lg:text-2xl">{cat.name}</h1>
            <p className="mt-1 text-xs text-stone-500">{categoryData.total} منتج متوفر</p>
          </div>
          <select
            value={categoryData.sort || 'newest'}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold focus:border-[#FFC20E] focus:outline-none focus:ring-1 focus:ring-[#FFC20E]"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </header>

        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <PackageSearch className="h-12 w-12 text-stone-300" />
            <p className="text-lg font-bold text-stone-600">ما في منتجات بهذا القسم حالياً</p>
            <a href="/" className="rounded-full bg-[#0F1620] px-6 py-2.5 text-sm font-black text-white hover:bg-black">تصفح باقي الأقسام</a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {products.map((p: any) => (
                <SouqProductCard key={p.id} product={p} />
              ))}
            </div>
            {categoryData.lastPage > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-1.5">
                {Array.from({ length: categoryData.lastPage }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => navigate({ page: n })}
                    className={`h-9 min-w-9 rounded-full px-2 text-sm font-black transition ${
                      n === categoryData.currentPage ? 'bg-[#0F1620] text-white shadow' : 'bg-white text-stone-600 ring-1 ring-black/5 hover:bg-[#FFC20E] hover:text-black'
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
      <SouqStickyCartBar />
    </div>
  );
};

export default GrocerySouqRoot;

// Overlay set re-exported for the module definition.
export { souqOverlays };
