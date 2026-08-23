import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
    ArrowLeft,
    Check,
    Copy,
    CreditCard,
    ExternalLink,
    Gift,
    LayoutDashboard,
    MessageCircle,
    Package,
    ShoppingBag,
    Sparkles,
    Store,
} from 'lucide-react';

import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';

interface SuccessProps {
    storeName: string;
    storeId: number;
    storeUrl: string;
    publishStore: boolean;
    referralCode: string | null;
    referralUrl: string | null;
}

export default function OnboardingSuccess({
    storeId,
    storeUrl,
    publishStore,
    referralCode,
    referralUrl,
}: SuccessProps) {
    const { t } = useTranslation();
    const { themeColor, customColor, titleText } = useBrand();
    const primaryColor =
        themeColor === 'custom' ? customColor : THEME_COLORS[themeColor as keyof typeof THEME_COLORS] || '#10b77f';
    const [copied, setCopied] = useState(false);
    const [copiedRef, setCopiedRef] = useState(false);

    const copyText = async (text: string, isReferral: boolean) => {
        try {
            await navigator.clipboard.writeText(text);
            if (isReferral) {
                setCopiedRef(true);
                setTimeout(() => setCopiedRef(false), 2000);
            } else {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch {
            /* ignore clipboard errors */
        }
    };

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-4 py-10 font-sans">
            <Head title={t('Store ready')} />

            <div className="absolute inset-x-0 top-0 h-2" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}b3)` }} />

            <div className="w-full max-w-md animate-fade-slide">
                {/* Success mark */}
                <div className="mb-6 flex justify-center">
                    <div className="relative">
                        <div className="flex h-16 w-16 animate-pop items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
                            <Check className="h-8 w-8 stroke-[3]" />
                        </div>
                        <span className="absolute -inset-2 animate-ping rounded-full bg-emerald-400 opacity-20" />
                    </div>
                </div>

                <div className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm sm:p-8">
                    <div className="flex justify-center">
                        <img src="/images/logos/wusool-logo.png" alt={titleText} className="h-10 w-auto" />
                    </div>

                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-gray-900">
                            {t('Your store is ready!')}
                        </h1>
                        <p className="mx-auto max-w-md text-xs leading-relaxed text-gray-500">
                            {t('Congratulations, your store is live at the address below. You can start adding your own products right away.')}
                        </p>
                    </div>

                    {/* Store URL */}
                    <div className="flex items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2" dir="ltr">
                        <div className="flex min-w-0 items-center gap-2 pl-2">
                            <span className="rounded-xl border border-gray-100 bg-white p-2 text-emerald-600 shadow-sm">
                                <ShoppingBag className="h-4 w-4" />
                            </span>
                            <a
                                href={storeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate font-mono text-xs font-bold text-gray-800 hover:underline"
                            >
                                {storeUrl}
                            </a>
                        </div>

                        <button
                            type="button"
                            onClick={() => copyText(storeUrl, false)}
                            aria-label={t('Copy store link')}
                            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                                copied
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                        >
                            {copied ? (
                                <>
                                    <Check className="h-3.5 w-3.5" />
                                    <span>{t('Copied!')}</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>{t('Copy link')}</span>
                                </>
                            )}
                        </button>
                    </div>

                    {!publishStore && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
                            {t('Your store is saved as a draft and is not public yet. You can publish it anytime from the store settings.')}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                        <a
                            href={storeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold text-white shadow-sm transition-colors"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <ExternalLink className="h-4 w-4" />
                            {t('Open store')}
                        </a>
                        <a
                            href={route('dashboard')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-xs font-bold text-gray-800 transition-colors hover:bg-gray-200"
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            {t('Go to dashboard')}
                        </a>
                    </div>
                </div>

                {/* Next steps */}
                <div className="mt-6 space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3 text-sm font-bold text-gray-900">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        <h3>{t('What next?')}</h3>
                    </div>
                    <ul className="space-y-2.5">
                        {[
                            {
                                icon: Package,
                                href: route('products.create'),
                                label: t('Add your first products'),
                                desc: t('Upload photos, set prices and write descriptions.'),
                            },
                            {
                                icon: MessageCircle,
                                href: `${route('stores.settings', storeId)}?tab=general`,
                                label: t('Connect your WhatsApp'),
                                desc: t('Turn on the WhatsApp button so customers can reach you.'),
                            },
                            {
                                icon: CreditCard,
                                href: route('stores.payments', storeId),
                                label: t('Configure payment methods'),
                                desc: t('Choose how your customers pay you.'),
                            },
                            {
                                icon: Store,
                                href: storeUrl,
                                label: t('Visit your store'),
                                desc: t('See how your store looks to customers.'),
                                external: true,
                            },
                        ].map((step, i) => (
                            <li key={i}>
                                <a
                                    href={step.href}
                                    target={step.external ? '_blank' : undefined}
                                    rel={step.external ? 'noopener noreferrer' : undefined}
                                    className="group flex items-center justify-between rounded-2xl border border-gray-100 p-3.5 transition-all hover:border-emerald-500/40 hover:bg-emerald-50/20"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                                            <step.icon className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-xs font-bold text-gray-900 transition-colors group-hover:text-emerald-700">
                                                {step.label}
                                            </span>
                                            <span className="mt-0.5 block truncate text-[11px] text-gray-500">{step.desc}</span>
                                        </span>
                                    </div>
                                    <ArrowLeft className="h-4 w-4 shrink-0 text-gray-300 transition-all group-hover:-translate-x-1 group-hover:text-emerald-600" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Referral share */}
                {referralUrl && (
                    <div className="mt-6 space-y-3 rounded-3xl border border-emerald-800/60 bg-gradient-to-br from-emerald-900 to-teal-900 p-6 text-white shadow-md">
                        <div className="flex items-center gap-2">
                            <span className="rounded-xl border border-emerald-400/20 bg-emerald-500/20 p-2 text-emerald-300">
                                <Gift className="h-4 w-4" />
                            </span>
                            <h4 className="text-sm font-bold">{t('Invite friends and earn commission')}</h4>
                        </div>
                        <p className="text-xs leading-relaxed text-emerald-100/80">
                            {t('When someone registers through your link and subscribes to a paid plan, you earn commission.')}
                        </p>

                        <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-800/60 bg-emerald-950/60 p-2" dir="ltr">
                            <code className="min-w-0 flex-1 truncate pl-2 font-mono text-xs text-emerald-200">
                                {referralUrl}
                            </code>
                            <button
                                type="button"
                                onClick={() => copyText(referralUrl as string, true)}
                                className={`shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                                    copiedRef ? 'bg-emerald-300 text-emerald-950' : 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400'
                                }`}
                            >
                                {copiedRef ? t('Copied!') : t('Copy link')}
                            </button>
                        </div>
                        {referralCode && (
                            <p className="text-[11px] text-emerald-200/70">
                                {t('Code')}:{' '}
                                <span className="font-mono" dir="ltr">
                                    {referralCode}
                                </span>
                            </p>
                        )}
                    </div>
                )}

                {/* Getting started hint */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
                    <MessageCircle className="h-3.5 w-3.5" />
                    <a
                        href={route('dashboard')}
                        className="font-medium text-gray-500 transition-colors hover:text-gray-700 hover:underline"
                    >
                        {t('Get more ideas on how to get started')}
                    </a>
                </div>
            </div>
        </div>
    );
}