import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    MERCHANT_PRIMARY_AREAS,
    type PrimaryId,
    type ContextNavItem,
    getMerchantPrimaryHref,
    resolveActiveChild,
} from '@/config/merchant-navigation';
import { cn } from '@/lib/utils';

export interface MerchantContextNavShape {
    title: string;
    items: ContextNavItem[];
}

interface Props {
    activePrimary: PrimaryId | null;
    contextNav: MerchantContextNavShape | null;
}

/**
 * Single merchant navigation renderer (inline accordion).
 *
 * Used by BOTH the desktop rail (expanded state) and the mobile Sheet
 * drawer — one shared data flow for active state, nested sections,
 * labels, icons and children. Children of the active level-1 area are
 * shown inline below the parent; long lists scroll within a bounded
 * container so the outer page never gets a second scroll trap.
 */
export function MerchantNavList({ activePrimary, contextNav }: Props) {
    const { t } = useTranslation();
    const { url, props } = usePage() as any;
    const storeId = props?.auth?.user?.current_store ?? props?.stores?.[0]?.id ?? null;
    const currentUrl = String(url || '');
    const children = contextNav && contextNav.items.length > 0 ? contextNav.items : [];
    const activeChild = children.length > 0 ? resolveActiveChild(children, currentUrl) : null;

    return (
        <nav aria-label={t('Main navigation') || 'التنقل الرئيسي'} className="flex flex-col gap-0.5 py-3 px-1.5 overflow-x-hidden">
            {MERCHANT_PRIMARY_AREAS.map((area) => {
                const isActive = activePrimary === area.id;
                const label = t(area.labelKey) !== area.labelKey ? t(area.labelKey) : area.labelAr;
                const href = getMerchantPrimaryHref(area.id, storeId);
                const Icon = area.icon;
                const showChildren = isActive && children.length > 0;
                return (
                    <div key={area.id} className="flex w-full min-w-0 flex-col">
                        <Link
                            href={href}
                            prefetch
                            aria-label={label}
                            aria-current={isActive ? 'page' : undefined}
                            data-active={isActive}
                            title={label}
                            className={cn(
                                'group relative flex w-full items-center gap-2.5 rounded-[9px] ps-2.5 pe-2 py-2.5 text-start transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 min-h-[44px] overflow-hidden',
                                isActive
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/60'
                                    : 'text-gray-600 hover:bg-white hover:text-gray-800 border border-transparent hover:border-gray-100/60 hover:shadow-sm'
                            )}
                        >
                            {isActive && <span aria-hidden="true" className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-emerald-600" />}
                            <span className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center', isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-500')}>
                                <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                            </span>
                            <span className={cn('flex-1 min-w-0 truncate text-[13px] font-medium leading-none', isActive ? 'text-emerald-700' : 'text-gray-700')}>{label}</span>
                        </Link>
                        {showChildren && (
                            <div className="ms-2.5 mt-0.5 flex min-w-0 flex-col border-s border-gray-200/70 ps-2">
                                <ul className="flex min-w-0 flex-col gap-0.5 py-1 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-thin max-h-[min(36vh,20rem)]">
                                    {children.map((item) => {
                                        const active = item === activeChild;
                                        return (
                                            <li key={item.title} className="min-w-0 w-full">
                                                <Link
                                                    href={item.href || '#'}
                                                    prefetch
                                                    aria-current={active ? 'page' : undefined}
                                                    data-active={active}
                                                    className={cn(
                                                        'relative flex w-full items-center rounded-md ps-2.5 pe-2 py-2 text-[12.5px] leading-none font-normal transition-colors duration-150 min-h-[36px] min-w-0 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                                                        active
                                                            ? 'bg-emerald-50 text-emerald-700 font-medium border-s-2 border-emerald-600 -ms-px ps-[9px]'
                                                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-transparent'
                                                    )}
                                                >
                                                    <span className="truncate min-w-0 flex-1 text-start">{item.title}</span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}

export default MerchantNavList;