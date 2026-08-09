import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Flower2, Heart, Leaf, Sparkles } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { MinimalCard, NewsletterForm, ProductGrid, RatingStars, SectionHeading, getVar } from './ui';

/**
 * Beauty — soft pastel, organic rounded shapes, glowing gradients and
 * circular minimal product cards.
 */
const BeautyPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const soft = getVar('--twc-primary-500', '#ec4899');
    const softDeep = getVar('--twc-primary-600', '#db2777');

    return (
        <div className="min-h-screen" style={{ background: '#fff5f9' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-pink-100 bg-white/80 backdrop-blur-md md:block">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <span
                            className="flex h-10 w-10 items-center justify-center rounded-full"
                            style={{ background: 'linear-gradient(135deg, #fbcfe8, #f9a8d4)' }}
                        >
                            <Flower2 className="h-5 w-5 text-pink-600" />
                        </span>
                        <span className="text-lg font-black tracking-tight" style={{ color: '#9d174d' }}>
                            {identity.name}
                        </span>
                    </div>
                    <nav className="flex items-center gap-5 text-sm font-bold text-pink-900/70">
                        <a href="#products" className="hover:text-pink-600">
                            المنتجات
                        </a>
                        <a href="#benefits" className="hover:text-pink-600">
                            لماذا نحن
                        </a>
                        <a href="#reviews" className="hover:text-pink-600">
                            آراء
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
                <div className="pointer-events-none absolute -start-16 top-10 h-72 w-72 rounded-full bg-pink-200/60 blur-3xl" />
                <div className="pointer-events-none absolute -end-16 bottom-0 h-72 w-72 rounded-full bg-rose-200/60 blur-3xl" />
                <div className="pointer-events-none absolute end-1/3 top-6 h-24 w-24 rounded-full bg-amber-100/70 blur-2xl" />
                <div className="relative mx-auto max-w-6xl px-4 py-16 text-center md:py-24">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-pink-600 shadow-sm">
                        <Sparkles className="h-3.5 w-3.5" /> عناية فائقة ببشرتك
                    </span>
                    <h1 className="mt-5 text-3xl leading-tight font-black md:text-5xl" style={{ color: '#831843' }}>
                        جمالك يبدأ
                        <br />
                        من العناية <span style={{ color: soft }}>بذاتك</span>
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-sm md:text-base" style={{ color: '#9d174d99' }}>
                        منتجات طبيعية فاخرة من {identity.name} لروتين عناية يناسبك تماماً
                    </p>
                    <div className="mt-8 flex items-center justify-center gap-3">
                        <a
                            href="#products"
                            className="rounded-full px-8 py-3 text-sm font-black text-white shadow-lg transition hover:opacity-90"
                            style={{ background: `linear-gradient(135deg, ${softDeep}, ${soft})` }}
                        >
                            تسوقي الآن
                        </a>
                        <a
                            href="#benefits"
                            className="rounded-full border border-pink-200 bg-white px-8 py-3 text-sm font-bold transition hover:bg-pink-50"
                            style={{ color: '#9d174d' }}
                        >
                            اكتشفي المزيد
                        </a>
                    </div>
                </div>
            </section>

            {/* Category pills */}
            <section className="mx-auto max-w-6xl px-4">
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className={`rounded-full px-5 py-2 text-sm font-bold transition ${cat === 'all' ? 'text-white shadow' : 'border border-pink-100 bg-white text-pink-900/70 hover:bg-pink-50'}`}
                        style={cat === 'all' ? { background: soft } : {}}
                    >
                        الكل
                    </button>
                    {categories.map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className={`rounded-full px-5 py-2 text-sm font-bold transition ${cat === c.id ? 'text-white shadow' : 'border border-pink-100 bg-white text-pink-900/70 hover:bg-pink-50'}`}
                            style={cat === c.id ? { background: soft } : {}}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </section>

            {/* Products */}
            <section id="products" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12">
                <SectionHeading title="منتجاتنا المميزة" subtitle="اختيارات بعناية لجمال يدوم" />
                <ProductGrid products={products} className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                    {(p, i) => (
                        <div key={p.id || i}>
                            <MinimalCard product={p} />
                            <div className="mt-2 flex items-center justify-center gap-1">
                                <RatingStars rating={4.7} />
                            </div>
                        </div>
                    )}
                </ProductGrid>
            </section>

            {/* Benefits */}
            <section id="benefits" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-12">
                <div
                    className="grid gap-4 rounded-[2rem] border border-pink-100 bg-white/70 p-6 md:grid-cols-3 md:p-10"
                    style={{ backdropFilter: 'blur(8px)' }}
                >
                    {[
                        { icon: <Leaf className="h-6 w-6" />, title: 'مكونات طبيعية', desc: 'خالية من المواد الكيميائية القاسية' },
                        { icon: <Heart className="h-6 w-6" />, title: 'محبة للبشرة', desc: 'مطوّرة بعناية لتناسب كل أنواع البشرة' },
                        { icon: <Sparkles className="h-6 w-6" />, title: 'نتائج ملموسة', desc: 'ترطيب ونضارة تدوم طوال اليوم' },
                    ].map((b) => (
                        <div key={b.title} className="text-center">
                            <span
                                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
                                style={{ background: 'linear-gradient(135deg, #fbcfe8, #f9a8d4)', color: '#be185d' }}
                            >
                                {b.icon}
                            </span>
                            <h3 className="mt-3 font-black" style={{ color: '#831843' }}>
                                {b.title}
                            </h3>
                            <p className="mt-1 text-sm" style={{ color: '#9d174d99' }}>
                                {b.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Newsletter */}
            <section id="reviews" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-14">
                <div className="overflow-hidden rounded-[2rem] p-10 text-center" style={{ background: 'linear-gradient(135deg, #fbcfe8, #f9a8d4)' }}>
                    <h2 className="text-2xl font-black text-white md:text-3xl">انضمي إلى عائلة الجمال</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-white/90">اشتركي ليصلكِ أحدث المنتجات والعروض الحصرية</p>
                    <NewsletterForm className="mx-auto mt-5" />
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-pink-100" style={{ background: '#fff0f6' }}>
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 md:flex-row">
                    <p className="font-black" style={{ color: '#831843' }}>
                        {identity.name}
                    </p>
                    <p className="text-xs" style={{ color: '#9d174d99' }}>
                        © {new Date().getFullYear()} — جميع الحقوق محفوظة
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default BeautyPage;
