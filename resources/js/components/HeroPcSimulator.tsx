import React, { useEffect, useState } from 'react';
import {
    Accessibility,
    CircleArrowRight,
    ChevronLeft,
    ChevronRight,
    Globe,
    Lock,
    MessageCircle,
    Power,
    RotateCw,
    Search,
    ShoppingBag,
    ShoppingCart,
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

/** Used only until the live backend payload arrives. */
const FALLBACK_PRODUCTS: DemoStoreProduct[] = [
    { name: 'سماعات لاسلكية Pro', price: 199, originalPrice: 249, discount: 20, category: 'إلكترونيات' },
    { name: 'حقيبة ظهر عصرية', price: 120, category: 'أزياء' },
    { name: 'ساعة ذكية Fit', price: 249, originalPrice: 299, discount: 17, category: 'إلكترونيات' },
];

const FALLBACK_CATEGORIES: Array<{ name: string; image?: string | null }> = [
    { name: 'إلكترونيات' },
    { name: 'أزياء' },
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
    const [clock, setClock] = useState('');
    const [activeCat, setActiveCat] = useState('الكل');

    const storeName = preview?.name || 'متجر الديمو';
    const products =
        preview?.products && preview.products.length > 0 ? preview.products : FALLBACK_PRODUCTS;
    const rawCategories =
        preview?.categories && preview.categories.length > 0 ? preview.categories : FALLBACK_CATEGORIES;
    const categories = rawCategories.filter((c) => c.name !== 'الكل');

    const visibleProducts =
        activeCat === 'الكل'
            ? products
            : products.filter((p) => p.category === activeCat);

    /* Live clock for the Windows-11 lock screen corner */
    useEffect(() => {
        const tick = () =>
            setClock(
                new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            );
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
        const advance = setTimeout(() => setState('WELCOME'), 1750);
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

                    {/* Quick Skip */}
                    {state !== 'OFF' && state !== 'DEMO' && (
                        <button
                            type="button"
                            onClick={() => setState('DEMO')}
                            className="absolute left-3 top-3 z-50 cursor-pointer rounded-lg bg-white/10 px-2.5 py-1 text-[10px] text-white backdrop-blur-md transition-colors hover:bg-white/20"
                        >
                            تخطي التجربة ⚡
                        </button>
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
                        <div className="flex h-full w-full flex-col items-center justify-center space-y-4 bg-gradient-to-b from-gray-950 to-black text-white">
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
                            className="h-full w-full bg-black p-6 font-mono text-xs text-emerald-400"
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

                    {/* STATE 3: LOGIN — Windows 11 lock screen */}
                    {state === 'LOGIN' && (
                        <div className="sim-win11 relative flex h-full w-full flex-col items-center justify-center text-white">
                            <div className="flex flex-col items-center gap-2.5">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/80 to-indigo-500/80 shadow-xl ring-2 ring-white/30 backdrop-blur">
                                    <User className="h-8 w-8 text-white" strokeWidth={1.75} />
                                </div>
                                <p className="text-base font-semibold tracking-wide drop-shadow-md">
                                    زائر تجريبي
                                </p>
                                <div className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-2 py-1.5 shadow-lg backdrop-blur-md">
                                    <Lock className="ml-1 h-3.5 w-3.5 shrink-0 text-white/80" />
                                    <input
                                        type="password"
                                        readOnly
                                        value={'•'.repeat(pwLen)}
                                        placeholder="كلمة المرور"
                                        className="w-24 bg-transparent text-center text-sm tracking-[0.25em] text-white outline-none placeholder:text-[10px] placeholder:tracking-normal placeholder:text-white/60 sm:w-32"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setState('WELCOME')}
                                        aria-label="تسجيل الدخول"
                                        className="shrink-0 cursor-pointer rounded-full p-0.5 transition-colors hover:bg-white/20"
                                    >
        <CircleArrowRight className="h-5 w-5 text-white/90" />
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    className="cursor-pointer text-[10px] text-white/70 underline-offset-2 hover:text-white hover:underline"
                                >
                                    خيارات تسجيل الدخول
                                </button>
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
                            {/* Live clock (bottom-right) */}
                            <div
                                dir="ltr"
                                className="absolute bottom-2.5 right-3 text-sm font-light tracking-widest text-white/90"
                                style={{ direction: 'ltr' }}
                            >
                                {clock}
                            </div>
                        </div>
                    )}

                    {/* STATE 3.5: WELCOME — “مرحباً” spinner */}
                    {state === 'WELCOME' && (
                        <div className="sim-win11 flex h-full w-full flex-col items-center justify-center gap-4 text-white">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-400/80 to-indigo-500/80 shadow-xl ring-2 ring-white/30">
                                <User className="h-7 w-7 text-white" strokeWidth={1.75} />
                            </div>
                            <p className="text-lg font-medium drop-shadow-md">مرحباً</p>
                            <div className="sim-spinner" />
                        </div>
                    )}

                    {/* STATE 4: GOOGLE SEARCH SIMULATION */}
                    {state === 'SEARCH' && (
                        <div className="flex h-full w-full flex-col items-center bg-white p-6 pt-12 text-gray-800">
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

                    {/* STATE 5: LIVE STORE DEMO — real «بازار»-style storefront */}
                    {state === 'DEMO' && (
                        <div className="flex h-full w-full flex-col bg-gray-50">
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
                                    <div className="h-24 animate-pulse rounded-xl bg-gray-200" />
                                    <div className="grid grid-cols-3 gap-3">
                                        {[0, 1, 2].map((i) => (
                                            <div key={i} className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
                                                <div className="h-16 animate-pulse rounded-lg bg-gray-200" />
                                                <div className="h-2.5 w-3/4 animate-pulse rounded bg-gray-200" />
                                                <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-100" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="sim-scroll flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                                    <div className="dir-rtl pb-10 text-right" style={{ direction: 'rtl' }}>
                                        {/* Dark promo strip — بازار signature */}
                                        <div className="bg-slate-900 px-3 py-1.5 text-center text-[9px] font-medium text-white/90">
                                            🚚 توصيل مجاني للطلبات فوق 200 ₪ · ضمان استرجاع 14 يوم
                                        </div>

                                        {/* Storefront header row */}
                                        <div className="flex items-center justify-between border-b border-pink-100 bg-white px-3 py-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#f98496] to-[#9085f9] text-[10px] font-black text-white">
                                                    {storeName.slice(0, 1)}
                                                </span>
                                                <span className="text-[11px] font-extrabold text-slate-900">{storeName}</span>
                                            </div>
                                            <nav className="hidden items-center gap-2.5 text-[9px] font-medium text-slate-500 sm:flex">
                                                <span>الرئيسية</span>
                                                <span>المنتجات</span>
                                                <span>تواصل</span>
                                            </nav>
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={demoUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded-full bg-[#25D366] px-2.5 py-1 text-[9px] font-bold text-white shadow-sm transition-transform hover:scale-105"
                                                >
                                                    تواصل معنا
                                                </a>
                                                <span className="relative text-slate-700">
                                                    <ShoppingCart className="h-3.5 w-3.5" />
                                                    <span className="absolute -right-1.5 -top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#f98496] text-[7px] font-bold text-white">
                                                        2
                                                    </span>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-3 p-3">
                                            {/* Real screenshot banner of demo.wusool.ps */}
                                            <div className="group relative overflow-hidden rounded-xl border border-pink-100 shadow-sm">
                                                <img
                                                    src="/images/demo-store-preview.webp"
                                                    alt={`لقطة حقيقية من ${storeName}`}
                                                    loading="lazy"
                                                    className="anim-banner h-28 w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03] sm:h-36"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
                                                        if (sibling) sibling.style.display = 'block';
                                                    }}
                                                />
                                                <div
                                                    className="hidden h-24 w-full bg-gradient-to-br from-[#f98496]/70 to-[#9085f9]/70 sm:h-32"
                                                    aria-hidden="true"
                                                />
                                                <span
                                                    className="absolute bottom-1.5 right-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[8px] font-medium text-white backdrop-blur-sm"
                                                    dir="ltr"
                                                >
                                                    {demoUrl.replace(/^https?:\/\//, '')}
                                                </span>
                                                <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-bold text-emerald-700 shadow-sm">
                                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                                    لقطة حية
                                                </span>
                                            </div>

                                            {/* Category chips (real demo-store categories) */}
                                            <div className="sim-scroll flex items-center gap-1.5 overflow-x-auto pb-0.5">
                                                {['الكل', ...categories.map((c) => c.name)].map((cat) => {
                                                    const meta = categories.find((c) => c.name === cat);
                                                    const isActive = activeCat === cat;
                                                    return (
                                                        <button
                                                            key={cat}
                                                            type="button"
                                                            onClick={() => setActiveCat(cat)}
                                                            className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all ${
                                                                isActive
                                                                    ? 'bg-gradient-to-br from-[#f98496] to-[#9085f9] text-white shadow-sm'
                                                                    : 'cursor-pointer bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100'
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

                                            {/* Real product cards */}
                                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                                {visibleProducts.slice(0, 8).map((prod, i) => (
                                                    <div
                                                        key={prod.name + i}
                                                        className="group animate-fade-slide space-y-1.5 rounded-xl border border-pink-100 bg-white p-2 shadow-sm transition-shadow hover:shadow-md"
                                                        style={{ animationDelay: `${i * 90}ms` }}
                                                    >
                                                        <div className="relative overflow-hidden rounded-lg bg-gray-50">
                                                            {prod.image ? (
                                                                <img
                                                                    src={prod.image}
                                                                    alt={prod.name}
                                                                    loading="lazy"
                                                                    className="h-20 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.visibility = 'hidden';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="flex h-20 items-center justify-center">
                                                                    <ShoppingBag className="h-6 w-6 text-gray-300" />
                                                                </div>
                                                            )}
                                                            {!!prod.discount && prod.discount > 0 && (
                                                                <span className="absolute right-1 top-1 rounded-full bg-[#f98496] px-1.5 py-0.5 text-[8px] font-bold text-white shadow">
                                                                    -{prod.discount}%
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="truncate text-[10px] font-bold text-slate-800">{prod.name}</h4>
                                                        <div className="flex items-baseline gap-1.5">
                                                            <span className="text-[11px] font-black text-slate-900">
                                                                {fmtPrice(prod.price)}
                                                            </span>
                                                            {!!prod.originalPrice && (
                                                                <del className="no-underline text-[9px] font-medium text-gray-400 line-through">
                                                                    {fmtPrice(prod.originalPrice)}
                                                                </del>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="flex w-full items-center justify-center gap-1 rounded-lg bg-[#25D366]/10 px-1.5 py-1 text-[9px] font-bold text-[#128C7E] transition-colors hover:bg-[#25D366] hover:text-white"
                                                        >
                                                            <MessageCircle className="h-2.5 w-2.5" />
                                                            <span>اطلب واتساب</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Mini footer strip */}
                                            <div className="mt-1 flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-[9px] text-white/85">
                                                <span>© {new Date().getFullYear()} {storeName} — جميع الحقوق محفوظة</span>
                                                <span className="font-bold text-emerald-300">يعمل بواسطة وصول</span>
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
                .sim-glare {
                    background: linear-gradient(115deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 30%);
                }
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
                @keyframes simBannerPan {
                    0%, 100% { object-position: 0% top; }
                    50% { object-position: 100% top; }
                }
                .anim-banner { animation: simBannerPan 22s ease-in-out infinite; }

                /* Hide the RTL scrollbar column inside the simulated page only */
                .sim-scroll { scrollbar-width: none; -ms-overflow-style: none; }
                .sim-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }

                @media (prefers-reduced-motion: reduce) {
                    .anim-banner, .sim-loading-bar, .sim-bios-line, .sim-spinner { animation: none !important; opacity: 1 !important; width: 100% !important; }
                }
            `}</style>
        </div>
    );
}

export default HeroPcSimulator;
