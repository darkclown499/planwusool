import React from 'react';
import type { TemplateSectionConfig, DesignTokens } from '@/templates/types';

export interface SectionProps {
  section: TemplateSectionConfig;
  storeData: any;
  designTokens?: DesignTokens | null;
  isPreview?: boolean;
}

/**
 * Reusable section components rendered based on template JSON config.
 */

export const HeroSection: React.FC<SectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const primary = getCssVar('--twc-primary-500', '#10b77f');

  return (
    <section
      className={`relative w-full ${props.layout === 'fullscreen' ? 'min-h-screen' : 'py-16'} flex items-center justify-center overflow-hidden`}
      style={{ background: `var(--twc-background, #ffffff)` }}
    >
      <div className="relative mx-auto max-w-7xl px-4 text-center">
        <h1
          className="text-3xl font-bold sm:text-5xl"
          style={{ color: 'var(--twc-text-primary, #111827)', fontFamily: 'var(--twf-font-family, Tajawal)' }}
        >
          {storeData?.name || 'متجرك الرائع'}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
          {storeData?.description || 'اكتشف منتجاتنا المميزة بأسعار تنافسية وخدمة استثنائية.'}
        </p>
        {props.show_search && (
          <div className="mx-auto mt-8 max-w-md">
            <input
              type="text"
              placeholder="ابحث عن منتج..."
              className="w-full rounded-full border px-5 py-3 focus:outline-none focus:ring-2"
              style={{ borderColor: 'var(--twc-primary-500)', background: 'var(--twc-surface, #ffffff)', color: 'var(--twc-text-primary, #111827)' }}
            />
          </div>
        )}
        <button
          className="mt-8 rounded-full px-8 py-3 text-white shadow-lg transition hover:opacity-90"
          style={{ background: `var(--twc-primary-500, ${primary})` }}
        >
          تسوق الآن
        </button>
      </div>
    </section>
  );
};

