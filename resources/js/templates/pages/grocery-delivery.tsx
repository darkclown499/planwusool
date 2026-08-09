import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Bike, Clock, Leaf, ShoppingBasket, Timer } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';

/**
 * Grocery Delivery — fresh and bright. Big category tiles, lightning
 * delivery promises and a weekly-deals banner.
 */
const GroceryDeliveryPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const green = getVar('--twc-primary-500', '#16a34a');
    const greenDeep = getVar('--twc-primary-600', '#15803d');

    return (
        <div className="min-h-screen" style={{ background: '#f6faf7', color: '#24332a' }}>
            {/* Delivery strip */}
            <div className="bg-emerald-700 py-2 text-center text-sm font-semibold text-white">
                🚴 توصيل في أقل من 30 دقيقة — شحن مجاني للطلبات فوق 100₪
            </div>

            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-emerald-100 bg-[#f6faf7]/95 backdrop-blur-md md:block">
                <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: green }}>
                            <ShoppingBasket className="h-4 w-4" />
                        </span>
                        <span className="text-lg font-bold tracking-tight" style={{ color: '#24332a' }}>
                            {identity.name}
                        </span>
                    </div>
                    <nav className="flex items-center gap-8 text-sm font-semibold text-emerald-900/70">
                        <a href="#deals" className="hover:text-emerald-950">
                            عروض الأسبوع
                        </a>
                        <a href="#categories" className="hover:text-emerald-950">
                            الأقسام
                        </a>
                        <a href="#shop" className="hover:text-emerald-950">
                            المتجر
                        </a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="mx-auto max-w-6xl px-6 pt-10 pb-6">
                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-l from-emerald-700 to-emerald-600 p-8 text-white md:p-14">
                    <div className="pointer-events-none absolute -end-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
                    <div className="relative max-w-lg">
                        <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1 text-xs font-bold">
                            <Timer className="h-3.5 w-3.5" /> اليوم توصيل في 30 دقيقة
                        </p>
                        <h1 className="mt-5 text-3xl leading-tight font-black md:text-5xl">
                            بقالتك كاملة
                            <br />
                            بضغطة زر واحدة
                        </h1>
                        <p className="mt-4 max-w-md leading-relaxed text-emerald-50/90">
                            من الخضار الطازج إلى مستلزمات البيت — اطلب الآن وسيصلك مندوبنا قبل أن تطفئ الموقد.
                        </p>
                        <a
                            href="#shop"
                            className="mt-7 inline-block rounded-full bg-white px-8 py-3 text-sm font-black text-emerald-800 transition hover:opacity-90"
                        >
                            تسوّق الآن
                        </a>
                    </div>
                </div>
            </section>

            {/* Delivery promises */}
            <section id="categories" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-6">
                <div className="grid gap-4 sm:grid-cols-3">
                    {[
                        { icon: <Bike className="h-5 w-5" />, title: 'توصيل سريع', desc: '30 دقيقة أو أقل' },
                        { icon: <Leaf className="h-5 w-5" />, title: 'طازج يومياً', desc: 'وصل يومي من السوق' },
                        { icon: <Clock className="h-5 w-5" />, title: 'نعمل 24/7', desc: 'متاحين دائماً لك' },
                    ].map((f) => (
                        <div key={f.title} className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: green }}>
                                {f.icon}
                            </span>
                            <div>
                                <p className="text-sm font-bold" style={{ color: '#24332a' }}>
                                    {f.title}
                                </p>
                                <p className="text-xs text-emerald-900/60">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Category chips */}
            <section className="mx-auto max-w-6xl scroll-mt-24 px-6 py-6">
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${cat === 'all' ? 'text-white shadow-md' : 'border border-emerald-100 bg-white'}`}
                        style={cat === 'all' ? { background: green } : { color: '#24332a' }}
                    >
                        كل الأقسام
                    </button>
                    {categories.map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className={`rounded-2xl px-5 py-3 text-sm font-bold transition ${cat === c.id ? 'text-white shadow-md' : 'border border-emerald-100 bg-white'}`}
                            style={cat === c.id ? { background: green } : { color: '#24332a' }}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </section>

            {/* Deals banner */}
            <section id="deals" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-6">
                    <div>
                        <h3 className="text-xl font-black" style={{ color: greenDeep }}>
                            🔥 عروض الأسبوع
                        </h3>
                        <p className="mt-1 text-sm text-emerald-900/70">خصومات تصل إلى 40% على منتجات مختارة حتى نهاية الأسبوع</p>
                    </div>
                    <a
                        href="#shop"
                        className="rounded-full px-6 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
                        style={{ background: green }}
                    >
                        استكشف العروض
                    </a>
                </div>
            </section>

            {/* Shop */}
            <section id="shop" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-10">
                <SectionHeading title="منتجات اليوم" subtitle="طازجة وجاهزة للتوصيل خلال دقائق" />
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {products.length === 0 ? (
                        <p className="col-span-full py-16 text-center text-sm font-semibold text-emerald-900/60">
                            لا توجد منتجات بعد — أضف بضاعتك من لوحة التحكم
                        </p>
                    ) : (
                        products.map((p: any, i: number) => (
                            <article
                                key={p.id || i}
                                className="group cursor-pointer overflow-hidden rounded-3xl border border-emerald-100 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                                onClick={() => product.handleProductClick(p)}
                            >
                                <div className="relative overflow-hidden rounded-2xl">
                                    <ProductImage
                                        product={p}
                                        className="aspect-square"
                                        imgClassName="transition duration-500 group-hover:scale-105"
                                    />
                                    {i % 4 === 0 && (
                                        <span className="absolute end-2 top-2 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-900 shadow">
                                            خصم 20%
                                        </span>
                                    )}
                                </div>
                                <h3 className="mt-3 truncate text-sm font-black" style={{ color: '#24332a' }}>
                                    {p.name}
                                </h3>
                                <p className="mt-0.5 line-clamp-1 text-xs text-emerald-900/60">{p.description}</p>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-sm font-black" style={{ color: greenDeep }}>
                                        {p.price} {identity.currency}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            product.handleProductClick(p);
                                        }}
                                        className="rounded-full px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                                        style={{ background: green }}
                                    >
                                        اطلبه
                                    </button>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-emerald-100" style={{ background: '#eaf4ee' }}>
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-10 md:flex-row">
                    <p className="font-black" style={{ color: '#24332a' }}>
                        {identity.name}
                    </p>
                    <p className="text-xs text-emerald-900/60">© {new Date().getFullYear()} — بقالتك على بعد نقرة</p>
                </div>
            </footer>
        </div>
    );
};

export default GroceryDeliveryPage;
