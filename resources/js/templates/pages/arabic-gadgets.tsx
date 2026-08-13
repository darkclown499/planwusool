import { AccountButton, CartButton, WhatsAppButton, useStorefrontCore } from '@/templates/storefront';
import { getImageUrl } from '@/utils/image-helper';
import { formatStoreCurrency } from '@/utils/currency-formatter';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import {
    Facebook,
    Gamepad2,
    Headphones,
    Heart,
    Instagram,
    Laptop,
    Linkedin,
    MessageCircle,
    MonitorSmartphone,
    Play,
    Search,
    ShoppingCart,
    Smartphone,
    Sparkles,
    Tablet,
    Truck,
    Watch,
    Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import type { TemplatePageProps } from './types';
import { storeIdentity } from './types';

/* ------------------------------ Constants (reference palette) ------------------------------ */

const PRIMARY = '#0088ff';
const STAR = '#ffb300';

/* ------------------------------ Countdown ------------------------------ */

interface Countdown {
    hours: string;
    minutes: string;
    seconds: string;
}

function useCountdown(): Countdown {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const end = useMemo(() => {
        const d = new Date();
        d.setHours(23, 59, 59, 999);
        return d.getTime();
    }, []);

    const diff = Math.max(0, Math.floor((end - now) / 1000));
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
        hours: pad(Math.floor(diff / 3600)),
        minutes: pad(Math.floor((diff % 3600) / 60)),
        seconds: pad(diff % 60),
    };
}

/* ------------------------------ Category icons ------------------------------ */

const CATEGORY_KEYWORDS: Record<string, string> = {
    headphone: 'headphones',
    audio: 'headphones',
    earbud: 'headphones',
    smartwatch: 'watch',
    watch: 'watch',
    smartphone: 'smartphone',
    mobile: 'smartphone',
    phone: 'smartphone',
    laptop: 'laptop',
    computer: 'laptop',
    tablet: 'tablet',
    ipad: 'tablet',
    game: 'gaming',
    console: 'gaming',
    playstation: 'gaming',
    vr: 'gaming',
    tv: 'monitor',
    monitor: 'monitor',
    screen: 'monitor',
};

function categoryIconName(category: any, index: number): string {
    const name = `${category.name || ''} ${category.name_en || ''}`.toLowerCase();
    for (const key of Object.keys(CATEGORY_KEYWORDS)) {
        if (name.includes(key)) return CATEGORY_KEYWORDS[key];
    }
    return ['headphones', 'smartphone', 'laptop', 'watch', 'tablet', 'gaming', 'monitor'][index % 7];
}

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
    headphones: Headphones,
    smartphone: Smartphone,
    laptop: Laptop,
    watch: Watch,
    tablet: Tablet,
    gaming: Gamepad2,
    monitor: MonitorSmartphone,
};

const CATEGORY_COLORS: Record<string, string> = {
    headphones: '#0088ff',
    smartphone: '#022554',
    laptop: '#7c3aed',
    watch: '#0088ff',
    tablet: '#0ea5e9',
    gaming: '#fc005e',
    monitor: '#0088ff',
};

/* ------------------------------ Hero slider ------------------------------ */

