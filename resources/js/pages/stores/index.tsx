import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Plus, RefreshCw, Download, Building2, Globe, Users, BarChart, Settings, Eye, Edit, Trash2, LayoutTemplate, Paintbrush, MoreVertical, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { formatLocalDate } from '@/utils/date-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';

interface PageAction {
  label: string;
  icon: React.ReactNode;
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onClick: () => void;
}

interface StoreManagementProps {
  stores?: any[];
  storeStats?: Record<string, any>;
}

export default function StoreManagement({ stores = [], storeStats = {} }: StoreManagementProps) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const [storeToDelete, setStoreToDelete] = useState<number | null>(null);

  const handleActionClick = (action: string, permission: string, storeId?: number) => {
    if (!checkPermission(permission, auth)) {
      return;
    }
    
    switch (action) {
      case 'view':
        router.visit(route('stores.show', storeId));
        break;
      case 'edit':
        router.visit(route('stores.edit', storeId));
        break;
      case 'settings':
        router.visit(route('stores.settings', storeId));
        break;
      case 'delete':
        if (stores.length <= 1) {
          return; // Prevent deletion of last store
        }
        setStoreToDelete(storeId!);
        break;
      case 'create':
        router.visit(route('stores.create'));
        break;
      case 'export':
        window.open(route('stores.export'), '_blank');
        break;
    }
  };
  
  const handleDelete = () => {
    if (storeToDelete && checkPermission('delete-stores', auth)) {
      router.delete(route('stores.destroy', storeToDelete));
      setStoreToDelete(null);
    }
  };

  const pageActions: PageAction[] = [
    ...(hasPermission('export-stores') ? [{
      label: t('Export'),
      icon: <Download className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => handleActionClick('export', 'export-stores')
    }] : []),
    ...(hasPermission('create-stores') ? [{
      label: t('Create Store'),
      icon: <Plus className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => handleActionClick('create', 'create-stores')
    }] : [])
  ];

  return (
    <PageTemplate 
      title={t('Stores')}
      url="/stores"
      actions={pageActions}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Store Management'), href: route('stores.index') },
        { title: t('Stores') }
      ]}
    >
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Stores')}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stores.length}</div>
              <p className="text-xs text-muted-foreground">{t('Your store count')}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Active Stores')}</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stores.filter(store => store.config_status).length}</div>
              <p className="text-xs text-muted-foreground">
                {stores.length > 0 ? 
                  t('{{percent}}% active rate', { percent: Math.round((stores.filter(store => store.config_status).length / stores.length) * 100) }) : 
                  t('No stores yet')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Customers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{storeStats.totalCustomers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {storeStats.customerGrowth >= 0 ? '+' : ''}{storeStats.customerGrowth || 0}% {t('from last month')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Revenue')}</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(storeStats.totalRevenue || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {storeStats.revenueGrowth >= 0 ? '+' : ''}{storeStats.revenueGrowth || 0}% {t('from last month')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stores List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Your Stores')}</CardTitle>
          </CardHeader>
          <CardContent>
            {stores.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('No stores yet')}</h3>
                <p className="text-muted-foreground mb-4">{t('Create your first store to get started')}</p>
                {hasPermission('create-stores') && (
                  <Button onClick={() => handleActionClick('create', 'create-stores')}>
                    <Plus className="h-4 w-4 me-2" /> {t('Create Store')}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-lg cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => handleActionClick('view', 'view-stores', store.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{store.name}</h3>
                        <Badge variant={store.config_status ? 'default' : 'secondary'}>
                          {store.config_status ? t('Active') : t('Inactive')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {(() => {
                          const domain = store.custom_domain || store.custom_subdomain;
                          return domain ? <span dir="ltr">{domain}</span> : t('No domain set');
                        })()}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="text-xs text-muted-foreground">{t('Category: {{category}}', { category: store.theme })}</span>
                        <span className="text-xs text-muted-foreground">{t('Created: {{date}}', { date: formatLocalDate(store.created_at) })}</span>
                        <span className="text-xs text-muted-foreground">{t('{{orders}} orders', { orders: store.orders_count || 0 })}</span>
                        <span className="text-xs text-muted-foreground">{t('{{revenue}} revenue', { revenue: formatCurrency(store.revenue || 0) })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasPermission('view-stores') && (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={(e) => { e.stopPropagation(); handleActionClick('view', 'view-stores', store.id); }}>
                        <Eye className="h-3.5 w-3.5" />
                        {t('View Store')}
                      </Button>
                    )}
                    {hasPermission('edit-stores') && (
                      <Button variant="secondary" size="sm" className="gap-1.5" onClick={(e) => { e.stopPropagation(); handleActionClick('edit', 'edit-stores', store.id); }}>
                        <Edit className="h-3.5 w-3.5" />
                        {t('Edit')}
                      </Button>
                    )}
                    {(hasPermission('settings-stores') || hasPermission('delete-stores')) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={t('Actions')} title={t('Actions')} onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {hasPermission('settings-stores') && (
                            <>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.visit(route('stores.designer', store.id)); }}>
                                <Paintbrush className="h-4 w-4" />
                                تصميم المتجر
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.visit(route('stores.features', store.id)); }}>
                                <LayoutTemplate className="h-4 w-4" />
                                ميزات المتجر
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.visit(route('stores.payments', store.id)); }}>
                                <CreditCard className="h-4 w-4" />
                                إعدادات الدفع
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.visit(route('stores.settings', store.id)); }}>
                                <Settings className="h-4 w-4" />
                                إعدادات المتجر
                              </DropdownMenuItem>
                            </>
                          )}
                          {hasPermission('settings-stores') && hasPermission('delete-stores') && <DropdownMenuSeparator />}
                          {hasPermission('delete-stores') && (
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={stores.length <= 1}
                              onClick={(e) => { e.stopPropagation(); handleActionClick('delete', 'delete-stores', store.id); }}
                            >
                              <Trash2 className="h-4 w-4" />
                              {t('Delete')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!storeToDelete} onOpenChange={(open) => !open && setStoreToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete Store')}</DialogTitle>
            <DialogDescription>
              {t('Are you sure you want to delete this store? This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoreToDelete(null)}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}