import React, { useEffect, useState } from 'react';
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import { SectionHeading, ProductCard, EmptySection, css, priceOf, productWhatsAppUrl } from './helpers';
import { getImageUrl } from '@/utils/image-helper';
import type { BuilderSectionProps } from './helpers';

const GRID_COLS: Record<number, string> = {
  2: 'grid grid-cols-2 gap-3 sm:gap-4',
  3: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5',
  4: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4',
  5: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 lg:grid-cols-5',
  6: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
};

export const ProductsSection: React.FC<BuilderSectionProps> = ({ section, storeData, mode }) => {
  const props = section.props || {};
  const { product: productCtx, config } = useStorefrontCore();

  // Start from "all products" so the homepage grid shows the full catalog.
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
  const layout = props.layout || 'grid';
  const title = props.section_title || (featuredOnly ? 'منتجات مميزة' : 'منتجاتنا');

  if (!filtered.length) {
    return (
      <EmptySection
        title={mode === 'edit' ? 'معاينة المنتجات' : 'لا توجد منتجات'}
        hint={mode === 'edit' ? 'ستظهر منتجاتك الفعلية هنا عند الانتقال للمتجر بعد الحفظ.' : 'أضف منتجات من لوحة التحكم ليظهر القسم.'}
      />
    );
  }

  if (layout === 'list') {
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
                    <img
                      src={getImageUrl(product.image)}
                      alt={product.name}
                      className="h-24 w-24 rounded-xl object-cover sm:h-28 sm:w-28"
                    />
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
                    <div className="flex items-center gap-2">
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
                style={{
                  borderColor: css('--twc-primary', '#0f8a5f'),
                  color: css('--twc-primary', '#0f8a5f'),
                }}
              >
                عرض المزيد
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section id="template-products" className="w-full px-4 py-10 sm:py-14" style={{ background: css('--twc-surface', '#f8fafc') }}>
      <div className="mx-auto max-w-7xl">
        <SectionHeading title={title} subtitle={'أحدث ما وصل حديثاً إلى متجرنا.'} />
        <div className={GRID_COLS[columns] || GRID_COLS[4]}>
          {visibleProducts.map((product: any) => (
            <ProductCard key={product.id} product={product} />
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