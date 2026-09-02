import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { User, Plus, Edit, Trash2, Eye, ToggleLeft, ToggleRight, Phone, Truck, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { hasPermission } from '@/utils/permissions';
import { toast } from '@/components/custom-toast';
import { apiPost } from '@/utils/api';

interface Driver {
  id: number;
  name: string;
  phone: string | null;
  active: boolean;
  notes: string | null;
  vehicle_info: string | null;
  code: string | null;
  active_assignments: number;
  today_deliveries: number;
}

export default function DeliveryDriversIndex() {
  const { t } = useTranslation();
  const { drivers, stats, auth } = usePage().props as any;
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleActive = async (driver: Driver) => {
    try {
      await apiPost(route('delivery.drivers.toggle-status', driver.id));
      toast.success('تم تحديث الحالة');
      router.reload({ only: ['drivers', 'stats'] });
    } catch {
      toast.error('حدث خطأ');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      router.delete(route('delivery.drivers.destroy', deleteTarget.id), {
        onSuccess: () => { toast.success('تم حذف السائق'); setDeleteTarget(null); },
        onError: () => toast.error('حدث خطأ أثناء الحذف'),
        onFinish: () => setLoading(false),
      });
    } catch {
      setLoading(false);
    }
  };

  const pageActions = [
    ...(hasPermission('manage-orders') ? [{
      label: '+ سائق جديد',
      icon: <Plus className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => router.visit(route('delivery.drivers.create')),
    }] : []),
  ];

  return (
    <>
      <PageTemplate
        title="سائقو التوصيل"
        description="إدارة السائقين وحالاتهم."
        url="/delivery/drivers"
        actions={pageActions}
        backUrl={route('delivery.index')}
        breadcrumbs={[
          { title: 'لوحة التحكم', href: route('dashboard') },
          { title: 'لوحة التوصيل', href: route('delivery.index') },
          { title: 'السائقون' },
        ]}
      >
        <div className="space-y-4" dir="rtl">
          {/* Stats */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي السائقين</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">السائقون النشطون</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-600">{stats.active}</div></CardContent>
            </Card>
          </div>

          {/* Drivers List */}
          {drivers.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <User className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
                <h3 className="mt-4 text-lg font-medium text-muted-foreground">لا يوجد سائقون بعد</h3>
                <p className="mt-1 text-sm text-muted-foreground">ابدأ بإضافة سائق توصيل.</p>
                {hasPermission('manage-orders') && (
                  <Button className="mt-4" onClick={() => router.visit(route('delivery.drivers.create'))}>
                    <Plus className="h-4 w-4 me-2" /> إضافة سائق
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {drivers.map((driver: Driver) => (
                <Card key={driver.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold">{driver.name}</span>
                          <Badge variant={driver.active ? 'default' : 'secondary'}>
                            {driver.active ? 'نشط' : 'غير نشط'}
                          </Badge>
                          {driver.active_assignments > 0 && (
                            <Badge variant="default" className="bg-blue-500">
                              <Truck className="h-3 w-3 me-1" /> {driver.active_assignments} نشطة
                            </Badge>
                          )}
                          {driver.today_deliveries > 0 && (
                            <Badge variant="outline" className="text-emerald-600">
                              <CheckCircle className="h-3 w-3 me-1" /> {driver.today_deliveries} اليوم
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                          {driver.phone && (
                            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {driver.phone}</span>
                          )}
                          {driver.vehicle_info && (
                            <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> {driver.vehicle_info}</span>
                          )}
                          {driver.code && (
                            <Badge variant="outline" className="text-xs">كود: {driver.code}</Badge>
                          )}
                        </div>
                        {driver.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{driver.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {hasPermission('manage-orders') && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => router.visit(route('delivery.drivers.show', driver.id))}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => toggleActive(driver)}>
                              {driver.active ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => router.visit(route('delivery.drivers.edit', driver.id))}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(driver)}>
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
            <DialogTitle>حذف السائق</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>هل أنت متأكد من حذف السائق "{deleteTarget?.name}"؟</p>
            <p className="text-sm text-muted-foreground mt-2">التعيينات النشطة ستفقد السائق تلقائياً.</p>
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
