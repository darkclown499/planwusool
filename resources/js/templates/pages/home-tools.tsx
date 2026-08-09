import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Hammer, Percent, ShieldCheck, Truck, Wrench } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';

/**
 * Home & Tools — sturdy and practical. Steel-and-orange palette, bulk
 * pricing badges and a professional wholesale strip.
 */
const HomeToolsPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const orange = getVar('--twc-primary-500', '#ea7a18');
    const steel = getVar('--twc-primary-600', '#c25e0c');
    const slate = '#3f4652';

    return (
        <div className="min-h-screen" style={{ background: '#f3f4f6', color: slate }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-slate-200 bg-[#f3f4f6]/95 backdrop-blur-md md:block">
                <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: orange }}>
                            <Wrench className="h-4 w-4" />
                        </span>
                        <span className="text-lg font-bold tracking-tight" style={{ color: slate }}>
                            {identity.name}
                        </span>
                    </div>
                    <nav className="flex items-center gap-8 text-sm font-semibold text-slate-600">
                        <a href="#bulk" className="hover:text-slate-900">
                            طلبات الجملة
                        </a>
                        <a href="#shop" className="hover:text-slate-900">
                            المتجر
                        </a>
                        <a href="#bulk" className="hover:text-slate-900">
                            خدماتنا
                        </a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="mx-auto max-w-6xl px-6 pt-12 pb-8">
                <div className="grid items-center gap-10 md:grid-cols-2">
                    <div>
                        <p
                            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-100 px-3 py-1 text-xs font-bold tracking-widest uppercase"
                            style={{ color: steel }}
                        >
                            <Percent className="h-3.5 w-3.5" /> أسعار جملة للأعمال
                        </p>
                        <h1 className="mt-5 text-4xl leading-tight font-black md:text-5xl" style={{ color: slate }}>
                            أدوات تتحمل
                            <br />
                            <span style={{ color: orange }}>عبء العمل</span>
                        </h1>
                        <p className="mt-5 max-w-md leading-relaxed text-slate-500">
                            كل ما يحتاجه منزلك أو ورشتك — أدوات يدوية وكهربائية ومواد صيانة بأقوى الأسعار، مع خصومات للكميات.
                        </p>
                        <div className="mt-7 flex flex-wrap items-center gap-3">
                            <a
                                href="#shop"
                                className="rounded-xl px-8 py-3 text-sm font-bold text-white shadow transition hover:opacity-90"
                                style={{ background: orange }}
                            >
                                تسوّق المتجر
                            </a>
                            <a
                                href="#bulk"
                                className="rounded-xl border border-slate-300 bg-white px-8 py-3 text-sm font-bold transition hover:shadow-sm"
                                style={{ color: slate }}
                            >
                                اطلب جملة
                            </a>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {products.slice(0, 4).map((p: any, i: number) => (
                            <div
                                key={p.id || i}
                                className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${i % 2 ? 'translate-y-4' : ''}`}
                            >
                                <ProductImage product={p} className="aspect-square" />
                                <p className="truncate px-3 py-2 text-xs font-bold" style={{ color: slate }}>
                                    {p.name}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Bulk strip */}
            <section id="bulk" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-6">
                <div className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 md:grid-cols-4">
                    {[
                        { icon: <Truck className="h-5 w-5" />, title: 'شحن للمنشآت', desc: 'توصيل للمشاريع والمحلات' },
                        { icon: <Percent className="h-5 w-5" />, title: 'خصم الكميات', desc: 'حتى 25% للطلبات الكبيرة' },
                        { icon: <ShieldCheck className="h-5 w-5" />, title: 'ضمان حقيقي', desc: 'استبدال فوري للأعطال' },
                        { icon: <Hammer className="h-5 w-5" />, title: 'دعم فني', desc: 'فريق يساعدك في الاختيار' },
                    ].map((f) => (
                        <div key={f.title} className="bg-white p-5">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ background: orange }}>
                                {f.icon}
                            </span>
                            <h3 className="mt-3 text-sm font-black" style={{ color: slate }}>
                                {f.title}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Shop */}
            <section id="shop" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-10">
                <SectionHeading title="متجر الأدوات" subtitle="جودة تضمن عملها، وسعر يريح بالك" />
                <div className="mb-6 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className={`rounded-xl px-5 py-2 text-sm font-bold transition ${cat === 'all' ? 'text-white' : 'border border-slate-300 bg-white'}`}
                        style={cat === 'all' ? { background: orange } : { color: slate }}
                    >
                        الكل
                    </button>
                    {categories.map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className={`rounded-xl px-5 py-2 text-sm font-bold transition ${cat === c.id ? 'text-white' : 'border border-slate-300 bg-white'}`}
                            style={cat === c.id ? { background: orange } : { color: slate }}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {products.length === 0 ? (
                        <p className="col-span-full py-16 text-center text-sm font-semibold text-slate-500">
                            لا توجد منتجات بعد — أضف أدواتك من لوحة التحكم
                        </p>
                    ) : (
                        products.map((p: any, i: number) => (
                            <article
                                key={p.id || i}
                                className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                                onClick={() => product.handleProductClick(p)}
                            >
                                <div className="relative overflow-hidden rounded-xl bg-slate-100">
                                    <ProductImage
                                        product={p}
                                        className="aspect-square"
                                        imgClassName="transition duration-500 group-hover:scale-105"
                                    />
                                    {i % 3 === 0 && (
                                        <span className="absolute start-2 top-2 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-black tracking-wider text-white uppercase">
                                            جملة
                                        </span>
                                    )}
                                </div>
                                <h3 className="mt-3 truncate text-sm font-black" style={{ color: slate }}>
                                    {p.name}
                                </h3>
                                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{p.description}</p>
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-sm font-black" style={{ color: steel }}>
                                        {p.price} {identity.currency}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            product.handleProductClick(p);
                                        }}
                                        className="rounded-lg px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                                        style={{ background: orange }}
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
            <footer className="border-t border-slate-200" style={{ background: '#e5e7eb' }}>
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-10 md:flex-row">
                    <p className="font-black" style={{ color: slate }}>
                        {identity.name}
                    </p>
                    <p className="text-xs text-slate-500">© {new Date().getFullYear()} — أدوات تصنع الفرق</p>
                </div>
            </footer>
        </div>
    );
};

export default HomeToolsPage;
