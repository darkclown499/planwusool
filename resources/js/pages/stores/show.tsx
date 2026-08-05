import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { ArrowLeft, Edit, Settings, Palette, Building2, Globe, Users, BarChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { formatLocalDate } from '@/utils/date-helper';

export default function StoreView({ store }: any) {
  const { t } = useTranslation();

  const auth = usePage().props.auth as any;
  const themeEditorEnabled = auth?.user?.type === 'superadmin' || (auth?.user?.plan?.enable_theme_editor ?? 'off') === 'on';


  const pageActions = [
    {
      label: t('Edit'),
      icon: <Edit className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => router.visit(route('stores.edit', store.id))
    },
    ...(themeEditorEnabled ? [{
      label: t('Edit Template'),
      icon: <Palette className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => router.visit(route('stores.appearance', store.id))
    }] : []),
    {
      label: t('Settings'),
      icon: <Settings className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => router.visit(route('stores.settings', store.id))
    }
  ];

  return (
    <PageTemplate 
      title={store.name}
      url={`/stores/${store.id}`}
      actions={pageActions}
      backUrl={route('stores.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Store Management'), href: route('stores.index') },
        { title: t('Store Details') }
      ]}
    >
      <div className="space-y-6">
        {/* Store Overview */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Store Overview')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-2xl font-bold">{store.name}</h2>
                    <Badge variant={store.config_status ? 'default' : 'secondary'}>
                      {store.config_status ? t('Active') : t('Inactive')}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{store.domain ? <span dir="ltr">{store.domain}</span> : t('No domain set')}</p>
                </div>
              </div>
              <div className="mt-4 md:mt-0">
                <p className="text-sm">
                  <span className="font-medium">{t('Theme')}:</span> {store.theme}
                </p>
                <p className="text-sm">
                  <span className="font-medium">{t('Created')}:</span> {formatLocalDate(store.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Store Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Products')}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{store.products_count || 0}</div>
              <p className="text-xs text-muted-foreground">{t('+12 from last week')}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Orders')}</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{store.orders_count || 0}</div>
              <p className="text-xs text-muted-foreground">{t('+8% this month')}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Customers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{store.customers_count || 0}</div>
              <p className="text-xs text-muted-foreground">{t('+15% from last month')}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Revenue')}</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(store.revenue || 0)}</div>
              <p className="text-xs text-muted-foreground">{t('+20% from last month')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Store Description */}
        {store.description && (
          <Card>
            <CardHeader>
              <CardTitle>{t('Description')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{store.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTemplate>
  );
}