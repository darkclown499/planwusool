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
            <header className="flex h-13 shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4 overflow-x-clip">
            <div className="flex w-full min-w-0 items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {position === 'left' && <SidebarTrigger className="-ms-1 shrink-0" />}
                    <div className="text-sm font-medium min-w-0 truncate">
                        <Breadcrumbs items={breadcrumbs.map(b => ({ label: b.title, href: b.href }))} />
                    </div>
                    {position === 'right' && <SidebarTrigger className="-me-1 shrink-0 xl:hidden" />}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Secondary actions — hidden on mobile to reduce crowding, visible from xl */}
                    <div className="hidden xl:flex items-center gap-1.5">
                        <GlobalSearch
                            open={searchOpen}
                            onOpenChange={setSearchOpen}
                            trigger={
                                <button
                                    onClick={() => setSearchOpen(true)}
                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                                    aria-label={t('Search for products, orders, customers or pages...')}
                                    title={t('Search for products, orders, customers or pages...')}
                                >
                                    <Search className="h-3.5 w-3.5 text-gray-500" />
                                </button>
                            }
                        />
                        <button
                            onClick={() => router.reload({ only: ['dashboardData'] })}
                            className="hidden 2xl:inline-flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                            aria-label={t('Refresh')}
                            title={t('Refresh')}
                        >
                            <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                        <button
                            onClick={() => start()}
                            className="hidden 2xl:inline-flex items-center justify-center h-8 w-8 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                            aria-label={t('Guide Tour')}
                            title={t('Guide Tour')}
                        >
                            <HelpCircle className="h-3.5 w-3.5 text-gray-500" />
                        </button>
                    </div>
                    
                    {/* Essential: Store Switcher */}
                    {((usePage().props as any).auth?.user?.type === 'company' || ((usePage().props as any).stores && (usePage().props as any).stores.length > 0)) && (
                        <StoreSwitcher 
                            items={(usePage().props as any).stores || []} 
                            currentStore={((usePage().props as any).stores || []).find((store: any) => String(store.id) === String((usePage().props as any).auth?.user?.current_store)) || ((usePage().props as any).stores?.length > 0 ? (usePage().props as any).stores[0] : null)} 
                        />
                    )}
                    
                    {(usePage().props as any).isImpersonating && (
                        <button 
                            onClick={() => router.post(route('impersonate.leave'))}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 shrink-0"
                        >
                            {t("Return Back")}
                        </button>
                    )}
                    <LanguageSwitcher />
                    <MerchantNotificationBell />
                    <ProfileMenu />
                    {position === 'right' && <SidebarTrigger className="-me-1 shrink-0 hidden xl:flex" />}
                    {position === 'left' && <SidebarTrigger className="-ms-1 shrink-0 xl:hidden" />}
                </div>
            </div>
        </header>
        </>
    );
}
