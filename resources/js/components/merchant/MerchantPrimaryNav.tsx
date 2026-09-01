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
        <nav aria-label={t('Main navigation') || 'التنقل الرئيسي'} className={cn(isHorizontal ? 'flex flex-col gap-1 py-2 px-1 overflow-x-hidden' : 'flex flex-col gap-1 py-3 px-1.5 overflow-x-hidden')}>
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
    const baseRow =
        'group relative flex w-full items-center gap-2.5 rounded-[9px] ps-2.5 pe-2 py-2.5 text-start transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 min-h-[44px] overflow-hidden';
    const iconBox = (active: boolean) =>
        cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center', active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-500');
    if (isHorizontal) {
        return (
            <Link
                href={href}
                prefetch
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                data-active={isActive}
                className={cn(baseRow, isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/70' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-transparent')}
            >
                {isActive && <span aria-hidden="true" className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-emerald-600" />}
                <span className={iconBox(isActive)}>
                    <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                </span>
                <span className={cn('flex-1 min-w-0 truncate text-[12.5px] font-medium leading-none', isActive ? 'text-emerald-700' : 'text-gray-700')}>
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
            title={label}
            className={cn(baseRow, isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/60' : 'text-gray-600 hover:bg-white hover:text-gray-800 border border-transparent hover:border-gray-100/60 hover:shadow-sm')}
        >
            {isActive && <span aria-hidden="true" className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-emerald-600" />}
            <span className={iconBox(isActive)}>
                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
            </span>
            <span className={cn('flex-1 min-w-0 truncate text-[13px] font-medium leading-none', isActive ? 'text-emerald-700' : 'text-gray-700')}>
                {label}
            </span>
        </Link>
    );
}
