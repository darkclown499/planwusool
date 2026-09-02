import React, { useState, useMemo, useCallback } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
  Truck, MapPin, User, Phone, Clock, Search, Filter, ChevronLeft, ChevronRight,
  ArrowUpDown, Package, AlertTriangle, CheckCircle2, XCircle, RotateCcw, Play,
  UserPlus, UserX, Loader2, Eye, Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { hasPermission } from '@/utils/permissions';
import { toast } from '@/components/custom-toast';
import { apiPost } from '@/utils/api';

interface OrderItem {
  id: number;
  order_number: string;
  delivery_zone_id: number | null;
  delivery_zone_name: string | null;
  delivery_driver_id: number | null;
  delivery_status: string;
  delivery_fee: number | null;
  delivery_assigned_at: string | null;
  status: string;
  payment_status: string;
  payment_method: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  shipping_address: string;
  shipping_city: string;
  total_amount: number;
  currency: string;
  created_at: string;
  items: Array<{ product_name: string; quantity: number }>;
  delivery_driver: { id: number; name: string; phone: string } | null;
}

interface Driver {
  id: number;
  name: string;
  active: boolean;
}

interface FiltersData {
  bucket?: string;
  zone_id?: string;
  driver_id?: string;
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
}

const BUCKETS = [
  { key: 'unassigned', label: 'غير معيّن', icon: UserPlus, color: 'bg-amber-500' },
  { key: 'assigned', label: 'معيّن', icon: User, color: 'bg-blue-500' },
  { key: 'picked_up', label: 'تم الاستلام', icon: Package, color: 'bg-indigo-500' },
  { key: 'out_for_delivery', label: 'قيد التوصيل', icon: Truck, color: 'bg-purple-500' },
  { key: 'delivered', label: 'تم التوصيل', icon: CheckCircle2, color: 'bg-emerald-500' },
  { key: 'delivery_failed', label: 'فشل التوصيل', icon: XCircle, color: 'bg-red-500' },
  { key: 'returned', label: 'مرتجع', icon: RotateCcw, color: 'bg-orange-500' },
  { key: 'cancelled', label: 'ملغي', icon: AlertTriangle, color: 'bg-gray-500' },
];

const STATUS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  unassigned: { variant: 'secondary', label: 'غير معيّن' },
  assigned: { variant: 'default', label: 'معيّن' },
  picked_up: { variant: 'default', label: 'تم الاستلام' },
  out_for_delivery: { variant: 'default', label: 'قيد التوصيل' },
  delivered: { variant: 'default', label: 'تم التوصيل' },
  delivery_failed: { variant: 'destructive', label: 'فشل التوصيل' },
  returned: { variant: 'outline', label: 'مرتجع' },
  cancelled: { variant: 'secondary', label: 'ملغي' },
};

