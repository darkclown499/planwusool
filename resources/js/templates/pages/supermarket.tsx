import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { ChevronLeft, Search, Store } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { CompactCard, NewsletterForm, PromoStrip, SectionHeading, getVar } from './ui';

/**
 * Supermarket — market / grocery layout.
 * Announcement bar, search header, left category sidebar (desktop),
 * promo banner + dense compact product grid.
 */
const SupermarketPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config: ctxConfig } = useStorefrontCore();
    const cfg = ctxConfig || storeData?.config || {};
    const identity = storeIdentity(cfg, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');
    const [query, setQuery] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        const byCat = cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
        return byCat;
    }, [product?.filteredProducts, storeData?.products, cat]);

    const runSearch = (q: string) => {
        setQuery(q);
        product.handleSearch(q);
    };

    const accent = getVar('--twc-primary-600', '#d97706');

    const catButtons = (
        <>
            <button
                type="button"
                onClick={() => {
                    setCat('all');
                    setSidebarOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-bold transition ${cat === 'all' ? 'text-white' : 'hover:bg-gray-100'}`}
                style={cat === 'all' ? { background: accent } : { color: 'var(--twc-text-primary,#111827)' }}
            >
                <span>كل الأقسام</span>
                <ChevronLeft className="h-4 w-4" />
            </button>
            {categories.map((c: any) => (
                <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                        setCat(cat === c.id ? 'all' : c.id);
                        setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-bold transition ${cat === c.id ? 'text-white' : 'hover:bg-gray-100'}`}
                    style={cat === c.id ? { background: accent } : { color: 'var(--twc-text-primary,#111827)' }}
                >
                    <span>{c.name}</span>
                    <ChevronLeft className="h-4 w-4" />
                </button>
            ))}
        </>
    );

    return (
        <div className="min-h-screen" style={{ background: 'var(--twc-background,#ffffff)' }}>
            <PromoStrip text="🛒 عروض الأسبوع: خصومات حتى 40% على مختارات من السوق" />

            {/* Header */}
            <header
                className="sticky top-0 z-40 hidden border-b bg-white/95 backdrop-blur-md md:block"
                style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
            >
                <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: accent }}>
                            <Store className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-base leading-none font-extrabold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                                {identity.name}
                            </p>
                            <p className="text-[11px]" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                                سوبرماركت — توصيل سريع
                            </p>
                        </div>
                    </div>
                    <div className="relative w-full max-w-md">
                        <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            value={query}
                            onChange={(e) => runSearch(e.target.value)}
                            placeholder="ابحث في السوبرماركت..."
                            className="h-10 w-full rounded-full border bg-gray-50 ps-4 pe-9 text-sm outline-none focus:ring-2"
                            style={{ borderColor: 'var(--twc-border,#e5e7eb)', color: 'var(--twc-text-primary,#111827)' }}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Mobile search */}
            <div className="relative border-b px-4 py-2 md:hidden" style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}>
                <Search className="absolute start-7 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    value={query}
                    onChange={(e) => runSearch(e.target.value)}
                    placeholder="ابحث في السوبرماركت..."
                    className="h-10 w-full rounded-full border bg-gray-50 ps-11 pe-4 text-sm outline-none"
                    style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
                />
            </div>

            <main className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6">
                {/* Desktop sidebar */}
                <aside className="hidden w-64 shrink-0 lg:block">
                    <div className="sticky top-24 rounded-3xl border bg-white p-3" style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}>
                        <p className="px-3 py-1 text-xs font-black tracking-wider uppercase" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                            الأقسام
                        </p>
                        <div className="mt-2 space-y-1">{catButtons}</div>
                    </div>
                </aside>

                <div className="min-w-0 flex-1">
                    {/* Mobile category drawer toggle */}
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        className="mb-4 w-full rounded-2xl border px-4 py-3 text-sm font-bold text-white lg:hidden"
                        style={{ background: accent, borderColor: accent }}
                    >
                        تصفح الأقسام
                    </button>

                    {/* Promo banner */}
                    <section
                        className="relative mb-6 overflow-hidden rounded-3xl"
                        style={{ background: 'linear-gradient(120deg, var(--twc-primary-600,#b45309), var(--twc-primary-500,#f59e0b))' }}
                    >
                        <div className="relative z-10 px-6 py-10 md:py-12">
                            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white">عرض الأسبوع</span>
                            <h1 className="mt-3 text-2xl font-black text-white md:text-4xl">خصومات تصل إلى 40%</h1>
                            <p className="mt-2 max-w-md text-sm text-white/90">على مئات المنتجات من {identity.name} — لفترة محدودة</p>
                            <button
                                type="button"
                                onClick={() => document.getElementById('market')?.scrollIntoView({ behavior: 'smooth' })}
                                className="mt-5 rounded-full bg-white px-6 py-2.5 text-sm font-bold shadow transition hover:opacity-90"
                                style={{ color: accent }}
                            >
                                تسوق الآن
                            </button>
                        </div>
                        <div className="pointer-events-none absolute -end-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
                        <div className="pointer-events-none absolute end-24 -bottom-10 h-32 w-32 rounded-full bg-white/10" />
                    </section>

                    {/* Products */}
                    <div id="market" className="scroll-mt-24">
                        <SectionHeading title="منتجات السوق" subtitle={cat === 'all' ? 'كل المنتجات' : 'اختر ما تحتاجه'} align="start" />
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                            {products.length === 0 ? (
                                <p
                                    className="col-span-full py-16 text-center text-sm font-semibold"
                                    style={{ color: 'var(--twc-text-muted,#6b7280)' }}
                                >
                                    لا توجد منتجات في هذا القسم بعد
                                </p>
                            ) : (
                                products.map((p: any, i: number) => <CompactCard key={p.id || i} product={p} />)
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Newsletter */}
            <section className="mx-auto max-w-[1400px] px-4 pb-10">
                <div
                    className="flex flex-col items-center justify-between gap-4 rounded-3xl border bg-gray-50 p-8 md:flex-row"
                    style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
                >
                    <div>
                        <h2 className="text-xl font-extrabold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                            عروض السوق مباشرة على بريدك
                        </h2>
                        <p className="mt-1 text-sm" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                            اشترك ليصلك كل جديد وأفضل الأسعار
                        </p>
                    </div>
                    <NewsletterForm />
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t" style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}>
                <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-10 md:grid-cols-3">
                    <div>
                        <p className="font-extrabold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                            {identity.name}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                            سوبرماركت يقدم كل احتياجاتك اليومية بجودة عالية وأسعار منافسة مع توصيل سريع.
                        </p>
                    </div>
                    <div>
                        <p className="mb-2 text-sm font-black" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                            أقسامنا
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {categories.slice(0, 8).map((c: any) => (
                                <span
                                    key={c.id}
                                    className="rounded-full border px-3 py-1 text-xs font-semibold"
                                    style={{ borderColor: 'var(--twc-border,#e5e7eb)', color: 'var(--twc-text-muted,#6b7280)' }}
                                >
                                    {c.name}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="mb-2 text-sm font-black" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                            أوقات العمل
                        </p>
                        <p className="text-sm" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                            يومياً: 7 صباحاً — 11 مساءً
                        </p>
                    </div>
                </div>
                <div
                    className="border-t py-4 text-center text-xs"
                    style={{ borderColor: 'var(--twc-border,#e5e7eb)', color: 'var(--twc-text-muted,#6b7280)' }}
                >
                    © {new Date().getFullYear()} {identity.name} — جميع الحقوق محفوظة
                </div>
            </footer>

            {/* Mobile sidebar drawer */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-[70] lg:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
                    <div className="absolute inset-y-0 start-0 w-72 overflow-y-auto bg-white p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="font-extrabold" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                                الأقسام
                            </p>
                            <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-lg p-1.5 hover:bg-gray-100">
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-1">{catButtons}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupermarketPage;
