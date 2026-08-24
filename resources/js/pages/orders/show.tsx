import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { ArrowLeft, Edit, Package, User, CreditCard, Truck, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { getImageUrl } from '../../utils/image-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';
import { tOrderStatus, tPaymentStatus, tPaymentMethod } from '@/utils/order-status';

interface OrderShowProps {
  order: {
    id: number;
    orderNumber: string;
    date: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    bankTransferReceipt?: string;
    customer: {
      name: string;
      email: string;
      phone: string;
    };
    shippingAddress: {
      name: string;
      street: string;
      city: string;
      state: string;
      zip: string;
      country: string;
    };
    items: Array<{
      id: number;
      name: string;
      sku: string;
      quantity: number;
      price: number;
      image: string;
    }>;
    summary: {
      subtotal: number;
      shipping: number;
      tax: number;
      discount: number;
      total: number;
    };
    shippingMethod: string;
    trackingNumber?: string;
    timeline?: Array<{
      status: string;
      date?: string;
      completed?: boolean;
    }>;
  };
}

export default function ShowOrder({ order: initialOrder }: OrderShowProps) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const [order, setOrder] = React.useState(initialOrder);
  const [statusSaving, setStatusSaving] = React.useState(false);
  React.useEffect(() => setOrder(initialOrder), [initialOrder]);

  const handleStatusChange = async (newStatus: string) => {
    if (!newStatus || newStatus === order.status.toLowerCase()) return;
    setStatusSaving(true);
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch(route('orders.update', order.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': token,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ status: newStatus, payment_status: order.paymentStatus.toLowerCase(), tracking_number: order.trackingNumber || '', notes: (order as any).notes || '' }),
      });
      if (res.ok) {
        // Optimistic update — rebuild timeline locally
        const statusMap: Record<string, number> = { pending: 0, processing: 2, shipped: 3, delivered: 4, completed: 4, cancelled: -1 };
        const idx = statusMap[newStatus] ?? -1;
        setOrder((prev: any) => ({
          ...prev,
          status: newStatus.charAt(0).toUpperCase() + newStatus.slice(1),
          timeline: (prev.timeline || []).map((step: any, i: number) => {
            const stepKey = step.status.toLowerCase();
            const stepIdxMap: Record<string, number> = { 'order placed': 0, 'payment confirmed': 1, 'order processing': 2, shipped: 3, delivered: 4 };
            const sIdx = stepIdxMap[stepKey] ?? 99;
            if (newStatus === 'cancelled') return { ...step, completed: sIdx === 0 };
            return { ...step, completed: sIdx <= idx, date: sIdx <= idx ? new Date().toLocaleString() : step.date };
          }),
        }));
      }
    } catch {}
    setStatusSaving(false);
  };

  const handleActionClick = (action: string, permission: string) => {
    if (!checkPermission(permission, auth)) {
      return;
    }
    
    switch (action) {
      case 'edit':
        router.visit(route('orders.edit', order.id));
        break;
    }
  };

  const pageActions = [
    ...(hasPermission('edit-orders') ? [{
      label: t('Edit Order'),
      icon: <Edit className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => handleActionClick('edit', 'edit-orders')
    }] : [])
  ];

  return (
    <PageTemplate 
      title={t('Order Details')}
      url="/orders/show"
      actions={pageActions}
      backUrl={route('orders.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Order Management'), href: route('orders.index') },
        { title: t(`Order Details`) }
      ]}
    >
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>{t('Order {{number}}', { number: order.orderNumber })}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={order.status.toLowerCase() === 'completed' ? 'default' : 'secondary'}>{tOrderStatus(order.status)}</Badge>
                  {hasPermission('edit-orders') && (
                    <select
                      value={order.status.toLowerCase()}
                      disabled={statusSaving}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700"
                    >
                      <option value="pending">قيد الانتظار</option>
                      <option value="processing">قيد التجهيز</option>
                      <option value="shipped">تم الشحن</option>
                      <option value="delivered">تم التسليم</option>
                      <option value="cancelled">ملغي</option>
                    </select>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`grid gap-4 ${order.bankTransferReceipt ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('Order Date')}</p>
                    <p>{order.date}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('Payment Status')}</p>
                    <Badge variant={order.paymentStatus.toLowerCase() === 'paid' ? 'default' : 'secondary'}>{tPaymentStatus(order.paymentStatus)}</Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('Payment Method')}</p>
                    <p>{tPaymentMethod(order.paymentMethod)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('Fulfillment Status')}</p>
                    <Badge variant={order.status.toLowerCase() === 'delivered' ? 'default' : 'secondary'}>{tOrderStatus(order.status)}</Badge>
                  </div>
                </div>
                
                {order.bankTransferReceipt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{t('Payment Receipt')}</p>
                    <img 
                      src={getImageUrl(order.bankTransferReceipt)}
                      alt="Payment Receipt"
                      className="w-full h-auto rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => window.open(getImageUrl(order.bankTransferReceipt ?? ''), '_blank')}
                      style={{ maxHeight: '200px', objectFit: 'cover' }}
                    />
                    <p className="text-xs text-muted-foreground text-center mt-1">{t('Click to view')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Order Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">{t('Subtotal')}</span>
                <span>{formatCurrency(order.summary.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">{t('Shipping')}</span>
                <span>{formatCurrency(order.summary.shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">{t('Tax')}</span>
                <span>{formatCurrency(order.summary.tax)}</span>
              </div>
              {order.summary.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="text-sm">{t('Discount')}</span>
                  <span>-{formatCurrency(order.summary.discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>{t('Total')}</span>
                <span>{formatCurrency(order.summary.total)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {hasPermission('manage-customers') && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <CardTitle>{t('Customer Information')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{order.customer.name}</p>
                  <p className="text-sm text-muted-foreground">{order.customer.email}</p>
                  {order.customer.phone && (
                    <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={!hasPermission('manage-customers') ? 'md:col-span-2' : ''}>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <CardTitle>{t('Shipping Address')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <p>{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <CardTitle>{t('Order Items')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-16 h-16 rounded-lg overflow-hidden border">
                    <img
                      src={getImageUrl(item.image)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.jpg';
                      }}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">{t('SKU: {{sku}}', { sku: item.sku })}</p>
                    <p className="text-sm text-muted-foreground">{t('Quantity: {{quantity}}', { quantity: item.quantity })}</p>
                  </div>
                  <div className="text-end">
                    <p className="font-medium">{formatCurrency(item.price)}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('{{total}} total', { total: formatCurrency(item.price * item.quantity) })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {hasPermission('manage-shipping') && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Truck className="h-5 w-5" />
                <CardTitle>{t('Shipping Information')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t('Shipping Method')}</span>
                <span>{order.shippingMethod}</span>
              </div>
              {order.trackingNumber && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{t('Tracking Number')}</span>
                  <span className="font-mono">{order.trackingNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">{t('Shipping Status')}</span>
                <Badge variant={order.status.toLowerCase() === 'delivered' ? 'default' : 'secondary'}>{tOrderStatus(order.status)}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('Order Timeline')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.timeline?.map((timeline: any, index: any) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${timeline.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="flex-1">
                    <p className="font-medium">{tOrderStatus(timeline.status)}</p>
                    <p className="text-sm text-muted-foreground">
                      {timeline.date || tOrderStatus('Pending')}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground">{t('No timeline data available')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}