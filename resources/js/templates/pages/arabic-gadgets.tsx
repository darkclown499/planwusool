import { AccountButton, CartButton, WhatsAppButton, useStorefrontCore } from '@/templates/storefront';
import { getImageUrl } from '@/utils/image-helper';
import { formatStoreCurrency } from '@/utils/currency-formatter';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import {
    Gamepad2,
    Headphones,
    Laptop,
    MessageCircle,
    MonitorSmartphone,
    Search,
    ShieldCheck,
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

/* ------------------------------ Countdown ------------------------------ */

interface Countdown {
    hours: string;
    minutes: string;
    seconds: string;
}

function useEndOfDayCountdown(): Countdown {
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
    'headphone': 'headphones',
    'audio': 'headphones',
    'earbud': 'headphones',
    'smartphone': 'smartphone',
    'mobile': 'smartphone',
    'phone': 'smartphone',
    'laptop': 'laptop',
    'computer': 'laptop',
    'watch': 'watch',
    'tablet': 'tablet',
    'ipad': 'tablet',
    'game': 'gaming',
    'console': 'gaming',
    'playstation': 'gaming',
    'vr': 'gaming',
    'tv': 'monitor',
    'monitor': 'monitor',
    'screen': 'monitor',
};

function categoryIconName(category: any, index: number): string {
    const name = `${category.name || ''} ${category.name_en || ''}`.toLowerCase();
    for (const key of Object.keys(CATEGORY_KEYWORDS)) {
        if (name.includes(key)) return CATEGORY_KEYWORDS[key];
    }
    return ['headphones', 'smartphone', 'laptop', 'watch', 'tablet', 'gaming', 'monitor'][index % 7];
}

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
    headphones: Headphones,
    smartphone: Smartphone,
    laptop: Laptop,
    watch: Watch,
    tablet: Tablet,
    gaming: Gamepad2,
    monitor: MonitorSmartphone,
};

const CATEGORY_COLORS: Record<string, string> = {
    headphones: '#7c3aed',
    smartphone: '#2563eb',
    laptop: '#0891b2',
    watch: '#ea580c',
    tablet: '#16a34a',
    gaming: '#dc2626',
    monitor: '#9333ea',
};

/* ------------------------------ Card ------------------------------ */

