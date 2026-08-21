import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { ArrowLeft, Edit, Settings, Globe, Paintbrush, LayoutTemplate, MoreVertical, CreditCard, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { formatLocalDate } from '@/utils/date-helper';

export default function ViewStore({ store, stats }: any) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;

  
  // Get permissions directly
  const userPermissions = typeof auth?.permissions === 'function' ? auth.permissions() : (auth?.permissions || []);
  const hasEditPermission = userPermissions.includes('edit-stores');

  const pageActions = [
    {
      label: t('Visit Store'),
      icon: <Globe className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => {
        const getStoreUrl = () => {
          const protocol = window.location.protocol;
          
          if (store.enable_custom_domain && store.custom_domain) {
            return `${protocol}//${store.custom_domain}`;
          }
          
          if (store.enable_custom_subdomain && store.custom_subdomain) {
            // Get base domain dynamically
            const currentHost = window.location.hostname;
            const baseDomain = currentHost.includes('localhost') 
              ? 'localhost' 
              : currentHost.split('.').slice(-2).join('.');
            return `${protocol}//${store.custom_subdomain}.${baseDomain}`;
          }
          
          return route('store.home', store.slug);
        };
        
        window.open(getStoreUrl(), '_blank');
      }
    },
    ...(hasEditPermission ? [{
      label: t('Edit Store'),
      icon: <Edit className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => router.visit(route('stores.edit', store.id))
    }] : [])
  ];

  return (
    <PageTemplate 
      title={t(`Store Details`)}
      url={`/stores/${store.id}`}
      actions={pageActions}
      action={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <MoreVertical className="h-4 w-4" />
              إدارة المتجر
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.open(route('stores.designer', store.id) as string, '_blank')}>
              <Paintbrush className="h-4 w-4" />
              تصميم المتجر
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.visit(route('stores.features', store.id))}>
              <LayoutTemplate className="h-4 w-4" />
              ميزات المتجر
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.visit(route('stores.payments', store.id))}>
              <CreditCard className="h-4 w-4" />
              طرق الدفع
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.visit(route('stores.erp', store.id))}>
              <Link2 className="h-4 w-4" />
              ربط ERP والمخزون
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.visit(route('stores.settings', store.id))}>
              <Settings className="h-4 w-4" />
              إعدادات عامة
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      backUrl={route('stores.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Stores'), href: route('stores.index') },
        { title: t(`Store Details`) }
      ]}
    >
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('Store Information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Store Name')}</p>
                <p className="text-lg font-semibold">{store.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Status')}</p>
                <Badge variant={store.config_status ? "default" : "secondary"}>
                  {store.config_status ? t('Active') : t('Inactive')}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Domain')}</p>
                <p>{store.domain ? <span dir="ltr">{store.domain}</span> : t('No domain set')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Email')}</p>
                <p>{store.email ? <span dir="ltr">{store.email}</span> : t('No email set')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Theme')}</p>
                <p>{store.theme}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Created')}</p>
                <p>{formatLocalDate(store.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Store Statistics')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4" dir="rtl">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t('Total Orders')}</span>
                <span className="font-semibold">{stats?.total_orders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t('Total Revenue')}</span>
                <span className="font-semibold">{formatCurrency(stats?.total_revenue || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t('Total Products')}</span>
                <span className="font-semibold">{stats?.total_products || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t('Total Customers')}</span>
                <span className="font-semibold">{stats?.total_customers || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTemplate>
  );
}