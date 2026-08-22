import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { SectionHeading, ProductCard, EmptySection, css, priceOf, productWhatsAppUrl } from './helpers';
import { getImageUrl } from '@/utils/image-helper';
import type { BuilderSectionProps } from './helpers';

const GRID_COLS: Record<number, string> = {
  2: 'grid grid-cols-2 gap-3 sm:gap-4',
  3: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5',
  4: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4',
  5: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-5 lg:grid-cols-5',
  6: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
};

export const ProductsSection: React.FC<BuilderSectionProps> = ({ section, storeData, mode }) => {
  const props = section.props || {};
  const { product: productCtx, config } = useStorefrontCore();

  useEffect(() => {
    productCtx.handleCategoryClick('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const source = productCtx.filteredProducts?.length ? productCtx.filteredProducts : storeData?.products || [];
  const activeCat = productCtx.activeCategory;
  const allVisible =
    activeCat && activeCat !== 'all' ? source.filter((p: any) => String(p.categoryId) === String(activeCat)) : source;

  const featuredOnly = props.featured_only === true;
  const filtered = featuredOnly ? allVisible.filter((p: any) => p.is_featured || p.featured) : allVisible;

  const perPage = Math.max(Number(props.per_page) || 12, 6);
  const [visibleCount, setVisibleCount] = useState(perPage);
  useEffect(() => setVisibleCount(perPage), [activeCat, perPage]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const columns = Math.max(Number(props.columns) || 4, 2);
  const title = props.section_title || (featuredOnly ? 'منتجات مميزة' : 'منتجاتنا');

  const variant =
    (props.product_variant as string) || (props.layout === 'list' ? 'list' : 'detailed_cards_with_badges');

  if (!filtered.length) {
    return (
      <EmptySection
        title={mode === 'edit' ? 'معاينة المنتجات' : 'لا توجد منتجات'}
        hint={mode === 'edit' ? 'ستظهر منتجاتك الفعلية هنا عند الانتقال للمتجر بعد الحفظ.' : 'أضف منتجات من لوحة التحكم ليظهر القسم.'}
      />
    );
  }

  /* -------- list -------- */
  if (variant === 'list') {
    return (
      <section id="template-products" className="w-full py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
        <div className="mx-auto max-w-5xl">
          <SectionHeading title={title} subtitle={'أحدث ما وصل حديثاً إلى متجرنا.'} />
          <div className="space-y-4">
            {visibleProducts.map((product: any) => {
              const wa = productWhatsAppUrl(config, product);
              return (
                <div
                  key={product.id}
                  className="flex flex-col gap-4 rounded-2xl border bg-white p-4 transition hover:shadow-md sm:flex-row sm:items-center"
                  style={{ borderColor: css('--twc-border', '#e2e8f0') }}
                >
                  <button
                    type="button"
                    onClick={() => productCtx.handleProductClick(product)}
                    className="flex shrink-0 items-center gap-4 text-start"
                  >
                    <img src={getImageUrl(product.image)} alt={product.name} className="h-24 w-24 rounded-xl object-cover sm:h-28 sm:w-28" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => productCtx.handleProductClick(product)} className="text-start">
                      <h3 className="text-base font-bold" style={{ color: css('--twc-text-primary', '#0f172a') }}>
                        {product.name}
                      </h3>
                    </button>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.short_description || product.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-lg font-extrabold" style={{ color: css('--twc-primary', '#0f8a5f') }}>
                      {priceOf(product)}
                    </span>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="اطلب واتساب"
                        className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                        style={{ background: '#25D366' }}
                      >
                        <MessageCircle className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length > visibleCount && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((v) => v + perPage)}
                className="rounded-full border px-7 py-2.5 text-sm font-bold transition hover:opacity-80"
                style={{ borderColor: css('--twc-primary', '#0f8a5f'), color: css('--twc-primary', '#0f8a5f') }}
              >
                عرض المزيد
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  /* -------- bento_products (featured spotlight + side grid) -------- */
  if (variant === 'bento_products') {
    const [featured, ...rest] = visibleProducts;
    return (
      <section id="template-products" className="w-full py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title={title} subtitle={'اكتشف منتجاتنا المميزة أولاً.'} />
          <div className="grid gap-5 lg:grid-cols-2">
            {featured && (
              <div className="h-full">
                <ProductCard product={featured} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-2">
              {rest.slice(0, 4).map((p: any) => (
                <ProductCard key={p.id} product={p} compact />
              ))}
            </div>
          </div>
          {filtered.length > visibleCount && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((v) => v + perPage)}
                className="inline-flex items-center gap-2 rounded-full border px-8 py-3 text-sm font-bold transition hover:opacity-80"
                style={{ borderColor: css('--twc-primary', '#0f8a5f'), color: css('--twc-primary', '#0f8a5f') }}
              >
                عرض المزيد
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  /* -------- tabbed_categories (products grouped by category tabs) -------- */
  if (variant === 'tabbed_categories') {
    const catTabs = productCtx.categories?.length ? productCtx.categories : [];
    return (
      <section id="template-products" className="w-full py-10 sm:py-14" style={{ background: css('--twc-surface', '#f8fafc') }}>
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title={title} subtitle={'تصفّح المنتجات حسب التصنيف.'} />
          <div className="mb-7 flex flex-wrap items-center justify-center gap-2">
            <CatTabButton
              label="الكل"
              active={!activeCat || String(activeCat) === 'all'}
              onClick={() => productCtx.handleCategoryClick('all')}
            />
            {catTabs.map((c: any) => (
              <CatTabButton
                key={c.id}
                label={c.name}
                active={String(activeCat) === String(c.id)}
                onClick={() => productCtx.handleCategoryClick(c.id)}
              />
            ))}
          </div>
          <div className={GRID_COLS[Math.min(columns, 4)] || GRID_COLS[4]}>
            {visibleProducts.map((product: any) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </div>
          {filtered.length > visibleCount && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((v) => v + perPage)}
                className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: css('--twc-primary', '#0f8a5f') }}
              >
                عرض المزيد
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  /* -------- horizontal_scroll -------- */
  if (variant === 'horizontal_scroll') {
    return <HorizontalProductRow products={visibleProducts} title={title} columns={columns} onMore={filtered.length > visibleCount ? () => setVisibleCount((v) => v + perPage) : undefined} />;
  }

  /* -------- compact_cards / compact_grid / detailed_cards_with_badges -------- */
  const compact = variant === 'compact_cards' || variant === 'compact_grid';
  return (
    <section
      id="template-products"
      className="w-full py-10 sm:py-14"
      style={{ background: compact ? css('--twc-background', '#ffffff') : css('--twc-surface', '#f8fafc') }}
    >
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading title={title} subtitle={'أحدث ما وصل حديثاً إلى متجرنا.'} />
        <div className={GRID_COLS[variant === 'compact_grid' ? Math.min(columns, 6) : columns] || GRID_COLS[4]}>
          {visibleProducts.map((product: any) => (
            <ProductCard key={product.id} product={product} compact={compact} />
          ))}
        </div>
        {filtered.length > visibleCount && (
          <div className="mt-10 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + perPage)}
              className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold text-white transition hover:opacity-90"
              style={{ background: css('--twc-primary', '#0f8a5f') }}
            >
              عرض المزيد
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

/* Horizontal scroll-snap product row with arrow buttons. */
const HorizontalProductRow: React.FC<{ products: any[]; title: string; columns: number; onMore?: () => void }> = ({
  products,
  title,
  columns,
  onMore,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) => ref.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });

  return (
    <section id="template-products" className="w-full py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <SectionHeading title={title} subtitle={'اكتشف أحدث المنتجات.'} align="start" />
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" aria-label="السابق" onClick={() => scrollBy(-1)} className="flex h-10 w-10 items-center justify-center rounded-full border transition hover:border-transparent hover:text-white" style={{ borderColor: css('--twc-border', '#e2e8f0'), color: css('--twc-text-primary', '#0f172a') , background: 'transparent'}}>
              <ChevronRight className="h-5 w-5" />
            </button>
            <button type="button" aria-label="التالي" onClick={() => scrollBy(1)} className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:opacity-90" style={{ background: css('--twc-primary', '#0f8a5f') }}>
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div ref={ref} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
          {products.map((product: any) => (
            <div key={product.id} className={`w-56 shrink-0 snap-start sm:w-64 ${columns >= 4 ? 'lg:w-72' : ''}`}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
        {onMore && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onMore}
              className="inline-flex items-center gap-2 rounded-full border px-8 py-3 text-sm font-bold transition hover:opacity-80"
              style={{ borderColor: css('--twc-primary', '#0f8a5f'), color: css('--twc-primary', '#0f8a5f') }}
            >
              عرض المزيد
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

const CatTabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-5 py-2.5 text-sm font-bold transition hover:-translate-y-0.5 ${
      active ? 'text-white' : 'border'
    }`}
    style={
      active
        ? { background: css('--twc-primary', '#0f8a5f'), color: css('--twc-primary-foreground', '#ffffff') }
        : { borderColor: css('--twc-border', '#e2e8f0'), background: '#ffffff', color: css('--twc-text-secondary', '#475569') }
    }
  >
    {label}
  </button>
);