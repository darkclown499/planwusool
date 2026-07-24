import { SidebarProvider } from '@/components/ui/sidebar';
import { useLayout } from '@/contexts/LayoutContext';
import { BrandProvider } from '@/contexts/BrandContext';
import { FloatingChatGpt } from '@/components/FloatingChatGpt';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { usePage } from '@inertiajs/react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

export function AppShell({ children, variant = 'header' }: AppShellProps) {
    const [isOpen, setIsOpen] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('sidebar') !== 'false' : true));
    const { props } = usePage();
    const globalSettings = (props as any)?.globalSettings;
    const user = (props as any)?.auth?.user;
    const shouldShowCookie = true;

    const handleSidebarChange = (open: boolean) => {
        setIsOpen(open);

        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar', String(open));
        }
    };

    if (variant === 'header') {
        return (
            <BrandProvider globalSettings={globalSettings} user={user}>
                <div className="flex min-h-screen w-full flex-col">
                    {children}
                    <FloatingChatGpt />
                    {shouldShowCookie && <CookieConsentBanner />}
                </div>
            </BrandProvider>
        );
    }

    const { position } = useLayout();

    return (
        <BrandProvider globalSettings={globalSettings} user={user}>
            <SidebarProvider defaultOpen={isOpen} open={isOpen} onOpenChange={handleSidebarChange}>
                <div className={cn('flex w-full', position === 'right' ? 'flex-row-reverse' : 'flex-row')}>
                    {children}
                    <FloatingChatGpt />
                    {shouldShowCookie && <CookieConsentBanner />}
                </div>
            </SidebarProvider>
        </BrandProvider>
    );
}
