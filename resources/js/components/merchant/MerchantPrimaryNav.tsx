import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { MERCHANT_PRIMARY_AREAS, resolvePrimaryId, type PrimaryId } from '@/config/merchant-navigation';
import { cn } from '@/lib/utils';

interface Props {
    activePrimary: PrimaryId | null;
    onSelect?: (id: PrimaryId) => void;
}

export function MerchantPrimaryNav({ activePrimary }: Props) {
    const { t } = useTranslation();
    const { url } = usePage();
    // compact sidebar — icon + label, always stable
    return (
        <nav aria-label={t('Main navigation') || 'التنقل الرئيسي'} className="flex flex-col gap-0.5 py-2">
            {MERCHANT_PRIMARY_AREAS.map((area) => {
                const isActive = activePrimary === area.id;
                const label = t(area.labelKey) !== area.labelKey ? t(area.labelKey) : area.labelAr;
                // Determine href: first context item or dashboard
                // We rely on data-href precomputed? For primary click we navigate to first contextual item or area landing.
                // Use area-specific fallback href mapping inline to avoid extra prop.
                return (
                    <PrimaryItem
                        key={area.id}
                        area={area}
                        isActive={isActive}
                        label={label}
                        currentUrl={url}
                    />
                );
            })}
        </nav>
    );
}

function PrimaryItem({ area, isActive, label }: { area: (typeof MERCHANT_PRIMARY_AREAS)[number]; isActive: boolean; label: string; currentUrl: string }) {
    const { props } = usePage() as any;
    const storeId = props?.auth?.user?.current_store ?? props?.stores?.[0]?.id ?? null;

    // Resolve primary href without hardcoding routes that may not exist
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
                    // Prefer stores index, fallback to designer if only one store
                    try { return route('stores.index'); } catch { return sid ? `/stores/${sid}/designer` : '/stores'; }
                case 'marketing':
                    try { return route('coupon-system.index'); } catch { return '/coupon-system'; }
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
                'group flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-center transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
        >
            <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-emerald-600' : 'text-gray-500 group-hover:text-gray-700')} strokeWidth={1.75} />
            <span className={cn('text-[11px] leading-none font-medium truncate max-w-full', isActive ? 'text-emerald-700' : 'text-gray-600')}>
                {label}
            </span>
        </Link>
    );
}
