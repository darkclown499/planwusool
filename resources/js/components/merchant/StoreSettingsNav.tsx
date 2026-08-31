import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { getMerchantContextNav } from '@/config/merchant-navigation';
import { cn } from '@/lib/utils';

interface Item {
    title: string;
    href?: string;
    activePaths?: string[];
}

function isActive(href: string | undefined, activePaths: string[] | undefined, currentUrl: string): boolean {
    if (!href) return false;
    const current = currentUrl.split('?')[0].replace(/\/+$/, '') || '/';
    const normalize = (p: string) => p.replace(/\/+$/, '') || '/';
    const parsePath = (u: string) => {
        if (u.startsWith('http')) {
            try {
                return new URL(u).pathname;
            } catch {
                return u.split('?')[0];
            }
        }
        return u.split('?')[0];
    };
    if (activePaths && activePaths.length > 0) {
        for (const ap of activePaths) if (normalize(parsePath(ap)) === normalize(current)) return true;
    }
    return normalize(parsePath(href)) === normalize(current);
}

export function StoreSettingsNav() {
    const { t } = useTranslation();
    const { props, url } = usePage() as any;
    const auth = props?.auth;
    const storeId = auth?.user?.current_store;

    const items = useMemo<Item[]>(() => {
        if (!storeId) return [];
        const perms = (auth?.permissions || []) as string[];
        const hasPermission = (p: string) => perms.includes(p);
        const routeExists = (name: string) => {
            try {
                route(name);
                return true;
            } catch {
                return false;
            }
        };
        const safeRoute = (name: string, params: any, fallback: string) => {
            try {
                return route(name, params);
            } catch {
                return fallback;
            }
        };
        const ctx = getMerchantContextNav('settings', {
            storeId,
            t,
            permissions: perms,
            hasPermission,
            routeExists,
            safeRoute,
        });
        if (!ctx) return [];
        return ctx.items;
    }, [storeId, t, auth?.permissions]);

    if (!items || items.length === 0) return null;

    return (
        <nav aria-label={t('Store Settings navigation')} className="hidden xl:flex w-full overflow-x-auto border-b border-border">
            <div className="flex w-full items-center gap-1 overflow-x-auto" role="tablist">
                {items.map((item) => {
                    const active = isActive(item.href, item.activePaths, url);
                    return (
                        <Link
                            key={item.title}
                            href={item.href || '#'}
                            prefetch
                            aria-current={active ? 'page' : undefined}
                            role="tab"
                            aria-selected={active}
                            className={cn(
                                'inline-flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium leading-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                                'border-b-2',
                                active
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            )}
                        >
                            {item.title}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}

export default StoreSettingsNav;
