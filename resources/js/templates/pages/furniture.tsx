import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { Sofa } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, SplitCard, getVar } from './ui';

/**
 * Furniture — warm neutral palette, large lifestyle "room" hero,
 * big category image cards and split product cards.
 */
const FurniturePage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const wood = getVar('--twc-primary-600', '#92612b');
    const woodSoft = getVar('--twc-primary-500', '#c49a6c');

    return (
        <div className="min-h-screen" style={{ background: '#faf7f2', color: '#292524' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-stone-200 bg-[#faf7f2]/95 backdrop-blur-md md:block">
                <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: wood }}>
                            <Sofa className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-bold" style={{ color: '#292524' }}>
                            {identity.name}
                        </span>
                    </div>
                    <nav className="flex items-center gap-8 text-sm font-semibold text-stone-600">
                        <a href="#rooms" className="hover:text-stone-900">
                            المجموعات
                        </a>
                        <a href="#store" className="hover:text-stone-900">
                            الأثاث
                        </a>
                        <a href="#craft" className="hover:text-stone-900">
                            حرفيتنا
                        </a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Room hero */}
            <section className="mx-auto max-w-7xl px-6 py-10 md:py-16">
                <div className="grid overflow-hidden rounded-[2rem] lg:grid-cols-2">
                    <div className="relative flex min-h-[320px] items-center justify-center lg:min-h-[480px]">
                        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${woodSoft}, ${wood})` }} />
                        <div className="relative z-10 grid grid-cols-2 gap-4 p-8" style={{ transform: 'rotate(-3deg)' }}>
                            {products.slice(0, 2).map((p: any, i: number) => (
                                <div key={p.id || i} className={`overflow-hidden rounded-2xl shadow-2xl ${i ? 'mt-10' : ''}`}>
                                    <div className="flex aspect-[4/5] w-full items-center justify-center text-4xl font-light text-white/80">
                                        {p.name?.charAt(0)}
                                    </div>
                                    <ProductImage product={p} className="absolute inset-0" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col justify-center bg-white p-8 md:p-12">
                        <p className="text-xs font-bold tracking-[0.25em] uppercase" style={{ color: wood }}>
                            Home & Living
                        </p>
                        <h1 className="mt-3 text-3xl leading-tight font-black md:text-5xl" style={{ color: '#292524' }}>
                            بيتك يستحق
                            <br />
                            راحة حقيقية
                        </h1>
                        <p className="mt-4 max-w-md leading-relaxed text-stone-500">
                            قطع أثاث عصرية وخالدة من {identity.name} — صنعت لتجمع عائلتك حولها كل يوم.
                        </p>
                        <div className="mt-7 flex items-center gap-3">
                            <a
                                href="#store"
                                className="rounded-full px-8 py-3 text-sm font-bold text-white transition hover:opacity-90"
                                style={{ background: wood }}
                            >
                                تسوق الأثاث
                            </a>
                            <a
                                href="#rooms"
                                className="rounded-full border border-stone-300 px-8 py-3 text-sm font-bold transition hover:bg-stone-100"
                                style={{ color: '#292524' }}
                            >
                                استكشف
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Rooms */}
            <section id="rooms" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-8">
                <SectionHeading title="تصفح حسب الغرفة" />
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <button type="button" onClick={() => setCat('all')} className="group relative overflow-hidden rounded-2xl">
                        <div
                            className="flex aspect-[3/4] items-center justify-center text-3xl transition duration-500 group-hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #e7e0d4, #d6c9b8)' }}
                        >
                            ✨
                        </div>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-start">
                            <p className="font-bold text-white">كل المنتجات</p>
                        </div>
                    </button>
                    {categories.slice(0, 3).map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className="group relative overflow-hidden rounded-2xl"
                        >
                            <div
                                className="flex aspect-[3/4] items-center justify-center text-3xl transition duration-500 group-hover:scale-105"
                                style={{ background: 'linear-gradient(135deg, #e7e0d4, #d6c9b8)' }}
                            >
                                {c.name.charAt(0)}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-start">
                                <p className="font-bold text-white">{c.name}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {/* Products */}
            <section id="store" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-10">
                <SectionHeading title="قطع مختارة" subtitle={cat === 'all' ? 'أحدث ما وصلنا' : 'من اختياراتك'} />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {products.length === 0 ? (
                        <p className="col-span-full py-16 text-center text-sm font-semibold text-stone-500">
                            لا توجد قطع بعد — أضف منتجاتك من لوحة التحكم
                        </p>
                    ) : (
                        products.map((p: any, i: number) => <SplitCard key={p.id || i} product={p} reverse={i % 2 === 0} />)
                    )}
                </div>
            </section>

            {/* Craft */}
            <section id="craft" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-10">
                <div
                    className="grid items-center gap-8 rounded-[2rem] bg-white p-8 md:grid-cols-2 md:p-12"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                >
                    <div>
                        <p className="text-xs font-bold tracking-[0.25em] uppercase" style={{ color: wood }}>
                            حرفيتنا
                        </p>
                        <h2 className="mt-3 text-3xl font-black" style={{ color: '#292524' }}>
                            خامات تدوم
                        </h2>
                        <p className="mt-3 leading-relaxed text-stone-500">
                            نختار أجود الأخشاب والخامات، ونصنع كل قطعة بحرفية عالية لتوائم ذوقك وتدوم لسنوات.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        {[
                            { icon: '🪵', label: 'أخشاب طبيعية' },
                            { icon: '🛠️', label: 'صناعة يدوية' },
                            { icon: '📦', label: 'توصيل وتركيب' },
                        ].map((f) => (
                            <div key={f.label} className="rounded-2xl border border-stone-200 p-4">
                                <span className="text-2xl">{f.icon}</span>
                                <p className="mt-2 text-xs font-bold" style={{ color: '#292524' }}>
                                    {f.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-4 border-t border-stone-200">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-10 md:flex-row">
                    <p className="font-bold" style={{ color: '#292524' }}>
                        {identity.name}
                    </p>
                    <p className="text-xs text-stone-500">© {new Date().getFullYear()} — راحة بيتك أولويتنا</p>
                </div>
            </footer>
        </div>
    );
};

export default FurniturePage;
