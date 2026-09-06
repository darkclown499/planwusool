import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
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
Brush,
ExternalLink,
Globe,
Languages,
Search,
    Loader2,
    Lock,
    Mail,
    MapPin,
    MessageCircle,
    Palette,
    PartyPopper,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import MediaPicker from '@/components/MediaPicker';
import { PhoneCountryInput } from '@/components/PhoneCountryInput';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COUNTRIES } from '@/lib/countries';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';
import { listTemplateModules, type PlanTier } from '@/templates-v2/registry';

interface Currency {
    code: string;
    symbol: string;
    name: string;
}

/** Wizard filter tabs → v2 template sectors. */
const THEME_CATEGORY_MATCH: Record<string, string[] | null> = {
    grocery: ['بقالة وسوبرماركت'],
    restaurants: ['مطاعم', 'مخبز وحلويات'],
    fashion: ['أزياء ومحجبات'],
    electronics: ['إلكترونيات وتقنية'],
    general: ['سوق عام'],
};

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

const STEP_META: { key: string; labelKey: string; icon: LucideIcon }[] = [
    { key: 'welcome', labelKey: 'Welcome', icon: Sparkles },
    { key: 'name', labelKey: 'Your Name', icon: User },
    { key: 'store', labelKey: 'Store name', icon: Store },
    { key: 'details', labelKey: 'How customers reach you', icon: Contact },
    { key: 'branding', labelKey: 'Brand your store', icon: Brush },
    { key: 'language', labelKey: 'Language', icon: Languages },
    { key: 'currency', labelKey: 'Currency', icon: Coins },
    { key: 'theme', labelKey: 'Design', icon: Palette },
    { key: 'confirm', labelKey: 'Review', icon: CheckCircle2 },
];

