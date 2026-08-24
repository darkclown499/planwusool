import React from 'react';
import { Store } from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { css, EmptySection, SectionHeading } from '@/builder/sections/helpers';
import type { BuilderSectionProps } from '@/builder/sections/helpers';

const GRID_COLS: Record<number, string> = {
  3: 'grid grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-6',
  4: 'grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6',
  5: 'grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 sm:gap-x-6 lg:grid-cols-5',
  6: 'grid grid-cols-4 gap-x-4 gap-y-8 sm:grid-cols-5 sm:gap-x-6 lg:grid-cols-6',
};

/**
 * editorial-boutique Categories — circular photo tiles (Anaqa's
 * `category_variant: 'circle_pills''), the boutique signature: a round
 * portrait framed in a hairline ring that turns blush on hover/active,
 * uppercase-tracked caption beneath. No filled backgrounds, no square
 * chrome — matches the family's flat, borderless product cards.
 */
export const Categories: React.FC<BuilderSectionProps> = ({ section }) => {
  const props = section.props || {};
  const { product } = useStorefrontCore();
  const allCategories = product.categories?.length ? product.categories : [];

  const selectedIds = Array.isArray(props.selected_categories) ? props.selected_categories.map(String) : [];
  const categories = selectedIds.length ? allCategories.filter((c: any) => selectedIds.includes(String(c.id))) : allCategories;

  const cols = Math.max(Number(props.columns) || 4, 3);
  const gridClass = GRID_COLS[cols] || GRID_COLS[4];
  const border = css('--twc-border', '#ededed');
  const primary = css('--twc-primary', '#f6d7d5');

  if (!categories.length) {
    return <EmptySection title="لا توجد تصنيفات بعد" hint="أضف تصنيفات من لوحة التحكم ليظهر قسم التصنيفات." />;
  }

  const items = props.show_all !== false ? [{ id: 'all', name: 'الكل', image: '' }, ...categories] : categories;

  return (
    <section id="template-categories" className="w-full py-14 sm:py-20" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {props.show_title !== false && <SectionHeading title={props.section_title || 'جميع التصنيفات'} />}

        <div className={gridClass}>
          {items.map((c: any) => {
            const active = String(product.activeCategory) === String(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => product.handleCategoryClick(c.id)}
                className="group flex flex-col items-center gap-3 text-center"
              >
                <span
                  className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-full transition"
                  style={{
                    border: `1.5px solid ${active ? primary : border}`,
                    background: css('--twc-surface', '#f8f8f8'),
                  }}
                >
                  {c.image ? (
                    <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]" />
                  ) : (
                    <Store className="h-6 w-6" style={{ color: css('--twc-muted', '#cbb9b3') }} />
                  )}
                </span>
                <span
                  className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] sm:text-xs"
                  style={{ color: css('--twc-text-primary', '#161311') }}
                >
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Categories;
