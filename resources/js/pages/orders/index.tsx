import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Plus, RefreshCw, Download, ShoppingCart, Eye, Edit, Trash2, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';
import { tOrderStatus, tPaymentMethod } from '@/utils/order-status';

interface OrdersProps {
  orders: Array<{
    id: number;
    orderNumber: string;
    customer: string;
    email: string;
    total: number;
    status: string;
    paymentStatus?: string;
    fulfillment?: string;
    items: number;
    date: string;
    paymentMethod: string;
  }>;
  stats: {
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
  };
}

export default function Orders({ orders = [], stats }: OrdersProps) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);

  
  const handleActionClick = (action: string, permission: string, orderId?: number) => {
    if (!checkPermission(permission, auth)) {
      return;
    }
    
    switch (action) {
      case 'view':
        router.visit(route('orders.show', orderId));
        break;
      case 'edit':
        router.visit(route('orders.edit', orderId));
        break;
      case 'delete':
        setOrderToDelete(orderId!);
        break;
      case 'export':
        window.open(route('orders.export'), '_blank');
        break;
    }
  };
  
  const handleDelete = () => {
    if (orderToDelete && checkPermission('delete-orders', auth)) {
      router.delete(route('orders.destroy', orderToDelete));
      setOrderToDelete(null);
    }
  };

  const pageActions = [
    ...(hasPermission('export-orders') ? [{
      label: t('Export Orders'),
      icon: <Download className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => handleActionClick('export', 'export-orders')
    }] : [])
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Completed': return 'default';
      case 'Processing': return 'secondary';
      case 'Shipped': return 'outline';
      case 'Cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <PageTemplate 
      title={t('Order Management')}
      url="/orders"
      actions={pageActions}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Order Management') }
      ]}
    >
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader dir="rtl" className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Orders')}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-start">{stats?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground text-start">{t('Total orders in store')}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader dir="rtl" className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Pending Orders')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-start">{stats?.pendingOrders || 0}</div>
              <p className="text-xs text-muted-foreground text-start">{t('Need attention')}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader dir="rtl" className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Revenue')}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-start">{formatCurrency(stats?.totalRevenue || 0)}</div>
              <p className="text-xs text-muted-foreground text-start">{t('Total revenue')}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader dir="rtl" className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Avg. Order Value')}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-start">{formatCurrency(stats?.avgOrderValue || 0)}</div>
              <p className="text-xs text-muted-foreground text-start">{t('Average order value')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Recent Orders')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.length > 0 ? orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <ShoppingCart className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{order.orderNumber}</h3>
                        <Badge variant={getStatusVariant(order.status)}>
                          {tOrderStatus(order.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{order.customer} • {order.email}</p>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{formatCurrency(order.total)}</span>
                        <span className="text-xs text-muted-foreground">{t('{{items}} items', { items: order.items })}</span>
                        <span className="text-xs text-muted-foreground">{order.date}</span>
                        <span className="text-xs text-muted-foreground">{tPaymentMethod(order.paymentMethod)}</span>
                        {(order as any).fulfillment && <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{(order as any).fulfillment}</span>}
                        {(order as any).paymentStatus && <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{tPaymentStatus((order as any).paymentStatus)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hasPermission('view-orders') && (
                      <Button variant="ghost" size="sm" onClick={() => handleActionClick('view', 'view-orders', order.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission('edit-orders') && (
                      <Button variant="ghost" size="sm" onClick={() => handleActionClick('edit', 'edit-orders', order.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {hasPermission('delete-orders') && (
                      <Button variant="ghost" size="sm" onClick={() => handleActionClick('delete', 'delete-orders', order.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 px-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                    <ShoppingCart className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">لا توجد طلبات بعد</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    ستظهر طلبات العملاء هنا بعد أول عملية شراء. تأكد من نشر متجرك ومشاركة رابطه.
                  </p>
                  <Button variant="outline" className="mt-6 gap-2" onClick={() => window.open((usePage().props as any).storeUrl || '/', '_blank')}>
                    <Package className="h-4 w-4" />
                    عرض المتجر
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">{t('Delete Order')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('Are you sure you want to delete this order? This action cannot be undone.')}
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setOrderToDelete(null)}>
                {t('Cancel')}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                {t('Delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}