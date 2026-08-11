import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import ReactCountryFlag from 'react-country-flag';
import {
    Banknote,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Coins,
    Contact,
    CreditCard,
    ExternalLink,
    Globe,
    Languages,
    Loader2,
    Lock,
    Mail,
    MapPin,
    MessageCircle,
    Monitor,
    Palette,
    PartyPopper,
    Phone,
    ShieldCheck,
    ShoppingBag,
    Smartphone,
    Sparkles,
    Store,
    User,
    type LucideIcon,
} from 'lucide-react';
import axios from 'axios';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { getStoreThemes } from '@/data/storeThemes';
import { TemplatePreviewCard } from '@/templates/TemplatePreviewCard';
import MediaPicker from '@/components/MediaPicker';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';

interface Currency {
    code: string;
    symbol: string;
    name: string;
}

interface OnboardingProps {
    demoStoreUrl: string;
    storeDomain: string;
    currencies: Currency[];
    timezones: Record<string, string>;
    defaults: {
        name: string;
        storeName: string;
        language: string;
        currency: string;
        theme: string;
        storeEmail: string;
        storeDescription: string;
        welcomeMessage: string;
        whatsappEnabled: boolean;
        whatsappPhone: string;
        address: string;
        city: string;
        country: string;
        logo: string;
        timezone: string;
        publishStore: boolean;
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
    { key: 'details', icon: Contact },
    { key: 'language', icon: Languages },
    { key: 'currency', icon: Coins },
    { key: 'theme', icon: Palette },
    { key: 'confirm', icon: CheckCircle2 },
];

// Maps every form field to the step index that owns it so we can jump the
// wizard to the correct step when the server rejects the submission.
const FIELD_STEP: Record<string, number> = {
    name: 1,
    store_name: 2,
    store_subdomain: 2,
    store_email: 3,
    store_description: 3,
    welcome_message: 3,
    whatsapp_enabled: 3,
    whatsapp_phone: 3,
    address: 3,
    city: 3,
    country: 3,
    logo: 3,
    timezone: 3,
    publish_store: 3,
    language: 4,
    currency: 5,
    theme: 6,
};

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

const WHATSAPP_PATTERN = /^\+[1-9]\d{1,14}$/;
const EMAIL_PATTERN = /\S+@\S+\.\S+/;

export default function Onboarding({
    demoStoreUrl,
    storeDomain,
    currencies,
    timezones,
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
        store_email: defaults.storeEmail || '',
        store_description: defaults.storeDescription || '',
        welcome_message: defaults.welcomeMessage || '',
        whatsapp_enabled: defaults.whatsappEnabled || false,
        whatsapp_phone: defaults.whatsappPhone || '',
        address: defaults.address || '',
        city: defaults.city || '',
        country: defaults.country || '',
        logo: defaults.logo || '',
        timezone: defaults.timezone || 'UTC',
        publish_store: defaults.publishStore !== undefined ? defaults.publishStore : true,
        import_demo_products: true,
        language: defaults.language || 'ar',
        currency: defaults.currency || 'ILS',
        theme: defaults.theme || 'basic',
    });

    const [step, setStep] = useState(0);
    const [deviceView, setDeviceView] = useState<'phone' | 'desktop'>('phone');
    const [checking, setChecking] = useState(false);
    const [availability, setAvailability] = useState<{ available: boolean; message: string } | null>(null);
    const [previewLoaded, setPreviewLoaded] = useState(false);
    const [previewFailed, setPreviewFailed] = useState(false);
    const [generalError, setGeneralError] = useState<string | null>(null);

    const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const themes = getStoreThemes();
    const stepKey = STEP_META[step].key;
    const progress = ((step + 1) / STEP_META.length) * 100;
    const selectedTheme = themes.find((t) => t.id === data.theme);
    const accent = selectedTheme?.primaryColor || THEME_ACCENT[data.theme] || primaryColor;

