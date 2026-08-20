import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
    Check,
    Copy,
    CreditCard,
    ExternalLink,
    LayoutDashboard,
    MessageCircle,
    Package,
    Share2,
    Store,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
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
    storeName,
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
                        <div
                            className="flex h-20 w-20 items-center justify-center rounded-full shadow-lg animate-pop"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <Check className="h-10 w-10 text-white" />
                        </div>
                        <span className="absolute -inset-2 rounded-full opacity-30 animate-ping" style={{ backgroundColor: primaryColor }} />
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-xl shadow-gray-200/60">
                    <div className="mb-4 flex justify-center">
                            <img src="/images/logos/wusool-logo.png" alt={titleText} className="h-10 w-auto" />
                        </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {t('Your store is ready!')}
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-gray-500">
                        {t('Congratulations, your store is live at the address below. You can start adding your own products right away.')}
                    </p>

                    {/* Store URL */}
                    <div className="mt-6 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                        <Store className="h-4 w-4 shrink-0" style={{ color: primaryColor }} />
                        <a
                            href={storeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 truncate text-sm font-semibold text-gray-900 hover:underline"
                            dir="ltr"
                        >
                            {storeUrl}
                        </a>
                        <button
                            type="button"
                            onClick={() => copyText(storeUrl, false)}
                            className="shrink-0 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 transition hover:bg-gray-100"
                            aria-label={t('Copy store link')}
                        >
                            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                    </div>

                    {/* Store name */}
                    {storeName && (
                        <p className="mt-3 text-xs text-gray-400">
                            <span className="font-semibold" style={{ color: primaryColor }}>{storeName}</span>
                        </p>
                    )}

                    {!publishStore && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">
                            {t('Your store is saved as a draft and is not public yet. You can publish it anytime from the store settings.')}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <a
                            href={storeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                            style={{ backgroundColor: primaryColor }}
                        >
                            <ExternalLink className="h-4 w-4" />
                            {t('Open store')}
                        </a>
                        <a
                            href={route('dashboard')}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                            <LayoutDashboard className="h-4 w-4" />
                            {t('Go to dashboard')}
                        </a>
                    </div>
                </div>

                {/* Next steps */}
                <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                        <LayoutDashboard className="h-4 w-4" style={{ color: primaryColor }} />
                        {t('What next?')}
                    </div>
                    <ul className="space-y-2">
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
                                    className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 transition hover:border-gray-200 hover:bg-gray-100"
                                >
                                    <span
                                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                        style={{ backgroundColor: `${primaryColor}1a` }}
                                    >
                                        <step.icon className="h-4 w-4" style={{ color: primaryColor }} />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-gray-900">{step.label}</span>
                                        <span className="mt-0.5 block text-xs text-gray-500">{step.desc}</span>
                                    </span>
                                    <ExternalLink className="ms-auto mt-1 h-4 w-4 shrink-0 text-gray-300" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Referral share */}
                {referralUrl && (
                    <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <Share2 className="h-4 w-4" style={{ color: primaryColor }} />
                            {t('Invite friends and earn commission')}
                        </div>
                        <p className="mb-3 text-xs text-gray-500">
                            {t('When someone registers through your link and subscribes to a paid plan, you earn commission.')}
                        </p>
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
                                onClick={() => copyText(referralUrl as string, true)}
                                className="shrink-0 gap-1"
                            >
                                {copiedRef ? (
                                    <Check className="h-4 w-4 text-emerald-600" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                                {copiedRef ? t('Copied!') : t('Copy link')}
                            </Button>
                        </div>
                        {referralCode && (
                            <p className="mt-2 text-xs text-gray-400">
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