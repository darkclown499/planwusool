import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Search } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ClassicCard, NewsletterForm, ProductGrid, PromoStrip, SectionHeading, TestimonialsSection, TrustBar, getVar } from './ui';

/**
 * Basic — clean, minimal, universal store.
 * Centered hero with search, chip category filter, classic product grid.
 */
const BasicPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { t } = useTranslation();
    const { product, config: ctxConfig } = useStorefrontCore();
    const cfg = ctxConfig || storeData?.config || {};
    const identity = storeIdentity(cfg, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [query, setQuery] = useState('');
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        if (cat === 'all') return list;
        return list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const runSearch = (q: string) => {
        setQuery(q);
        product.handleSearch(q);
    };

    const heading = getVar('--twc-primary-600', '#059669');

    return (
        <div className="min-h-screen" style={{ background: 'var(--twc-background,#ffffff)' }}>
            <PromoStrip />

            {/* Desktop header */}
            <header
                className="sticky top-0 z-40 hidden border-b bg-white/95 backdrop-blur-md md:block"
                style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
            >
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-extrabold" style={{ color: 'var(--twc-primary-600,#059669)' }}>
                            {identity.name.charAt(0)}
                        </span>
                        <span className="text-lg font-extrabold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                            {identity.name}
                        </span>
                    </div>
                    <nav className="hidden items-center gap-1 lg:flex">
                        {categories.slice(0, 6).map((c: any) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${cat === c.id ? 'text-white' : 'hover:bg-gray-100'}`}
                                style={cat === c.id ? { background: heading } : { color: 'var(--twc-text-primary,#111827)' }}
                            >
                                {c.name}
                            </button>
                        ))}
                    </nav>
                    <div className="flex items-center gap-2">
                        <div className="relative hidden xl:block">
                            <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                value={query}
                                onChange={(e) => runSearch(e.target.value)}
                                placeholder="ابحث عن منتج..."
                                className="h-9 w-44 rounded-full border bg-gray-50 ps-4 pe-9 text-sm outline-none focus:ring-2"
                                style={{ borderColor: 'var(--twc-border,#e5e7eb)', color: 'var(--twc-text-primary,#111827)' }}
                            />
                        </div>
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Mobile search bar */}
            <div className="relative border-b px-4 py-2 md:hidden" style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}>
                <Search className="absolute start-7 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    value={query}
                    onChange={(e) => runSearch(e.target.value)}
                    placeholder="ابحث عن منتج..."
                    className="h-10 w-full rounded-full border bg-gray-50 ps-11 pe-4 text-sm outline-none"
                    style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
                />
            </div>

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(135deg, var(--twc-primary-600,#059669), var(--twc-primary-500,#10b77f))' }}
                />
                <div className="pointer-events-none absolute -end-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -start-16 -bottom-24 h-72 w-72 rounded-full bg-white/10" />
                <div className="relative mx-auto max-w-7xl px-4 py-16 text-center md:py-24">
                    <span className="inline-block rounded-full bg-white/20 px-4 py-1 text-xs font-bold text-white">
                        {identity.description ? 'أهلاً بك في' : 'متجرك المميز'}
                    </span>
                    <h1 className="mt-4 text-3xl leading-tight font-black text-white md:text-5xl" style={{ fontWeight: '900' }}>
                        {identity.name}
                    </h1>
                    <p className="mx-auto mt-3 max-w-xl text-sm text-white/90 md:text-base">
                        {identity.description || 'اكتشف تشكيلتنا المميزة من أفضل المنتجات بأسعار تنافسية وجودة عالية'}
                    </p>
                    <div className="mx-auto mt-7 flex max-w-lg items-center gap-2 rounded-full bg-white p-1.5 shadow-xl">
                        <Search className="ms-3 h-5 w-5 shrink-0 text-gray-400" />
                        <input
                            value={query}
                            onChange={(e) => runSearch(e.target.value)}
                            placeholder="ابحث عن منتج..."
                            className="h-10 w-full bg-transparent text-sm outline-none"
                            style={{ color: 'var(--twc-text-primary,#111827)' }}
                        />
                        <button
                            type="button"
                            onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
                            className="h-10 shrink-0 rounded-full bg-gray-900 px-6 text-sm font-bold text-white transition hover:opacity-90"
                        >
                            تصفح
                        </button>
                    </div>
                </div>
            </section>

            <main className="mx-auto max-w-7xl px-4 py-10">
                {/* Categories */}
                {categories.length > 0 && (
                    <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
                        <button
                            type="button"
                            onClick={() => setCat('all')}
                            className={`rounded-full px-4 py-2 text-sm font-bold transition ${cat === 'all' ? 'text-white shadow' : 'border hover:bg-gray-50'}`}
                            style={
                                cat === 'all'
                                    ? { background: heading }
                                    : { borderColor: 'var(--twc-border,#e5e7eb)', color: 'var(--twc-text-primary,#111827)' }
                            }
                        >
                            الكل
                        </button>
                        {categories.map((c: any) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                                className={`rounded-full px-4 py-2 text-sm font-bold transition ${cat === c.id ? 'text-white shadow' : 'border hover:bg-gray-50'}`}
                                style={
                                    cat === c.id
                                        ? { background: heading }
                                        : { borderColor: 'var(--twc-border,#e5e7eb)', color: 'var(--twc-text-primary,#111827)' }
                                }
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* Products */}
                <div id="products" className="scroll-mt-24">
                    <SectionHeading title="منتجاتنا" subtitle="اختر من تشكيلتنا المميزة" />
                    <ProductGrid products={products} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {(p, i) => <ClassicCard key={p.id || i} product={p} />}
                    </ProductGrid>
                </div>

                {/* Trust */}
                <div className="mt-12">
                    <TrustBar />
                </div>

                {/* Testimonials */}
                <div className="mt-12">
                    <SectionHeading title="آراء عملائنا" subtitle="ماذا قالوا عن تجربتهم معنا" />
                    <TestimonialsSection />
                </div>

                {/* Newsletter */}
                <div
                    className="mt-12 overflow-hidden rounded-3xl p-8 text-center md:p-12"
                    style={{ background: 'linear-gradient(135deg, var(--twc-primary-600,#059669), var(--twc-primary-500,#10b77f))' }}
                >
                    <h2 className="text-2xl font-extrabold text-white md:text-3xl">اشترك في النشرة البريدية</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-white/90">احصل على أحدث العروض والتخفيضات الحصرية أولاً بأول</p>
                    <NewsletterForm className="mx-auto mt-5" />
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t bg-gray-50" style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}>
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 md:flex-row">
                    <p className="text-sm font-bold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                        © {new Date().getFullYear()} {identity.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                        جميع الحقوق محفوظة
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default BasicPage;
