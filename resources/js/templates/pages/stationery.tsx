import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { GraduationCap, NotebookPen, Palette, Pencil } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';

/**
 * Stationery — bright and cheerful. Indigo accent on a soft canvas,
 * color-coded category cards and a school-season banner.
 */
const StationeryPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const indigo = getVar('--twc-primary-500', '#6366f1');
    const indigoDeep = getVar('--twc-primary-600', '#4f46e5');
    const navy = '#1e1b4b';

    const tiles = [
        { icon: <Pencil className="h-5 w-5" />, title: 'أقلام وكتابة', bg: '#e0e7ff', color: indigoDeep },
        { icon: <NotebookPen className="h-5 w-5" />, title: 'دفاتر ومذكرات', bg: '#fce7f3', color: '#be185d' },
        { icon: <Palette className="h-5 w-5" />, title: 'ألوان وفنون', bg: '#dcfce7', color: '#15803d' },
        { icon: <GraduationCap className="h-5 w-5" />, title: 'لوازم مدرسية', bg: '#fef3c7', color: '#b45309' },
    ];

    return (
        <div className="min-h-screen" style={{ background: '#f5f7ff', color: navy }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-indigo-100 bg-[#f5f7ff]/95 backdrop-blur-md md:block">
                <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: indigo }}>
                            <Pencil className="h-4 w-4" />
                        </span>
                        <span className="text-lg font-bold tracking-tight" style={{ color: navy }}>
                            {identity.name}
                        </span>
                    </div>
                    <nav className="flex items-center gap-8 text-sm font-semibold text-indigo-950/60">
                        <a href="#sale" className="hover:text-indigo-950">
                            تخفيضات الموسم
                        </a>
                        <a href="#shop" className="hover:text-indigo-950">
                            المتجر
                        </a>
                        <a href="#shop" className="hover:text-indigo-950">
                            لماذا نحن
                        </a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="mx-auto max-w-7xl px-6 pt-12 pb-8">
                <div className="grid items-center gap-10 lg:grid-cols-2">
                    <div>
                        <p
                            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-black shadow-sm"
                            style={{ color: indigoDeep }}
                        >
                            <GraduationCap className="h-4 w-4" /> موسم العودة للمدارس
                        </p>
                        <h1 className="mt-5 text-4xl leading-tight font-black md:text-6xl" style={{ color: navy }}>
                            كل ما تحتاجه
                            <br />
                            <span style={{ color: indigo }}>لإبداعك القادم</span>
                        </h1>
                        <p className="mt-5 max-w-md leading-relaxed text-indigo-950/60">
                            أدوات مكتبية وقرطاسية بأعلى جودة — من الدفاتر الملونة إلى الأقلام التي تحب، بسعر يناسب الجميع.
                        </p>
                        <div className="mt-7 flex flex-wrap items-center gap-3">
                            <a
                                href="#shop"
                                className="rounded-xl px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
                                style={{ background: indigo }}
                            >
                                تسوّق القرطاسية
                            </a>
                            <a
                                href="#shop"
                                className="rounded-xl border border-indigo-200 bg-white px-8 py-3 text-sm font-bold transition hover:shadow-sm"
                                style={{ color: navy }}
                            >
                                تعرف علينا
                            </a>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {products.slice(0, 4).map((p: any, i: number) => (
                            <div
                                key={p.id || i}
                                className={`rounded-3xl border border-white bg-white p-3 shadow-md transition hover:-translate-y-1 hover:shadow-xl ${i % 2 ? 'mt-6' : ''}`}
                            >
                                <ProductImage product={p} className="aspect-square rounded-2xl" />
                                <p className="mt-2 truncate text-sm font-black" style={{ color: navy }}>
                                    {p.name}
                                </p>
                                <p className="text-sm font-black" style={{ color: indigoDeep }}>
                                    {p.price} {identity.currency}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Category tiles */}
            <section className="mx-auto max-w-7xl px-6 py-8">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {tiles.map((t) => (
                        <div key={t.title} className="flex items-center gap-3 rounded-2xl p-4 shadow-sm" style={{ background: t.bg }}>
                            <span
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                                style={{ background: t.color }}
                            >
                                {t.icon}
                            </span>
                            <div>
                                <p className="text-sm font-black" style={{ color: navy }}>
                                    {t.title}
                                </p>
                                <p className="text-xs" style={{ color: t.color }}>
                                    تشكيلة مميزة
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Sale banner */}
            <section id="sale" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-6">
                <div
                    className="flex flex-wrap items-center justify-between gap-4 rounded-3xl p-8 text-white"
                    style={{ background: 'linear-gradient(120deg, #4f46e5, #6366f1)' }}
                >
                    <div>
                        <h3 className="text-2xl font-black">🎒 تجهيز المدرسة بنصف السعر</h3>
                        <p className="mt-1 text-indigo-100">خصومات حتى 50% على الحقائب والدفاتر — لفترة محدودة</p>
                    </div>
                    <a href="#shop" className="rounded-xl bg-white px-6 py-3 text-sm font-black text-indigo-700 transition hover:opacity-90">
                        استفد من العرض
                    </a>
                </div>
            </section>

            {/* Shop */}
            <section id="shop" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-10">
                <SectionHeading title="متجر القرطاسية" subtitle="منتجات نستخدمها نحن أولاً، ثم نبيعها لك" />
                <div className="mb-6 flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className={`rounded-full px-5 py-2 text-sm font-bold transition ${cat === 'all' ? 'text-white' : 'border border-indigo-200 bg-white'}`}
                        style={cat === 'all' ? { background: indigo } : { color: navy }}
                    >
                        الكل
                    </button>
                    {categories.map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className={`rounded-full px-5 py-2 text-sm font-bold transition ${cat === c.id ? 'text-white' : 'border border-indigo-200 bg-white'}`}
                            style={cat === c.id ? { background: indigo } : { color: navy }}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {products.length === 0 ? (
                        <p className="col-span-full py-16 text-center text-sm font-semibold text-indigo-950/50">
                            لا توجد منتجات بعد — أضف قرطاسيتك من لوحة التحكم
                        </p>
                    ) : (
                        products.map((p: any, i: number) => (
                            <article
                                key={p.id || i}
                                className="group cursor-pointer rounded-2xl border border-indigo-100 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                                onClick={() => product.handleProductClick(p)}
                            >
                                <div className="relative overflow-hidden rounded-xl">
                                    <ProductImage
                                        product={p}
                                        className="aspect-square"
                                        imgClassName="transition duration-500 group-hover:scale-105"
                                    />
                                    {i % 4 === 0 && (
                                        <span className="absolute start-2 top-2 rounded-md bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">
                                            خصم
                                        </span>
                                    )}
                                </div>
                                <h3 className="mt-2 truncate text-sm font-black" style={{ color: navy }}>
                                    {p.name}
                                </h3>
                                <p className="mt-0.5 line-clamp-1 text-xs text-indigo-950/50">{p.description}</p>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-sm font-black" style={{ color: indigoDeep }}>
                                        {p.price} {identity.currency}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            product.handleProductClick(p);
                                        }}
                                        className="rounded-full px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                                        style={{ background: indigo }}
                                    >
                                        أضفه
                                    </button>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-indigo-100" style={{ background: '#eef0ff' }}>
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-10 md:flex-row">
                    <p className="font-black" style={{ color: navy }}>
                        {identity.name}
                    </p>
                    <p className="text-xs text-indigo-950/50">© {new Date().getFullYear()} — إبداعك يبدأ من هنا</p>
                </div>
            </footer>
        </div>
    );
};

export default StationeryPage;