export const CategoriesSection: React.FC<SectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const categories = storeData?.categories || [];

  if (categories.length === 0) return null;

  return (
    <section className={`py-8`} style={{ background: 'var(--twc-surface, #f9fafb)' }}>
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-6 text-2xl font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
          {props.style === 'horizontal_scroll' ? 'قائمة الطعام' : 'التصنيفات'}
        </h2>
        <div className={`${props.style === 'horizontal_scroll' ? 'flex gap-4 overflow-x-auto pb-4' : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'}`}>
          {categories.map((category: any) => (
            <div
              key={category.id}
              className="group cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 text-center transition hover:shadow-md"
              style={{ borderRadius: 'var(--twb-radius, 0.75rem)' }}
            >
              <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-3xl">
                {category.name?.charAt(0)}
              </div>
              <h3 className="font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                {category.name}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const ProductsSection: React.FC<SectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const products = storeData?.products || [];

  if (products.length === 0) return null;

  const layout = props.layout || 'grid';

  return (
    <section className="py-8" style={{ background: 'var(--twc-background, #ffffff)' }}>
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-6 text-2xl font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
          {props.bulk_order ? 'منتجات الجملة' : 'منتجاتنا'}
        </h2>

        {layout === 'menu_list' ? (
          <div className="space-y-3">
            {products.map((product: any) => (
              <div key={product.id} className="flex items-center justify-between rounded-2xl border bg-white p-4">
                <div className="flex items-center gap-4">
                  <img src={product.image} alt={product.name} className="h-14 w-14 rounded-xl object-cover" />
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>{product.name}</h3>
                    <p className="text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>{product.price} ر.س</p>
                  </div>
                </div>
                <button
                  className="rounded-full px-5 py-2 text-sm text-white"
                  style={{ background: `var(--twc-primary-500, #10b77f)` }}
                >
                  أضف للطلب
                </button>
              </div>
            ))}
          </div>
        ) : layout === 'bulk_table' ? (
          <div className="overflow-x-auto rounded-2xl border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right">المنتج</th>
                  <th className="px-4 py-3 text-right">السعر</th>
                  <th className="px-4 py-3 text-right">الكمية</th>
                  <th className="px-4 py-3 text-right">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product: any) => (
                  <tr key={product.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3">{product.price} ر.س</td>
                    <td className="px-4 py-3">
                      <input type="number" min={1} defaultValue={1} className="w-20 rounded-lg border px-2 py-1" />
                    </td>
                    <td className="px-4 py-3">{product.price} ر.س</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product: any) => (
              <div key={product.id} className="group overflow-hidden rounded-2xl border bg-white transition hover:shadow-lg">
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img src={product.image} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>{product.name}</h3>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold" style={{ color: `var(--twc-primary-600, #059669)` }}>
                      {product.price} ر.س
                    </span>
                    <button
                      className="rounded-full px-4 py-1.5 text-sm text-white transition hover:opacity-90"
                      style={{ background: `var(--twc-primary-500, #10b77f)` }}
                    >
                      أضف للسلة
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export const ReviewsSection: React.FC<SectionProps> = ({ section: _section, storeData }) => {
  const reviews = storeData?.reviews || [];

  if (reviews.length === 0) return null;

  return (
    <section className="py-8" style={{ background: 'var(--twc-surface, #f9fafb)' }}>
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="mb-6 text-2xl font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
          تقييمات العملاء
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review: any) => (
            <div key={review.id} className="rounded-2xl border bg-white p-5">
              <div className="mb-2 text-yellow-400">{'★'.repeat(review.rating || 5)}</div>
              <p className="text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>{review.comment}</p>
              <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
                {review.customer_name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const FooterSection: React.FC<SectionProps> = ({ section, storeData }) => {
  const props = section.props || {};
  const primary = getCssVar('--twc-primary-600', '#059669');

  return (
    <footer className="py-10" style={{ background: `var(--twc-primary-600, ${primary})` }}>
      <div className="mx-auto max-w-7xl px-4 text-white">
        {props.show_newsletter && (
          <div className="mb-8 rounded-2xl bg-white/10 p-6 text-center">
            <h3 className="text-lg font-bold">اشترك في النشرة البريدية</h3>
            <div className="mx-auto mt-4 flex max-w-md gap-2">
              <input type="email" placeholder="بريدك الإلكتروني" className="flex-1 rounded-full px-4 py-2 text-gray-900" />
              <button className="rounded-full bg-white px-6 py-2 font-semibold" style={{ color: `var(--twc-primary-600, ${primary})` }}>
                اشترك
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
          <div>© {new Date().getFullYear()} {storeData?.name || 'متجري'}. جميع الحقوق محفوظة</div>
          <div className="flex gap-6">
            <span className="cursor-pointer hover:underline">من نحن</span>
            <span className="cursor-pointer hover:underline">تواصل معنا</span>
            <span className="cursor-pointer hover:underline">سياسة الخصوصية</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

/**
 * Fallback for custom/special sections.
 * Renders a styled placeholder so the template layout still works.
 */
export const CustomSection: React.FC<SectionProps> = ({ section, storeData: _storeData }) => {
  const props = section.props || {};
  const componentName = props.component || section.id;

  return (
    <section className="py-10" style={{ background: 'var(--twc-background, #ffffff)' }}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
          <h2 className="text-xl font-bold" style={{ color: 'var(--twc-text-primary, #111827)' }}>
            {componentName}
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--twc-text-muted, #6b7280)' }}>
            قسم مخصص لقوالب هذا التصنيف
          </p>
        </div>
      </div>
    </section>
  );
};

export const SECTION_COMPONENTS: Record<string, React.FC<SectionProps>> = {
  hero: HeroSection,
  categories: CategoriesSection,
  products: ProductsSection,
  reviews: ReviewsSection,
  footer: FooterSection,
  custom: CustomSection,
};

/**
 * Get a CSS variable value with fallback.
 */
export function getCssVar(name: string, fallback: string): string {
  if (typeof window !== 'undefined') {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (value) return value;
  }
  return fallback;
}