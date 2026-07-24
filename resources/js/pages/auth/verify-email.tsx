import { Head, useForm } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { FormEventHandler } from 'react';
import { useTranslation } from 'react-i18next';

import AuthLayout from '@/layouts/auth-layout';
import AuthButton from '@/components/auth/auth-button';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';

export default function VerifyEmail({ status }: { status?: string }) {
    const { t } = useTranslation();
    const { themeColor, customColor } = useBrand();
    const primaryColor = themeColor === 'custom' ? customColor : THEME_COLORS[themeColor as keyof typeof THEME_COLORS];
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <AuthLayout
            title={t("Verify your email address")}
            description={t("We've sent you a verification link. Please check your email and click the link to verify your account.")}
            status={status}
        >
            <form noValidate onSubmit={submit}>
                <div className="mb-6 p-4 bg-blue-50 dark:bg-slate-700/50 rounded-xl border border-blue-100 dark:border-slate-600">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            <Mail className="h-5 w-5 text-blue-500" />
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            {t("Check your inbox for the verification email. If you don't see it, check your spam folder.")}
                        </p>
                    </div>
                </div>

                <AuthButton
                    tabIndex={1}
                    processing={processing}
                >
                    {t("Resend verification email")}
                </AuthButton>

                <div className="mt-4 text-center">
                    <a
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="text-sm font-medium hover:underline transition-colors"
                        style={{ color: primaryColor }}
                    >
                        {t("Log out")}
                    </a>
                </div>
            </form>
        </AuthLayout>
    );
}
