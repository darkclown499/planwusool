import React from 'react';
import { Store } from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { css, EmptySection, SectionHeading } from '@/builder/sections/helpers';
import type { BuilderSectionProps } from '@/builder/sections/helpers';

const GRID_COLS: Record<number, string> = {
  2: 'grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6',
  3: 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-6',
  4: 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4',
  5: 'grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-5',
  6: 'grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-4 sm:gap-x-6 lg:grid-cols-6',
};

/**
 * modern-minimal Categories — a plain uniform grid of photo tiles with the
 * caption sitting quietly below the image (not overlaid), so there is no
 * gradient scrim or bold typography competing with the product grid that
 * follows. An optional "الكل" tile is a bare outlined square, not a
 * filled pill, to keep the same quiet visual weight as the rest.
 */
export const Categories: React.FC<BuilderSectionProps> = ({ section }) => {
  const props = section.props || {};
  const { product } = useStorefrontCore();
  const allCategories = product.categories?.length ? product.categories : [];

  const selectedIds = Array.isArray(props.selected_categories) ? props.selected_categories.map(String) : [];
  const categories = selectedIds.length ? allCategories.filter((c: any) => selectedIds.includes(String(c.id))) : allCategories;

  const cols = Math.max(Number(props.columns) || 4, 2);
  const gridClass = GRID_COLS[cols] || GRID_COLS[4];
  const border = css('--twc-border', '#e2e8f0');

  if (!categories.length) {
    return <EmptySection title="لا توجد تصنيفات بعد" hint="أضف تصنيفات من لوحة التحكم ليظهر قسم التصنيفات." />;
  }

  const items = props.show_all !== false ? [{ id: 'all', name: 'الكل', image: '' }, ...categories] : categories;

  return (
    <section id="template-categories" className="w-full py-14 sm:py-20" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {props.show_title !== false && (
          <SectionHeading title={props.section_title || 'تصنيفاتنا'} subtitle="تصفّح منتجاتنا حسب القسم الذي يناسبك." />
        )}

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
                  className="flex aspect-square w-full items-center justify-center overflow-hidden transition"
                  style={{
                    border: `1px solid ${active ? css('--twc-primary', '#0f8a5f') : border}`,
                    borderRadius: css('--twx-radius', '0.75rem'),
                    background: css('--twc-surface', '#f8fafc'),
                  }}
                >
                  {c.image ? (
                    <img
                      src={c.image}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <Store className="h-6 w-6" style={{ color: css('--twc-muted', '#94a3b8') }} />
                  )}
                </span>
                <span
                  className="truncate text-xs font-medium sm:text-sm"
                  style={{ color: active ? css('--twc-primary', '#0f8a5f') : css('--twc-text-primary', '#0f172a') }}
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
