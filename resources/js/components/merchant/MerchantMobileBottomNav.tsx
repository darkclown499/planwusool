import { useMemo, useCallback } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useSidebar } from '@/components/ui/sidebar';
import { resolvePrimaryId, type PrimaryId } from '@/config/merchant-navigation';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    DollarSign,
    MoreHorizontal,
    type LucideIcon,
} from 'lucide-react';

interface BottomNavItem {
    id: PrimaryId | 'more';
    labelKey: string;
    labelAr: string;
    icon: LucideIcon;
    permissionAny?: string[];
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
    { id: 'dashboard', labelKey: 'Dashboard', labelAr: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'orders', labelKey: 'Orders', labelAr: 'الطلبات', icon: ShoppingCart, permissionAny: ['manage-orders'] },
    { id: 'products', labelKey: 'Products', labelAr: 'المنتجات', icon: Package, permissionAny: ['manage-products', 'manage-categories', 'manage-product-reviews', 'manage-digital-downloads'] },
    { id: 'sales', labelKey: 'point_of_sale_short', labelAr: 'نقطة البيع', icon: DollarSign, permissionAny: ['manage-pos'] },
    { id: 'more', labelKey: 'More', labelAr: 'المزيد', icon: MoreHorizontal },
];

function getHref(id: PrimaryId, storeId: string | number | null): string {
    const sid = storeId ? String(storeId) : '';
    try {
        switch (id) {
            case 'dashboard': return route('dashboard');
            case 'orders': return route('orders.index');
            case 'products': return route('products.index');
            case 'sales': return route('pos.index');
            default: return route('dashboard');
        }
    } catch {
        return '/dashboard';
    }
}

function isActiveArea(id: PrimaryId, currentUrl: string): boolean {
    return resolvePrimaryId(currentUrl) === id;
}

export function MerchantMobileBottomNav() {
    const { t } = useTranslation();
    const { url } = usePage();
    const { props } = usePage() as any;
    const { setOpenMobile } = useSidebar();
    const perms = (props?.auth?.permissions || []) as string[];
    const currentStoreId = props?.auth?.user?.current_store as string | number | undefined;

    const hasPermission = useCallback(
        (p: string) => perms.includes(p),
        [perms]
    );

    const items = useMemo(() => {
        return BOTTOM_NAV_ITEMS.filter((item) => {
            if (!item.permissionAny) return true;
            return item.permissionAny.some((p) => hasPermission(p));
        });
    }, [hasPermission]);

    const handleMoreClick = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setOpenMobile(true);
        },
        [setOpenMobile]
    );

    return (
        <nav
            aria-label={t('Main navigation') || 'التنقل الرئيسي'}
            className="xl:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="flex items-stretch">
                {items.map((item) => {
                    const isMore = item.id === 'more';
                    const isActive = !isMore && isActiveArea(item.id as PrimaryId, url);
                    const label = t(item.labelKey);
                    const displayLabel = label !== item.labelKey ? label : item.labelAr;
                    const Icon = item.icon;

                    if (isMore) {
                        return (
                            <button
                                key="more"
                                type="button"
                                onClick={handleMoreClick}
                                aria-label={displayLabel}
                                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-gray-500 transition-colors"
                            >
                                <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
                                <span className="text-[10px] font-medium leading-none">{displayLabel}</span>
                            </button>
                        );
                    }

                    const href = getHref(item.id as PrimaryId, currentStoreId ?? null);

                    return (
                        <Link
                            key={item.id}
                            href={href}
                            prefetch
                            aria-label={displayLabel}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                                isActive ? 'text-emerald-600' : 'text-gray-500'
                            }`}
                        >
                            <Icon
                                className="h-[22px] w-[22px]"
                                strokeWidth={isActive ? 2.2 : 1.8}
                            />
                            <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-emerald-600' : ''}`}>
                                {displayLabel}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
