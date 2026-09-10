import React, { useState, useCallback, useMemo } from 'react';
import { PageTemplate } from '@/components/page-template';
import { ShoppingCart, Eye, Edit, Trash2, Package, Download, Search, X, ChevronLeft, ChevronRight, MessageCircle, MoreVertical, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { router, usePage, Link } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';
import { tOrderStatus, tPaymentMethod, tPaymentStatus } from '@/utils/order-status';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface OrderItem {
  id: number;
  orderNumber: string;
  customer: string;
  email: string;
  phone?: string;
  total: number;
  status: string;
  paymentStatus?: string;
  fulfillment?: string;
  items: number;
  date: string;
  paymentMethod: string;
  order_source?: string;
}

interface PaginationData {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface FiltersData {
  search: string;
  group: string;
  status: string;
  payment_status: string;
  payment_method: string;
  source: string;
  date_from: string;
  date_to: string;
}

interface OrdersProps {
  orders: OrderItem[];
  pagination?: PaginationData;
  filters?: FiltersData;
  stats: {
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
  };
  groupCounts?: Record<string, number>;
}

const STATUS_GROUPS = [
  { key: '', label: 'الكل' },
  { key: 'new', label: 'جديد' },
  { key: 'in_progress', label: 'قيد التنفيذ' },
  { key: 'completed', label: 'مكتملة' },
  { key: 'issues', label: 'مشاكل/أخرى' },
];

interface BulkEntry {
  order_id: number;
  order_number: string | null;
  status?: string;
  reason?: string;
}

interface BulkResult {
  action: string;
  success: BulkEntry[];
  failed: BulkEntry[];
  summary: { total: number; succeeded: number; failed: number };
}

// Mirrors OrderController::BULK_ACTIONS — only safe, meaningful fulfillment
// transitions are exposed in bulk. `from` mirrors the canonical ALLOWED map
// (shipping statuses are lowercase raw order statuses).
const BULK_ACTIONS = [
  { action: 'confirm', target: 'confirmed', label: 'تأكيد الطلبات', from: ['pending'] },
  { action: 'mark_shipped', target: 'shipped', label: 'جاهزة للتوصيل', from: ['processing'] },
  { action: 'mark_delivered', target: 'delivered', label: 'تم التسليم', from: ['processing', 'shipped'] },
];

const BULK_TARGET_LABELS: Record<string, string> = {
  confirmed: 'مؤكد',
  shipped: 'تم الشحن',
  delivered: 'تم التسليم',
};

const BULK_SELECTABLE_STATUSES = new Set(['pending', 'confirmed', 'processing', 'shipped']);

export default function Orders({ orders = [], pagination, filters: initialFilters, stats, groupCounts }: OrdersProps) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [search, setSearch] = useState(initialFilters?.search || '');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FiltersData>({
    search: initialFilters?.search || '',
    group: initialFilters?.group || '',
    status: initialFilters?.status || '',
    payment_status: initialFilters?.payment_status || '',
    payment_method: initialFilters?.payment_method || '',
    source: initialFilters?.source || '',
    date_from: initialFilters?.date_from || '',
    date_to: initialFilters?.date_to || '',
  });

  const groupKeys = STATUS_GROUPS.map((g) => g.key);
  const effectiveGroup = groupKeys.includes(activeFilters.group) ? activeFilters.group : '';

  const applyFilters = useCallback((newFilters: Partial<FiltersData>) => {
    setSelectedIds([]);
    const merged = { ...activeFilters, ...newFilters };
    if (newFilters.group !== undefined && newFilters.status === undefined) merged.status = '';
    setActiveFilters(merged);
    const params: Record<string, string> = {};
    Object.entries(merged).forEach(([k, v]) => { if (v) params[k] = v; });
    params.per_page = '15';
    router.get(route('orders.index'), params, { preserveState: true, replace: true });
  }, [activeFilters]);

  const clearFilters = useCallback(() => {
    setSelectedIds([]);
    setSearch('');
    setActiveFilters({ search: '', group: '', status: '', payment_status: '', payment_method: '', source: '', date_from: '', date_to: '' });
    router.get(route('orders.index'), {}, { preserveState: true, replace: true });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search });
  };

  const goToPage = (page: number) => {
    setSelectedIds([]);
    const params: Record<string, string> = { page: String(page) };
    Object.entries(activeFilters).forEach(([k, v]) => { if (v) params[k] = v; });
    router.get(route('orders.index'), params, { preserveState: true, replace: true });
  };

  const handleActionClick = (action: string, permission: string, orderId?: number) => {
    if (!checkPermission(permission, auth)) return;
    switch (action) {
      case 'view': router.visit(route('orders.show', orderId)); break;
      case 'edit': router.visit(route('orders.edit', orderId)); break;
      case 'delete': setOrderToDelete(orderId!); break;
      case 'export': window.open(route('orders.export'), '_blank'); break;
    }
  };

  const handleDelete = () => {
    if (orderToDelete && checkPermission('delete-orders', auth)) {
      router.delete(route('orders.destroy', orderToDelete));
      setOrderToDelete(null);
    }
  };

  // ── Bulk selection helpers ──
  const canBulk = hasPermission('edit-orders');
  const orderStatusById = useMemo(() => {
    const m: Record<number, string> = {};
    orders.forEach((o) => { m[o.id] = String(o.status).toLowerCase(); });
    return m;
  }, [orders]);
  const pageSelectableIds = useMemo(
    () => orders.filter((o) => BULK_SELECTABLE_STATUSES.has(String(o.status).toLowerCase())).map((o) => o.id),
    [orders]
  );
  const allPageSelected = pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedIds.includes(id));
  const somePageSelected = pageSelectableIds.some((id) => selectedIds.includes(id));
  const availableBulkActions = BULK_ACTIONS.filter((a) => selectedIds.some((id) => a.from.includes(orderStatusById[id] || '')));

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const onPage = new Set(pageSelectableIds);
      if (onPage.size === 0) return prev;
      const allSelected = [...onPage].every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !onPage.has(id));
      return Array.from(new Set([...prev, ...onPage]));
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const activeBulkAction = BULK_ACTIONS.find((a) => a.action === bulkAction) || null;

  const submitBulk = async () => {
    if (!bulkAction || selectedIds.length === 0 || bulkLoading) return;
    setBulkLoading(true);
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const url = (typeof route !== 'undefined' && route('orders.bulk-status')) || '/orders/bulk-status';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': token, 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ order_ids: selectedIds, action: bulkAction }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = j.errors?.order_ids?.[0] || j.errors?.action?.[0] || j.message || j.error || 'تعذر تنفيذ الإجراء';
        toast.error(msg);
        setBulkAction(null);
        return;
      }
      const result = j as BulkResult;
      setBulkResult(result);
      setBulkAction(null);
      setSelectedIds([]);
      if (result.summary) {
        if (result.summary.failed > 0) toast.error(`تم تحديث ${result.summary.succeeded} طلب، وتعذّر تحديث ${result.summary.failed} طلب`);
        else toast.success(`تم تحديث ${result.summary.succeeded} طلب بنجاح`);
      }
      router.reload();
    } catch {
      toast.error('تعذر الاتصال بالخادم — تحقق من الاتصال وحاول مرة أخرى');
      setBulkAction(null);
    } finally {
      setBulkLoading(false);
    }
  };

  const pageActions = [
    ...(hasPermission('export-orders') ? [{
      label: t('Export Orders'),
      icon: <Download className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => handleActionClick('export', 'export-orders'),
    }] : []),
  ];

  const getStatusVariant = (status: string): string => {
    switch (status) {
      case 'Completed': case 'Delivered': return 'default';
      case 'Processing': case 'Confirmed': return 'secondary';
      case 'Shipped': return 'outline';
      case 'Cancelled': case 'Failed': return 'destructive';
      default: return 'secondary';
    }
  };

  const hasActiveFilters = Object.values(activeFilters).some(v => v !== '');

  const groupEmptyTitle =
    effectiveGroup === 'new' ? t('No new orders yet')
    : effectiveGroup === 'in_progress' ? t('No in-progress orders')
    : effectiveGroup === 'completed' ? t('No completed orders')
    : effectiveGroup === 'issues' ? t('No orders with issues')
    : null;

  return (
    <PageTemplate
      title={t('Orders')}
      url="/orders"
      actions={pageActions}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Orders') },
      ]}
    >
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => clearFilters()}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('Total Orders')}</p>
                  <p className="text-xl sm:text-2xl font-bold ltr-num">{stats?.totalOrders || 0}</p>
                </div>
                <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => applyFilters({ group: '', status: 'pending' })}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('Pending')}</p>
                  <p className="text-xl sm:text-2xl font-bold ltr-num text-amber-600">{stats?.pendingOrders || 0}</p>
                </div>
                <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('Revenue')}</p>
                  <p className="text-xl sm:text-2xl font-bold ltr-num">{formatCurrency(stats?.totalRevenue || 0)}</p>
                </div>
                <div className="p-2 rounded-full bg-emerald-100 text-emerald-600">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{t('Avg. Value')}</p>
                  <p className="text-xl sm:text-2xl font-bold ltr-num">{formatCurrency(stats?.avgOrderValue || 0)}</p>
                </div>
                <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Filter Tabs */}
        <div className="space-y-3">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('Search by order number, customer name, phone, or email...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9 pe-9"
                dir="ltr"
              />
              {search && (
                <button type="button" onClick={() => { setSearch(''); applyFilters({ search: '' }); }} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button type="submit" variant="default" className="shrink-0">
              <Search className="h-4 w-4 me-1" /> {t('Search')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowFilters(!showFilters)} className={showFilters ? 'bg-primary/10' : ''}>
              {t('Filters')}
              {hasActiveFilters && <span className="ms-1 h-2 w-2 rounded-full bg-primary" />}
            </Button>
          </form>

          {/* Workflow group tabs — horizontal scroll on mobile */}
          <div role="tablist" aria-label={t('Order groups')} className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            {STATUS_GROUPS.map((tab) => {
              const isActive = effectiveGroup === tab.key;
              const count = tab.key === '' ? (groupCounts?.total ?? 0) : (groupCounts?.[tab.key] ?? 0);
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => applyFilters({ group: tab.key })}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                  <span className={`ltr-num ms-1.5 text-[10px] ${isActive ? 'bg-white/25' : 'bg-white'} rounded-full px-1.5 py-0.5`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Extended filters */}
          {showFilters && (
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('Payment Status')}</label>
                    <select
                      value={activeFilters.payment_status}
                      onChange={(e) => applyFilters({ payment_status: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">{t('All')}</option>
                      <option value="paid">{t('Paid')}</option>
                      <option value="pending">{t('Pending')}</option>
                      <option value="unpaid">{t('Unpaid')}</option>
                      <option value="failed">{t('Failed')}</option>
                      <option value="refunded">{t('Refunded')}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('Payment Method')}</label>
                    <select
                      value={activeFilters.payment_method}
                      onChange={(e) => applyFilters({ payment_method: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">{t('All')}</option>
                      <option value="cod">{t('Cash on Delivery')}</option>
                      <option value="stripe">{t('Stripe')}</option>
                      <option value="paypal">{t('PayPal')}</option>
                      <option value="razorpay">{t('Razorpay')}</option>
                      <option value="paystack">{t('Paystack')}</option>
                      <option value="bank">{t('Bank Transfer')}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('Source')}</label>
                    <select
                      value={activeFilters.source}
                      onChange={(e) => applyFilters({ source: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">{t('All')}</option>
                      <option value="web">{t('Web')}</option>
                      <option value="whatsapp">{t('WhatsApp')}</option>
                      <option value="pos">{t('POS')}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('Date From')}</label>
                    <Input
                      type="date"
                      value={activeFilters.date_from}
                      onChange={(e) => applyFilters({ date_from: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('Date To')}</label>
                    <Input
                      type="date"
                      value={activeFilters.date_to}
                      onChange={(e) => applyFilters({ date_to: e.target.value })}
                    />
                  </div>
                </div>
                {hasActiveFilters && (
                  <div className="mt-3 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                      <X className="h-3 w-3 me-1" /> {t('Clear All Filters')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Results count + active filter badges */}
          {pagination && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="ltr-num">{pagination.total} {t('orders')}</span>
              {hasActiveFilters && (
                <span className="text-primary font-medium">{t('Filtered results')}</span>
              )}
            </div>
          )}
        </div>

        {/* Bulk selection toolbar — only when the merchant can edit orders */}
        {canBulk && selectedIds.length > 0 && (
          <>
            {/* Desktop toolbar */}
            <Card className="hidden lg:block">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold ltr-num">تم تحديد {selectedIds.length} طلب</span>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={clearSelection}>
                      إلغاء التحديد
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {BULK_ACTIONS.map((a) => {
                      const available = availableBulkActions.some((x) => x.action === a.action);
                      return (
                        <Button key={a.action} size="sm" disabled={!available || bulkLoading} onClick={() => setBulkAction(a.action)}>
                          {a.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Mobile sticky bottom toolbar */}
            <div className="fixed inset-x-0 z-40 border-t bg-white/95 backdrop-blur p-3 lg:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.08)]" style={{ bottom: 'calc(56px + env(safe-area-inset-bottom))' }}>
              <div className="mx-auto max-w-lg">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-sm font-semibold ltr-num">تم تحديد {selectedIds.length} طلب</span>
                  <button type="button" className="text-xs font-medium text-muted-foreground hover:text-foreground" onClick={clearSelection}>
                    إلغاء التحديد
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {BULK_ACTIONS.map((a) => {
                    const available = availableBulkActions.some((x) => x.action === a.action);
                    return (
                      <Button key={a.action} size="sm" className="shrink-0 text-xs" disabled={!available || bulkLoading} onClick={() => setBulkAction(a.action)}>
                        {a.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Desktop orders table (>= lg) */}
        {orders.length > 0 && (
          <div className="hidden lg:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canBulk && (
                        <TableHead className="w-10">
                          <Checkbox
                            aria-label={t('Select all orders on this page')}
                            disabled={pageSelectableIds.length === 0}
                            checked={allPageSelected || (somePageSelected ? 'indeterminate' : false)}
                            onCheckedChange={toggleSelectAllPage}
                            className="ms-1"
                          />
                        </TableHead>
                      )}
                      <TableHead>{t('Order')}</TableHead>
                      <TableHead>{t('Customer')}</TableHead>
                      <TableHead className="text-end">{t('Total')}</TableHead>
                      <TableHead>{t('Payment')}</TableHead>
                      <TableHead>{t('Date')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead className="text-end">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        {canBulk && (
                          <TableCell className="w-10">
                            <Checkbox
                              aria-label={`تحديد الطلب ${order.orderNumber}`}
                              checked={selectedIds.includes(order.id)}
                              disabled={!BULK_SELECTABLE_STATUSES.has(String(order.status).toLowerCase())}
                              onCheckedChange={() => toggleSelect(order.id)}
                              className="h-5 w-5"
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <Link href={route('orders.show', order.id)} className="font-semibold hover:underline">
                            {order.orderNumber}
                          </Link>
                          {order.order_source === 'whatsapp' && (
                            <span className="inline-flex items-center gap-0.5 bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold ms-1 align-middle">
                              <MessageCircle className="h-2.5 w-2.5" /> واتساب
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{order.customer}</div>
                          {order.email && <div className="text-xs text-muted-foreground ltr-num">{order.email}</div>}
                        </TableCell>
                        <TableCell className="text-end ltr-num font-bold">{formatCurrency(order.total)}</TableCell>
                        <TableCell>
                          <div className="text-xs">{tPaymentMethod(order.paymentMethod)}</div>
                          {order.paymentStatus && (
                            <div className="text-[10px] text-muted-foreground">{tPaymentStatus(String(order.paymentStatus))}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs ltr-num whitespace-nowrap">{order.date}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(order.status) as any} className="text-[10px]">
                            {tOrderStatus(order.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end">
                          <div className="flex items-center justify-end gap-1">
                            {hasPermission('view-orders') && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('View order')} onClick={() => handleActionClick('view', 'view-orders', order.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {hasPermission('edit-orders') && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('Edit order')} onClick={() => handleActionClick('edit', 'edit-orders', order.id)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {hasPermission('delete-orders') && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={t('Delete order')} onClick={() => handleActionClick('delete', 'delete-orders', order.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mobile orders list (< lg) */}
        {orders.length > 0 && (
          <div className="space-y-2 lg:hidden">
            {orders.map((order) => (
              <div
                key={order.id}
                className="border rounded-xl p-3 bg-card hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  {canBulk && (
                    <Checkbox
                      aria-label={`تحديد الطلب ${order.orderNumber}`}
                      checked={selectedIds.includes(order.id)}
                      disabled={!BULK_SELECTABLE_STATUSES.has(String(order.status).toLowerCase())}
                      onCheckedChange={() => toggleSelect(order.id)}
                      className="mt-1 h-5 w-5 shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={route('orders.show', order.id)} className="font-semibold text-sm hover:underline">
                        {order.orderNumber}
                      </Link>
                      <Badge variant={getStatusVariant(order.status) as any} className="text-[10px]">
                        {tOrderStatus(order.status)}
                      </Badge>
                      {order.order_source === 'whatsapp' && (
                        <span className="inline-flex items-center gap-0.5 bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                          <MessageCircle className="h-2.5 w-2.5" /> واتساب
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">{order.customer}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {hasPermission('view-orders') && (
                      <Button variant="outline" size="sm" className="h-9 gap-1 px-2 text-xs" aria-label={t('View order')} onClick={() => handleActionClick('view', 'view-orders', order.id)}>
                        <Eye className="h-4 w-4" /> {t('View')}
                      </Button>
                    )}
                    {(hasPermission('edit-orders') || hasPermission('delete-orders')) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={t('Order actions')}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {hasPermission('edit-orders') && (
                            <DropdownMenuItem onClick={() => handleActionClick('edit', 'edit-orders', order.id)}>
                              <Edit className="h-4 w-4 me-2" /> {t('Edit')}
                            </DropdownMenuItem>
                          )}
                          {hasPermission('edit-orders') && hasPermission('delete-orders') && <DropdownMenuSeparator />}
                          {hasPermission('delete-orders') && (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleActionClick('delete', 'delete-orders', order.id)}>
                              <Trash2 className="h-4 w-4 me-2" /> {t('Delete')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-sm font-bold ltr-num">{formatCurrency(order.total)}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">{order.items} {t('items')}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground ltr-num">{order.date}</span>
                  {order.paymentStatus && (
                    <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full ${
                      String(order.paymentStatus).toLowerCase() === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                      String(order.paymentStatus).toLowerCase() === 'pending' ? 'bg-amber-50 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {tPaymentStatus(String(order.paymentStatus))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {orders.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 px-4">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <ShoppingCart className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {groupEmptyTitle ?? (hasActiveFilters ? t('No orders match your filters') : t('No orders yet'))}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {groupEmptyTitle
                  ? t('Try adjusting your search or filter criteria.')
                  : hasActiveFilters
                    ? t('Try adjusting your search or filter criteria.')
                    : t('Orders will appear here after the first purchase. Make sure your store is published and shared.')
                }
              </p>
              {hasActiveFilters ? (
                <Button variant="outline" className="mt-4 gap-2" onClick={clearFilters}>
                  <X className="h-4 w-4" /> {t('Clear Filters')}
                </Button>
              ) : (
                <Button variant="outline" className="mt-4 gap-2" onClick={() => window.open((usePage().props as any).storeUrl || '/', '_blank')}>
                  <Package className="h-4 w-4" /> {t('View Store')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {pagination && pagination.last_page > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground ltr-num">
              {t('Page')} {pagination.current_page} {t('of')} {pagination.last_page}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current_page <= 1}
                onClick={() => goToPage(pagination.current_page - 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(pagination.last_page, 7) }, (_, i) => {
                let pageNum: number;
                if (pagination.last_page <= 7) {
                  pageNum = i + 1;
                } else if (pagination.current_page <= 4) {
                  pageNum = i + 1;
                } else if (pagination.current_page >= pagination.last_page - 3) {
                  pageNum = pagination.last_page - 6 + i;
                } else {
                  pageNum = pagination.current_page - 3 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.current_page ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0 ltr-num text-xs"
                    onClick={() => goToPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.current_page >= pagination.last_page}
                onClick={() => goToPage(pagination.current_page + 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {orderToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">{t('Delete Order')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('Are you sure you want to delete this order? This action cannot be undone.')}
            </p>
            <div className="flex justify-end gap-2">
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

      {/* Bulk action confirmation dialog */}
      {bulkAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" role="dialog" aria-modal="true" aria-label={activeBulkAction?.label}>
            <h3 className="text-lg font-semibold mb-2">{activeBulkAction?.label}</h3>
            <p className="text-sm text-gray-600 mb-4">
              سيتم نقل {selectedIds.length} طلب إلى حالة «{activeBulkAction ? (BULK_TARGET_LABELS[activeBulkAction.target] ?? activeBulkAction.target) : ''}». الطلبات غير المؤهلة لهذا الإجراء سيتم تخطيها تلقائياً مع عرض السبب.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkAction(null)} disabled={bulkLoading}>
                {t('Cancel')}
              </Button>
              <Button variant="default" onClick={submitBulk} disabled={bulkLoading}>
                {bulkLoading && <Loader2 className="h-4 w-4 animate-spin me-1" />}
                تأكيد التحديث
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk results dialog — surfaces per-order partial failures */}
      {bulkResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" role="dialog" aria-modal="true" aria-label={t('Bulk update results')}>
            <h3 className="text-lg font-semibold mb-2">نتيجة التحديث الجماعي</h3>
            <p className="text-sm text-gray-600 mb-4 ltr-num">
              تم تحديث {bulkResult.summary.succeeded} من أصل {bulkResult.summary.total} طلب
            </p>
            {bulkResult.failed.length > 0 ? (
              <ul className="space-y-2 mb-4">
                {bulkResult.failed.map((f) => (
                  <li key={f.order_id} className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
                    <span className="font-semibold">{f.order_number || `#${f.order_id}`}</span>
                    {' — '}
                    {f.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-emerald-600 mb-4">تم تحديث جميع الطلبات المحددة بنجاح.</p>
            )}
            <div className="flex justify-end">
              <Button variant="default" onClick={() => setBulkResult(null)}>
                {t('Close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}
