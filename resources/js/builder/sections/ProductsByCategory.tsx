import React, { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { ProductCard, SectionHeading, EmptySection, css } from './helpers';
import type { BuilderSectionProps } from './helpers';

const GRID_COLS: Record<number, string> = {
  2: 'grid grid-cols-2 gap-3 sm:gap-4',
  3: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5',
  4: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4',
  5: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-5',
};

type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'name';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر: من الأقل للأعلى' },
  { value: 'price_desc', label: 'السعر: من الأعلى للأقل' },
  { value: 'name', label: 'أبجدياً' },
];

const sortProducts = (items: any[], sort: SortKey): any[] => {
  const copy = [...items];
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    case 'price_desc':
      return copy.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    case 'name':
      return copy.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
    default:
      // Backend already delivers the catalog newest-first.
      return copy;
  }
};

/**
 * ProductsByCategory — the signature section of the classic template:
 * every category gets its own titled block of products with a per-section
 * sort control and a "view all" link to the dedicated /category/{slug} page.
 */
export const ProductsByCategorySection: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const { product } = useStorefrontCore();
  const [sort, setSort] = useState<SortKey>((props.sort_default as SortKey) || 'newest');

  const categories = product.categories?.length ? product.categories : storeData?.categories || [];
  const products = product.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];

  const perCategory = Math.max(Number(props.per_category) || 4, 2);
  const columns = Math.max(Number(props.columns) || 4, 2);

  const groups = useMemo(() => {
    const byId = new Map<any, any[]>();
    for (const p of products) {
      const key = p.categoryId ?? p.category_id ?? '__none__';
      if (!byId.has(key)) byId.set(key, []);
      byId.get(key)!.push(p);
    }
    return categories
      .map((c: any) => ({
        category: c,
        items: sortProducts(byId.get(String(c.id)) || byId.get(c.id) || [], sort),
      }))
      .filter((g: { category: any; items: any[] }) => g.items.length > 0);
  }, [categories, products, sort]);

  const showViewAll = props.show_view_all !== false;

  if (!products.length) {
    return (
      <EmptySection
        title="لا توجد منتجات بعد"
        hint="أضف منتجات وصدّرها إلى تصنيفات لتظهر مجمّعة تحت كل قسم هنا."
      />
    );
  }

  return (
    <section id="template-products" className="w-full py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading
            title={props.section_title || 'تسوّق حسب القسم'}
            subtitle="منتجات مجمّعة تحت كل تصنيف لسهولة الوصول لما تريد."
            align="start"
          />
          <label className="mb-8 flex shrink-0 items-center gap-2 text-sm">
            <span className="font-bold" style={{ color: css('--twc-text-secondary', '#475569') }}>
              ترتيب حسب
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full border bg-white px-3 py-2 text-xs font-bold outline-none transition focus:ring-2"
              style={{
                borderColor: css('--twc-border', '#e2e8f0'),
                color: css('--twc-text-primary', '#0f172a'),
                ['--tw-ring-color' as any]: css('--twc-primary', '#0f8a5f'),
              }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-12">
          {groups.map(({ category, items }: { category: any; items: any[] }) => {
            const link = category.slug ? `/category/${category.slug}` : null;
            return (
              <div key={category.id}>
                {/* Category heading row */}
                <div className="mb-5 flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1"
                      style={{ background: `${css('--twc-primary', '#0f8a5f')}14`, ['--tw-ring-color' as any]: css('--twc-border', '#e2e8f0') }}
                    >
                      {category.image ? (
                        <img src={category.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-base font-black" style={{ color: css('--twc-primary', '#0f8a5f') }}>
                          {String(category.name || '؟').slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-extrabold sm:text-xl" style={{ color: css('--twc-text-primary', '#14201a'), fontFamily: css('--twf-heading-font', 'inherit') }}>
                        {link ? (
                          <a href={link} className="transition hover:opacity-75">{category.name}</a>
                        ) : (
                          category.name
                        )}
                      </h3>
                      <p className="text-xs" style={{ color: css('--twc-text-secondary', '#52645a') }}>
                        {items.length} منتج
                      </p>
                    </div>
                  </div>
                  {showViewAll && link && (
                    <a
                      href={link}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-4 py-2 text-xs font-extrabold transition hover:text-white"
                      style={{
                        borderColor: css('--twc-primary', '#0f8a5f'),
                        color: css('--twc-primary', '#0f8a5f'),
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = css('--twc-primary', '#0f8a5f'))}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      عرض الكل
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                {/* Products grid */}
                <div className={GRID_COLS[columns] || GRID_COLS[4]}>
                  {sortProducts(items, sort).slice(0, perCategory).map((p: any) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProductsByCategorySection;
