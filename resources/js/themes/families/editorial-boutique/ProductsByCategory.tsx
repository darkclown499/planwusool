import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { css, EmptySection, SectionHeading } from '@/builder/sections/helpers';
import type { BuilderSectionProps } from '@/builder/sections/helpers';
import { ProductCard } from './ProductCard';

const GRID_COLS: Record<number, string> = {
  2: 'grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-8',
  3: 'grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-8',
  4: 'grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4',
};

type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'name';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر: الأقل أولاً' },
  { value: 'price_desc', label: 'السعر: الأعلى أولاً' },
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
      return copy;
  }
};

/**
 * editorial-boutique ProductsByCategory — each category reads as a
 * lookbook chapter: a centered serif-leaning heading, a thin blush
 * underline instead of a full-width hairline, wide gutters between the
 * portrait cards so nothing feels boxed in. Uses the family's own
 * ProductCard (slide-up "أضيفي للحقيبة" bar) rather than the generic one.
 */
export const ProductsByCategory: React.FC<BuilderSectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const { product } = useStorefrontCore();
  const [sort, setSort] = useState<SortKey>((props.sort_default as SortKey) || 'newest');

  const categories = product.categories?.length ? product.categories : storeData?.categories || [];
  const products = product.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];

  const perCategory = Math.max(Number(props.per_category) || 4, 2);
  const columns = Math.min(Math.max(Number(props.columns) || 4, 2), 4);
  const primary = css('--twc-primary', '#f6d7d5');
  const headingFont = css('--twf-heading-font', 'inherit');

  const groups = useMemo(() => {
    const byId = new Map<any, any[]>();
    for (const p of products) {
      const key = p.categoryId ?? p.category_id ?? '__none__';
      if (!byId.has(key)) byId.set(key, []);
      byId.get(key)!.push(p);
    }
    return categories
      .map((c: any) => ({ category: c, items: sortProducts(byId.get(String(c.id)) || byId.get(c.id) || [], sort) }))
      .filter((g: { category: any; items: any[] }) => g.items.length > 0);
  }, [categories, products, sort]);

  const showViewAll = props.show_view_all !== false;

  if (!products.length) {
    return <EmptySection title="لا توجد منتجات بعد" hint="أضف منتجات وصدّرها إلى تصنيفات لتظهر مجمّعة تحت كل قسم هنا." />;
  }

  return (
    <section id="template-products" className="w-full py-14 sm:py-20" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading title={props.section_title || 'تسوّقي حسب قسمك المفضل'} align="start" />
          <label className="mb-8 flex shrink-0 items-center gap-2 text-xs">
            <span style={{ color: css('--twc-text-secondary', '#8a8178') }}>ترتيب</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="border-0 border-b bg-transparent py-1 text-xs font-medium outline-none"
              style={{ borderColor: css('--twc-border', '#ededed'), color: css('--twc-text-primary', '#161311') }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="space-y-20">
          {groups.map(({ category, items }: { category: any; items: any[] }) => {
            const link = category.slug ? `/category/${category.slug}` : null;
            return (
              <div key={category.id}>
                <div className="mb-8 flex flex-col items-center gap-2 text-center">
                  <h3 className="text-xl font-medium sm:text-2xl" style={{ color: css('--twc-text-primary', '#161311'), fontFamily: headingFont }}>
                    {link ? <a href={link} className="transition hover:opacity-70">{category.name}</a> : category.name}
                  </h3>
                  <span className="h-px w-10" style={{ background: primary }} />
                  {showViewAll && link && (
                    <a href={link} className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition hover:opacity-60" style={{ color: css('--twc-text-secondary', '#8a8178') }}>
                      عرض الكل
                      <ArrowLeft className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className={GRID_COLS[columns] || GRID_COLS[4]}>
                  {sortProducts(items, sort)
                    .slice(0, perCategory)
                    .map((p: any) => (
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

export default ProductsByCategory;
