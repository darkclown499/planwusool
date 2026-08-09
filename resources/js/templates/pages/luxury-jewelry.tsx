import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Diamond } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';

/**
 * LuxuryJewelry — black & gold, thin serif, generous whitespace.
 * Centered editorial hero, minimal jewelry cards with gold prices.
 */
const LuxuryJewelryPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const gold = getVar('--twc-primary-500', '#d4af37');

    const serif = "Georgia, 'Times New Roman', serif";

    return (
        <div className="min-h-screen" style={{ background: '#0c0a09' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-white/10 bg-[#0c0a09]/95 backdrop-blur-md md:block">
                <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4">
                    <div className="w-28" />
                    <div className="text-center">
                        <p className="text-lg tracking-[0.35em] text-white" style={{ fontFamily: serif, fontWeight: 600 }}>
                            {identity.name}
                        </p>
                        <p className="mt-0.5 text-[10px] tracking-[0.5em] uppercase" style={{ color: gold }}>
                            Fine Jewelry
                        </p>
                    </div>
                    <div className="flex w-28 items-center justify-end gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 120%, #d4af3715 0%, transparent 60%)' }} />
                <div className="relative mx-auto max-w-4xl px-4 py-24 text-center md:py-32">
                    <Diamond className="mx-auto h-8 w-8" style={{ color: gold }} />
                    <p className="mt-6 text-xs tracking-[0.5em] uppercase" style={{ color: gold }}>
                        المجموعة الفاخرة
                    </p>
                    <h1 className="mt-5 text-3xl leading-tight font-light text-white md:text-6xl" style={{ fontFamily: serif }}>
                        جمالٌ يُروى
                        <br />
                        عبر{' '}
                        <em className="not-italic" style={{ color: gold }}>
                            التفاصيل
                        </em>
                    </h1>
                    <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed" style={{ color: '#a8a29e' }}>
                        قطع مختارة بدقة وروعة، صُممت لتحكي قصة تميّزك. من {identity.name} إلى أناقتك.
                    </p>
                    <a
                        href="#collection"
                        className="mt-9 inline-block border border-white/25 px-10 py-3.5 text-xs tracking-[0.3em] text-white uppercase transition hover:border-white hover:bg-white hover:text-black"
                    >
                        اكتشف المجموعة
                    </a>
                </div>
            </section>

            {/* Categories */}
            <section className="mx-auto max-w-6xl px-4">
                <div className="flex flex-wrap items-center justify-center gap-2 border-y border-white/10 py-5">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className={`px-5 py-1.5 text-xs tracking-[0.2em] uppercase transition ${cat === 'all' ? 'font-bold' : 'text-white/60 hover:text-white'}`}
                        style={cat === 'all' ? { color: gold } : {}}
                    >
                        الكل
                    </button>
                    {categories.map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className={`px-5 py-1.5 text-xs tracking-[0.2em] uppercase transition ${cat === c.id ? 'font-bold' : 'text-white/60 hover:text-white'}`}
                            style={cat === c.id ? { color: gold } : {}}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </section>

            {/* Collection */}
            <section id="collection" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
                <SectionHeading title="المجموعة" subtitle="قطع فريدة لكل مناسبة" />
                <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
                    {products.length === 0 ? (
                        <p className="col-span-full py-16 text-center text-sm" style={{ color: '#a8a29e' }}>
                            لا توجد قطع بعد — أضف منتجاتك من لوحة التحكم
                        </p>
                    ) : (
                        products.map((p: any, i: number) => (
                            <article key={p.id || i} className="group cursor-pointer text-center" onClick={() => product.handleProductClick(p)}>
                                <div className="relative mx-auto w-full max-w-[220px]">
                                    <ProductImage
                                        product={p}
                                        className="aspect-square rounded-full"
                                        imgClassName="transition duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 rounded-full ring-1 ring-white/10 ring-inset" />
                                </div>
                                <h3 className="mt-4 truncate text-sm font-light text-white" style={{ fontFamily: serif }}>
                                    {p.name}
                                </h3>
                                <div className="mt-1 flex items-center justify-center gap-2">
                                    <span className="text-sm font-semibold" style={{ color: gold }}>
                                        {p.price} {identity.currency}
                                    </span>
                                </div>
                                {p.originalPrice && Number(p.originalPrice) > Number(p.price) && (
                                    <span className="text-xs line-through opacity-50" style={{ color: '#a8a29e' }}>
                                        {p.originalPrice} {identity.currency}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        product.handleProductClick(p);
                                    }}
                                    className="mt-3 hidden border border-white/20 px-6 py-2 text-[10px] tracking-[0.25em] text-white uppercase transition group-hover:inline-block hover:border-[#d4af37] hover:text-[#d4af37]"
                                >
                                    عرض القطعة
                                </button>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* Values */}
            <section className="mx-auto max-w-6xl px-4 pb-16">
                <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
                    {[
                        { title: 'صناعة يدوية', desc: 'كل قطعة تُصنع بعناية فائقة' },
                        { title: 'مواد أصلية', desc: 'ذهب وعيارات مضمونة' },
                        { title: 'عناية مدى الحياة', desc: 'صيانة وتنظيف مجاني' },
                    ].map((v) => (
                        <div key={v.title} className="bg-[#0c0a09] p-8 text-center">
                            <p className="text-xs tracking-[0.3em] uppercase" style={{ color: gold }}>
                                {v.title}
                            </p>
                            <p className="mt-2 text-sm" style={{ color: '#a8a29e' }}>
                                {v.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 md:flex-row">
                    <p className="tracking-[0.3em] text-white" style={{ fontFamily: serif, fontWeight: 600 }}>
                        {identity.name}
                    </p>
                    <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: '#a8a29e' }}>
                        © {new Date().getFullYear()} Fine Jewelry
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default LuxuryJewelryPage;
