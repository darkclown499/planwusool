import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { MERCHANT_PRIMARY_AREAS, type PrimaryId } from '@/config/merchant-navigation';
import { cn } from '@/lib/utils';

interface Props {
    activePrimary: PrimaryId | null;
}

export function MerchantPrimaryNav({ activePrimary }: Props) {
    const { t } = useTranslation();
    const { url } = usePage();
    return (
        <nav aria-label={t('Main navigation') || 'التنقل الرئيسي'} className="flex flex-col gap-1 py-3 px-1.5">
            {MERCHANT_PRIMARY_AREAS.map((area) => {
                const isActive = activePrimary === area.id;
                const label = t(area.labelKey) !== area.labelKey ? t(area.labelKey) : area.labelAr;
                return <PrimaryItem key={area.id} area={area} isActive={isActive} label={label} currentUrl={url} />;
            })}
        </nav>
    );
}

function PrimaryItem({ area, isActive, label }: { area: (typeof MERCHANT_PRIMARY_AREAS)[number]; isActive: boolean; label: string; currentUrl: string }) {
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

    return (
        <Link
            href={href}
            prefetch
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            data-active={isActive}
            className={cn(
                'group relative flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-xl px-1 py-3 text-center transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1',
                isActive
                    ? 'bg-white text-emerald-700 border border-emerald-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)]'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 border border-transparent'
            )}
        >
            {isActive && (
                <span
                    aria-hidden="true"
                    className="absolute end-0 top-1/2 h-6 w-[2.5px] -translate-y-1/2 rounded-full bg-emerald-600"
                />
            )}
            <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600')} strokeWidth={1.75} />
            <span className={cn('max-w-[78px] truncate text-[11px] font-medium leading-tight tracking-wide', isActive ? 'text-emerald-700' : 'text-gray-600 group-hover:text-gray-800')}>
                {label}
            </span>
        </Link>
    );
}
