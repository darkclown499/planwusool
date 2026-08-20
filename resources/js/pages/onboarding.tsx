import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { FlagIcon } from '@/components/FlagIcon';
import {
    Banknote,
    Check,
    CheckCircle2,
    ChevronDown,
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
    Palette,
    PartyPopper,
    Phone,
    ShieldCheck,
    ShoppingBag,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MediaPicker from '@/components/MediaPicker';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';
import { getTemplateConfig, getTemplateSummaries } from '@/templates/registry';
import type { PlanTier, TemplateSummary } from '@/templates/types';

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
    initialStep: number;
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
}

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

/**
 * Mini storefront mockup rendered from a template's design tokens so each card
 * shows the template's real colour identity (hero, header, product grid).
 */
function TemplateMiniPreview({ colors }: { colors: Record<string, string> }) {
    const bg = colors?.background || '#ffffff';
    const surface = colors?.surface || '#f9fafb';
    const primary = colors?.['primary-500'] || '#10b77f';
    const primarySoft = colors?.['primary-50'] || `${primary}14`;
    const primaryDeep = colors?.['primary-700'] || '#047857';
    const text = colors?.['text-primary'] || '#111827';
    const muted = colors?.['text-muted'] || '#6b7280';

    return (
        <div className="pointer-events-none h-28 w-full select-none overflow-hidden rounded-xl border border-black/5"
            style={{ backgroundColor: bg }}>
            {/* Header bar */}
            <div className="flex items-center justify-between px-3 pb-1 pt-2"
                style={{ backgroundColor: `${bg}f2`, borderBottom: `1px solid ${surface}` }}>
                <span className="flex items-center gap-1.5">
                    <span className="block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: primary }} />
                    <span className="block h-1.5 w-12 rounded-full" style={{ backgroundColor: primaryDeep, opacity: 0.55 }} />
                </span>
                <span className="flex items-center gap-1">
                    <span className="block h-1.5 w-5 rounded-full" style={{ backgroundColor: muted, opacity: 0.5 }} />
                    <span className="block h-1.5 w-5 rounded-full" style={{ backgroundColor: primary }} />
                </span>
            </div>

            {/* Hero banner */}
            <div className="mx-3 mt-2 flex items-center justify-between rounded-lg px-3 py-2.5"
                style={{ backgroundColor: primary, backgroundImage: `linear-gradient(120deg, ${primary}, ${primaryDeep})` }}>
                <span className="space-y-1">
                    <span className="block h-1.5 w-16 rounded-full bg-white/90" />
                    <span className="block h-1.5 w-10 rounded-full bg-white/50" />
                    <span className="mt-1 block h-2.5 w-8 rounded-full bg-white" />
                </span>
                <span className="block h-7 w-7 rounded-lg bg-white/25" />
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-4 gap-1.5 px-3 pb-3 pt-2">
                {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="space-y-1 rounded-md p-1.5"
                        style={{ backgroundColor: surface }}>
                        <span className="block h-7 w-full rounded-md"
                            style={{ backgroundColor: `${primarySoft}` }} />
                        <span className="block h-1 w-3/4 rounded-full" style={{ backgroundColor: muted, opacity: 0.55 }} />
                        <span className="block h-1 w-1/2 rounded-full" style={{ backgroundColor: primary, opacity: 0.8 }} />
                    </span>
                ))}
            </div>
        </div>
    );
}

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
    initialStep,
    defaults,
}: OnboardingProps) {
    const { t, i18n } = useTranslation();
    const { themeColor, customColor, titleText } = useBrand();
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
        timezone: defaults.timezone || 'Asia/Gaza',
        publish_store: defaults.publishStore !== undefined ? defaults.publishStore : true,
        import_demo_products: true,
        language: defaults.language || 'ar',
        currency: defaults.currency || 'ILS',
        theme: defaults.theme || 'core-minimal',
    });

    const [step, setStep] = useState(() =>
        Math.min(Math.max(initialStep || 0, 0), STEP_META.length - 1)
    );
    const [checking, setChecking] = useState(false);
    const [availability, setAvailability] = useState<{ available: boolean; message: string } | null>(null);
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const [pendingUpgradeTemplate, setPendingUpgradeTemplate] = useState<string | null>(null);

    // During onboarding the merchant is on the free plan until they finish,
    // so any template above the Starter tier is locked behind an upgrade.
    const isLockedTemplate = (tmpl: TemplateSummary): boolean => tmpl.plan_required !== 'starter';

    const openUpgrade = (slug: string) => {
        setPendingUpgradeTemplate(slug);
        setUpgradeOpen(true);
    };

    const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autosaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const stepKey = STEP_META[step].key;
    const progress = ((step + 1) / STEP_META.length) * 100;

    // Debounced autosave of the wizard progress so a refresh or a closed tab
    // never loses what the merchant already typed.
    useEffect(() => {
        if (stepKey === 'welcome') return;
        if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
        autosaveTimeout.current = setTimeout(() => {
            axios
                .post(route('onboarding.progress'), {
                    step: step + 1,
                    data: {
                        name: data.name,
                        storeName: data.store_name,
                        storeSubdomain: data.store_subdomain,
                        storeEmail: data.store_email,
                        storeDescription: data.store_description,
                        welcomeMessage: data.welcome_message,
                        whatsappEnabled: data.whatsapp_enabled,
                        whatsappPhone: data.whatsapp_phone,
                        address: data.address,
                        city: data.city,
                        country: data.country,
                        logo: data.logo,
                        timezone: data.timezone,
                        language: data.language,
                        currency: data.currency,
                        theme: data.theme,
                        publishStore: data.publish_store,
                    },
                })
                .catch(() => {
                    /* autosave is best-effort; the final submit persists everything */
                });
        }, 800);
        return () => {
            if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
        };
         
    }, [data, step, stepKey]);

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
        // Never send a paid template for a free-tire merchant — open the
        // upgrade prompt instead of letting the server bounce back to step 6.
        if (data.theme && themeBySlug.get(data.theme) && isLockedTemplate(themeBySlug.get(data.theme)!)) {
            openUpgrade(data.theme);
            return;
        }
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

    const themeCatalog: TemplateSummary[] = useMemo(() => getTemplateSummaries(), []);
    const themeBySlug = useMemo(() => new Map(themeCatalog.map((tmpl) => [tmpl.slug, tmpl])), [themeCatalog]);

    const TIER_LABEL: Record<PlanTier, string> = {
        starter: t('Free'),
        growth: t('Growth'),
        professional: t('Pro'),
    };

    const TIER_BADGE: Record<PlanTier, string> = {
        starter: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        growth: 'bg-sky-100 text-sky-700 border-sky-200',
        professional: 'bg-violet-100 text-violet-700 border-violet-200',
    };

    const themeColors = (slug: string): Record<string, string> => {
        const cfg = getTemplateConfig(slug);
        return (cfg?.design_tokens?.colors as Record<string, string>) || {};
    };

    const previewUrlFor = (slug: string): string =>
        demoStoreUrl
            ? `${demoStoreUrl}?theme=${encodeURIComponent(slug)}&preview=1`
            : `/demo?template=${encodeURIComponent(slug)}`;

    const featureChips = [
        { icon: Store, label: t('Your store on WhatsApp') },
        { icon: CreditCard, label: t('Multiple payment gateways') },
        { icon: Globe, label: t('Customizable store design') },
    ];

    const isStoreNameNonLatin = data.store_name.trim() !== '' && slugify(data.store_name) === '';

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-white font-sans">
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
                            <img
                                src="/images/logos/wusool-logo.png"
                                alt={titleText}
                                className="h-10 w-auto animate-pop"
                            />
                        </div>

                        <h1 className="animate-fade-slide mb-2 text-center text-3xl font-bold leading-tight text-white xl:text-4xl">
                            {t('Welcome to Wusool')}
                        </h1>
                        <p className="mb-6 max-w-sm text-center text-sm text-white/80">
                            {t("Let's get your store up and running in a few simple steps.")}
                        </p>

                        {/* How it works */}
                        <div className="w-full max-w-sm space-y-3 animate-fade-slide">
                            {[
                                {
                                    title: t('Create your store'),
                                    desc: t('Choose a name and a unique link for your store.'),
                                },
                                {
                                    title: t('Make it yours'),
                                    desc: t('Pick your language, currency, theme and contact details.'),
                                },
                                {
                                    title: t('Start selling'),
                                    desc: t('Share your store link and take orders through WhatsApp.'),
                                },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="onboarding-stagger flex items-start gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"
                                >
                                    <span
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold"
                                        style={{ color: primaryColor }}
                                    >
                                        {i + 1}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-white">{item.title}</div>
                                        <div className="mt-0.5 text-xs leading-relaxed text-white/70">{item.desc}</div>
                                    </div>
                                </div>
                            ))}
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
                            <img
                                src="/images/logos/wusool-logo.png"
                                alt={titleText}
                                className="h-8 w-auto"
                            />
                        </div>
                        <div className="ms-auto flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
                            <span
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {step + 1}
                            </span>
                            <span className="text-xs font-semibold text-gray-500">
                                / {STEP_META.length}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-start px-4 pb-10 pt-2 md:justify-center">
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
                                                {isDone ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setStep(i)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-full text-white transition-transform duration-300 hover:scale-110 sm:h-8 sm:w-8"
                                                        style={{ backgroundColor: primaryColor }}
                                                        aria-label={t('Go back to previous step')}
                                                    >
                                                        <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                    </button>
                                                ) : (
                                                    <div
                                                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition-all duration-300 sm:h-8 sm:w-8 ${
                                                            isCurrent
                                                                ? 'scale-105 text-white ring-4'
                                                                : 'border border-gray-300 text-gray-400'
                                                        }`}
                                                        style={{
                                                            backgroundColor: isCurrent ? primaryColor : undefined,
                                                            ...(isCurrent
                                                                ? ({ ['--tw-ring-color']: `${primaryColor}40` } as CSSProperties)
                                                                : {}),
                                                        }}
                                                    >
                                                        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                    </div>
                                                )}
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
                                <span
                                    className="absolute inset-x-0 top-0 h-1"
                                    style={{ background: `linear-gradient(90deg, ${primaryColor}b3, ${primaryColor})` }}
                                />
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
                                                <div className="mt-4">
                                                    <a
                                                        href={demoStoreUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                                                        style={{ color: primaryColor }}
                                                    >
                                                        <ExternalLink className="h-4 w-4" />
                                                        {t('See a live demo store')}
                                                    </a>
                                                </div>
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

                                                {/* Contact */}
                                                <div className="mb-3 flex items-center gap-2">
                                                    <MessageCircle className="h-4 w-4" style={{ color: primaryColor }} />
                                                    <span className="text-sm font-semibold text-gray-700">{t('Contact')}</span>
                                                    <span className="h-px flex-1 bg-gray-100" />
                                                </div>
                                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                                    <div>
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

                                                    <div>
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
                                                </div>

                                                {/* About your store */}
                                                <div className="mb-3 mt-6 flex items-center gap-2">
                                                    <Store className="h-4 w-4" style={{ color: primaryColor }} />
                                                    <span className="text-sm font-semibold text-gray-700">{t('About your store')}</span>
                                                    <span className="h-px flex-1 bg-gray-100" />
                                                </div>
                                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                                                </div>

                                                {/* Location */}
                                                <div className="mb-3 mt-6 flex items-center gap-2">
                                                    <MapPin className="h-4 w-4" style={{ color: primaryColor }} />
                                                    <span className="text-sm font-semibold text-gray-700">{t('Location (optional)')}</span>
                                                    <span className="h-px flex-1 bg-gray-100" />
                                                </div>
                                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                                                                placeholder={t('Salah al-Din Street 291')}
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
                                                            placeholder={t('Ramallah')}
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
                                                            placeholder={t('Palestine')}
                                                            className="mt-2 h-12 rounded-xl"
                                                        />
                                                        {errors.country && (
                                                            <p className="mt-2 text-sm text-red-600">{errors.country}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Preferences */}
                                                <div className="mb-3 mt-6 flex items-center gap-2">
                                                    <Globe className="h-4 w-4" style={{ color: primaryColor }} />
                                                    <span className="text-sm font-semibold text-gray-700">{t('Preferences')}</span>
                                                    <span className="h-px flex-1 bg-gray-100" />
                                                </div>
                                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                                                        <div className="relative mt-2">
                                                            <select
                                                                id="timezone"
                                                                value={data.timezone}
                                                                onChange={(e) => setData('timezone', e.target.value)}
                                                                className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3 pe-9 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                                                                dir="ltr"
                                                            >
                                                                {Object.entries(timezones).map(([value, label]) => (
                                                                    <option key={value} value={value}>
                                                                        {label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                        </div>
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
                                                            <FlagIcon
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
                                                <div className="mb-6 flex items-center gap-3">
                                                    <div
                                                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                                                        style={{ backgroundColor: `${primaryColor}1a` }}
                                                    >
                                                        <Palette className="h-5 w-5" style={{ color: primaryColor }} />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-gray-900">
                                                            {t('Choose a design')}
                                                        </h2>
                                                        <p className="text-sm text-gray-500">
                                                            {t('Pick the look of your store. Preview any design live — you can change it anytime.')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    {themeCatalog.map((tmpl) => {
                                                        const selected = data.theme === tmpl.slug;
                                                        const locked = isLockedTemplate(tmpl);
                                                        return (
                                                            <div
                                                                key={tmpl.slug}
                                                                className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white text-start transition-all duration-300 ${
                                                                    locked
                                                                        ? 'border-gray-200'
                                                                        : selected
                                                                          ? 'border-primary shadow-lg shadow-primary/10 hover:-translate-y-1 hover:shadow-xl'
                                                                          : 'border-gray-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl'
                                                                }`}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    onClick={() => (locked ? openUpgrade(tmpl.slug) : setData('theme', tmpl.slug))}
                                                                    className="w-full text-start"
                                                                >
                                                                    <div className="relative">
                                                                        <div className={locked ? 'opacity-40' : ''}>
                                                                            <TemplateMiniPreview colors={themeColors(tmpl.slug)} />
                                                                        </div>
                                                                        <span
                                                                            className={`absolute end-2.5 top-2.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TIER_BADGE[tmpl.plan_required]}`}
                                                                        >
                                                                            {locked
                                                                                ? (
                                                                                    <span className="inline-flex items-center gap-1">
                                                                                        <Lock className="h-2.5 w-2.5" />
                                                                                        {TIER_LABEL[tmpl.plan_required]}
                                                                                    </span>
                                                                                )
                                                                                : TIER_LABEL[tmpl.plan_required]}
                                                                        </span>
                                                                        {selected && !locked && (
                                                                            <span
                                                                                className="absolute start-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-white animate-pop"
                                                                                style={{ backgroundColor: primaryColor }}
                                                                            >
                                                                                <Check className="h-4 w-4" />
                                                                            </span>
                                                                        )}
                                                                        {locked && (
                                                                            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-white/55">
                                                                                <span
                                                                                    className="flex h-11 w-11 items-center justify-center rounded-full text-white"
                                                                                    style={{ backgroundColor: primaryColor }}
                                                                                >
                                                                                    <Lock className="h-5 w-5" />
                                                                                </span>
                                                                                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-gray-700 shadow">
                                                                                    {t('Available on Pro')}
                                                                                </span>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="px-4 pb-4 pt-3">
                                                                        <span className="flex items-center gap-2">
                                                                            <span className="font-bold text-gray-900">
                                                                                {tmpl.name}
                                                                            </span>
                                                                        </span>
                                                                        <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-gray-500">
                                                                            {tmpl.description}
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                                <div className="mt-auto px-4 pb-4">
                                                                    <a
                                                                        href={previewUrlFor(tmpl.slug)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:border-primary hover:text-primary"
                                                                    >
                                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                                        {t('Preview design')}
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
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
                                                                    label: t('Design'),
                                                                    value:
                                                                        themeBySlug.get(data.theme)?.name ||
                                                                        themeBySlug.get(data.theme)?.name_en ||
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
                                        <div className="mt-8 flex items-center justify-between gap-3 border-t border-gray-100 pt-6">
                                            <Button type="button" variant="ghost" onClick={back} className="h-11 gap-1 rounded-xl px-4">
                                                <ChevronRight className="h-4 w-4" />
                                                {t('Back')}
                                            </Button>

                                            {stepKey === 'confirm' ? (
                                                <Button
                                                    onClick={submit}
                                                    disabled={processing}
                                                    className="h-11 gap-2 rounded-xl px-6 hover:-translate-y-0.5 transition-transform"
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
                                                    className="h-11 gap-1 rounded-xl px-6 hover:-translate-y-0.5 transition-transform"
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

            <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('Upgrade to Pro')}</DialogTitle>
                        <DialogDescription>
                            {t('التصميم')} «{pendingUpgradeTemplate ? themeBySlug.get(pendingUpgradeTemplate)?.name ?? '' : ''}» {t('متوفر في الباقة الاحترافية (Pro). قم بالترقية لفتحه وجميع المزايا.')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={() => setUpgradeOpen(false)}>
                            {t('Later')}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setUpgradeOpen(false);
                                window.location.href = route('plans.index');
                            }}
                            style={{ backgroundColor: primaryColor }}
                        >
                            {t('Upgrade now')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}