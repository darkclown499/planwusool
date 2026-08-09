import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { ChevronDown, Timer } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { getVar, ProductImage, SectionHeading } from './ui';

/**
 * LuxuryWatches — deep navy & gold, split hero with a watch showcase
 * collage, featured spotlight row and elegant grid.
 */
const LuxuryWatchesPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const gold = getVar('--twc-primary-500', '#c9a227');
    const navy = getVar('--twc-primary-600', '#1e293b');

    const serif = "Georgia, 'Times New Roman', serif";

    return (
        <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${navy} 0%, #0f172a 40%)`, color: '#f1f5f9' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-white/10 bg-[#0f172a]/90 backdrop-blur-md md:block">
                <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Timer className="h-6 w-6" style={{ color: gold }} />
                        <span className="text-xl font-bold tracking-wide" style={{ fontFamily: serif }}>
                            {identity.name}
                        </span>
                    </div>
                    <nav className="flex items-center gap-8 text-sm font-semibold text-slate-300">
                        <a href="#collection" className="hover:text-white">
                            المجموعة
                        </a>
                        <a href="#featured" className="hover:text-white">
                            المميز
                        </a>
                        <a href="#about" className="hover:text-white">
                            قصتنا
                        </a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Split hero */}
            <section className="mx-auto max-w-7xl px-6 py-14 md:py-20">
                <div className="grid items-center gap-12 lg:grid-cols-2">
                    <div>
                        <p className="text-xs tracking-[0.4em] uppercase" style={{ color: gold }}>
                            Time, Perfected
                        </p>
                        <h1 className="mt-5 text-4xl leading-tight font-light text-white md:text-6xl" style={{ fontFamily: serif }}>
                            وقتك يستحق
                            <br />
                            <span style={{ color: gold }}>أجمل التفاصيل</span>
                        </h1>
                        <p className="mt-5 max-w-md leading-relaxed text-slate-400">
                            ساعات فاخرة تجمع بين الحرفية السويسرية والتصميم الخالد، من {identity.name} لعشاق الدقة والأناقة.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <a
                                href="#collection"
                                className="inline-flex items-center gap-2 px-9 py-3.5 text-sm font-bold text-[#0f172a] transition hover:opacity-90"
                                style={{ background: gold }}
                            >
                                تسوق المجموعة
                            </a>
                            <a
                                href="#featured"
                                className="inline-flex items-center gap-1 border-b border-white/30 pb-1 text-sm text-slate-300 transition hover:text-white"
                            >
                                شاهد القطعة المميزة <ChevronDown className="h-4 w-4" />
                            </a>
                        </div>
                    </div>

                    {/* Watch showcase */}
                    <div className="relative">
                        <div
                            className="pointer-events-none absolute inset-0 -z-10"
                            style={{ background: `radial-gradient(circle at 50% 50%, ${gold}22 0%, transparent 60%)` }}
                        />
                        <div className="grid grid-cols-3 gap-5">
                            {products.slice(0, 3).map((p: any, i: number) => (
                                <div
                                    key={p.id || i}
                                    className={`relative overflow-hidden rounded-full border border-white/10 shadow-2xl ${i === 1 ? 'mt-12 scale-110' : 'mt-0'}`}
                                    style={{ background: '#1e293b' }}
                                >
                                    <div
                                        className="flex aspect-square items-center justify-center text-3xl font-light text-white/70"
                                        style={{ fontFamily: serif }}
                                    >
                                        {p.name?.charAt(0)}
                                    </div>
                                    <ProductImage product={p} className="absolute inset-0" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Category nav */}
            <section className="mx-auto max-w-7xl px-6">
                <div className="flex flex-wrap items-center gap-2 border-y border-white/10 py-4">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className={`px-4 py-1.5 text-xs font-bold tracking-widest uppercase transition ${cat === 'all' ? '' : 'text-slate-500 hover:text-white'}`}
                        style={cat === 'all' ? { color: gold } : {}}
                    >
                        الكل
                    </button>
                    {categories.map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className={`px-4 py-1.5 text-xs font-bold tracking-widest uppercase transition ${cat === c.id ? '' : 'text-slate-500 hover:text-white'}`}
                            style={cat === c.id ? { color: gold } : {}}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </section>

            {/* Featured spotlight */}
            {products[0] && (
                <section id="featured" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-16">
                    <SectionHeading title="قطعة هذا الأسبوع" subtitle="اختيار حصري من مجموعتنا" />
                    <article
                        className="grid items-center gap-10 overflow-hidden rounded-[2rem] border border-white/10 p-8 md:grid-cols-2 md:p-12"
                        style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                        <div className="relative mx-auto w-full max-w-sm">
                            <ProductImage product={products[0]} className="aspect-square rounded-full border border-white/15" />
                        </div>
                        <div>
                            <span
                                className="rounded-full border border-white/20 px-4 py-1 text-[10px] tracking-[0.3em] uppercase"
                                style={{ color: gold }}
                            >
                                Featured
                            </span>
                            <h3 className="mt-4 text-2xl font-light text-white md:text-3xl" style={{ fontFamily: serif }}>
                                {products[0].name}
                            </h3>
                            <p className="mt-3 max-w-md leading-relaxed text-slate-400">
                                {products[0].description || 'قطعة استثنائية تجمع بين الحرفية والأناقة، محدودة الكمية.'}
                            </p>
                            <div className="mt-5 flex items-center gap-4">
                                <span className="text-2xl font-bold" style={{ color: gold }}>
                                    {products[0].price} {identity.currency}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => product.handleProductClick(products[0])}
                                    className="px-7 py-3 text-sm font-bold text-[#0f172a] transition hover:opacity-90"
                                    style={{ background: gold }}
                                >
                                    اطلبها الآن
                                </button>
                            </div>
                        </div>
                    </article>
                </section>
            )}

            {/* Collection */}
            <section id="collection" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-16">
                <SectionHeading title="المجموعة" subtitle="ساعات لكل الأذواق" />
                <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
                    {products.length === 0 ? (
                        <p className="col-span-full py-16 text-center text-sm text-slate-500">لا توجد ساعات بعد — أضف منتجاتك من لوحة التحكم</p>
                    ) : (
                        products.slice(0).map((p: any, i: number) => (
                            <article key={p.id || i} className="group cursor-pointer" onClick={() => product.handleProductClick(p)}>
                                <div
                                    className="overflow-hidden rounded-2xl border border-white/10 transition group-hover:border-white/30"
                                    style={{ background: 'rgba(255,255,255,0.03)' }}
                                >
                                    <ProductImage
                                        product={p}
                                        className="aspect-square"
                                        imgClassName="transition duration-500 group-hover:scale-105"
                                    />
                                </div>
                                <h3 className="mt-3 truncate text-sm font-semibold text-white">{p.name}</h3>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-sm font-bold" style={{ color: gold }}>
                                        {p.price} {identity.currency}
                                    </span>
                                    {p.originalPrice && Number(p.originalPrice) > Number(p.price) && (
                                        <span className="text-xs text-slate-500 line-through opacity-50">
                                            {p.originalPrice} {identity.currency}
                                        </span>
                                    )}
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* About */}
            <section id="about" className="mx-auto max-w-4xl scroll-mt-24 px-6 pb-16 text-center">
                <p className="text-xs tracking-[0.4em] uppercase" style={{ color: gold }}>
                    قصتنا
                </p>
                <h2 className="mt-4 text-3xl font-light text-white md:text-4xl" style={{ fontFamily: serif }}>
                    كل ثانية لها حكاية
                </h2>
                <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-400">
                    في {identity.name} نختار كل ساعة بعين خبيرة، لنقدم لك ما يليق بمعصمك ووقتك. حرفية، دقة، وأناقة لا تُضاهى.
                </p>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
                    <p className="text-lg" style={{ fontFamily: serif, fontWeight: 600 }}>
                        {identity.name}
                    </p>
                    <p className="text-xs tracking-[0.3em] text-slate-500 uppercase">© {new Date().getFullYear()} — صُنع بعناية</p>
                </div>
            </footer>
        </div>
    );
};

export default LuxuryWatchesPage;
