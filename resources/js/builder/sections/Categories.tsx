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
  const categories = product.categories?.length ? product.categories : [];

  const cols = Math.max(Number(props.columns) || 4, 2);
  const gridClass = GRID_COLS[cols] || GRID_COLS[4];
  const variant =
    (props.category_variant as string) ||
    (props.style === 'chips' ? 'card_pills' : 'icon_grid');

  if (!categories.length) {
    return <EmptySection title="لا توجد تصنيفات بعد" hint="أضف تصنيفات من لوحة التحكم ليظهر قسم التصنيفات." />;
  }

  return (
    <section className="w-full px-4 py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="mx-auto max-w-7xl">
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

        {variant === 'icon_grid' && (
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

const CategoryCircle: React.FC<{
  label: string;
  image?: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, image, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-24 flex-col items-center gap-2.5 text-center"
  >
    <span
      className="flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full border-2 bg-white transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl"
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
          style={{ background: `linear-gradient(160deg, ${css('--twc-primary', '#0f8a5f')}, ${css('--twc-secondary', '#0e7490')})` }}
        >
          <Store className="h-7 w-7 text-white" />
        </span>
      )}
    </span>
    <span
      className="max-w-full truncate text-sm font-bold transition"
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
}> = ({ categories, activeCat, onClick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) => ref.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });

  return (
    <div className="relative">
      <div ref={ref} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {categories.map((c: any) => {
          const active = String(activeCat) === String(c.id);
          const image = c.image;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onClick(c.id)}
              className={`group relative my-1 flex w-52 shrink-0 snap-start flex-col items-center justify-end overflow-hidden rounded-2xl pt-12 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                active ? 'ring-2' : ''
              }`}
              style={{
                ['--tw-ring-color' as any]: css('--twc-primary', '#0f8a5f'),
                background: `linear-gradient(170deg, ${css('--twc-primary', '#0f8a5f')}, ${css('--twc-secondary', '#0e7490')})`,
              }}
            >
              {image ? (
                <img src={image} alt={c.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-white/40">
                  <Store className="h-10 w-10" />
                </span>
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
              <span className="relative z-10 w-full p-4 text-start text-sm font-bold text-white drop-shadow sm:text-base">
                {c.name}
              </span>
            </button>
          );
        })}
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