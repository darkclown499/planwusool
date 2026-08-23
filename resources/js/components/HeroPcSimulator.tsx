import React, { useState, useEffect } from 'react';
import {
    CheckCircle,
    ExternalLink,
    Globe,
    Lock,
    MessageSquare,
    Power,
    Search,
    ShoppingBag,
} from 'lucide-react';

type ScreenState = 'OFF' | 'BIOS' | 'LOGIN' | 'SEARCH' | 'DEMO';

interface HeroPcSimulatorProps {
    /** Real live-demo store URL opened by the "visit store" button. */
    demoUrl?: string;
}

const FULL_QUERY = 'كيف بكون موقعي مع وصول';

const DEMO_PRODUCTS = [
    { name: 'سماعات لاسلكية Pro', price: '₪199', usd: '$54', category: 'إلكترونيات' },
    { name: 'حقيبة ظهر عصرية', price: '₪120', usd: '$33', category: 'أزياء' },
    { name: 'ساعة ذكية Fit', price: '₪249', usd: '$68', category: 'إلكترونيات' },
];

const DEMO_CATEGORIES = ['الكل', 'إلكترونيات', 'أزياء'];

export function HeroPcSimulator({ demoUrl = 'https://demo.wusool.ps' }: HeroPcSimulatorProps) {
    const [state, setState] = useState<ScreenState>('OFF');
    const [typedQuery, setTypedQuery] = useState('');
    const [demoCategory, setDemoCategory] = useState('الكل');

    // Auto-typing effect in the search state.
    useEffect(() => {
        if (state === 'SEARCH') {
            let index = 0;
            setTypedQuery('');
            const interval = setInterval(() => {
                if (index < FULL_QUERY.length) {
                    setTypedQuery((prev) => prev + FULL_QUERY.charAt(index));
                    index++;
                } else {
                    clearInterval(interval);
                    setTimeout(() => setState('DEMO'), 1200);
                }
            }, 70);
            return () => clearInterval(interval);
        }
    }, [state]);

    // BIOS auto-advance.
    useEffect(() => {
        if (state === 'BIOS') {
            const timer = setTimeout(() => setState('LOGIN'), 1800);
            return () => clearTimeout(timer);
        }
    }, [state]);

    const visibleProducts =
        demoCategory === 'الكل' ? DEMO_PRODUCTS : DEMO_PRODUCTS.filter((p) => p.category === demoCategory);

    return (
        <div className="dir-rtl mx-auto w-full max-w-4xl my-6">
            {/* PC Monitor Outer Frame */}
            <div className="relative rounded-3xl border-4 border-gray-800 bg-gray-900 p-3 shadow-2xl ring-1 ring-white/10 sm:p-4">
                {/* Top Camera & Indicator */}
                <div className="mb-2 flex items-center justify-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-gray-700"></div>
                    <div
                        className={`h-1.5 w-1.5 rounded-full ${
                            state !== 'OFF' ? 'animate-pulse bg-emerald-500' : 'bg-gray-800'
                        }`}
                    ></div>
                </div>

                {/* Monitor Screen Container */}
                <div className="relative h-[420px] w-full overflow-hidden rounded-2xl border border-gray-800/80 bg-black font-sans sm:h-[480px]">
                    {/* Quick Skip Button */}
                    {state !== 'OFF' && state !== 'DEMO' && (
                        <button
                            type="button"
                            onClick={() => setState('DEMO')}
                            className="absolute left-3 top-3 z-50 cursor-pointer rounded-lg bg-white/10 px-2.5 py-1 text-[10px] text-white backdrop-blur-md transition-colors hover:bg-white/20"
                        >
                            تخطي التجربة ⚡
                        </button>
                    )}

                    {/* STATE 1: OFF */}
                    {state === 'OFF' && (
                        <div className="flex h-full w-full flex-col items-center justify-center space-y-4 bg-gradient-to-b from-gray-950 to-black text-white">
                            <button
                                type="button"
                                onClick={() => setState('BIOS')}
                                className="group relative cursor-pointer rounded-full border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-400 shadow-lg shadow-emerald-500/10 transition-all hover:scale-110 hover:bg-emerald-500/20"
                            >
                                <Power className="h-10 w-10 transition-transform group-hover:rotate-12" />
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-gray-400">
                                    انقر لتشغيل التجربة
                                </span>
                            </button>
                        </div>
                    )}

                    {/* STATE 2: BIOS BOOT */}
                    {state === 'BIOS' && (
                        <div className="dir-ltr h-full w-full space-y-2 bg-black p-6 text-left font-mono text-xs text-emerald-400">
                            <p className="font-bold text-white">&gt; WUSOOL BIOS v4.2.0 RELEASE</p>
                            <p>&gt; Checking System Memory... 64GB OK</p>
                            <p>&gt; Initializing Store Engine &amp; Dynamic Routing...</p>
                            <p>&gt; Connecting WhatsApp Gateway... READY</p>
                            <p className="animate-pulse text-gray-500">&gt; Loading User Desktop Environment...</p>
                        </div>
                    )}

                    {/* STATE 3: LOGIN SCREEN */}
                    {state === 'LOGIN' && (
                        <div className="flex h-full w-full flex-col items-center justify-center space-y-4 bg-gradient-to-br from-slate-900 via-teal-950 to-emerald-950 text-white">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400/40 bg-emerald-500/20 shadow-inner">
                                <Lock className="h-8 w-8 text-emerald-300" />
                            </div>
                            <div className="space-y-1 text-center">
                                <h4 className="text-sm font-bold">مرحباً بك في وصول</h4>
                                <p className="text-[11px] text-emerald-200/70">
                                    أدخل كلمة المرور لاستكشاف متجرك المستقبلي
                                </p>
                            </div>
                            <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 p-1.5 backdrop-blur-md">
                                <input
                                    type="password"
                                    readOnly
                                    value="••••••••••••"
                                    className="w-32 bg-transparent text-center text-xs tracking-widest text-white outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setState('SEARCH')}
                                    className="cursor-pointer rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-gray-950 transition-colors hover:bg-emerald-400"
                                >
                                    دخول
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STATE 4: GOOGLE SEARCH SIMULATION */}
                    {state === 'SEARCH' && (
                        <div className="flex h-full w-full flex-col items-center justify-center bg-white p-6 text-gray-800">
                            {/* Google Brand Mock */}
                            <div className="mb-6 text-3xl font-black tracking-tight">
                                <span className="text-blue-500">G</span>
                                <span className="text-red-500">o</span>
                                <span className="text-yellow-500">o</span>
                                <span className="text-blue-500">g</span>
                                <span className="text-green-500">l</span>
                                <span className="text-red-500">e</span>
                            </div>

                            {/* Search Box */}
                            <div className="flex w-full max-w-md items-center gap-3 rounded-full border border-gray-300 bg-white px-4 py-2.5 shadow-sm">
                                <Search className="h-4 w-4 shrink-0 text-gray-400" />
                                <span className="min-h-[18px] text-xs font-medium text-gray-900">
                                    {typedQuery}
                                    <span className="mr-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-emerald-600"></span>
                                </span>
                            </div>

                            {/* Fake Results Preview */}
                            {typedQuery.length > 10 && (
                                <div className="animate-fade-slide mt-4 w-full max-w-md rounded-2xl border border-gray-100 bg-gray-50 p-3 text-right">
                                    <p className="text-[10px] text-gray-400">wusool.ps › store-preview</p>
                                    <p className="cursor-pointer text-xs font-bold text-blue-700 hover:underline">
                                        متجرك المستقبلي - منصة وصول للمتاجر
                                    </p>
                                    <p className="mt-1 text-[11px] text-gray-500">
                                        تصميم سريع، متوافق مع كافة الأجهزة، ومرتبط بالواتساب مباشرة...
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STATE 5: LIVE STORE DEMO */}
                    {state === 'DEMO' && (
                        <div className="flex h-full w-full flex-col overflow-y-auto bg-gray-50">
                            {/* Demo Browser Bar */}
                            <div className="dir-ltr flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
                                <div className="flex items-center gap-1.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-red-400"></span>
                                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400"></span>
                                    <span className="h-2.5 w-2.5 rounded-full bg-green-400"></span>
                                </div>
                                <div className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1 font-mono text-[11px] text-gray-500">
                                    <Globe className="h-3 w-3 text-emerald-600" />
                                    <span>{demoUrl.replace(/^https?:\/\//, '')}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setState('OFF')}
                                    className="dir-rtl cursor-pointer text-[10px] text-gray-400 hover:text-gray-700"
                                >
                                    إعادة التشغيل 🔄
                                </button>
                            </div>

                            {/* Demo Store Content */}
                            <div className="dir-rtl space-y-4 p-4 text-right">
                                {/* Store Banner + Live Visit */}
                                <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white shadow-sm">
                                    <div className="space-y-1">
                                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                                            معاينة حية للمتجر
                                        </span>
                                        <h3 className="text-base font-bold">متجر الأناقة والجمال</h3>
                                        <p className="text-[11px] text-emerald-100">
                                            أحدث صيحات الموضة والإلكترونيات بين يديك
                                        </p>
                                    </div>
                                    <ShoppingBag className="h-10 w-10 shrink-0 text-white/30" />
                                </div>

                                {/* Live Visit Button */}
                                <a
                                    href={demoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-white py-2.5 text-xs font-bold text-emerald-700 shadow-sm transition-all hover:border-emerald-500 hover:bg-emerald-500 hover:text-white"
                                >
                                    <ExternalLink className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                                    <span>زيارة المتجر الحي</span>
                                </a>

                                {/* Category Bar */}
                                <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-0.5">
                                    {DEMO_CATEGORIES.map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setDemoCategory(cat)}
                                            className={`whitespace-nowrap rounded-lg px-3 py-1 text-[11px] font-medium transition-colors ${
                                                demoCategory === cat
                                                    ? 'bg-emerald-500 text-white shadow-sm'
                                                    : 'cursor-pointer bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100'
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {/* Products Grid */}
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                    {visibleProducts.map((prod) => (
                                        <div
                                            key={prod.name}
                                            className="animate-fade-slide space-y-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                                        >
                                            <div className="flex h-16 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
                                                صورة المنتج
                                            </div>
                                            <h4 className="truncate text-xs font-bold text-gray-800">{prod.name}</h4>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-xs font-black text-emerald-600">{prod.price}</span>
                                                <span className="text-[10px] font-semibold text-gray-400">{prod.usd}</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                                            >
                                                <MessageSquare className="h-3 w-3" />
                                                <span>طلب واتساب</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* WhatsApp Ready Badge */}
                                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-900">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                                        <span>جاهز لاستقبال طلبات العملاء فوراً على الواتساب!</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Monitor Base Stand */}
                <div className="mx-auto h-3 w-28 rounded-b-lg bg-gray-800"></div>
                <div className="mx-auto h-1.5 w-40 rounded-full bg-gray-700 shadow-md"></div>
            </div>
        </div>
    );
}

export default HeroPcSimulator;
