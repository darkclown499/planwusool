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

      <div className="flex flex-1 flex-col gap-3.5 px-4 py-4 md:px-5 lg:px-6">
        {/* Compact coherent header */}
        <div className={stickyHeader
          ? "sticky top-0 z-30 flex items-start justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm -mx-4 md:-mx-5 lg:-mx-6"
          : "flex items-start justify-between gap-3"}>
          <div className="min-w-0">
            <h1 className="text-[17px] font-semibold leading-tight tracking-tight text-start">{title}</h1>
            {description && (
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground line-clamp-2 max-w-[72ch]">{description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
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

        {/* Content — content-driven height, no giant bordered shell */}
        <div className={noPadding ? "" : "flex flex-col min-w-0"}>
          {isStoreSettingsUrl(url) ? (
            <div className="flex flex-col gap-4">
              <StoreSettingsNav />
              <div>{children}</div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
      <FloatingChatGpt />
    </AppLayout>
  );
}