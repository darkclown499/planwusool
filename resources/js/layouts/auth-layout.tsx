import { Head, usePage } from '@inertiajs/react';
import { ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';
import { getImageUrl } from '@/utils/image-helper';
import { Store, Palette, CreditCard, BarChart3 } from 'lucide-react';

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    description?: string;
    icon?: ReactNode;
    status?: string;
    statusType?: 'success' | 'error';
}

export default function AuthLayout({
    children,
    title,
    description,
    icon,
    status,
    statusType = 'success',
}: AuthLayoutProps) {
    const { t } = useTranslation();
    const [mounted, setMounted] = useState(false);
    const [imageError, setImageError] = useState(false);
    const { logoLight, logoDark, themeColor, customColor, titleText } = useBrand();
    const { flash = {} } = usePage().props as any;
    const appName = titleText;

    const currentLogo = logoLight;
    const primaryColor = themeColor === 'custom' ? customColor : THEME_COLORS[themeColor as keyof typeof THEME_COLORS];

    useEffect(() => {
        setMounted(true);
    }, []);

    const features = [
        { icon: <Store className="w-6 h-6" />, label: t('Multi-Store Management'), desc: t('Unlimited stores'), gradient: 'from-amber-400 to-orange-500' },
        { icon: <Palette className="w-6 h-6" />, label: t('7+ Pro Themes'), desc: t('Professional designs'), gradient: 'from-purple-400 to-pink-500' },
        { icon: <CreditCard className="w-6 h-6" />, label: t('30+ Payments'), desc: t('Global gateways'), gradient: 'from-emerald-400 to-teal-500' },
        { icon: <BarChart3 className="w-6 h-6" />, label: t('Analytics'), desc: t('Real-time insights'), gradient: 'from-blue-400 to-indigo-500' },
    ];

    return (
        <div className="min-h-screen bg-white relative font-sans">
            <Head title={title} />

            {/* Language Dropdown */}
            <div className="absolute top-6 right-6 z-20">
                <LanguageSwitcher />
            </div>

            <div className={`flex min-h-screen transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
                {/* Left Panel — Brand Visual */}
                <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden" style={{ backgroundColor: primaryColor }}>
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}></div>

                    {/* Decorative Circles */}
                    <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-white/5 blur-3xl"></div>
                    <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white/5 blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-white/10"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-white/10"></div>

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
                        {/* Logo */}
                        <div className="mb-8">
                            {currentLogo && !imageError ? (
                                <img
                                    src={getImageUrl(currentLogo)}
                                    alt={appName}
                                    className="h-10 w-auto object-contain brightness-0 invert"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <span className="text-4xl font-bold text-white tracking-tight">{appName}</span>
                            )}
                        </div>

                        {/* Main Heading */}
                        <h2 className="text-3xl xl:text-4xl font-bold text-white text-center leading-tight mb-4">
                            {t('Build Your Online Store Empire')}
                        </h2>
                        <p className="text-white/70 text-center text-base max-w-md leading-relaxed mb-12">
                            {t('Create, manage, and scale multiple online stores from one powerful dashboard.')}
                        </p>

                        {/* Feature Cards */}
                        <div className="grid grid-cols-2 gap-4 max-w-md w-full">
                            {features.map((feature, i) => (
                                <div
                                    key={i}
                                    className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/15 transition-all duration-300 group"
                                >
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        {feature.icon}
                                    </div>
                                    <div className="text-white font-semibold text-sm">{feature.label}</div>
                                    <div className="text-white/50 text-xs mt-0.5">{feature.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel — Form */}
                <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center p-6 sm:p-10 bg-gray-50">
                    <div className="w-full max-w-[420px]">
                        {/* Mobile Logo */}
                        <div className="lg:hidden text-center mb-8">
                            {currentLogo && !imageError ? (
                                <img
                                    src={getImageUrl(currentLogo)}
                                    alt={appName}
                                    className="h-8 mx-auto object-contain"
                                />
                            ) : (
                                <span className="text-2xl font-bold text-gray-900 tracking-tight">{appName}</span>
                            )}
                        </div>

                        {/* Card */}
                        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-8 sm:p-10">
                            {/* Logo */}
                            <div className="text-center mb-6">
                                <img
                                    src="/images/logos/wusool-Tlogo.png"
                                    alt={appName}
                                    className="h-16 mx-auto object-contain"
                                />
                            </div>

                            {/* Header */}
                            <div className="text-center mb-8">
                                {title && (
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">{title}</h1>
                                )}
                                {description && (
                                    <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
                                )}
                            </div>

                            {status && (
                                <div className={`mb-6 text-center text-sm font-medium ${statusType === 'success'
                                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                    : 'text-red-700 bg-red-50 border border-red-200'
                                    } rounded-xl p-3`}>
                                    {status}
                                </div>
                            )}

                            {flash.error && (
                                <div className="mb-6 text-center text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                                    {flash.error}
                                </div>
                            )}

                            {children}
                        </div>

                        {/* Footer */}
                        <div className="text-center mt-6">
                            <p className="text-sm text-gray-400">
                                © {new Date().getFullYear()} {appName}. {t('All rights reserved.')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
