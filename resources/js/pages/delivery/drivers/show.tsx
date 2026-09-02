import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { User, Phone, Truck, CheckCircle, XCircle, Clock, MapPin, Edit, Package, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  assigned: { label: 'معيّن', variant: 'default' },
  picked_up: { label: 'تم الاستلام', variant: 'default' },
  out_for_delivery: { label: 'قيد التوصيل', variant: 'default' },
  delivered: { label: 'تم التوصيل', variant: 'default' },
  delivery_failed: { label: 'فشل', variant: 'destructive' },
};

export default function DeliveryDriverShow() {
  const { t } = useTranslation();
  const { driver, metrics, activeAssignments } = usePage().props as any;

  return (
    <PageTemplate
      title={driver.name}
      description={driver.phone || 'بيانات السائق'}
      url={`/delivery/drivers/${driver.id}`}
      backUrl={route('delivery.drivers.index')}
      actions={[{
        label: 'تعديل',
        icon: <Edit className="h-4 w-4" />,
        variant: 'outline' as const,
        onClick: () => router.visit(route('delivery.drivers.edit', driver.id)),
      }]}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'لوحة التوصيل', href: route('delivery.index') },
        { title: 'السائقون', href: route('delivery.drivers.index') },
        { title: driver.name },
      ]}
    >
      <div className="space-y-6" dir="rtl">
        {/* Driver Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">{driver.name}</h2>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                  {driver.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {driver.phone}</span>}
                  {driver.code && <Badge variant="outline">كود: {driver.code}</Badge>}
                  {driver.vehicle_info && <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {driver.vehicle_info}</span>}
                  {driver.created_at && <span>انضم: {driver.created_at}</span>}
                </div>
                {driver.notes && <p className="text-sm text-muted-foreground mt-2">{driver.notes}</p>}
              </div>
              <Badge variant={driver.active ? 'default' : 'secondary'}>
                {driver.active ? 'نشط' : 'غير نشط'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">نشط حالياً</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{metrics.active}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">توصيلات اليوم</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-emerald-600">{metrics.today_delivered}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">فشل اليوم</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-600">{metrics.today_failed}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي التوصيلات</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{metrics.completed_total}</div></CardContent>
          </Card>
        </div>

        {/* Active Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>التعيينات النشطة ({activeAssignments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {activeAssignments.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">لا توجد تعيينات نشطة حالياً.</p>
            ) : (
              <div className="space-y-3">
                {activeAssignments.map((a: any) => {
                  const badge = STATUS_LABELS[a.status] || STATUS_LABELS.assigned;
                  return (
                    <div key={a.id} className="flex flex-col gap-2 p-3 border rounded-lg md:flex-row md:items-center md:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{a.order_number}</span>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          {a.zone_name && (
                            <Badge variant="outline" className="text-xs">
                              <MapPin className="h-3 w-3 me-1" /> {a.zone_name}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1 flex-wrap">
                          <span>{a.customer_name}</span>
                          {a.customer_phone && <span>{a.customer_phone}</span>}
                          <span>{formatCurrency(a.total_amount)}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {a.assigned_at}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => router.visit(route('orders.show', a.order_id))}>
                          <ArrowLeft className="h-4 w-4 rtl-flip" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
