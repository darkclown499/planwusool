import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Cog, Search, Wrench } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, RatingStars, SectionHeading, getVar } from './ui';

/**
 * AutoParts — industrial dark storefront with technical badges and a
 * dense category grid. Built for spare parts and accessories.
 */
const AutoPartsPage: React.FC<TemplatePageProps> = ({ storeData }) => {
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

    const steel = getVar('--twc-primary-500', '#f59e0b');
    const steelDeep = getVar('--twc-primary-600', '#b45309');

    return (
        <div className="min-h-screen" style={{ background: '#1c1917', color: '#e7e5e4' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-white/10 bg-[#1c1917]/95 backdrop-blur-md md:block">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
                    <div className="flex items-center gap-2">
                        <span
                            className="flex h-9 w-9 items-center justify-center rounded-lg"
                            style={{ background: `linear-gradient(135deg, ${steelDeep}, ${steel})`, color: '#1c1917' }}
                        >
                            <Cog className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-black tracking-tight text-white">{identity.name}</span>
                    </div>
                    <div className="relative w-full max-w-md">
                        <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                        <input
                            value={query}
                            onChange={(e) => runSearch(e.target.value)}
                            placeholder="ابحث بماركة السيارة أو القطعة..."
                            className="h-10 w-full rounded-lg border border-white/10 bg-white/5 ps-4 pe-9 text-sm text-white outline-none placeholder:text-stone-500 focus:border-[#f59e0b]"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Mobile search */}
            <div className="relative border-b border-white/10 px-4 py-2 md:hidden">
                <Search className="absolute start-7 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
                <input
                    value={query}
                    onChange={(e) => runSearch(e.target.value)}
                    placeholder="ابحث بماركة السيارة أو القطعة..."
                    className="h-10 w-full rounded-lg border border-white/10 bg-white/5 ps-11 pe-4 text-sm text-white outline-none placeholder:text-stone-500"
                />
            </div>

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #292524 0%, #1c1917 60%)' }} />
                <div
                    className="absolute inset-0 opacity-[0.07]"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '24px 24px' }}
                />
                <div className="relative mx-auto max-w-7xl px-4 py-16 md:py-24">
                    <div className="max-w-2xl">
                        <span
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#f59e0b]/40 px-3 py-1 text-xs font-bold"
                            style={{ color: steel }}
                        >
                            <Wrench className="h-3.5 w-3.5" /> قطع أصلية 100%
                        </span>
                        <h1 className="mt-4 text-3xl leading-tight font-black text-white md:text-5xl">
                            قطع غيار
                            <br />
                            <span style={{ color: steel }}>تبقي سيارتك صامدة</span>
                        </h1>
                        <p className="mt-3 max-w-md text-sm text-stone-400 md:text-base">
                            من {identity.name} — قطع أصلية وبدائل عالية الجودة لجميع الماركات، مع ضمان الاستبدال.
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <a
                                href="#parts"
                                className="rounded-lg px-8 py-3 text-sm font-black transition hover:opacity-90"
                                style={{ background: steel, color: '#1c1917' }}
                            >
                                تصفح القطع
                            </a>
                            <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-stone-300">
                                ضمان حتى 12 شهر
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories */}
            <section className="mx-auto max-w-7xl px-4 py-8">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className="rounded-xl border border-white/10 p-4 text-center transition hover:border-white/30"
                        style={cat === 'all' ? { background: `${steel}22`, borderColor: steel } : { background: 'rgba(255,255,255,0.02)' }}
                    >
                        <span className="text-2xl">🛠️</span>
                        <p
                            className={`mt-1 text-sm font-bold ${cat === 'all' ? '' : 'text-stone-400'}`}
                            style={cat === 'all' ? { color: steel } : {}}
                        >
                            الكل
                        </p>
                    </button>
                    {categories.slice(0, 8).map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className="rounded-xl border border-white/10 p-4 text-center transition hover:border-white/30"
                            style={cat === c.id ? { background: `${steel}22`, borderColor: steel } : { background: 'rgba(255,255,255,0.02)' }}
                        >
                            <span className="text-2xl">⚙️</span>
                            <p
                                className={`mt-1 text-sm font-bold ${cat === c.id ? '' : 'text-stone-400'}`}
                                style={cat === c.id ? { color: steel } : {}}
                            >
                                {c.name}
                            </p>
                        </button>
                    ))}
                </div>
            </section>

            {/* Parts */}
            <section id="parts" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-8">
                <SectionHeading title="قطع الغيار" subtitle={cat === 'all' ? 'جميع الأقسام' : 'قسم مختار'} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {products.length === 0 ? (
                        <p className="col-span-full py-16 text-center text-sm font-semibold text-stone-500">
                            لا توجد قطع بعد — أضف منتجاتك من لوحة التحكم
                        </p>
                    ) : (
                        products.map((p: any, i: number) => (
                            <article
                                key={p.id || i}
                                className="group cursor-pointer overflow-hidden rounded-xl border border-white/10 transition hover:border-white/30"
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                                onClick={() => product.handleProductClick(p)}
                            >
                                <div className="relative">
                                    <ProductImage product={p} className="aspect-square" />
                                    <span className="absolute start-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                                        صنف {String(p.id || i).slice(0, 4)}
                                    </span>
                                </div>
                                <div className="p-3">
                                    <h3 className="truncate text-sm font-bold text-stone-100">{p.name}</h3>
                                    <div className="mt-1 flex items-center gap-1">
                                        <RatingStars rating={4.3} />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-sm font-black" style={{ color: steel }}>
                                            {p.price} {identity.currency}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                product.handleProductClick(p);
                                            }}
                                            className="rounded-md px-3 py-1.5 text-xs font-bold transition hover:opacity-90"
                                            style={{ background: steel, color: '#1c1917' }}
                                        >
                                            عرض القطعة
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-4 border-t border-white/10">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 md:flex-row">
                    <p className="font-black text-white">{identity.name}</p>
                    <p className="text-xs text-stone-500">© {new Date().getFullYear()} — قطع أصلية لجميع الماركات</p>
                </div>
            </footer>
        </div>
    );
};

export default AutoPartsPage;
