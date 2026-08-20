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
      <section id="template-products" className="w-full px-4 py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
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
      <section id="template-products" className="w-full px-4 py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
        <div className="mx-auto max-w-7xl">
          <SectionHeading title={title} subtitle={'اكتشف منتجاتنا المميزة أولاً.'} />
          <div className="grid gap-5 lg:grid-cols-2">
            {featured && (
              <div className="h-full">
                <DetailedProductCard product={featured} />
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
      <section id="template-products" className="w-full px-4 py-10 sm:py-14" style={{ background: css('--twc-surface', '#f8fafc') }}>
        <div className="mx-auto max-w-7xl">
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
      className="w-full px-4 py-10 sm:py-14"
      style={{ background: compact ? css('--twc-background', '#ffffff') : css('--twc-surface', '#f8fafc') }}
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading title={title} subtitle={'أحدث ما وصل حديثاً إلى متجرنا.'} />
        <div className={GRID_COLS[variant === 'compact_grid' ? Math.min(columns, 6) : columns] || GRID_COLS[4]}>
          {visibleProducts.map((product: any) =>
            compact ? (
              <ProductCard key={product.id} product={product} compact />
            ) : (
              <DetailedProductCard key={product.id} product={product} />
            )
          )}
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

/* Richer card: bigger imagery, badges (sale / out-of-stock / new), description. */
const DetailedProductCard: React.FC<{ product: any }> = ({ product }) => {
  const { product: productCtx, cart, config } = useStorefrontCore();
  const image = getImageUrl(product.image);
  const hasSale = Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price);
  const saleOff = hasSale ? Math.round(((Number(product.price) - Number(product.sale_price)) / Number(product.price)) * 100) : 0;
  const inStock = product.stock === null || product.stock === undefined || Number(product.stock) > 0;
  const isNew = product.is_new === true || product.featured === true;
  const whatsapp = productWhatsAppUrl(config, product);

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ borderColor: css('--twc-border', '#e2e8f0'), borderRadius: css('--twx-radius', '1rem') }}
    >
      <button
        type="button"
        onClick={() => productCtx.handleProductClick(product)}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 text-start"
        aria-label={product.name}
      >
        {image ? (
          <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300" />
        )}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {hasSale && (
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: css('--twc-danger', '#dc2626') }}>
              خصم {saleOff}%
            </span>
          )}
          {isNew && (
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow ring-1 ring-emerald-100">
              جديد
            </span>
          )}
        </div>
        {!inStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-bold text-white">
            نفد المخزون
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <button type="button" onClick={() => productCtx.handleProductClick(product)} className="text-start">
          <h3 className="line-clamp-1 text-sm font-bold sm:text-base" style={{ color: css('--twc-text-primary', '#0f172a') }}>
            {product.name}
          </h3>
        </button>
        {product.short_description && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{product.short_description}</p>
        )}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 border-t pt-3" style={{ borderColor: css('--twc-border', '#e2e8f0') }}>
          <div className="flex flex-col">
            {hasSale && <span className="text-xs text-slate-400 line-through">{priceOf(product)}</span>}
            <span className="text-lg font-extrabold" style={{ color: css('--twc-primary', '#0f8a5f') }}>
              {priceOf(product)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="اطلب عبر واتساب"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:opacity-90"
                style={{ background: '#25D366' }}
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              onClick={() => cart.addToCart(product)}
              aria-label="أضف للسلة"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:opacity-90 active:scale-95"
              style={{ background: css('--twc-primary', '#0f8a5f') }}
            >
              أضف
            </button>
          </div>
        </div>
      </div>
    </article>
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
    <section id="template-products" className="w-full px-4 py-10 sm:py-14" style={{ background: css('--twc-background', '#ffffff') }}>
      <div className="mx-auto max-w-7xl">
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