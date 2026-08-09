import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Coffee, Croissant, CupSoda } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';

/**
 * Coffee Shop — warm, roasted and cozy. Wood-tone palette, a bean story
 * section and a menu-first layout.
 */
const CoffeeShopPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const roast = getVar('--twc-primary-600', '#6f4e37');
    const cream = getVar('--twc-primary-500', '#a97c50');

    const menu = [
        { icon: <Coffee className="h-5 w-5" />, title: 'مشروبات ساخنة', desc: 'إسبريسو، قهوة مختصة وكابتشينو' },
        { icon: <CupSoda className="h-5 w-5" />, title: 'مشروبات باردة', desc: 'كولد برو ولافندر لاتيه مثلج' },
        { icon: <Croissant className="h-5 w-5" />, title: 'مخبوزات', desc: 'كرواسون طازج صباح كل يوم' },
    ];

    return (
        <div className="min-h-screen" style={{ background: '#f4ede3', color: '#2d2116' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-amber-900/10 bg-[#f4ede3]/95 backdrop-blur-md md:block">
                <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: roast }}>
                            <Coffee className="h-4 w-4" />
                        </span>
                        <span className="text-lg font-bold tracking-tight" style={{ color: '#2d2116' }}>
                            {identity.name}
                        </span>
                    </div>
                    <nav className="flex items-center gap-8 text-sm font-semibold text-amber-900/70">
                        <a href="#story" className="hover:text-amber-950">
                            قصتنا
                        </a>
                        <a href="#menu" className="hover:text-amber-950">
                            القائمة
                        </a>
                        <a href="#menu" className="hover:text-amber-950">
                            الطلب
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
                        <p className="text-xs font-bold tracking-[0.35em] uppercase" style={{ color: cream }}>
                            Specialty Coffee
                        </p>
                        <h1 className="mt-4 text-4xl leading-tight font-black md:text-6xl" style={{ color: '#2d2116' }}>
                            تحميص جديد
                            <br />
                            <span style={{ color: roast }}>لصباحٍ أجمل</span>
                        </h1>
                        <p className="mt-5 max-w-md leading-relaxed text-amber-900/70">
                            حبوب مختارة من مزارع أخلاقية، تُحمّص في محمصتنا كل صباح وتُقدَّم لك فور نضجها.
                        </p>
                        <div className="mt-7 flex flex-wrap items-center gap-3">
                            <a
                                href="#menu"
                                className="rounded-full px-8 py-3 text-sm font-bold text-white transition hover:opacity-90"
                                style={{ background: roast }}
                            >
                                اطلب من القائمة
                            </a>
                            <a
                                href="#story"
                                className="rounded-full border border-amber-900/20 bg-white px-8 py-3 text-sm font-bold transition hover:shadow-sm"
                                style={{ color: '#2d2116' }}
                            >
                                تعرف على تحميصنا
                            </a>
                        </div>
                    </div>
                    <div className="relative mx-auto w-full max-w-sm">
                        <div className="overflow-hidden rounded-full border-8 border-white shadow-2xl">
                            {products[0] ? (
                                <ProductImage product={products[0]} className="aspect-square" />
                            ) : (
                                <div
                                    className="flex aspect-square items-center justify-center text-7xl"
                                    style={{ background: 'linear-gradient(135deg, #d9c3a5, #b78a5b)' }}
                                >
                                    ☕
                                </div>
                            )}
                        </div>
                        <div className="absolute start-1/2 -bottom-4 -translate-x-1/2 rounded-full bg-white px-6 py-2 shadow-lg">
                            <p className="text-sm font-black" style={{ color: roast }}>
                                ☕ فنجان يجمعنا
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Story strip */}
            <section id="story" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-8">
                <div
                    className="rounded-3xl bg-gradient-to-l p-8 text-white md:p-10"
                    style={{ background: 'linear-gradient(120deg, #6f4e37, #a97c50)' }}
                >
                    <div className="grid gap-6 md:grid-cols-3">
                        {menu.map((m) => (
                            <div key={m.title} className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">{m.icon}</span>
                                <div>
                                    <p className="text-sm font-bold">{m.title}</p>
                                    <p className="mt-0.5 text-xs text-amber-50/80">{m.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Menu / shop */}
            <section id="menu" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-10">
                <SectionHeading title="قائمتنا" subtitle="كل مشروب يُحضّر عند الطلب بعناية الحرفي" />
                <div className="mb-6 flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className={`rounded-full px-5 py-2 text-sm font-bold transition ${cat === 'all' ? 'text-white' : 'border border-amber-900/20 bg-white'}`}
                        style={cat === 'all' ? { background: roast } : { color: '#2d2116' }}
                    >
                        الكل
                    </button>
                    {categories.map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className={`rounded-full px-5 py-2 text-sm font-bold transition ${cat === c.id ? 'text-white' : 'border border-amber-900/20 bg-white'}`}
                            style={cat === c.id ? { background: roast } : { color: '#2d2116' }}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
                <div className="mx-auto grid max-w-3xl divide-y divide-amber-900/10 overflow-hidden rounded-3xl border border-amber-900/10 bg-white shadow-sm">
                    {products.length === 0 ? (
                        <p className="py-16 text-center text-sm font-semibold text-amber-900/60">القائمة فارغة — أضف مشروباتك من لوحة التحكم</p>
                    ) : (
                        products.map((p: any, i: number) => (
                            <article
                                key={p.id || i}
                                className="group flex cursor-pointer items-center gap-4 p-4 transition hover:bg-amber-50"
                                onClick={() => product.handleProductClick(p)}
                            >
                                <ProductImage product={p} className="h-16 w-16 shrink-0 rounded-full" />
                                <div className="min-w-0 flex-1">
                                    <h3 className="truncate text-base font-black" style={{ color: '#2d2116' }}>
                                        {p.name}
                                    </h3>
                                    <p className="mt-0.5 line-clamp-1 text-xs text-amber-900/60">{p.description}</p>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1.5">
                                    <span className="text-base font-black" style={{ color: roast }}>
                                        {p.price} {identity.currency}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            product.handleProductClick(p);
                                        }}
                                        className="rounded-full px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                                        style={{ background: roast }}
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
            <footer className="border-t border-amber-900/10" style={{ background: '#e9dcc8' }}>
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-10 md:flex-row">
                    <p className="font-black" style={{ color: '#2d2116' }}>
                        {identity.name}
                    </p>
                    <p className="text-xs text-amber-900/60">© {new Date().getFullYear()} — صُنع بحب ورغوة حليب</p>
                </div>
            </footer>
        </div>
    );
};

export default CoffeeShopPage;
