import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, LayoutGrid, Store } from 'lucide-react';
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
  const allCategories = product.categories?.length ? product.categories : [];

  // Phase 4: merchant-selected subset (designer multi-select). Empty → all.
  const selectedIds = Array.isArray(props.selected_categories) ? props.selected_categories.map(String) : [];
  const categories = selectedIds.length ? allCategories.filter((c: any) => selectedIds.includes(String(c.id))) : allCategories;

  const cols = Math.max(Number(props.columns) || 4, 2);
  const gridClass = GRID_COLS[cols] || GRID_COLS[4];
  const variant =
    (props.category_variant as string) ||
    (props.style === 'chips' ? 'card_pills' : 'icon_grid');

  if (!categories.length) {
    return <EmptySection title="لا توجد تصنيفات بعد" hint="أضف تصنيفات من لوحة التحكم ليظهر قسم التصنيفات." />;
  }

  return (
    <section className="w-full py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {props.show_title !== false && (
          <SectionHeading title={props.section_title || 'تصنيفاتنا'} subtitle={'اختر التصنيف الذي يناسبك واستكشف منتجاتنا.'} />
        )}

        {variant === 'card_pills' && (
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
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${
                    c.image ? 'pe-5' : ''
                  }`}
                  style={{
                    borderColor: active ? 'transparent' : css('--twc-border', '#e2e8f0'),
                    background: active ? css('--twc-primary', '#0f8a5f') : 'transparent',
                    color: active ? css('--twc-primary-foreground', '#ffffff') : css('--twc-text-secondary', '#475569'),
                  }}
                >
                  {c.image && (
                    <img src={c.image} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-black/10" />
                  )}
                  {c.name}
                </button>
              );
            })}
          </div>
        )}

        {variant === 'image_tiles' && (
          <div className={gridClass}>
            {categories.map((c: any) => {
              const active = String(product.activeCategory) === String(c.id);
              const image = c.image;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => product.handleCategoryClick(c.id)}
                  className={`group relative flex h-36 flex-col items-center justify-end overflow-hidden rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:h-44 ${
                    active ? 'ring-2' : ''
                  }`}
                  style={{
                    background: `linear-gradient(160deg, ${css('--twc-primary', '#0f8a5f')}, ${css('--twc-secondary', '#0e7490')})`,
                    ['--tw-ring-color' as any]: css('--twc-primary', '#0f8a5f'),
                  }}
                >
                  {image ? (
                    <img src={image} alt={c.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center text-white/40">
                      <Store className="h-10 w-10" />
                    </span>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <span className="relative z-10 w-full text-start text-sm font-bold text-white drop-shadow sm:text-base">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {variant === 'circle_pills' && (
          <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-5">
            {props.show_all !== false && (
              <CategoryCircle
                label="الكل"
                active={String(product.activeCategory) === 'all'}
                onClick={() => product.handleCategoryClick('all')}
              />
            )}
            {categories.map((c: any) => (
              <CategoryCircle
                key={c.id}
                image={c.image}
                label={c.name}
                active={String(product.activeCategory) === String(c.id)}
                onClick={() => product.handleCategoryClick(c.id)}
              />
            ))}
          </div>
        )}

        {variant === 'grid_cards' && (
          <div className={gridClass}>
            {categories.map((c: any) => {
              const active = String(product.activeCategory) === String(c.id);
              const image = c.image;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => product.handleCategoryClick(c.id)}
                  className={`group relative flex h-40 flex-col items-center justify-end overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:h-48 ${
                    active ? 'ring-2' : ''
                  }`}
                  style={{
                    borderColor: active ? css('--twc-primary', '#0f8a5f') : css('--twc-border', '#e2e8f0'),
                    ['--tw-ring-color' as any]: css('--twc-primary', '#0f8a5f'),
                    borderRadius: css('--twx-radius', '1rem'),
                  }}
                >
                  {image ? (
                    <img src={image} alt={c.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <span
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: `linear-gradient(160deg, ${css('--twc-primary', '#0f8a5f')}, ${css('--twc-secondary', '#0e7490')})` }}
                    >
                      <Store className="h-9 w-9 text-white/50" />
                    </span>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="relative z-10 w-full p-3 text-start text-sm font-bold text-white drop-shadow sm:text-base">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

                {variant === 'horizontal_scroll' && (
          <HorizontalCategoryRow categories={categories} activeCat={product.activeCategory} onClick={product.handleCategoryClick} />
        )}

        {/* Phase 4: circular snap-scroll slider */}
        {variant === 'circle_slider' && (
          <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {props.show_all !== false && (
              <span className="shrink-0 snap-start">
                <CategoryCircle
                  label="الكل"
                  active={String(product.activeCategory) === 'all'}
                  onClick={() => product.handleCategoryClick('all')}
                />
              </span>
            )}
            {categories.map((c: any) => (
              <span key={c.id} className="shrink-0 snap-start">
                <CategoryCircle
                  image={c.image}
                  label={c.name}
                  active={String(product.activeCategory) === String(c.id)}
                  onClick={() => product.handleCategoryClick(c.id)}
                />
              </span>
            ))}
          </div>
        )}

        {/* Phase 4: masonry grid — staggered tile heights via row spans */}
        {variant === 'masonry_grid' && (
          <div className="grid auto-rows-[110px] grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {categories.slice(0, 10).map((c: any, i: number) => {
              const spans = ['row-span-2', 'row-span-3', 'row-span-2', 'row-span-2', 'row-span-3', 'row-span-2'];
              const span = spans[i % spans.length];
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => product.handleCategoryClick(c.id)}
                  className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${span}`}
                  style={{ borderRadius: css('--twx-radius', '1rem') }}
                >
                  {c.image ? (
                    <img src={c.image} alt={c.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <span
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: `linear-gradient(${140 + (i % 4) * 25}deg, ${css('--twc-primary', '#0f8a5f')}, ${css('--twc-secondary', '#0e7490')})` }}
                    >
                      <Store className="h-8 w-8 text-white/40" />
                    </span>
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-3 text-start text-sm font-bold text-white drop-shadow sm:text-base">
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Phase 4: minimalist overlay — typographic tiles, reveal on hover */}
        {variant === 'minimalist_overlay' && (
          <div className="divide-y" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
            {categories.map((c: any, i: number) => {
              const active = String(product.activeCategory) === String(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => product.handleCategoryClick(c.id)}
                  className="group relative flex w-full items-center justify-between overflow-hidden px-2 py-6 text-start transition-colors sm:py-8"
                  style={{ borderColor: css('--twc-border', '#e2e8f0') }}
                >
                  <span
                    className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                      background:
                        i % 2 === 0
                          ? `linear-gradient(90deg, ${css('--twc-primary', '#0f8a5f')}14 0%, transparent 70%)`
                          : `linear-gradient(270deg, ${css('--twc-primary', '#0f8a5f')}14 0%, transparent 70%)`,
                      ...(active ? { opacity: 1 } : {}),
                    }}
                  />
                  <span className="relative z-10 flex items-baseline gap-4">
                    <span className="font-mono text-xs text-slate-300">{String(i + 1).padStart(2, '0')}</span>
                    <span
                      className="text-xl font-black tracking-tight transition-transform duration-300 group-hover:-translate-y-0.5 sm:text-3xl"
                      style={{ color: css('--twc-text-primary', '#0f172a') }}
                    >
                      {c.name}
                    </span>
                  </span>
                  {c.image && (
                    <img
                      src={c.image}
                      alt=""
                      className="relative z-10 h-12 w-12 rounded-lg object-cover opacity-60 transition-all duration-300 group-hover:opacity-100 group-hover:shadow-md"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {variant === 'icon_grid' && (
          <div className="grid grid-cols-4 gap-4 sm:grid-cols-6 md:grid-cols-8">
            {(props.show_all !== false ? [{ id: 'all', name: 'الكل', image: '' }, ...categories] : categories).map((c: any, i: number) => (
              <CategoryBadge
                key={`${c.id}-${i}`}
                label={c.name}
                image={c.image}
                active={String(product.activeCategory) === String(c.id)}
                onClick={() => product.handleCategoryClick(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

/* Compact circle badge — the standard category unit (spec: w-16/20, title below) */
const CategoryBadge: React.FC<{
  label: string;
  image?: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, image, active, onClick }) => (
  <button type="button" onClick={onClick} className="group flex flex-col items-center text-center">
    <span
      className={`mx-auto mb-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full transition-all duration-200 group-hover:shadow-md md:h-20 md:w-20 ${
        active ? 'ring-2 ring-offset-2' : ''
      }`}
      style={{
        background: image ? undefined : `${css('--twc-primary', '#0f8a5f')}1a`,
        color: css('--twc-primary', '#0f8a5f'),
        ['--tw-ring-color' as any]: css('--twc-primary', '#0f8a5f'),
      }}
    >
      {image ? (
        <img src={image} alt={label} className="h-full w-full object-cover" />
      ) : (
        <LayoutGrid className="h-6 w-6 md:h-7 md:w-7" />
      )}
    </span>
    <span
      className="max-w-[100px] truncate text-center text-xs font-medium md:text-sm"
      style={{ color: active ? css('--twc-primary', '#0f8a5f') : css('--twc-text-secondary', '#475569') }}
    >
      {label}
    </span>
  </button>
);

const CategoryCircle: React.FC<{
  label: string;
  image?: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, image, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex flex-col items-center gap-0 text-center"
  >
    <span
      className="mx-auto mb-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 bg-white transition-all duration-200 group-hover:shadow-md md:h-20 md:w-20"
      style={{
        borderColor: active ? css('--twc-primary', '#0f8a5f') : css('--twc-border', '#e2e8f0'),
        boxShadow: active ? `0 0 0 4px ${css('--twc-primary', '#0f8a5f')}22` : undefined,
      }}
    >
      {image ? (
        <img src={image} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center"
          style={{ background: `${css('--twc-primary', '#0f8a5f')}1a`, color: css('--twc-primary', '#0f8a5f') }}
        >
          <Store className="h-6 w-6 md:h-7 md:w-7" />
        </span>
      )}
    </span>
    <span
      className="max-w-[100px] truncate text-xs font-medium transition md:text-sm"
      style={{ color: active ? css('--twc-primary', '#0f8a5f') : css('--twc-text-secondary', '#475569') }}
    >
      {label}
    </span>
  </button>
);

const HorizontalCategoryRow: React.FC<{
  categories: any[];
  activeCat: string;
  onClick: (id: any) => void;
  showAll?: boolean;
}> = ({ categories, activeCat, onClick, showAll = true }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) => ref.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  const items = showAll ? [{ id: 'all', name: 'الكل', image: '' }, ...categories] : categories;

  return (
    <div className="relative">
      <div
        ref={ref}
        className="scrollbar-none flex snap-x gap-4 overflow-x-auto py-2 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((c: any, i: number) => (
          <div key={`${c.id}-${i}`} className="shrink-0 snap-start">
            <CategoryBadge
              label={c.name}
              image={c.image}
              active={String(activeCat) === String(c.id)}
              onClick={() => onClick(c.id)}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        aria-label="السابقة"
        onClick={() => scrollBy(-1)}
        className="absolute start-0 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-white p-2 text-slate-500 shadow transition hover:text-emerald-600"
        style={{ borderColor: css('--twc-border', '#e2e8f0') }}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="التالية"
        onClick={() => scrollBy(1)}
        className="absolute end-0 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-white p-2 text-slate-500 shadow transition hover:text-emerald-600"
        style={{ borderColor: css('--twc-border', '#e2e8f0') }}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
    </div>
  );
};