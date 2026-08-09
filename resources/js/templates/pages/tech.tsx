import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Cpu, Gauge, Rocket, Search, ShieldCheck } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, RatingStars, getVar } from './ui';

/**
 * Tech — dark cyber storefront with neon accents, spec badges and a
 * dense product grid. Dark hero, category tiles, stats strip.
 */
const TechPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');
    const [query, setQuery] = useState('');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const runSearch = (q: string) => {
        setQuery(q);
        product.handleSearch(q);
    };

    const neon = getVar('--twc-primary-500', '#22d3ee');
    const neonDark = getVar('--twc-primary-600', '#0891b2');

    return (
        <div className="min-h-screen" style={{ background: '#0b0f19' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-white/10 bg-[#0b0f19]/95 backdrop-blur-md md:block">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
                    <div className="flex items-center gap-2">
                        <span
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-black"
                            style={{ background: `linear-gradient(135deg, ${neonDark}, ${neon})`, color: '#0b0f19' }}
                        >
                            {identity.name.charAt(0)}
                        </span>
                        <span className="text-lg font-extrabold tracking-tight text-white">{identity.name}</span>
                    </div>
                    <nav className="hidden items-center gap-1 lg:flex">
                        {categories.slice(0, 6).map((c: any) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${cat === c.id ? 'text-[#0b0f19]' : 'text-gray-400 hover:text-white'}`}
                                style={cat === c.id ? { background: neon } : {}}
                            >
                                {c.name}
                            </button>
                        ))}
                    </nav>
                    <div className="flex items-center gap-2">
                        <div className="relative hidden xl:block">
                            <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <input
                                value={query}
                                onChange={(e) => runSearch(e.target.value)}
                                placeholder="ابحث عن جهاز..."
                                className="h-9 w-44 rounded-full border border-white/10 bg-white/5 ps-4 pe-9 text-sm text-white outline-none placeholder:text-gray-500 focus:border-white/30"
                            />
                        </div>
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Mobile search */}
            <div className="relative border-b border-white/10 px-4 py-2 md:hidden">
                <Search className="absolute start-7 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                    value={query}
                    onChange={(e) => runSearch(e.target.value)}
                    placeholder="ابحث عن جهاز..."
                    className="h-10 w-full rounded-full border border-white/10 bg-white/5 ps-11 pe-4 text-sm text-white outline-none placeholder:text-gray-500"
                />
            </div>

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div
                    className="absolute inset-0"
                    style={{
                        background: `radial-gradient(ellipse at 20% 0%, ${neonDark}33 0%, transparent 60%), linear-gradient(160deg, #0d1526 0%, #0b0f19 70%)`,
                    }}
                />
                <div
                    className="pointer-events-none absolute -end-24 top-10 h-80 w-80 rounded-full opacity-30 blur-3xl"
                    style={{ background: neon }}
                />
                <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24">
                    <div className="max-w-2xl">
                        <span
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-xs font-bold"
                            style={{ color: neon }}
                        >
                            <Cpu className="h-3.5 w-3.5" /> تقنية الجيل الجديد
                        </span>
                        <h1 className="mt-4 text-3xl leading-tight font-black text-white md:text-5xl">
                            تقنية تسبق
                            <br />
                            <span style={{ color: neon }}>خيالك</span>
                        </h1>
                        <p className="mt-4 max-w-md text-gray-400">أحدث الأجهزة والإكسسوارات من {identity.name} بمواصفات عالية وضمان حقيقي</p>
                        <div className="mt-7 flex flex-wrap items-center gap-3">
                            <a
                                href="#store"
                                className="inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-black text-[#0b0f19] transition hover:opacity-90"
                                style={{ background: neon }}
                            >
                                <Rocket className="h-4 w-4" /> تسوق الآن
                            </a>
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
                                <ShieldCheck className="h-4 w-4" style={{ color: neon }} /> ضمان سنتين على جميع المنتجات
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats strip */}
            <section className="border-y border-white/10" style={{ background: '#0d1526' }}>
                <div className="mx-auto grid max-w-7xl grid-cols-3 gap-4 px-4 py-6 text-center">
                    {[
                        { icon: <Gauge className="h-5 w-5" />, num: '+2000', label: 'منتج متوفر' },
                        { icon: <ShieldCheck className="h-5 w-5" />, num: '99%', label: 'تقييم رضا' },
                        { icon: <Rocket className="h-5 w-5" />, num: '24h', label: 'معالجة الطلب' },
                    ].map((s) => (
                        <div key={s.label}>
                            <span
                                className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-lg"
                                style={{ background: `${neon}22`, color: neon }}
                            >
                                {s.icon}
                            </span>
                            <p className="text-lg font-black text-white">{s.num}</p>
                            <p className="text-xs text-gray-500">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            <main className="mx-auto max-w-7xl px-4 py-10">
                {/* Category tiles */}
                <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className="rounded-2xl border border-white/10 p-4 text-center transition hover:border-white/30"
                        style={cat === 'all' ? { background: `${neon}22`, borderColor: neon } : { background: 'rgba(255,255,255,0.02)' }}
                    >
                        <span className="text-2xl">⚡</span>
                        <p className={`mt-1 text-sm font-bold ${cat === 'all' ? '' : 'text-gray-400'}`} style={cat === 'all' ? { color: neon } : {}}>
                            الكل
                        </p>
                    </button>
                    {categories.slice(0, 8).map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className="rounded-2xl border border-white/10 p-4 text-center transition hover:border-white/30"
                            style={cat === c.id ? { background: `${neon}22`, borderColor: neon } : { background: 'rgba(255,255,255,0.02)' }}
                        >
                            <span className="text-2xl">🔌</span>
                            <p
                                className={`mt-1 text-sm font-bold ${cat === c.id ? '' : 'text-gray-400'}`}
                                style={cat === c.id ? { color: neon } : {}}
                            >
                                {c.name}
                            </p>
                        </button>
                    ))}
                </div>

                {/* Products */}
                <div id="store" className="scroll-mt-24">
                    <div className="mb-5 flex items-center justify-between">
                        <h2 className="text-xl font-extrabold text-white md:text-2xl">الأجهزة</h2>
                        <span className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: `${neon}22`, color: neon }}>
                            {products.length} منتج
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {products.length === 0 ? (
                            <p className="col-span-full py-16 text-center text-sm font-semibold text-gray-500">لا توجد أجهزة في هذا القسم بعد</p>
                        ) : (
                            products.map((p: any, i: number) => (
                                <article
                                    key={p.id || i}
                                    className="group cursor-pointer overflow-hidden rounded-2xl border border-white/10 transition hover:border-white/30"
                                    style={{ background: 'rgba(255,255,255,0.03)' }}
                                    onClick={() => product.handleProductClick(p)}
                                >
                                    <div className="relative">
                                        <ProductImage product={p} className="aspect-square" />
                                        {p.originalPrice && Number(p.originalPrice) > Number(p.price) && (
                                            <span
                                                className="absolute start-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-black"
                                                style={{ background: neon, color: '#0b0f19' }}
                                            >
                                                -{Math.round((1 - Number(p.price) / Number(p.originalPrice)) * 100)}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <h3 className="truncate text-sm font-bold text-gray-100">{p.name}</h3>
                                        <div className="mt-1 flex items-center gap-1">
                                            <RatingStars rating={4.5} />
                                        </div>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-sm font-black" style={{ color: neon }}>
                                                {p.price} {identity.currency}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    product.handleProductClick(p);
                                                }}
                                                className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#0b0f19] transition hover:opacity-90"
                                                style={{ background: neon }}
                                            >
                                                شراء
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10" style={{ background: '#0d1526' }}>
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 md:flex-row">
                    <p className="font-extrabold text-white">{identity.name}</p>
                    <p className="text-xs text-gray-500">
                        © {new Date().getFullYear()} — جميع الحقوق محفوظة • تقنية {identity.currency}
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default TechPage;
