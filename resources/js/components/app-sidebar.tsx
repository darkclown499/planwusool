import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import { useLayout } from '@/contexts/LayoutContext';
import { useSidebarSettings } from '@/contexts/SidebarContext';
import { useBrand } from '@/contexts/BrandContext';
import { type NavItem } from '@/types';
import { Link, usePage, router } from '@inertiajs/react';
import { LayoutGrid, Store, CreditCard, Briefcase, Ticket, Gift, Image, Palette, Globe2, DollarSign, Mail, MessageSquare, Settings, Bell, Building2, ChevronDown, Zap } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { hasPermission as hasPermHook } from '@/utils/permissions';
import { getImageUrl } from '@/utils/image-helper';
import DesignerNavigationModal from '@/components/DesignerNavigationModal';
import { MerchantPrimaryNav } from '@/components/merchant/MerchantPrimaryNav';
import { MerchantContextNav } from '@/components/merchant/MerchantContextNav';
import { getMerchantContextNav, resolvePrimaryId } from '@/config/merchant-navigation';

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
        });
    }, [isMerchant, activePrimary, currentStoreId, t, auth?.permissions, pageUrl]);

    const hasContext = !!contextNav && contextNav.items.length > 0;

    // Visual polish: primary 92px (5.75rem) + context 212px (13.25rem) = 304px (19rem)
    // Keeps Arabic labels comfortable without stealing content width at 1440.
    // Empty context (Reports etc.) collapses to primary only.
    const sidebarWidth = isMerchant ? (hasContext ? '19rem' : '5.75rem') : undefined;

    const filteredNavItems = getSuperAdminNavItems();

    const getFirstAvailableHref = () => {
        if (filteredNavItems.length === 0) return route('dashboard');
        const firstItem = filteredNavItems[0];
        if (firstItem.href) return firstItem.href;
        if (firstItem.children && firstItem.children.length > 0) return firstItem.children[0].href || route('dashboard');
        return route('dashboard');
    };

    if (isMerchant) {
        return (
            <Sidebar
                side={position}
                collapsible={collapsible === 'icon' ? 'offcanvas' : collapsible}
                variant={variant}
                className={style !== 'plain' ? 'sidebar-custom-style' : ''}
                data-sidebar-style={style}
                dir={position === 'right' ? 'rtl' : 'ltr'}
                style={sidebarWidth ? ({ '--sidebar-width': sidebarWidth } as React.CSSProperties) : undefined}
            >
                <SidebarHeader className={`h-14 justify-center border-b border-gray-200/50 ${style !== 'plain' ? 'sidebar-styled' : ''}`} style={sidebarStyle}>
                    <div className="flex justify-center items-center">
                        <Link href={route('dashboard')} prefetch className="flex items-center justify-center">
                            <div className="flex items-center">
                                {(() => {
                                    const isDark = document.documentElement.classList.contains('dark');
                                    const currentLogo = isDark ? logoLight : logoDark;
                                    return currentLogo ? (
                                        <img key={currentLogo} src={getImageUrl(currentLogo)} alt="Logo" className="w-auto h-6 object-contain" onError={() => updateBrandSettings({ [isDark ? 'logoLight' : 'logoDark']: '' })} />
                                    ) : (
                                        <div className="h-8 text-inherit font-semibold flex items-center text-lg tracking-tight">{titleText || 'Wusool'}</div>
                                    );
                                })()}
                            </div>
                        </Link>
                    </div>
                    {businesses.length > 1 && (
                        <div className="px-2 pb-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-between h-8 px-2 text-xs" style={{ color: style !== 'plain' ? 'inherit' : undefined }}>
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Building2 className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{currentBusiness?.name || t('Select Business')}</span>
                                        </div>
                                        <ChevronDown className="h-3 w-3 flex-shrink-0" />
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

                <SidebarContent className="p-0">
                    {/* Desktop: cohesive two-column nav — lg+ only, tablet uses mobile switcher */}
                    <div className="hidden lg:flex h-full w-full">
                        {/* Level 1 — structural, muted */}
                        <div className="w-[92px] shrink-0 border-e border-gray-200/60 bg-gray-50/40 flex flex-col overflow-y-auto overflow-x-hidden" style={sidebarStyle as any}>
                            <MerchantPrimaryNav activePrimary={activePrimary} />
                        </div>
                        {/* Level 2 — secondary, text-first */}
                        {hasContext && contextNav ? (
                            <div className="w-[212px] shrink-0 bg-white border-e border-gray-200/60 overflow-y-auto overflow-x-hidden">
                                <MerchantContextNav title={contextNav.title} items={contextNav.items} storeId={currentStoreId} />
                            </div>
                        ) : (
                            <div className="w-0" />
                        )}
                    </div>

                    {/* Mobile/Tablet drawer: stacked, reused components */}
                    <div className="lg:hidden flex flex-col h-full overflow-y-auto bg-gray-50/40">
                        <div className="p-2">
                            <p className="ps-2 pe-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">{t('Main')}</p>
                            <MerchantPrimaryNav activePrimary={activePrimary} />
                            {hasContext && contextNav && (
                                <div className="mt-4 border-t border-gray-200/60 pt-4">
                                    <MerchantContextNav title={contextNav.title} items={contextNav.items} storeId={currentStoreId} />
                                </div>
                            )}
                        </div>
                    </div>
                </SidebarContent>

                <SidebarFooter>
                    {auth.user?.plan && (
                        <div className="mx-2 mb-2 hidden lg:block">
                            <div className="rounded-xl bg-gray-50/60 border border-gray-200/60 p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                                        <Zap className="h-3.5 w-3.5 text-emerald-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t('Current Plan')}</p>
                                        <p className="text-[13px] font-semibold text-gray-800 truncate">{t(auth.user.plan?.name || 'Free')}</p>
                                    </div>
                                </div>
                                <Link href={route('plans.index')} prefetch className="flex items-center justify-center w-full rounded-lg bg-emerald-50 py-1.5 text-[12px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors">
                                    {t('Upgrade Plan')}
                                </Link>
                            </div>
                        </div>
                    )}
                    <div className="px-2 pb-2">
                        <NavUser position={position} />
                    </div>
                </SidebarFooter>
                <DesignerNavigationModal open={designerOpen} onOpenChange={setDesignerOpen} storeId={designerStoreId} />
            </Sidebar>
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