// Maps every form field to the step index that owns it so we can jump the
// wizard to the correct step when the server rejects the submission.
const FIELD_STEP: Record<string, number> = {
    name: 1,
    store_name: 2,
    store_subdomain: 2,
    // Contact step
    whatsapp_enabled: 3,
    whatsapp_phone: 3,
    store_email: 3,
    // Branding step (all optional)
    store_description: 4,
    welcome_message: 4,
    address: 4,
    city: 4,
    country: 4,
    logo: 4,
    timezone: 4,
    publish_store: 4,
    language: 5,
    currency: 6,
    theme: 7,
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
        import_demo_products: false,
        language: defaults.language || 'ar',
        currency: defaults.currency || 'ILS',
        theme: defaults.theme || 'bazaar-market',
    });

    const [step, setStep] = useState(() =>
        Math.min(Math.max(initialStep || 0, 0), STEP_META.length - 1)
    );
    const [checking, setChecking] = useState(false);
    const [availability, setAvailability] = useState<{ available: boolean; message: string } | null>(null);
    const [currencySearch, setCurrencySearch] = useState('');
    const [countryOpen, setCountryOpen] = useState(false);
    const [countrySearchQuery, setCountrySearchQuery] = useState('');
    const [themeCategory, setThemeCategory] = useState('all');
    const [generalError, setGeneralError] = useState<string | null>(null);
    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const [pendingUpgradeTemplate, setPendingUpgradeTemplate] = useState<string | null>(null);

    // During onboarding the merchant is on the free plan until they finish,
    // so any template above the Starter tier is locked behind an upgrade.
    const isLockedTemplate = (tmpl: { plan_required: PlanTier }): boolean => tmpl.plan_required !== 'starter';

    const openUpgrade = (slug: string) => {
        setPendingUpgradeTemplate(slug);
        setUpgradeOpen(true);
    };

    const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autosaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const saveResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

    const stepKey = STEP_META[step].key;

    const flashSaved = () => {
        setSaveState('saved');
        if (saveResetTimeout.current) clearTimeout(saveResetTimeout.current);
        saveResetTimeout.current = setTimeout(() => setSaveState('idle'), 1600);
    };

    // Debounced autosave of the wizard progress so a refresh or a closed tab
    // never loses what the merchant already typed.
    useEffect(() => {
        if (stepKey === 'welcome') return;
        if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
        autosaveTimeout.current = setTimeout(() => {
            setSaveState('saving');
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
                .then(() => {
                    flashSaved();
                })
                .catch(() => {
                    setSaveState('idle');
                    /* autosave is best-effort; the final submit persists everything */
                });
        }, 800);
        return () => {
            if (autosaveTimeout.current) clearTimeout(autosaveTimeout.current);
            if (saveResetTimeout.current) clearTimeout(saveResetTimeout.current);
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

    // Subdomain slug: only lowercase latin letters, numbers and single hyphens.
    // Arabic text, spaces, uppercase and symbols are stripped as you type.
    const handleSlugChange = (e: ChangeEvent<HTMLInputElement>) => {
        const sanitized = e.target.value
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '') // Remove invalid characters instantly
            .replace(/--+/g, '-'); // Prevent double hyphens
        setData('store_subdomain', sanitized);
        setAvailability(null);
    };

    // Popular/regional currencies float to the top; search filters by code, name or symbol.
    const visibleCurrencies = useMemo(() => {
        const PRIORITY = ['ILS', 'USD', 'JOD', 'EUR', 'SAR', 'AED'];
        const rank = (code: string) => {
            const i = PRIORITY.indexOf(code);
            return i === -1 ? 99 : i;
        };
        const q = currencySearch.trim();
        if (!q) return [...currencies].sort((a, b) => rank(a.code) - rank(b.code));
        const lq = q.toLowerCase();
        return currencies.filter(
            (c) => c.code.toLowerCase().includes(lq) || c.name.includes(q) || c.symbol.includes(q),
        );
    }, [currencies, currencySearch]);

    // Location country: resolve the stored name back to a COUNTRIES entry for flag display.
    const selectedLocationCountry = useMemo(
        () => COUNTRIES.find((c) => c.name === data.country || c.nameEn === data.country) ?? null,
        [data.country],
    );
    const filteredLocationCountries = useMemo(() => {
        const q = countrySearchQuery.trim().toLowerCase();
        if (!q) return COUNTRIES;
        return COUNTRIES.filter((c) => c.name.includes(countrySearchQuery.trim()) || c.nameEn.toLowerCase().includes(q));
    }, [countrySearchQuery]);

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
        // Never send a paid template for a free-tier merchant - open the
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

    // Offer exactly the catalog the backend validates against (the 14
    // builder templates) so a choice made in the wizard can never be
    // rejected at submit time by slug drift between registries.
    const themeCatalog = useMemo(
        () =>
            listTemplateModules().map((m) => ({
                slug: m.meta.slug as string,
                name: m.meta.name,
                name_en: m.meta.name_en,
                description: m.meta.description,
                category: m.meta.sector,
                plan_required: m.meta.plan_required,
                preview: m.meta.preview,
                accent: m.meta.accent,
            })),
        []
    );
    const visibleTemplates = useMemo(() => {
        if (themeCategory === 'all') return themeCatalog;
        const sectors = THEME_CATEGORY_MATCH[themeCategory];
        if (!sectors) return themeCatalog;
        return themeCatalog.filter((tmpl) => sectors.includes(tmpl.category));
    }, [themeCatalog, themeCategory]);
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

    const previewUrlFor = (slug: string): string =>
        demoStoreUrl
            ? `${demoStoreUrl}?theme=${encodeURIComponent(slug)}&preview=1`
            : `/demo?template=${encodeURIComponent(slug)}`;

    const featureChips = [
        { icon: Store, label: t('Your store on WhatsApp') },
        { icon: CreditCard, label: t('Multiple payment gateways') },
        { icon: Globe, label: t('Customizable store design') },
    ];

    // Sync the sticky showcase with the wizard: 1) create  2) customize  3) sell
    const showcaseGroup = step <= 2 ? 0 : step <= 7 ? 1 : 2;

    const isStoreNameNonLatin = data.store_name.trim() !== '' && slugify(data.store_name) === '';

    return (
        <div className="relative min-h-screen overflow-x-hidden bg-white font-sans">
            <Head title={t('Onboarding')} />

            <div className="grid min-h-screen grid-cols-1 lg:grid-cols-12">
                {/* Showcase panel � sticky green banner */}
                <aside className="relative hidden overflow-hidden lg:col-span-5 lg:block">
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

                    {/* Sticky showcase content � stays pinned while the wizard column scrolls */}
                    <div className="sticky top-0 z-10 flex h-screen w-full flex-col items-center justify-center overflow-y-auto px-10 py-8 scrollbar-custom">
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
                            ].map((item, i) => {
                                const isActive = i === showcaseGroup;
                                return (
                                    <div
                                        key={i}
                                        className={`onboarding-stagger flex items-start gap-3 rounded-2xl border p-4 backdrop-blur transition-all duration-300 ${
                                            isActive
                                                ? 'border-white/40 bg-white/20 shadow-lg shadow-black/10'
                                                : 'border-white/10 bg-white/10'
                                        }`}
                                    >
                                        <span
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-300 ${
                                                isActive ? 'bg-white' : 'bg-white/20 text-white'
                                            }`}
                                            style={isActive ? { color: primaryColor } : undefined}
                                        >
                                            {i + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <div
                                                className={`text-sm font-semibold transition-opacity duration-300 ${
                                                    isActive ? 'text-white' : 'text-white/60'
                                                }`}
                                            >
                                                {item.title}
                                            </div>
                                            <div
                                                className={`mt-0.5 text-xs leading-relaxed transition-opacity duration-300 ${
                                                    isActive ? 'text-white/70' : 'text-white/40'
                                                }`}
                                            >
                                                {item.desc}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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

                {/* Wizard column � clean step-by-step forms */}
                <main className="flex flex-col px-4 py-8 lg:col-span-7 lg:px-10 xl:px-16">
                    {/* Progress header — step counter + step stepper */}
                    <div className="mx-auto w-full max-w-xl">
                        <div className="flex items-center justify-between gap-3">
                            <img
                                src="/images/logos/wusool-logo.png"
                                alt={titleText}
                                className="h-8 w-auto shrink-0 lg:hidden"
                            />
                            <span
                                role="status"
                                className="inline-flex min-h-4 min-w-[92px] shrink-0 items-center justify-start gap-1 text-[11px] font-medium text-gray-400 tabular-nums"
                            >
                                {saveState === 'saving' && (
                                    <>
                                        <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                                        {t('Saving…')}
                                    </>
                                )}
                                {saveState === 'saved' && (
                                    <>
                                        <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                                        {t('All changes saved')}
                                    </>
                                )}
                            </span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-500">
                                {t('Step {{current}} of {{total}}', { current: step + 1, total: STEP_META.length })}
                            </span>
                        </div>

                        <ol className="mt-3 flex items-center" aria-label={t('Store setup steps')}>
                            {STEP_META.map((meta, i) => {
                                const isCurrent = i === step;
                                const isCompleted = i < step;
                                const StepIcon = meta.icon;
                                return (
                                    <li
                                        key={meta.key}
                                        aria-current={isCurrent ? 'step' : undefined}
                                        aria-label={t(meta.labelKey)}
                                        className="flex min-w-0 flex-1 items-center"
                                    >
                                        {i > 0 && (
                                            <span
                                                aria-hidden
                                                className={`mx-0.5 h-0.5 min-w-1 flex-1 rounded-full transition-colors duration-300 ${
                                                    i <= step ? 'bg-emerald-500' : 'bg-gray-200'
                                                }`}
                                            />
                                        )}
                                        <span
                                            aria-hidden
                                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 sm:h-7 sm:w-7 ${
                                                isCurrent
                                                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-500/15'
                                                    : isCompleted
                                                      ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                                                      : 'border-gray-200 bg-white text-gray-300'
                                            }`}
                                        >
                                            {isCompleted ? (
                                                <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} />
                                            ) : (
                                                <StepIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                            )}
                                        </span>
                                    </li>
                                );
                            })}
                        </ol>

                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs">
                            <span className="font-semibold text-gray-800">
                                {t(STEP_META[step].labelKey)}
                            </span>
                            {step < STEP_META.length - 1 && (
                                <span className="text-gray-400">
                                    {t('Next')}: {t(STEP_META[step + 1].labelKey)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Step card */}
                    <div className="flex flex-1 items-start justify-center py-8 md:items-center md:py-10">
                        <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-200/70">
                            {generalError && (
                                <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-8 py-3 text-sm font-medium text-red-700 md:px-12">
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                                    {generalError}
                                </div>
                            )}
                            <div className="p-8 md:p-12">
                                    <div key={step} className="animate-step-in">
                                        {stepKey === 'welcome' && (
                                            <div className="onboarding-stagger py-2 text-center">
                                                <div className="relative mx-auto mb-8 h-28 w-28 animate-pop">
                                                    <span
                                                        className="absolute inset-0 scale-110 rounded-[2rem]"
                                                        style={{ backgroundColor: `${primaryColor}14` }}
                                                    />
                                                    <div
                                                        className="relative flex h-full w-full items-center justify-center rounded-[2rem] shadow-lg"
                                                        style={{ backgroundColor: primaryColor }}
                                                    >
                                                        <Sparkles className="h-12 w-12 text-white" />
                                                    </div>
                                                </div>
                                                <h2 className="mb-3 text-2xl font-bold text-gray-900">
                                                    {t('Welcome to Wusool')}
                                                </h2>
                                                <p className="mx-auto mb-10 max-w-md text-sm leading-relaxed text-gray-500 sm:text-base">
                                                    {t("Let's get your store up and running in a few simple steps.")}
                                                </p>
                                                <Button
                                                    onClick={() => setStep(1)}
                                                    className="h-12 w-full gap-2 rounded-xl text-base animate-pulse-ring"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    {t('Start setting up your store now')}
                                                    <ChevronLeft className="h-5 w-5 ltr:[transform:scaleX(-1)]" />
                                                </Button>
                                                <a
                                                    href={demoStoreUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-transparent px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                    {t('Watch an accompanying demo store')}
                                                </a>
                                            </div>
                                        )}

                                        {stepKey === 'name' && (
                                            <div className="onboarding-stagger py-4">
                                                <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                                                        <User className="h-5 w-5 text-emerald-600" />
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
                                                    className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                                                    autoFocus
                                                />
                                                {errors.name && (
                                                    <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                                                )}
                                            </div>
                                        )}

                                        {stepKey === 'store' && (
                                            <div className="onboarding-stagger py-4">
                                                <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                                                        <Store className="h-5 w-5 text-emerald-600" />
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
                                                    className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
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
                                                    <p className="mt-1.5 text-xs text-gray-500">
                                                        {t('Your store will be available at')}
                                                    </p>

                                                    {/* Unified URL group: slug + domain suffix + inline check */}
                                                    <div
                                                        className={`flex w-full items-center overflow-hidden rounded-xl border bg-white transition-all ${
                                                            availability && !availability.available
                                                                ? 'border-red-300 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-500/15'
                                                                : 'border-gray-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20'
                                                        }`}
                                                    >
                                                        {/* Check availability � trailing action */}
                                                        <button
                                                            type="button"
                                                            onClick={runAvailabilityCheck}
                                                            disabled={checking || !data.store_subdomain.trim()}
                                                            className={`flex shrink-0 cursor-pointer items-center gap-1.5 border-none bg-emerald-500 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-600 ${
                                                                checking || !data.store_subdomain.trim() ? 'cursor-not-allowed opacity-60' : ''
                                                            }`}
                                                        >
                                                            {checking ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Check className="h-4 w-4" />
                                                            )}
                                                            <span>{t('Check availability')}</span>
                                                        </button>

                                                        {/* LTR domain group � reads naturally: my-store.wusool.ps */}
                                                        <div className="dir-ltr flex flex-1 items-center border-r border-gray-100">
                                                            <Input
                                                                id="store_subdomain"
                                                                value={data.store_subdomain}
                                                                onChange={handleSlugChange}
                                                                placeholder="my-store"
                                                                className="dir-ltr min-w-0 flex-1 rounded-none border-0 bg-transparent px-4 py-3 text-left font-mono text-sm text-gray-900 shadow-none outline-none focus:ring-0 focus-visible:border-transparent focus-visible:ring-0"
                                                                dir="ltr"
                                                            />
                                                            <span
                                                                className="flex shrink-0 select-none items-center border-l border-gray-100 bg-gray-50 px-3 py-3 font-mono text-sm text-gray-500"
                                                                dir="ltr"
                                                            >
                                                                .{storeDomain}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {availability && (
                                                        <p
                                                            className={`mt-2 flex items-center gap-1.5 text-sm animate-pop ${
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

                                                    {/* Live URL badge */}
                                                    <div
                                                        dir="ltr"
                                                        className="dir-ltr mt-4 inline-flex max-w-full animate-pop items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 font-mono text-xs text-emerald-700"
                                                    >
                                                        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
                                                        <span className="truncate">
                                                            https://{data.store_subdomain.trim() || 'your-store'}.{storeDomain}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {stepKey === 'details' && (
                                            <div className="onboarding-stagger py-4">
                                                <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                                                        <Contact className="h-5 w-5 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-gray-900">
                                                            {t('How customers reach you')}
                                                        </h2>
                                                        <p className="text-sm text-gray-500">
                                                            {t('Add your WhatsApp number and contact email. You can edit them anytime.')}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Contact fields � clean vertical stack */}
                                                <div className="space-y-5 w-full">
                                                    {/* Email */}
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="store_email" className="block text-sm font-medium text-gray-700">
                                                            {t('Store email')}
                                                        </Label>
                                                        <div className="relative flex items-center" dir="ltr">
                                                            <Input
                                                                id="store_email"
                                                                type="email"
                                                                value={data.store_email}
                                                                onChange={(e) => setData('store_email', e.target.value)}
                                                                placeholder="name@example.com"
                                                                className="h-12 w-full rounded-xl border border-gray-200 pl-11 pr-4 text-left font-mono text-sm text-gray-900 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                                                                dir="ltr"
                                                            />
                                                            <Mail className="pointer-events-none absolute left-3.5 h-5 w-5 text-gray-400" />
                                                        </div>
                                                        {errors.store_email && (
                                                            <p className="mt-2 text-sm text-red-600">{errors.store_email}</p>
                                                        )}
                                                    </div>

                                                    {/* WhatsApp / Phone */}
                                                    <div className="space-y-1.5">
                                                        <Label htmlFor="whatsapp_phone" className="block text-sm font-medium text-gray-700">
                                                            {t('WhatsApp number')}
                                                        </Label>
                                                        <PhoneCountryInput
                                                            id="whatsapp_phone"
                                                            value={data.whatsapp_phone}
                                                            onChange={(v) => setData('whatsapp_phone', v)}
                                                        />
                                                        {data.whatsapp_enabled && data.whatsapp_phone.trim() !== '' && !WHATSAPP_PATTERN.test(data.whatsapp_phone.trim()) && (
                                                            <p className="text-sm text-red-600">
                                                                {t('Use the international format, e.g. +9705...')}
                                                            </p>
                                                        )}
                                                        {data.whatsapp_enabled && data.whatsapp_phone.trim() === '' && (
                                                            <p className="text-sm text-amber-600">
                                                                {t('Enter a WhatsApp number to show the button.')}
                                                            </p>
                                                        )}
                                                        {errors.whatsapp_phone && (
                                                            <p className="text-sm text-red-600">{errors.whatsapp_phone}</p>
                                                        )}
                                                    </div>

                                                    {/* WhatsApp toggle */}
                                                    <div className="mt-2 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                                                        <Label htmlFor="whatsapp_enabled" className="text-sm font-medium text-gray-700">
                                                            {t('Show the WhatsApp button on my store')}
                                                        </Label>
                                                        <Switch
                                                            id="whatsapp_enabled"
                                                            checked={data.whatsapp_enabled}
                                                            onCheckedChange={(v) => setData('whatsapp_enabled', !!v)}
                                                            className="data-[state=checked]:bg-emerald-500"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {stepKey === 'branding' && (
                                            <div className="onboarding-stagger py-4">
                                                <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                                                        <Brush className="h-5 w-5 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-gray-900">
                                                            {t('Brand your store')}
                                                        </h2>
                                                        <p className="text-sm text-gray-500">
                                                            {t('Describe your business and make it yours — everything here is optional.')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-6 w-full">
                                                    {/* Section 1: Brand info */}
                                                    <div className="space-y-4">
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                            {t('About your store')}
                                                        </h4>
                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="welcome_message" className="block text-sm font-medium text-gray-700">
                                                                {t('Welcome message')}
                                                            </Label>
                                                            <Input
                                                                id="welcome_message"
                                                                value={data.welcome_message}
                                                                onChange={(e) => setData('welcome_message', e.target.value)}
                                                                placeholder={t('E.g. Welcome to our store!')}
                                                                className="h-auto w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                                                            />
                                                            {errors.welcome_message && (
                                                                <p className="text-sm text-red-600">{errors.welcome_message}</p>
                                                            )}
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <Label htmlFor="store_description" className="block text-sm font-medium text-gray-700">
                                                                {t('Store description')}
                                                            </Label>
                                                        <Textarea
                                                            id="store_description"
                                                            rows={2}
                                                            value={data.store_description}
                                                            onChange={(e) => setData('store_description', e.target.value)}
                                                            placeholder={t('A short description of your store and what you sell.')}
                                                            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                                                        />
                                                        {errors.store_description && (
                                                            <p className="text-sm text-red-600">{errors.store_description}</p>
                                                        )}
                                                    </div>

                                                    {/* Logo dropzone */}
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="block text-sm font-medium text-gray-700">
                                                                {t('Store logo')}
                                                            </Label>
                                                            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                                                                {t('Recommended size: 500 × 500 px')}
                                                            </span>
                                                        </div>
                                                        <MediaPicker
                                                            value={data.logo}
                                                            onChange={(v) => setData('logo', v)}
                                                            placeholder={t('Select a logo image')}
                                                            dropzoneLabel={t('Upload logo')}
                                                            hint={t('Supports PNG, JPG, GIF, WebP (max 2MB)')}
                                                            showPreview
                                                            dragDrop
                                                            inputId="onboarding-logo"
                                                        />
                                                        {errors.logo && (
                                                            <p className="text-sm text-red-600">{errors.logo}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                    {/* Section 2: Location */}
                                                    <div className="space-y-3 border-t border-gray-100 pt-3">
                                                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                                            {t('Store location (optional)')}
                                                        </h4>

                                                        {/* Country selector */}
                                                        <div className="space-y-1.5">
                                                            <Label className="block text-sm font-medium text-gray-700">
                                                                {t('Country')}
                                                            </Label>
                                                            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                                                                <PopoverTrigger asChild>
                                                                    <button
                                                                        type="button"
                                                                        className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-colors hover:border-gray-300"
                                                                    >
                                                                        <span className="flex items-center gap-2">
                                                                            {selectedLocationCountry ? (
                                                                                <>
                                                                                    <span className="text-lg">{selectedLocationCountry.flag}</span>
                                                                                    <span className="font-medium text-gray-800">
                                                                                        {selectedLocationCountry.name}
                                                                                    </span>
                                                                                </>
                                                                            ) : (
                                                                                <span className="text-gray-400">{t('Select your country')}</span>
                                                                            )}
                                                                        </span>
                                                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                                                    </button>
                                                                </PopoverTrigger>
                                                                <PopoverContent
                                                                    align="start"
                                                                    dir="rtl"
                                                                    className="z-50 min-w-[280px] rounded-xl border border-gray-100 bg-white p-2 shadow-lg"
                                                                >
                                                                    <div className="relative mb-2">
                                                                        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                                                        <input
                                                                            type="text"
                                                                            placeholder={t('Search for a country...')}
                                                                            value={countrySearchQuery}
                                                                            onChange={(e) => setCountrySearchQuery(e.target.value)}
                                                                            className="w-full rounded-lg bg-gray-50 py-2 pl-3 pr-9 text-right text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                                                                        />
                                                                    </div>
                                                                    <div className="scrollbar-thin scrollbar-thumb-gray-200 max-h-48 space-y-0.5 overflow-y-auto">
                                                                        {filteredLocationCountries.length === 0 && (
                                                                            <p className="py-6 text-center text-xs text-gray-400">
                                                                                {t('No matching countries')}
                                                                            </p>
                                                                        )}
                                                                        {filteredLocationCountries.map((c) => (
                                                                            <button
                                                                                key={c.code}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setData('country', c.name);
                                                                                    setCountryOpen(false);
                                                                                    setCountrySearchQuery('');
                                                                                }}
                                                                                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-right text-xs transition-colors hover:bg-emerald-50 ${
                                                                                    selectedLocationCountry?.code === c.code
                                                                                        ? 'bg-emerald-50 font-semibold text-emerald-700'
                                                                                        : 'text-gray-800'
                                                                                }`}
                                                                            >
                                                                                <span className="text-base">{c.flag}</span>
                                                                                <span className="font-medium">{c.name}</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                            {errors.country && (
                                                                <p className="text-sm text-red-600">{errors.country}</p>
                                                            )}
                                                        </div>

                                                        {/* City & street */}
                                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="city" className="block text-sm font-medium text-gray-700">
                                                                    {t('City')}
                                                                </Label>
                                                                <Input
                                                                    id="city"
                                                                    value={data.city}
                                                                    onChange={(e) => setData('city', e.target.value)}
                                                                    placeholder={t('e.g. Ramallah / Qalqilya')}
                                                                    className="h-auto w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                                                                />
                                                                {errors.city && (
                                                                    <p className="text-sm text-red-600">{errors.city}</p>
                                                                )}
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <Label htmlFor="address" className="block text-sm font-medium text-gray-700">
                                                                    {t('Street address')}
                                                                </Label>
                                                                <Input
                                                                    id="address"
                                                                    value={data.address}
                                                                    onChange={(e) => setData('address', e.target.value)}
                                                                    placeholder={t('e.g. Salah al-Din Street')}
                                                                    className="h-auto w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                                                                />
                                                                {errors.address && (
                                                                    <p className="text-sm text-red-600">{errors.address}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Section 3: Timezone & publish */}
                                                    <div className="space-y-4 border-t border-gray-100 pt-4">
                                                        <div className="space-y-1.5">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <Label htmlFor="timezone" className="text-sm font-medium">
                                                                {t('Timezone')}
                                                            </Label>
                                                            {typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setData('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)}
                                                                    className="text-xs font-medium text-emerald-600 transition-colors hover:underline"
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
                                                                className="h-auto w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                                                            <p className="text-sm text-red-600">{errors.timezone}</p>
                                                        )}
                                                        </div>

                                                        {/* Publish now */}
                                                        <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-gray-800">
                                                                    {t('Publish my store now')}
                                                                </p>
                                                                <p className="mt-0.5 text-xs text-gray-500">
                                                                    {t('Your store goes live on your subdomain as soon as you finish. Turn this off to build quietly first.')}
                                                                </p>
                                                            </div>
                                                            <Switch
                                                                checked={data.publish_store}
                                                                onCheckedChange={(v) => setData('publish_store', !!v)}
                                                                className="data-[state=checked]:bg-emerald-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {stepKey === 'language' && (
                                            <div className="onboarding-stagger py-4">
                                                <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                                                        <Languages className="h-5 w-5 text-emerald-600" />
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
                                                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                                                    {/* Arabic option */}
                                                    <button
                                                        type="button"
                                                        onClick={() => selectLanguage('ar')}
                                                        className={`relative flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition-all ${
                                                            data.language === 'ar'
                                                                ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/10'
                                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-2xl">🇸🇦</span>
                                                            <div className="text-start">
                                                                <p className="text-sm font-bold text-gray-900">العربية</p>
                                                                <p className="text-xs text-gray-500">الواجهة الرئيسية ولوحة التحكم</p>
                                                            </div>
                                                        </div>
                                                        {data.language === 'ar' && (
                                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white animate-pop">
                                                                <Check className="h-3.5 w-3.5" />
                                                            </span>
                                                        )}
                                                    </button>

                                                    {/* English option */}
                                                    <button
                                                        type="button"
                                                        onClick={() => selectLanguage('en')}
                                                        className={`relative flex cursor-pointer items-center justify-between rounded-xl border-2 p-4 transition-all ${
                                                            data.language === 'en'
                                                                ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/10'
                                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-2xl">🇬🇧</span>
                                                            <div className="text-start">
                                                                <p className="text-sm font-bold text-gray-900">English</p>
                                                                <p className="text-xs text-gray-500">Main interface &amp; dashboard</p>
                                                            </div>
                                                        </div>
                                                        {data.language === 'en' && (
                                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white animate-pop">
                                                                <Check className="h-3.5 w-3.5" />
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {stepKey === 'currency' && (
                                            <div className="onboarding-stagger py-4">
                                                <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                                                        <Coins className="h-5 w-5 text-emerald-600" />
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
                                                {/* Search */}
                                                <div className="relative">
                                                    <Search className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder={t('Search currency (e.g. USD, ILS)...')}
                                                        value={currencySearch}
                                                        onChange={(e) => setCurrencySearch(e.target.value)}
                                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-4 pr-10 text-sm outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                                    />
                                                </div>

                                                {/* Currency grid */}
                                                <div className="scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent max-h-[310px] overflow-y-auto p-1">
                                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                                        {visibleCurrencies.map((currency) => {
                                                            const isSelected = data.currency === currency.code;
                                                            return (
                                                                <button
                                                                    key={currency.code}
                                                                    type="button"
                                                                    onClick={() => setData('currency', currency.code)}
                                                                    className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 p-3 transition-all ${
                                                                        isSelected
                                                                            ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/10'
                                                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                                                    }`}
                                                                >
                                                                    {isSelected && (
                                                                        <span className="absolute left-2 top-2 flex h-4 w-4 animate-pop items-center justify-center rounded-full bg-emerald-500 text-white">
                                                                            <Check className="h-3 w-3 stroke-[3]" />
                                                                        </span>
                                                                    )}
                                                                    <span className="mb-1 font-mono text-xl font-bold text-gray-800">
                                                                        {currency.symbol}
                                                                    </span>
                                                                    <span className="font-mono text-xs font-bold text-emerald-700">
                                                                        {currency.code}
                                                                    </span>
                                                                    <span className="mt-0.5 max-w-full truncate text-[11px] text-gray-500">
                                                                        {currency.name}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {visibleCurrencies.length === 0 && (
                                                        <p className="py-8 text-center text-sm text-gray-400">
                                                            {t('No matching currencies')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {stepKey === 'theme' && (
                                            <div className="onboarding-stagger py-4">
                                                <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                                                        <Palette className="h-5 w-5 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-gray-900">
                                                            {t('Choose a design')}
                                                        </h2>
                                                        <p className="text-sm text-gray-500">
                                                            {t('Pick the perfect look for your store — preview any design live or change it anytime later.')}
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* Category filter pills */}
                                                <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-1">
                                                    {([
                                                        ['all', t('All')],
                                                        ['grocery', t('Supermarket')],
                                                        ['restaurants', t('Restaurants')],
                                                        ['fashion', t('Fashion & beauty')],
                                                        ['electronics', t('Electronics')],
                                                        ['general', t('General market')],
                                                    ] as Array<[string, string]>).map(([id, label]) => (
                                                        <button
                                                            key={id}
                                                            type="button"
                                                            onClick={() => setThemeCategory(id)}
                                                            className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                                                                themeCategory === id
                                                                    ? 'bg-emerald-500 text-white shadow-sm'
                                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            {label}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Scrollable templates grid */}
                                                <div className="scrollbar-thin scrollbar-thumb-gray-200 max-h-[480px] overflow-y-auto p-1">
                                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                        {visibleTemplates.map((tmpl) => {
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
                                                                            {/* v2 sector cover � the template's own preview identity */}
                                                                            <div
                                                                                className="relative flex h-36 w-full items-end overflow-hidden"
                                                                                style={{ background: tmpl.preview }}
                                                                            >
                                                                                <span className="absolute inset-x-4 top-4 bottom-0 flex flex-col gap-2 opacity-90">
                                                                                    <span className="h-2.5 w-2/3 rounded-full bg-black/10" />
                                                                                    <span className="h-9 w-full rounded-md bg-white/45" />
                                                                                    <span className="flex gap-1.5">
                                                                                        {[...Array(4)].map((_, i) => (
                                                                                            <span key={i} className="aspect-[3/4] flex-1 rounded bg-white/55 shadow-sm" />
                                                                                        ))}
                                                                                    </span>
                                                                                </span>
                                                                                <span
                                                                                    className="absolute end-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                                                                                    style={{ backgroundColor: tmpl.accent }}
                                                                                >
                                                                                    {tmpl.name}
                                                                                </span>
                                                                            </div>
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
                                                        {visibleTemplates.length === 0 && (
                                                            <p className="col-span-full py-10 text-center text-sm text-gray-400">
                                                                {t('No designs in this category')}
                                                            </p>
                                                        )}
                                                    </div>
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
                                                    <div className="mb-5 text-center">
                                                        <div className="mx-auto mb-2 flex h-12 w-12 animate-pop items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
                                                            <Sparkles className="h-6 w-6" />
                                                        </div>
                                                        <h2 className="text-xl font-bold text-gray-900">
                                                            {t('Almost there! Review your details.')}
                                                        </h2>
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            {t('Review your selections and confirm to finish.')}
                                                        </p>
                                                    </div>

                                                    <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
                                                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                                                                highlight: true,
                                                            },
                                                            {
                                                                icon: Mail,
                                                                label: t('Store Email'),
                                                                value: data.store_email || '\u2014',
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
                                                                className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm"
                                                            >
                                                                <div className="flex min-w-0 items-center gap-2">
                                                                    <span className="shrink-0 rounded-lg bg-gray-50 p-1.5 text-emerald-600">
                                                                        <row.icon className="h-3.5 w-3.5" />
                                                                    </span>
                                                                    <div className="min-w-0 text-start">
                                                                        <p className="text-[10px] font-medium text-gray-400">{row.label}</p>
                                                                        <p
                                                                            dir={row.ltr ? 'ltr' : undefined}
                                                                            className={`truncate text-xs font-bold ${
                                                                                row.highlight ? 'text-emerald-700' : 'text-gray-800'
                                                                            }`}
                                                                        >
                                                                            {row.value}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer navigation */}
                                    {stepKey !== 'welcome' && (
                                        <div className="mt-8 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
                                            <Button type="button" variant="outline" onClick={back} className="flex h-11 items-center gap-1 rounded-xl px-4">
                                                <ChevronRight className="h-4 w-4 ltr:[transform:scaleX(-1)]" />
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
                                                    className="flex h-11 items-center gap-1 rounded-xl bg-emerald-500 px-6 text-white transition-all hover:-translate-y-0.5 hover:bg-emerald-600 disabled:pointer-events-none disabled:opacity-50"
                                                >
                                                    {t('Next')}
                                                    <ChevronLeft className="h-4 w-4 ltr:[transform:scaleX(-1)]" />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                    {stepKey !== 'welcome' && stepKey !== 'confirm' && !canProceed() && (
                                        <p className="mt-3 text-center text-xs text-amber-600">
                                            {t('Complete the required fields to continue')}
                                        </p>
                                    )}
                            </div>
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
