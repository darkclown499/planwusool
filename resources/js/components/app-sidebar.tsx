import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useLayout } from '@/contexts/LayoutContext';
import { useSidebarSettings } from '@/contexts/SidebarContext';
import { useBrand } from '@/contexts/BrandContext';
import { type NavItem } from '@/types';
import { Link, usePage, router } from '@inertiajs/react';
import { BookOpen, Contact, Folder, LayoutGrid, ShoppingBag, Users, Tag, FileIcon, Settings, BarChart, Barcode, FileText, Briefcase, CheckSquare, Calendar, CreditCard, Nfc, Ticket, Gift, DollarSign, MessageSquare, CalendarDays, Palette, Image, Mail, Store, ChevronDown, Building2, Globe, Package, ShoppingCart, UserCheck, Truck, Star, Zap, Bot, Webhook, FileType, Languages, Percent, Headphones, Smartphone, Globe2, Megaphone, Search, Download, Sparkles, Bell, Paintbrush, LayoutTemplate } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import AppLogo from './app-logo';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hasPermission } from '@/utils/permissions';
import { getImageUrl } from '@/utils/image-helper';
import DesignerNavigationModal from '@/components/DesignerNavigationModal';



export function AppSidebar() {
    const { t } = useTranslation();
    const { auth } = usePage().props as any;
    const userRole = auth.user?.type || auth.user?.role;
    const permissions = auth?.permissions || [];
    const businesses = auth.user?.businesses || [];
    const currentBusiness = businesses.find((b: any) => b.id === auth.user?.current_store) || businesses[0];

    // Ziggy route existence guard: some legacy nav entries reference routes
    // that were never defined; never crash the sidebar over a missing route.
    const routeExists = (name: string): boolean => {
        try {
            route(name);
            return true;
        } catch {
            return false;
        }
    };

    const handleBusinessSwitch = (businessId: number) => {
        if (!routeExists('switch-business')) return;
        router.post(route('switch-business'), { business_id: businessId });
    };

    // Designer navigation confirmation modal
    const [designerOpen, setDesignerOpen] = useState(false);
    const [designerStoreId, setDesignerStoreId] = useState<string | number | null>(null);
    const openDesigner = (storeId: string | number | null) => {
        if (!storeId) return;
        setDesignerStoreId(storeId);
        setDesignerOpen(true);
    };

    const getSuperAdminNavItems = (): NavItem[] => [
        {
            title: t('Dashboard'),
            href: route('dashboard'),
            icon: LayoutGrid,
            groupLabel: t('Main'),
        },
        {
            title: t('Notifications'),
            href: route('merchant-notifications.index'),
            icon: Bell,
            groupLabel: t('Main'),
        },
        {
            title: t('Companies'),
            href: route('companies.index'),
            icon: Briefcase,
            groupLabel: t('Main'),
        },
        {
            title: t('Store Management'),
            icon: Store,
            groupLabel: t('Stores'),
            children: [
                { title: t('Stores'), href: route('stores.index') },
                { title: t('Theme Gallery'), href: auth.user?.current_store ? `${route('stores.designer', { id: auth.user.current_store })}?tab=templates` : route('stores.index') },
            ],
        },
        {
            title: t('Subscription Plans'),
            icon: CreditCard,
            groupLabel: t('Administration'),
            children: [
                {
                    title: t('Plan'),
                    href: route('plans.index')
                },
                {
                    title: t('Subscription Requests'),
                    href: route('plan-requests.index')
                },
                {
                    title: t('Subscription Invoices'),
                    href: route('plan-orders.index')
                }
            ]
        },
        {
            title: t('Coupons'),
            href: route('coupons.index'),
            icon: Ticket,
            groupLabel: t('Administration'),
        },
        {
            title: t('Referral Program'),
            href: route('referral.index'),
            icon: Gift,
            groupLabel: t('Administration'),
        },
        {
            title: t('Media Library'),
            href: route('media-library'),
            icon: Image,
            groupLabel: t('Content'),
        },
        {
            title: t('Landing Page'),
            icon: Palette,
            groupLabel: t('Content'),
            children: [
                {
                    title: t('Landing Page'),
                    href: route('landing-page')
                },
                {
                    title: t('Custom Pages'),
                    href: route('landing-page.custom-pages.index')
                },
                {
                    title: t('Subscribers'),
                    href: route('landing-page.subscribers.index')
                },
                {
                    title: t('Contact Inquiries'),
                    href: route('landing-page.contacts.index')
                }
            ]
        },
        {
            title: t('Location Management'),
            icon: Globe2,
            groupLabel: t('System'),
            children: [
                {
                    title: t('Countries'),
                    href: route('countries.index')
                },
                {
                    title: t('States'),
                    href: route('states.index')
                },
                {
                    title: t('Cities'),
                    href: route('cities.index')
                }
            ]
        },
        {
            title: t('Currencies'),
            href: route('currencies.index'),
            icon: DollarSign,
            groupLabel: t('System'),
        },
        {
            title: t('Email Templates'),
            href: route('email-templates.index'),
            icon: Mail,
            groupLabel: t('System'),
        },
        {
            title: t('Notification Templates'),
            href: route('notification-templates.index'),
            icon: MessageSquare,
            groupLabel: t('System'),
        },
        {
            title: t('Settings'),
            href: route('settings'),
            icon: Settings,
            groupLabel: t('System'),
        }
    ];

    const getCompanyNavItems = (): NavItem[] => {
        const items: NavItem[] = [];
        const user = auth.user;
        const plan = user?.plan;
        const currentStoreIdEarly = auth.user?.current_store as string | number | undefined;

        const safeRoute = (name: string, params: any, fallback: string) => {
            try { return route(name, params); } catch { return fallback; }
        };

        // ── الرئيسية ──
        items.push({
            title: t('Dashboard'),
            href: route('dashboard'),
            icon: LayoutGrid,
            groupLabel: t('Main'),
        });

        // ── الطلبات — primary command center ──
        const orderChildren: NavItem[] = [];
        if (hasPermission('manage-orders')) {
            orderChildren.push({ title: t('Orders'), href: route('orders.index') });
            orderChildren.push({ title: t('Returns'), href: route('returns.index') });
        }
        if (hasPermission('manage-pos') && routeExists('pos.index')) {
            orderChildren.push({ title: t('POS System'), href: route('pos.index') });
        }
        if (orderChildren.length > 0) {
            items.push({
                title: t('Orders'),
                icon: ShoppingCart,
                groupLabel: t('Operations'),
                children: orderChildren,
            });
        }

        // ── المنتجات ──
        const productChildren: NavItem[] = [];
        if (hasPermission('manage-products')) {
            productChildren.push({ title: t('Products'), href: route('products.index') });
        }
        if (hasPermission('manage-categories')) {
            const categoriesHref = currentStoreIdEarly ? `/stores/${currentStoreIdEarly}/categories` : (() => { try { return route('categories.index'); } catch { return '/categories'; } })();
            const categoriesActive = currentStoreIdEarly ? [`/stores/${currentStoreIdEarly}/categories`, '/categories'] : ['/categories'];
            try { categoriesActive.push(route('categories.index')); } catch {}
            productChildren.push({ title: t('Categories'), href: categoriesHref, activePaths: [...new Set(categoriesActive)] });
        }
        if (hasPermission('manage-product-reviews')) {
            productChildren.push({ title: t('Product Reviews'), href: route('product-reviews.index') });
        }
        if (hasPermission('manage-digital-downloads')) {
            productChildren.push({ title: t('Digital Downloads'), href: route('digital-downloads.index') });
        }
        if (productChildren.length > 0) {
            items.push({
                title: t('Products'),
                icon: Package,
                groupLabel: t('Operations'),
                children: productChildren,
            });
        }

        // ── العملاء ──
        const customerChildren: NavItem[] = [];
        if (hasPermission('manage-customers')) {
            customerChildren.push({ title: t('Customers'), href: route('customers.index') });
        }
        if (currentStoreIdEarly && hasPermission('settings-stores')) {
            customerChildren.push({
                title: t('Customer Accounts'),
                href: `/stores/${currentStoreIdEarly}/customer-accounts`,
                activePaths: [`/stores/${currentStoreIdEarly}/customer-accounts`],
            });
        }
        if (hasPermission('manage-loyalty')) {
            customerChildren.push({ title: t('Loyalty Points'), icon: Star, href: route('loyalty.settings') });
        }
        if (customerChildren.length > 0) {
            items.push({
                title: t('Customers'),
                icon: Users,
                groupLabel: t('Operations'),
                children: customerChildren,
            });
        }

        // ── المتجر ──
        const currentStoreId = auth.user?.current_store;
        const storeChildren: NavItem[] = [];
        if (hasPermission('manage-stores')) {
            storeChildren.push({ title: t('Stores'), href: route('stores.index') });
        }
        if (hasPermission('settings-stores') && currentStoreId) {
            storeChildren.push({ title: t('Store Design'), href: safeRoute('stores.designer', currentStoreId, `/stores/${currentStoreId}/designer`) });
            storeChildren.push({ title: t('Store Settings'), href: safeRoute('stores.settings', currentStoreId, `/stores/${currentStoreId}/settings`), activePaths: [`/stores/${currentStoreId}/settings`] });
        }
        if (storeChildren.length > 0) {
            items.push({
                title: t('Store'),
                icon: Store,
                groupLabel: t('Operations'),
                children: storeChildren,
            });
        }

        // ── التسويق ──
        const marketingChildren: NavItem[] = [];
        if (hasPermission('manage-coupon-system')) {
            marketingChildren.push({ title: t('Coupons'), href: route('coupon-system.index') });
        }
        if (hasPermission('manage-advanced-coupons')) {
            marketingChildren.push({ title: t('Advanced Coupons'), icon: Sparkles, href: route('advanced-coupons.index') });
        }
        if (hasPermission('manage-abandoned-carts')) {
            const storeId = auth.user?.current_store;
            const abandonedHref = storeId ? `/stores/${storeId}/abandoned-carts` : route('abandoned-carts.index');
            marketingChildren.push({ title: t('Abandoned Carts'), icon: ShoppingCart, href: abandonedHref });
        }
        if (hasPermission('manage-express-checkout')) {
            marketingChildren.push({ title: 'روابط البيع السريع', icon: Zap, href: route('express-checkout.index') });
        }
        if (marketingChildren.length > 0) {
            items.push({
                title: t('Marketing'),
                icon: Megaphone,
                groupLabel: t('Growth'),
                children: marketingChildren,
            });
        }

        // ── التقارير ──
        if (hasPermission('manage-analytics')) {
            items.push({
                title: t('Analytics & Reporting'),
                href: route('analytics.index'),
                icon: BarChart,
                groupLabel: t('Growth'),
            });
        }

        // ── الإعدادات — all configuration consolidated ──
        const settingsChildren: NavItem[] = [];
        if (currentStoreIdEarly && hasPermission('settings-stores')) {
            settingsChildren.push({ title: t('Payment Methods'), icon: CreditCard, href: `/stores/${currentStoreIdEarly}/payments`, activePaths: [`/stores/${currentStoreIdEarly}/payments`] });
            settingsChildren.push({ title: t('Shipping & Delivery'), icon: Truck, href: `/stores/${currentStoreIdEarly}/shipping`, activePaths: [`/stores/${currentStoreIdEarly}/shipping`, '/shipping'] });
            settingsChildren.push({ title: t('Taxes'), icon: Percent, href: `/stores/${currentStoreIdEarly}/taxes`, activePaths: [`/stores/${currentStoreIdEarly}/taxes`, '/tax'] });
            settingsChildren.push({ title: t('Email & Notifications'), icon: Mail, href: `/stores/${currentStoreIdEarly}/email-settings`, activePaths: [`/stores/${currentStoreIdEarly}/email-settings`, `/stores/${currentStoreIdEarly}/notifications/email`, `/stores/${currentStoreIdEarly}/notifications/whatsapp`] });
            settingsChildren.push({ title: t('Domain'), icon: Globe, href: `/stores/${currentStoreIdEarly}/domains`, activePaths: [`/stores/${currentStoreIdEarly}/domains`] });
            settingsChildren.push({ title: t('Integrations'), icon: Webhook, href: `/stores/${currentStoreIdEarly}/integrations`, activePaths: [`/stores/${currentStoreIdEarly}/integrations`, `/stores/${currentStoreIdEarly}/integrations/erp`] });
        }
        if (hasPermission('manage-users')) {
            settingsChildren.push({ title: t('Users & Roles'), icon: Users, href: route('users.index') });
        }
        if (hasPermission('manage-media')) {
            settingsChildren.push({ title: t('Media Library'), icon: Image, href: route('media-library') });
        }
        if (hasPermission('manage-cod-payments')) {
            settingsChildren.push({ title: t('COD Payments'), icon: DollarSign, href: route('cod-payments.index') });
        }
        if (hasPermission('manage-notifications')) {
            settingsChildren.push({ title: t('Customer Notifications'), icon: Bell, href: route('notifications.index') });
        }
        if (hasPermission('manage-plans')) {
            settingsChildren.push({ title: t('My Plan'), icon: CreditCard, href: route('plans.index') });
        }
        if (hasPermission('manage-referral')) {
            settingsChildren.push({ title: t('Referral Program'), icon: Gift, href: route('referral.index') });
        }
        if (hasPermission('manage-settings') && (user.type === 'superadmin' || user.type === 'admin')) {
            settingsChildren.push({ title: t('Platform Settings'), icon: Settings, href: route('settings') });
        }
        if (settingsChildren.length > 0) {
            items.push({
                title: t('Settings'),
                icon: Settings,
                groupLabel: t('Settings'),
                children: settingsChildren,
            });
        }

        return items;
    };

    const mainNavItems = userRole === 'superadmin' ? getSuperAdminNavItems() : getCompanyNavItems();

    const { position } = useLayout();
    const { variant, collapsible, style } = useSidebarSettings();
    const { logoLight, logoDark, favicon, titleText, updateBrandSettings } = useBrand();
    const [sidebarStyle, setSidebarStyle] = useState({});

    useEffect(() => {

        // Apply styles based on sidebar style
        if (style === 'colored') {
            setSidebarStyle({ backgroundColor: 'var(--primary)', color: 'white' });
        } else if (style === 'gradient') {
            setSidebarStyle({
                background: 'linear-gradient(to bottom, var(--primary), color-mix(in srgb, var(--primary), transparent 20%))',
                color: 'white'
            });
        } else {
            setSidebarStyle({});
        }
    }, [style]);

    const filteredNavItems = mainNavItems;
    
    // Get the first available menu item's href for logo link
    const getFirstAvailableHref = () => {
        if (filteredNavItems.length === 0) return route('dashboard');
        
        const firstItem = filteredNavItems[0];
        if (firstItem.href) {
            return firstItem.href;
        } else if (firstItem.children && firstItem.children.length > 0) {
            return firstItem.children[0].href || route('dashboard');
        }
        return route('dashboard');
    };

    return (
        <Sidebar
            side={position}
            collapsible={collapsible}
            variant={variant}
            className={style !== 'plain' ? 'sidebar-custom-style' : ''}
            data-sidebar-style={style}
            dir={position === 'right' ? 'rtl' : 'ltr'}
        >
            <SidebarHeader className={style !== 'plain' ? 'sidebar-styled' : ''} style={sidebarStyle}>
                <div className="flex justify-center items-center">
                    <Link href={getFirstAvailableHref()} prefetch className="flex items-center justify-center">
                        {/* Logo for expanded sidebar */}
                        <div className="group-data-[collapsible=icon]:hidden flex items-center">
                            {(() => {
                                const isDark = document.documentElement.classList.contains('dark');
                                const currentLogo = isDark ? logoLight : logoDark;
                                
                                return currentLogo ? (
                                    <img
                                        key={currentLogo}
                                        src={getImageUrl(currentLogo)}
                                        alt="Logo"
                                        className="w-auto h-6 object-contain transition-all duration-200"
                                        onError={() => updateBrandSettings({ [isDark ? 'logoLight' : 'logoDark']: '' })}
                                    />
                                ) : (
                                    <div className="h-8 text-inherit font-semibold flex items-center text-lg tracking-tight">
                                        {titleText || 'Wusool'}
                                    </div>
                                );
                            })()} 
                        </div>

                        {/* Icon for collapsed sidebar */}
                        <div className="h-8 w-8 hidden group-data-[collapsible=icon]:block">
                            {(() => {
                                return favicon ? (
                                    <img
                                        key={favicon}
                                        src={getImageUrl(favicon)}
                                        alt="Icon"
                                        className="h-8 w-8 transition-all duration-200"
                                        onError={() => updateBrandSettings({ favicon: '' })}
                                    />
                                ) : (
                                    <div className="h-8 w-8 bg-primary text-white rounded flex items-center justify-center font-bold shadow-sm">
                                        W
                                    </div>
                                );
                            })()} 
                        </div>
                    </Link>
                </div>
                
                {/* Business Switcher - only meaningful with multiple businesses */}
                {userRole !== 'superadmin' && businesses.length > 1 && (
                    <div className="px-2 pb-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    className="w-full justify-between h-8 px-2 text-xs group-data-[collapsible=icon]:hidden"
                                    style={{ color: style !== 'plain' ? 'inherit' : undefined }}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Building2 className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{currentBusiness?.name || t('Select Business')}</span>
                                    </div>
                                    <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                                {businesses.length > 0 ? (
                                    businesses.map((business: any) => (
                                        <DropdownMenuItem 
                                            key={business.id}
                                            onClick={() => handleBusinessSwitch(business.id)}
                                            className={business.id === auth.user?.current_store ? 'bg-accent' : ''}
                                        >
                                            <Building2 className="h-4 w-4 me-2" />
                                            <span className="truncate">{business.name}</span>
                                            {business.id === auth.user?.current_store && (
                                                <span className="ms-auto text-xs text-muted-foreground">{t('Current')}</span>
                                            )}
                                        </DropdownMenuItem>
                                    ))
                                ) : (
                                    <DropdownMenuItem disabled>
                                        <span className="text-muted-foreground">{t('No businesses found')}</span>
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </SidebarHeader>

            <SidebarContent>
                <div style={sidebarStyle} className={`h-full ${style !== 'plain' ? 'sidebar-styled' : ''}`}>
                    <NavMain items={filteredNavItems} position={position} />
                </div>
            </SidebarContent>

            <SidebarFooter>
                {userRole !== 'superadmin' && auth.user?.plan && (
                    <div className="mx-2 mb-2">
                        <div className="rounded-xl bg-white border border-gray-200 p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <Zap className="h-3.5 w-3.5 text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t('Current Plan')}</p>
                                    <p className="text-[13px] font-semibold text-gray-800 truncate">{t(auth.user.plan?.name || 'Free')}</p>
                                </div>
                            </div>
                            <Link
                                href={route('plans.index')}
                                prefetch
                                className="flex items-center justify-center w-full rounded-lg bg-emerald-50 py-1.5 text-[12px] font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
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