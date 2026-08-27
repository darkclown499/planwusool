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
        <nav aria-label={t('Main navigation') || 'التنقل الرئيسي'} className={cn(isHorizontal ? 'flex flex-col gap-1 py-2 px-1' : 'flex flex-col gap-1 py-2.5 px-1')}>
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
                    'group relative flex w-full items-center gap-2.5 rounded-lg ps-2.5 pe-2 py-2.5 text-start transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                    'min-h-[42px]',
                    isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                )}
            >
                {isActive && (
                    <span
                        aria-hidden="true"
                        className="absolute inset-y-1.5 start-0 w-[2.5px] rounded-full bg-emerald-600"
                    />
                )}
                <Icon className={cn('h-[16px] w-[16px] shrink-0', isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-500')} strokeWidth={1.7} />
                <span className={cn('flex-1 truncate text-[12.5px] font-medium leading-none', isActive ? 'text-emerald-700' : 'text-gray-700')}>
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
                'group relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-center transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            )}
        >
            <Icon className={cn('h-[16px] w-[16px] shrink-0', isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-500')} strokeWidth={1.7} />
            <span className={cn('max-w-[72px] truncate text-[10.5px] font-medium leading-tight', isActive ? 'text-emerald-700' : 'text-gray-600 group-hover:text-gray-700')}>
                {label}
            </span>
        </Link>
    );
}
