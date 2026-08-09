import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Flower2, Gift, Heart } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';

/**
 * Flowers & Gifts — soft, romantic and fresh. Rounded shapes, pastel
 * surfaces and an occasion-driven shop.
 */
const FlowersGiftsPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const rose = getVar('--twc-primary-500', '#e26d9a');
    const roseDeep = getVar('--twc-primary-600', '#c94f7e');

    const occasions = [
        { icon: <Heart className="h-5 w-5" />, label: 'حب' },
        { icon: <Gift className="h-5 w-5" />, label: 'هدايا' },
        { icon: <Flower2 className="h-5 w-5" />, label: 'عطلات' },
    ];

    return (
        <div className="min-h-screen" style={{ background: '#fdf3f5', color: '#3f3340' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-pink-200 bg-[#fdf3f5]/95 backdrop-blur-md md:block">
                <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: rose }}>
                            <Flower2 className="h-4 w-4" />
                        </span>
                        <span className="text-lg font-bold tracking-tight" style={{ color: '#3f3340' }}>
                            {identity.name}
                        </span>
                    </div>
                    <nav className="flex items-center gap-8 text-sm font-semibold text-pink-900/60">
                        <a href="#flowers" className="hover:text-pink-950">
                            الزهور
                        </a>
                        <a href="#flowers" className="hover:text-pink-950">
                            الهدايا
                        </a>
                        <a href="#occasions" className="hover:text-pink-950">
                            المناسبات
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
                <div
                    className="pointer-events-none absolute -start-24 -top-24 h-72 w-72 rounded-full opacity-40"
                    style={{ background: 'radial-gradient(circle, #f7b5cd, transparent 70%)' }}
                />
                <div
                    className="pointer-events-none absolute -end-24 -bottom-24 h-72 w-72 rounded-full opacity-40"
                    style={{ background: 'radial-gradient(circle, #cde8d8, transparent 70%)' }}
                />
                <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
                    <div>
                        <p className="text-xs font-bold tracking-[0.35em] uppercase" style={{ color: roseDeep }}>
                            Flowers & Gifts
                        </p>
                        <h1 className="mt-4 text-4xl leading-tight font-black md:text-6xl" style={{ color: '#3f3340' }}>
                            أزهار تحمل
                            <br />
                            <span style={{ color: roseDeep }}>مشاعرك</span>
                        </h1>
                        <p className="mt-5 max-w-md leading-relaxed text-pink-900/60">
                            باقات طازجة تُقطف صباح كل يوم، مع هدايا مدروسة لأحبّتك — نوصّلها حتى بابهم وقلبهم.
                        </p>
                        <div className="mt-7 flex flex-wrap items-center gap-3">
                            <a
                                href="#flowers"
                                className="rounded-full px-8 py-3 text-sm font-bold text-white transition hover:opacity-90"
                                style={{ background: rose }}
                            >
                                اطلب باقة
                            </a>
                            <a
                                href="#occasions"
                                className="rounded-full border border-pink-300 bg-white px-8 py-3 text-sm font-bold transition hover:shadow-sm"
                                style={{ color: '#3f3340' }}
                            >
                                مناسبات خاصة
                            </a>
                        </div>
                    </div>
                    <div className="relative mx-auto w-full max-w-md">
                        <div className="overflow-hidden rounded-[2.5rem] border-4 border-white shadow-2xl">
                            {products[0] ? (
                                <ProductImage
                                    product={products[0]}
                                    className="aspect-[4/5]"
                                    imgClassName="transition duration-700 group-hover:scale-105"
                                />
                            ) : (
                                <div
                                    className="flex aspect-[4/5] items-center justify-center rounded-[2.5rem] text-6xl"
                                    style={{ background: 'linear-gradient(135deg, #f7d3e0, #d3ecd9)' }}
                                >
                                    🌸
                                </div>
                            )}
                        </div>
                        <div className="absolute -start-5 -bottom-5 rounded-3xl bg-white px-5 py-3 shadow-lg">
                            <p className="text-2xl font-black" style={{ color: roseDeep }}>
                                {products.length}+
                            </p>
                            <p className="text-xs font-semibold text-pink-900/60">باقة وهدية</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Occasions */}
            <section id="occasions" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-6">
                <div className="grid gap-4 sm:grid-cols-3">
                    {occasions.map((o) => (
                        <div key={o.label} className="flex items-center gap-3 rounded-3xl border border-pink-200 bg-white p-5 shadow-sm">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-white" style={{ background: rose }}>
                                {o.icon}
                            </span>
                            <div>
                                <p className="text-sm font-bold" style={{ color: '#3f3340' }}>
                                    {o.label}
                                </p>
                                <p className="text-xs text-pink-900/60">تشكيلة مختارة بعناية</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Shop */}
            <section id="flowers" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-12">
                <SectionHeading title="أجمل الباقات والهدايا" subtitle="اختر الأقرب لقلبك، والنحن نتكفل بالباقي" />
                <div className="mb-6 flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className={`rounded-full px-5 py-2 text-sm font-bold transition ${cat === 'all' ? 'text-white' : 'border border-pink-300 bg-white'}`}
                        style={cat === 'all' ? { background: rose } : { color: '#3f3340' }}
                    >
                        الكل
                    </button>
                    {categories.map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className={`rounded-full px-5 py-2 text-sm font-bold transition ${cat === c.id ? 'text-white' : 'border border-pink-300 bg-white'}`}
                            style={cat === c.id ? { background: rose } : { color: '#3f3340' }}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {products.length === 0 ? (
                        <p className="col-span-full py-16 text-center text-sm font-semibold text-pink-900/60">
                            لا توجد منتجات بعد — أضف باقاتك من لوحة التحكم
                        </p>
                    ) : (
                        products.map((p: any, i: number) => (
                            <article
                                key={p.id || i}
                                className="group cursor-pointer overflow-hidden rounded-3xl border border-pink-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                                onClick={() => product.handleProductClick(p)}
                            >
                                <div className="relative overflow-hidden">
                                    <ProductImage
                                        product={p}
                                        className="aspect-square"
                                        imgClassName="transition duration-500 group-hover:scale-110"
                                    />
                                    {i % 3 === 0 && (
                                        <span
                                            className="absolute start-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black backdrop-blur"
                                            style={{ color: roseDeep }}
                                        >
                                            ❤ الأكثر طلباً
                                        </span>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="truncate text-sm font-black" style={{ color: '#3f3340' }}>
                                        {p.name}
                                    </h3>
                                    <p className="mt-0.5 line-clamp-1 text-xs text-pink-900/60">{p.description}</p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-sm font-black" style={{ color: roseDeep }}>
                                            {p.price} {identity.currency}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                product.handleProductClick(p);
                                            }}
                                            className="rounded-full px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                                            style={{ background: rose }}
                                        >
                                            اطلبها
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-pink-200" style={{ background: '#fbe8ee' }}>
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-10 md:flex-row">
                    <p className="font-black" style={{ color: '#3f3340' }}>
                        {identity.name}
                    </p>
                    <p className="text-xs text-pink-900/60">© {new Date().getFullYear()} — أزهار وابتسامات لأحبّتك</p>
                </div>
            </footer>
        </div>
    );
};

export default FlowersGiftsPage;
