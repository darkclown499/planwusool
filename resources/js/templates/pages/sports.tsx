import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { ArrowLeft, Flame, Trophy } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';

/**
 * Sports — bold, energetic design with diagonal shapes, big numbers
 * and a horizontal-scroll product rail.
 */
const SportsPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const fire = getVar('--twc-primary-500', '#ef4444');
    const fireDeep = getVar('--twc-primary-600', '#b91c1c');

    return (
        <div className="min-h-screen" style={{ background: '#0c0a0a', color: '#fff' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-white/10 bg-[#0c0a0a]/95 backdrop-blur-md md:block">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <span
                            className="flex h-9 w-9 -skew-x-6 items-center justify-center rounded-md font-black"
                            style={{ background: `linear-gradient(135deg, ${fireDeep}, ${fire})`, color: '#fff' }}
                        >
                            {identity.name.charAt(0)}
                        </span>
                        <span className="text-lg font-black tracking-tight text-white uppercase">{identity.name}</span>
                    </div>
                    <nav className="flex items-center gap-7 text-sm font-black text-stone-400 uppercase">
                        <a href="#gear" className="hover:text-white">
                            المعدات
                        </a>
                        <a href="#today" className="hover:text-white">
                            عروض اليوم
                        </a>
                        <a href="#club" className="hover:text-white">
                            النادي
                        </a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, #1c1917 0%, #0c0a0a 70%)` }} />
                <div className="absolute -start-20 top-1/4 h-72 w-72 -rotate-12 bg-[#ef4444]/20 blur-3xl" />
                <div className="absolute -end-10 bottom-0 h-56 w-56 rotate-12 bg-[#f97316]/10 blur-3xl" />
                <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-10 px-4 py-16 md:py-24">
                    <div className="max-w-xl">
                        <span
                            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-black tracking-wider uppercase"
                            style={{ background: `${fire}22`, color: fire }}
                        >
                            <Flame className="h-3.5 w-3.5" /> احرق الأهداف
                        </span>
                        <h1 className="mt-4 text-5xl leading-[0.9] font-black uppercase md:text-7xl">
                            العب
                            <br />
                            <span style={{ color: fire }}>بقوة</span>
                        </h1>
                        <p className="mt-4 max-w-md text-stone-400">معدات رياضية أصلية من {identity.name} لأبطال حقيقيين — خصومات حصرية كل يوم.</p>
                        <div className="mt-7 flex items-center gap-3">
                            <a
                                href="#gear"
                                className="inline-flex items-center gap-2 rounded-lg px-8 py-3.5 text-sm font-black uppercase transition hover:opacity-90"
                                style={{ background: `linear-gradient(135deg, ${fireDeep}, ${fire})` }}
                            >
                                ابدأ الآن <ArrowLeft className="h-4 w-4" />
                            </a>
                            <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: fire }}>
                                <Trophy className="h-4 w-4" /> +1000 رياضي يثقون بنا
                            </span>
                        </div>
                    </div>

                    {/* Big numbers */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { num: '75%', label: 'خصم أقصى' },
                            { num: '100%', label: 'منتجات أصلية' },
                            { num: '24h', label: 'توصيل سريع' },
                            { num: '+1K', label: 'منتج متوفر' },
                        ].map((s) => (
                            <div
                                key={s.label}
                                className="-rotate-2 rounded-2xl border border-white/10 px-6 py-5 text-center"
                                style={{ background: 'rgba(255,255,255,0.03)' }}
                            >
                                <p className="text-3xl font-black" style={{ color: fire }}>
                                    {s.num}
                                </p>
                                <p className="mt-1 text-xs font-bold text-stone-400 uppercase">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Category chips */}
            <section className="mx-auto max-w-7xl px-4">
                <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className={`shrink-0 rounded-lg px-5 py-2.5 text-sm font-black uppercase transition ${cat === 'all' ? 'text-black' : 'border border-white/15 text-stone-300 hover:border-white/40'}`}
                        style={cat === 'all' ? { background: fire } : {}}
                    >
                        الكل
                    </button>
                    {categories.map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className={`shrink-0 rounded-lg px-5 py-2.5 text-sm font-black uppercase transition ${cat === c.id ? 'text-black' : 'border border-white/15 text-stone-300 hover:border-white/40'}`}
                            style={cat === c.id ? { background: fire } : {}}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </section>

            {/* Product rail */}
            <section id="gear" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10">
                <SectionHeading title="معدات اليوم" subtitle="اختر قطعتك وابدأ التحدي" align="start" />
                <div className="flex [scrollbar-width:none] gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {products.length === 0 ? (
                        <p className="w-full py-16 text-center text-sm font-semibold text-stone-500">
                            لا توجد منتجات بعد — أضف معداتك من لوحة التحكم
                        </p>
                    ) : (
                        products.map((p: any, i: number) => (
                            <article key={p.id || i} className="group w-52 shrink-0 cursor-pointer" onClick={() => product.handleProductClick(p)}>
                                <div className="relative overflow-hidden rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <ProductImage product={p} className="aspect-[3/4]" imgClassName="transition duration-500 group-hover:scale-110" />
                                    <span
                                        className="absolute start-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-black uppercase backdrop-blur"
                                        style={{ color: fire }}
                                    >
                                        #{i + 1}
                                    </span>
                                    {p.originalPrice && Number(p.originalPrice) > Number(p.price) && (
                                        <span
                                            className="absolute end-2 top-2 rounded-md px-2 py-1 text-[10px] font-black"
                                            style={{ background: fire }}
                                        >
                                            -{Math.round((1 - Number(p.price) / Number(p.originalPrice)) * 100)}%
                                        </span>
                                    )}
                                </div>
                                <h3 className="mt-3 truncate text-sm font-bold text-white">{p.name}</h3>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-sm font-black" style={{ color: fire }}>
                                        {p.price} {identity.currency}
                                    </span>
                                    {p.originalPrice && Number(p.originalPrice) > Number(p.price) && (
                                        <span className="text-xs text-stone-500 line-through">
                                            {p.originalPrice} {identity.currency}
                                        </span>
                                    )}
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* CTA banner */}
            <section id="today" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-10">
                <div
                    className="relative overflow-hidden rounded-3xl p-8 md:p-12"
                    style={{ background: `linear-gradient(120deg, ${fireDeep}, ${fire})` }}
                >
                    <div className="absolute -end-10 -top-10 h-44 w-44 rotate-12 bg-black/10" />
                    <div className="relative flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-black tracking-[0.3em] text-white/80 uppercase">عرض اليوم</p>
                            <h2 className="mt-1 text-3xl font-black uppercase md:text-4xl">خصم 50% على المعدات المختارة</h2>
                            <p className="mt-1 text-sm text-white/90">لفترة محدودة — اطلب قبل نفاد الكمية</p>
                        </div>
                        <a href="#gear" className="rounded-lg bg-black px-8 py-3.5 text-sm font-black uppercase transition hover:opacity-90">
                            اغتنم العرض
                        </a>
                    </div>
                </div>
            </section>

            {/* Club */}
            <section id="club" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-14">
                <div
                    className="grid items-center gap-6 rounded-3xl border border-white/10 p-8 md:grid-cols-3"
                    style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                    <div className="md:col-span-2">
                        <h2 className="text-2xl font-black uppercase">انضم لنادي {identity.name}</h2>
                        <p className="mt-2 text-sm text-stone-400">نقاط ولاء، عروض حصرية، وأولوية على الموديلات الجديدة.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => product.handleProductClick(products[0] || { id: 0 })}
                        className="rounded-lg px-6 py-3 text-sm font-black uppercase transition hover:opacity-90"
                        style={{ background: fire }}
                    >
                        انضم الآن
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 md:flex-row">
                    <p className="font-black text-white uppercase">{identity.name}</p>
                    <p className="text-xs text-stone-500">© {new Date().getFullYear()} — العب بقوة</p>
                </div>
            </footer>
        </div>
    );
};

export default SportsPage;
