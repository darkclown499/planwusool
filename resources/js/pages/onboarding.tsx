import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    ExternalLink,
    Globe,
    Loader2,
    Palette,
    PartyPopper,
    Share2,
    Sparkles,
    Store,
    CreditCard,
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
}

const STEP_KEYS = [
    'welcome',
    'name',
    'store',
    'language',
    'currency',
    'theme',
    'plans',
    'confirm',
] as const;

type StepKey = (typeof STEP_KEYS)[number];

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
}: OnboardingProps) {
    const { t, i18n } = useTranslation();
    const { themeColor, customColor } = useBrand();
    const primaryColor = themeColor === 'custom' ? customColor : THEME_COLORS[themeColor as keyof typeof THEME_COLORS] || '#10b77f';

    const { data, setData, post, processing, errors } = useForm({
        name: defaults.name || '',
        store_name: defaults.storeName || '',
        store_subdomain: '',
        language: defaults.language || 'ar',
        currency: defaults.currency || 'ils',
        theme: defaults.theme || 'gadgets',
    });

    const [step, setStep] = useState(0);
    const [copied, setCopied] = useState(false);
    const [checking, setChecking] = useState(false);
    const [availability, setAvailability] = useState<{ available: boolean; message: string } | null>(null);

    const themes = getStoreThemes();
    const stepKey = STEP_KEYS[step];
    const progress = ((step + 1) / STEP_KEYS.length) * 100;

    const updateSubdomainFromStoreName = (name: string) => {
        const slug = slugify(name);
        if (slug) {
            setData('store_subdomain', slug);
            setAvailability(null);
        }
    };

    const runAvailabilityCheck = async () => {
        if (!data.store_subdomain) {
            setAvailability({ available: false, message: t('Please enter a valid subdomain (3-30 characters, letters, numbers and hyphens).') });
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
            setAvailability({ available: false, message: message || t('Please enter a valid subdomain (3-30 characters, letters, numbers and hyphens).') });
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
        if (step < STEP_KEYS.length - 1) {
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 relative font-sans">
            <Head title={t('Onboarding')} />

            <div className="absolute top-6 right-6 z-20">
                <LanguageSwitcher />
            </div>

            <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-900 mb-2">
                        <Store className="w-7 h-7" style={{ color: primaryColor }} />
                        <span>{t('Welcome to Wusool')}</span>
                    </div>
                    <p className="text-gray-500 text-sm">{t("Let's get your store up and running in a few simple steps.")}</p>
                </div>

                {/* Progress bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">
                            {t('Step')} {step + 1} {t('of')} {STEP_KEYS.length}
                        </span>
                        <span className="text-xs text-gray-400">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%`, backgroundColor: primaryColor }}
                        />
                    </div>
                    <div className="flex justify-between mt-2">
                        {STEP_KEYS.map((key, i) => (
                            <div
                                key={key}
                                className={`h-2 w-2 rounded-full transition-colors ${i <= step ? '' : 'bg-gray-200'}`}
                                style={i <= step ? { backgroundColor: primaryColor } : undefined}
                            />
                        ))}
                    </div>
                </div>

                <Card className="shadow-xl shadow-gray-200/60 border-gray-100 rounded-2xl">
                    <CardContent className="p-6 sm:p-10">
                        {stepKey === 'welcome' && (
                            <div className="text-center py-6">
                                <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg" style={{ backgroundColor: primaryColor }}>
                                    <Sparkles className="w-10 h-10 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('Welcome to Wusool')}</h2>
                                <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto mb-8">
                                    {t("Let's get your store up and running in a few simple steps.")}
                                </p>
                                <Button onClick={() => setStep(1)} className="gap-2" style={{ backgroundColor: primaryColor }}>
                                    {t('Start')}
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        {stepKey === 'name' && (
                            <div className="py-4">
                                <h2 className="text-xl font-bold text-gray-900 mb-1">{t('Your Name')}</h2>
                                <p className="text-gray-500 text-sm mb-6">{t('What should we call you?')}</p>
                                <Label htmlFor="name">{t('Full name')}</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder={t('Full name')}
                                    className="mt-2"
                                />
                                {errors.name && <p className="text-sm text-red-600 mt-2">{errors.name}</p>}
                            </div>
                        )}

                        {stepKey === 'store' && (
                            <div className="py-4">
                                <h2 className="text-xl font-bold text-gray-900 mb-1">{t("What's your store called?")}</h2>
                                <p className="text-gray-500 text-sm mb-6">{t('Choose your store name and subdomain.')}</p>

                                <Label htmlFor="store_name">{t('Store name')}</Label>
                                <Input
                                    id="store_name"
                                    value={data.store_name}
                                    onChange={(e) => {
                                        setData('store_name', e.target.value);
                                        updateSubdomainFromStoreName(e.target.value);
                                    }}
                                    placeholder={t('Store name')}
                                    className="mt-2"
                                />
                                {errors.store_name && <p className="text-sm text-red-600 mt-2">{errors.store_name}</p>}

                                <div className="mt-6">
                                    <Label htmlFor="store_subdomain">{t('Subdomain')}</Label>
                                    <p className="text-gray-500 text-sm mt-1 mb-2">
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
                                                className="mt-0 pe-16 text-sm"
                                                dir="ltr"
                                            />
                                            <span className="absolute inset-y-0 end-3 flex items-center text-sm text-gray-400" dir="ltr">
                                                .{storeDomain}
                                            </span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={runAvailabilityCheck}
                                            disabled={checking || !data.store_subdomain}
                                            className="shrink-0"
                                        >
                                            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : t('Check availability')}
                                        </Button>
                                    </div>
                                    {availability && (
                                        <p
                                            className={`text-sm mt-2 flex items-center gap-1 ${
                                                availability.available ? 'text-emerald-600' : 'text-red-600'
                                            }`}
                                        >
                                            <Check className="w-4 h-4" />
                                            {availability.message}
                                        </p>
                                    )}
                                    {errors.store_subdomain && (
                                        <p className="text-sm text-red-600 mt-2">{errors.store_subdomain}</p>
                                    )}
                                    <p className="text-sm text-gray-400 mt-4" dir="ltr">
                                        {data.store_subdomain || 'your-store'}.{storeDomain}
                                    </p>
                                </div>
                            </div>
                        )}

                        {stepKey === 'language' && (
                            <div className="py-4">
                                <h2 className="text-xl font-bold text-gray-900 mb-1">{t('Choose your language')}</h2>
                                <p className="text-gray-500 text-sm mb-6">
                                    {t('Pick the language your store and dashboard will use.')}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        { code: 'ar', name: t('Arabic'), flag: '🇸🇦' },
                                        { code: 'en', name: t('English'), flag: '🇬🇧' },
                                    ].map((lang) => (
                                        <button
                                            key={lang.code}
                                            type="button"
                                            onClick={() => selectLanguage(lang.code)}
                                            className={`relative flex items-center gap-3 rounded-xl border-2 p-5 text-start transition-all ${
                                                data.language === lang.code
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <span className="text-3xl">{lang.flag}</span>
                                            <span className="font-semibold text-gray-900">{lang.name}</span>
                                            {data.language === lang.code && (
                                                <span
                                                    className="absolute top-3 end-3 w-6 h-6 rounded-full flex items-center justify-center text-white"
                                                    style={{ backgroundColor: primaryColor }}
                                                >
                                                    <Check className="w-4 h-4" />
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {stepKey === 'currency' && (
                            <div className="py-4">
                                <h2 className="text-xl font-bold text-gray-900 mb-1">{t('Choose your currency')}</h2>
                                <p className="text-gray-500 text-sm mb-6">
                                    {t('Select the currency customers will use to pay.')}
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pe-1">
                                    {currencies.map((currency) => (
                                        <button
                                            key={currency.code}
                                            type="button"
                                            onClick={() => setData('currency', currency.code)}
                                            className={`relative rounded-xl border-2 p-4 text-start transition-all ${
                                                data.currency === currency.code
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xl font-bold text-gray-900">{currency.symbol}</span>
                                                {data.currency === currency.code && (
                                                    <span
                                                        className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                                                        style={{ backgroundColor: primaryColor }}
                                                    >
                                                        <Check className="w-3 h-3" />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="font-medium text-gray-800 text-sm mt-2">{currency.code}</div>
                                            <div className="text-gray-400 text-xs truncate">{currency.name}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {stepKey === 'theme' && (
                            <div className="py-4">
                                <h2 className="text-xl font-bold text-gray-900 mb-1">{t('Choose a theme')}</h2>
                                <p className="text-gray-500 text-sm mb-6">
                                    {t('Pick a theme that fits your business. You can change it anytime.')}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[28rem] overflow-y-auto pe-1">
                                    {themes.map((theme) => (
                                        <div
                                            key={theme.id}
                                            className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                                                data.theme === theme.id
                                                    ? 'border-primary'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setData('theme', theme.id)}
                                                className="w-full text-start"
                                            >
                                                <div className="relative aspect-video overflow-hidden bg-gray-100">
                                                    <img
                                                        src={theme.thumbnail}
                                                        alt={theme.name}
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = `https://placehold.co/400x225?text=${encodeURIComponent(theme.name)}`;
                                                        }}
                                                    />
                                                    {data.theme === theme.id && (
                                                        <span
                                                            className="absolute top-2 end-2 w-7 h-7 rounded-full flex items-center justify-center text-white shadow"
                                                            style={{ backgroundColor: primaryColor }}
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="p-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-semibold text-gray-900 text-sm">{theme.name}</span>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="shrink-0 gap-1 text-xs h-8"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                window.open(
                                                                    `${demoStoreUrl}?theme=${theme.id}`,
                                                                    '_blank',
                                                                    'noopener,noreferrer'
                                                                );
                                                            }}
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                            {t('Preview')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    {t('View a fully working demo store with this theme')}
                                </p>
                            </div>
                        )}

                        {stepKey === 'plans' && (
                            <div className="py-4">
                                <h2 className="text-xl font-bold text-gray-900 mb-1">{t('Plans')}</h2>
                                <p className="text-gray-500 text-sm mb-6">
                                    {t('Start free and upgrade as your business grows')}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                                    {plans.slice(0, 3).map((plan) => (
                                        <div
                                            key={plan.id}
                                            className={`relative rounded-xl border-2 p-4 ${
                                                plan.is_recommended
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-gray-200'
                                            }`}
                                        >
                                            {plan.is_recommended && (
                                                <Badge className="absolute -top-2 start-3" style={{ backgroundColor: primaryColor }}>
                                                    {t('Recommended')}
                                                </Badge>
                                            )}
                                            <div className="font-semibold text-gray-900">{plan.name}</div>
                                            <div className="text-2xl font-bold mt-2">
                                                {plan.price}
                                                <span className="text-sm font-normal text-gray-500"> / {plan.duration}</span>
                                            </div>
                                            {plan.description && (
                                                <p className="text-gray-500 text-xs mt-2 line-clamp-2">{plan.description}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-xl border border-gray-200 p-4 mb-6">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-1">
                                        <Share2 className="w-4 h-4" style={{ color: primaryColor }} />
                                        {t('Share your referral link and earn commission')}
                                    </div>
                                    <p className="text-gray-500 text-xs mb-3">
                                        {t('When someone registers through your link and subscribes to a paid plan, you earn commission.')}
                                    </p>
                                    {referralUrl && (
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 truncate rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700" dir="ltr">
                                                {referralUrl}
                                            </code>
                                            <Button type="button" variant="outline" size="sm" onClick={copyReferral} className="gap-1 shrink-0">
                                                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                                {copied ? t('Copied!') : t('Copy link')}
                                            </Button>
                                        </div>
                                    )}
                                    {referralCode && (
                                        <p className="text-xs text-gray-400 mt-2">
                                            {t('Code')}: <span className="font-mono" dir="ltr">{referralCode}</span>
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button className="gap-2 flex-1" style={{ backgroundColor: primaryColor }}>
                                        <CreditCard className="w-4 h-4" />
                                        {t('Start free')}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="gap-2 flex-1"
                                        onClick={() => router.visit(route('plans.index'))}
                                    >
                                        <Globe className="w-4 h-4" />
                                        {t('Browse plans')}
                                    </Button>
                                </div>
                                <p className="text-center text-xs text-gray-400 mt-3">
                                    {t('You are currently on the free plan.')}
                                </p>
                            </div>
                        )}

                        {stepKey === 'confirm' && (
                            <div className="py-4">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                                        <PartyPopper className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900">{t('Almost there! Review your details.')}</h2>
                                    <p className="text-gray-500 text-sm mt-1">{t('Review your selections and confirm to finish.')}</p>
                                </div>

                                <div className="space-y-3 rounded-xl border border-gray-200 p-5">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">{t('Your Name')}</span>
                                        <span className="font-semibold text-gray-900">{data.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">{t('Store Name')}</span>
                                        <span className="font-semibold text-gray-900">{data.store_name}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">{t('Store URL')}</span>
                                        <span className="font-semibold text-gray-900" dir="ltr">
                                            {data.store_subdomain}.{storeDomain}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">{t('Language')}</span>
                                        <span className="font-semibold text-gray-900">
                                            {data.language === 'ar' ? t('Arabic') : t('English')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">{t('Currency')}</span>
                                        <span className="font-semibold text-gray-900">
                                            {currencies.find((c) => c.code === data.currency)?.name || data.currency}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">{t('Theme')}</span>
                                        <span className="font-semibold text-gray-900">
                                            {themes.find((th) => th.id === data.theme)?.name || data.theme}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer navigation */}
                        {stepKey !== 'welcome' && (
                            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                                <Button type="button" variant="ghost" onClick={back} className="gap-1">
                                    <ChevronRight className="w-4 h-4" />
                                    {t('Back')}
                                </Button>

                                {stepKey === 'confirm' ? (
                                    <Button onClick={submit} disabled={processing} className="gap-2" style={{ backgroundColor: primaryColor }}>
                                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                        {t('Finish')}
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={next}
                                        disabled={!canProceed() || (stepKey === 'store' && availability !== null && !availability.available)}
                                        className="gap-1"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {t('Next')}
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-sm text-gray-400 mt-6">
                    © {new Date().getFullYear()} {t('Welcome to Wusool')}
                </p>
            </div>
        </div>
    );
}
