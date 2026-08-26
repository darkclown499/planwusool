import React, { useState, useCallback } from 'react';
import { PageTemplate } from '@/components/page-template';
import { ShoppingCart, Eye, Edit, Trash2, Package, Download, Search, X, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';
import { tOrderStatus, tPaymentMethod, tPaymentStatus } from '@/utils/order-status';

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
}

const STATUS_TABS = [
  { key: '', label: 'الكل' },
  { key: 'pending', label: 'جديد' },
  { key: 'confirmed', label: 'مؤكد' },
  { key: 'processing', label: 'قيد التجهيز' },
  { key: 'shipped', label: 'تم الشحن' },
  { key: 'delivered', label: 'مكتمل' },
  { key: 'cancelled', label: 'ملغي' },
];

export default function Orders({ orders = [], pagination, filters: initialFilters, stats }: OrdersProps) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [search, setSearch] = useState(initialFilters?.search || '');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FiltersData>({
    search: initialFilters?.search || '',
    status: initialFilters?.status || '',
    payment_status: initialFilters?.payment_status || '',
    payment_method: initialFilters?.payment_method || '',
    source: initialFilters?.source || '',
    date_from: initialFilters?.date_from || '',
    date_to: initialFilters?.date_to || '',
  });

  const applyFilters = useCallback((newFilters: Partial<FiltersData>) => {
    const merged = { ...activeFilters, ...newFilters };
    setActiveFilters(merged);
    const params: Record<string, string> = {};
    Object.entries(merged).forEach(([k, v]) => { if (v) params[k] = v; });
    params.per_page = '15';
    router.get(route('orders.index'), params, { preserveState: true, replace: true });
  }, [activeFilters]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setActiveFilters({ search: '', status: '', payment_status: '', payment_method: '', source: '', date_from: '', date_to: '' });
    router.get(route('orders.index'), {}, { preserveState: true, replace: true });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search });
  };

  const goToPage = (page: number) => {
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

          <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => applyFilters({ status: 'pending' })}>
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

          {/* Status tabs — horizontal scroll on mobile */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            {STATUS_TABS.map((tab) => {
              const isActive = activeFilters.status === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => applyFilters({ status: tab.key })}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
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

        {/* Orders List */}
        <div className="space-y-2">
          {orders.length > 0 ? orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between gap-3 p-3 sm:p-4 border rounded-xl hover:bg-slate-50/50 transition-colors cursor-pointer"
              onClick={() => handleActionClick('view', 'view-orders', order.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm sm:text-base">{order.orderNumber}</h3>
                    <Badge variant={getStatusVariant(order.status) as any} className="text-[10px] sm:text-xs">
                      {tOrderStatus(order.status)}
                    </Badge>
                    {order.order_source === 'whatsapp' && (
                      <span className="inline-flex items-center gap-0.5 bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                        <MessageCircle className="h-2.5 w-2.5" /> واتساب
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{order.customer}</p>
                  <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                    <span className="text-xs font-bold ltr-num">{formatCurrency(order.total)}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{order.items} {t('items')}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{order.date}</span>
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
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {hasPermission('view-orders') && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleActionClick('view', 'view-orders', order.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {hasPermission('edit-orders') && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleActionClick('edit', 'edit-orders', order.id)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {hasPermission('delete-orders') && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleActionClick('delete', 'delete-orders', order.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )) : (
            <Card>
              <CardContent className="text-center py-12 px-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {hasActiveFilters ? t('No orders match your filters') : t('No orders yet')}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {hasActiveFilters
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
        </div>

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
            <div className="flex justify-end space-x-2">
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
    </PageTemplate>
  );
}