function HeroSlider({ slides }: { slides: any[] }) {
    const [active, setActive] = useState(0);
    const items = slides.filter((s) => s?.image);

    useEffect(() => {
        if (items.length === 0) return;
        const timer = setInterval(() => setActive((a) => (a + 1) % items.length), 4000);
        return () => clearInterval(timer);
    }, [items.length]);

    if (items.length === 0) return null;

    return (
        <div className="relative flex h-full w-full items-center justify-center">
            <div className="relative h-72 w-72 sm:h-80 sm:w-80 md:h-96 md:w-96">
                {items.map((slide, i) => (
                    <img
                        key={slide.id || i}
                        src={getImageUrl(slide.image)}
                        alt={slide.name}
                        style={{
                            opacity: i === active ? 1 : 0,
                            transform: i === active ? 'scale(1)' : 'scale(0.94)',
                        }}
                        className="absolute inset-0 h-full w-full rounded-[60px] border-4 border-white/10 object-contain transition-all duration-700"
                    />
                ))}
                {items.length > 1 && (
                    <div className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
                        {items.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                aria-label={`شريحة ${i + 1}`}
                                onClick={() => setActive(i)}
                                className="h-2.5 rounded-full transition-all"
                                style={{
                                    width: i === active ? 26 : 9,
                                    background: i === active ? PRIMARY : 'rgba(255,255,255,0.4)',
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ------------------------------ Product card (reference style) ------------------------------ */

function GadgetProductCard({ product, config, index }: { product: any; config: any; index?: number }) {
    const { cart, product: productCtx, wishlist } = useStorefrontCore();
    const price = Number(product.price) || 0;
    const originalPrice = product.originalPrice ? Number(product.originalPrice) : 0;
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
    const outOfStock = product.availability === 'out_of_stock';
    const rating = Number(product.rating) > 0 ? Number(product.rating) : 4.5;
    const categoryName =
        product.categoryName || product.category?.name || product.categoryId
            ? (product.categoryName ?? product.category?.name ?? '')
            : '';

    const phone = config?.whatsapp_widget_phone || config?.phoneNumber || config?.socialMedia?.whatsapp || '';
    const waLink = createWhatsAppUrl(phone, `مرحباً، أريد طلب: ${product.name}`);

    const open = () => productCtx.handleProductClick(product);

    return (
        <article
            className="group relative cursor-pointer overflow-hidden rounded-[22px] border border-black/10 bg-white transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_14px_36px_rgba(2,37,84,0.14)]"
            onClick={open}
        >
            <div className="relative aspect-square overflow-hidden bg-[#f6f7f9]">
                {discount > 0 && (
                    <span
                        className="absolute start-4 top-3 z-10 rounded-full px-3 py-1 text-[11px] font-bold text-white"
                        style={{ background: PRIMARY }}
                    >
                        خصم {discount}%
                    </span>
                )}
                {product.image ? (
                    <img
                        src={getImageUrl(product.image)}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-5xl opacity-40">
                        {product.name?.charAt(0) || '؟'}
                    </div>
                )}
                {outOfStock && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-bold text-white">
                        غير متوفر
                    </span>
                )}
                {/* Hover icons */}
                <div
                    className="absolute end-4 top-4 flex translate-x-6 flex-col gap-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                    style={{ ['--twc-primary' as any]: PRIMARY }}
                >
                    <button
                        type="button"
                        aria-label="المفضلة"
                        onClick={(e) => {
                            e.stopPropagation();
                            wishlist?.toggle?.(product);
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-md transition hover:text-white hover:bg-[#fc005e]"
                    >
                        <Heart className="h-4 w-4" />
                    </button>
                    {waLink && (
                        <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="اطلب واتساب"
                            onClick={(e) => e.stopPropagation()}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#25D366] shadow-md transition hover:text-white hover:bg-[#25D366]"
                        >
                            <MessageCircle className="h-4 w-4" />
                        </a>
                    )}
                </div>
                {/* Add to cart hover action */}
                <button
                    type="button"
                    disabled={outOfStock}
                    onClick={(e) => {
                        e.stopPropagation();
                        cart.addToCart(product);
                    }}
                    className="absolute bottom-4 left-1/2 flex h-11 w-[calc(100%-2.5rem)] -translate-x-1/2 translate-y-3 items-center justify-center gap-2 rounded-full font-bold text-white opacity-0 shadow-xl transition-all duration-300 hover:opacity-95 group-hover:translate-y-0 group-hover:opacity-100 disabled:opacity-40"
                    style={{ background: PRIMARY }}
                >
                    <ShoppingCart className="h-4 w-4" />
                    أضف إلى السلة
                </button>
            </div>

            <div className="relative p-4 text-center">
                {categoryName && (
                    <span
                        className="mb-1.5 inline-block rounded-full bg-[#eef6ff] px-2.5 py-0.5 text-[11px] font-bold"
                        style={{ color: PRIMARY }}
                    >
                        {categoryName}
                    </span>
                )}
                <h3 className="line-clamp-1 text-[15px] font-bold text-[#022554]">{product.name}</h3>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                    <span className="flex" style={{ color: STAR }}>
                        {'★'.repeat(Math.round(rating))}
                    </span>
                    <span className="fill-current opacity-40">{'★'.repeat(5 - Math.round(rating))}</span>
                    <span dir="ltr">{rating.toFixed(2)}</span>
                </div>
                <div className="mt-2.5 flex items-baseline justify-center gap-1.5">
                    <span className="text-lg font-extrabold text-[#022554]">{formatStoreCurrency(price)}</span>
                    {originalPrice > price && (
                        <span className="text-sm text-gray-400 line-through">{formatStoreCurrency(originalPrice)}</span>
                    )}
                </div>
            </div>
            {index === 0 && (
                <span
                    className="absolute -top-1 -end-1 z-10 flex h-8 w-8 rotate-12 items-center justify-center rounded-full text-sm shadow-lg"
                    style={{ background: PRIMARY }}
                >
                    🔥
                </span>
            )}
        </article>
    );
}

/* ------------------------------ Page ------------------------------ */

const ArabicGadgetsPage: React.FC<TemplatePageProps> = ({ storeData }) => {
    const { product, config: ctxConfig, auth } = useStorefrontCore();
    const cfg = ctxConfig || storeData?.config || {};
    const identity = storeIdentity(cfg, storeData);

    const categories = product?.categories?.length ? product.categories : storeData?.categories || [];
    const allProducts = useMemo(() => {
        return product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
    }, [product?.filteredProducts, storeData?.products]);

    const [query, setQuery] = useState('');
    const [cat, setCat] = useState('all');
    const [scrolled, setScrolled] = useState(false);
    const countdown = useCountdown();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const runSearch = (q: string) => {
        setQuery(q);
        product.handleSearch(q);
    };

    const visibleProducts = useMemo(() => {
        if (cat === 'all') return allProducts;
        return allProducts.filter((p: any) => String(p.categoryId) === String(cat));
    }, [allProducts, cat]);

    const featuredProducts = visibleProducts.slice(0, 12);
    const heroSlides = allProducts.filter((p: any) => p.image).slice(0, 4);
    const dealProduct = allProducts.find((p: any) => p.image) || allProducts[0];
    const newsItems = allProducts.filter((p: any) => p.image).slice(0, 3);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const scrollToProducts = (categoryId?: string) => {
        if (categoryId) setCat(categoryId);
        scrollTo('arabic-gadgets-products');
    };

    const navItems = [
        { label: 'الرئيسية', target: 'arabic-gadgets-hero' },
        { label: 'المتجر', target: 'arabic-gadgets-products' },
        { label: 'الفئات', target: 'arabic-gadgets-categories' },
        { label: 'عروض سريعة', target: 'arabic-gadgets-banners' },
        { label: 'العروض', target: 'arabic-gadgets-deal' },
        { label: 'المدونة', target: 'arabic-gadgets-news' },
    ];

    const newsCards = [
        { title: 'أحدث الأجهزة الذكية لعام ٢٠٢٦', date: '١٥ أغسطس ٢٠٢٦' },
        { title: 'نصائح لاختيار سماعاتك المثالية', date: '١٠ أغسطس ٢٠٢٦' },
        { title: 'دليلك لشراء ساعة ذكية متطورة', date: '٥ أغسطس ٢٠٢٦' },
    ];

    return (
        <div className="min-h-screen bg-white font-sans text-[#022554]">
            {/* Announcement bar */}
            <div className="bg-[#022554] py-2 text-center text-xs font-bold text-white/85 md:text-sm">
                ⚡ عروض حصرية — شحن مجاني للطلبات فوق 200₪ وخصم حتى 30% على التخفيضات الموسمية ⚡
            </div>

            {/* Header (white sticky, reference style) */}
            <header
                className={`sticky top-0 z-50 bg-white transition-all duration-300 ${
                    scrolled ? 'shadow-[0_7px_19px_rgba(2,37,84,0.07)]' : 'shadow-[0_1px_0_rgba(2,37,84,0.06)]'
                }`}
            >
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
                    <a href="/" className="flex min-w-0 items-center gap-2" onClick={(e) => e.preventDefault()}>
                        {identity.logo ? (
                            <img src={getImageUrl(identity.logo)} alt={identity.name} className="h-10 rounded-lg object-contain" />
                        ) : (
                            <span
                                className="flex h-10 w-10 items-center justify-center rounded-[14px] text-lg font-black text-white"
                                style={{ background: PRIMARY }}
                            >
                                {identity.name.charAt(0)}
                            </span>
                        )}
                        <span className="truncate text-lg font-extrabold text-[#022554]">{identity.name}</span>
                    </a>

                    <div className="hidden xl:block">
                        <div className="relative">
                            <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                value={query}
                                onChange={(e) => runSearch(e.target.value)}
                                placeholder="ابحث عن منتج..."
                                className="h-11 w-80 rounded-full border border-gray-200 bg-[#f6f7f9] ps-11 pe-4 text-sm text-[#022554] outline-none transition focus:border-transparent focus:bg-white focus:shadow-[0_5px_20px_rgba(2,37,84,0.08)] focus:ring-2 focus:ring-[#0088ff]"
                                style={{ ['--twc-primary' as any]: PRIMARY }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <WhatsAppButton className="!border-transparent !bg-[#25D366]" label="" />
                        <AccountButton className="!border-[#e5e7eb]" />
                        <CartButton className="!border-[#e5e7eb]" />
                    </div>
                </div>

                {/* Nav row */}
                <nav className="hidden border-t border-black/5 lg:block">
                    <div className="mx-auto flex h-12 max-w-7xl items-center justify-between gap-2 px-4">
                        {navItems.map((item) => (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() => scrollTo(item.target)}
                                className="relative px-4 py-1 text-[15px] font-bold text-[#022554]/75 transition hover:text-[#0088ff]"
                            >
                                {item.label}
                                <span className="pointer-events-none absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-[#0088ff] opacity-0 transition group-hover:opacity-100" />
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => auth.setShowLoginModal(true)}
                            className="rounded-full border bg-[#f6f7f9] px-4 py-1.5 text-[13px] font-bold transition hover:bg-[#0088ff] hover:text-white"
                        >
                            الأسئلة الشائعة
                        </button>
                    </div>
                </nav>
            </header>

            {/* Mobile search */}
            <div className="border-b border-black/5 bg-white px-4 py-2.5 lg:hidden">
                <div className="relative">
                    <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        value={query}
                        onChange={(e) => runSearch(e.target.value)}
                        placeholder="ابحث عن منتج..."
                        className="h-11 w-full rounded-full border border-gray-200 bg-[#f6f7f9] ps-11 pe-4 text-sm outline-none focus:ring-2 focus:ring-[#0088ff]"
                    />
                </div>
            </div>

            {/* Hero */}
            <section id="arabic-gadgets-hero" className="scroll-mt-24 px-3 pt-3 md:px-6 md:pt-6">
                <div
                    className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] md:rounded-[50px] px-5 py-12 text-white md:px-14 md:py-20"
                    style={{
                        background:
                            'radial-gradient(1200px 500px at 85% -10%, rgba(0,136,255,0.55), transparent 60%), radial-gradient(900px 420px at 5% 110%, rgba(0,136,255,0.28), transparent 55%), #022554',
                    }}
                >
                    <div className="pointer-events-none absolute -end-24 -top-24 h-80 w-80 rounded-full bg-[#0088ff]/30 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 -start-16 h-64 w-64 rounded-full bg-white/5 blur-3xl" />

                    <div className="relative grid items-center gap-12 md:grid-cols-2">
                        <div className="text-center md:text-start">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-black tracking-widest uppercase text-[#8fd0ff]">
                                <Sparkles className="h-3.5 w-3.5" />
                                {identity.name}
                            </span>
                            <h1 className="mt-5 text-4xl leading-[1.1] font-black tracking-tight md:text-6xl">
                                احصل على أفضل جهاز <span className="text-[#3aa7ff]">بأقل سعر</span>
                            </h1>
                            <p className="mx-auto mt-4 max-w-md text-sm text-white/70 md:mx-0 md:text-base">
                                {identity.description ||
                                    'اكتشف أحدث الأجهزة الذكية والإلكترونيات بأسعار تنافسية وجودة مضمونة وخدمة عملاء مميزة على مدار الساعة.'}
                            </p>
                            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start">
                                <button
                                    type="button"
                                    onClick={() => scrollToProducts()}
                                    className="inline-flex items-center gap-3 rounded-full px-7 py-4 text-sm font-bold text-white shadow-[0_12px_30px_rgba(0,136,255,0.45)] transition hover:text-[#022554] hover:bg-white"
                                    style={{ background: PRIMARY }}
                                >
                                    تسوق الآن
                                </button>
                                <button
                                    type="button"
                                    onClick={() => scrollTo('arabic-gadgets-deal')}
                                    className="inline-flex items-center gap-3 rounded-full border border-white/25 px-6 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                                >
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0088ff]">
                                        <Play className="h-3.5 w-3.5 fill-current" />
                                    </span>
                                    شاهد العرض
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-center">
                            <HeroSlider slides={heroSlides} />
                        </div>
                    </div>
                </div>
            </section>

            {/* Category pills (circular, reference style) */}
            {categories.length > 0 && (
                <section id="arabic-gadgets-categories" className="scroll-mt-24 py-12 md:py-16">
                    <div className="mx-auto max-w-7xl px-4">
                        <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 md:gap-x-6 lg:grid-cols-5">
                            {categories.slice(0, 5).map((c: any, i: number) => {
                                const iconName = categoryIconName(c, i);
                                const Icon = CATEGORY_ICONS[iconName] || MonitorSmartphone;
                                const color = CATEGORY_COLORS[iconName] || PRIMARY;
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => scrollToProducts(c.id)}
                                        className="group flex flex-col items-center"
                                    >
                                        <div
                                            className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-white to-[#eaf4ff] shadow-[0_10px_30px_rgba(2,37,84,0.08)] ring-1 ring-black/5 transition duration-300 group-hover:-translate-y-2"
                                        >
                                            {c.image ? (
                                                <img
                                                    src={getImageUrl(c.image)}
                                                    alt={c.name}
                                                    className="h-full w-full rounded-full object-cover"
                                                />
                                            ) : (
                                                <Icon className="h-12 w-12" style={{ color }} />
                                            )}
                                        </div>
                                        <span
                                            className="-mt-4 inline-flex items-center rounded-full bg-white px-5 py-1.5 text-[13px] font-bold text-[#022554] shadow-md ring-1 ring-black/5 transition group-hover:text-white group-hover:shadow-[0_10px_25px_rgba(0,136,255,0.35)]"
                                            style={{ background: 'white' }}
                                        >
                                            {c.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* Featured banners */}
            <section id="arabic-gadgets-banners" className="scroll-mt-24 pb-4 md:pb-8">
                <div className="mx-auto grid max-w-7xl gap-5 px-4 md:grid-cols-2 md:gap-8">
                    <div
                        className="relative overflow-hidden rounded-[30px] p-8 text-white md:p-12"
                        style={{
                            background:
                                'radial-gradient(700px 320px at 100% 0%, rgba(0,136,255,0.5), transparent 60%), linear-gradient(135deg, #023163 0%, #022554 100%)',
                        }}
                    >
                        <p className="text-xs font-black tracking-[0.2em] text-[#6cb7ff]">أجهزة لوحية</p>
                        <h2 className="mt-2 text-3xl font-bold md:text-[42px] md:leading-[1.1]">أجهزة لوحية فائقة الدقة</h2>
                        <p className="mt-3 max-w-xs text-sm text-white/70">
                            أفضل الأجهزة اللوحية للعمل والترفيه بشاشات عالية الجودة وأداء سريع.
                        </p>
                        <button
                            type="button"
                            onClick={() => scrollToProducts()}
                            className="mt-6 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-bold transition hover:text-white hover:bg-[#022554]"
                            style={{ color: PRIMARY }}
                        >
                            اشتري الآن
                        </button>
                    </div>
                    <div
                        className="relative overflow-hidden rounded-[30px] p-8 text-white md:p-12"
                        style={{
                            background:
                                'radial-gradient(700px 320px at 0% 100%, rgba(0,136,255,0.4), transparent 60%), linear-gradient(135deg, #022554 0%, #032e6e 100%)',
                        }}
                    >
                        <p className="text-xs font-black tracking-[0.2em] text-[#6cb7ff]">ساعات ذكية</p>
                        <h2 className="mt-2 text-3xl font-bold md:text-[42px] md:leading-[1.1]">ساعات ذكية متطورة</h2>
                        <p className="mt-3 max-w-xs text-sm text-white/70">
                            تتبع لياقتك وصحتك مع أحدث الساعات الذكية المصممة لحياتك اليومية.
                        </p>
                        <button
                            type="button"
                            onClick={() => scrollToProducts()}
                            className="mt-6 inline-flex items-center gap-3 rounded-full px-6 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,136,255,0.4)] transition hover:text-[#022554] hover:bg-white"
                            style={{ background: PRIMARY }}
                        >
                            اشتري الآن
                        </button>
                    </div>
                </div>
            </section>

            {/* Featured products */}
            <section id="arabic-gadgets-products" className="scroll-mt-24 py-12 md:py-20">
                <div className="mx-auto max-w-7xl px-4">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <span
                            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[0_10px_25px_rgba(0,136,255,0.35)]"
                            style={{ background: PRIMARY }}
                        >
                            <Zap className="h-6 w-6" />
                        </span>
                        <p className="text-xs font-black tracking-widest text-[#0088ff] uppercase">منتجاتنا</p>
                        <h2 className="text-3xl font-bold text-[#022554] md:text-4xl">المنتجات المميزة</h2>
                        {categories.length > 1 && (
                            <div className="mt-3 flex flex-wrap justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCat('all')}
                                    className={`rounded-full px-4 py-1.5 text-[13px] font-bold transition ${
                                        cat === 'all'
                                            ? 'bg-[#022554] text-white'
                                            : 'border border-black/10 text-[#022554]/70 hover:bg-[#f6f7f9]'
                                    }`}
                                >
                                    الكل
                                </button>
                                {categories.slice(0, 5).map((c: any) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                                        className={`rounded-full px-4 py-1.5 text-[13px] font-bold transition ${
                                            cat === c.id
                                                ? 'bg-[#022554] text-white'
                                                : 'border border-black/10 text-[#022554]/70 hover:bg-[#f6f7f9]'
                                        }`}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {featuredProducts.length === 0 ? (
                        <div className="mt-10 rounded-[35px] border-2 border-dashed border-black/10 p-14 text-center">
                            <p className="text-lg font-bold text-[#022554]">لا توجد منتجات في هذا القسم</p>
                            <p className="mt-1 text-sm text-gray-500">أضف منتجاتك من لوحة التحكم لتظهر هنا.</p>
                        </div>
                    ) : (
                        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
                            {featuredProducts.map((p: any, i: number) => (
                                <GadgetProductCard key={p.id} product={p} config={cfg} index={i} />
                            ))}
                        </div>
                    )}

                    <div className="mt-12 flex justify-center">
                        <button
                            type="button"
                            onClick={() => scrollToProducts()}
                            className="inline-flex items-center gap-3 rounded-full px-8 py-4 text-sm font-bold text-white shadow-[0_12px_30px_rgba(0,136,255,0.4)] transition hover:bg-[#022554] hover:shadow-[0_12px_30px_rgba(2,37,84,0.4)]"
                            style={{ background: PRIMARY }}
                        >
                            عرض جميع المنتجات
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-xs">→</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* Deal of the day */}
            <section id="arabic-gadgets-deal" className="scroll-mt-24 px-3 pb-4 md:px-6 md:pb-8">
                <div
                    className="relative mx-auto max-w-7xl overflow-hidden rounded-[40px] md:rounded-[50px] px-5 py-12 text-white md:px-14 md:py-16"
                    style={{
                        background:
                            'radial-gradient(900px 400px at 10% -10%, rgba(0,136,255,0.45), transparent 60%), radial-gradient(700px 380px at 95% 120%, rgba(0,136,255,0.3), transparent 55%), #022554',
                    }}
                >
                    <div className="grid items-center gap-10 md:grid-cols-2">
                        <div className="text-center md:text-start">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#022554] px-4 py-1.5 text-xs font-black tracking-widest text-white uppercase">
                                <Zap className="h-3.5 w-3.5 text-[#3aa7ff]" />
                                عرض اليوم
                            </span>
                            <h2 className="mt-5 text-4xl leading-[1.05] font-black tracking-tight md:text-[54px]">
                                احصل على أجهزة واقع افتراضي <span className="text-[#3aa7ff]">بخصم 30%</span>
                            </h2>
                            <p className="mx-auto mt-4 max-w-md text-sm text-white/70 md:mx-0 md:text-base">
                                عروض حصرية لفترة محدودة — لا تفوّت فرصة اقتناء أحدث أجهزة الترفيه الرقمي بخصومات كبيرة.
                            </p>
                            <button
                                type="button"
                                onClick={() => scrollToProducts()}
                                className="mt-7 inline-flex items-center gap-3 rounded-full px-7 py-4 text-sm font-bold text-white shadow-[0_12px_30px_rgba(0,136,255,0.45)] transition hover:text-[#022554] hover:bg-white"
                                style={{ background: PRIMARY }}
                            >
                                احصل على خصم 30% الآن
                            </button>
                        </div>

                        <div className="flex flex-col items-center gap-8">
                            <div className="flex items-center justify-center gap-3 md:gap-5">
                                {[
                                    { value: countdown.hours, label: 'ساعة' },
                                    { value: countdown.minutes, label: 'دقيقة' },
                                    { value: countdown.seconds, label: 'ثانية' },
                                ].map((unit, i) => (
                                    <div key={unit.label} className="flex items-center gap-3 md:gap-5">
                                        <div className="flex flex-col items-center">
                                            <span
                                                dir="ltr"
                                                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-black text-white backdrop-blur md:h-20 md:w-20 md:text-3xl"
                                            >
                                                {unit.value}
                                            </span>
                                            <span className="mt-2 text-xs font-black text-white/50">{unit.label}</span>
                                        </div>
                                        {i < 2 && <span className="text-3xl font-black text-white/25">:</span>}
                                    </div>
                                ))}
                            </div>
                            {dealProduct?.image ? (
                                <img
                                    src={getImageUrl(dealProduct.image)}
                                    alt={dealProduct.name}
                                    className="h-56 w-56 rounded-[45px] border-4 border-white/10 object-contain drop-shadow-[0_25px_40px_rgba(0,0,0,0.35)] md:h-72 md:w-72"
                                />
                            ) : (
                                <div className="flex h-56 w-56 items-center justify-center rounded-[45px] border-4 border-white/10 bg-white/5 md:h-72 md:w-72">
                                    <Headphones className="h-32 w-32 text-[#3aa7ff]" />
                                </div>
                            )}
                            <span className="rounded-full bg-black/25 px-5 py-2 text-sm font-bold text-white/80">
                                العرض ينتهي بنهاية اليوم — سارع بالطلب!
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Latest news */}
            <section id="arabic-gadgets-news" className="scroll-mt-24 py-12 pb-20 md:py-20">
                <div className="mx-auto max-w-7xl px-4">
                    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                        <div className="text-center md:text-start">
                            <h2 className="text-3xl font-semibold text-[#022554] md:text-[40px]">
                                آخر <span className="text-[#0088ff]">الأخبار</span>
                            </h2>
                            <p className="mt-1 text-sm text-[#022554]/60" dir="rtl">
                                تعرّف على أحدث أخبار التقنيات والأجهزة الذكية
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => scrollToProducts()}
                            className="rounded-full border border-[#0088ff]/25 px-6 py-3 text-sm font-bold text-[#022554] transition hover:border-transparent hover:text-white hover:bg-[#022554]"
                        >
                            كل الأخبار
                        </button>
                    </div>

                    <div className="mt-10 grid gap-8 md:grid-cols-3">
                        {newsCards.map((item, i) => {
                            const img = newsItems[i]?.image;
                            return (
                                <button
                                    key={item.title}
                                    type="button"
                                    onClick={() => scrollToProducts()}
                                    className="group overflow-hidden rounded-[25px] border border-black/5 bg-white text-start shadow-[0_6px_24px_rgba(2,37,84,0.06)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_40px_rgba(2,37,84,0.12)]"
                                >
                                    <div className="relative aspect-[16/10] overflow-hidden bg-[#f1f5fb]">
                                        {img ? (
                                            <img
                                                src={getImageUrl(img)}
                                                alt={item.title}
                                                loading="lazy"
                                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-[#f1f5fb]">
                                                <Truck className="h-16 w-16 text-[#0088ff]/40" />
                                            </div>
                                        )}
                                        <span
                                            className="absolute bottom-3 start-4 rounded-full px-3 py-1 text-[11px] font-bold text-white"
                                            style={{ background: PRIMARY }}
                                        >
                                            {item.date}
                                        </span>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-xl font-semibold text-[#022554] transition group-hover:text-[#0088ff]">
                                            {item.title}
                                        </h3>
                                        <span className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#0088ff]">
                                            اقرأ المزيد
                                            <span className="transition group-hover:translate-x-1">←</span>
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="px-3 md:px-6">
                <div className="mx-auto max-w-7xl rounded-t-[40px] bg-[#eff5fc]">
                    {/* Newsletter */}
                    <div
                        className="mx-4 -mt-0 overflow-hidden rounded-[35px] px-6 py-10 text-center text-white md:px-14 md:py-14 mt-20"
                        style={{
                            background:
                                'radial-gradient(800px 320px at 90% -20%, rgba(0,136,255,0.45), transparent 60%), #022554',
                        }}
                    >
                        <h2 className="text-3xl font-bold md:text-[42px]">
                            نشرتنا <span className="text-[#3aa7ff]">البريدية</span>
                        </h2>
                        <p className="mx-auto mt-2 max-w-md text-sm text-white/70">
                            اشترك ليصلك كل جديد في عالم الأجهزة الذكية وبالعروض الحصرية أولاً بأول
                        </p>
                        <form
                            className="mx-auto mt-6 flex max-w-lg flex-col gap-3 sm:flex-row"
                            onSubmit={(e) => {
                                e.preventDefault();
                                const input = (e.target as HTMLFormElement).querySelector('input');
                                if (input?.value) {
                                    (e.target as HTMLFormElement).reset();
                                }
                            }}
                        >
                            <input
                                type="email"
                                required
                                placeholder="أدخل بريدك الإلكتروني ..."
                                className="h-14 flex-1 rounded-full border border-white/15 bg-white/5 px-5 text-sm text-white outline-none placeholder:text-white/40 focus:ring-2 focus:ring-[#3aa7ff]"
                            />
                            <button
                                type="submit"
                                className="h-14 shrink-0 rounded-full px-8 text-sm font-bold text-white shadow-lg transition hover:text-[#022554] hover:bg-white"
                                style={{ background: `linear-gradient(135deg, ${PRIMARY}, #006fd1)` }}
                            >
                                اشترك
                            </button>
                        </form>
                    </div>

                    {/* Columns */}
                    <div className="grid gap-10 px-6 py-14 md:grid-cols-3 md:px-14 lg:grid-cols-5">
                        <div className="lg:col-span-2">
                            <h3 className="flex items-center gap-3 text-xl font-black text-[#022554]">
                                {identity.logo ? (
                                    <img src={getImageUrl(identity.logo)} alt="" className="h-10 rounded-lg object-contain" />
                                ) : (
                                    <span
                                        className="flex h-10 w-10 items-center justify-center rounded-[14px] text-lg font-black text-white"
                                        style={{ background: PRIMARY }}
                                    >
                                        {identity.name.charAt(0)}
                                    </span>
                                )}
                                {identity.name}
                            </h3>
                            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#022554]/65">
                                {identity.description || 'وجهتك الأولى لشراء أحدث الأجهزة الذكية والإلكترونيات.'}
                            </p>
                            <p className="mt-4 flex items-center gap-2 text-sm font-bold text-[#022554]/80">
                                <span className="text-[#0088ff]">☎</span>
                                <span dir="ltr">{identity.phone}</span>
                            </p>
                            <div className="mt-5 flex items-center gap-2">
                                {[
                                    { icon: Facebook, label: 'فيسبوك' },
                                    { icon: Instagram, label: 'انستغرام' },
                                    { icon: Linkedin, label: 'لينكدإن' },
                                ].map((s) => (
                                    <a
                                        key={s.label}
                                        href="#"
                                        aria-label={s.label}
                                        onClick={(e) => e.preventDefault()}
                                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#022554] shadow-sm ring-1 ring-black/5 transition hover:bg-[#0088ff] hover:text-white"
                                    >
                                        <s.icon className="h-4 w-4" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-base font-black text-[#022554]">روابط مفيدة</h4>
                            <ul className="mt-4 space-y-2.5 text-sm font-medium text-[#022554]/65">
                                <li className="cursor-pointer transition hover:ps-1 hover:text-[#0088ff]">متجرنا</li>
                                <li className="cursor-pointer transition hover:ps-1 hover:text-[#0088ff]">خدماتنا</li>
                                <li className="cursor-pointer transition hover:ps-1 hover:text-[#0088ff]">الأخبار</li>
                                <li className="cursor-pointer transition hover:ps-1 hover:text-[#0088ff]">تواصل معنا</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-base font-black text-[#022554]">الدعم</h4>
                            <ul className="mt-4 space-y-2.5 text-sm font-medium text-[#022554]/65">
                                <li className="cursor-pointer transition hover:ps-1 hover:text-[#0088ff]">الأسئلة الشائعة</li>
                                <li className="cursor-pointer transition hover:ps-1 hover:text-[#0088ff]">سياسة الاسترجاع</li>
                                <li className="cursor-pointer transition hover:ps-1 hover:text-[#0088ff]">سياسة الخصوصية</li>
                                <li className="cursor-pointer transition hover:ps-1 hover:text-[#0088ff]">الإبلاغ</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-base font-black text-[#022554]">الخدمات</h4>
                            <ul className="mt-4 space-y-2.5 text-sm font-medium text-[#022554]/65">
                                <li className="cursor-pointer transition hover:ps-1 hover:text-[#0088ff]">المنتجات</li>
                                <li className="cursor-pointer transition hover:ps-1 hover:text-[#0088ff]">الدفع</li>
                                <li className="cursor-pointer transition hover:ps-1 hover:text-[#0088ff]">التخفيضات</li>
                                <li className="cursor-pointer transition hover:ps-1 hover:text-[#0088ff]">الهدايا</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-between gap-4 border-t border-black/5 px-6 py-6 text-sm text-[#022554]/55 md:flex-row md:px-14">
                        <p>
                            © {new Date().getFullYear()} {identity.name} — جميع الحقوق محفوظة
                        </p>
                        <p className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-[#0088ff]" /> دفع آمن · شحن سريع · ضمان الجودة
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ArabicGadgetsPage;