import React, { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Share2, PackageX } from 'lucide-react';
import { ProductCard, css } from './sections/helpers';

export interface CategoryPageData {
  category: {
    id: string;
    name: string;
    slug: string;
    image?: string | null;
    description?: string | null;
    product_count?: number;
  };
  total: number;
  perPage: number;
  currentPage: number;
  lastPage: number;
  sort: string;
}

const SORTS: Array<{ value: string; label: string }> = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر: من الأقل للأعلى' },
  { value: 'price_desc', label: 'السعر: من الأعلى للأقل' },
  { value: 'name', label: 'أبجدياً' },
];

/**
 * CategoryListing — the dedicated /category/{slug} page body:
 * breadcrumb → title + WhatsApp share → sort bar → product grid
 * → server-side pagination. Wrapped by the store chrome (StoreSite).
 */
export const CategoryListing: React.FC<{ categoryPage: CategoryPageData; storeData?: any }> = ({
  categoryPage,
  storeData,
}) => {
  const { category, total, currentPage, lastPage, sort } = categoryPage;
  const products = storeData?.products || [];
  const [pendingSort, setPendingSort] = useState(sort);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(`تصفح قسم "${category.name}" في متجرنا: ${shareUrl}`)}`;

  const navigate = (next: Record<string, any>) => {
    router.get(window.location.pathname, next, { preserveScroll: true, preserveState: true });
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const from = Math.max(1, currentPage - 2);
    const to = Math.min(lastPage, currentPage + 2);
    for (let i = from; i <= to; i++) pages.push(i);
    return pages;
  }, [currentPage, lastPage]);

  return (
    <section className="w-full py-8 sm:py-12" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="مسار التنقل" className="mb-6 flex items-center gap-1.5 text-sm" style={{ color: css('--twc-text-secondary', '#52645a') }}>
          <a href="/" className="transition hover:opacity-75">الرئيسية</a>
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="font-bold" style={{ color: css('--twc-text-primary', '#14201a') }}>{category.name}</span>
        </nav>

        {/* Title + share */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {category.image && (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1" style={{ ['--tw-ring-color' as any]: css('--twc-border', '#e3ece6') }}>
                <img src={category.image} alt="" className="h-full w-full object-cover" />
              </span>
            )}
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ color: css('--twc-text-primary', '#14201a'), fontFamily: css('--twf-heading-font', 'inherit') }}>
                {category.name}
              </h1>
              <p className="mt-0.5 text-sm" style={{ color: css('--twc-text-secondary', '#52645a') }}>
                {total} منتج
              </p>
            </div>
          </div>
          <a
            href={whatsappShare}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-extrabold text-white shadow transition hover:opacity-90"
            style={{ background: '#25D366' }}
          >
            <Share2 className="h-4 w-4" />
            شارك القسم على واتساب
          </a>
        </div>

        {category.description && (
          <p className="mb-8 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: css('--twc-text-secondary', '#52645a') }}>
            {category.description}
          </p>
        )}

        {/* Sort bar */}
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: css('--twc-border', '#e3ece6'), background: css('--twc-surface', '#f6faf7') }}>
          <span className="text-sm font-extrabold" style={{ color: css('--twc-text-primary', '#14201a') }}>جميع المنتجات</span>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-xs font-bold" style={{ color: css('--twc-text-secondary', '#52645a') }}>ترتيب حسب</span>
            <select
              value={pendingSort}
              onChange={(e) => {
                setPendingSort(e.target.value);
                navigate({ sort: e.target.value });
              }}
              className="rounded-full border bg-white px-3 py-2 text-xs font-bold outline-none transition focus:ring-2"
              style={{
                borderColor: css('--twc-border', '#e3ece6'),
                color: css('--twc-text-primary', '#14201a'),
                ['--tw-ring-color' as any]: css('--twc-primary', '#0f8a5f'),
              }}
            >
              {SORTS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Products grid */}
        {products.length ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {products.map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {/* Pagination */}
            {lastPage > 1 && (
              <nav aria-label="ترقيم الصفحات" className="mt-10 flex items-center justify-center gap-1.5">
                {currentPage > 1 && (
                  <button
                    type="button"
                    onClick={() => navigate({ sort, page: currentPage - 1 })}
                    className="flex h-10 items-center gap-1 rounded-full border px-4 text-xs font-bold transition hover:opacity-75"
                    style={{ borderColor: css('--twc-border', '#e3ece6'), color: css('--twc-text-primary', '#14201a') }}
                  >
                    <ChevronRight className="h-4 w-4" />
                    السابق
                  </button>
                )}
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => (n === currentPage ? undefined : navigate({ sort, page: n }))}
                    aria-current={n === currentPage ? 'page' : undefined}
                    className={`h-10 min-w-10 rounded-full px-3 text-sm font-bold transition ${
                      n === currentPage ? 'text-white' : ''
                    }`}
                    style={n === currentPage ? { background: css('--twc-primary', '#0f8a5f') } : { color: css('--twc-text-secondary', '#52645a') }}
                  >
                    {n}
                  </button>
                ))}
                {currentPage < lastPage && (
                  <button
                    type="button"
                    onClick={() => navigate({ sort, page: currentPage + 1 })}
                    className="flex h-10 items-center gap-1 rounded-full border px-4 text-xs font-bold transition hover:opacity-75"
                    style={{ borderColor: css('--twc-border', '#e3ece6'), color: css('--twc-text-primary', '#14201a') }}
                  >
                    التالي
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="mx-auto max-w-md py-16 text-center">
            <PackageX className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 font-semibold" style={{ color: css('--twc-text-primary', '#14201a') }}>
              لا توجد منتجات في هذا التصنيف بعد
            </p>
            <p className="mt-1 text-sm" style={{ color: css('--twc-text-secondary', '#52645a') }}>
              تابعنا قريباً — تُضاف منتجات جديدة باستمرار.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoryListing;
