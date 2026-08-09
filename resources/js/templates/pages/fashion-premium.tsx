import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Scissors, Shirt, Sparkles } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, getVar } from './ui';

/**
 * Fashion Premium — cinematic dark luxury. Near-black surfaces, generous
 * whitespace and an editorial runway presentation.
 */
const FashionPremiumPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const champagne = getVar('--twc-primary-500', '#e5e5e5');
    const serif = `'Cormorant Garamond', 'Georgia', ${getVar('--twf-font-family', "'Tajawal', sans-serif")}`;

    return (
        <div className="min-h-screen" style={{ background: '#0a0a0a', color: '#fafafa' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-md md:block">
                <div className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-8">
                    <span className="text-xl font-light tracking-[0.25em]" style={{ color: '#fafafa', fontFamily: serif }}>
                        {identity.name}
                    </span>
                    <nav className="flex items-center gap-10 text-xs font-medium tracking-[0.2em] text-neutral-400 uppercase">
                        <a href="#maison" className="hover:text-white">
                            الدار
                        </a>
                        <a href="#collection" className="hover:text-white">
                            المجموعة
                        </a>
                        <a href="#atelier" className="hover:text-white">
                            المشغل
                        </a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Cinematic hero */}
            <section id="maison" className="relative scroll-mt-24 overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 20%, #262626, #0a0a0a 70%)' }} />
                <div className="relative mx-auto grid max-w-[1600px] items-center gap-12 px-8 py-24 md:py-36 lg:grid-cols-2">
                    <div className="relative z-10">
                        <p className="flex items-center gap-2 text-xs font-medium tracking-[0.4em] text-neutral-500 uppercase">
                            <Sparkles className="h-4 w-4" style={{ color: champagne }} /> Couture Collection
                        </p>
                        <h1 className="mt-6 text-5xl leading-[1.05] font-light md:text-7xl" style={{ color: '#fafafa', fontFamily: serif }}>
                            أناقة
                            <br />
                            <em style={{ color: champagne }}>صُنعت لتبقى</em>
                        </h1>
                        <p className="mt-6 max-w-md text-sm leading-relaxed text-neutral-400">
                            قطع مختارة بعناية من أجود الأقمشة، بتصاميم خالدة تناسب من يرى في اللباس لغةً للذوق الرفيع.
                        </p>
                        <div className="mt-10 flex flex-wrap items-center gap-6">
                            <a
                                href="#collection"
                                className="border-b-2 pb-1 text-sm font-medium tracking-[0.2em] text-white transition hover:opacity-70"
                                style={{ borderColor: champagne }}
                            >
                                اكتشف المجموعة
                            </a>
                            <span className="text-xs tracking-[0.3em] text-neutral-500 uppercase">خياطة يدوية</span>
                        </div>
                    </div>
                    <div className="relative grid grid-cols-2 gap-5">
                        {products.slice(0, 3).map((p: any, i: number) => (
                            <div
                                key={p.id || i}
                                className="group overflow-hidden border border-white/10 bg-neutral-900"
                                style={i === 1 ? { marginTop: '3rem' } : {}}
                            >
                                <ProductImage product={p} className="aspect-[3/4]" imgClassName="transition duration-700 group-hover:scale-105" />
                                <div className="p-4">
                                    <p className="truncate text-sm font-light" style={{ fontFamily: serif }}>
                                        {p.name}
                                    </p>
                                    <p className="mt-1 text-xs text-neutral-500">
                                        {p.price} {identity.currency}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Atelier values */}
            <section id="atelier" className="scroll-mt-24 border-y border-white/10">
                <div className="mx-auto grid max-w-[1600px] gap-px px-8 py-14 md:grid-cols-3">
                    {[
                        { icon: <Scissors className="h-5 w-5" />, title: 'قصّة مدروسة', desc: 'كل قطعة تُقصّ وتُخاط بدقة المشغل' },
                        { icon: <Shirt className="h-5 w-5" />, title: 'أقمشة نخبوية', desc: 'كشمير، حرير وصوف فاخر' },
                        { icon: <Sparkles className="h-5 w-5" />, title: 'قطع محدودة', desc: 'إصدارات لا تتكرر بسهولة' },
                    ].map((v) => (
                        <div key={v.title} className="flex items-start gap-4 py-4">
                            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center border border-white/15 text-neutral-400">
                                {v.icon}
                            </span>
                            <div>
                                <h3 className="text-sm font-medium tracking-wide" style={{ color: '#fafafa', fontFamily: serif }}>
                                    {v.title}
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed text-neutral-500">{v.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Collection / shop */}
            <section id="collection" className="mx-auto max-w-[1600px] scroll-mt-24 px-8 py-16">
                <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
                    <div>
                        <h2 className="text-4xl font-light md:text-5xl" style={{ color: '#fafafa', fontFamily: serif }}>
                            المجموعة الجديدة
                        </h2>
                        <p className="mt-2 text-sm text-neutral-500">تشكيلة خريف وشتاء — تصاميم مميزة بعدد محدود</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setCat('all')}
                            className={`border px-6 py-2.5 text-xs font-medium tracking-[0.2em] uppercase transition ${cat === 'all' ? 'text-black' : 'text-neutral-400 hover:text-white'}`}
                            style={cat === 'all' ? { background: champagne, borderColor: champagne } : { borderColor: 'rgba(255,255,255,0.15)' }}
                        >
                            الكل
                        </button>
                        {categories.map((c: any) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                                className={`border px-6 py-2.5 text-xs font-medium tracking-[0.2em] uppercase transition ${cat === c.id ? 'text-black' : 'text-neutral-400 hover:text-white'}`}
                                style={cat === c.id ? { background: champagne, borderColor: champagne } : { borderColor: 'rgba(255,255,255,0.15)' }}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                    {products.length === 0 ? (
                        <p className="col-span-full py-20 text-center text-sm font-light text-neutral-500">
                            لا توجد قطع بعد — أضف مجموعتك من لوحة التحكم
                        </p>
                    ) : (
                        products.map((p: any, i: number) => (
                            <article key={p.id || i} className="group cursor-pointer" onClick={() => product.handleProductClick(p)}>
                                <div className="relative overflow-hidden bg-neutral-900">
                                    <ProductImage product={p} className="aspect-[3/4]" imgClassName="transition duration-700 group-hover:scale-105" />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            product.handleProductClick(p);
                                        }}
                                        className="absolute inset-x-4 bottom-4 translate-y-3 border border-white/30 py-3 text-xs font-medium tracking-[0.2em] text-white uppercase opacity-0 backdrop-blur transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                                    >
                                        اطلب الآن
                                    </button>
                                </div>
                                <div className="mt-4 flex items-start justify-between gap-2">
                                    <div>
                                        <h3 className="truncate text-sm font-light" style={{ color: '#fafafa', fontFamily: serif }}>
                                            {p.name}
                                        </h3>
                                        <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">{p.description}</p>
                                    </div>
                                    <span className="shrink-0 text-sm font-medium" style={{ color: champagne }}>
                                        {p.price} {identity.currency}
                                    </span>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10">
                <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-4 px-8 py-12 md:flex-row">
                    <p className="text-lg font-light tracking-[0.25em]" style={{ color: '#fafafa', fontFamily: serif }}>
                        {identity.name}
                    </p>
                    <p className="text-xs tracking-[0.2em] text-neutral-600 uppercase">© {new Date().getFullYear()} — أناقة لا تخضع للموضة</p>
                </div>
            </footer>
        </div>
    );
};

export default FashionPremiumPage;
