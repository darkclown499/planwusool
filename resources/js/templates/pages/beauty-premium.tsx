import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import { Droplets, Flower2, Sparkles, Wand2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';

/**
 * Beauty Premium — editorial soft-luxury. Blush palette on ivory, a
 * routine/rituals strip and ingredient-driven product cards.
 */
const BeautyPremiumPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const blush = getVar('--twc-primary-500', '#f472b6');
    const berry = getVar('--twc-primary-600', '#db2777');
    const ink = '#500724';

    const consultPhone = config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp || config?.phoneNumber || '';
    const consultUrl = consultPhone ? createWhatsAppUrl(consultPhone, 'مرحباً، أرغب بالاستشارة حول روتين العناية بالبشرة') : '';

    const rituals = [
        { icon: <Droplets className="h-5 w-5" />, title: 'تنظيف', desc: 'إزالة الشوائب بلطف' },
        { icon: <Flower2 className="h-5 w-5" />, title: 'ترطيب', desc: 'مكوّنات طبيعية مغذية' },
        { icon: <Sparkles className="h-5 w-5" />, title: 'حماية', desc: 'عناية نهارية بفلاتر شمسية' },
        { icon: <Wand2 className="h-5 w-5" />, title: 'إشراقة', desc: 'لمسة نهائية ناعمة' },
    ];

    return (
        <div className="min-h-screen" style={{ background: '#fdf2f8', color: ink }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-pink-100 bg-[#fdf2f8]/95 backdrop-blur-md md:block">
                <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: blush }}>
                            <Sparkles className="h-4 w-4" />
                        </span>
                        <span className="text-lg font-bold tracking-tight" style={{ color: ink }}>
                            {identity.name}
                        </span>
                    </div>
                    <nav className="flex items-center gap-8 text-sm font-semibold text-pink-900/60">
                        <a href="#rituals" className="hover:text-pink-950">
                            طقوس العناية
                        </a>
                        <a href="#edit" className="hover:text-pink-950">
                            المجموعة
                        </a>
                        <a href="#guide" className="hover:text-pink-950">
                            دليل الاختيار
                        </a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Editorial hero */}
            <section className="mx-auto max-w-7xl px-6 pt-14 pb-10">
                <div className="grid items-center gap-12 lg:grid-cols-2">
                    <div>
                        <p className="text-xs font-bold tracking-[0.35em] uppercase" style={{ color: berry }}>
                            Beauty Rituals
                        </p>
                        <h1 className="mt-4 text-4xl leading-tight font-black md:text-6xl" style={{ color: ink }}>
                            جمالكِ
                            <br />
                            <em className="font-medium" style={{ color: berry }}>
                                روتينٌ لا رفاهية
                            </em>
                        </h1>
                        <p className="mt-5 max-w-md leading-relaxed text-pink-900/60">
                            تركيبات مدروسة بمكونات طبيعية عالية النقاء، صُممت لتهتم ببشرتك يوماً بعد يوم بعناية المختبر.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <a
                                href="#edit"
                                className="rounded-full px-8 py-3 text-sm font-bold text-white transition hover:opacity-90"
                                style={{ background: blush }}
                            >
                                تصفحي المجموعة
                            </a>
                            <a
                                href="#guide"
                                className="rounded-full border border-pink-200 bg-white px-8 py-3 text-sm font-bold transition hover:shadow-sm"
                                style={{ color: ink }}
                            >
                                دليل اختيار بشرتك
                            </a>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="overflow-hidden rounded-[2.5rem]">
                            {products[0] ? (
                                <ProductImage product={products[0]} className="aspect-[4/5]" imgClassName="transition duration-700 hover:scale-105" />
                            ) : (
                                <div
                                    className="flex aspect-[4/5] items-center justify-center rounded-[2.5rem] text-7xl"
                                    style={{ background: 'linear-gradient(135deg, #fbcfe8, #fce7f3)' }}
                                >
                                    ✨
                                </div>
                            )}
                        </div>
                        <div className="absolute -end-5 -bottom-5 rounded-3xl bg-white px-6 py-4 shadow-xl">
                            <p className="text-sm font-black" style={{ color: berry }}>
                                طبيعي 100%
                            </p>
                            <p className="text-xs text-pink-900/60">خالٍ من البارابين</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Rituals */}
            <section id="rituals" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-8">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {rituals.map((r) => (
                        <div key={r.title} className="rounded-3xl border border-pink-100 bg-white p-6 text-center shadow-sm">
                            <span
                                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white"
                                style={{ background: blush }}
                            >
                                {r.icon}
                            </span>
                            <h3 className="mt-3 text-sm font-black" style={{ color: ink }}>
                                {r.title}
                            </h3>
                            <p className="mt-1 text-xs text-pink-900/60">{r.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Collection */}
            <section id="edit" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-12">
                <SectionHeading title="المجموعة المختارة" subtitle="أكثر المنتجات حباً لدى عميلاتنا هذا الشهر" />
                <div className="mb-6 flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className={`rounded-full px-5 py-2 text-sm font-bold transition ${cat === 'all' ? 'text-white' : 'border border-pink-200 bg-white'}`}
                        style={cat === 'all' ? { background: blush } : { color: ink }}
                    >
                        الكل
                    </button>
                    {categories.map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className={`rounded-full px-5 py-2 text-sm font-bold transition ${cat === c.id ? 'text-white' : 'border border-pink-200 bg-white'}`}
                            style={cat === c.id ? { background: blush } : { color: ink }}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {products.length === 0 ? (
                        <p className="col-span-full py-16 text-center text-sm font-semibold text-pink-900/60">
                            لا توجد منتجات بعد — أضف مجموعتك من لوحة التحكم
                        </p>
                    ) : (
                        products.map((p: any, i: number) => (
                            <article
                                key={p.id || i}
                                className="group cursor-pointer overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                                onClick={() => product.handleProductClick(p)}
                            >
                                <div className="relative overflow-hidden">
                                    <ProductImage
                                        product={p}
                                        className="aspect-square"
                                        imgClassName="transition duration-500 group-hover:scale-105"
                                    />
                                    {i % 3 === 0 && (
                                        <span
                                            className="absolute start-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black tracking-widest uppercase backdrop-blur"
                                            style={{ color: berry }}
                                        >
                                            الأكثر مبيعاً
                                        </span>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="truncate text-sm font-black" style={{ color: ink }}>
                                        {p.name}
                                    </h3>
                                    <p className="mt-0.5 line-clamp-1 text-xs text-pink-900/60">{p.description}</p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-sm font-black" style={{ color: berry }}>
                                            {p.price} {identity.currency}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                product.handleProductClick(p);
                                            }}
                                            className="rounded-full px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                                            style={{ background: blush }}
                                        >
                                            اطلبيه
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* Guide strip */}
            <section id="guide" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-8">
                <div className="rounded-3xl p-8 text-center text-white" style={{ background: 'linear-gradient(120deg, #db2777, #f472b6)' }}>
                    <Flower2 className="mx-auto h-8 w-8" />
                    <h3 className="mt-3 text-2xl font-black">لا تعرفين من أين تبدأين؟</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-pink-50/90">
                        تواصلي معنا وسنساعدك على بناء روتين يناسب نوع بشرتك وأهدافك بالضبط.
                    </p>
                    {consultUrl ? (
                        <a
                            href={consultUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-6 inline-block rounded-full bg-white px-8 py-3 text-sm font-black text-pink-700 transition hover:opacity-90"
                        >
                            استشيري خبراءنا
                        </a>
                    ) : (
                        <button
                            type="button"
                            onClick={() => products[0] && product.handleProductClick(products[0])}
                            className="mt-6 rounded-full bg-white px-8 py-3 text-sm font-black text-pink-700 transition hover:opacity-90"
                        >
                            استشيري خبراءنا
                        </button>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-pink-100" style={{ background: '#fce7f3' }}>
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-10 md:flex-row">
                    <p className="font-black" style={{ color: ink }}>
                        {identity.name}
                    </p>
                    <p className="text-xs text-pink-900/60">© {new Date().getFullYear()} — جمالك يبدأ من اهتمامك بنفسك</p>
                </div>
            </footer>
        </div>
    );
};

export default BeautyPremiumPage;
