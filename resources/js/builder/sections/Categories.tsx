import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { SectionHeading, css, EmptySection } from './helpers';
import type { BuilderSectionProps } from './helpers';

const GRID_COLS: Record<number, string> = {
  2: 'grid grid-cols-2 gap-3 sm:gap-4',
  3: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5',
  4: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4',
  5: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-5',
  6: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-6',
};

export const CategoriesSection: React.FC<BuilderSectionProps> = ({ section }) => {
  const props = section.props || {};
  const { product } = useStorefrontCore();
  const categories = product.categories?.length ? product.categories : [];

  const style = props.style || 'cards';
  const columns = Math.max(Number(props.columns) || 4, 2);
  const gridClass = GRID_COLS[columns] || GRID_COLS[4];

  if (!categories.length) {
    return <EmptySection title="لا توجد تصنيفات بعد" hint="أضف تصنيفات من لوحة التحكم ليظهر قسم التصنيفات." />;
  }

  return (
    <section className="w-full px-4 py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="mx-auto max-w-7xl">
        {props.show_title !== false && (
          <SectionHeading title={props.section_title || 'تصنيفاتنا'} subtitle={'اختر التصنيف الذي يناسبك واستكشف منتجاتنا.'} />
        )}

        {style === 'chips' ? (
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {props.show_all !== false && (
              <button
                type="button"
                onClick={() => product.handleCategoryClick('all')}
                className="rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: css('--twc-primary', '#0f8a5f') }}
              >
                الكل
              </button>
            )}
            {categories.map((c: any) => {
              const active = String(product.activeCategory) === String(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => product.handleCategoryClick(c.id)}
                  className="rounded-full border px-5 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
                  style={{
                    borderColor: active ? 'transparent' : css('--twc-border', '#e2e8f0'),
                    background: active ? css('--twc-primary', '#0f8a5f') : 'transparent',
                    color: active ? css('--twc-primary-foreground', '#ffffff') : css('--twc-text-secondary', '#475569'),
                  }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        ) : (
          <div className={gridClass}>
            {categories.map((c: any) => {
              const image = c.image;
              const active = String(product.activeCategory) === String(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => product.handleCategoryClick(c.id)}
                  className="group relative flex aspect-square flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border bg-gradient-to-br transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  style={{
                    borderColor: css('--twc-border', '#e2e8f0'),
                    background: `linear-gradient(160deg, ${css('--twc-primary', '#0f8a5f')} 0%, ${css('--twc-secondary', '#0e7490')} 100%)`,
                    borderRadius: css('--twx-radius', '1rem'),
                  }}
                >
                  {image ? (
                    <img src={image} alt={c.name} className="absolute inset-0 h-full w-full object-cover opacity-40 transition group-hover:scale-105" />
                  ) : null}
                  <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur">
                    <LayoutGrid className="h-6 w-6" />
                  </span>
                  <span className="relative z-10 px-3 text-center text-sm font-bold text-white drop-shadow sm:text-base">
                    {c.name}
                    {active ? ' •' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};