import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { UserMenuContent } from '@/components/user-menu-content';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from '@/components/ui/sidebar';
import { useLayout } from '@/contexts/LayoutContext';
import { useSidebarSettings } from '@/contexts/SidebarContext';
import { useBrand } from '@/contexts/BrandContext';
import { type NavItem } from '@/types';
import { Link, usePage, router } from '@inertiajs/react';
import { LayoutGrid, Store, CreditCard, Briefcase, Ticket, Gift, Image, Palette, Globe2, DollarSign, Mail, MessageSquare, Settings, Bell, Building2, ChevronDown, Zap, Handshake } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { hasPermission as hasPermHook } from '@/utils/permissions';
import { getImageUrl } from '@/utils/image-helper';
import DesignerNavigationModal from '@/components/DesignerNavigationModal';
import { MerchantPrimaryNav } from '@/components/merchant/MerchantPrimaryNav';
import { MerchantContextNav } from '@/components/merchant/MerchantContextNav';
import { getMerchantContextNav, MERCHANT_PRIMARY_AREAS, resolvePrimaryId, isStoreSettingsUrl } from '@/config/merchant-navigation';

export function AppSidebar() {
    const { t } = useTranslation();
    const { auth, url } = usePage().props as any;
    const pageUrl = (usePage().url as string) || url || '';
    const userRole = auth.user?.type || auth.user?.role;
    const businesses = auth.user?.businesses || [];
    const currentBusiness = businesses.find((b: any) => b.id === auth.user?.current_store) || businesses[0];
    const currentStoreId = auth.user?.current_store as string | number | undefined;

    const routeExists = (name: string): boolean => {
        try { route(name); return true; } catch { return false; }
    };
    const safeRoute = (name: string, params: any, fallback: string) => {
        try { return route(name, params); } catch { return fallback; }
    };
    const handleBusinessSwitch = (businessId: number) => {
        if (!routeExists('switch-business')) return;
        router.post(route('switch-business'), { business_id: businessId });
    };

    const [designerOpen, setDesignerOpen] = useState(false);
    const [designerStoreId, setDesignerStoreId] = useState<string | number | null>(null);

    const getSuperAdminNavItems = (): NavItem[] => [
        { title: t('Dashboard'), href: route('dashboard'), icon: LayoutGrid, groupLabel: t('Main') },
        { title: t('Notifications'), href: route('merchant-notifications.index'), icon: Bell, groupLabel: t('Main') },
        { title: t('Companies'), href: route('companies.index'), icon: Briefcase, groupLabel: t('Main') },
        {
            title: t('Store Management'), icon: Store, groupLabel: t('Stores'),
            children: [
                { title: t('Stores'), href: route('stores.index') },
                { title: t('Theme Gallery'), href: auth.user?.current_store ? `${route('stores.designer', { id: auth.user.current_store })}?tab=templates` : route('stores.index') },
            ],
        },
        {
            title: t('Subscription Plans'), icon: CreditCard, groupLabel: t('Administration'),
            children: [
                { title: t('Plan'), href: route('plans.index') },
                { title: t('Subscription Requests'), href: route('plan-requests.index') },
                { title: t('Subscription Invoices'), href: route('plan-orders.index') },
            ],
        },
        { title: t('Coupons'), href: route('coupons.index'), icon: Ticket, groupLabel: t('Administration') },
        { title: t('Referral Program'), href: route('referral.index'), icon: Gift, groupLabel: t('Administration') },
        { title: t('Partners'), href: route('partner.admin'), icon: Handshake, groupLabel: t('Administration') },
        { title: t('Media Library'), href: route('media-library'), icon: Image, groupLabel: t('Content') },
        {
            title: t('Landing Page'), icon: Palette, groupLabel: t('Content'),
            children: [
                { title: t('Landing Page'), href: route('landing-page') },
                { title: t('Custom Pages'), href: route('landing-page.custom-pages.index') },
                { title: t('Subscribers'), href: route('landing-page.subscribers.index') },
                { title: t('Contact Inquiries'), href: route('landing-page.contacts.index') },
            ],
        },
        {
            title: t('Location Management'), icon: Globe2, groupLabel: t('System'),
            children: [
                { title: t('Countries'), href: route('countries.index') },
                { title: t('States'), href: route('states.index') },
                { title: t('Cities'), href: route('cities.index') },
            ],
        },
        { title: t('Currencies'), href: route('currencies.index'), icon: DollarSign, groupLabel: t('System') },
        { title: t('Email Templates'), href: route('email-templates.index'), icon: Mail, groupLabel: t('System') },
        { title: t('Notification Templates'), href: route('notification-templates.index'), icon: MessageSquare, groupLabel: t('System') },
        { title: t('Settings'), href: route('settings'), icon: Settings, groupLabel: t('System') },
    ];

    const { position } = useLayout();
    const { variant, collapsible, style } = useSidebarSettings();
    const { logoLight, logoDark, favicon, titleText, updateBrandSettings } = useBrand();
    const [sidebarStyle, setSidebarStyle] = useState({});

    useEffect(() => {
        if (style === 'colored') setSidebarStyle({ backgroundColor: 'var(--primary)', color: 'white' });
        else if (style === 'gradient') setSidebarStyle({ background: 'linear-gradient(to bottom, var(--primary), color-mix(in srgb, var(--primary), transparent 20%))', color: 'white' });
        else setSidebarStyle({});
    }, [style]);

    const isMerchant = userRole !== 'superadmin';

    // Merchant two-level navigation
    const activePrimary = useMemo(() => {
        if (!isMerchant) return null;
        return resolvePrimaryId(pageUrl, currentStoreId);
    }, [isMerchant, pageUrl, currentStoreId]);

    const contextNav = useMemo(() => {
        if (!isMerchant || !activePrimary) return null;
        const perms = (auth?.permissions || []) as string[];
        const hasPermission = (p: string) => perms.includes(p);
        return getMerchantContextNav(activePrimary, {
            storeId: currentStoreId,
            t,
            permissions: perms,
            hasPermission,
            routeExists,
            safeRoute,
            isPartner: Boolean(auth?.user?.has_partner),
        });
    }, [isMerchant, activePrimary, currentStoreId, t, auth?.permissions, pageUrl]);

    const hasContext = !!contextNav && contextNav.items.length > 0;

    // Store Settings cluster (General, Payments, Shipping, Taxes, Email,
    // Domains, Integrations) — the heaviest "sidebar inside sidebar". For these
    // pages the desktop Level-2 column is dropped so the merchant sidebar
    // collapses to a single primary column; the settings sub-nav is recomposed
    // as horizontal in-page tabs (StoreSettingsNav). Mobile/tablet is
    // unaffected (drawer + section switcher still show the sub-items).
    const isStoreSettings = isStoreSettingsUrl(pageUrl);
    const desktopContextActive = hasContext && !isStoreSettings;

    // Refined SaaS: primary 168px + context 180px = 348px (21.75rem)
    // Fits Arabic labels without clipping, avoids oversized empty column,
    // and keeps combined nav under 34% at 1024px.
    // No context (dashboard, analytics, store-settings) collapses to primary only
    // to avoid reserving an empty 180px column.
    const sidebarWidth = isMerchant ? (desktopContextActive ? '21.75rem' : '10.5rem') : undefined;

    // Sync CSS variable to provider wrapper so SidebarInset offset equals actual width
    // (Sidebar component's fixed element alone doesn't affect peer offset)
    useEffect(() => {
        if (!isMerchant) return;
        const wrapper = document.querySelector('[data-slot="sidebar-wrapper"]') as HTMLElement | null;
        if (!wrapper) return;
        if (sidebarWidth) wrapper.style.setProperty('--sidebar-width', sidebarWidth);
        else wrapper.style.removeProperty('--sidebar-width');
    }, [isMerchant, sidebarWidth]);

    const filteredNavItems = getSuperAdminNavItems();

    const getFirstAvailableHref = () => {
        if (filteredNavItems.length === 0) return route('dashboard');
        const firstItem = filteredNavItems[0];
        if (firstItem.href) return firstItem.href;
        if (firstItem.children && firstItem.children.length > 0) return firstItem.children[0].href || route('dashboard');
        return route('dashboard');
    };

    if (isMerchant) {
        // Compact plan row + user row helpers reuse same markup in desktop footer & mobile drawer
        // Fix: min-w-0 + truncate on every text node, single subtle card, no horizontal overflow
        const compactPlanRow = auth.user?.plan ? (
            <div className="flex items-center gap-2 min-w-0 overflow-hidden rounded-lg border border-emerald-100 bg-emerald-50/70 px-2.5 py-2">
                <div className="h-7 w-7 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                    <Zap className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0 text-start overflow-hidden">
                    <div className="flex items-center gap-1 min-w-0">
                        <span className="text-[12px] font-semibold text-gray-800 truncate max-w-[72px]">{t(auth.user.plan?.name || 'Free')}</span>
                        <span className="text-[11px] text-gray-400 shrink-0">•</span>
                        <span className="text-[11px] text-gray-500 truncate">{t('Plan')}</span>
                    </div>
                    <span className="block text-[11px] leading-none text-gray-500 truncate">{t('Current plan')}</span>
                </div>
                <Link
                    href={route('plans.index')}
                    prefetch
                    className="shrink-0 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 whitespace-nowrap px-2.5 py-1.5 rounded-md bg-white border border-emerald-200 hover:bg-emerald-50 transition-colors"
                >
                    {t('Upgrade')}
                </Link>
            </div>
        ) : null;

        return (
            <Sidebar
                side={position}
                collapsible={collapsible === 'icon' ? 'offcanvas' : collapsible}
                variant={variant}
                className={style !== 'plain' ? 'sidebar-custom-style' : ''}
                data-sidebar-style={style}
                dir={position === 'right' ? 'rtl' : 'ltr'}
                style={sidebarWidth ? ({ '--sidebar-width': sidebarWidth, '--sidebar-width-icon': '5rem' } as React.CSSProperties) : undefined}
            >
                <SidebarHeader className={`h-[68px] shrink-0 justify-center border-b border-gray-100 bg-white ${style !== 'plain' ? 'sidebar-styled' : ''}`} style={sidebarStyle}>
                    <div className="flex justify-center items-center min-w-0 overflow-hidden px-2">
                        <Link href={route('dashboard')} prefetch className="flex items-center justify-center min-w-0 overflow-hidden">
                            <div className="flex items-center min-w-0">
                                {(() => {
                                    const isDark = document.documentElement.classList.contains('dark');
                                    const currentLogo = isDark ? logoLight : logoDark;
                                    return currentLogo ? (
                                        <img key={currentLogo} src={getImageUrl(currentLogo)} alt="Logo" className="w-auto h-7 max-w-[120px] object-contain" onError={() => updateBrandSettings({ [isDark ? 'logoLight' : 'logoDark']: '' })} />
                                    ) : (
                                        <div className="h-7 text-inherit font-semibold flex items-center text-[17px] tracking-tight truncate">{titleText || 'وصول'}</div>
                                    );
                                })()}
                            </div>
                        </Link>
                    </div>
                    {businesses.length > 1 && (
                        <div className="px-2 pt-1 pb-1.5">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-between h-7 px-2 text-[11px] font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50" style={{ color: style !== 'plain' ? 'inherit' : undefined }}>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Building2 className="h-3 w-3 flex-shrink-0 opacity-60" />
                                            <span className="truncate">{currentBusiness?.name || t('Select Business')}</span>
                                        </div>
                                        <ChevronDown className="h-3 w-3 flex-shrink-0 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-56">
                                    {businesses.map((business: any) => (
                                        <DropdownMenuItem key={business.id} onClick={() => handleBusinessSwitch(business.id)} className={business.id === auth.user?.current_store ? 'bg-accent' : ''}>
                                            <Building2 className="h-4 w-4 me-2" />
                                            <span className="truncate">{business.name}</span>
                                            {business.id === auth.user?.current_store && <span className="ms-auto text-xs text-muted-foreground">{t('Current')}</span>}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </SidebarHeader>

                <SidebarContent className="p-0 min-h-0 overflow-hidden">
                    {/* Desktop: coherent two-column shell — xl+ only (1280+). <1280 uses Sheet drawer */}
                    <div className="hidden xl:flex h-full w-full min-h-0 overflow-hidden bg-[#fcfcfc] border-e border-gray-100">
                        {/* Level 1 — primary (168px) */}
                        <div className="w-[168px] shrink-0 border-e border-gray-100/80 bg-[#fcfcfc] flex flex-col overflow-y-auto overflow-x-hidden min-h-0 scrollbar-thin" style={sidebarStyle as any}>
                            <MerchantPrimaryNav activePrimary={activePrimary} />
                        </div>
                        {/* Level 2 — contextual, subtle (180px) — only rendered when route has children */}
                        {desktopContextActive && contextNav ? (
                            <div className="w-[180px] shrink-0 bg-white/80 border-e border-gray-100 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-thin">
                                <MerchantContextNav title={contextNav.title} items={contextNav.items} storeId={currentStoreId} />
                            </div>
                        ) : null}
                    </div>

                    {/* Mobile/Tablet drawer (<xl): ONE Sheet from right, nested hierarchy */}
                    <div className="xl:hidden flex flex-col h-full min-h-0 overflow-y-auto overflow-x-hidden bg-white">
                        <div className="flex-1 min-h-0 overflow-x-hidden">
                            <MerchantDrawerNav activePrimary={activePrimary} contextNav={contextNav} />
                        </div>
                        {/* Drawer footer: compact plan + user — single system, no big cards */}
                        <div className="shrink-0 border-t border-gray-100 bg-gray-50/50 overflow-x-hidden">
                            {compactPlanRow && <div className="border-b border-gray-100 p-2 overflow-hidden">{compactPlanRow}</div>}
                            <div className="px-1.5 py-2 overflow-hidden">
                                <NavUser position={position} compact />
                            </div>
                        </div>
                    </div>
                </SidebarContent>

                <SidebarFooter className="hidden xl:flex xl:flex-col shrink-0 border-t border-gray-100 bg-white p-0 gap-0 overflow-hidden">
                    {compactPlanRow && <div className="p-2 border-b border-gray-100 overflow-hidden">{compactPlanRow}</div>}
                    {/* User row — single compact row, no clipped text */}
                    <div className="px-1.5 pt-2 pb-2 min-w-0">
                        {desktopContextActive ? (
                            <NavUser position={position} compact />
                        ) : (
                            <div className="flex justify-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            aria-label={auth.user?.name || 'Account'}
                                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200/60 bg-white hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                                        >
                                            <Avatar className="h-7 w-7 overflow-hidden rounded-full">
                                                <AvatarImage src={auth.user?.avatar ?? undefined} alt={auth.user?.name || 'User'} />
                                                <AvatarFallback className="rounded-full bg-neutral-100 text-black text-[11px]">
                                                    {(auth.user?.name || 'U').slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="min-w-56 rounded-lg" align="end" side="bottom">
                                        <UserMenuContent user={auth.user!} />
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
                    </div>
                </SidebarFooter>
                <DesignerNavigationModal open={designerOpen} onOpenChange={setDesignerOpen} storeId={designerStoreId} />
            </Sidebar>
        );
    }

    function MerchantDrawerNav({ activePrimary, contextNav }: { activePrimary: any; contextNav: any }) {
        const { t } = useTranslation();
        const { url } = usePage();
        return (
            <nav aria-label={t('Main navigation') || 'التنقل الرئيسي'} className="flex flex-col gap-0.5 py-2 px-1.5">
                {MERCHANT_PRIMARY_AREAS.map((area: any) => {
                    const isActive = activePrimary === area.id;
                    const label = t(area.labelKey) !== area.labelKey ? t(area.labelKey) : area.labelAr;
                    const Icon = area.icon;
                    // compute href same as primary nav
                    const storeId = (usePage().props as any)?.auth?.user?.current_store ?? null;
                    const sid = storeId ? String(storeId) : '';
                    let href = '/dashboard';
                    try {
                        switch (area.id) {
                            case 'dashboard': href = route('dashboard'); break;
                            case 'orders': href = route('orders.index'); break;
                            case 'delivery': try { href = route('delivery.index'); } catch { href = '/delivery'; } break;
                            case 'payments': try { href = route('cod-payments.index'); } catch { href = '/cod-payments'; } break;
                            case 'sales': try { href = route('pos.index'); } catch { href = '/pos'; } break;
                            case 'products': href = route('products.index'); break;
                            case 'customers': href = route('customers.index'); break;
                            case 'store': try { href = route('stores.index'); } catch { href = sid ? `/stores/${sid}/designer` : '/stores'; } break;
                            case 'marketing': try { href = route('coupon-system.index'); } catch { href = '/coupon-system'; } break;
                            case 'analytics': href = route('analytics.index'); break;
                            case 'settings': href = sid ? `/stores/${sid}/settings` : route('dashboard'); break;
                            default: href = route('dashboard');
                        }
                    } catch { href = '/dashboard'; }
                    const showChildren = isActive && contextNav && contextNav.items?.length > 0;
                    return (
                        <div key={area.id} className="flex flex-col">
                            <Link
                                href={href}
                                prefetch
                                aria-current={isActive ? 'page' : undefined}
                                data-active={isActive}
                                className={
                                    (isActive
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 '
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 border border-transparent ') +
                                    'group relative flex w-full items-center gap-2.5 rounded-lg ps-2.5 pe-2 py-2.5 text-start transition-colors duration-150 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600'
                                }
                            >
                                {isActive && <span aria-hidden="true" className="absolute inset-y-1 start-0 w-[2.5px] rounded-full bg-emerald-600" />}
                                <Icon className={(isActive ? 'text-emerald-600 ' : 'text-gray-400 group-hover:text-gray-500 ') + 'h-[16px] w-[16px] shrink-0'} strokeWidth={1.7} />
                                <span className={'flex-1 truncate text-[13px] font-medium leading-none ' + (isActive ? 'text-emerald-700' : 'text-gray-700')}>{label}</span>
                            </Link>
                            {showChildren && (
                                <ul className="ms-3 mt-1 flex flex-col gap-0.5 border-s border-gray-200/70 ps-2 py-1">
                                    {contextNav.items.map((item: any) => {
                                        const cur = (url as string).split('?')[0].replace(/\/+$/, '') || '/';
                                        const normalize = (p: string) => p.replace(/\/+$/, '') || '/';
                                        const parsePath = (u: string) => (u.startsWith('http') ? (()=>{ try{return new URL(u).pathname;}catch{return u.split('?')[0];}})() : u.split('?')[0]);
                                        let active = false;
                                        if (item.activePaths?.length) { for (const ap of item.activePaths) if (normalize(parsePath(ap))===normalize(cur)) active=true; }
                                        else if (item.href) active = normalize(parsePath(item.href))===normalize(cur);
                                        return (
                                            <li key={item.title}>
                                                <Link
                                                    href={item.href || '#'}
                                                    prefetch
                                                    aria-current={active ? 'page' : undefined}
                                                    className={
                                                        (active ? 'bg-emerald-50 text-emerald-700 font-medium border-s-2 border-emerald-600 -ms-px ps-[7px] ' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-transparent ') +
                                                        'flex w-full items-center rounded-md ps-2 pe-2 py-2 text-[12.5px] leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 min-h-[34px]'
                                                    }
                                                >
                                                    <span className="truncate">{item.title}</span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </nav>
        );
    }

    // SuperAdmin — keep existing single-level with NavMain
    return (
        <Sidebar side={position} collapsible={collapsible} variant={variant} className={style !== 'plain' ? 'sidebar-custom-style' : ''} data-sidebar-style={style} dir={position === 'right' ? 'rtl' : 'ltr'}>
            <SidebarHeader className={style !== 'plain' ? 'sidebar-styled' : ''} style={sidebarStyle}>
                <div className="flex justify-center items-center">
                    <Link href={getFirstAvailableHref()} prefetch className="flex items-center justify-center">
                        <div className="group-data-[collapsible=icon]:hidden flex items-center">
                            {(() => {
                                const isDark = document.documentElement.classList.contains('dark');
                                const currentLogo = isDark ? logoLight : logoDark;
                                return currentLogo ? (
                                    <img key={currentLogo} src={getImageUrl(currentLogo)} alt="Logo" className="w-auto h-6 object-contain transition-all duration-200" onError={() => updateBrandSettings({ [isDark ? 'logoLight' : 'logoDark']: '' })} />
                                ) : (
                                    <div className="h-8 text-inherit font-semibold flex items-center text-lg tracking-tight">{titleText || 'Wusool'}</div>
                                );
                            })()}
                        </div>
                        <div className="h-8 w-8 hidden group-data-[collapsible=icon]:block">
                            {(() => {
                                return favicon ? (
                                    <img key={favicon} src={getImageUrl(favicon)} alt="Icon" className="h-8 w-8 transition-all duration-200" onError={() => updateBrandSettings({ favicon: '' })} />
                                ) : (
                                    <div className="h-8 w-8 bg-primary text-white rounded flex items-center justify-center font-bold shadow-sm">W</div>
                                );
                            })()}
                        </div>
                    </Link>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <div style={sidebarStyle} className={`h-full ${style !== 'plain' ? 'sidebar-styled' : ''}`}>
                    <NavMain items={filteredNavItems} position={position} />
                </div>
            </SidebarContent>

            <SidebarFooter>
                <div className="px-2 pb-2">
                    <NavUser position={position} />
                </div>
            </SidebarFooter>
            <DesignerNavigationModal open={designerOpen} onOpenChange={setDesignerOpen} storeId={designerStoreId} />
        </Sidebar>
    );
}
