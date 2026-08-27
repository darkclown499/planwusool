import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { MERCHANT_PRIMARY_AREAS, type PrimaryId } from '@/config/merchant-navigation';
import { cn } from '@/lib/utils';

interface Props {
    activePrimary: PrimaryId | null;
    variant?: 'vertical' | 'horizontal';
}

export function MerchantPrimaryNav({ activePrimary, variant = 'vertical' }: Props) {
    const { t } = useTranslation();
    const { url } = usePage();
    const isHorizontal = variant === 'horizontal';
    return (
        <nav aria-label={t('Main navigation') || 'التنقل الرئيسي'} className={cn(isHorizontal ? 'flex flex-col gap-1 py-2 px-1' : 'flex flex-col gap-1.5 py-3 px-1.5')}>
            {MERCHANT_PRIMARY_AREAS.map((area) => {
                const isActive = activePrimary === area.id;
                const label = t(area.labelKey) !== area.labelKey ? t(area.labelKey) : area.labelAr;
                return <PrimaryItem key={area.id} area={area} isActive={isActive} label={label} currentUrl={url} variant={variant} />;
            })}
        </nav>
    );
}

function PrimaryItem({ area, isActive, label, variant = 'vertical' }: { area: (typeof MERCHANT_PRIMARY_AREAS)[number]; isActive: boolean; label: string; currentUrl: string; variant?: 'vertical' | 'horizontal' }) {
    const { props } = usePage() as any;
    const storeId = props?.auth?.user?.current_store ?? props?.stores?.[0]?.id ?? null;

    const getHref = (): string => {
        const sid = storeId ? String(storeId) : '';
        try {
            switch (area.id) {
                case 'dashboard':
                    return route('dashboard');
                case 'orders':
                    return route('orders.index');
                case 'products':
                    return route('products.index');
                case 'customers':
                    return route('customers.index');
                case 'store':
                    try {
                        return route('stores.index');
                    } catch {
                        return sid ? `/stores/${sid}/designer` : '/stores';
                    }
                case 'marketing':
                    try {
                        return route('coupon-system.index');
                    } catch {
                        return '/coupon-system';
                    }
                case 'analytics':
                    return route('analytics.index');
                case 'settings':
                    return sid ? `/stores/${sid}/settings` : route('dashboard');
                default:
                    return route('dashboard');
            }
        } catch {
            return '/dashboard';
        }
    };

    const href = getHref();
    const Icon = area.icon;

    const isHorizontal = variant === 'horizontal';
    if (isHorizontal) {
        return (
            <Link
                href={href}
                prefetch
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                data-active={isActive}
                className={cn(
                    'group relative flex w-full items-center gap-3 rounded-xl ps-3 pe-3 py-3 text-start transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1',
                    'min-h-[44px]',
                    isActive
                        ? 'bg-white text-emerald-700 border border-emerald-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                        : 'text-gray-600 hover:bg-white hover:text-gray-800 border border-transparent'
                )}
            >
                {isActive && (
                    <span
                        aria-hidden="true"
                        className="absolute inset-y-1 start-0 w-[3px] rounded-full bg-emerald-600"
                    />
                )}
                <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600')} strokeWidth={1.75} />
                <span className={cn('flex-1 truncate text-[13px] font-medium leading-none', isActive ? 'text-emerald-700' : 'text-gray-700 group-hover:text-gray-900')}>
                    {label}
                </span>
            </Link>
        );
    }

    return (
        <Link
            href={href}
            prefetch
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            data-active={isActive}
            className={cn(
                'group relative flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-center transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1',
                isActive
                    ? 'bg-white text-emerald-700 border border-emerald-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                    : 'text-gray-500 hover:bg-white hover:text-gray-800 border border-transparent'
            )}
        >
            {isActive && (
                <span
                    aria-hidden="true"
                    className="absolute end-0 top-1/2 h-6 w-[2.5px] -translate-y-1/2 rounded-full bg-emerald-600"
                />
            )}
            <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600')} strokeWidth={1.75} />
            <span className={cn('max-w-[76px] truncate text-[11px] font-medium leading-tight tracking-wide', isActive ? 'text-emerald-700' : 'text-gray-600 group-hover:text-gray-800')}>
                {label}
            </span>
        </Link>
    );
}
