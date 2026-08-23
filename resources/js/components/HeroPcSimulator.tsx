import React, { useEffect, useState } from 'react';
import {
    Accessibility,
    ChevronLeft,
    ChevronRight,
    Globe,
    Lock,
    MessageCircle,
    Phone,
    Power,
    RotateCw,
    Search,
    ShoppingBag,
    ShoppingCart,
    Sparkles,
    Truck,
    User,
    Wifi,
} from 'lucide-react';

type ScreenState = 'OFF' | 'BIOS' | 'LOGIN' | 'WELCOME' | 'SEARCH' | 'DEMO';

const STATE_ORDER: ScreenState[] = ['OFF', 'BIOS', 'LOGIN', 'WELCOME', 'SEARCH', 'DEMO'];

export interface DemoStoreProduct {
    name: string;
    image?: string | null;
    price: number;
    originalPrice?: number | null;
    discount?: number;
    category?: string | null;
}

export interface DemoStorePreview {
    name?: string;
    products?: DemoStoreProduct[];
    categories?: Array<{ name: string; image?: string | null }>;
}

interface HeroPcSimulatorProps {
    /** Real live-demo store URL shown in the browser bar / visit button. */
    demoUrl?: string;
    /** Live snapshot of the real demo store (products + categories). */
    preview?: DemoStorePreview | null;
}

const FULL_QUERY = 'كيف بكون موقعي مع وصول';
const RAM_TOTAL_KB = 65536;
const PW_DOTS = 12;

/** Real media assets of the live «fashion-designer-mart» template. */
const HERO_SLIDES = [
    '/themes/fashion-designer-mart/slider1.png',
    '/themes/fashion-designer-mart/header-banner.png',
];

/** Brand mark of the demo boutique (elegant gem — matches fashion-designer-mart). */
const BRAND_MARK = '/images/demo-brand-mark.svg';

/** Used only until the live backend payload arrives. */
const FALLBACK_PRODUCTS: DemoStoreProduct[] = [
    { name: 'فستان سهرة دانتيل مطرز', image: '/themes/fashion-designer-mart/trending-products1.png', price: 389, originalPrice: 469, discount: 17, category: 'أزياء نسائية' },
    { name: 'عباية كلوش بقصّة خليجية', image: '/themes/fashion-designer-mart/trending-products2.png', price: 449, category: 'أزياء نسائية' },
    { name: 'طقم تونيك وبنطلون كتان', image: '/themes/fashion-designer-mart/trending-products3.png', price: 329, originalPrice: 389, discount: 15, category: 'أزياء نسائية' },
    { name: 'معطف صوف طويل بحزام', image: '/themes/fashion-designer-mart/trending-products4.png', price: 479, originalPrice: 559, discount: 14, category: 'أزياء نسائية' },
];

const FALLBACK_CATEGORIES: Array<{ name: string; image?: string | null }> = [
    { name: 'أزياء نسائية' },
    { name: 'حقائب ومجوهرات' },
];

const fmtPrice = (n: number): string => `${n.toLocaleString('en-US')} ₪`;

