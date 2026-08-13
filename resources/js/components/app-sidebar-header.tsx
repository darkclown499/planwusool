import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLayout } from '@/contexts/LayoutContext';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { ProfileMenu } from '@/components/profile-menu';
import { LanguageSwitcher } from '@/components/language-switcher';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { StoreSwitcher } from '@/components/store-switcher';
import { MerchantNotificationBell } from '@/components/merchant-notification-bell';
import { useTour } from '@/components/tour/tour-context';
import { GlobalSearch } from '@/components/global-search';
import { Search, RefreshCw, HelpCircle } from 'lucide-react';
import { useState } from 'react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { t } = useTranslation();
    const { position } = useLayout();
    const { start } = useTour();
    const [searchOpen, setSearchOpen] = useState(false);

    return (
        <>
            <header className="border-sidebar-border/50 flex h-14 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-3">
            <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                    {position === 'left' && <SidebarTrigger className="-ms-1" />}
                    <div className="text-sm font-medium">
                        <Breadcrumbs items={breadcrumbs.map(b => ({ label: b.title, href: b.href }))} />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Global Search Button */}
                    <GlobalSearch
                        open={searchOpen}
                        onOpenChange={setSearchOpen}
                        trigger={
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                                aria-label={t('Search for products, orders, customers or pages...')}
                                title={t('Search for products, orders, customers or pages...')}
                            >
                                <Search className="h-3.5 w-3.5" />
                            </button>
                        }
                    />

                    {/* Refresh Button */}
                        <button
                            onClick={() => router.reload({ only: ['dashboardData'] })}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                            aria-label={t('Refresh')}
                            title={t('Refresh')}
                        >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>

                    {/* Guide Tour Button */}
                    <button
                        onClick={() => start()}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                        aria-label={t('Guide Tour')}
                        title={t('Guide Tour')}
                    >
                        <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                    
                    {/* Store Switcher - Show for company users and sub-users with stores data */}
                    {((usePage().props as any).auth?.user?.type === 'company' || ((usePage().props as any).stores && (usePage().props as any).stores.length > 0)) && (
                        <StoreSwitcher 
                            items={(usePage().props as any).stores || []} 
                            currentStore={((usePage().props as any).stores || []).find((store: any) => String(store.id) === String((usePage().props as any).auth?.user?.current_store)) || ((usePage().props as any).stores?.length > 0 ? (usePage().props as any).stores[0] : null)} 
                        />
                    )}
                    
                    {(usePage().props as any).isImpersonating && (
                        <button 
                            onClick={() => router.post(route('impersonate.leave'))}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                        >
                            {t("Return Back")}
                        </button>
                    )}
                    <LanguageSwitcher />
                    <MerchantNotificationBell />
                    <ProfileMenu />
                    {position === 'right' && <SidebarTrigger className="-me-1" />}
                </div>
            </div>
        </header>
        </>
    );
}