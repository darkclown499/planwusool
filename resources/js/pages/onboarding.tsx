import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import ReactCountryFlag from 'react-country-flag';
import {
    Banknote,
    Battery,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Coins,
    Copy,
    CreditCard,
    ExternalLink,
    Globe,
    Languages,
    Loader2,
    Lock,
    MessageCircle,
    Monitor,
    Palette,
    PartyPopper,
    Share2,
    ShieldCheck,
    ShoppingBag,
    Signal,
    Smartphone,
    Sparkles,
    Store,
    User,
    Wifi,
    type LucideIcon,
} from 'lucide-react';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getStoreThemes } from '@/data/storeThemes';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';
import { LanguageSwitcher } from '@/components/language-switcher';

interface Currency {
    code: string;
    symbol: string;
    name: string;
}

interface Plan {
    id: number;
    name: string;
    price: number;
    duration: string;
    description: string | null;
    is_recommended: boolean;
}

interface OnboardingProps {
    demoStoreUrl: string;
    storeDomain: string;
    currencies: Currency[];
    plans: Plan[];
    referralCode: string | null;
    referralUrl: string | null;
    defaults: {
        name: string;
        storeName: string;
        language: string;
        currency: string;
        theme: string;
    };
    demoData: {
        name: string;
        url: string;
        categories: { name: string; image: string | null }[];
        products: { name: string; price: number; sale_price: number; image: string | null }[];
    };
}

const THEME_ACCENT: Record<string, string> = {
    gadgets: '#4F46E5', fashion: '#EC4899', 'home-decor': '#F59E0B', bakery: '#D97706',
    supermarket: '#16A34A', 'car-accessories': '#1F2937', toy: '#F97316', perfumes: '#7C3AED',
    jewelry: '#D97706', beauty: '#D946EF', pharmacy: '#059669', books: '#B45309',
    sport: '#F97316', pets: '#EA580C', flowers: '#EC4899', coffee: '#92400E',
    stationery: '#0EA5E9', spices: '#A16207', clothing: '#F43F5E', electronics: '#3B82F6',
    cosmetics: '#E879F9', food: '#F97316', fragrances: '#8B5CF6', 'home-tools': '#EA580C',
    'coffee-dates': '#78350F', 'jewelry-gold': '#B45309', kids: '#22C55E', sports: '#16A34A',
    'stationery-books': '#1E3A8A',
};

const STEP_META: { key: string; icon: LucideIcon }[] = [
    { key: 'welcome', icon: Sparkles },
    { key: 'name', icon: User },
    { key: 'store', icon: Store },
    { key: 'language', icon: Languages },
    { key: 'currency', icon: Coins },
    { key: 'theme', icon: Palette },
    { key: 'plans', icon: CreditCard },
    { key: 'confirm', icon: CheckCircle2 },
];

const CONFETTI_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ec4899', '#8b5cf6'];

function slugify(value: string): string {
    const latin = value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30);

    return latin || '';
}

