import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';
import { usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { getMerchantContextNav, resolvePrimaryId } from '@/config/merchant-navigation';
import { MerchantMobileSectionSwitcher } from '@/components/merchant/MerchantMobileSectionSwitcher';
import { MerchantMobileBottomNav } from '@/components/merchant/MerchantMobileBottomNav';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const { t } = useTranslation();
    const { props, url } = usePage() as any;
    const auth = props?.auth;
    const userRole = auth?.user?.type || auth?.user?.role;
    const currentStoreId = auth?.user?.current_store as string | number | undefined;
    const pageUrl = (url as string) || '';
    const isMerchant = userRole !== 'superadmin';

    let mobileSwitcher: { title: string; items: any[] } | null = null;
    if (isMerchant) {
        const primary = resolvePrimaryId(pageUrl, currentStoreId);
        if (primary) {
            const perms = (auth?.permissions || []) as string[];
            const hasPermission = (p: string) => perms.includes(p);
            const routeExists = (name: string) => { try { route(name); return true; } catch { return false; } };
            const safeRoute = (name: string, params: any, fallback: string) => { try { return route(name, params); } catch { return fallback; } };
            const ctx = getMerchantContextNav(primary, { storeId: currentStoreId, t, permissions: perms, hasPermission, routeExists, safeRoute });
            if (ctx && ctx.items.length > 0) mobileSwitcher = ctx;
        }
    }

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {mobileSwitcher && <MerchantMobileSectionSwitcher sectionTitle={mobileSwitcher.title} items={mobileSwitcher.items} />}
                {children}
                {isMerchant && (
                    <>
                        <div aria-hidden className="xl:hidden h-[calc(3.5rem+env(safe-area-inset-bottom))]" />
                        <MerchantMobileBottomNav />
                    </>
                )}
            </AppContent>
        </AppShell>
    );
}
