import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { MapPin, Plus, Edit, Trash2, ToggleLeft, ToggleRight, GripVertical, Clock, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';
import { toast } from '@/components/custom-toast';
import { apiPost } from '@/utils/api';

interface Zone {
  id: number;
  name: string;
  description: string | null;
  fee: number;
  is_active: boolean;
  sort_order: number;
  est_time_text: string | null;
  free_delivery_threshold: number | null;
  min_order_amount: number | null;
  orders_count: number;
}

export default function DeliveryZonesIndex() {
  const { t } = useTranslation();
  const { zones, stats, auth } = usePage().props as any;
  const [deleteTarget, setDeleteTarget] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleActive = async (zone: Zone) => {
    try {
      await apiPost(route('delivery.zones.toggle-status', zone.id));
      toast.success('تم تحديث الحالة');
      router.reload({ only: ['zones', 'stats'] });
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      router.delete(route('delivery.zones.destroy', deleteTarget.id), {
        onSuccess: () => { toast.success('تم حذف المنطقة'); setDeleteTarget(null); },
        onError: () => toast.error('حدث خطأ أثناء الحذف'),
        onFinish: () => setLoading(false),
      });
    } catch {
      setLoading(false);
    }
  };

  const pageActions = [
    ...(hasPermission('manage-shipping') ? [{
      label: '+ منطقة جديدة',
      icon: <Plus className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => router.visit(route('delivery.zones.create')),
    }] : []),
  ];

  return (
    <>
      <PageTemplate
        title="مناطق التوصيل"
        description="تحديد المناطق和服务区域 ورسوم التوصيل."
        url="/delivery/zones"
        actions={pageActions}
        backUrl={route('delivery.index')}
        breadcrumbs={[
          { title: 'لوحة التحكم', href: route('dashboard') },
          { title: 'لوحة التوصيل', href: route('delivery.index') },
          { title: 'مناطق التوصيل' },
        ]}
      >
        <div className="space-y-4" dir="rtl">
          {/* Stats */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المناطق</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">مناطق نشطة</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-600">{stats.active}</div></CardContent>
            </Card>
          </div>

          {/* Zones List */}
          {zones.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
                <h3 className="mt-4 text-lg font-medium text-muted-foreground">لا توجد مناطق بعد</h3>
                <p className="mt-1 text-sm text-muted-foreground">ابدأ بإنشاء منطقة توصيل.</p>
                {hasPermission('manage-shipping') && (
                  <Button className="mt-4" onClick={() => router.visit(route('delivery.zones.create'))}>
                    <Plus className="h-4 w-4 me-2" /> إنشاء منطقة
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {zones.map((zone: Zone) => (
                <Card key={zone.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold">{zone.name}</span>
                          <Badge variant={zone.is_active ? 'default' : 'secondary'}>
                            {zone.is_active ? 'نشط' : 'غير نشط'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Package className="h-3 w-3 me-1" /> {zone.orders_count} طلب
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span>رسوم: {zone.fee > 0 ? formatCurrency(zone.fee) : 'مجاني'}</span>
                          {zone.est_time_text && (
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {zone.est_time_text}</span>
                          )}
                          {zone.free_delivery_threshold != null && (
                            <span className="text-emerald-600">توصيل مجاني فوق {formatCurrency(zone.free_delivery_threshold)}</span>
                          )}
                          {zone.min_order_amount != null && (
                            <span className="text-amber-600">حد أدنى {formatCurrency(zone.min_order_amount)}</span>
                          )}
                        </div>
                        {zone.description && (
                          <p className="text-xs text-muted-foreground mt-1">{zone.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {hasPermission('manage-shipping') && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => toggleActive(zone)}>
                              {zone.is_active ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => router.visit(route('delivery.zones.edit', zone.id))}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(zone)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageTemplate>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف منطقة التوصيل</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>هل أنت متأكد من حذف منطقة "{deleteTarget?.name}"؟</p>
            <p className="text-sm text-muted-foreground mt-2">الطلبات التاريخية تحتفظ بصورتها.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>حذف</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
