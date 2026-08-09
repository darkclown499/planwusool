import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { BookOpen, Quote, Search } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';

/**
 * Books — a quiet, editorial bookstore. Paper-warm palette, serif display
 * type, a searchable shelf and a reading-list vibe.
 */
const BooksPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');
    const [query, setQuery] = useState('');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        const byCat = cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
        if (!query.trim()) return byCat;
        const q = query.trim().toLowerCase();
        return byCat.filter((p: any) => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }, [product?.filteredProducts, storeData?.products, cat, query]);

    const ink = getVar('--twc-primary-600', '#7a4e2d');
    const inkSoft = getVar('--twc-primary-500', '#a0713f');
    const serif = `'Georgia', 'Times New Roman', ${getVar('--twf-font-family', "'Tajawal', sans-serif")}`;

    return (
        <div className="min-h-screen" style={{ background: '#faf6ee', color: '#3b3226' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-amber-900/10 bg-[#faf6ee]/95 backdrop-blur-md md:block">
                <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full text-white" style={{ background: ink }}>
                            <BookOpen className="h-4 w-4" />
                        </span>
                        <span className="text-lg font-bold tracking-tight" style={{ color: '#3b3226' }}>
                            {identity.name}
                        </span>
                    </div>
                    <nav className="flex items-center gap-8 text-sm font-semibold text-amber-900/70">
                        <a href="#shelf" className="hover:text-amber-950">
                            الرفوف
                        </a>
                        <a href="#shelf" className="hover:text-amber-950">
                            الجديد
                        </a>
                        <a href="#reading" className="hover:text-amber-950">
                            قراءات
                        </a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Editorial hero */}
            <section className="border-b border-amber-900/10 bg-gradient-to-b from-[#f3e9d5] to-[#faf6ee]">
                <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-[1.3fr_1fr] md:py-24">
                    <div>
                        <p className="text-xs font-bold tracking-[0.35em] uppercase" style={{ color: inkSoft }}>
                            مكتبة {identity.name}
                        </p>
                        <h1 className="mt-4 text-4xl leading-tight font-black md:text-6xl" style={{ color: '#3b3226', fontFamily: serif }}>
                            احتضن كتاباً
                            <br />
                            <span className="italic" style={{ color: ink }}>
                                يغيّر فصلاً منك
                            </span>
                        </h1>
                        <p className="mt-5 max-w-md leading-relaxed text-amber-900/70">
                            آلاف العناوين بين الأدب، الفلسفة والعلوم — مختارة بعناية، ومُرسلة حتى بابك لتكمل حكايتك في هدوء.
                        </p>
                        <div className="relative mt-8 max-w-sm">
                            <Search className="absolute end-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-900/40" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="ابحث عن عنوان أو مؤلف..."
                                className="h-13 w-full rounded-full border border-amber-900/15 bg-white ps-5 pe-12 text-sm shadow-sm outline-none focus:ring-2"
                                style={{ color: '#3b3226' }}
                            />
                        </div>
                    </div>
                    <div className="grid gap-4">
                        {products.slice(0, 3).map((p: any, i: number) => (
                            <figure
                                key={p.id || i}
                                className="flex items-center gap-4 rounded-2xl border border-amber-900/10 bg-white p-3 shadow-sm"
                                style={i === 1 ? { transform: 'translateX(1.5rem)' } : {}}
                            >
                                <ProductImage product={p} className="h-24 w-16 shrink-0 rounded-lg" />
                                <figcaption>
                                    <h3 className="line-clamp-2 text-sm font-bold" style={{ color: '#3b3226', fontFamily: serif }}>
                                        {p.name}
                                    </h3>
                                    <p className="mt-1 text-xs text-amber-900/60">{p.description}</p>
                                    <p className="mt-2 text-sm font-black" style={{ color: ink }}>
                                        {p.price} {identity.currency}
                                    </p>
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </div>
            </section>

            {/* Reading quote */}
            <section id="reading" className="mx-auto max-w-4xl scroll-mt-24 px-6 py-14 text-center">
                <Quote className="mx-auto h-8 w-8" style={{ color: inkSoft }} />
                <blockquote className="mt-4 text-2xl leading-relaxed font-medium italic md:text-3xl" style={{ color: '#3b3226', fontFamily: serif }}>
                    “الكتب رفاهية العقل، وقراءة الصفحة الأولى سفرٌ يبدأ من مقعدك.”
                </blockquote>
            </section>

            {/* Shelf / shop */}
            <section id="shelf" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-16">
                <SectionHeading title="رفوف المكتبة" subtitle="الأكثر طلباً هذا الأسبوع — اختر ما يستحق وقتك" />
                <div className="mb-6 flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className={`rounded-full px-5 py-2 text-sm font-bold transition ${cat === 'all' ? 'text-white' : 'border border-amber-900/15 bg-white'}`}
                        style={cat === 'all' ? { background: ink } : { color: '#3b3226' }}
                    >
                        كل الرفوف
                    </button>
                    {categories.map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className={`rounded-full px-5 py-2 text-sm font-bold transition ${cat === c.id ? 'text-white' : 'border border-amber-900/15 bg-white'}`}
                            style={cat === c.id ? { background: ink } : { color: '#3b3226' }}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
                    {products.length === 0 ? (
                        <p className="col-span-full py-16 text-center text-sm font-semibold text-amber-900/60">
                            لم نعثر على كتب — أضف عناوينك من لوحة التحكم
                        </p>
                    ) : (
                        products.map((p: any, i: number) => (
                            <article key={p.id || i} className="group cursor-pointer" onClick={() => product.handleProductClick(p)}>
                                <div className="relative">
                                    <div
                                        className="absolute inset-y-0 start-0 w-3 rounded-s-xl"
                                        style={{ background: 'linear-gradient(90deg, rgba(58,46,30,0.35), transparent)' }}
                                    />
                                    <ProductImage
                                        product={p}
                                        className="aspect-[3/4] rounded-xl shadow-md transition duration-500 group-hover:-translate-y-1 group-hover:shadow-xl"
                                        imgClassName="transition duration-500 group-hover:scale-[1.03]"
                                    />
                                    {i === 0 && (
                                        <span
                                            className="absolute end-2 top-2 rounded-full px-3 py-1 text-[10px] font-black tracking-widest text-white uppercase"
                                            style={{ background: ink }}
                                        >
                                            جديد
                                        </span>
                                    )}
                                </div>
                                <h3 className="mt-3 line-clamp-1 text-sm font-bold" style={{ color: '#3b3226', fontFamily: serif }}>
                                    {p.name}
                                </h3>
                                <p className="mt-0.5 line-clamp-1 text-xs text-amber-900/60">{p.description}</p>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className="text-sm font-black" style={{ color: ink }}>
                                        {p.price} {identity.currency}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            product.handleProductClick(p);
                                        }}
                                        className="rounded-full border border-amber-900/15 px-4 py-1.5 text-xs font-bold transition hover:bg-white"
                                        style={{ color: '#3b3226' }}
                                    >
                                        اقرأ المزيد
                                    </button>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-amber-900/10" style={{ background: '#f1e6d0' }}>
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-10 md:flex-row">
                    <p className="font-black" style={{ color: '#3b3226', fontFamily: serif }}>
                        {identity.name}
                    </p>
                    <p className="text-xs text-amber-900/60">© {new Date().getFullYear()} — نقرأ لنعيش حيوات أكثر من واحدة</p>
                </div>
            </footer>
        </div>
    );
};

export default BooksPage;