function GadgetProductCard({ product, config }: { product: any; config: any }) {
    const { cart, product: productCtx } = useStorefrontCore();
    const price = Number(product.price) || 0;
    const originalPrice = product.originalPrice ? Number(product.originalPrice) : 0;
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
    const outOfStock = product.availability === 'out_of_stock';
    const rating = Number(product.rating) > 0 ? Number(product.rating) : 0;

    const phone = config?.whatsapp_widget_phone || config?.phoneNumber || config?.socialMedia?.whatsapp || '';
    const waLink = createWhatsAppUrl(phone, `مرحباً، أريد طلب: ${product.name}`);

    const open = () => productCtx.handleProductClick(product);

    return (
        <article
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            onClick={open}
        >
            <div className="relative aspect-square overflow-hidden bg-gray-50">
                {discount > 0 && (
                    <span className="absolute start-2 top-2 z-10 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-extrabold text-white">
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
            </div>

            <div className="p-3">
                <h3 className="line-clamp-1 text-sm font-bold text-gray-900">{product.name}</h3>
                {rating > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <span className="text-amber-400">{'★'.repeat(Math.round(rating))}</span>
                        <span dir="ltr">{rating.toFixed(1)}</span>
                    </div>
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-extrabold text-orange-600">
                                {formatStoreCurrency(price)}
                            </span>
                            {originalPrice > price && (
                                <span className="text-xs text-gray-400 line-through">
                                    {formatStoreCurrency(originalPrice)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                        {waLink && (
                            <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="اطلب واتساب"
                                onClick={(e) => e.stopPropagation()}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white transition hover:opacity-90"
                            >
                                <MessageCircle className="h-4 w-4" />
                            </a>
                        )}
                        <button
                            type="button"
                            disabled={outOfStock}
                            aria-label="أضف للسلة"
                            onClick={(e) => {
                                e.stopPropagation();
                                cart.addToCart(product);
                            }}
                            className="flex h-9 items-center gap-1 rounded-full bg-gray-900 px-3 text-xs font-bold text-white transition hover:bg-orange-600 disabled:opacity-40"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            أضف
                        </button>
                    </div>
                </div>
            </div>
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
        const list = product?.filteredProducts?.length ? product.filteredProducts : storeData?.products || [];
        return list;
    }, [product?.filteredProducts, storeData?.products]);

    const [query, setQuery] = useState('');
    const [cat, setCat] = useState('all');
    const [scrolled, setScrolled] = useState(false);
    const countdown = useEndOfDayCountdown();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
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

    const featuredProducts = visibleProducts.slice(0, 16);
    const heroProduct = allProducts.find((p: any) => p.image) || allProducts[0];

    const scrollToProducts = (categoryId?: string) => {
        if (categoryId) setCat(categoryId);
        document.getElementById('arabic-gadgets-products')?.scrollIntoView({ behavior: 'smooth' });
    };

    const discountPct = 30;

    return (
        <div className="min-h-screen bg-white font-sans">
            {/* Announcement bar */}
            <div className="bg-orange-600 py-2 text-center text-xs font-bold text-white md:text-sm">
                ⚡ عروض حصرية — شحن مجاني للطلبات فوق 200₪ وخصم حتى 30% على التخفيضات الموسمية ⚡
            </div>

            {/* Header */}
            <header
                className={`sticky top-0 z-40 border-b border-white/10 bg-slate-950 transition-shadow ${scrolled ? 'shadow-lg' : ''}`}
            >
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
                    <a href="/" className="flex min-w-0 items-center gap-2">
                        {identity.logo ? (
                            <img src={getImageUrl(identity.logo)} alt={identity.name} className="h-9 w-9 rounded-lg object-cover" />
                        ) : (
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500 text-lg font-black text-white">
                                {identity.name.charAt(0)}
                            </span>
                        )}
                        <span className="truncate text-base font-extrabold text-white md:text-lg">{identity.name}</span>
                    </a>

                    <nav className="hidden items-center gap-1 lg:flex">
                        {categories.slice(0, 6).map((c: any) => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                                    cat === c.id ? 'bg-orange-500 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                {c.name}
                            </button>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2">
                        <div className="relative hidden xl:block">
                            <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={query}
                                onChange={(e) => runSearch(e.target.value)}
                                placeholder="ابحث عن منتج..."
                                className="h-9 w-48 rounded-full border border-white/15 bg-white/10 ps-4 pe-9 text-sm text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                        <WhatsAppButton className="!border-transparent !bg-[#25D366]" label="" />
                        <AccountButton />
                        <CartButton />
                    </div>
                </div>
            </header>

            {/* Mobile search */}
            <div className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
                <div className="relative">
                    <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        value={query}
                        onChange={(e) => runSearch(e.target.value)}
                        placeholder="ابحث عن منتج..."
                        className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 ps-11 pe-4 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
            </div>

            {/* Hero */}
            <section className="relative overflow-hidden bg-slate-950 text-white">
                <div className="pointer-events-none absolute -end-24 -top-24 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
                <div className="pointer-events-none absolute -start-24 -bottom-24 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 md:grid-cols-2 md:py-20">
                    <div className="order-2 text-center md:order-1 md:text-start">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-orange-400">
                            <Sparkles className="h-3.5 w-3.5" />
                            متجر {identity.name}
                        </span>
                        <h1 className="mt-4 text-3xl leading-tight font-black md:text-5xl">
                            احصل على أفضل جهاز <span className="text-orange-500">بأقل سعر</span>
                        </h1>
                        <p className="mx-auto mt-3 max-w-md text-sm text-slate-300 md:mx-0 md:text-base">
                            {identity.description || 'اكتشف أحدث الأجهزة الذكية والإلكترونيات بأسعار تنافسية وجودة مضمونة وخدمة عملاء مميزة.'}
                        </p>
                        <div className="mt-7 flex flex-wrap justify-center gap-3 md:justify-start">
                            <button
                                type="button"
                                onClick={() => scrollToProducts()}
                                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-7 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-orange-600"
                            >
                                تسوق الآن
                            </button>
                            <a
                                href="#arabic-gadgets-deal"
                                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-7 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                            >
                                شاهد العرض
                            </a>
                        </div>
                    </div>

                    <div className="order-1 flex justify-center md:order-2">
                        <div className="relative">
                            <div className="absolute inset-0 scale-90 rounded-full bg-orange-500/30 blur-2xl" />
                            {heroProduct?.image ? (
                                <img
                                    src={getImageUrl(heroProduct.image)}
                                    alt={heroProduct.name}
                                    className="relative z-10 h-56 w-56 rounded-3xl border border-white/10 object-cover shadow-2xl md:h-80 md:w-80"
                                />
                            ) : (
                                <div className="relative z-10 flex h-56 w-56 items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl md:h-80 md:w-80">
                                    <MonitorSmartphone className="h-32 w-32 text-orange-500 md:h-44 md:w-44" />
                                </div>
                            )}
                            <span className="absolute -top-3 -end-3 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-lg shadow-xl">
                                🔥
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Category cards */}
            {categories.length > 0 && (
                <section className="py-10 md:py-14">
                    <div className="mx-auto max-w-7xl px-4">
                        <div className="mb-6 flex items-end justify-between">
                            <div>
                                <p className="text-xs font-bold tracking-widest text-orange-600 uppercase">الفئات</p>
                                <h2 className="mt-1 text-2xl font-extrabold text-gray-900 md:text-3xl">تسوق حسب الفئة</h2>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-6">
                            {categories.slice(0, 6).map((c: any, i: number) => {
                                const iconName = categoryIconName(c, i);
                                const Icon = CATEGORY_ICONS[iconName] || MonitorSmartphone;
                                const color = CATEGORY_COLORS[iconName] || '#ea580c';
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => scrollToProducts(c.id)}
                                        className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                                    >
                                        <div
                                            className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl transition group-hover:scale-110"
                                            style={{ background: `${color}1a`, color }}
                                        >
                                            <Icon className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-sm font-bold text-gray-900">{c.name}</h3>
                                        <span className="mt-1 inline-block text-[11px] font-semibold text-orange-600">استكشف الآن</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* Promo banners */}
            <section className="bg-slate-950 py-10 md:py-14">
                <div className="mx-auto grid max-w-7xl gap-4 px-4 md:grid-cols-2 md:gap-6">
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white">
                        <div className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-orange-500/20 blur-2xl" />
                        <p className="text-xs font-black tracking-widest text-orange-400 uppercase">أجهزة لوحية</p>
                        <h3 className="mt-2 text-2xl font-black md:text-3xl">أجهزة لوحية فائقة الدقة</h3>
                        <p className="mt-2 max-w-xs text-sm text-slate-300">
                            أفضل الأجهزة اللوحية للعمل والترفيه بشاشات عالية الجودة وأداء سريع.
                        </p>
                        <button
                            type="button"
                            onClick={() => scrollToProducts()}
                            className="mt-5 rounded-full bg-orange-500 px-6 py-2.5 text-sm font-bold transition hover:bg-orange-600"
                        >
                            اشتري الآن
                        </button>
                    </div>
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white">
                        <div className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/20 blur-2xl" />
                        <p className="text-xs font-black tracking-widest text-cyan-400 uppercase">ساعات ذكية</p>
                        <h3 className="mt-2 text-2xl font-black md:text-3xl">ساعات ذكية متطورة</h3>
                        <p className="mt-2 max-w-xs text-sm text-slate-300">
                            تتبع لياقتك وصحتك مع أحدث الساعات الذكية المصممة لحياتك اليومية.
                        </p>
                        <button
                            type="button"
                            onClick={() => scrollToProducts()}
                            className="mt-5 rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400"
                        >
                            اشتري الآن
                        </button>
                    </div>
                </div>
            </section>

            {/* Products */}
            <section id="arabic-gadgets-products" className="scroll-mt-20 py-10 md:py-14">
                <div className="mx-auto max-w-7xl px-4">
                    <div className="mb-6 flex items-end justify-between">
                        <div>
                            <p className="text-xs font-bold tracking-widest text-orange-600 uppercase">منتجاتنا</p>
                            <h2 className="mt-1 text-2xl font-extrabold text-gray-900 md:text-3xl">المنتجات المميزة</h2>
                        </div>
                        {categories.length > 1 && (
                            <div className="hidden gap-2 md:flex">
                                <button
                                    type="button"
                                    onClick={() => setCat('all')}
                                    className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                                        cat === 'all' ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    الكل
                                </button>
                                {categories.slice(0, 5).map((c: any) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setCat(cat === c.id ? 'all' : c.id)}
                                        className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                                            cat === c.id ? 'bg-gray-900 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {featuredProducts.length === 0 ? (
                        <div className="rounded-3xl border-2 border-dashed border-gray-200 p-12 text-center">
                            <p className="text-lg font-bold text-gray-700">لا توجد منتجات في هذا القسم</p>
                            <p className="mt-1 text-sm text-gray-500">أضف منتجاتك من لوحة التحكم لتظهر هنا.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
                            {featuredProducts.map((p: any) => (
                                <GadgetProductCard key={p.id} product={p} config={cfg} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Deal of the day */}
            <section id="arabic-gadgets-deal" className="relative overflow-hidden bg-orange-600 py-10 text-white md:py-14">
                <div className="pointer-events-none absolute -start-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -bottom-24 -end-16 h-72 w-72 rounded-full bg-black/10" />
                <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 md:grid-cols-2">
                    <div className="text-center md:text-start">
                        <p className="inline-flex items-center gap-1.5 rounded-full bg-black/20 px-4 py-1.5 text-xs font-black tracking-widest uppercase">
                            <Zap className="h-3.5 w-3.5" />
                            عرض اليوم
                        </p>
                        <h2 className="mt-4 text-3xl leading-tight font-black md:text-4xl">
                            احصل على أجهزة واقع افتراضي بخصم {discountPct}%
                        </h2>
                        <p className="mx-auto mt-3 max-w-md text-sm text-orange-50 md:mx-0 md:text-base">
                            عروض حصرية لفترة محدودة — لا تفوّت فرصة اقتناء أحدث أجهزة الترفيه الرقمي بخصومات كبيرة.
                        </p>
                        <button
                            type="button"
                            onClick={() => scrollToProducts()}
                            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-black text-orange-600 shadow-xl transition hover:bg-orange-50"
                        >
                            احصل على الخصم الآن
                        </button>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center justify-center gap-4">
                            {[
                                { value: countdown.hours, label: 'ساعة' },
                                { value: countdown.minutes, label: 'دقيقة' },
                                { value: countdown.seconds, label: 'ثانية' },
                            ].map((unit, i) => (
                                <div key={unit.label} className="flex items-center gap-4">
                                    <div className="flex flex-col items-center">
                                        <span
                                            dir="ltr"
                                            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black backdrop-blur md:h-20 md:w-20 md:text-3xl"
                                        >
                                            {unit.value}
                                        </span>
                                        <span className="mt-1.5 text-xs font-bold text-orange-50">{unit.label}</span>
                                    </div>
                                    {i < 2 && <span className="text-2xl font-black text-white/50">:</span>}
                                </div>
                            ))}
                        </div>
                        <span className="rounded-full bg-black/20 px-5 py-2 text-sm font-bold">
                            العرض ينتهي بنهاية اليوم — سارع بالطلب!
                        </span>
                    </div>
                </div>
            </section>

            {/* Trust bar */}
            <section className="py-10 md:py-12">
                <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-3">
                    {[
                        { icon: Truck, title: 'شحن سريع', desc: 'توصيل لجميع المناطق بسرعة وأمان' },
                        { icon: ShieldCheck, title: 'دفع آمن', desc: 'بوابات دفع موثوقة وحماية مشترياتك' },
                        { icon: Sparkles, title: 'جودة مضمونة', desc: 'منتجات أصلية بضمان كامل' },
                    ].map((f) => (
                        <div key={f.title} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                                <f.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-gray-900">{f.title}</h3>
                                <p className="text-sm text-gray-500">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 bg-slate-950 text-white">
                <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
                    {/* Newsletter */}
                    <div className="mb-10 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-center md:p-8">
                        <h3 className="text-xl font-black md:text-2xl">اشترك في نشرتنا البريدية</h3>
                        <p className="mt-2 text-sm text-slate-300">احصل على أحدث العروض والتخفيضات الحصرية أولاً بأول</p>
                        <form
                            className="mx-auto mt-5 flex max-w-md gap-2"
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
                                placeholder="بريدك الإلكتروني"
                                className="h-11 flex-1 rounded-full border border-white/15 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500"
                            />
                            <button
                                type="submit"
                                className="h-11 shrink-0 rounded-full bg-orange-500 px-6 text-sm font-bold transition hover:bg-orange-600"
                            >
                                اشترك
                            </button>
                        </form>
                    </div>

                    <div className="grid gap-8 md:grid-cols-4">
                        <div>
                            <h3 className="flex items-center gap-2 text-lg font-black">
                                {identity.logo ? (
                                    <img src={getImageUrl(identity.logo)} alt="" className="h-8 w-8 rounded-lg object-cover" />
                                ) : (
                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm font-black">
                                        {identity.name.charAt(0)}
                                    </span>
                                )}
                                {identity.name}
                            </h3>
                            <p className="mt-3 text-sm leading-relaxed text-slate-400">
                                {identity.description || 'وجهتك الأولى لشراء أحدث الأجهزة الذكية والإلكترونيات.'}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">روابط سريعة</h4>
                            <ul className="mt-3 space-y-2 text-sm text-slate-400">
                                <li className="cursor-pointer transition hover:text-orange-500">الرئيسية</li>
                                <li className="cursor-pointer transition hover:text-orange-500">جميع المنتجات</li>
                                <li className="cursor-pointer transition hover:text-orange-500">العروض والتخفيضات</li>
                                <li className="cursor-pointer transition hover:text-orange-500">الأسئلة الشائعة</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">خدمة العملاء</h4>
                            <ul className="mt-3 space-y-2 text-sm text-slate-400">
                                <li className="cursor-pointer transition hover:text-orange-500">سياسة الاسترجاع</li>
                                <li className="cursor-pointer transition hover:text-orange-500">سياسة الخصوصية</li>
                                <li className="cursor-pointer transition hover:text-orange-500">الشحن والتوصيل</li>
                                <li className="cursor-pointer transition hover:text-orange-500">تواصل معنا</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">تواصل معنا</h4>
                            <ul className="mt-3 space-y-2 text-sm text-slate-400">
                                {identity.phone && <li className="font-bold text-slate-200" dir="ltr">{identity.phone}</li>}
                                {cfg.email && <li>{cfg.email}</li>}
                                {auth.isLoggedIn ? (
                                    <li>
                                        <button
                                            type="button"
                                            className="text-orange-400 underline"
                                            onClick={() => auth.setShowOrdersModal(true)}
                                        >
                                            طلباتي
                                        </button>
                                    </li>
                                ) : (
                                    <li>
                                        <button
                                            type="button"
                                            className="text-orange-400 underline"
                                            onClick={() => auth.setShowLoginModal(true)}
                                        >
                                            تسجيل الدخول
                                        </button>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>

                    <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 md:flex-row">
                        <p className="text-sm text-slate-400">
                            © {new Date().getFullYear()} {identity.name} — جميع الحقوق محفوظة
                        </p>
                        <p className="text-xs text-slate-500">صُمم ليكون متجرك الإلكتروني العربي المثالي</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ArabicGadgetsPage;
