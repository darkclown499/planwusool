import { AccountButton, CartButton, useStorefrontCore } from '@/templates/storefront';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import { ChefHat, Clock, MapPin, Wine } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';
import { ProductImage, SectionHeading, getVar } from './ui';

/**
 * Food Premium — opulent dark restaurant. Playfair display type, gold on
 * near-black, chef's note and reservation strip.
 */
const FoodPremiumPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config } = useStorefrontCore();
    const identity = storeIdentity(config, storeData);
    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const [cat, setCat] = useState('all');

    const products = useMemo(() => {
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return cat === 'all' ? list : list.filter((p: any) => String(p.categoryId) === String(cat));
    }, [product?.filteredProducts, storeData?.products, cat]);

    const gold = getVar('--twc-primary-500', '#c19a6b');
    const serif = `'Playfair Display', 'Georgia', ${getVar('--twf-font-family', "'Tajawal', sans-serif")}`;

    const bookingPhone = config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp || config?.phoneNumber || '';
    const [booking, setBooking] = useState({ name: '', phone: '', guests: '', when: '' });

    const handleBooking = () => {
        const message = `مرحباً، أرغب بحجز طاولة:%0Aالاسم: ${booking.name}%0Aالجوال: ${booking.phone}%0Aعدد الأشخاص: ${booking.guests}%0Aالتاريخ والوقت: ${booking.when}`;
        const url = createWhatsAppUrl(bookingPhone, message.replace(/%0A/g, '\n'));
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="min-h-screen" style={{ background: '#0c0a09', color: '#fafaf9' }}>
            {/* Header */}
            <header className="sticky top-0 z-40 hidden border-b border-white/10 bg-[#0c0a09]/90 backdrop-blur-md md:block">
                <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
                    <span className="text-xl font-bold tracking-wide" style={{ color: gold, fontFamily: serif }}>
                        {identity.name}
                    </span>
                    <nav className="flex items-center gap-9 text-xs font-medium tracking-[0.2em] text-stone-400 uppercase">
                        <a href="#reserve" className="hover:text-white">
                            الحجز
                        </a>
                        <a href="#menu" className="hover:text-white">
                            القائمة
                        </a>
                        <a href="#chef" className="hover:text-white">
                            طبق الشيف
                        </a>
                    </nav>
                    <div className="flex items-center gap-2">
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Restaurant hero */}
            <section className="relative overflow-hidden border-b border-white/10">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 20%, #292524, #0c0a09 65%)' }} />
                <div className="relative mx-auto max-w-6xl px-6 py-24 text-center md:py-32">
                    <p className="flex items-center justify-center gap-2 text-xs font-medium tracking-[0.4em] text-stone-500 uppercase">
                        <ChefHat className="h-4 w-4" style={{ color: gold }} /> Fine Dining Experience
                    </p>
                    <h1 className="mt-6 text-5xl leading-tight font-bold md:text-7xl" style={{ color: '#fafaf9', fontFamily: serif }}>
                        مذاق يروي
                        <br />
                        <em style={{ color: gold }}>حكاية طاهٍ</em>
                    </h1>
                    <p className="mx-auto mt-6 max-w-lg leading-relaxed text-stone-400">
                        أطباق تُحضّر من مكونات موسمية مختارة، بلمسة إبداعية تمزج النكهة الأصيلة بالفن العصري.
                    </p>
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                        <a
                            href="#reserve"
                            className="rounded-full px-9 py-3.5 text-sm font-bold text-black transition hover:opacity-90"
                            style={{ background: gold }}
                        >
                            احجز طاولة
                        </a>
                        <a
                            href="#menu"
                            className="rounded-full border border-white/20 px-9 py-3.5 text-sm font-bold text-white transition hover:bg-white/5"
                        >
                            تصفح القائمة
                        </a>
                    </div>
                </div>
            </section>

            {/* Info strip */}
            <section className="border-b border-white/10">
                <div className="mx-auto grid max-w-6xl gap-px md:grid-cols-3">
                    {[
                        { icon: <Clock className="h-5 w-5" />, title: 'ساعات العمل', desc: 'يومياً من 1م إلى 12ص' },
                        { icon: <MapPin className="h-5 w-5" />, title: 'موقعنا', desc: 'في قلب المدينة — مع موقف خاص' },
                        { icon: <Wine className="h-5 w-5" />, title: 'قائمة المشروبات', desc: 'مشروبات موسمية ومختارة' },
                    ].map((i) => (
                        <div key={i.title} className="flex items-center gap-4 px-6 py-6">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/15" style={{ color: gold }}>
                                {i.icon}
                            </span>
                            <div>
                                <p className="text-sm font-bold" style={{ color: '#fafaf9' }}>
                                    {i.title}
                                </p>
                                <p className="mt-0.5 text-xs text-stone-500">{i.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Reservation */}
            <section id="reserve" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16">
                <div
                    className="overflow-hidden rounded-3xl border border-white/10 p-8 md:p-12"
                    style={{ background: 'linear-gradient(135deg, #1c1917, #292524)' }}
                >
                    <div className="grid items-center gap-8 md:grid-cols-2">
                        <div>
                            <p className="text-xs font-medium tracking-[0.3em] text-stone-500 uppercase">Reservations</p>
                            <h2 className="mt-3 text-3xl font-bold md:text-4xl" style={{ color: '#fafaf9', fontFamily: serif }}>
                                طاولتك بانتظارك
                            </h2>
                            <p className="mt-3 max-w-sm leading-relaxed text-stone-400">
                                احجز الآن واستمتع بتجربة لا تُنسى، مع إمكانية تخصيص القائمة للمناسبات الخاصة.
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <input
                                placeholder="الاسم"
                                value={booking.name}
                                onChange={(e) => setBooking((b) => ({ ...b, name: e.target.value }))}
                                className="h-13 rounded-xl border border-white/15 bg-black/30 px-4 text-sm text-white outline-none focus:border-white/40"
                            />
                            <input
                                placeholder="رقم الجوال"
                                value={booking.phone}
                                onChange={(e) => setBooking((b) => ({ ...b, phone: e.target.value }))}
                                className="h-13 rounded-xl border border-white/15 bg-black/30 px-4 text-sm text-white outline-none focus:border-white/40"
                            />
                            <input
                                placeholder="عدد الأشخاص"
                                type="number"
                                value={booking.guests}
                                onChange={(e) => setBooking((b) => ({ ...b, guests: e.target.value }))}
                                className="h-13 rounded-xl border border-white/15 bg-black/30 px-4 text-sm text-white outline-none focus:border-white/40"
                            />
                            <input
                                placeholder="التاريخ والوقت"
                                value={booking.when}
                                onChange={(e) => setBooking((b) => ({ ...b, when: e.target.value }))}
                                className="h-13 rounded-xl border border-white/15 bg-black/30 px-4 text-sm text-white outline-none focus:border-white/40"
                            />
                            <button
                                type="button"
                                onClick={handleBooking}
                                className="h-13 rounded-xl text-sm font-bold text-black transition hover:opacity-90 sm:col-span-2"
                                style={{ background: gold }}
                            >
                                تأكيد الحجز
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Chef's note */}
            <section id="chef" className="mx-auto max-w-3xl scroll-mt-24 px-6 pb-8 text-center">
                <ChefHat className="mx-auto h-9 w-9" style={{ color: gold }} />
                <blockquote className="mt-5 text-2xl leading-relaxed font-light italic md:text-3xl" style={{ color: '#fafaf9', fontFamily: serif }}>
                    “في كل طبق نبحث عن لحظة صدق — نكهة تذكّرك بالبيت وتفاجئك بحداثتها في آنٍ واحد.”
                </blockquote>
                <p className="mt-4 text-xs tracking-[0.3em] text-stone-500 uppercase">— الشيف التنفيذي</p>
            </section>

            {/* Menu / shop */}
            <section id="menu" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-10">
                <SectionHeading title="القائمة" subtitle="أطباق الشيف المميزة — تُقدَّم مع خبز طازج" />
                <div className="mb-8 flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCat('all')}
                        className={`rounded-full px-6 py-2.5 text-xs font-bold tracking-[0.15em] uppercase transition ${cat === 'all' ? 'text-black' : 'border border-white/15 text-stone-400 hover:text-white'}`}
                        style={cat === 'all' ? { background: gold } : {}}
                    >
                        الكل
                    </button>
                    {categories.map((c: any) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                            className={`rounded-full px-6 py-2.5 text-xs font-bold tracking-[0.15em] uppercase transition ${cat === c.id ? 'text-black' : 'border border-white/15 text-stone-400 hover:text-white'}`}
                            style={cat === c.id ? { background: gold } : {}}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
                <div className="mx-auto max-w-3xl divide-y divide-white/10 overflow-hidden rounded-3xl border border-white/10 bg-[#15120f]">
                    {products.length === 0 ? (
                        <p className="py-16 text-center text-sm font-light text-stone-500">القائمة قيد التحضير — أضف أطباقك من لوحة التحكم</p>
                    ) : (
                        products.map((p: any, i: number) => (
                            <article
                                key={p.id || i}
                                className="group flex cursor-pointer items-start gap-5 p-5 transition hover:bg-white/5"
                                onClick={() => product.handleProductClick(p)}
                            >
                                <div className="relative shrink-0">
                                    <ProductImage product={p} className="h-20 w-20 rounded-full border border-white/10" />
                                    {i === 0 && (
                                        <span
                                            className="absolute -end-1 -top-1 rounded-full px-2 py-0.5 text-[9px] font-black tracking-widest text-black uppercase"
                                            style={{ background: gold }}
                                        >
                                            توقيع
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <h3 className="truncate text-base font-bold" style={{ color: '#fafaf9', fontFamily: serif }}>
                                            {p.name}
                                        </h3>
                                        <span className="shrink-0 text-sm font-bold" style={{ color: gold }}>
                                            {p.price} {identity.currency}
                                        </span>
                                    </div>
                                    <p className="mt-1 line-clamp-1 text-xs text-stone-500">{p.description}</p>
                                    <div className="mt-2 flex items-center gap-4 text-[11px] text-stone-600">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> 20 دقيقة
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <ChefHat className="h-3 w-3" /> طبق الشيف
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        product.handleProductClick(p);
                                    }}
                                    className="mt-6 shrink-0 rounded-full border border-white/15 px-5 py-2 text-xs font-bold tracking-wider text-white uppercase transition hover:bg-white/10"
                                >
                                    أضف
                                </button>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-12 md:flex-row">
                    <p className="text-xl font-bold tracking-wide" style={{ color: gold, fontFamily: serif }}>
                        {identity.name}
                    </p>
                    <p className="text-xs tracking-[0.2em] text-stone-600 uppercase">© {new Date().getFullYear()} — تجربة لا تُنسى</p>
                </div>
            </footer>
        </div>
    );
};

export default FoodPremiumPage;