export default function DeliveryIndex() {
  const { t } = useTranslation();
  const { orders, zones, drivers, counts, filters: serverFilters } = usePage().props as any;

  const [filters, setFilters] = useState<FiltersData>({
    bucket: serverFilters.bucket || 'unassigned',
    zone_id: serverFilters.zone_id || '',
    driver_id: serverFilters.driver_id || '',
    search: serverFilters.search || '',
    date_from: serverFilters.date_from || '',
    date_to: serverFilters.date_to || '',
    per_page: serverFilters.per_page || 25,
  });
  const [assignDialog, setAssignDialog] = useState<{ orderId: number; type: 'assign' | 'reassign' } | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const applyFilters = useCallback((next: Partial<FiltersData>) => {
    const updated = { ...filters, ...next };
    setFilters(updated);
    const params: Record<string, string> = {};
    if (updated.bucket && updated.bucket !== 'all') params.bucket = updated.bucket;
    if (updated.zone_id) params.zone_id = updated.zone_id;
    if (updated.driver_id) params.driver_id = updated.driver_id;
    if (updated.search) params.search = updated.search;
    if (updated.date_from) params.date_from = updated.date_from;
    if (updated.date_to) params.date_to = updated.date_to;
    if (updated.per_page && updated.per_page !== 25) params.per_page = String(updated.per_page);
    router.get(route('delivery.index'), params, { preserveState: true, replace: true });
  }, [filters]);

  const paginate = useCallback((page: number) => {
    const params: Record<string, string> = {};
    if (filters.bucket && filters.bucket !== 'all') params.bucket = filters.bucket;
    if (filters.zone_id) params.zone_id = filters.zone_id;
    if (filters.driver_id) params.driver_id = filters.driver_id;
    if (filters.search) params.search = filters.search;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.per_page && filters.per_page !== 25) params.per_page = String(filters.per_page);
    params.page = String(page);
    router.get(route('delivery.index'), params, { preserveState: true, replace: true });
  }, [filters]);

  const doAssign = async () => {
    if (!assignDialog || !selectedDriver) return;
    setLoading(true);
    try {
      const url = assignDialog.type === 'assign'
        ? route('delivery.orders.assign', assignDialog.orderId)
        : route('delivery.orders.reassign', assignDialog.orderId);
      await apiPost(url, { driver_id: Number(selectedDriver) });
      toast.success(assignDialog.type === 'assign' ? 'تم تعيين السائق بنجاح' : 'تم إعادة تعيين السائق');
      setAssignDialog(null);
      setSelectedDriver('');
      router.reload({ only: ['orders', 'counts'] });
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const doUnassign = async (orderId: number) => {
    setLoading(true);
    try {
      await apiPost(route('delivery.orders.unassign', orderId));
      toast.success('تم إلغاء تعيين السائق');
      router.reload({ only: ['orders', 'counts'] });
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const doTransition = async (orderId: number, status: string) => {
    setLoading(true);
    try {
      await apiPost(route('delivery.orders.transition', orderId), { status });
      toast.success('تم تحديث حالة التوصيل');
      router.reload({ only: ['orders', 'counts'] });
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const activeDrivers = useMemo(() => drivers.filter((d: Driver) => d.active), [drivers]);
  const currentBucket = filters.bucket || 'unassigned';

  const renderActions = (order: OrderItem) => {
    const s = order.delivery_status;
    if (s === 'unassigned') {
      return (
        <Button size="sm" variant="default" onClick={() => setAssignDialog({ orderId: order.id, type: 'assign' })}>
          <UserPlus className="h-3.5 w-3.5 me-1" /> تعيين سائق
        </Button>
      );
    }
    if (s === 'assigned') {
      return (
        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => doTransition(order.id, 'picked_up')}>
            <Package className="h-3.5 w-3.5 me-1" /> استلام
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAssignDialog({ orderId: order.id, type: 'reassign' })}>
            <ArrowUpDown className="h-3.5 w-3.5 me-1" /> نقل
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => doUnassign(order.id)}>
            <UserX className="h-3.5 w-3.5 me-1" /> إلغاء
          </Button>
        </div>
      );
    }
    if (s === 'picked_up') {
      return (
        <Button size="sm" variant="default" onClick={() => doTransition(order.id, 'out_for_delivery')}>
          <Truck className="h-3.5 w-3.5 me-1" /> بدء التوصيل
        </Button>
      );
    }
    if (s === 'out_for_delivery') {
      return (
        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => doTransition(order.id, 'delivered')}>
            <CheckCircle2 className="h-3.5 w-3.5 me-1" /> تم التوصيل
          </Button>
          <Button size="sm" variant="destructive" onClick={() => doTransition(order.id, 'delivery_failed')}>
            <XCircle className="h-3.5 w-3.5 me-1" /> فشل
          </Button>
        </div>
      );
    }
    if (s === 'delivery_failed') {
      return (
        <Button size="sm" variant="outline" onClick={() => doTransition(order.id, 'returned')}>
          <RotateCcw className="h-3.5 w-3.5 me-1" /> إرجاع
        </Button>
      );
    }
    return null;
  };

  return (
    <>
      <PageTemplate
        title="لوحة التوصيل"
        description="إدارة طلبات التوصيل والسائقين والمناطق."
        url="/delivery"
        actions={hasPermission('manage-orders') ? [{
          label: 'إدارة السائقين',
          icon: <Truck className="h-4 w-4" />,
          variant: 'default' as const,
          onClick: () => router.visit(route('delivery.drivers.index')),
        }] : []}
        breadcrumbs={[
          { title: 'لوحة التحكم', href: route('dashboard') },
          { title: 'لوحة التوصيل' },
        ]}
      >
        <div className="space-y-4" dir="rtl">
          {/* Bucket Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {BUCKETS.map((b) => {
              const count = counts[b.key] || 0;
              const active = currentBucket === b.key;
              return (
                <button
                  key={b.key}
                  onClick={() => applyFilters({ bucket: b.key })}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${b.color}`} />
                  {b.label}
                  <Badge variant={active ? 'default' : 'secondary'} className="ms-1 text-xs">{count}</Badge>
                </button>
              );
            })}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-3">
              <div className="grid gap-3 md:grid-cols-6 grid-cols-2">
                <div className="md:col-span-2 relative">
                  <Search className="absolute end-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالرقم أو اسم العميل..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') applyFilters({ search: (e.target as HTMLInputElement).value }); }}
                    className="ps-9"
                  />
                </div>
                <Select value={filters.zone_id || '__all__'} onValueChange={(v) => applyFilters({ zone_id: v === '__all__' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="المنطقة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">كل المناطق</SelectItem>
                    {zones.map((z: any) => <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.driver_id || '__all__'} onValueChange={(v) => applyFilters({ driver_id: v === '__all__' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="السائق" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">كل السائقين</SelectItem>
                    {drivers.map((d: Driver) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="date" value={filters.date_from || ''} onChange={(e) => applyFilters({ date_from: e.target.value })} placeholder="من" />
                <Input type="date" value={filters.date_to || ''} onChange={(e) => applyFilters({ date_to: e.target.value })} placeholder="إلى" />
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          {orders.data.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
                <h3 className="mt-4 text-lg font-medium text-muted-foreground">لا توجد طلبات</h3>
                <p className="mt-1 text-sm text-muted-foreground">لا توجد طلبات في هذا التصنيف.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.data.map((order: OrderItem) => {
                const badge = STATUS_BADGE[order.delivery_status] || STATUS_BADGE.unassigned;
                return (
                  <Card key={order.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">{order.order_number}</span>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                            {order.delivery_zone_name && (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 me-1" /> {order.delivery_zone_name}
                              </Badge>
                            )}
                            {order.delivery_fee != null && order.delivery_fee > 0 && (
                              <Badge variant="outline" className="text-xs">{formatCurrency(order.delivery_fee)}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {order.customer_first_name} {order.customer_last_name}
                            </span>
                            {order.customer_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                {order.customer_phone}
                              </span>
                            )}
                            {order.shipping_city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {order.shipping_city}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(order.created_at).toLocaleDateString('ar')}
                            </span>
                          </div>
                          {order.delivery_driver && (
                            <div className="flex items-center gap-1 text-sm text-blue-600">
                              <Truck className="h-3.5 w-3.5" />
                              <span>{order.delivery_driver.name}</span>
                              <span className="text-muted-foreground text-xs">({order.delivery_driver.phone})</span>
                            </div>
                          )}
                          {order.items.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                              {order.items.map(i => `${i.product_name} ×${i.quantity}`).join('، ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-bold">{formatCurrency(order.total_amount)}</span>
                          {renderActions(order)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {orders.last_page > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                عرض {(orders.current_page - 1) * orders.per_page + 1}–{Math.min(orders.current_page * orders.per_page, orders.total)} من {orders.total}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={orders.current_page <= 1}
                  onClick={() => paginate(orders.current_page - 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">{orders.current_page} / {orders.last_page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={orders.current_page >= orders.last_page}
                  onClick={() => paginate(orders.current_page + 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageTemplate>

      {/* Assign / Reassign Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => { setAssignDialog(null); setSelectedDriver(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{assignDialog?.type === 'assign' ? 'تعيين سائق' : 'إعادة تعيين السائق'}</DialogTitle>
          </DialogHeader>
          {activeDrivers.length === 0 ? (
            <div className="py-6 text-center" dir="rtl">
              <UserPlus className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
              <h3 className="mt-4 text-lg font-medium">لا يوجد سائقون بعد</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
                أضف سائقًا أولاً حتى تتمكن من تعيينه لهذا الطلب.
              </p>
              {hasPermission('manage-orders') && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => {
                      const addUrl = route('delivery.drivers.create') + '?return_to=' + encodeURIComponent(route('delivery.index'));
                      setAssignDialog(null);
                      setSelectedDriver('');
                      router.visit(addUrl);
                    }}
                  >
                    <UserPlus className="h-4 w-4 me-2" /> إضافة سائق جديد
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setAssignDialog(null);
                      setSelectedDriver('');
                      router.visit(route('delivery.drivers.index', {
                        return_to: route('delivery.index'),
                      }));
                    }}
                  >
                    إدارة السائقين
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="py-4">
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر السائق" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDrivers.map((d: Driver) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setAssignDialog(null); setSelectedDriver(''); }}>إلغاء</Button>
                <Button onClick={doAssign} disabled={!selectedDriver || loading}>
                  {loading && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                  تأكيد
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
