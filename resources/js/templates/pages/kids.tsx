import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Gift, Sparkles, Star, ToyBrick } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';

/**
 * Kids — playful, rounded, bright and saturated. Fun shapes, category
 * tiles and bouncy product cards.
 */
const KidsPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const fun = getVar('--twc-primary-500', '#f43f5e');
    const funDeep = getVar('--twc-primary-600', '#e11d48');

    const tileColors = ['#60a5fa', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#fb923c'];

    return (
        <div className="min-h-screen" style={{ background: '#fffdf5', color: '#292524' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-amber-100 bg-white/85 backdrop-blur-md md:block">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <span
                            className="flex h-10 w-10 -rotate-6 items-center justify-center rounded-2xl text-white"
                            style={{ background: `linear-gradient(135deg, ${funDeep}, ${fun})` }}
                        >
                            <ToyBrick className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-black" style={{ color: '#292524' }}>
                            {identity.name}
                        </span>
                    </div>
                    <nav className="flex items-center gap-6 text-sm font-black text-stone-600">
                        <a href="#toys" className="hover:text-rose-500">
                            الألعاب
                        </a>
                        <a href="#fun" className="hover:text-rose-500">
                            مرح
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
                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #fde68a, #fbcfe8 55%, #bfdbfe)' }} />
                <div className="absolute start-10 top-10 h-16 w-16 rounded-full bg-white/50" />
                <div className="absolute end-16 top-16 h-10 w-10 rotate-12 rounded-2xl bg-rose-300/40" />
                <div className="absolute start-1/3 bottom-10 h-12 w-12 rounded-full bg-sky-300/40" />
                <div className="relative mx-auto max-w-6xl px-4 py-16 text-center md:py-24">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-1.5 text-xs font-black text-rose-500 shadow-sm backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5" /> عالم المرح ينتظرك
                    </span>
                    <h1 className="mt-5 text-4xl leading-tight font-black md:text-6xl" style={{ color: '#292524' }}>
                        لعبة جديدة
                        <br />
                        كل{' '}
                        <span
                            className="inline-block -rotate-3 rounded-2xl px-3 text-white"
                            style={{ background: `linear-gradient(135deg, ${funDeep}, ${fun})` }}
                        >
                            يوم
                        </span>
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-sm md:text-base" style={{ color: '#57534e' }}>
                        ألعاب آمنة وممتعة من {identity.name} لكل الأعمار — اكتشف الأفضل لطفلك
                    </p>
                    <div className="mt-7 flex items-center justify-center gap-3">
                        <a
                            href="#toys"
                            className="rounded-full px-9 py-3.5 text-sm font-black text-white shadow-xl transition hover:scale-105"
                            style={{ background: `linear-gradient(135deg, ${funDeep}, ${fun})` }}
                        >
                            🧸 تصفح الألعاب
                        </a>
                    </div>
                </div>
            </section>

            {/* Categories */}
            <section className="mx-auto max-w-6xl px-4 py-8">
                <SectionHeading title="اختر عالمك" subtitle="كل قسم عالم كامل من المرح" />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className="group rounded-3xl p-4 text-center text-white shadow transition hover:-translate-y-1 hover:shadow-lg"
                        style={{
                            background: cat === 'all' ? `linear-gradient(135deg, ${funDeep}, ${fun})` : 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                        }}
                    >
                        <span className="text-3xl">🌟</span>
                        <p className="mt-2 text-sm font-black">الكل</p>
                    </button>
                    {categories.slice(0, 8).map((c: any, i: number) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className="rounded-3xl p-4 text-center text-white shadow transition hover:-translate-y-1 hover:shadow-lg"
                            style={{ background: cat === c.id ? `linear-gradient(135deg, ${funDeep}, ${fun})` : tileColors[i % tileColors.length] }}
                        >
                            <span className="text-3xl">🧩</span>
                            <p className="mt-2 text-sm font-black">{c.name}</p>
                        </button>
                    ))}
                </div>
            </section>

            {/* Toys */}
            <section id="toys" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8">
                <SectionHeading title="أحدث الألعاب" subtitle={cat === 'all' ? 'اختر لطفلك أفضل الأوقات' : 'من قسمك المختار'} />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {products.length === 0 ? (
                        <p className="col-span-full py-16 text-center text-sm font-semibold text-stone-500">
                            لا توجد ألعاب بعد — أضف منتجاتك من لوحة التحكم
                        </p>
                    ) : (
                        products.map((p: any, i: number) => (
                            <article
                                key={p.id || i}
                                className="group cursor-pointer overflow-hidden rounded-[1.75rem] border-2 border-amber-100 bg-white transition hover:-translate-y-1 hover:shadow-xl"
                                onClick={() => product.handleProductClick(p)}
                            >
                                <div className="relative">
                                    <ProductImage
                                        product={p}
                                        className="aspect-square"
                                        imgClassName="transition duration-500 group-hover:scale-110"
                                    />
                                    <span
                                        className="absolute end-2 top-2 flex h-9 w-9 rotate-6 items-center justify-center rounded-full text-white shadow"
                                        style={{ background: tileColors[i % tileColors.length] }}
                                    >
                                        <Star className="h-4 w-4 fill-white" />
                                    </span>
                                </div>
                                <div className="p-3">
                                    <h3 className="truncate text-sm font-black" style={{ color: '#292524' }}>
                                        {p.name}
                                    </h3>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-sm font-black" style={{ color: funDeep }}>
                                            {p.price} {identity.currency}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                product.handleProductClick(p);
                                            }}
                                            className="rounded-full px-4 py-1.5 text-xs font-black text-white transition hover:scale-105"
                                            style={{ background: `linear-gradient(135deg, ${funDeep}, ${fun})` }}
                                        >
                                            هدية!
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* Fun strip */}
            <section id="fun" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8">
                <div className="grid gap-3 rounded-[2rem] p-8 md:grid-cols-3" style={{ background: 'linear-gradient(120deg, #fde68a, #fecaca)' }}>
                    {[
                        { icon: <Gift className="h-6 w-6" />, title: 'أمان كامل', desc: 'خامات آمنة معتمدة للأطفال' },
                        { icon: <Sparkles className="h-6 w-6" />, title: 'تنمية مهارات', desc: 'ألعاب تعليمية وممتعة' },
                        { icon: <ToyBrick className="h-6 w-6" />, title: 'تنوع لا ينتهي', desc: 'ألعاب لكل الأعمار والأذواق' },
                    ].map((f) => (
                        <div key={f.title} className="text-center">
                            <span
                                className="mx-auto flex h-14 w-14 -rotate-6 items-center justify-center rounded-2xl text-white shadow"
                                style={{ background: `linear-gradient(135deg, ${funDeep}, ${fun})` }}
                            >
                                {f.icon}
                            </span>
                            <h3 className="mt-3 font-black" style={{ color: '#292524' }}>
                                {f.title}
                            </h3>
                            <p className="mt-1 text-sm text-stone-600">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-4 border-t border-amber-100 bg-white">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 md:flex-row">
                    <p className="font-black" style={{ color: '#292524' }}>
                        {identity.name}
                    </p>
                    <p className="text-xs text-stone-500">© {new Date().getFullYear()} — ابتسامة طفلك هدفنا</p>
                </div>
            </footer>
        </div>
    );
};

export default KidsPage;