    // The demo store preview unlocks all themes when ?preview=1 is present, so
    // premium templates render cleanly without any "upgrade required" blocks.
    const previewUrl = useMemo(() => {
        const base = stepKey === 'theme' ? `${demoStoreUrl}?theme=${encodeURIComponent(data.theme)}` : demoStoreUrl;
        const sep = base.includes('?') ? '&' : '?';
        return `${base}${sep}preview=1`;
    }, [demoStoreUrl, stepKey, data.theme]);

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

    // Keep the loading overlay in sync whenever the preview iframe reloads,
    // and fall back gracefully if the preview cannot load in time.
    useEffect(() => {
        setPreviewLoaded(false);
        setPreviewFailed(false);
        if (previewTimer.current) clearTimeout(previewTimer.current);
        previewTimer.current = setTimeout(() => {
            setPreviewFailed(true);
        }, 10000);
        return () => {
            if (previewTimer.current) clearTimeout(previewTimer.current);
        };
    }, [previewUrl, deviceView]);

    // Auto-suggest a subdomain from the store name, but never overwrite the
    // value the user typed manually.
    const updateSubdomainFromStoreName = (name: string) => {
        if (data.store_subdomain.trim() !== '') {
            return;
        }
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
            setGeneralError(null);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { errors?: { subdomain?: string[] } } } };
            const message = err?.response?.data?.errors?.subdomain?.[0];
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

    // Debounced availability check while typing the subdomain.
    useEffect(() => {
        if (stepKey !== 'store') return;
        const sub = data.store_subdomain.trim();
        if (!sub || sub.length < 3) return;
        if (checkTimeout.current) clearTimeout(checkTimeout.current);
        checkTimeout.current = setTimeout(() => {
            runAvailabilityCheck();
        }, 500);
        return () => {
            if (checkTimeout.current) clearTimeout(checkTimeout.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.store_subdomain, stepKey]);

    const selectLanguage = (code: string) => {
        setData('language', code);
        i18n.changeLanguage(code);
    };

    const canProceed = () => {
        switch (stepKey) {
            case 'name':
                return data.name.trim().length > 0;
            case 'store':
                return (
                    data.store_name.trim().length > 0 &&
                    data.store_subdomain.trim().length > 0 &&
                    availability !== null &&
                    availability.available
                );
            case 'details':
                if (data.whatsapp_enabled && data.whatsapp_phone.trim() !== '' && !WHATSAPP_PATTERN.test(data.whatsapp_phone.trim())) {
                    return false;
                }
                if (data.whatsapp_enabled && data.whatsapp_phone.trim() === '') {
                    return false;
                }
                if (data.store_email.trim() !== '' && !EMAIL_PATTERN.test(data.store_email.trim())) {
                    return false;
                }
                return true;
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
        if (stepKey === 'store' && (!availability || !availability.available)) {
            return;
        }
        if (stepKey === 'details' && !canProceed()) {
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
        setGeneralError(null);
        post(route('onboarding.store'), {
            onError: (errs) => {
                const keys = Object.keys(errs);
                if (keys.length) {
                    const idx = FIELD_STEP[keys[0]];
                    if (typeof idx === 'number') {
                        setStep(idx);
                    }
                }
                setGeneralError(Object.values(errs)[0] as string);
            },
        });
    };

    // Keyboard navigation: Enter advances, arrows move back/forward.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (processing) return;
            if (e.key !== 'Enter' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

            if (e.key === 'Enter') {
                if (stepKey === 'welcome') {
                    setStep(1);
                    return;
                }
                if (stepKey === 'confirm') {
                    submit();
                    return;
                }
                if (e.key === 'Enter' && canProceed()) {
                    next();
                }
                return;
            }

            if (stepKey === 'welcome' || stepKey === 'confirm') return;
            if (e.key === 'ArrowRight') {
                next();
            } else if (e.key === 'ArrowLeft') {
                back();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    const langOptions = [
        { code: 'ar', name: t('Arabic'), countryCode: 'SA' },
        { code: 'en', name: t('English'), countryCode: 'GB' },
    ];

    const featureChips = [
        { icon: Store, label: t('Your store on WhatsApp') },
        { icon: Palette, label: t('Professional themes') },
        { icon: CreditCard, label: t('Multiple payment gateways') },
    ];

    const isStoreNameNonLatin = data.store_name.trim() !== '' && slugify(data.store_name) === '';

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
                                    <div className="relative">
                                        {/* Side buttons */}
                                        <div className="absolute -start-[3px] top-24 h-10 w-[3px] rounded-l bg-gray-900/80" />
                                        <div className="absolute -start-[3px] top-40 h-6 w-[3px] rounded-l bg-gray-900/80" />
                                        <div className="absolute -end-[3px] top-32 h-14 w-[3px] rounded-r bg-gray-900/80" />
                                        {/* Frame */}
                                        <div className="relative overflow-hidden rounded-[2.8rem] border-[8px] border-gray-900 bg-gray-900 shadow-2xl">
                                            {/* Dynamic island */}
                                            <div className="absolute left-1/2 top-2.5 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
                                            {/* Real mobile store render (375px viewport) scaled to the phone screen */}
                                            <div className="relative pointer-events-none bg-white [zoom:0.62] xl:[zoom:0.66]">
                                                {!previewLoaded && !previewFailed && (
                                                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
                                                        <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
                                                    </div>
                                                )}
                                                {previewFailed && (
                                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-100 p-6 text-center">
                                                        <Monitor className="h-8 w-8 text-gray-300" />
                                                        <p className="text-xs text-gray-500">
                                                            {t('Could not load the live preview.')}
                                                        </p>
                                                        <a
                                                            href={previewUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
                                                        >
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                            {t('Open in new tab')}
                                                        </a>
                                                    </div>
                                                )}
                                                <iframe
                                                    src={previewUrl}
                                                    title={t('Live store preview')}
                                                    loading="lazy"
                                                    onLoad={() => {
                                                        setPreviewLoaded(true);
                                                        setPreviewFailed(false);
                                                        if (previewTimer.current) clearTimeout(previewTimer.current);
                                                    }}
                                                    className="block h-[812px] w-[375px] border-0 bg-white"
                                                />
                                            </div>
                                            {/* Home indicator */}
                                            <div className="absolute bottom-2 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-gray-900/70" />
                                        </div>
                                        {/* Floating WhatsApp bubble */}
                                        <a
                                            href={demoData?.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="absolute bottom-9 end-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl animate-pulse"
                                            title={t('Open real store')}
                                        >
                                            <MessageCircle className="h-5 w-5" />
                                        </a>
                                    </div>
                                ) : (
                                    <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl">
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
                                                {demoData?.name || ''}
                                            </span>
                                        </div>
                                        {/* Real desktop store render (1200px viewport) scaled to the browser window */}
                                        <div className="relative pointer-events-none overflow-hidden [zoom:0.32] lg:[zoom:0.38] xl:[zoom:0.45] 2xl:[zoom:0.5]">
                                            {!previewLoaded && !previewFailed && (
                                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100">
                                                    <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
                                                </div>
                                            )}
                                            {previewFailed && (
                                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gray-100 p-6 text-center">
                                                    <Monitor className="h-10 w-10 text-gray-300" />
                                                    <p className="text-sm text-gray-500">
                                                        {t('Could not load the live preview.')}
                                                    </p>
                                                    <a
                                                        href={previewUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-medium text-white"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        {t('Open in new tab')}
                                                    </a>
                                                </div>
                                            )}
                                            <iframe
                                                src={previewUrl}
                                                title={t('Live store preview')}
                                                loading="lazy"
                                                onLoad={() => {
                                                    setPreviewLoaded(true);
                                                    setPreviewFailed(false);
                                                    if (previewTimer.current) clearTimeout(previewTimer.current);
                                                }}
                                                className="block h-[800px] w-[1200px] border-0 bg-white"
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
                        <div className="ms-auto text-xs font-medium text-gray-400">
                            {Math.round(progress)}%
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-center px-4 pb-10 pt-2">
                        <div className="mx-auto w-full max-w-xl">
                            {/* Step indicators */}
                            <div className="mb-5 overflow-x-auto scrollbar-custom">
                                <div className="mx-auto flex w-max items-center justify-center gap-1 sm:gap-1.5">
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
                                                    ...(isCurrent
                                                        ? ({ ['--tw-ring-color']: `${primaryColor}40` } as CSSProperties)
                                                        : {}),
                                                }}
                                                >
                                                    {isDone ? <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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
                                {generalError && (
                                    <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-6 py-3 text-sm font-medium text-red-700">
                                        <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                                        {generalError}
                                    </div>
                                )}
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
                                                    autoFocus
                                                />
                                                {isStoreNameNonLatin && (
                                                    <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                                                        <Globe className="h-3.5 w-3.5 shrink-0" />
                                                        {t('Your store name uses a non-Latin script, so the subdomain could not be created automatically. Please type it manually below.')}
                                                    </p>
                                                )}
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
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                        <div className="relative flex-1">
                                                            <Input
                                                                id="store_subdomain"
                                                                value={data.store_subdomain}
                                                                onChange={(e) => {
                                                                    setData('store_subdomain', e.target.value.toLowerCase());
                                                                    setAvailability(null);
                                                                }}
                                                                placeholder="my-store"
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
                                                            {availability.available ? (
                                                                <Check className="h-4 w-4" />
                                                            ) : (
                                                                <span className="text-base leading-none">!</span>
                                                            )}
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

                                        {stepKey === 'details' && (
                                            <div className="onboarding-stagger py-4">
                                                <div className="mb-6 flex items-center gap-3">
                                                    <div
                                                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                                                        style={{ backgroundColor: `${primaryColor}1a` }}
                                                    >
                                                        <Contact className="h-5 w-5" style={{ color: primaryColor }} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-gray-900">
                                                            {t('Store details & contact')}
                                                        </h2>
                                                        <p className="text-sm text-gray-500">
                                                            {t('Add the details customers need to reach you. You can edit them anytime.')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                                    <div className="sm:col-span-1">
                                                        <Label htmlFor="store_email" className="text-sm font-medium">
                                                            {t('Store email')}
                                                        </Label>
                                                        <div className="relative mt-2">
                                                            <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                            <Input
                                                                id="store_email"
                                                                type="email"
                                                                value={data.store_email}
                                                                onChange={(e) => setData('store_email', e.target.value)}
                                                                placeholder="store@example.com"
                                                                className="h-12 rounded-xl ps-9"
                                                                dir="ltr"
                                                            />
                                                        </div>
                                                        {errors.store_email && (
                                                            <p className="mt-2 text-sm text-red-600">{errors.store_email}</p>
                                                        )}
                                                    </div>

                                                    <div className="sm:col-span-1">
                                                        <Label className="text-sm font-medium">
                                                            {t('WhatsApp number')}
                                                        </Label>
                                                        <div className="relative mt-2">
                                                            <Phone className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                            <Input
                                                                id="whatsapp_phone"
                                                                value={data.whatsapp_phone}
                                                                onChange={(e) => setData('whatsapp_phone', e.target.value)}
                                                                placeholder="+9705"
                                                                className="h-12 rounded-xl ps-9"
                                                                dir="ltr"
                                                            />
                                                        </div>
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <Switch
                                                                id="whatsapp_enabled"
                                                                checked={data.whatsapp_enabled}
                                                                onCheckedChange={(v) => setData('whatsapp_enabled', !!v)}
                                                                className="data-[state=checked]:bg-[#25D366]"
                                                            />
                                                            <Label htmlFor="whatsapp_enabled" className="text-xs text-gray-500">
                                                                {t('Show the WhatsApp button on my store')}
                                                            </Label>
                                                        </div>
                                                        {data.whatsapp_enabled && data.whatsapp_phone.trim() !== '' && !WHATSAPP_PATTERN.test(data.whatsapp_phone.trim()) && (
                                                            <p className="mt-2 text-sm text-red-600">
                                                                {t('Use the international format, e.g. +9705...')}
                                                            </p>
                                                        )}
                                                        {data.whatsapp_enabled && data.whatsapp_phone.trim() === '' && (
                                                            <p className="mt-2 text-sm text-amber-600">
                                                                {t('Enter a WhatsApp number to show the button.')}
                                                            </p>
                                                        )}
                                                        {errors.whatsapp_phone && (
                                                            <p className="mt-2 text-sm text-red-600">{errors.whatsapp_phone}</p>
                                                        )}
                                                    </div>

                                                    <div className="sm:col-span-2">
                                                        <Label htmlFor="welcome_message" className="text-sm font-medium">
                                                            {t('Welcome message')}
                                                        </Label>
                                                        <Input
                                                            id="welcome_message"
                                                            value={data.welcome_message}
                                                            onChange={(e) => setData('welcome_message', e.target.value)}
                                                            placeholder={t('E.g. Welcome to our store!')}
                                                            className="mt-2 h-12 rounded-xl"
                                                        />
                                                        {errors.welcome_message && (
                                                            <p className="mt-2 text-sm text-red-600">{errors.welcome_message}</p>
                                                        )}
                                                    </div>

                                                    <div className="sm:col-span-2">
                                                        <Label htmlFor="store_description" className="text-sm font-medium">
                                                            {t('Store description')}
                                                        </Label>
                                                        <Textarea
                                                            id="store_description"
                                                            value={data.store_description}
                                                            onChange={(e) => setData('store_description', e.target.value)}
                                                            placeholder={t('A short description of your store and what you sell.')}
                                                            className="mt-2 min-h-[80px] rounded-xl"
                                                        />
                                                        {errors.store_description && (
                                                            <p className="mt-2 text-sm text-red-600">{errors.store_description}</p>
                                                        )}
                                                    </div>

                                                    <div className="sm:col-span-2">
                                                        <Label className="text-sm font-medium">
                                                            {t('Store logo')}
                                                        </Label>
                                                        <div className="mt-2">
                                                            <MediaPicker
                                                                value={data.logo}
                                                                onChange={(v) => setData('logo', v)}
                                                                placeholder={t('Select a logo image')}
                                                                showPreview
                                                            />
                                                        </div>
                                                        {errors.logo && (
                                                            <p className="mt-2 text-sm text-red-600">{errors.logo}</p>
                                                        )}
                                                    </div>

                                                    <div className="sm:col-span-2">
                                                        <Label htmlFor="address" className="text-sm font-medium">
                                                            {t('Address')}
                                                        </Label>
                                                        <div className="relative mt-2">
                                                            <MapPin className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                            <Input
                                                                id="address"
                                                                value={data.address}
                                                                onChange={(e) => setData('address', e.target.value)}
                                                                placeholder={t('Street address')}
                                                                className="h-12 rounded-xl ps-9"
                                                            />
                                                        </div>
                                                        {errors.address && (
                                                            <p className="mt-2 text-sm text-red-600">{errors.address}</p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="city" className="text-sm font-medium">
                                                            {t('City')}
                                                        </Label>
                                                        <Input
                                                            id="city"
                                                            value={data.city}
                                                            onChange={(e) => setData('city', e.target.value)}
                                                            placeholder={t('City')}
                                                            className="mt-2 h-12 rounded-xl"
                                                        />
                                                        {errors.city && (
                                                            <p className="mt-2 text-sm text-red-600">{errors.city}</p>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <Label htmlFor="country" className="text-sm font-medium">
                                                            {t('Country')}
                                                        </Label>
                                                        <Input
                                                            id="country"
                                                            value={data.country}
                                                            onChange={(e) => setData('country', e.target.value)}
                                                            placeholder={t('Country')}
                                                            className="mt-2 h-12 rounded-xl"
                                                        />
                                                        {errors.country && (
                                                            <p className="mt-2 text-sm text-red-600">{errors.country}</p>
                                                        )}
                                                    </div>

                                                    <div className="sm:col-span-2">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <Label htmlFor="timezone" className="text-sm font-medium">
                                                                {t('Timezone')}
                                                            </Label>
                                                            {typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setData('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)}
                                                                    className="text-xs font-medium transition-colors hover:opacity-80"
                                                                    style={{ color: primaryColor }}
                                                                >
                                                                    {t('Detect automatically')}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <select
                                                            id="timezone"
                                                            value={data.timezone}
                                                            onChange={(e) => setData('timezone', e.target.value)}
                                                            className="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                            dir="ltr"
                                                        >
                                                            {Object.entries(timezones).map(([value, label]) => (
                                                                <option key={value} value={value}>
                                                                    {label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {errors.timezone && (
                                                            <p className="mt-2 text-sm text-red-600">{errors.timezone}</p>
                                                        )}
                                                    </div>

                                                    <div className="sm:col-span-2 rounded-2xl border border-gray-200 p-4">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div>
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {t('Publish my store now')}
                                                                </div>
                                                                <p className="mt-1 text-xs text-gray-500">
                                                                    {t('Your store goes live on your subdomain as soon as you finish. Turn this off to build quietly first.')}
                                                                </p>
                                                            </div>
                                                            <Switch
                                                                checked={data.publish_store}
                                                                onCheckedChange={(v) => setData('publish_store', !!v)}
                                                            />
                                                        </div>
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
                                                        <TemplatePreviewCard
                                                            key={theme.id}
                                                            template={{
                                                                slug: theme.id,
                                                                name: theme.name,
                                                                description: theme.description,
                                                                category: theme.category || 'general',
                                                                is_free: theme.isFree ?? true,
                                                                plan_required: 'starter',
                                                                design_tokens: theme.designTokens,
                                                                sections: [],
                                                                layout: { container: 'container mx-auto px-4', spacing: 'normal' },
                                                            }}
                                                            demoStoreUrl={demoStoreUrl}
                                                            isActive={data.theme === theme.id}
                                                            onSelect={() => setData('theme', theme.id)}
                                                        />
                                                    ))}
                                                </div>
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

                                                    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                                                        <input
                                                            id="import_demo"
                                                            type="checkbox"
                                                            checked={data.import_demo_products}
                                                            onChange={(e) => setData('import_demo_products', e.target.checked)}
                                                            className="mt-1 h-4 w-4 rounded border-gray-300 accent-emerald-600"
                                                        />
                                                        <div>
                                                            <Label htmlFor="import_demo" className="text-sm font-semibold text-gray-900">
                                                                {t('Start with demo products')}
                                                            </Label>
                                                            <p className="mt-1 text-xs text-gray-500">
                                                                {t('Import a sample catalog so your store is not empty. You can edit or remove everything later.')}
                                                            </p>
                                                        </div>
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
                                                                icon: Mail,
                                                                label: t('Store Email'),
                                                                value: data.store_email || '—',
                                                                ltr: true,
                                                            },
                                                            ...(data.whatsapp_enabled && data.whatsapp_phone
                                                                ? [
                                                                      {
                                                                          icon: MessageCircle,
                                                                          label: t('WhatsApp'),
                                                                          value: data.whatsapp_phone,
                                                                          ltr: true,
                                                                      },
                                                                  ]
                                                                : []),
                                                            ...(data.city || data.country
                                                                ? [
                                                                      {
                                                                          icon: MapPin,
                                                                          label: t('Location'),
                                                                          value: [data.city, data.country].filter(Boolean).join(', '),
                                                                      },
                                                                  ]
                                                                : []),
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
                                                            {
                                                                icon: Globe,
                                                                label: t('Status'),
                                                                value: data.publish_store
                                                                    ? t('Published')
                                                                    : t('Draft (not published)'),
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
                                            ) : (
                                                <Button
                                                    type="button"
                                                    onClick={next}
                                                    disabled={!canProceed()}
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