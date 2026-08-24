import React, { useMemo } from 'react';
import { router } from '@inertiajs/react';
import { PackageSearch } from 'lucide-react';
import type { TemplateRootProps } from '../types';
import { useStorefrontCore } from '../shared/hooks';
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
  if (mode === 'category') return <SouqCategoryMode categoryData={categoryData} />;
  if (mode === 'page') {
    return (
      <div dir="rtl" className="min-h-screen bg-[#f7f8f5]">
        <SouqHeader />
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="mb-6 border-b border-stone-200 pb-3 text-2xl font-black text-stone-900">{page?.title}</h1>
          <article className="prose-custom2" dangerouslySetInnerHTML={{ __html: page?.content || '' }} />
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

  const fresh = useMemo(() => [...products].slice(-14).reverse(), [products]);
  const pantry = useMemo(() => [...products].sort(byPriceAsc).slice(0, 10), [products]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#f7f8f5] text-stone-800 antialiased">
      <SouqHeader />
      <main>
        <SouqHero banners={banners} />

        {/* Category tiles */}
        {categories.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3 lg:grid-cols-8">
              {categories.slice(0, 8).map((c: any) => (
                <a key={c.id} href={`/category/${c.slug || c.id}`} className="group flex flex-col items-center gap-1.5 rounded-xl bg-white p-2 shadow-sm ring-1 ring-stone-100 transition hover:-translate-y-0.5 hover:shadow-md sm:gap-2 sm:p-2.5">
                  <span className="h-12 w-12 overflow-hidden rounded-full bg-[#f0fdf4] ring-2 ring-transparent transition group-hover:ring-[#16a34a] sm:h-14 sm:w-14">
                    {c.image ? (
                      <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-lg sm:text-xl">🥬</span>
                    )}
                  </span>
                  <span className="line-clamp-1 text-center text-[11px] font-bold text-stone-700 group-hover:text-[#16a34a]">{c.name}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <SouqDealsRail products={products} />

        {/* Fresh arrivals */}
        <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-xl font-black text-stone-900">وصل طازج اليوم 🥕</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:gap-4">
            {fresh.map((p) => (
              <SouqProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* Pantry essentials */}
        {pantry.length > 0 && (
          <section className="bg-white py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <h2 className="mb-4 text-xl font-black text-stone-900">أساسيات المؤونة 🏺</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:gap-4">
                {pantry.map((p) => (
                  <SouqProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <SouqStickyCartBar />
    </div>
  );
};

const SouqCategoryMode: React.FC<{ categoryData?: any | null }> = ({ categoryData }) => {
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

  return (
    <div dir="rtl" className="min-h-screen bg-[#f7f8f5] text-stone-800 antialiased">
      <SouqHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-4 flex items-center gap-1.5 text-sm text-stone-500" aria-label="مسار التنقل">
          <a href="/" className="font-semibold hover:text-[#16a34a]">الرئيسية</a>
          <span>/</span>
          <span className="font-black text-stone-800">{cat.name}</span>
        </nav>
        <header className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-stone-900">{cat.name}</h1>
            <p className="mt-1 text-sm text-stone-500">{categoryData.total} منتج متوفر</p>
          </div>
          <select
            value={categoryData.sort}
            onChange={(e) => navigate({ sort: e.target.value })}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-bold focus:border-[#16a34a] focus:outline-none"
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
            <a href="/" className="rounded-full bg-[#16a34a] px-6 py-2.5 text-sm font-black text-white hover:bg-[#15803d]">تصفح باقي الأقسام</a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:gap-4">
              {products.map((p: any) => (
                <SouqProductCard key={p.id} product={p} />
              ))}
            </div>
            {categoryData.lastPage > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-1.5">
                {Array.from({ length: categoryData.lastPage }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => navigate({ page: n })}
                    className={`h-9 min-w-9 rounded-lg px-2 text-sm font-black transition ${
                      n === categoryData.currentPage ? 'bg-[#16a34a] text-white' : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:text-[#16a34a]'
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
