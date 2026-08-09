import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { BadgeCheck, Clock, Pill, ShieldPlus, Truck } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';

/**
 * Pharmacy — clean medical storefront with trust badges and
 * pill-tab categories.
 */
const PharmacyPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const health = getVar('--twc-primary-500', '#0ea5e9');
    const healthDeep = getVar('--twc-primary-600', '#0369a1');

    return (
        <div className="min-h-screen bg-white" style={{ color: '#0f172a' }}>
            {/* Trust top bar */}
            <div className="hidden border-b border-sky-100 md:block" style={{ background: '#f0f9ff' }}>
                <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 py-2 text-xs font-semibold text-sky-800">
                    <span className="inline-flex items-center gap-1">
                        <BadgeCheck className="h-3.5 w-3.5" /> صيدلية مرخصة
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> مفتوحة 24/7
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5" /> توصيل دوائي سريع
                    </span>
                </div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-slate-200 bg-white/95 backdrop-blur-md md:block">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <span
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                            style={{ background: `linear-gradient(135deg, ${healthDeep}, ${health})` }}
                        >
                            <Pill className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-black" style={{ color: '#0f172a' }}>
                            {identity.name}
                        </span>
                    </div>
                    <nav className="flex items-center gap-7 text-sm font-bold text-slate-600">
                        <a href="#store" className="hover:text-sky-700">
                            المنتجات
                        </a>
                        <a href="#services" className="hover:text-sky-700">
                            خدماتنا
                        </a>
                        <a href="#services" className="hover:text-sky-700">
                            نصائح
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
                <div className="absolute inset-0" style={{ background: 'linear-gradient(150deg, #f0f9ff 0%, #ffffff 70%)' }} />
                <div className="pointer-events-none absolute -end-20 top-0 h-72 w-72 rounded-full bg-sky-100 blur-3xl" />
                <div className="relative mx-auto max-w-7xl px-4 py-14 md:py-20">
                    <div className="max-w-2xl">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-4 py-1.5 text-xs font-black text-sky-800">
                            <ShieldPlus className="h-3.5 w-3.5" /> عناية صحية موثوقة
                        </span>
                        <h1 className="mt-4 text-3xl leading-tight font-black md:text-5xl" style={{ color: '#0f172a' }}>
                            صحتك
                            <br />
                            <span style={{ color: healthDeep }}>مسؤوليتنا</span>
                        </h1>
                        <p className="mt-3 max-w-md text-slate-500">
                            من {identity.name} — مستحضرات طبية وعناية أصلية بترخيص رسمي، مع استشارة صيدلانية مجانية.
                        </p>
                        <div className="mt-7 flex flex-wrap items-center gap-3">
                            <a
                                href="#store"
                                className="rounded-full px-8 py-3 text-sm font-black text-white transition hover:opacity-90"
                                style={{ background: `linear-gradient(135deg, ${healthDeep}, ${health})` }}
                            >
                                تصفح المنتجات
                            </a>
                            <span className="text-sm font-semibold text-slate-500">استشارة مجانية عبر واتساب</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust strip */}
            <section className="border-y border-slate-100 bg-slate-50">
                <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-6 md:grid-cols-4">
                    {[
                        { icon: <BadgeCheck className="h-5 w-5" />, label: 'أدوية أصلية', desc: 'مصادر معتمدة' },
                        { icon: <Truck className="h-5 w-5" />, label: 'توصيل خاص', desc: 'مبرد وآمن' },
                        { icon: <Clock className="h-5 w-5" />, label: '24/7', desc: 'مفتوحة دائماً' },
                        { icon: <ShieldPlus className="h-5 w-5" />, label: 'خصوصية', desc: 'تغليف محايد' },
                    ].map((s) => (
                        <div key={s.label} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
                            <span
                                className="flex h-10 w-10 items-center justify-center rounded-full"
                                style={{ background: `${health}1a`, color: healthDeep }}
                            >
                                {s.icon}
                            </span>
                            <div>
                                <p className="text-sm font-black" style={{ color: '#0f172a' }}>
                                    {s.label}
                                </p>
                                <p className="text-xs text-slate-500">{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Store */}
            <main className="mx-auto max-w-7xl px-4 py-10">
                <div id="store" className="scroll-mt-24">
                    <SectionHeading title="منتجات الصيدلية" subtitle="أدوية وعناية موثوقة" />
                    <div className="mb-6 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setCat('all')}
                            className={`rounded-full px-4 py-2 text-sm font-bold transition ${cat === 'all' ? 'text-white' : 'border border-slate-200 hover:bg-slate-50'}`}
                            style={cat === 'all' ? { background: health } : { color: '#0f172a' }}
                        >
                            الكل
                        </button>
                        {categories.map((c: any) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                                className={`rounded-full px-4 py-2 text-sm font-bold transition ${cat === c.id ? 'text-white' : 'border border-slate-200 hover:bg-slate-50'}`}
                                style={cat === c.id ? { background: health } : { color: '#0f172a' }}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {products.length === 0 ? (
                            <p className="col-span-full py-16 text-center text-sm font-semibold text-slate-500">
                                لا توجد منتجات بعد — أضف منتجاتك من لوحة التحكم
                            </p>
                        ) : (
                            products.map((p: any, i: number) => (
                                <article
                                    key={p.id || i}
                                    className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 transition hover:-translate-y-1 hover:shadow-lg"
                                    onClick={() => product.handleProductClick(p)}
                                >
                                    <ProductImage
                                        product={p}
                                        className="aspect-square"
                                        imgClassName="transition duration-500 group-hover:scale-105"
                                    />
                                    <div className="p-3">
                                        <h3 className="truncate text-sm font-black" style={{ color: '#0f172a' }}>
                                            {p.name}
                                        </h3>
                                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{p.description}</p>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-sm font-black" style={{ color: healthDeep }}>
                                                {p.price} {identity.currency}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    product.handleProductClick(p);
                                                }}
                                                className="rounded-full px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                                                style={{ background: health }}
                                            >
                                                عرض
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Services */}
            <section id="services" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-14">
                <div className="grid gap-4 rounded-3xl bg-slate-50 p-8 md:grid-cols-3">
                    {[
                        { icon: <Pill className="h-6 w-6" />, title: 'استشارة صيدلانية', desc: 'نصائح مجانية من صيادلة معتمدين' },
                        { icon: <Truck className="h-6 w-6" />, title: 'توصيل دوائي', desc: 'توصيل سريع وآمن خلال ساعات' },
                        { icon: <ShieldPlus className="h-6 w-6" />, title: 'متابعة علاجية', desc: 'تذكيرات ومراجعة دورية' },
                    ].map((s) => (
                        <div key={s.title} className="text-center">
                            <span
                                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white"
                                style={{ background: `linear-gradient(135deg, ${healthDeep}, ${health})` }}
                            >
                                {s.icon}
                            </span>
                            <h3 className="mt-3 font-black" style={{ color: '#0f172a' }}>
                                {s.title}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-slate-50">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 md:flex-row">
                    <p className="font-black" style={{ color: '#0f172a' }}>
                        {identity.name}
                    </p>
                    <p className="text-xs text-slate-500">© {new Date().getFullYear()} — صيدلية معتمدة، استشر دائماً الصيدلي</p>
                </div>
            </footer>
        </div>
    );
};

export default PharmacyPage;
