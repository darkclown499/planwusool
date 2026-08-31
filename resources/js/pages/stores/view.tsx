import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
  ExternalLink,
  Edit,
  MoreVertical,
  LayoutTemplate,
  CreditCard,
  Truck,
  Package,
  Settings,
  Store as StoreIcon,
  ShoppingCart,
  HandCoins,
  PackageCheck,
  Users,
  CheckCircle2,
  CircleDashed,
  Plus,
  ListOrdered,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export default function ViewStore({ store, stats, readiness, storeUrl }: any) {
  const { auth } = usePage().props as any;
  const [designerOpen, setDesignerOpen] = useState(false);

  const userPermissions =
    typeof auth?.permissions === 'function' ? auth.permissions() : auth?.permissions || [];
  const hasEdit = userPermissions.includes('edit-stores');
  const hasSettings = userPermissions.includes('settings-stores');

  const ready = readiness || {};
  const readyItems = [
    { key: 'design', label: 'التصميم', done: !!ready.design, href: route('stores.designer', store.id) },
    { key: 'products', label: 'المنتجات', done: !!ready.products, href: route('products.create') },
    { key: 'shipping', label: 'الشحن والتوصيل', done: !!ready.shipping, href: route('stores.shipping.canonical', store.id) },
    { key: 'payments', label: 'طرق الدفع', done: !!ready.payments, href: route('stores.payments', store.id) },
    { key: 'email', label: 'البريد الإلكتروني', done: !!ready.email, href: route('stores.settings', store.id) },
  ];

  const quickActions = [
    { label: 'إضافة منتج', icon: Plus, href: route('products.create'), color: 'text-sky-600 bg-sky-50' },
    { label: 'عرض الطلبات', icon: ListOrdered, href: route('orders.index'), color: 'text-violet-600 bg-violet-50' },
    { label: 'تخصيص التصميم', icon: LayoutTemplate, href: route('stores.designer', store.id), color: 'text-rose-600 bg-rose-50' },
    { label: 'إعداد الدفع', icon: CreditCard, href: route('stores.payments', store.id), color: 'text-amber-600 bg-amber-50' },
    { label: 'إعداد الشحن', icon: Truck, href: route('stores.shipping.canonical', store.id), color: 'text-emerald-600 bg-emerald-50' },
  ];

  const performance = [
    { label: 'الطلبات', value: stats?.total_orders ?? 0, icon: ShoppingCart, color: 'text-violet-600 bg-violet-50' },
    { label: 'الإيرادات', value: formatCurrency(stats?.total_revenue ?? 0), icon: HandCoins, color: 'text-amber-600 bg-amber-50' },
    { label: 'المنتجات', value: stats?.total_products ?? 0, icon: PackageCheck, color: 'text-sky-600 bg-sky-50' },
    { label: 'العملاء', value: stats?.total_customers ?? 0, icon: Users, color: 'text-emerald-600 bg-emerald-50' },
  ];

  const infoRows = [
    { label: 'البريد الإلكتروني', value: store.email || 'غير مضبوط', dir: 'ltr' as const },
    { label: 'النطاق', value: store.display_domain || store.domain || 'غير مضبوط', dir: 'ltr' as const },
    { label: 'النموذج', value: templateLabel(store.template_slug || store.theme), dir: 'rtl' as const },
    { label: 'تاريخ الإنشاء', value: formatLocalDate(store.created_at), dir: 'rtl' as const },
  ];

  return (
    <PageTemplate
      title={store.name}
      url={`/stores/${store.id}`}
      backUrl={route('stores.index')}
      actions={[
        {
          label: 'زيارة المتجر',
          icon: <ExternalLink className="h-4 w-4" />,
          variant: 'outline' as const,
          onClick: () => window.open(storeUrl || route('store.home', store.slug), '_blank'),
        },
        ...(hasEdit
          ? [
              {
                label: 'تعديل',
                icon: <Edit className="h-4 w-4" />,
                variant: 'default' as const,
                onClick: () => router.visit(route('stores.edit', store.id)),
              },
            ]
          : []),
      ]}
      action={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
              <MoreVertical className="h-4 w-4" />
              المزيد
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {hasSettings && (
              <>
                <DropdownMenuItem onClick={() => setDesignerOpen(true)}>
                  <LayoutTemplate className="h-4 w-4" />
                  تخصيص تصميم المتجر
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.visit(route('stores.payments', store.id))}>
                  <CreditCard className="h-4 w-4" />
                  طرق الدفع
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.visit(route('stores.shipping.canonical', store.id))}>
                  <Truck className="h-4 w-4" />
                  الشحن والتوصيل
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.visit(route('stores.erp', store.id))}>
                  <Package className="h-4 w-4" />
                  ربط ERP والمخزون
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.visit(route('stores.settings', store.id))}>
                  <Settings className="h-4 w-4" />
                  الإعدادات العامة
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      }
      breadcrumbs={[
        { title: 'الرئيسية', href: route('dashboard') },
        { title: 'المتاجر', href: route('stores.index') },
        { title: store.name },
      ]}
    >
      <div className="space-y-6">
        {/* Store hero */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <StoreIcon className="h-8 w-8" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold leading-tight">{store.name}</h2>
                  {store.config_status ? (
                    <Badge variant="success" className="gap-1 rounded-full px-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      نشط
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 rounded-full px-2.5">
                      <CircleDashed className="h-3 w-3" />
                      غير نشط
                    </Badge>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground" dir="ltr">
                  {store.display_domain || store.domain}
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LayoutTemplate className="h-3.5 w-3.5" />
                  {templateLabel(store.template_slug || store.theme)}
                </p>
              </div>
            </div>
            <div className="shrink-0">
              {ready.isReady ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  جاهز للبيع
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
                  <CircleDashed className="h-4 w-4" />
                  يحتاج إعداد ({ready.missing?.length ?? 0})
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance snapshot */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">نظرة على الأداء</h3>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {performance.map((item) => (
              <Card key={item.label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', item.color)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">{item.label}</p>
                    <p className="truncate text-lg font-bold leading-tight" dir={item.label === 'الإيرادات' ? 'ltr' : undefined}>
                      {item.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Readiness */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="text-base">جاهزية المتجر</CardTitle>
              {ready.missing?.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {ready.missing.length} خطوات متبقية
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {readyItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => router.visit(item.href)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-start transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    {item.done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <CircleDashed className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className={cn('text-sm font-medium', item.done ? 'text-muted-foreground line-through' : '')}>
                      {item.label}
                    </span>
                  </div>
                  <span className={cn('text-xs', item.done ? 'text-emerald-600' : 'text-amber-600')}>
                    {item.done ? 'مكتمل' : 'لم يكتمل'}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Store information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">معلومات المتجر</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {infoRows.map((row) => (
                <div key={row.label}>
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="mt-0.5 truncate text-sm font-medium" dir={row.dir}>
                    {row.value}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <section>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">إجراءات سريعة</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => router.visit(action.href)}
                className="group flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center transition-colors hover:bg-muted/40"
              >
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', action.color)}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      <DesignerNavigationModal open={designerOpen} onOpenChange={setDesignerOpen} storeId={store.id} />
    </PageTemplate>
  );
}
