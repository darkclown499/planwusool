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
  'restaurant-menu': 'مطاعم وأطعمة',
  'electronics-hub': 'إلكترونيات',
  'bazaar-market': 'سوق عام',
};

function templateLabel(slug?: string | null): string {
  if (!slug) return 'سوق عام';
  return TEMPLATE_LABELS[slug] || 'سوق عام';
}

export default function StoreManagement({ stores = [], storeStats = {} }: StoreManagementProps) {
  const { auth } = usePage().props as any;
  const [storeToDelete, setStoreToDelete] = useState<number | null>(null);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [designerStoreId, setDesignerStoreId] = useState<number | null>(null);

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
      case 'create':
        router.visit(route('stores.create'));
        break;
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
    if (r.isReady) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          جاهز للبيع
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
        <CircleDashed className="h-3.5 w-3.5" />
        يحتاج إعداد {missing.length > 0 ? `(${missing.length})` : ''}
      </span>
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
      <div className="space-y-6">
        {/* Subtitle */}
        <p className="text-sm text-muted-foreground">
          أدر متاجرك من مكان واحد — تابع الأداء، أكمل إعداداتك، واطلق متجرك للبيع.
        </p>

        {/* Compact summary strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map((item) => (
            <Card key={item.label} className="overflow-hidden">
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                    item.accent
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{item.label}</p>
                  <p className="truncate text-lg font-bold leading-tight">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stores list */}
        {stores.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <StoreIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">ابدأ بإنشاء متجرك الأول</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                أنشئ متجراً إلكترونياً احترافياً على واتساب خلال دقائق، وأضف منتجاتك وطرق الدفع
                والشحن لتستقبل طلباتك الأولى.
              </p>
              {has('create-stores') && (
                <Button className="mt-5" onClick={() => go('create', 'create-stores')}>
                  <Plus className="h-4 w-4 me-2" />
                  إنشاء متجر
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">متاجرك</h2>
                <Badge variant="secondary" className="rounded-full">
                  {stores.length}
                </Badge>
              </div>
              {readyStores > 0 && (
                <span className="hidden text-xs text-muted-foreground sm:inline">
                  {readyStores} من {stores.length} جاهزة للبيع
                </span>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stores.map((store) => (
                <Card
                  key={store.id}
                  className="group flex flex-col overflow-hidden transition-shadow hover:shadow-md"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-3 border-b p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <StoreIcon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold leading-tight">{store.name}</h3>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">
                          {store.display_domain}
                        </p>
                      </div>
                    </div>
                    <StatusBadge store={store} />
                  </div>

                  {/* Card body */}
                  <CardContent className="flex flex-1 flex-col gap-4 p-4">
                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <LayoutTemplate className="h-3.5 w-3.5" />
                        {templateLabel(store.template_slug)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatLocalDate(store.last_activity || store.created_at)}
                      </span>
                    </div>

                    {/* Key stats */}
                    <div className="grid grid-cols-3 rounded-lg border bg-muted/40">
                      <div className="flex flex-col items-center gap-0.5 px-2 py-2">
                        <span className="text-sm font-bold">{store.orders_count ?? 0}</span>
                        <span className="text-[11px] text-muted-foreground">الطلبات</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 border-s px-2 py-2">
                        <span className="text-sm font-bold">{store.products_count ?? 0}</span>
                        <span className="text-[11px] text-muted-foreground">المنتجات</span>
                      </div>
                      <div className="flex max-w-0 flex-col items-center gap-0.5 border-s px-2 py-2">
                        <span className="max-w-full truncate text-sm font-bold" dir="ltr">
                          {formatCurrency(store.revenue || 0)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">الإيرادات</span>
                      </div>
                    </div>

                    {/* Readiness indicator */}
                    <ReadinessChip store={store} />
                  </CardContent>

                  {/* Card footer actions */}
                  <div className="flex items-center gap-2 border-t bg-muted/30 p-3">
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
    </PageTemplate>
  );
}
