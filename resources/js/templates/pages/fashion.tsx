import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { ArrowLeft, Instagram } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { EditorialCard, NewsletterForm, ProductGrid, SectionHeading, getVar } from './ui';

/**
 * Fashion — editorial magazine store.
 * Overlay transparent header, oversized split hero, full-width category
 * image cards, masonry editorial product grid.
 */
const FashionPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config: ctxConfig } = useStorefrontCore();
    const cfg = ctxConfig || storeData?.config || {};
    const identity = storeIdentity(cfg, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const accent = getVar('--twc-primary-600', '#111827');

    return (
        <div className="min-h-screen" style={{ background: 'var(--twc-background,#ffffff)' }}>
            {/* Overlay header (desktop) */}
            <header className="pointer-events-none absolute inset-x-0 top-0 z-40 hidden md:block">
                <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
                    <span className="text-xl font-black tracking-wide text-white drop-shadow">{identity.name}</span>
                    <nav className="pointer-events-auto flex items-center gap-6 text-sm font-bold text-white drop-shadow">
                        <a href="#lookbook" className="hover:underline">
                            التشكيلة
                        </a>
                        <a href="#categories" className="hover:underline">
                            الأقسام
                        </a>
                        <a href="#about" className="hover:underline">
                            قصتنا
                        </a>
                    </nav>
                    <div className="pointer-events-auto flex items-center gap-2">
                        <AccountButton className="!border-white/40 !bg-transparent !text-white" />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Editorial hero */}
            <section className="relative flex min-h-[92vh] items-center overflow-hidden">
                <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(150deg, var(--twc-primary-600,#1f2937), var(--twc-primary-500,#4b5563))' }}
                />
                <div className="pointer-events-none absolute -start-24 top-1/3 h-96 w-96 rounded-full bg-white/5 blur-2xl" />
                <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-6 py-24 lg:grid-cols-2">
                    <div>
                        <p className="text-sm font-bold tracking-[0.3em] text-white/70 uppercase">Collection 2026</p>
                        <h1 className="mt-4 text-4xl leading-[1.1] font-black text-white md:text-6xl">
                            أناقة تبدأ
                            <br />
                            من هنا
                        </h1>
                        <p className="mt-5 max-w-md text-white/85">اكتشف أحدث صيحات الموضة من {identity.name} — قطع مختارة بعناية لتعكس شخصيتك</p>
                        <div className="mt-8 flex items-center gap-3">
                            <a
                                href="#lookbook"
                                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-black transition hover:opacity-90"
                                style={{ color: accent }}
                            >
                                تسوقي الآن <ArrowLeft className="h-4 w-4" />
                            </a>
                            <a
                                href="#categories"
                                className="rounded-full border border-white/40 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                            >
                                تصفح الأقسام
                            </a>
                        </div>
                    </div>
                    <div className="relative hidden lg:block">
                        <div className="grid grid-cols-3 gap-4" style={{ transform: 'rotate(3deg)' }}>
                            {products.slice(0, 3).map((p: any, i: number) => (
                                <div
                                    key={p.id || i}
                                    className={`overflow-hidden rounded-3xl shadow-2xl ${i === 1 ? 'mt-10 scale-105' : i === 2 ? 'mt-20' : ''}`}
                                >
                                    <div
                                        className="flex aspect-[3/4] w-full items-center justify-center text-5xl font-black text-white/80"
                                        style={{ background: 'linear-gradient(150deg, rgba(255,255,255,0.18), rgba(255,255,255,0.05))' }}
                                    >
                                        {p.name?.charAt(0)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories */}
            <section id="categories" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-14">
                <SectionHeading title="تسوق حسب القسم" subtitle="استكشف مجموعاتنا المصممة بعناية" />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {categories.slice(0, 6).map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                                setCat(cat === c.id ? 'all' : c.id);
                                document.getElementById('lookbook')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="group relative overflow-hidden rounded-3xl"
                        >
                            <div
                                className="flex aspect-[4/3] w-full items-center justify-center transition duration-500 group-hover:scale-105"
                                style={{ background: 'linear-gradient(135deg, var(--twc-primary-600,#111827), var(--twc-primary-500,#374151))' }}
                            >
                                <span className="text-4xl text-white/60">{c.name.charAt(0)}</span>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-start">
                                <p className="text-sm font-black text-white">{c.name}</p>
                                <p className="text-xs text-white/70">{c.description || 'تشكيلة مختارة'}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* Lookbook / products */}
            <section id="lookbook" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-8">
                <SectionHeading title="اللوك بوك" subtitle={cat === 'all' ? 'أحدث القطع' : categories.find((c: any) => c.id === cat)?.name} />
                <ProductGrid products={products} className="columns-2 gap-4 lg:columns-3 [&>*]:mb-4">
                    {(p, i) => <EditorialCard key={p.id || i} product={p} index={i} className="break-inside-avoid" />}
                </ProductGrid>
            </section>

            {/* About / newsletter */}
            <section id="about" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-14">
                <div
                    className="grid items-center gap-8 overflow-hidden rounded-[2.5rem] bg-gray-50 md:grid-cols-2"
                    style={{ background: 'var(--twc-surface,#f9fafb)' }}
                >
                    <div className="p-8 md:p-12">
                        <p className="text-xs font-black tracking-[0.3em] uppercase" style={{ color: 'var(--twc-primary-500,#10b77f)' }}>
                            قصتنا
                        </p>
                        <h2 className="mt-3 text-3xl leading-snug font-black" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                            أسلوبك يعكس هويتك
                        </h2>
                        <p className="mt-4 leading-relaxed" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                            في {identity.name} نؤمن أن الموضة ليست مجرد ملابس، بل تعبير عن الشخصية. نختار كل قطعة بعناية لنقدم لك تجربة تسوق
                            استثنائية.
                        </p>
                        <NewsletterForm className="mt-6" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-6">
                        {products.slice(0, 4).map((p: any, i: number) => (
                            <div
                                key={p.id || i}
                                className={`flex aspect-[3/4] items-center justify-center rounded-3xl text-4xl font-black text-white/70 ${i % 2 ? 'translate-y-6' : ''}`}
                                style={{ background: 'linear-gradient(140deg, var(--twc-primary-600,#1f2937), var(--twc-primary-500,#4b5563))' }}
                            >
                                {p.name?.charAt(0)}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t" style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}>
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
                    <p className="text-lg font-black" style={{ color: 'var(--twc-text-primary,#111827)' }}>
                        {identity.name}
                    </p>
                    <div className="flex items-center gap-3">
                        <a
                            href="#"
                            className="flex h-10 w-10 items-center justify-center rounded-full border transition hover:bg-gray-50"
                            style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
                            aria-label="Instagram"
                        >
                            <Instagram className="h-4 w-4" />
                        </a>
                        <span
                            className="flex h-10 w-10 items-center justify-center rounded-full border transition hover:bg-gray-50"
                            style={{ borderColor: 'var(--twc-border,#e5e7eb)' }}
                            aria-label="Facebook"
                        >
                            f
                        </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--twc-text-muted,#6b7280)' }}>
                        © {new Date().getFullYear()} {identity.name} — جميع الحقوق محفوظة
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default FashionPage;
