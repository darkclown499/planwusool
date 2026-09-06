import React, { useState, useMemo, useCallback } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
  Truck, MapPin, User, Phone, Clock, Search, Filter, ChevronLeft, ChevronRight,
  ArrowUpDown, Package, AlertTriangle, CheckCircle2, XCircle, RotateCcw, Play,
  UserPlus, UserX, Loader2, Eye, Calendar, Settings, Boxes, Building2, Info, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Shield, Lock, Zap,
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

const HUB_TABS = [
  { id: 'overview', label: 'نظرة عامة' },
  { id: 'orders', label: 'الطلبات' },
  { id: 'methods', label: 'طرق التوصيل' },
  { id: 'zones', label: 'المناطق والأسعار' },
  { id: 'drivers', label: 'السائقون' },
  { id: 'companies', label: 'شركات التوصيل' },
  { id: 'settings', label: 'الإعدادات' },
] as const;

export default function DeliveryHub() {
  const { t } = useTranslation();
  const pageProps = usePage().props as any;
  const { orders, zones, drivers, counts, filters: serverFilters, currentTab, hubStats, shippings, shippingStats, zonesDetailed, driversDetailed, courierIntegrations, courierRequests, freeShipping, shippingEnabled, deliveryReadiness } = pageProps;

  const activeTab = (currentTab as string) || 'overview';

  // Server-computed delivery setup readiness (falls back to the same store-scoped
  // facts locally so the hub stays coherent without the new prop).
  const readiness = deliveryReadiness || {
    entitled: !!shippingEnabled,
    has_methods: !!(shippings && shippings.length > 0),
    has_active_method: !!(shippings && shippings.some((s: any) => s.is_active)),
    active_methods_count: (shippings || []).filter((s: any) => s.is_active).length,
    methods_total: (shippings || []).length,
    zones_active_count: hubStats?.zones_active ?? 0,
    zones_optional: true,
    first_inactive_method_id: null,
  };

  const [filters, setFilters] = useState<FiltersData>({
    bucket: serverFilters?.bucket || 'unassigned',
    zone_id: serverFilters?.zone_id || '',
    driver_id: serverFilters?.driver_id || '',
    search: serverFilters?.search || '',
    date_from: serverFilters?.date_from || '',
    date_to: serverFilters?.date_to || '',
    per_page: serverFilters?.per_page || 25,
  });
  const [assignDialog, setAssignDialog] = useState<{ orderId: number; type: 'assign' | 'reassign' } | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [freeEnabled, setFreeEnabled] = useState<boolean>(!!(freeShipping?.enabled));
  const [freeThreshold, setFreeThreshold] = useState<string>(freeShipping?.threshold ? String(freeShipping.threshold) : '');
  const [deleteMethodId, setDeleteMethodId] = useState<number | null>(null);
  const [deleteZoneId, setDeleteZoneId] = useState<number | null>(null);
  const [deleteDriverId, setDeleteDriverId] = useState<number | null>(null);

  const navigateTab = (tabId: string) => {
    router.get(route('delivery.index'), { tab: tabId }, { preserveState: true, replace: true });
  };

  const applyFilters = useCallback((next: Partial<FiltersData>) => {
    const updated = { ...filters, ...next };
    setFilters(updated);
    const params: Record<string, string> = { tab: 'orders' };
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
    const params: Record<string, string> = { tab: 'orders' };
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
      router.reload({ only: ['orders', 'counts', 'hubStats'] });
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
      router.reload({ only: ['orders', 'counts', 'hubStats'] });
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
      router.reload({ only: ['orders', 'counts', 'hubStats'] });
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const activeDrivers = useMemo(() => (drivers || []).filter((d: Driver) => d.active), [drivers]);
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

  const saveFreeShipping = () => {
    if (freeEnabled && (!freeThreshold || Number(freeThreshold) <= 0)) {
      toast.error('حد الشحن المجاني مطلوب عند التفعيل');
      return;
    }
    router.put(route('shipping.free.update'), { enabled: freeEnabled, threshold: freeEnabled ? freeThreshold : null }, { preserveScroll: true, onSuccess: () => toast.success('تم حفظ إعدادات الشحن المجاني'), onError: () => toast.error('حدث خطأ') });
  };

  const hasTracking = (shippings || []).some((s: any) => s.tracking_available);

  // Compact setup/readiness verdict for the top of the Delivery Hub. One reason
  // and one next action; the verdict comes from the server-computed read-model.
  const renderReadinessHeader = () => {
    if (!readiness.entitled) {
      return (
        <Card className="border-amber-300 bg-amber-50/70">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Lock className="h-5 w-5 text-amber-600" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-amber-900">التوصيل غير متاح في خطتك الحالية</h2>
                <p className="text-xs text-amber-800 mt-0.5">أضف طرق توصيل ومناطق تغطية ليتمكن عملاؤك من اختيار التوصيل عند الدفع.</p>
                <p className="text-xs text-amber-700 mt-0.5">متاح في خطة Growth أو أعلى.</p>
              </div>
            </div>
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 ms-auto shrink-0" onClick={() => router.visit(route('plans.index'))}>
              <Zap className="h-4 w-4 me-1" /> ترقية الخطة
            </Button>
          </CardContent>
        </Card>
      );
    }
    if (readiness.has_active_method) {
      return (
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-emerald-900">التوصيل جاهز</h2>
                <p className="text-xs text-emerald-800 mt-0.5">لديك {readiness.active_methods_count} طريقة توصيل مفعلة متاحة للعملاء عند الدفع.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="ms-auto shrink-0" onClick={() => navigateTab('methods')}>إدارة طرق التوصيل</Button>
          </CardContent>
        </Card>
      );
    }
    const noMethods = !readiness.has_methods;
    return (
      <Card className="border-blue-200 bg-blue-50/70">
        <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Truck className="h-5 w-5 text-blue-600" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-blue-900">{noMethods ? 'لم تتم إضافة طريقة توصيل بعد' : 'طريقة التوصيل غير مفعلة'}</h2>
              <p className="text-xs text-blue-800 mt-0.5">
                {noMethods
                  ? 'أضف طريقة توصيل وحدد التغطية المناسبة لمتجرك ليتمكن العملاء من اختيارها عند الدفع.'
                  : 'فعّل طريقة توصيل واحدة على الأقل حتى يتمكن العملاء من اختيارها عند الدفع.'}
              </p>
              {readiness.has_methods && readiness.methods_total > 1 && (
                <p className="text-xs text-blue-700 mt-0.5">يملك المتجر {readiness.methods_total} طرق توصيل — لكن لا توجد طريقة مفعلة.</p>
              )}
            </div>
          </div>
          {noMethods ? (
            shippingEnabled && hasPermission('create-shipping') && (
              <Button size="sm" className="ms-auto shrink-0" onClick={() => router.visit(route('shipping.create'))}>
                <Plus className="h-4 w-4 me-1" /> إضافة طريقة توصيل
              </Button>
            )
          ) : (
            shippingEnabled && hasPermission('edit-shipping') && readiness.first_inactive_method_id && (
              <Button size="sm" className="ms-auto shrink-0" onClick={() => router.visit(route('shipping.edit', readiness.first_inactive_method_id))}>
                <Play className="h-4 w-4 me-1" /> تفعيل طريقة التوصيل
              </Button>
            )
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <PageTemplate
        title="مركز التوصيل"
        description="كل ما يخص الشحن والتوصيل — الطلبات، طرق التوصيل، المناطق والأسعار، السائقين وشركات التوصيل."
        url="/delivery"
        actions={[
          ...(activeTab === 'methods' && shippingEnabled && hasPermission('create-shipping') ? [{ label: '+ طريقة توصيل', icon: <Plus className="h-4 w-4" />, variant: 'default' as const, onClick: () => router.visit(route('shipping.create')) }] : []),
          ...(activeTab === 'zones' && shippingEnabled && hasPermission('manage-shipping') ? [{ label: '+ منطقة جديدة', icon: <Plus className="h-4 w-4" />, variant: 'default' as const, onClick: () => router.visit(route('delivery.zones.create')) }] : []),
          ...(activeTab === 'drivers' && shippingEnabled && hasPermission('manage-orders') ? [{ label: '+ سائق جديد', icon: <Plus className="h-4 w-4" />, variant: 'default' as const, onClick: () => router.visit(route('delivery.drivers.create')) }] : []),
        ]}
        breadcrumbs={[
          { title: 'لوحة التحكم', href: route('dashboard') },
          { title: 'مركز التوصيل' },
        ]}
      >
        <div className="space-y-4" dir="rtl">
          {/* Hub Tabs — horizontally scrollable on mobile */}
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin border-b">
            {HUB_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => navigateTab(tab.id)}
                  className={`whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Readiness / next-action header — same verdict across every hub tab */}
          <div className="pt-1">{renderReadinessHeader()}</div>

          {/* TAB CONTENT */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Current Setup */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Boxes className="h-5 w-5 text-primary" /> إعداد التوصيل الحالي
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-2xl font-bold">{hubStats?.methods_active ?? 0}</p>
                      <p className="text-xs text-muted-foreground">طرق التوصيل المفعلة</p>
                      <p className="text-[11px] text-muted-foreground">من أصل {hubStats?.methods_total ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-2xl font-bold">{hubStats?.zones_active ?? 0}</p>
                      <p className="text-xs text-muted-foreground">مناطق التوصيل</p>
                      <p className="text-[11px] text-muted-foreground">من أصل {hubStats?.zones_total ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-2xl font-bold">{hubStats?.drivers_active ?? 0}</p>
                      <p className="text-xs text-muted-foreground">السائقون النشطون</p>
                      <p className="text-[11px] text-muted-foreground">من أصل {hubStats?.drivers_total ?? 0}</p>
                    </div>
                    <div className="rounded-lg border p-3 text-center bg-amber-50 border-amber-200">
                      <p className="text-2xl font-bold text-amber-700">{hubStats?.unassigned_orders ?? 0}</p>
                      <p className="text-xs text-amber-700">الطلبات غير المعيّنة</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => navigateTab('zones')}>إدارة المناطق والأسعار</Button>
                    <Button size="sm" variant="outline" onClick={() => router.visit(route('delivery.drivers.create'))}>إضافة سائق</Button>
                    <Button size="sm" variant="outline" onClick={() => navigateTab('methods')}>إدارة طرق التوصيل</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Platform Power Cards */}
              <div className="grid gap-3 md:grid-cols-3">
                <Card className="relative">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" /> السائقون
                      <Badge variant="secondary" className="text-[11px]">اختياري</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">أضف فريق توصيل وعيّن الطلبات للسائقين.</p>
                    <p className="mt-2 text-xs text-amber-600">مناسب للمتاجر التي لديها فريق توصيل — إذا كنت توصل بنفسك، لا تحتاج لإعداد هذا القسم الآن.</p>
                    <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => navigateTab('drivers')}>إدارة السائقين</Button>
                  </CardContent>
                </Card>
                <Card className="relative">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4" /> شركات التوصيل
                      <Badge variant="outline" className="text-[11px]">اختياري / متقدم</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">استخدم شركات خارجية عندما تحتاج لذلك.</p>
                    <p className="mt-2 text-xs text-muted-foreground">يتطلب إعدادًا مع مزود الخدمة — إعداد يدوي أو ربط API حيثما كان مدعوماً.</p>
                    <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => navigateTab('companies')}>استعراض الشركات</Button>
                  </CardContent>
                </Card>
                <Card className="relative">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4" /> التتبع
                      <Badge variant="outline" className="text-[11px]">حسب التوفر</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasTracking ? (
                      <p className="text-xs text-muted-foreground">التتبع متاح لبعض طرق التوصيل — يُعرض رقم التتبع عند توفره.</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">لا يوجد تتبع مُكوّن حالياً — يمكنك تفعيله من إعدادات طرق التوصيل.</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">لا يتم ادعاء تتبع لحظي أو خرائط GPS غير مدعومة.</p>
                  </CardContent>
                </Card>
              </div>

              {/* Free shipping hint */}
              {freeShipping?.enabled && (
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-3 flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>الشحن المجاني مفعّل عند حد {formatCurrency(freeShipping.threshold || 0)}</span>
                    <Button size="sm" variant="ghost" className="ms-auto" onClick={() => navigateTab('settings')}>الإعدادات</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
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
                        {(zones || []).map((z: any) => <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filters.driver_id || '__all__'} onValueChange={(v) => applyFilters({ driver_id: v === '__all__' ? '' : v })}>
                      <SelectTrigger><SelectValue placeholder="السائق" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">كل السائقين</SelectItem>
                        {(drivers || []).map((d: Driver) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={filters.date_from || ''} onChange={(e) => applyFilters({ date_from: e.target.value })} placeholder="من" />
                    <Input type="date" value={filters.date_to || ''} onChange={(e) => applyFilters({ date_to: e.target.value })} placeholder="إلى" />
                  </div>
                </CardContent>
              </Card>

              {/* Orders List */}
              {(!orders || orders.data.length === 0) ? (
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
              {orders && orders.last_page > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    عرض {(orders.current_page - 1) * orders.per_page + 1}–{Math.min(orders.current_page * orders.per_page, orders.total)} من {orders.total}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={orders.current_page <= 1} onClick={() => paginate(orders.current_page - 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">{orders.current_page} / {orders.last_page}</span>
                    <Button variant="outline" size="sm" disabled={orders.current_page >= orders.last_page} onClick={() => paginate(orders.current_page + 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'methods' && (
            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    طرق التوصيل
                    <Badge variant="secondary">{shippings?.length || 0}</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">ما يراه العميل عند إتمام الشراء — تُحتسب الرسوم server-side.</p>
                </CardHeader>
                <CardContent>
                  {(!shippings || shippings.length === 0) ? (
                    <div className="text-center py-12">
                      <Truck className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                      <h3 className="mt-4 text-lg font-medium">لم تتم إضافة طريقة توصيل بعد</h3>
                      <p className="mt-2 text-sm text-muted-foreground">أضف طريقة توصيل وحدد التغطية المناسبة لمتجرك ليتمكن العملاء من اختيارها عند الدفع.</p>
                      {shippingEnabled && hasPermission('create-shipping') && (
                        <Button className="mt-4" onClick={() => router.visit(route('shipping.create'))}>
                          <Plus className="h-4 w-4 me-2" /> إضافة طريقة توصيل
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {shippings.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm">{s.name}</span>
                              <Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? <CheckCircle2 className="h-3 w-3 me-1" /> : <XCircle className="h-3 w-3 me-1" />}{s.is_active ? 'مفعّل' : 'معطّل'}</Badge>
                              <Badge variant="outline" className="text-xs">{s.type?.replace('_', ' ')}</Badge>
                              {s.tracking_available && <Badge variant="outline" className="text-xs text-emerald-600">تتبع</Badge>}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span>السعر: {s.type === 'free_shipping' ? 'مجاني' : formatCurrency(s.cost)}</span>
                              {s.delivery_time && <span>الوقت: {s.delivery_time}</span>}
                              {s.zone_type && <span>النطاق: {s.zone_type}</span>}
                              {s.delivery_company && <span>الشركة: {s.delivery_company}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {shippingEnabled && hasPermission('edit-shipping') && (
                              <Button variant="ghost" size="sm" onClick={() => router.visit(route('shipping.edit', s.id))}><Edit className="h-4 w-4" /></Button>
                            )}
                            {hasPermission('delete-shipping') && (
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteMethodId(s.id)}><Trash2 className="h-4 w-4" /></Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              {/* Delete method dialog */}
              <Dialog open={!!deleteMethodId} onOpenChange={() => setDeleteMethodId(null)}>
                <DialogContent>
                  <DialogHeader><DialogTitle>حذف طريقة التوصيل</DialogTitle></DialogHeader>
                  <p className="text-sm">هل أنت متأكد من حذف هذه الطريقة؟ لا يمكن التراجع.</p>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteMethodId(null)}>إلغاء</Button>
                    <Button variant="destructive" onClick={() => { if (deleteMethodId) router.delete(route('shipping.destroy', deleteMethodId), { onSuccess: () => { setDeleteMethodId(null); toast.success('تم الحذف'); router.reload({ only: ['shippings','hubStats','shippingStats'] }); } }); }}>حذف</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeTab === 'zones' && (
            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    المناطق والأسعار
                    <Badge variant="secondary">{zonesDetailed?.length || 0}</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">مناطق التوصيل المحلية — "وين بوصل؟ وكم تكلفة التوصيل؟" وتغطية طرق التوصيل.</p>
                </CardHeader>
                <CardContent>
                  {(!zonesDetailed || zonesDetailed.length === 0) ? (
                    <div className="text-center py-12">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
                      <h3 className="mt-4 text-lg font-medium">لا توجد مناطق توصيل بعد</h3>
                      <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">المناطق تحدد أين توصل وكم التكلفة — أنشئ منطقة ليتمكن العملاء من اختيارها عند الدفع.</p>
                      {shippingEnabled && hasPermission('manage-shipping') && (
                        <Button className="mt-4" onClick={() => router.visit(route('delivery.zones.create'))}><Plus className="h-4 w-4 me-2" /> إنشاء منطقة</Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {zonesDetailed.map((z: any) => (
                        <div key={z.id} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-3 border rounded-lg">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm">{z.name}</span>
                              <Badge variant={z.is_active ? 'default' : 'secondary'}>{z.is_active ? 'نشط' : 'غير نشط'}</Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span>رسوم: {z.fee > 0 ? formatCurrency(z.fee) : 'مجاني'}</span>
                              {z.est_time_text && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {z.est_time_text}</span>}
                              {z.free_delivery_threshold != null && <span className="text-emerald-600">مجاني فوق {formatCurrency(z.free_delivery_threshold)}</span>}
                              {z.min_order_amount != null && <span className="text-amber-600">حد أدنى {formatCurrency(z.min_order_amount)}</span>}
                            </div>
                            {z.description && <p className="text-xs text-muted-foreground mt-1">{z.description}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {shippingEnabled && hasPermission('manage-shipping') && (
                              <Button variant="ghost" size="sm" onClick={() => router.visit(route('delivery.zones.edit', z.id))}><Edit className="h-4 w-4" /></Button>
                            )}
                            {hasPermission('manage-shipping') && (
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteZoneId(z.id)}><Trash2 className="h-4 w-4" /></Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Dialog open={!!deleteZoneId} onOpenChange={() => setDeleteZoneId(null)}>
                <DialogContent>
                  <DialogHeader><DialogTitle>حذف منطقة التوصيل</DialogTitle></DialogHeader>
                  <p className="text-sm">هل أنت متأكد من حذف هذه المنطقة؟ الطلبات التاريخية تحتفظ بصورتها.</p>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteZoneId(null)}>إلغاء</Button>
                    <Button variant="destructive" onClick={() => { if (deleteZoneId) router.delete(route('delivery.zones.destroy', deleteZoneId), { onSuccess: () => { setDeleteZoneId(null); toast.success('تم الحذف'); router.reload({ only: ['zonesDetailed','zones','hubStats'] }); } }); }}>حذف</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {shippings && shippings.length > 0 && (
                <Card className="border-dashed">
                  <CardHeader><CardTitle className="text-sm">تغطية طرق التوصيل</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">لديك أيضاً {shippings.length} طريقة توصيل مهيأة — تختلف عن مناطق التوصيل المحلية في آلية التسعير والتنفيذ.</p>
                    <Button size="sm" variant="outline" className="mt-2" onClick={() => navigateTab('methods')}>عرض طرق التوصيل</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'drivers' && (
            <div className="space-y-3">
              <Card className="border-blue-100 bg-blue-50/50">
                <CardContent className="p-3 flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold">هذا القسم اختياري</p>
                    <p className="text-xs text-muted-foreground">إذا كنت توصل الطلبات بنفسك أو تستخدم شركة خارجية، قد لا تحتاج لإضافة سائقين. يمكنك إضافة فريق التوصيل لاحقاً.</p>
                  </div>
                  <Badge variant="secondary" className="ms-auto shrink-0">اختياري</Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">السائقون <Badge variant="secondary">{driversDetailed?.length || 0}</Badge></CardTitle>
                </CardHeader>
                <CardContent>
                  {(!driversDetailed || driversDetailed.length === 0) ? (
                    <div className="text-center py-12">
                      <User className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
                      <h3 className="mt-4 text-lg font-medium">لا يوجد سائقون بعد</h3>
                      <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">إذا كنت توصل بنفسك، لا تحتاج لإضافة سائق. يمكنك إضافة فريق التوصيل لاحقاً.</p>
                      {hasPermission('manage-orders') && (
                        <div className="mt-4 flex justify-center gap-2">
                          {shippingEnabled && (
                            <Button onClick={() => router.visit(route('delivery.drivers.create'))}><Plus className="h-4 w-4 me-2" /> إضافة سائق</Button>
                          )}
                          <Button variant="outline" onClick={() => router.visit(route('delivery.drivers.index'))}>إدارة السائقين</Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(driversDetailed || []).map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">{d.name}</span>
                              <Badge variant={d.active ? 'default' : 'secondary'}>{d.active ? 'نشط' : 'غير نشط'}</Badge>
                              {d.code && <Badge variant="outline" className="text-xs">كود: {d.code}</Badge>}
                            </div>
                            {d.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Phone className="h-3 w-3" /> {d.phone}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            {hasPermission('manage-orders') && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => router.visit(route('delivery.drivers.show', d.id))}><Eye className="h-4 w-4" /></Button>
                                {shippingEnabled && (
                                  <Button variant="ghost" size="sm" onClick={() => router.visit(route('delivery.drivers.edit', d.id))}><Edit className="h-4 w-4" /></Button>
                                )}
                                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteDriverId(d.id)}><Trash2 className="h-4 w-4" /></Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Dialog open={!!deleteDriverId} onOpenChange={() => setDeleteDriverId(null)}>
                <DialogContent>
                  <DialogHeader><DialogTitle>حذف السائق</DialogTitle></DialogHeader>
                  <p className="text-sm">هل أنت متأكد من حذف هذا السائق؟ التعيينات النشطة ستفقد السائق تلقائياً.</p>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDeleteDriverId(null)}>إلغاء</Button>
                    <Button variant="destructive" onClick={() => { if (deleteDriverId) router.delete(route('delivery.drivers.destroy', deleteDriverId), { onSuccess: () => { setDeleteDriverId(null); toast.success('تم الحذف'); router.reload({ only: ['driversDetailed','drivers','hubStats'] }); } }); }}>حذف</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {activeTab === 'companies' && (
            <div className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    شركات التوصيل <Badge variant="outline" className="text-[11px]">اختياري / متقدم</Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">ما تعنيه شركات التوصيل حالياً في وصول — اعدادات حقيقية فقط، بدون ادعاءات تكامل وهمية.</p>
                </CardHeader>
                <CardContent>
                  {(!courierIntegrations || courierIntegrations.length === 0) ? (
                    <div className="text-center py-12">
                      <Building2 className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
                      <h3 className="mt-4 text-lg font-medium">لا تستخدم شركة توصيل؟ لا مشكلة.</h3>
                      <p className="mt-1 text-sm text-muted-foreground">يمكنك الاكتفاء بالتوصيل الذاتي أو إضافة شركة لاحقاً عند الحاجة.</p>
                      <Button size="sm" variant="outline" className="mt-4" onClick={() => { const storeId = (usePage().props as any).auth?.user?.current_store; if (storeId) router.visit(`/stores/${storeId}/shipping/integrations`); }}>استعراض شركات التوصيل</Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {courierIntegrations.map((c: any) => {
                        const statusMap: Record<string, { label: string; color: string }> = {
                          connected: { label: 'متصل', color: 'bg-emerald-600 text-white' },
                          error: { label: 'فشل الاتصال', color: 'bg-red-600 text-white' },
                          testing: { label: 'جاري الاختبار', color: 'bg-amber-500 text-white' },
                          incomplete: { label: 'بيانات ناقصة', color: 'bg-amber-600 text-white' },
                          not_connected: { label: 'غير متصل', color: 'bg-slate-500 text-white' },
                        };
                        const st = statusMap[c.status] || { label: c.status || 'غير متصل', color: 'bg-slate-500 text-white' };
                        return (
                          <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{c.display_name || c.provider}</span>
                                <Badge className={st.color}>{st.label}</Badge>
                                {!c.is_active && <Badge variant="secondary">موقوف</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">المزود: {c.provider}</p>
                              {c.last_error && <p className="text-xs text-red-600 mt-1">{c.last_error}</p>}
                              {c.last_tested_at && <p className="text-xs text-muted-foreground mt-1">آخر اختبار: {new Date(c.last_tested_at).toLocaleString('ar')}</p>}
                              <p className="text-xs text-muted-foreground mt-1">يتطلب إعدادًا مع مزود الخدمة — {c.status === 'connected' ? 'متصل حالياً' : 'غير متصل حتى اكتمال الإعداد'}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => { const sid = (usePage().props as any).auth?.user?.current_store; if (sid) router.visit(`/stores/${sid}/shipping/integrations`); }}>إدارة</Button>
                          </div>
                        );
                      })}
                      <Card className="border-amber-200 bg-amber-50 mt-3">
                        <CardContent className="p-3">
                          <p className="text-xs flex gap-2"><Shield className="h-4 w-4 text-amber-600" /> لا يتم ادعاء ربط API تلقائي أو تتبع webhook أو مزامنة COD إلا إذا كان التنفيذ يدعم ذلك فعلياً.</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-3">
              <Card className="border-emerald-200">
                <CardHeader><CardTitle className="text-sm">الشحن المجاني</CardTitle><p className="text-xs text-muted-foreground">الإعداد المرجعي — عند وصول قيمة المنتجات إلى هذا الحد، تصبح تكلفة الشحن صفراً.</p></CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={freeEnabled} onChange={e=>setFreeEnabled(e.target.checked)} className="h-5 w-5 accent-emerald-600" /><span className="text-sm font-bold">تفعيل الشحن المجاني عند تجاوز مبلغ محدد</span></label>
                  {freeEnabled && (<div className="flex items-center gap-2"><span className="text-sm">حد الشحن المجاني</span><Input type="number" min="1" step="0.01" value={freeThreshold} onChange={e=>setFreeThreshold(e.target.value)} placeholder="250" className="w-32" /><span className="text-sm">₪</span></div>)}
                  <Button onClick={saveFreeShipping} size="sm">حفظ إعدادات الشحن المجاني</Button>
                  <p className="text-xs text-muted-foreground">سلوك الدفع عند الإتمام يبقى كما هو — المرجع server-side.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">إعدادات عامة</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">لا يوجد إعداد إضافي مطلوب الآن. ستجد طرق التوصيل والمناطق والسائقين في التبويبات الخاصة بها.</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigateTab('methods')}>طرق التوصيل</Button>
                    <Button size="sm" variant="outline" onClick={() => navigateTab('zones')}>المناطق</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </PageTemplate>

      {/* Assign / Reassign Dialog — keep for orders tab */}
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
                      router.visit(route('delivery.drivers.index'));
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
