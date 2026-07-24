import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Plus, RefreshCw, Zap, Eye, Edit, Trash2, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';

export default function ExpressCheckout() {
  const { t } = useTranslation();
  const { checkouts, stats, auth } = usePage().props as any;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<any>(null);


  const handleActionClick = (action: string, permission: string, checkout?: any) => {
    if (!checkPermission(permission, auth)) {
      return;
    }
    
    switch (action) {
      case 'view':
        router.visit(route('express-checkout.show', checkout.id));
        break;
      case 'edit':
        router.visit(route('express-checkout.edit', checkout.id));
        break;
      case 'delete':
        setSelectedCheckout(checkout);
        setIsDeleteDialogOpen(true);
        break;
      case 'settings':
        setSelectedCheckout(checkout);
        setIsSettingsDialogOpen(true);
        break;
      case 'create':
        router.visit(route('express-checkout.create'));
        break;
    }
  };

  const handleDelete = (checkout) => {
    handleActionClick('delete', 'delete-express-checkout', checkout);
  };

  const handleSettings = (checkout) => {
    handleActionClick('settings', 'settings-express-checkout', checkout);
  };

  const handleDeleteConfirm = () => {
    router.delete(route('express-checkout.destroy', selectedCheckout.id), {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
      }
    });
  };

  const pageActions = [
    ...(hasPermission('create-express-checkout') ? [{
      label: t('Create Checkout'),
      icon: <Plus className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => handleActionClick('create', 'create-express-checkout')
    }] : [])
  ];

  return (
    <>
      <PageTemplate 
        title={t('Express Checkout')}
        url="/express-checkout"
        actions={pageActions}
        breadcrumbs={[
          { title: t('Dashboard'), href: route('dashboard') },
          { title: t('Express Checkout') }
        ]}
      >
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('Total Checkouts')}</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">{stats.total > 0 ? t('{{count}} checkouts', { count: stats.total }) : t('No checkouts')}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('Active Checkouts')}</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.active}</div>
                <p className="text-xs text-muted-foreground">
                  {t('{{percent}}% active rate', { percent: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0 })}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('Conversion Rate')}</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.conversionRate}%</div>
                <p className="text-xs text-muted-foreground">{t('Average conversion rate')}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('Total Revenue')}</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">{t('From express checkouts')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Express Checkout List */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Express Checkout Methods')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checkouts.length === 0 ? (
                  <div className="text-center py-12">
                    <Zap className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                    <h3 className="mt-4 text-lg font-medium">{t('No express checkouts found')}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t('Get started by creating your first express checkout.')}
                    </p>
                    {hasPermission('create-express-checkout') && (
                      <Button 
                        onClick={() => handleActionClick('create', 'create-express-checkout')} 
                        className="mt-4"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('Create Checkout')}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {checkouts.map((checkout) => (
                      <div key={checkout.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Zap className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{checkout.name}</h3>
                              <Badge variant={checkout.is_active ? 'default' : 'secondary'}>
                                {checkout.is_active ? t('Active') : t('Inactive')}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{checkout.type_display} • {checkout.description}</p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-muted-foreground">{t('{{count}} conversions', { count: checkout.conversions })}</span>
                              <span className="text-xs text-muted-foreground">{checkout.conversion_rate}% {t('conversion rate')}</span>
                              <span className="text-xs text-muted-foreground">{t('{{amount}} revenue', { amount: formatCurrency(checkout.revenue) })}</span>
                              <span className="text-xs text-muted-foreground">
                                {checkout.payment_methods_display?.join(', ') || t('No payment methods')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {hasPermission('view-express-checkout') && (
                            <Button variant="ghost" size="sm" onClick={() => handleActionClick('view', 'view-express-checkout', checkout)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('edit-express-checkout') && (
                            <Button variant="ghost" size="sm" onClick={() => handleActionClick('edit', 'edit-express-checkout', checkout)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('settings-express-checkout') && (
                            <Button variant="ghost" size="sm" onClick={() => handleActionClick('settings', 'settings-express-checkout', checkout)}>
                              <Settings className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('delete-express-checkout') && (
                            <Button variant="ghost" size="sm" onClick={() => handleActionClick('delete', 'delete-express-checkout', checkout)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTemplate>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete Express Checkout')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>{t('Are you sure you want to delete the express checkout "{{name}}"?', { name: selectedCheckout?.name })}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('This action cannot be undone.')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>{t('Cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>{t('Delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('Checkout Settings')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedCheckout && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{t('Status')}</h3>
                    <p className="text-sm text-muted-foreground">{t('Enable or disable this checkout')}</p>
                  </div>
                  <Badge variant={selectedCheckout.is_active ? 'default' : 'secondary'}>
                    {selectedCheckout.is_active ? t('Active') : t('Inactive')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{t('Payment Methods')}</h3>
                    <p className="text-sm text-muted-foreground">{t('Configured payment options')}</p>
                  </div>
                  <span className="text-sm">{t('{{count}} methods', { count: selectedCheckout.payment_methods?.length || 0 })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{t('Performance')}</h3>
                    <p className="text-sm text-muted-foreground">{t('Conversion metrics')}</p>
                  </div>
                  <span className="text-sm">{t('{{count}} conversions', { count: selectedCheckout.conversions })}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>{t('Close')}</Button>
            {hasPermission('edit-express-checkout') && (
              <Button onClick={() => {
                setIsSettingsDialogOpen(false);
                handleActionClick('edit', 'edit-express-checkout', selectedCheckout);
              }}>{t('Edit Settings')}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}