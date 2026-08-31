import { Head, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';
import { FloatingChatGpt } from '@/components/FloatingChatGpt';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StoreSettingsNav } from '@/components/merchant/StoreSettingsNav';
import { isStoreSettingsUrl } from '@/config/merchant-navigation';

export interface PageAction {
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onClick?: () => void;
  disabled?: boolean;
}

export interface PageTemplateProps {
  title: string;
  description?: string;
  url: string;
  actions?: PageAction[];
  action?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  backUrl?: string;
  stickyHeader?: boolean;
}

export function PageTemplate({ 
  title,
  description, 
  url, 
  actions, 
  action,
  children, 
  noPadding = false,
  breadcrumbs,
  backUrl,
  stickyHeader = false
}: PageTemplateProps) {
  const { t } = useTranslation();

  // Embedded mode: when the page is rendered inside an iframe (e.g. the
  // unified store-settings tabs), skip the dashboard chrome entirely.
  if (typeof window !== 'undefined' && window.self !== window.top) {
    return (
      <>
        <Head title={title} />
        {children}
      </>
    );
  }

  // Default breadcrumbs if none provided
  const pageBreadcrumbs: BreadcrumbItem[] = breadcrumbs || [
    {
      title,
      href: url,
    },
  ];

  return (
    <AppLayout breadcrumbs={pageBreadcrumbs}>
      <Head title={title} />
      
      <div className="flex h-full flex-1 flex-col gap-4 p-4">
        {/* Header with action buttons */}
        <div className={stickyHeader
          ? "sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm -mx-4"
          : "flex items-center justify-between"}>
          <h1 className="text-xl font-semibold text-start">{title}</h1>
          <div className="flex items-center gap-2">
            {backUrl && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2 h-8 px-3"
                onClick={() => router.visit(backUrl)}
              >
                <ArrowLeft className="h-4 w-4 text-neutral-500 rtl-flip" />
                <span>{t('Back')}</span>
              </Button>
            )}
            {actions && actions.length > 0 && (
              <div className="flex items-center gap-2">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || 'outline'}
                    size="sm"
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
            {action}
          </div>
        </div>
        
        {/* Content */}
        <div className={noPadding ? "" : "rounded-xl border p-6"}>
          {isStoreSettingsUrl(url) && <StoreSettingsNav />}
          <div className={isStoreSettingsUrl(url) ? "mt-5" : undefined}>
            {children}
          </div>
        </div>
      </div>
      <FloatingChatGpt />
    </AppLayout>
  );
}