import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
  Plus,
  Download,
  Store as StoreIcon,
  Package,
  HandCoins,
  ShoppingCart,
  ExternalLink,
  MoreVertical,
  LayoutTemplate,
  CreditCard,
  Truck,
  Settings,
  Trash2,
  CheckCircle2,
  CircleDashed,
  CalendarClock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { router, usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { formatLocalDate } from '@/utils/date-helper';
import { hasPermission } from '@/utils/permissions';
import DesignerNavigationModal from '@/components/DesignerNavigationModal';
import { cn } from '@/lib/utils';

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

const TEMPLATE_LABELS: Record<string, string> = {
  'fashion-atelier': 'أزياء وبوتيك',
  'grocery-souq': 'بقالة وسوبر ماركت',
  'bakery-house': 'مخبز وحلويات',
  'restaurant-menu': 'الهيئة',
  'electronics-hub': 'إلكترونيات',
  'bazaar-market': 'سوق عام',
};

function templateLabel(slug?: string | null): string {
  if (!slug) return 'سوق عام';
  return TEMPLATE_LABELS[slug] || 'سوق عام';
}

export default function StoreManagement({ stores = [], storeStats = {}, storeLimitInfo = {} as any }: StoreManagementProps & { storeLimitInfo?: any }) {
  const { auth } = usePage().props as any;
  const [storeToDelete, setStoreToDelete] = useState<number | null>(null);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [designerStoreId, setDesignerStoreId] = useState<number | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const has = (permission: string) => hasPermission(permission);

  const go = (action: string, permission: string, storeId?: number) => {
    if (!has(permission)) return;
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
      case 'designer':
        setDesignerStoreId(storeId!);
        setDesignerOpen(true);
        break;
      case 'delete':
        if (stores.length <= 1) return;
        setStoreToDelete(storeId!);
        break;
      case 'create': {
        const limit = (storeLimitInfo as any) || {};
        if (limit.can_create === false) {
          setShowUpgradeDialog(true);
          return;
        }
        router.visit(route('stores.create'));
        break;
      }
      case 'export':
        window.open(route('stores.export'), '_blank');
        break;
      case 'design':
        router.visit(route('stores.designer', storeId));
        break;
      case 'payments':
        router.visit(route('stores.payments', storeId));
        break;
      case 'shipping':
        router.visit(route('stores.shipping.canonical', storeId));
        break;
      case 'features':
        router.visit(route('stores.features', storeId));
        break;
      case 'erp':
        router.visit(route('stores.erp', storeId));
        break;
    }
  };

  const handleDelete = () => {
    if (storeToDelete && has('delete-stores')) {
      router.delete(route('stores.destroy', storeToDelete));
      setStoreToDelete(null);
    }
  };

  const pageActions: PageAction[] = [
    ...(has('export-stores')
      ? [
          {
            label: 'تصدير',
            icon: <Download className="h-4 w-4" />,
            variant: 'outline' as const,
            onClick: () => go('export', 'export-stores'),
          },
        ]
      : []),
    ...(has('create-stores')
      ? [
          {
            label: 'إنشاء متجر',
            icon: <Plus className="h-4 w-4" />,
            variant: 'default' as const,
            onClick: () => go('create', 'create-stores'),
          },
        ]
      : []),
  ];

  const totalStores = storeStats.totalStores ?? stores.length;
  const activeStores = storeStats.activeStores ?? stores.filter((s) => s.config_status).length;
  const totalOrders = storeStats.totalOrders ?? 0;
  const totalRevenue = storeStats.totalRevenue ?? 0;
  const readyStores = storeStats.readyStores ?? 0;

  const summary = [
    {
      label: 'إجمالي المتاجر',
      value: totalStores,
      icon: StoreIcon,
      accent: 'text-sky-600 bg-sky-50',
    },
    {
      label: 'المتاجر النشطة',
      value: activeStores,
      icon: CheckCircle2,
      accent: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'إجمالي الطلبات',
      value: totalOrders,
      icon: ShoppingCart,
      accent: 'text-violet-600 bg-violet-50',
    },
    {
      label: 'الإيرادات',
      value: formatCurrency(totalRevenue),
      icon: HandCoins,
      accent: 'text-amber-600 bg-amber-50',
    },
  ];

  function StatusBadge({ store }: { store: any }) {
    if (store.config_status) {
      return (
        <Badge variant="success" className="gap-1 rounded-full px-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          نشط
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1 rounded-full px-2.5">
        <CircleDashed className="h-3 w-3" />
        غير نشط
      </Badge>
    );
  }

  function ReadinessChip({ store }: { store: any }) {
    const r = store.readiness || {};
    const missing = r.missing || [];
    const handleClick = () => router.visit(route('stores.show', store.id));
    if (r.isReady) {
      return (
        <button type="button" onClick={handleClick} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          جاهز للبيع
        </button>
      );
    }
    return (
      <button type="button" onClick={handleClick} title={missing.length ? `المتبقي: ${missing.join('، ')}` : undefined} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
        <CircleDashed className="h-3.5 w-3.5" />
        يحتاج إعداد {missing.length > 0 ? `(${missing.length})` : ''}
      </button>
    );
  }

  return (
    <PageTemplate
      title="المتاجر"
      url="/stores"
      actions={pageActions}
      breadcrumbs={[
        { title: 'الرئيسية', href: route('dashboard') },
        { title: 'إدارة المتاجر', href: route('stores.index') },
        { title: 'المتاجر' },
      ]}
    >
      <div className="space-y-4">
        {/* Subtitle — tight under header, not inside a shell */}
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          أدر متاجرك من مكان واحد — تابع الأداء، أكمل إعداداتك، واطلق متجرك للبيع.
        </p>

        {/* Compact summary strip — dense but comfortable */}
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {summary.map((item) => (
            <Card key={item.label} className="overflow-hidden shadow-sm">
              <CardContent className="flex items-center gap-3 p-3">
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    item.accent
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-muted-foreground">{item.label}</p>
                  <p className="truncate text-[15px] font-bold leading-tight">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stores list — no outer bordered shell, grid uses available width */}
        {stores.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="flex flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <StoreIcon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-[15px] font-semibold">ابدأ بإنشاء متجرك الأول</h3>
              <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                أنشئ متجراً إلكترونياً احترافياً على واتساب خلال دقائق، وأضف منتجاتك وطرق الدفع
                والشحن لتستقبل طلباتك الأولى.
              </p>
              {has('create-stores') && (
                <Button className="mt-4" size="sm" onClick={() => go('create', 'create-stores')}>
                  <Plus className="h-4 w-4 me-2" />
                  إنشاء متجر
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Section header — tight, one divider below is enough */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-semibold">متاجرك</h2>
                <Badge variant="secondary" className="rounded-full px-2 py-0 text-[11px]">
                  {stores.length}
                </Badge>
              </div>
              {readyStores > 0 && (
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {readyStores} من {stores.length} جاهزة للبيع
                </span>
              )}
            </div>

            <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
              {stores.map((store) => (
                <Card
                  key={store.id}
                  className="group flex flex-col overflow-hidden shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Card header — single border, compact */}
                  <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-3.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <StoreIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-[13px] font-semibold leading-tight">{store.name}</h3>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground" dir="ltr">
                          {store.display_domain}
                        </p>
                      </div>
                    </div>
                    <StatusBadge store={store} />
                  </div>

                  {/* Card body — reduced padding, one muted background block for stats */}
                  <CardContent className="flex flex-1 flex-col gap-3 p-3.5">
                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <LayoutTemplate className="h-3 w-3" />
                        {templateLabel(store.template_slug)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {formatLocalDate(store.last_activity || store.created_at)}
                      </span>
                    </div>

                    {/* Key stats — background grouping instead of nested border */}
                    <div className="grid grid-cols-3 rounded-lg bg-muted/40">
                      <div className="flex flex-col items-center gap-0.5 px-2 py-2">
                        <span className="text-sm font-bold">{store.orders_count ?? 0}</span>
                        <span className="text-[11px] text-muted-foreground">الطلبات</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 border-s border-white/60 px-2 py-2">
                        <span className="text-sm font-bold">{store.products_count ?? 0}</span>
                        <span className="text-[11px] text-muted-foreground">المنتجات</span>
                      </div>
                      <div className="flex max-w-0 flex-col items-center gap-0.5 border-s border-white/60 px-2 py-2">
                        <span className="max-w-full truncate whitespace-nowrap text-sm font-bold" dir="ltr">
                          <bdi>{formatCurrency(store.revenue || 0)}</bdi>
                        </span>
                        <span className="text-[11px] text-muted-foreground">الإيرادات</span>
                      </div>
                    </div>

                    {/* Readiness indicator */}
                    <ReadinessChip store={store} />
                  </CardContent>

                  {/* Card footer actions — subtle, not heavy */}
                  <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50/50 px-3 py-2.5">
                    {has('view-stores') && (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => go('view', 'view-stores', store.id)}
                      >
                        إدارة المتجر
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(route('store.home', store.slug), '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 me-1.5" />
                      زيارة
                    </Button>
                    {(has('settings-stores') || has('delete-stores')) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="المزيد">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {has('settings-stores') && (
                            <>
                              <DropdownMenuItem onClick={() => go('design', 'settings-stores', store.id)}>
                                <LayoutTemplate className="h-4 w-4" />
                                تصميم المتجر
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => go('payments', 'settings-stores', store.id)}>
                                <CreditCard className="h-4 w-4" />
                                طرق الدفع
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => go('shipping', 'settings-stores', store.id)}>
                                <Truck className="h-4 w-4" />
                                الشحن والتوصيل
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => go('erp', 'settings-stores', store.id)}>
                                <Package className="h-4 w-4" />
                                ربط ERP والمخزون
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => go('settings', 'settings-stores', store.id)}>
                                <Settings className="h-4 w-4" />
                                الإعدادات العامة
                              </DropdownMenuItem>
                            </>
                          )}
                          {has('settings-stores') && has('delete-stores') && <DropdownMenuSeparator />}
                          {has('delete-stores') && (
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={stores.length <= 1}
                              onClick={() => go('delete', 'delete-stores', store.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              حذف المتجر
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!storeToDelete} onOpenChange={(open) => !open && setStoreToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف المتجر</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من رغبتك في حذف هذا المتجر؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStoreToDelete(null)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DesignerNavigationModal open={designerOpen} onOpenChange={setDesignerOpen} storeId={designerStoreId} />
      {/* Upgrade dialog for free-plan store limit */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ترقية الباقة مطلوبة</DialogTitle>
            <DialogDescription className="text-right leading-relaxed">
              لقد وصلت إلى الحد المسموح به لعدد المتاجر في باقتك الحالية. لإنشاء متجر إضافي، قم بترقية باقتك.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              إلغاء
            </Button>
            <Button onClick={() => { setShowUpgradeDialog(false); const url = (storeLimitInfo as any)?.plans_url || route('plans.index'); router.visit(url); }}>
              الانتقال إلى الباقات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
