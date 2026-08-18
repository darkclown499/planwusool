import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Plus, RefreshCw, Download, Users, Eye, Edit, Trash2, Mail, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { getImageUrl } from '@/utils/image-helper';
import { formatCurrency } from '@/utils/currency-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';

export default function Customers() {
  const { t } = useTranslation();
  const { customers, stats, auth } = usePage().props as any;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);


  const handleActionClick = (action: string, callback: () => void) => {
    if (checkPermission(action, auth)) {
      callback();
    }
  };

  const handleDelete = (customer: any) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    router.delete(route('customers.destroy', selectedCustomer.id), {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
      }
    });
  };

  const pageActions = [
    ...(hasPermission('export-customers') ? [{
      label: t('Export Customers'),
      icon: <Download className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => handleActionClick('export-customers', () => window.open(route('customers.export'), '_blank'))
    }] : []),
    ...(hasPermission('create-customers') ? [{
      label: t('Create Customer'),
      icon: <Plus className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => handleActionClick('create-customers', () => router.visit(route('customers.create')))
    }] : [])
  ];

  return (
    <>
      <PageTemplate 
        title={t('Customer Management')}
        url="/customers"
        actions={pageActions}
        breadcrumbs={[
          { title: t('Dashboard'), href: route('dashboard') },
          { title: t('Customer Management') }
        ]}
      >
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader dir="rtl" className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('Total Customers')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-start">{stats.totalCustomers}</div>
                <p className="text-xs text-muted-foreground text-start">{stats.newThisMonth > 0 ? t('+{{count}} from last month', { count: stats.newThisMonth }) : t('No new customers')}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader dir="rtl" className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('Active Customers')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-start">{stats.activeCustomers}</div>
                <p className="text-xs text-muted-foreground text-start">
                  {t('{{percent}}% active rate', { percent: stats.totalCustomers > 0 ? Math.round((stats.activeCustomers / stats.totalCustomers) * 100) : 0 })}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader dir="rtl" className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('New This Month')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-start">{stats.newThisMonth}</div>
                <p className="text-xs text-muted-foreground text-start">
                  {stats.totalCustomers > 0 ? t('{{percent}}% growth', { percent: Math.round((stats.newThisMonth / stats.totalCustomers) * 100) }) : t('No growth')}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader dir="rtl" className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('Avg. Order Value')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-start ltr-num">{formatCurrency(stats.avgOrderValue)}</div>
                <p className="text-xs text-muted-foreground text-start">{t('Per order')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Customers List */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Customer Directory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                    <h3 className="mt-4 text-lg font-medium">{t('No customers found')}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t('Get started by adding your first customer.')}
                    </p>
                    {hasPermission('create-customers') && (
                      <Button 
                        onClick={() => handleActionClick('create-customers', () => router.visit(route('customers.create')))} 
                        className="mt-4"
                      >
                        <Plus className="h-4 w-4 me-2" />
                        {t('Create Customer')}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customers.map((customer: any) => (
                      <div key={customer.id} className="flex items-center justify-between gap-4 p-4 border rounded-lg">
                        <div className="flex items-center gap-4 min-w-0">
                          <Avatar className="h-12 w-12 shrink-0">
                            <AvatarImage src={customer.avatar ? getImageUrl(customer.avatar) : ''} alt={customer.full_name} />
                            <AvatarFallback>{customer.initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{customer.full_name}</h3>
                              <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                                {customer.is_active ? t('Active') : t('Inactive')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span>{customer.email}</span>
                              {customer.phone && (
                                <>
                                  <Phone className="h-3 w-3 ms-2 shrink-0" />
                                  <span>{customer.phone}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 flex-wrap">
                              <span className="text-xs text-muted-foreground">{t('{{count}} orders', { count: customer.total_orders })}</span>
                              <span className="text-xs text-muted-foreground">{t('{{amount}} spent', { amount: formatCurrency(customer.total_spent || 0) })}</span>
                              <span className="text-xs text-muted-foreground">{t('Joined {{date}}', { date: new Date(customer.created_at).toLocaleDateString() })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {hasPermission('view-customers') && (
                            <Button variant="ghost" size="sm" onClick={() => handleActionClick('view-customers', () => router.visit(route('customers.show', customer.id)))}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('edit-customers') && (
                            <Button variant="ghost" size="sm" onClick={() => handleActionClick('edit-customers', () => router.visit(route('customers.edit', customer.id)))}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('delete-customers') && (
                            <Button variant="ghost" size="sm" onClick={() => handleActionClick('delete-customers', () => handleDelete(customer))}>
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
            <DialogTitle>{t('Delete Customer')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>{t('Are you sure you want to delete the customer "{{name}}"?', { name: selectedCustomer?.full_name })}</p>
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
    </>
  );
}