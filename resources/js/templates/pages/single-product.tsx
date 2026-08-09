import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Package, ShieldCheck, Truck } from 'lucide-react';
import React, { useMemo } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { CompactCard, FeatureGrid, PriceTag, ProductImage, QuantityPicker, RatingStars, WhatsAppOrderButton } from './ui';

/**
 * SingleProduct — product-focus page.
 * One hero product spotlighted with a sticky buy panel, then related products.
 */
const SingleProductPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config: ctxConfig } = useStorefrontCore();
    const cfg = ctxConfig || storeData?.config || {};
    const identity = storeIdentity(cfg, storeData);

    const products = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
    const hero = products[0];
    const related = useMemo(
        () => (hero ? products.filter((p: any) => String(p.categoryId) === String(hero.categoryId) && p.id !== hero.id) : []).slice(0, 8),
        [products, hero],
    );
    const fallbackRelated = hero ? products.filter((p: any) => p.id !== hero.id).slice(0, 8) : [];

    if (!hero) {
        return (
            <div
                className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-center"
                style={{ background: 'var(--twc-background,#ffffff)' }}
            >
                <p className="text-lg font-bold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                    {identity.name}
                </p>
                <p className="text-sm" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                    لا توجد منتجات بعد — أضف منتجاً من لوحة التحكم
                </p>
            </div>
        );
    }

    const showRelated = related.length ? related : fallbackRelated;

    return (
        <div className="min-h-screen" style={{ background: 'var(--twc-background,#ffffff)' }}>
            {/* Slim header */}
            <header
                className="sticky top-0 z-40 hidden border-b bg-white/95 backdrop-blur-md md:block"
                style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
            >
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                    <span className="text-lg font-extrabold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                        {identity.name}
                    </span>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Product hero */}
            <section className="mx-auto max-w-6xl px-4 py-8 md:py-12">
                <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                    <div className="relative">
                        <ProductImage product={hero} className="aspect-square w-full rounded-3xl shadow-xl" />
                        {hero.originalPrice && Number(hero.originalPrice) > Number(hero.price) && (
                            <span className="absolute start-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                                خصم {Math.round((1 - Number(hero.price) / Number(hero.originalPrice)) * 100)}%
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col justify-center">
                        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--twc-primary-500,#10b77f)' }}>
                            {hero.category || 'منتج مميز'}
                        </span>
                        <h1 className="mt-2 text-2xl leading-snug font-black md:text-4xl" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                            {hero.name}
                        </h1>
                        <div className="mt-3 flex items-center gap-2">
                            <RatingStars rating={4.8} />
                            <span className="text-xs" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                                تقييم ممتاز
                            </span>
                        </div>
                        <p className="mt-4 leading-relaxed" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                            {hero.description ||
                                'منتج عالي الجودة تم اختياره بعناية ليمنحك أفضل تجربة. اضغط على إضافة للسلة أو اطلبه عبر واتساب مباشرة.'}
                        </p>

                        <div className="mt-5 flex items-center gap-2 text-xs" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                            <Truck className="h-4 w-4 text-green-600" /> توصيل سريع لجميع المناطق
                            <span className="mx-1">•</span>
                            <ShieldCheck className="h-4 w-4 text-green-600" /> ضمان الجودة
                            <span className="mx-1">•</span>
                            <Package className="h-4 w-4 text-green-600" /> تغليف آمن
                        </div>

                        <div className="mt-6 rounded-3xl border bg-gray-50 p-5" style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}>
                            <PriceTag product={hero} large />
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                                <QuantityPicker product={hero} />
                                <WhatsAppOrderButton product={hero} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="mx-auto max-w-6xl px-4 pb-4">
                <FeatureGrid />
            </section>

            {/* Related */}
            <section className="mx-auto max-w-6xl px-4 py-10">
                <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-xl font-extrabold md:text-2xl" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                        منتجات مشابهة
                    </h2>
                    <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: 'var(--twc-primary-500,#10b77f)' }}>
                        {showRelated.length} منتج
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {showRelated.map((p: any, i: number) => (
                        <CompactCard key={p.id || i} product={p} />
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t" style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}>
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 md:flex-row">
                    <p className="text-sm font-bold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                        {identity.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                        © {new Date().getFullYear()} — جميع الحقوق محفوظة
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default SingleProductPage;
