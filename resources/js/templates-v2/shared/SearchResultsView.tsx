import React from 'react';
import { router } from '@inertiajs/react';
import { ChevronLeft, PackageSearch, Search } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { usePriceFormatter, useStorefrontCore } from './hooks';

/**
 * Reusable search results grid — shared business state, template-shaped card.
 * Props come from ThemeController::search() -> searchPage.
 */
export const SearchResultsView: React.FC<{
  searchPage: {
    query: string;
    products: any[];
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    sort: string;
    category?: string;
    availability?: string;
    onSale?: boolean;
  };
  categories?: any[];
  accent?: string;
}> = ({ searchPage, categories = [], accent }) => {
  const { product: productCtx } = useStorefrontCore() as any;
  const formatPrice = usePriceFormatter();
  const { query, products, total, currentPage, lastPage, sort } = searchPage;

  const navigate = (next: Record<string, any>) => {
    router.get(window.location.pathname, { q: query, sort, ...next }, { preserveScroll: true, preserveState: true });
  };

  if (!query || query.length < 2) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6" dir="rtl">
        <PackageSearch className="mx-auto h-12 w-12 text-stone-300" />
        <h1 className="mt-4 text-xl font-black text-stone-800">نتائج البحث</h1>
        <p className="mt-2 text-sm text-stone-500">اكتب كلمة من شريط البحث للبدء — مثال: اندومي</p>
        <a href="/" className="mt-6 inline-flex rounded-full px-6 py-2.5 text-sm font-black text-white" style={{ background: accent || '#0f172a' }}>
          العودة للمتجر
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8" dir="rtl">
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-stone-500" aria-label="مسار التنقل">
        <a href="/" className="font-bold hover:text-stone-700">
          الرئيسية
        </a>
        <ChevronLeft className="h-4 w-4" />
        <span className="font-black text-stone-900">نتائج البحث عن &quot;{query}&quot;</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-black text-stone-900">
          نتائج البحث عن &quot;{query}&quot;
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {total > 0 ? `تم العثور على ${total} منتج` : 'لم نجد منتجات مطابقة'}
        </p>
      </header>

      {/* Filters / Sort bar */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white p-3 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <select
            value={sort}
            onChange={(e) => navigate({ sort: e.target.value, page: 1, category: searchPage.category, availability: searchPage.availability, on_sale: searchPage.onSale ? 1 : undefined })}
            className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none"
            aria-label="ترتيب"
          >
            <option value="relevance">الصلة</option>
            <option value="newest">الأحدث</option>
            <option value="price_asc">السعر: الأقل إلى الأعلى</option>
            <option value="price_desc">السعر: الأعلى إلى الأقل</option>
            <option value="name">أبجدياً</option>
          </select>
          {categories.length > 0 && (
            <select
              value={searchPage.category || ''}
              onChange={(e) => navigate({ category: e.target.value || undefined, page: 1 })}
              className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none"
              aria-label="القسم"
            >
              <option value="">كل الأقسام</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={searchPage.availability || 'all'}
            onChange={(e) => navigate({ availability: e.target.value, page: 1 })}
            className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none"
          >
            <option value="all">كل الحالات</option>
            <option value="in_stock">متوفر</option>
            <option value="out_of_stock">نفذت</option>
          </select>
          <label className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-bold text-stone-600">
            <input
              type="checkbox"
              checked={!!searchPage.onSale}
              onChange={(e) => navigate({ on_sale: e.target.checked ? 1 : undefined, page: 1 })}
            />
            عروض فقط
          </label>
        </div>
        <span className="text-xs font-bold text-stone-400">{total} نتيجة</span>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-white px-6 py-16 text-center">
          <PackageSearch className="h-12 w-12 text-stone-300" />
          <p className="text-lg font-bold text-stone-600">لم نجد منتجات مطابقة لـ &quot;{query}&quot;</p>
          <div className="flex gap-2">
            <a href="/" className="rounded-full border px-5 py-2 text-sm font-bold hover:bg-stone-50">
              العودة للتسوق
            </a>
            <a href={`/search?q=`} className="rounded-full px-5 py-2 text-sm font-black text-white" style={{ background: accent || '#0f172a' }}>
              مسح البحث
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {products.map((p: any) => {
              const hasSale = p.originalPrice != null && Number(p.originalPrice) > Number(p.price);
              return (
                <div key={p.id} className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:shadow-md" dir="rtl">
                  <button type="button" onClick={() => productCtx.handleProductClick(p)} className="relative aspect-square w-full overflow-hidden bg-stone-50 p-2" aria-label={p.name}>
                    <img src={getImageUrl(p.image || '')} alt={p.name} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]" />
                    {hasSale && <span className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-black text-white">خصم</span>}
                    {p.availability === 'out_of_stock' && (
                      <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-black text-stone-500">نفذت</span>
                    )}
                  </button>
                  <div className="flex flex-1 flex-col gap-1.5 p-3">
                    <button type="button" onClick={() => productCtx.handleProductClick(p)} className="line-clamp-2 min-h-[40px] text-start text-sm font-bold leading-snug text-stone-800 hover:text-black">
                      {p.name}
                    </button>
                    <div className="mt-auto flex items-baseline gap-1.5">
                      <span className="text-base font-black text-stone-900">{formatPrice(p.price)}</span>
                      {hasSale && <span className="text-xs text-stone-400 line-through">{formatPrice(p.originalPrice)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {lastPage > 1 && (
            <nav className="mt-10 flex flex-wrap items-center justify-center gap-1.5" aria-label="pagination">
              {Array.from({ length: Math.min(lastPage, 12) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => navigate({ page: n })}
                  className={`h-9 min-w-9 rounded-xl px-2 text-sm font-black transition ${n === currentPage ? 'text-white shadow-md' : 'bg-white text-stone-600 ring-1 ring-black/10 hover:text-black'}`}
                  style={n === currentPage ? { background: accent || '#0f172a' } : {}}
                  aria-current={n === currentPage ? 'page' : undefined}
                >
                  {n}
                </button>
              ))}
            </nav>
          )}
        </>
      )}
    </div>
  );
};
