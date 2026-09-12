import { useState, type ReactNode } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    MERCHANT_PRIMARY_AREAS,
    getMerchantPrimaryHref,
    resolveActiveChild,
    type PrimaryId,
    type ContextNavItem,
} from '@/config/merchant-navigation';
import { type MerchantContextNavShape } from '@/components/merchant/MerchantNavList';
import { cn } from '@/lib/utils';

interface Props {
    activePrimary: PrimaryId | null;
    contextNav: MerchantContextNavShape | null;
    flyoutSide?: 'left' | 'right';
}

/**
 * Collapsed icon rail for the merchant sidebar.
 *
 * Icons with tooltips; the ACTIVE section with children opens a portal
 * Popover flyout toward page content (never clipped by the rail), keeps
 * the active child highlighted, and closes after navigation. Long lists
 * scroll within the flyout so the rail stays a clean icon column.
 */
export function MerchantCollapsedNav({ activePrimary, contextNav, flyoutSide = 'left' }: Props) {
    const { t } = useTranslation();
    const { url, props } = usePage() as any;
    const storeId = props?.auth?.user?.current_store ?? props?.stores?.[0]?.id ?? null;
    const currentUrl = String(url || '');
    const children = contextNav && contextNav.items.length > 0 ? contextNav.items : [];
    const activeChild = children.length > 0 ? resolveActiveChild(children, currentUrl) : null;
    const [openArea, setOpenArea] = useState<PrimaryId | null>(null);

    return (
        <nav aria-label={t('Main navigation') || 'التنقل الرئيسي'} className="flex w-full flex-col items-center gap-1.5 py-3 overflow-x-hidden">
            {MERCHANT_PRIMARY_AREAS.map((area) => {
                const isActive = activePrimary === area.id;
                const label = t(area.labelKey) !== area.labelKey ? t(area.labelKey) : area.labelAr;
                const href = getMerchantPrimaryHref(area.id, storeId);
                const Icon = area.icon;
                const hasFlyout = isActive && children.length > 0;
                const buttonClass = cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-lg border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                    isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 border-transparent'
                );

                const iconNode = (
                    <>
                        {isActive && <span aria-hidden="true" className="absolute inset-y-1 start-0 w-[2.5px] rounded-full bg-emerald-600" />}
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                    </>
                );

                let core: ReactNode;
                if (hasFlyout) {
                    core = (
                        <Popover open={openArea === area.id} onOpenChange={(open) => setOpenArea(open ? area.id : null)}>
                            <PopoverTrigger asChild>
                                <button type="button" aria-label={label} title={label} data-active={isActive} className={buttonClass}>
                                    {iconNode}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                side={flyoutSide}
                                align="start"
                                sideOffset={12}
                                onOpenAutoFocus={(event) => event.preventDefault()}
                                className="!w-60 rounded-xl p-1"
                            >
                                <div className="flex flex-col min-w-0">
                                    <Link
                                        href={href}
                                        prefetch
                                        aria-label={label}
                                        className="flex items-center gap-2 rounded-lg px-2 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                                        onClick={() => setOpenArea(null)}
                                    >
                                        <Icon className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={1.8} />
                                        <span className="truncate">{label}</span>
                                    </Link>
                                    <div className="my-1 h-px bg-gray-100" />
                                    <ul className="flex flex-col gap-0.5 overflow-y-auto overscroll-contain scrollbar-thin max-h-[min(45vh,22rem)]">
                                        {children.map((item) => {
                                            const active = item === activeChild;
                                            return (
                                                <li key={item.title} className="min-w-0">
                                                    <Link
                                                        href={item.href || '#'}
                                                        prefetch
                                                        aria-current={active ? 'page' : undefined}
                                                        data-active={active}
                                                        onClick={() => setOpenArea(null)}
                                                        className={cn(
                                                            'relative flex w-full items-center gap-2 rounded-lg ps-2.5 pe-2 py-2 text-[12.5px] leading-none transition-colors duration-150 min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600',
                                                            active
                                                                ? 'bg-emerald-50 text-emerald-700 font-medium border-s-2 border-emerald-600 -ms-px ps-[24px]'
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
                            </PopoverContent>
                        </Popover>
                    );
                } else {
                    core = (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link
                                    href={href}
                                    prefetch
                                    aria-label={label}
                                    title={label}
                                    aria-current={isActive ? 'page' : undefined}
                                    data-active={isActive}
                                    className={buttonClass}
                                >
                                    {iconNode}
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side={flyoutSide} align="center">
                                {label}
                            </TooltipContent>
                        </Tooltip>
                    );
                }
                return <div key={area.id} className="flex w-full justify-center">{core}</div>;
            })}
        </nav>
    );
}

export default MerchantCollapsedNav;