export function HeroPcSimulator({
    demoUrl = 'https://demo.wusool.ps',
    preview,
}: HeroPcSimulatorProps) {
    const [state, setState] = useState<ScreenState>('OFF');
    const [typedQuery, setTypedQuery] = useState('');
    const [ramKb, setRamKb] = useState(0);
    const [pwLen, setPwLen] = useState(0);
    const [loading, setLoading] = useState(false);
    const [slide, setSlide] = useState(0);
    const [clock, setClock] = useState('');
    const [lockDate, setLockDate] = useState('');
    const [activeCat, setActiveCat] = useState('الكل');

    const storeName = preview?.name || 'بوتيك ماسة';
    const products =
        preview?.products && preview.products.length > 0 ? preview.products : FALLBACK_PRODUCTS;
    const rawCategories =
        preview?.categories && preview.categories.length > 0 ? preview.categories : FALLBACK_CATEGORIES;
    const categories = rawCategories.filter((c) => c.name !== 'الكل');

    const visibleProducts =
        activeCat === 'الكل'
            ? products
            : products.filter((p) => p.category === activeCat);

    /* Live clock + Arabic date for the Windows-11 lock screen corner */
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setClock(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
            setLockDate(
                now.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' }),
            );
        };
        tick();
        const t = setInterval(tick, 30000);
        return () => clearInterval(t);
    }, []);

    const powerOn = () => setState('BIOS');

    const replay = () => {
        setState('OFF');
        setTypedQuery('');
        setRamKb(0);
        setPwLen(0);
        setActiveCat('الكل');
        setSlide(0);
    };

    /* ── BIOS: RAM count-up, then hand over to the lock screen ── */
    useEffect(() => {
        if (state !== 'BIOS') return;
        setRamKb(0);
        const ramTimer = setInterval(() => {
            setRamKb((prev) => {
                const next = prev + 4096 + Math.floor(Math.random() * 3072);
                return next >= RAM_TOTAL_KB ? RAM_TOTAL_KB : next;
            });
        }, 45);
        const advance = setTimeout(() => setState('LOGIN'), 2400);
        return () => {
            clearInterval(ramTimer);
            clearTimeout(advance);
        };
    }, [state]);

    /* ── LOGIN (Windows 11): password fills itself, then signs in ── */
    useEffect(() => {
        if (state !== 'LOGIN') return;
        setPwLen(0);
        const typing = setInterval(() => setPwLen((p) => Math.min(p + 1, PW_DOTS)), 95);
        const advance = setTimeout(() => setState('WELCOME'), 2400);
        return () => {
            clearInterval(typing);
            clearTimeout(advance);
        };
    }, [state]);

    /* ── WELCOME: brief “مرحباً” spinner, Windows-style ── */
    useEffect(() => {
        if (state !== 'WELCOME') return;
        const t = setTimeout(() => setState('SEARCH'), 1150);
        return () => clearTimeout(t);
    }, [state]);

    /* ── SEARCH: auto-typing the query, then opening the result ── */
    useEffect(() => {
        if (state !== 'SEARCH') return;
        let index = 0;
        setTypedQuery('');
        const interval = setInterval(() => {
            if (index < FULL_QUERY.length) {
                const ch = FULL_QUERY.charAt(index);
                index += 1;
                setTypedQuery((prev) => prev + ch);
            } else {
                clearInterval(interval);
            }
        }, 70);
        const advance = setTimeout(
            () => setState('DEMO'),
            FULL_QUERY.length * 70 + 1500,
        );
        return () => {
            clearInterval(interval);
            clearTimeout(advance);
        };
    }, [state]);

    /* ── DEMO: brief page-load simulation (bar + skeleton) ── */
    useEffect(() => {
        if (state !== 'DEMO') return;
        setLoading(true);
        const t = setTimeout(() => setLoading(false), 1100);
        return () => clearTimeout(t);
    }, [state]);

    /* ── DEMO: hero slider glides across the real template media ── */
    useEffect(() => {
        if (state !== 'DEMO' || loading) return;
        const t = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 4200);
        return () => clearInterval(t);
    }, [state, loading]);

    const stageIndex = STATE_ORDER.indexOf(state);

    return (
        <div className="dir-rtl mx-auto my-6 w-full max-w-4xl">
            {/* PC Monitor Outer Frame */}
            <div className="relative rounded-3xl border-4 border-gray-800 bg-gray-900 p-3 shadow-2xl ring-1 ring-white/10 sm:p-4">
                {/* Top Camera & Indicator */}
                <div className="mb-2 flex items-center justify-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-gray-700" />
                    <div
                        className={`h-1.5 w-1.5 rounded-full ${
                            state !== 'OFF' ? 'animate-pulse bg-emerald-500' : 'bg-gray-800'
                        }`}
                    />
                </div>

                {/* Monitor Screen Container */}
                <div className="relative h-[430px] w-full overflow-hidden rounded-2xl border border-gray-800/80 bg-black font-sans sm:h-[500px]">
                    {/* Glass glare for realism */}
                    <div className="sim-glare pointer-events-none absolute inset-0 z-40" />

                    {/* Loading progress bar across the very top of the screen */}
                    {state === 'DEMO' && loading && (
                        <div className="absolute inset-x-0 top-0 z-30 h-0.5 bg-emerald-400/20">
                            <div className="sim-loading-bar h-full bg-emerald-500" />
                        </div>
                    )}

                    {/* Stage dots */}
                    {state !== 'OFF' && (
                        <div className="absolute right-1/2 top-3 z-50 flex translate-x-1/2 items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 backdrop-blur-md">
                            {STATE_ORDER.slice(1).map((s) => (
                                <span
                                    key={s}
                                    className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                                        STATE_ORDER.indexOf(s) <= stageIndex
                                            ? 'bg-emerald-400'
                                            : 'bg-white/25'
                                    }`}
                                />
                            ))}
                        </div>
                    )}

                    {/* STATE 1: OFF */}
                    {state === 'OFF' && (
                        <div className="sim-stage flex h-full w-full flex-col items-center justify-center space-y-4 bg-gradient-to-b from-gray-950 to-black text-white">
                            <button
                                type="button"
                                onClick={powerOn}
                                aria-label="تشغيل التجربة"
                                className="group relative cursor-pointer rounded-full border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-400 shadow-lg shadow-emerald-500/10 transition-all hover:scale-110 hover:bg-emerald-500/20"
                            >
                                <Power className="h-10 w-10 transition-transform group-hover:rotate-12" />
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-gray-400">
                                    انقر لتشغيل التجربة
                                </span>
                            </button>
                        </div>
                    )}

                    {/* STATE 2: BIOS BOOT — hard-forced LTR */}
                    {state === 'BIOS' && (
                        <div
                            dir="ltr"
                            className="sim-stage h-full w-full bg-black p-6 font-mono text-xs text-emerald-400"
                            style={{ direction: 'ltr', textAlign: 'left' }}
                        >
                            <p className="mb-2 font-bold text-white">&gt; WUSOOL BIOS v4.2.0 RELEASE</p>
                            <p className="sim-bios-line" style={{ animationDelay: '0.15s' }}>
                                &gt;&nbsp;Checking System Memory ...{' '}
                                {ramKb.toLocaleString('en-US')} KB {ramKb >= RAM_TOTAL_KB ? 'OK' : ''}
                                {ramKb < RAM_TOTAL_KB && <span className="sim-caret">▊</span>}
                            </p>
                            <p className="sim-bios-line" style={{ animationDelay: '0.55s' }}>
                                &gt;&nbsp;Initializing Store Engine &amp; Dynamic Routing ...
                            </p>
                            <p className="sim-bios-line" style={{ animationDelay: '1.05s' }}>
                                &gt;&nbsp;Connecting WhatsApp Gateway ............ READY
                            </p>
                            <p
                                className="sim-bios-line animate-pulse text-gray-500"
                                style={{ animationDelay: '1.55s' }}
                            >
                                &gt;&nbsp;Loading Desktop Environment
                                <span className="sim-caret">▊</span>
                            </p>
                        </div>
                    )}

                    {/* STATE 3: LOGIN — authentic Windows 11 lock screen (no input box) */}
                    {state === 'LOGIN' && (
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setState('WELCOME')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') setState('WELCOME');
                            }}
                            aria-label="تسجيل الدخول"
                            className="sim-stage sim-win11 relative flex h-full w-full cursor-pointer select-none flex-col items-center justify-center text-white outline-none"
                        >
                            {/* Big centered clock — real Win11 lock layout */}
                            <p
                                dir="ltr"
                                className="text-[64px] font-light leading-none tracking-wide text-white drop-shadow-lg sm:text-[76px]"
                            >
                                {clock}
                            </p>
                            <p className="sim-lock-date mt-2 text-sm font-medium text-white/90 drop-shadow-md sm:text-base">
                                {lockDate}
                            </p>

                            {/* Avatar + name */}
                            <div className="mt-9 flex flex-col items-center gap-2.5">
                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/80 to-indigo-500/80 shadow-xl ring-2 ring-white/30 backdrop-blur transition-transform duration-500 hover:scale-105">
                                    <User className="h-7 w-7 text-white" strokeWidth={1.75} />
                                </div>
                                <p className="text-sm font-semibold tracking-wide drop-shadow-md">زائر تجريبي</p>

                                {/* Borderless signing-in dots (replaces the old boxed input) */}
                                <div className="flex items-center gap-1.5" aria-hidden="true">
                                    {Array.from({ length: PW_DOTS }).map((_, i) => (
                                        <span
                                            key={i}
                                            className={`h-1 w-1 rounded-full transition-all duration-300 ${
                                                i < pwLen ? 'scale-125 bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]' : 'bg-white/25'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="animate-pulse text-[10px] font-medium text-white/70">
                                    انقر للدخول
                                </span>
                            </div>

                            {/* Win11 tray: network / accessibility / power (bottom-left) */}
                            <div
                                dir="ltr"
                                className="absolute bottom-3 left-3 flex items-center gap-3 text-white/85"
                                style={{ direction: 'ltr' }}
                            >
                                <Wifi className="h-4 w-4" strokeWidth={1.75} />
                                <Accessibility className="h-4 w-4" strokeWidth={1.75} />
                                <Power className="h-4 w-4" strokeWidth={1.75} />
                            </div>
                        </div>
                    )}

                    {/* STATE 3.5: WELCOME — “مرحباً” spinner */}
                    {state === 'WELCOME' && (
                        <div className="sim-stage sim-win11 flex h-full w-full flex-col items-center justify-center gap-4 text-white">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/80 to-indigo-500/80 shadow-xl ring-2 ring-white/30">
                                <User className="h-7 w-7 text-white" strokeWidth={1.75} />
                            </div>
                            <p className="text-lg font-medium drop-shadow-md">مرحباً</p>
                            <div className="sim-spinner" />
                        </div>
                    )}

                    {/* STATE 4: GOOGLE SEARCH SIMULATION */}
                    {state === 'SEARCH' && (
                        <div className="sim-stage flex h-full w-full flex-col items-center bg-white p-6 pt-12 text-gray-800">
                            <div className="mb-5 text-3xl font-black tracking-tight" dir="ltr">
                                <span className="text-blue-500">G</span>
                                <span className="text-red-500">o</span>
                                <span className="text-yellow-500">o</span>
                                <span className="text-blue-500">g</span>
                                <span className="text-green-500">l</span>
                                <span className="text-red-500">e</span>
                            </div>

                            <div className="flex w-full max-w-md items-center gap-3 rounded-full border border-gray-300 bg-white px-4 py-2.5 shadow-sm">
                                <Search className="h-4 w-4 shrink-0 text-gray-400" />
                                <span className="min-h-[18px] text-xs font-medium text-gray-900">
                                    {typedQuery}
                                    <span className="mr-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-emerald-600 align-middle" />
                                </span>
                            </div>

                            {typedQuery.length > 8 && (
                                <div className="animate-fade-slide mt-4 w-full max-w-md space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-right">
                                    <div className="rounded-xl border border-emerald-100 bg-white p-2.5 shadow-sm">
                                        <p className="text-[10px] text-gray-400" dir="ltr">
                                            wusool.ps › store-preview
                                        </p>
                                        <p className="text-xs font-bold text-blue-700 hover:underline">
                                            متجرك المستقبلي - منصة وصول للمتاجر
                                        </p>
                                        <p className="mt-1 text-[11px] text-gray-500">
                                            تصميم سريع، متوافق مع كافة الأجهزة، ومرتبط بالواتساب مباشرة...
                                        </p>
                                    </div>
                                    <div className="rounded-xl p-2.5 opacity-60">
                                        <p className="text-[10px] text-gray-400" dir="ltr">
                                            example.com › stores
                                        </p>
                                        <p className="text-xs font-semibold text-blue-700">
                                            أفضل منصات المتاجر الإلكترونية
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STATE 5: LIVE STORE DEMO — luxury storefront inspired by the
                        real «fashion-designer-mart» template, fed by live DB data */}
                    {state === 'DEMO' && (
                        <div className="sim-fd-body sim-stage flex h-full w-full flex-col bg-[#fdf2f4]">
                            {/* Browser Bar */}
                            <div className="dir-ltr flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                                </div>
                                <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                                    <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                    <RotateCw className="h-3 w-3 shrink-0 text-gray-400" />
                                    <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-gray-100 px-2.5 py-1 font-mono text-[11px] text-gray-500">
                                        <Globe className="h-3 w-3 shrink-0 text-emerald-600" />
                                        <span className="truncate">{demoUrl.replace(/^https?:\/\//, '')}</span>
                                        <Lock className="ml-auto h-2.5 w-2.5 shrink-0 text-gray-400" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={replay}
                                        className="dir-rtl shrink-0 cursor-pointer text-[10px] text-gray-400 transition-colors hover:text-gray-700"
                                    >
                                        إعادة التشغيل ↻
                                    </button>
                                </div>
                            </div>

                            {loading ? (
                                /* Skeleton shimmer while the "page loads" — hidden scrollbar */
                                <div className="sim-scroll dir-rtl space-y-3 overflow-y-auto p-4" style={{ direction: 'rtl' }}>
                                    <div className="h-28 animate-pulse rounded-sm bg-[#f6dde2]" />
                                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                        {[0, 1, 2, 3].map((i) => (
                                            <div key={i} className="space-y-2 rounded-sm border border-[#f6dde2] bg-white p-2">
                                                <div className="h-20 animate-pulse rounded-sm bg-[#f6dde2]" />
                                                <div className="h-2.5 w-3/4 animate-pulse rounded bg-[#f9e8ec]" />
                                                <div className="h-2.5 w-1/2 animate-pulse rounded bg-[#faf0f3]" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="sim-scroll flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                                    <div dir="rtl" className="pb-10 text-right">
                                        {/* Black top strip — fashion-designer-mart signature */}
                                        <div className="flex items-center justify-between bg-[#1a1c22] px-3 py-1.5 text-[9px] font-medium text-white/85">
                                            <span className="flex items-center gap-1">
                                                <Sparkles className="h-2.5 w-2.5 shrink-0 text-[#f1657d]" />
                                                إصدارات محدودة — الفخامة في أدق التفاصيل
                                            </span>
                                            <span dir="ltr" className="hidden shrink-0 items-center gap-1 sm:flex">
                                                <Phone className="h-2.5 w-2.5 text-[#f1657d]" />
                                                +972559886886
                                            </span>
                                        </div>

                                        {/* Storefront header row */}
                                        <div className="flex items-center justify-between border-b border-[#f6dde2] bg-white px-3 py-2">
                                            <div className="flex items-center gap-1.5">
                                                <img
                                                    src={BRAND_MARK}
                                                    alt="شعار المتجر"
                                                    className="h-6 w-6 shrink-0 object-contain drop-shadow-sm"
                                                    onError={(e) => {
                                                        e.currentTarget.style.visibility = 'hidden';
                                                    }}
                                                />
                                                <span className="sim-fd-serif text-xs font-bold tracking-wide text-[#1a1c22]">{storeName}</span>
                                            </div>
                                            <nav className="hidden items-center gap-3 text-[9px] font-medium text-[#5b6572] sm:flex">
                                                <span className="font-bold text-[#f1657d]">الرئيسية</span>
                                                <span>الكوليكشن</span>
                                                <span>وصل حديثاً</span>
                                                <span>تواصل</span>
                                            </nav>
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={demoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded-sm bg-[#f1657d] px-2.5 py-1 text-[9px] font-bold text-white shadow-sm transition-all hover:bg-[#e4556d]"
                                                >
                                                    تواصل معنا
                                                </a>
                                                <span className="relative text-[#1a1c22]">
                                                    <ShoppingCart className="h-3.5 w-3.5" />
                                                    <span className="absolute -right-1.5 -top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#f1657d] text-[7px] font-bold text-white">
                                                        2
                                                    </span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Hero slider — real template media, crossfading */}
                                        <div className="relative h-36 w-full overflow-hidden bg-[#1a1c22] sm:h-44">
                                            {HERO_SLIDES.map((src, i) => (
                                                <img
                                                    key={src}
                                                    src={src}
                                                    alt={`تشكيلة ${storeName}`}
                                                    loading={i === 0 ? 'eager' : 'lazy'}
                                                    className={`sim-hero-img absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out ${
                                                        i === slide ? 'sim-hero-zoom opacity-100' : 'opacity-0'
                                                    }`}
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            ))}
                                            {/* RTL readability gradient */}
                                            <div className="absolute inset-0 bg-gradient-to-l from-black/65 via-black/25 to-transparent" />

                                            {/* Slide copy */}
                                            <div className="absolute inset-y-0 right-0 flex max-w-[75%] flex-col items-start justify-center gap-1.5 p-4 text-right sm:p-5">
                                                <span className="rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[8px] font-semibold text-white backdrop-blur-sm">
                                                    تشكيلة الموسم الجديدة وصلت
                                                </span>
                                                <p className="sim-fd-serif text-base font-bold leading-snug text-white drop-shadow-md sm:text-lg">
                                                    قطع حصرية لمن تميّز حضوره
                                                </p>
                                                <a
                                                    href={demoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-0.5 rounded-sm bg-[#f1657d] px-3 py-1.5 text-[9px] font-bold text-white shadow-md transition-transform hover:scale-105"
                                                >
                                                    اكتشف الكوليكشن
                                                </a>
                                            </div>

                                            {/* Slider dots */}
                                            <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
                                                {HERO_SLIDES.map((s, i) => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        aria-label={`الشريحة ${i + 1}`}
                                                        onClick={() => setSlide(i)}
                                                        className={`h-1 cursor-pointer rounded-full transition-all duration-500 ${
                                                            i === slide ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                                                        }`}
                                                    />
                                                ))}
                                            </div>

                                            {/* Live badge */}
                                            <span className="absolute left-1.5 top-1.5 z-10 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-bold text-emerald-700 shadow-sm">
                                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                                متجر حقيقي يعمل الآن
                                            </span>
                                        </div>

                                        {/* Trust strip — platform capabilities at a glance */}
                                        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-[#f6dde2] border-b border-[#f6dde2] bg-white px-2 py-2 text-[8px] font-semibold text-[#5b6572]">
                                            <span className="flex items-center justify-center gap-1">
                                                <Truck className="h-3 w-3 shrink-0 text-[#f1657d]" /> توصيل سريع
                                            </span>
                                            <span className="flex items-center justify-center gap-1">
                                                <Sparkles className="h-3 w-3 shrink-0 text-[#f1657d]" /> قطع حصرية
                                            </span>
                                            <span className="flex items-center justify-center gap-1">
                                                <MessageCircle className="h-3 w-3 shrink-0 text-[#f1657d]" /> طلب عبر واتساب
                                            </span>
                                        </div>

                                        <div className="space-y-3 p-3">
                                            {/* Section title — real theme pattern */}
                                            <div className="text-center">
                                                <h3 className="sim-fd-serif text-sm font-bold text-[#1a1c22]">القطع الأكثر طلباً</h3>
                                                <span className="mx-auto mt-1 block h-px w-12 bg-[#f1657d]" />
                                            </div>

                                            {/* Category chips (real demo-store categories) */}
                                            <div className="sim-scroll flex items-center justify-center gap-1.5 overflow-x-auto pb-0.5">
                                                {['الكل', ...categories.map((c) => c.name)].map((cat) => {
                                                    const meta = categories.find((c) => c.name === cat);
                                                    const isActive = activeCat === cat;
                                                    return (
                                                        <button
                                                            key={cat}
                                                            type="button"
                                                            onClick={() => setActiveCat(cat)}
                                                            className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border px-2.5 py-1 text-[10px] font-semibold transition-all ${
                                                                isActive
                                                                    ? 'border-[#f1657d] bg-[#f1657d] text-white shadow-sm'
                                                                    : 'cursor-pointer border-[#f6dde2] bg-white text-[#5b6572] hover:border-[#f1657d]/60 hover:text-[#f1657d]'
                                                            }`}
                                                        >
                                                            {meta?.image && (
                                                                <img src={meta.image} alt="" className="h-3.5 w-3.5 rounded-full" />
                                                            )}
                                                            {cat}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Real product cards — WpProductCard luxury behaviour */}
                                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                                {visibleProducts.slice(0, 8).map((prod, i) => (
                                                    <article
                                                        key={prod.name + i}
                                                        className="group sim-stage overflow-hidden rounded-sm border border-[#f6dde2] bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg"
                                                        style={{ animationDelay: `${i * 80}ms` }}
                                                    >
                                                        <div className="relative overflow-hidden bg-[#faf5f6]">
                                                            {!!prod.discount && prod.discount > 0 && (
                                                                <span className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[#f1657d] text-[8px] font-bold text-white shadow">
                                                                    -{prod.discount}%
                                                                </span>
                                                            )}
                                                            {prod.image ? (
                                                                <img
                                                                    src={prod.image}
                                                                    alt={prod.name}
                                                                    loading="lazy"
                                                                    className="h-20 w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.visibility = 'hidden';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="flex h-20 items-center justify-center">
                                                                    <ShoppingBag className="h-6 w-6 text-[#eecdd4]" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="space-y-1 p-2 text-right">
                                                            <h4 className="truncate text-[10px] font-semibold text-[#1a1c22]">{prod.name}</h4>
                                                            <div className="flex items-baseline gap-1.5">
                                                                <ins className="text-[11px] font-bold no-underline text-[#f1657d]">
                                                                    {fmtPrice(prod.price)}
                                                                </ins>
                                                                {!!prod.originalPrice && (
                                                                    <del className="text-[9px] text-gray-400">
                                                                        {fmtPrice(prod.originalPrice)}
                                                                    </del>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="flex w-full items-center justify-center gap-1 rounded-sm border border-[#f6dde2] bg-[#fdf2f4] px-1.5 py-1 text-[9px] font-bold text-[#1a1c22] transition-colors hover:border-[#f1657d] hover:bg-[#f1657d] hover:text-white"
                                                            >
                                                                <MessageCircle className="h-2.5 w-2.5" />
                                                                <span>اطلب واتساب</span>
                                                            </button>
                                                        </div>
                                                    </article>
                                                ))}
                                            </div>

                                            {/* Mini footer strip */}
                                            <div className="mt-1 flex items-center justify-between rounded-sm bg-[#1a1c22] px-3 py-2 text-[9px] text-white/85">
                                                <span>© {new Date().getFullYear()} {storeName} — جميع الحقوق محفوظة</span>
                                                <span className="font-bold text-[#f9a8b8]">يعمل بواسطة وصول</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Floating WhatsApp FAB */}
                            {!loading && (
                                <a
                                    href={demoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="زيارة المتجر الحي"
                                    className="group absolute bottom-3 left-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40 transition-transform hover:scale-110"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="pointer-events-none absolute left-11 hidden whitespace-nowrap rounded-lg bg-slate-900/90 px-2 py-1 text-[9px] font-semibold text-white backdrop-blur-sm group-hover:block">
                                        زيارة المتجر الحي
                                    </span>
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {/* Monitor Base Stand */}
                <div className="mx-auto h-3 w-28 rounded-b-lg bg-gray-800" />
                <div className="mx-auto h-1.5 w-40 rounded-full bg-gray-700 shadow-md" />
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800&display=swap');

                /* fashion-designer-mart typography */
                .sim-fd-serif { font-family: 'Amiri', 'Tajawal', serif; }
                .sim-fd-body { font-family: 'Cairo', 'Tajawal', sans-serif; }

                .sim-glare {
                    background: linear-gradient(115deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 30%);
                }

                /* Smooth stage-to-stage entrance */
                @keyframes simStageIn {
                    from { opacity: 0; transform: scale(0.985) translateY(6px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
                .sim-stage { animation: simStageIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }

                /* Lock-screen date soft rise */
                @keyframes simLockDateIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .sim-lock-date { animation: simLockDateIn 0.7s ease-out both; }

                @keyframes simBiosIn {
                    to { opacity: 1; }
                }
                .sim-bios-line {
                    display: block;
                    opacity: 0;
                    text-align: left;
                    animation: simBiosIn 0.15s linear forwards;
                }
                .sim-caret {
                    display: inline-block;
                    margin-left: 2px;
                    animation: simCaretBlink 0.9s steps(1) infinite;
                }
                @keyframes simCaretBlink {
                    50% { opacity: 0; }
                }

                /* Windows 11 bloom-style wallpaper */
                .sim-win11 {
                    background:
                        radial-gradient(at 28% 26%, rgba(86,120,255,0.85) 0px, transparent 55%),
                        radial-gradient(at 74% 34%, rgba(56,189,248,0.55) 0px, transparent 50%),
                        radial-gradient(at 52% 82%, rgba(139,92,246,0.6) 0px, transparent 55%),
                        radial-gradient(at 84% 78%, rgba(37,99,235,0.45) 0px, transparent 45%),
                        linear-gradient(135deg, #071633 0%, #0d2c5c 55%, #123a6b 100%);
                }
                .sim-spinner {
                    width: 30px;
                    height: 30px;
                    border-radius: 9999px;
                    border: 3px solid rgba(255,255,255,0.22);
                    border-top-color: #ffffff;
                    animation: simSpin 0.9s linear infinite;
                }
                @keyframes simSpin {
                    to { transform: rotate(360deg); }
                }
                @keyframes simLoadingBar {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
                .sim-loading-bar { animation: simLoadingBar 1s linear forwards; }

                /* Ken Burns drift on the active hero slide */
                @keyframes simHeroZoom {
                    from { transform: scale(1) translateX(0); }
                    to   { transform: scale(1.08) translateX(-2%); }
                }
                .sim-hero-zoom { animation: simHeroZoom 9s ease-in-out infinite alternate; will-change: transform; }

                /* Hide the RTL scrollbar column inside the simulated page only */
                .sim-scroll { scrollbar-width: none; -ms-overflow-style: none; }
                .sim-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }

                @media (prefers-reduced-motion: reduce) {
                    .sim-hero-zoom, .sim-loading-bar, .sim-bios-line, .sim-spinner, .sim-lock-date { animation: none !important; opacity: 1 !important; }
                    .sim-stage { animation: none !important; opacity: 1 !important; transform: none !important; }
                }
            `}</style>
        </div>
    );
}

export default HeroPcSimulator;
