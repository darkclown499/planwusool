import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLayout } from '@/contexts/LayoutContext';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { ProfileMenu } from '@/components/profile-menu';
import { LanguageSwitcher } from '@/components/language-switcher';
import { usePage, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { StoreSwitcher } from '@/components/store-switcher';
import { Search, RefreshCw } from 'lucide-react';
import { useState, useCallback } from 'react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    const { t } = useTranslation();
    const { position } = useLayout();
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.get(route('companies.index'), { search: searchQuery.trim() }, { preserveState: true });
        }
    }, [searchQuery]);

    return (
        <>
            <header className="border-sidebar-border/50 flex h-14 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-3">
            <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                    {position === 'left' && <SidebarTrigger className="-ml-1" />}
                    <div className="text-sm font-medium">
                        <Breadcrumbs items={breadcrumbs.map(b => ({ label: b.title, href: b.href }))} />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('Search for an order, product, or customer...')}
                                className="h-8 w-48 rounded-md border bg-background px-8 text-xs outline-none focus:w-64 focus:border-primary transition-all duration-200 placeholder:text-muted-foreground"
                            />
                        </div>
                    </form>

                    {/* Refresh Button */}
                    <button
                        onClick={() => router.reload({ only: ['dashboardData'] })}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                        title={t('Refresh')}
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    
                    {/* Store Switcher - Show for company users and sub-users with stores data */}
                    {((usePage().props as any).auth?.user?.type === 'company' || ((usePage().props as any).stores && (usePage().props as any).stores.length > 0)) && (
                        <StoreSwitcher 
                            items={(usePage().props as any).stores || []} 
                            currentStore={((usePage().props as any).stores || []).find(store => String(store.id) === String((usePage().props as any).auth?.user?.current_store)) || ((usePage().props as any).stores?.length > 0 ? (usePage().props as any).stores[0] : null)} 
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
                    <ProfileMenu />
                    {position === 'right' && <SidebarTrigger className="-mr-1" />}
                </div>
            </div>
        </header>
        </>
    );
}