export default function Onboarding({
    demoStoreUrl,
    storeDomain,
    currencies,
    plans,
    referralCode,
    referralUrl,
    defaults,
    demoData,
}: OnboardingProps) {
    const { t, i18n } = useTranslation();
    const { themeColor, customColor, logoDark, logoLight, titleText } = useBrand();
    const primaryColor =
        themeColor === 'custom' ? customColor : THEME_COLORS[themeColor as keyof typeof THEME_COLORS] || '#10b77f';

    const { data, setData, post, processing, errors } = useForm({
        name: defaults.name || '',
        store_name: defaults.storeName || '',
        store_subdomain: '',
        language: defaults.language || 'ar',
        currency: defaults.currency || 'ils',
        theme: defaults.theme || 'gadgets',
    });

    const [step, setStep] = useState(0);
    const [deviceView, setDeviceView] = useState<'phone' | 'desktop'>('phone');
    const [copied, setCopied] = useState(false);
    const [checking, setChecking] = useState(false);
    const [availability, setAvailability] = useState<{ available: boolean; message: string } | null>(null);

    const themes = getStoreThemes();
    const stepKey = STEP_META[step].key;
    const progress = ((step + 1) / STEP_META.length) * 100;
    const accent = THEME_ACCENT[data.theme] || primaryColor;
    const storeName = data.store_name.trim() || demoData?.name || '';

    const previewUrl = useMemo(
        () => (stepKey === 'theme' ? `${demoStoreUrl}?theme=${encodeURIComponent(data.theme)}` : demoStoreUrl),
        [demoStoreUrl, stepKey, data.theme]
    );

    const confettiPieces = useMemo(
        () =>
            Array.from({ length: 30 }, (_, i) => ({
                left: `${(i * 3.5 + 3) % 100}%`,
                delay: `${(i % 9) * 0.13}s`,
                size: 6 + (i % 5) * 2,
                color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            })),
        []
    );

    const updateSubdomainFromStoreName = (name: string) => {
        const slug = slugify(name);
        if (slug) {
            setData('store_subdomain', slug);
            setAvailability(null);
        }
    };

    const runAvailabilityCheck = async () => {
        if (!data.store_subdomain) {
            setAvailability({
                available: false,
                message: t('Please enter a valid subdomain (3-30 characters, letters, numbers and hyphens).'),
            });
            return;
        }
        setChecking(true);
        setAvailability(null);
        try {
            const { data: result } = await axios.get(route('onboarding.check-subdomain'), {
                params: { subdomain: data.store_subdomain },
            });
            setAvailability(result);
        } catch (e: any) {
            const message = e?.response?.data?.errors?.subdomain?.[0];
            setAvailability({
                available: false,
                message:
                    message ||
                    t('Please enter a valid subdomain (3-30 characters, letters, numbers and hyphens).'),
            });
        } finally {
            setChecking(false);
        }
    };

    const selectLanguage = (code: string) => {
        setData('language', code);
        i18n.changeLanguage(code);
    };

    const copyReferral = async () => {
        if (!referralUrl) return;
        try {
            await navigator.clipboard.writeText(referralUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (e) {
            setCopied(false);
        }
    };

    const canProceed = () => {
        switch (stepKey) {
            case 'name':
                return data.name.trim().length > 0;
            case 'store':
                return data.store_name.trim().length > 0 && data.store_subdomain.trim().length > 0;
            case 'language':
                return data.language === 'ar' || data.language === 'en';
            case 'currency':
                return data.currency.length > 0;
            case 'theme':
                return data.theme.length > 0;
            default:
                return true;
        }
    };

    const next = () => {
        if (stepKey === 'store' && availability && !availability.available) {
            return;
        }
        if (step < STEP_META.length - 1) {
            setStep(step + 1);
        }
    };

    const back = () => {
        if (step > 0) {
            setStep(step - 1);
        }
    };

    const submit = () => {
        post(route('onboarding.store'));
    };

    const langOptions = [
        { code: 'ar', name: t('Arabic'), countryCode: 'SA' },
        { code: 'en', name: t('English'), countryCode: 'GB' },
    ];

    const featureChips = [
        { icon: Store, label: t('Your store on WhatsApp') },
        { icon: Palette, label: t('Professional themes') },
        { icon: CreditCard, label: t('Multiple payment gateways') },
    ];

    return (
        <div className="min-h-screen bg-white relative font-sans">
            <Head title={t('Onboarding')} />

            <div className="flex min-h-screen">
                {/* Left panel — brand showcase */}
                <aside className="hidden lg:flex lg:w-[46%] xl:w-[48%] relative overflow-hidden">
                    <div
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}d9)` }}
                    >
                        <div className="absolute -top-24 -start-24 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-float-slow" />
                        <div className="absolute bottom-10 -end-20 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float" />
                        <div
                            className="absolute top-1/3 start-1/4 h-44 w-44 rounded-full bg-black/10 blur-2xl animate-float-slow"
                            style={{ animationDelay: '1.4s' }}
                        />
                        <div className="absolute inset-0 opacity-[0.06]" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                        }} />
                    </div>

                    {/* Floating decorative icons */}
                    <div className="absolute top-28 start-14 text-white/25 animate-float">
                        <ShoppingBag className="h-10 w-10" />
                    </div>
                    <div
                        className="absolute bottom-36 end-12 text-white/25 animate-float-slow"
                        style={{ animationDelay: '0.8s' }}
                    >
                        <Banknote className="h-10 w-10" />
                    </div>
                    <div
                        className="absolute top-1/2 end-8 text-white/20 animate-float"
                        style={{ animationDelay: '1.8s' }}
                    >
                        <ShieldCheck className="h-9 w-9" />
                    </div>

                    <div className="relative z-10 flex w-full flex-col items-center justify-center overflow-y-auto px-10 py-8 scrollbar-custom">
                        <div className="mb-4 flex items-center gap-2.5">
                            {logoLight ? (
                                <img src={logoLight} alt={titleText} className="h-9 w-auto animate-pop" />
                            ) : (
                                <span className="animate-pop text-2xl font-bold text-white">{titleText}</span>
                            )}
                        </div>

                        <h1 className="animate-fade-slide mb-2 text-center text-3xl font-bold leading-tight text-white xl:text-4xl">
                            {t('Welcome to Wusool')}
                        </h1>
                        <p className="mb-6 max-w-sm text-center text-sm text-white/80">
                            {t("Let's get your store up and running in a few simple steps.")}
                        </p>

                        {/* Device preview — toggle between phone and desktop */}
                        <div key={deviceView} className="flex flex-col items-center animate-fade-slide">
                            <div className="mb-4 inline-flex items-center gap-1 rounded-full bg-white/15 p-1 backdrop-blur">
                                <button
                                    type="button"
                                    onClick={() => setDeviceView('phone')}
                                    className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 ${
                                        deviceView === 'phone' ? 'bg-white text-gray-900 shadow' : 'text-white/80 hover:text-white'
                                    }`}
                                >
                                    <Smartphone className="h-3.5 w-3.5" />
                                    {t('Phone')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDeviceView('desktop')}
                                    className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-300 ${
                                        deviceView === 'desktop' ? 'bg-white text-gray-900 shadow' : 'text-white/80 hover:text-white'
                                    }`}
                                >
                                    <Monitor className="h-3.5 w-3.5" />
                                    {t('Desktop')}
                                </button>
                            </div>

                            <div className="relative">
                                <div className="absolute -inset-6 rounded-[3rem] bg-white/20 blur-3xl" />

                                {deviceView === 'phone' ? (
                                    <div className="relative w-56 xl:w-60">
                                        {/* Side buttons */}
                                        <div className="absolute -start-[3px] top-24 h-10 w-[3px] rounded-l bg-gray-900/80" />
                                        <div className="absolute -start-[3px] top-40 h-6 w-[3px] rounded-l bg-gray-900/80" />
                                        <div className="absolute -end-[3px] top-32 h-14 w-[3px] rounded-r bg-gray-900/80" />
                                        {/* Frame */}
                                        <div className="relative overflow-hidden rounded-[2.6rem] border-[7px] border-gray-900 bg-gray-900 shadow-2xl">
                                            {/* Dynamic island */}
                                            <div className="absolute left-1/2 top-2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
                                            {/* Screen */}
                                            <div className="flex aspect-[9/19.3] w-full flex-col overflow-hidden bg-gray-50">
                                                {/* Status bar */}
                                                <div className="flex items-center justify-between px-5 pb-1 pt-2.5 text-[9px] font-semibold text-gray-900">
                                                    <span className="tracking-wide" dir="ltr">9:41</span>
                                                    <span className="flex items-center gap-1" dir="ltr">
                                                        <Signal className="h-2.5 w-2.5" />
                                                        <Wifi className="h-2.5 w-2.5" />
                                                        <Battery className="h-3 w-3" />
                                                    </span>
                                                </div>
                                                {/* Store header */}
                                                <div className="flex items-center justify-between gap-2 px-4 py-2" style={{ backgroundColor: accent }}>
                                                    <div className="flex min-w-0 items-center gap-1.5">
                                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20">
                                                            <Store className="h-3.5 w-3.5 text-white" />
                                                        </span>
                                                        <span className="truncate text-[10px] font-bold text-white">{storeName}</span>
                                                    </div>
                                                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#25D366] px-2 py-0.5 text-[8px] font-bold text-white">
                                                        <MessageCircle className="h-2.5 w-2.5" />
                                                        {t('WhatsApp')}
                                                    </span>
                                                </div>
                                                {/* Hero */}
                                                <div
                                                    className="mx-3 mt-2 rounded-xl px-3 py-2.5 text-white"
                                                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
                                                >
                                                    <p className="text-[10px] font-bold leading-tight">{t('Order via WhatsApp')}</p>
                                                    <p className="mt-0.5 text-[7px] leading-snug opacity-90">
                                                        {t('Fast delivery · Cash on delivery · Secure')}
                                                    </p>
                                                    <span className="mt-1.5 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[7px] font-semibold">
                                                        {t('Shop now')}
                                                    </span>
                                                </div>
                                                {/* Categories */}
                                                <div className="mt-2 flex gap-1.5 overflow-hidden px-3">
                                                    {demoData?.categories?.slice(0, 4).map((cat, i) => (
                                                        <div key={i} className="flex flex-col items-center gap-0.5">
                                                            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-white shadow-sm">
                                                                {cat.image ? (
                                                                    <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <Store className="h-3.5 w-3.5 text-gray-400" />
                                                                )}
                                                            </span>
                                                            <span className="w-10 truncate text-center text-[6px] text-gray-500">{cat.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Products */}
                                                <div className="mt-1.5 flex-1 overflow-hidden px-3 pb-3">
                                                    <div className="grid grid-cols-3 gap-1.5">
                                                        {demoData?.products?.slice(0, 6).map((product, i) => (
                                                            <div key={i} className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
                                                                <div className="flex h-12 w-full items-center justify-center overflow-hidden bg-gray-100">
                                                                    {product.image ? (
                                                                        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                                                                    ) : (
                                                                        <Store className="h-4 w-4 text-gray-300" />
                                                                    )}
                                                                </div>
                                                                <div className="px-1 py-1">
                                                                    <p className="truncate text-[6px] text-gray-600">{product.name}</p>
                                                                    <div className="mt-0.5 flex items-center justify-between">
                                                                        <span className="text-[7px] font-bold" style={{ color: accent }}>
                                                                            {currencies.find((c) => c.code === data.currency)?.symbol}
                                                                            {product.price}
                                                                        </span>
                                                                        <span className="text-[#25D366]">
                                                                            <MessageCircle className="h-2.5 w-2.5" />
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Home indicator */}
                                            <div className="absolute bottom-1.5 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-gray-900/70" />
                                        </div>
                                        {/* Floating WhatsApp bubble */}
                                        <button
                                            type="button"
                                            className="absolute bottom-9 end-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl animate-pulse"
                                            onClick={() => window.open(demoData?.url, '_blank', 'noopener,noreferrer')}
                                            title={t('Open real store')}
                                        >
                                            <MessageCircle className="h-5 w-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                                        {/* Browser chrome */}
                                        <div className="flex items-center gap-2.5 border-b border-gray-200 bg-gray-100 px-3 py-2">
                                            <span className="flex shrink-0 gap-1.5">
                                                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                                                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                                                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                                            </span>
                                            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-[10px] text-gray-600">
                                                <Lock className="h-2.5 w-2.5 shrink-0 text-emerald-600" />
                                                <span className="truncate" dir="ltr">{previewUrl}</span>
                                            </div>
                                        </div>
                                        {/* Tab */}
                                        <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-3 pt-1.5">
                                            <span className="flex items-center gap-1.5 rounded-t border border-b-0 border-gray-200 bg-white px-3 py-1.5 text-[10px] font-medium text-gray-700">
                                                <Store className="h-3 w-3" style={{ color: accent }} />
                                                {storeName}
                                            </span>
                                        </div>
                                        {/* Page */}
                                        <div className="h-80 overflow-y-auto scrollbar-custom">
                                            <iframe
                                                src={previewUrl}
                                                title={t('Live store preview')}
                                                loading="lazy"
                                                className="w-full border-0 bg-white"
                                                style={{ height: 560 }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <a
                                href={demoData?.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white/80 transition-colors hover:text-white"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                {t('Open real store')}
                            </a>
                        </div>

                        {/* Feature chips */}
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                            {featureChips.map((chip, i) => (
                                <span
                                    key={i}
                                    className="onboarding-stagger flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur"
                                >
                                    <chip.icon className="h-3.5 w-3.5" />
                                    {chip.label}
                                </span>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Right panel — wizard */}
                <main className="flex flex-1 flex-col">
                    <div className="flex items-center justify-between p-5">
                        <div className="flex items-center gap-2 lg:hidden">
                            {logoDark ? (
                                <img src={logoDark} alt={titleText} className="h-8 w-auto" />
                            ) : (
                                <span className="text-lg font-bold text-gray-900">{titleText}</span>
                            )}
                        </div>
                        <div className={step !== 0 ? 'lg:ms-auto' : 'ms-auto'}>
                            <LanguageSwitcher />
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-center px-4 pb-10 pt-2">
                        <div className="mx-auto w-full max-w-xl">
                            {/* Step indicators */}
                            <div className="mb-5 flex items-center justify-center gap-1 sm:gap-1.5">
                                {STEP_META.map((meta, i) => {
                                    const Icon = meta.icon;
                                    const isDone = i < step;
                                    const isCurrent = i === step;
                                    return (
                                        <div key={meta.key} className="flex items-center gap-1 sm:gap-1.5">
                                            {i > 0 && (
                                                <div
                                                    className={`h-0.5 rounded-full transition-all duration-500 sm:w-8 ${
                                                        i <= step ? 'w-4 sm:w-8' : 'w-3 sm:w-4'
                                                    } ${i <= step ? '' : 'bg-gray-200'}`}
                                                    style={i <= step ? { backgroundColor: primaryColor } : undefined}
                                                />
                                            )}
                                            <div
                                                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition-all duration-300 sm:h-8 sm:w-8 ${
                                                    isDone || isCurrent
                                                        ? 'scale-105 text-white'
                                                        : 'border border-gray-300 text-gray-400'
                                                } ${isCurrent ? 'ring-4' : ''}`}
                                                style={{
                                                    backgroundColor: isDone || isCurrent ? primaryColor : undefined,
                                                    ['--tw-ring-color' as any]: isCurrent
                                                        ? `${primaryColor}40`
                                                        : undefined,
                                                }}
                                            >
                                                {isDone ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Progress bar */}
                            <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                <div
                                    className="relative h-full overflow-hidden rounded-full transition-all duration-700"
                                    style={{
                                        width: `${progress}%`,
                                        background: `linear-gradient(90deg, ${primaryColor}b3, ${primaryColor})`,
                                    }}
                                >
                                    <div
                                        className="absolute inset-0 animate-shimmer"
                                        style={{
                                            background:
                                                'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                                            backgroundSize: '200% 100%',
                                        }}
                                    />
                                </div>
                            </div>

                            <Card className="relative overflow-hidden rounded-2xl border-gray-100 shadow-xl shadow-gray-200/70">
                                <CardContent className="p-6 sm:p-9">
                                    <div key={step} className="animate-fade-slide">
                                        {stepKey === 'welcome' && (
                                            <div className="onboarding-stagger py-6 text-center">
                                                <div
                                                    className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl shadow-lg animate-pop"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    <Sparkles className="h-10 w-10 text-white" />
                                                </div>
                                                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                                                    {t('Welcome to Wusool')}
                                                </h2>
                                                <p className="mx-auto mb-8 max-w-md text-sm leading-relaxed text-gray-500">
                                                    {t("Let's get your store up and running in a few simple steps.")}
                                                </p>
                                                <Button
                                                    onClick={() => setStep(1)}
                                                    className="gap-2 animate-pulse-ring"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    {t('Start')}
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}

                                        {stepKey === 'name' && (
                                            <div className="onboarding-stagger py-4">
                                                <div className="mb-6 flex items-center gap-3">
                                                    <div
                                                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                                                        style={{ backgroundColor: `${primaryColor}1a` }}
                                                    >
                                                        <User className="h-5 w-5" style={{ color: primaryColor }} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-gray-900">
                                                            {t('Your Name')}
                                                        </h2>
                                                        <p className="text-sm text-gray-500">
                                                            {t('What should we call you?')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Label htmlFor="name" className="text-sm font-medium">
                                                    {t('Full name')}
                                                </Label>
                                                <Input
                                                    id="name"
                                                    value={data.name}
                                                    onChange={(e) => setData('name', e.target.value)}
                                                    placeholder={t('Full name')}
                                                    className="mt-2 h-12 rounded-xl"
                                                    autoFocus
                                                />
                                                {errors.name && (
                                                    <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                                                )}
                                            </div>
                                        )}

                                        {stepKey === 'store' && (
                                            <div className="onboarding-stagger py-4">
                                                <div className="mb-6 flex items-center gap-3">
                                                    <div
                                                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                                                        style={{ backgroundColor: `${primaryColor}1a` }}
                                                    >
                                                        <Store className="h-5 w-5" style={{ color: primaryColor }} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-gray-900">
                                                            {t("What's your store called?")}
                                                        </h2>
                                                        <p className="text-sm text-gray-500">
                                                            {t('Choose your store name and subdomain.')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <Label htmlFor="store_name" className="text-sm font-medium">
                                                    {t('Store name')}
                                                </Label>
                                                <Input
                                                    id="store_name"
                                                    value={data.store_name}
                                                    onChange={(e) => {
                                                        setData('store_name', e.target.value);
                                                        updateSubdomainFromStoreName(e.target.value);
                                                    }}
                                                    placeholder={t('Store name')}
                                                    className="mt-2 h-12 rounded-xl"
                                                />
                                                {errors.store_name && (
                                                    <p className="mt-2 text-sm text-red-600">{errors.store_name}</p>
                                                )}

                                                <div className="mt-6">
                                                    <Label htmlFor="store_subdomain" className="text-sm font-medium">
                                                        {t('Subdomain')}
                                                    </Label>
                                                    <p className="mt-1 mb-2 text-sm text-gray-500">
                                                        {t('Your store will be available at')}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative flex-1">
                                                            <Input
                                                                id="store_subdomain"
                                                                value={data.store_subdomain}
                                                                onChange={(e) => {
                                                                    setData('store_subdomain', e.target.value.toLowerCase());
                                                                    setAvailability(null);
                                                                }}
                                                                className="h-12 rounded-xl pe-16 text-sm"
                                                                dir="ltr"
                                                            />
                                                            <span
                                                                className="absolute inset-y-0 end-3 flex items-center text-sm text-gray-400"
                                                                dir="ltr"
                                                            >
                                                                .{storeDomain}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={runAvailabilityCheck}
                                                            disabled={checking || !data.store_subdomain}
                                                            className="h-12 shrink-0 rounded-xl"
                                                        >
                                                            {checking ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                t('Check availability')
                                                            )}
                                                        </Button>
                                                    </div>
                                                    {availability && (
                                                        <p
                                                            className={`mt-3 flex items-center gap-1.5 text-sm animate-pop ${
                                                                availability.available
                                                                    ? 'text-emerald-600'
                                                                    : 'text-red-600'
                                                            }`}
                                                        >
                                                            <Check className="h-4 w-4" />
                                                            {availability.message}
                                                        </p>
                                                    )}
                                                    {errors.store_subdomain && (
                                                        <p className="mt-2 text-sm text-red-600">
                                                            {errors.store_subdomain}
                                                        </p>
                                                    )}
                                                    <div
                                                        className="mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                                                        dir="ltr"
                                                        style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
                                                    >
                                                        <Globe className="h-3.5 w-3.5" />
                                                        {data.store_subdomain || 'your-store'}.{storeDomain}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {stepKey === 'language' && (
                                            <div className="onboarding-stagger py-4">
                                                <div className="mb-6 flex items-center gap-3">
                                                    <div
                                                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                                                        style={{ backgroundColor: `${primaryColor}1a` }}
                                                    >
                                                        <Languages className="h-5 w-5" style={{ color: primaryColor }} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-gray-900">
                                                            {t('Choose your language')}
                                                        </h2>
                                                        <p className="text-sm text-gray-500">
                                                            {t('Pick the language your store and dashboard will use.')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    {langOptions.map((lang) => (
                                                        <button
                                                            key={lang.code}
                                                            type="button"
                                                            onClick={() => selectLanguage(lang.code)}
                                                            className={`relative flex items-center gap-3 rounded-2xl border-2 p-5 text-start transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                                                                data.language === lang.code
                                                                    ? 'border-primary bg-primary/5'
                                                                    : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                        >
                                                            <ReactCountryFlag
                                                                countryCode={lang.countryCode}
                                                                svg
                                                                className="text-3xl"
                                                            />
                                                            <span className="font-semibold text-gray-900">{lang.name}</span>
                                                            {data.language === lang.code && (
                                                                <span
                                                                    className="absolute end-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-white animate-pop"
                                                                    style={{ backgroundColor: primaryColor }}
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {stepKey === 'currency' && (
                                            <div className="onboarding-stagger py-4">
                                                <div className="mb-6 flex items-center gap-3">
                                                    <div
                                                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                                                        style={{ backgroundColor: `${primaryColor}1a` }}
                                                    >
                                                        <Coins className="h-5 w-5" style={{ color: primaryColor }} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-gray-900">
                                                            {t('Choose your currency')}
                                                        </h2>
                                                        <p className="text-sm text-gray-500">
                                                            {t('Select the currency customers will use to pay.')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto pe-1 sm:grid-cols-3">
                                                    {currencies.map((currency) => (
                                                        <button
                                                            key={currency.code}
                                                            type="button"
                                                            onClick={() => setData('currency', currency.code)}
                                                            className={`relative rounded-2xl border-2 p-4 text-start transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                                                                data.currency === currency.code
                                                                    ? 'border-primary bg-primary/5'
                                                                    : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xl font-bold text-gray-900">
                                                                    {currency.symbol}
                                                                </span>
                                                                {data.currency === currency.code && (
                                                                    <span
                                                                        className="flex h-5 w-5 items-center justify-center rounded-full text-white animate-pop"
                                                                        style={{ backgroundColor: primaryColor }}
                                                                    >
                                                                        <Check className="h-3 w-3" />
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="mt-2 text-sm font-medium text-gray-800">
                                                                {currency.code}
                                                            </div>
                                                            <div className="truncate text-xs text-gray-400">
                                                                {currency.name}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {stepKey === 'theme' && (
                                            <div className="onboarding-stagger py-4">
                                                <div className="mb-2 flex items-center gap-3">
                                                    <div
                                                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                                                        style={{ backgroundColor: `${primaryColor}1a` }}
                                                    >
                                                        <Palette className="h-5 w-5" style={{ color: primaryColor }} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-gray-900">
                                                            {t('Choose a theme')}
                                                        </h2>
                                                        <p className="text-sm text-gray-500">
                                                            {t('Pick a theme that fits your business. You can change it anytime.')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="mb-4 text-xs text-gray-400">
                                                    {t('Watch the live preview update as you pick a theme.')}
                                                </p>
                                                <div className="grid max-h-[28rem] grid-cols-1 gap-4 overflow-y-auto pe-1 sm:grid-cols-2">
                                                    {themes.map((theme) => (
                                                        <div
                                                            key={theme.id}
                                                            className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                                                                data.theme === theme.id
                                                                    ? 'border-primary'
                                                                    : 'border-gray-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg'
                                                            }`}
                                                        >
                                                            <button type="button" className="w-full text-start" onClick={() => setData('theme', theme.id)}>
                                                                <div className="relative aspect-video overflow-hidden bg-gray-100 theme-preview-container">
                                                                    <img
                                                                        src={theme.thumbnail}
                                                                        alt={theme.name}
                                                                        className="h-full w-full object-cover theme-preview-image"
                                                                        onError={(e) => {
                                                                            (e.target as HTMLImageElement).src = `https://placehold.co/400x225?text=${encodeURIComponent(
                                                                                theme.name
                                                                            )}`;
                                                                        }}
                                                                    />
                                                                    {data.theme === theme.id && (
                                                                        <span
                                                                            className="absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-white shadow animate-pop"
                                                                            style={{ backgroundColor: primaryColor }}
                                                                        >
                                                                            <Check className="h-4 w-4" />
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="p-3">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="text-sm font-semibold text-gray-900">
                                                                            {theme.name}
                                                                        </span>
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-8 shrink-0 gap-1 text-xs"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                window.open(
                                                                                    `${demoStoreUrl}?theme=${theme.id}`,
                                                                                    '_blank',
                                                                                    'noopener,noreferrer'
                                                                                );
                                                                            }}
                                                                        >
                                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                                            {t('Preview')}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {stepKey === 'plans' && (
                                            <div className="onboarding-stagger py-4">
                                                <div className="mb-6 flex items-center gap-3">
                                                    <div
                                                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                                                        style={{ backgroundColor: `${primaryColor}1a` }}
                                                    >
                                                        <CreditCard className="h-5 w-5" style={{ color: primaryColor }} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-gray-900">{t('Plans')}</h2>
                                                        <p className="text-sm text-gray-500">
                                                            {t('Start free and upgrade as your business grows')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                    {plans.slice(0, 3).map((plan) => (
                                                        <div
                                                            key={plan.id}
                                                            className={`relative rounded-2xl border-2 p-4 transition-all duration-300 ${
                                                                plan.is_recommended
                                                                    ? 'border-primary bg-primary/5'
                                                                    : 'border-gray-200'
                                                            }`}
                                                        >
                                                            {plan.is_recommended && (
                                                                <Badge
                                                                    className="absolute -top-2 start-3 animate-pop"
                                                                    style={{ backgroundColor: primaryColor }}
                                                                >
                                                                    {t('Recommended')}
                                                                </Badge>
                                                            )}
                                                            <div className="font-semibold text-gray-900">{plan.name}</div>
                                                            <div className="mt-2 text-2xl font-bold text-gray-900">
                                                                {plan.price}
                                                                <span className="text-sm font-normal text-gray-500">
                                                                    {' '}/ {plan.duration}
                                                                </span>
                                                            </div>
                                                            {plan.description && (
                                                                <p className="mt-2 line-clamp-2 text-xs text-gray-500">
                                                                    {plan.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mb-6 rounded-2xl border border-gray-200 p-4">
                                                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
                                                        <Share2 className="h-4 w-4" style={{ color: primaryColor }} />
                                                        {t('Share your referral link and earn commission')}
                                                    </div>
                                                    <p className="mb-3 text-xs text-gray-500">
                                                        {t('When someone registers through your link and subscribes to a paid plan, you earn commission.')}
                                                    </p>
                                                    {referralUrl && (
                                                        <div className="flex items-center gap-2">
                                                            <code
                                                                className="flex-1 truncate rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-700"
                                                                dir="ltr"
                                                            >
                                                                {referralUrl}
                                                            </code>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={copyReferral}
                                                                className="shrink-0 gap-1"
                                                            >
                                                                {copied ? (
                                                                    <Check className="h-4 w-4 text-emerald-600" />
                                                                ) : (
                                                                    <Copy className="h-4 w-4" />
                                                                )}
                                                                {copied ? t('Copied!') : t('Copy link')}
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {referralCode && (
                                                        <p className="mt-2 text-xs text-gray-400">
                                                            {t('Code')}:{' '}
                                                            <span className="font-mono" dir="ltr">
                                                                {referralCode}
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-3 sm:flex-row">
                                                    <Button
                                                        className="flex-1 gap-2"
                                                        style={{ backgroundColor: primaryColor }}
                                                        onClick={next}
                                                    >
                                                        <CreditCard className="h-4 w-4" />
                                                        {t('Start free')}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="flex-1 gap-2"
                                                        onClick={() => router.visit(route('plans.index'))}
                                                    >
                                                        <Globe className="h-4 w-4" />
                                                        {t('Browse plans')}
                                                    </Button>
                                                </div>
                                                <p className="mt-3 text-center text-xs text-gray-400">
                                                    {t('You are currently on the free plan.')}
                                                </p>
                                            </div>
                                        )}

                                        {stepKey === 'confirm' && (
                                            <div className="py-4">
                                                {/* Confetti */}
                                                <div
                                                    className="pointer-events-none absolute inset-0 overflow-hidden"
                                                    aria-hidden
                                                >
                                                    {confettiPieces.map((piece, i) => (
                                                        <span
                                                            key={i}
                                                            className="absolute top-0 rounded-sm animate-confetti"
                                                            style={{
                                                                left: piece.left,
                                                                width: piece.size,
                                                                height: piece.size * 1.6,
                                                                backgroundColor: piece.color,
                                                                animationDelay: piece.delay,
                                                            }}
                                                        />
                                                    ))}
                                                </div>

                                                <div className="onboarding-stagger relative">
                                                    <div className="mb-6 text-center">
                                                        <div
                                                            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl animate-pop"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            <PartyPopper className="h-8 w-8 text-white" />
                                                        </div>
                                                        <h2 className="text-2xl font-bold text-gray-900">
                                                            {t('Almost there! Review your details.')}
                                                        </h2>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            {t('Review your selections and confirm to finish.')}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-2.5 rounded-2xl border border-gray-200 p-5">
                                                        {[
                                                            {
                                                                icon: User,
                                                                label: t('Your Name'),
                                                                value: data.name,
                                                            },
                                                            {
                                                                icon: Store,
                                                                label: t('Store Name'),
                                                                value: data.store_name,
                                                            },
                                                            {
                                                                icon: Globe,
                                                                label: t('Store URL'),
                                                                value: `${data.store_subdomain}.${storeDomain}`,
                                                                ltr: true,
                                                            },
                                                            {
                                                                icon: Languages,
                                                                label: t('Language'),
                                                                value:
                                                                    data.language === 'ar'
                                                                        ? t('Arabic')
                                                                        : t('English'),
                                                            },
                                                            {
                                                                icon: Coins,
                                                                label: t('Currency'),
                                                                value:
                                                                    currencies.find((c) => c.code === data.currency)?.name ||
                                                                    data.currency,
                                                            },
                                                            {
                                                                icon: Palette,
                                                                label: t('Theme'),
                                                                value:
                                                                    themes.find((th) => th.id === data.theme)?.name ||
                                                                    data.theme,
                                                            },
                                                        ].map((row, i) => (
                                                            <div
                                                                key={i}
                                                                className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm"
                                                            >
                                                                <span className="flex items-center gap-2 text-gray-500">
                                                                    <row.icon
                                                                        className="h-4 w-4"
                                                                        style={{ color: primaryColor }}
                                                                    />
                                                                    {row.label}
                                                                </span>
                                                                <span
                                                                    className="truncate font-semibold text-gray-900"
                                                                    dir={row.ltr ? 'ltr' : undefined}
                                                                >
                                                                    {row.value}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer navigation */}
                                    {stepKey !== 'welcome' && (
                                        <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                                            <Button type="button" variant="ghost" onClick={back} className="gap-1">
                                                <ChevronRight className="h-4 w-4" />
                                                {t('Back')}
                                            </Button>

                                            {stepKey === 'confirm' ? (
                                                <Button
                                                    onClick={submit}
                                                    disabled={processing}
                                                    className="gap-2 hover:-translate-y-0.5 transition-transform"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    {processing ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <PartyPopper className="h-4 w-4" />
                                                    )}
                                                    {t('Finish')}
                                                </Button>
                                            ) : stepKey === 'plans' ? null : (
                                                <Button
                                                    type="button"
                                                    onClick={next}
                                                    disabled={!canProceed() || (stepKey === 'store' && availability !== null && !availability.available)}
                                                    className="gap-1 hover:-translate-y-0.5 transition-transform"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    {t('Next')}
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
