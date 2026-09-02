import React, { useState, useCallback } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Plus, Download, Users, Eye, Edit, Trash2, Mail, Phone, Search, X, ChevronLeft, ChevronRight, MessageCircle, Repeat, ShoppingBag, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { getImageUrl } from '@/utils/image-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';
import { formatCurrency } from '@/utils/currency-helper';

interface PaginationData {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface FiltersData {
  search: string;
  filter: string;
  per_page: number;
  dormant_days: number;
}

interface CustomerRow {
  id: number | null;
  ref: string;
  token: string;
  kind: 'registered' | 'guest';
  full_name: string;
  email?: string | null;
  phone?: string | null;
  phone_e164?: string | null;
  whatsapp_url?: string | null;
  call_url?: string | null;
  is_active?: boolean | null;
  customer_group?: string;
  orders_count: number;
  valid_count: number;
  cancelled_count: number;
  totals: { currency: string; total: number; count: number }[];
  is_repeat: boolean;
  first_order_at?: string | null;
  last_order_at?: string | null;
  created_at?: string | null;
  tags: string[];
}

const FILTER_TABS = [
  { key: 'all', label: 'كل العملاء' },
  { key: 'repeat', label: 'عملاء متكررون' },
  { key: 'single', label: 'طلب واحد' },
  { key: 'dormant', label: 'لم يطلبوا منذ فترة' },
  { key: 'cancelled', label: 'لديها طلبات ملغاة' },
  { key: 'vip', label: 'VIP' },
];

export default function Customers() {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  const props = usePage().props as any;
  const customers = (props.customers ?? []) as CustomerRow[];
  const stats = props.stats ?? {};
  const pagination = props.pagination as PaginationData | undefined;
  const filters = props.filters as FiltersData | undefined;

  const [search, setSearch] = useState(filters?.search || '');
  const [activeFilter, setActiveFilter] = useState(filters?.filter || 'all');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);

  const go = useCallback((params: Record<string, string>) => {
    router.get(route('customers.index'), params, { preserveState: true, replace: true });
  }, []);

  const applyFilter = (key: string) => {
    setActiveFilter(key);
    const p: Record<string, string> = { filter: key };
    if (search) p.search = search;
    go(p);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p: Record<string, string> = {};
    if (search) p.search = search;
    if (activeFilter !== 'all') p.filter = activeFilter;
    go(p);
  };

  const clearFilters = () => {
    setSearch('');
    setActiveFilter('all');
    go({});
  };

  const goToPage = (page: number) => {
    const p: Record<string, string> = { page: String(page) };
    if (search) p.search = search;
    if (activeFilter !== 'all') p.filter = activeFilter;
    go(p);
  };

  const handleActionClick = (action: string, callback: () => void) => {
    if (checkPermission(action, auth)) callback();
  };

  const openProfile = (row: CustomerRow) => {
    router.visit(route('customers.profile', row.token));
  };

  const handleDelete = (row: CustomerRow) => {
    if (row.id == null) return;
    setSelectedCustomer(row);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedCustomer?.id) return;
    router.delete(route('customers.destroy', selectedCustomer.id), {
      onSuccess: () => setIsDeleteDialogOpen(false),
    });
  };

  const pageActions = [
    ...(hasPermission('export-customers') ? [{
      label: t('Export Customers'),
      icon: <Download className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => handleActionClick('export-customers', () => window.open(route('customers.export'), '_blank'))
    }] : []),
    ...(hasPermission('create-customers') ? [{
      label: t('Create Customer'),
      icon: <Plus className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => handleActionClick('create-customers', () => router.visit(route('customers.create')))
    }] : [])
  ];

  const totalsLabel = (row: CustomerRow) => {
    if (!row.totals || row.totals.length === 0) return null;
    return row.totals
      .map((g) => {
        const formatted = formatCurrency(g.total);
        // formatCurrency ignores raw currency code; append it when it is not the store default to avoid confusion.
        return isDefaultCurrency(g.currency) ? formatted : `${g.currency} ${g.total.toLocaleString()}`;
      })
      .join(' · ');
  };

  const isDefaultCurrency = (code: string) => {
    const storeCurrency = (props as any).storeCurrency || {};
    return (storeCurrency.code || storeCurrency.currency || 'ILS') === code;
  };

  const timeAgo = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days <= 0) return 'اليوم';
    if (days === 1) return 'قبل يوم';
    return `قبل ${days} يوم`;
  };

  return (
    <>
      <PageTemplate
        title={t('Customer Management')}
        url="/customers"
        actions={pageActions}
        breadcrumbs={[
          { title: t('Dashboard'), href: route('dashboard') },
          { title: t('Customer Management') }
        ]}
      >
        <div className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader dir="rtl" className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('Total Customers')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-start ltr-num">{stats.totalCustomers ?? 0}</div>
                <p className="text-xs text-muted-foreground text-start">{t('no new note') || 'يشمل زبائن المسجلين والضيوف'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader dir="rtl" className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('Repeat Customers')/* عملاء متكررون */}</CardTitle>
                <Repeat className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-start ltr-num">{stats.repeatCustomers ?? 0}</div>
                <p className="text-xs text-muted-foreground text-start">{t('total customers') || 'بطلب صالح واحد أو أكثر'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader dir="rtl" className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('New This Month')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-start ltr-num">{stats.newThisMonth ?? 0}</div>
                <p className="text-xs text-muted-foreground text-start">{t('buyers with recent orders') || 'زبائن لديهم طلبات حديثة'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader dir="rtl" className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('With Cancelled Orders')/* لديها ملغي */}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-start ltr-num">{stats.hasCancelled ?? 0}</div>
                <p className="text-xs text-muted-foreground text-start">{t('total order value') || 'زبائن لديهم طلبات ملغاة'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search + Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-3">
                <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      dir="rtl"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ابحث بالاسم، الهاتف، أو البريد الإلكتروني..."
                      className="ps-9"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" variant="default">
                      <Search className="h-4 w-4 me-1" />
                      بحث
                    </Button>
                    {(search || activeFilter !== 'all') && (
                      <Button type="button" variant="outline" onClick={clearFilters}>
                        <X className="h-4 w-4 me-1" />
                        مسح
                      </Button>
                    )}
                  </div>
                </form>
                <div dir="rtl" className="flex flex-wrap gap-2">
                  {FILTER_TABS.map((tab) => (
                    <Button
                      key={tab.key}
                      type="button"
                      size="sm"
                      variant={activeFilter === tab.key ? 'default' : 'outline'}
                      onClick={() => applyFilter(tab.key)}
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customers list */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Customer Directory')}</CardTitle>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50">
                    <Users className="h-8 w-8 text-violet-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">لا يوجد عملاء بعد</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    سيظهر عملاؤك هنا بعد أول عملية شراء. يمكنك أيضاً إضافة عميل يدوياً لبدء إدارة قاعدة العملاء.
                  </p>
                  {hasPermission('create-customers') && (
                    <Button
                      onClick={() => handleActionClick('create-customers', () => router.visit(route('customers.create')))}
                      className="mt-6 gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      إضافة أول عميل
                    </Button>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">تلميح: العملاء يضافون تلقائياً عند إتمام الطلبات</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-start text-muted-foreground">
                          <th className="py-2 pe-4 text-start font-medium">الزبون</th>
                          <th className="py-2 pe-4 text-start font-medium">طلبات</th>
                          <th className="py-2 pe-4 text-start font-medium">القيمة</th>
                          <th className="py-2 pe-4 text-start font-medium">آخر طلب</th>
                          <th className="py-2 pe-4 text-start font-medium">الوسوم</th>
                          <th className="py-2 text-end font-medium">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customers.map((customer) => (
                          <tr key={customer.ref} className="border-b last:border-0">
                            <td className="py-3 pe-4">
                              <button onClick={() => openProfile(customer)} className="flex items-center gap-3 text-start hover:opacity-80">
                                <Avatar className="h-9 w-9 shrink-0">
                                  <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
                                    {customer.full_name ? customer.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('') : '-'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{customer.full_name || 'زبون ضيف'}</span>
                                    {customer.is_repeat && <Badge variant="default" className="text-[10px]">متكرر</Badge>}
                                    {customer.kind === 'guest' && <Badge variant="outline" className="text-[10px]">ضيف</Badge>}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                    {customer.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>}
                                    {!customer.phone && customer.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{customer.email}</span>}
                                  </div>
                                </div>
                              </button>
                            </td>
                            <td className="py-3 pe-4">
                              <span className="ltr-num">{customer.orders_count}</span>
                              {customer.cancelled_count > 0 && (
                                <span className="text-xs text-destructive ms-1">({customer.cancelled_count} ملغي)</span>
                              )}
                            </td>
                            <td className="py-3 pe-4 text-start">
                              {totalsLabel(customer) || '—'}
                            </td>
                            <td className="py-3 pe-4 text-start">
                              <span className="text-muted-foreground text-xs">{timeAgo(customer.last_order_at) ?? 'لم يطلب'}</span>
                            </td>
                            <td className="py-3 pe-4">
                              <div className="flex flex-wrap gap-1">
                                {customer.tags.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">—</span>
                                ) : (
                                  customer.tags.slice(0, 2).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center justify-end gap-1 flex-wrap">
                                {customer.whatsapp_url && (
                                  <a href={customer.whatsapp_url} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-green-50 text-green-600" title="تواصل عبر واتساب">
                                    <MessageCircle className="h-4 w-4" />
                                  </a>
                                )}
                                {hasPermission('view-customers') && (
                                  <Button variant="ghost" size="sm" onClick={() => openProfile(customer)} className="h-8 px-2"><Eye className="h-4 w-4" /></Button>
                                )}
                                {hasPermission('edit-customers') && customer.id != null && (
                                  <Button variant="ghost" size="sm" onClick={() => handleActionClick('edit-customers', () => router.visit(route('customers.edit', customer.id as number)))} className="h-8 px-2"><Edit className="h-4 w-4" /></Button>
                                )}
                                {hasPermission('delete-customers') && customer.id != null && (
                                  <Button variant="ghost" size="sm" onClick={() => handleDelete(customer)} className="h-8 px-2 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {customers.map((customer) => (
                      <button
                        key={customer.ref}
                        onClick={() => openProfile(customer)}
                        className="block w-full text-start p-4 border rounded-lg bg-card hover:bg-accent"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
                                {customer.full_name ? customer.full_name.split(' ').map((p) => p[0]).slice(0, 2).join('') : '-'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold truncate">{customer.full_name || 'زبون ضيف'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {customer.phone ? (
                                  <span className="inline-flex items-center gap-1" dir="ltr">{customer.phone}</span>
                                ) : customer.email ? (
                                  <span className="truncate">{customer.email}</span>
                                ) : (
                                  <span>لا يوجد رقم</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {customer.whatsapp_url && (
                            <a href={customer.whatsapp_url} target="_blank" rel="noreferrer"
                               onClick={(e) => e.stopPropagation()}
                               className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700">
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" /><span className="ltr-num">{customer.orders_count}</span> طلب</span>
                          <span>{totalsLabel(customer) || '—'}</span>
                          <span className="inline-flex items-center gap-1">آخر: {timeAgo(customer.last_order_at) ?? 'لم يطلب'}</span>
                        </div>
                        {(customer.is_repeat || customer.cancelled_count > 0 || customer.tags.length > 0) && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {customer.is_repeat && <Badge variant="default" className="text-[10px]">متكرر</Badge>}
                            {customer.cancelled_count > 0 && <Badge variant="destructive" className="text-[10px]">{customer.cancelled_count} ملغي</Badge>}
                            {customer.tags.slice(0, 2).map((tag) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.last_page > 1 && (
                    <div dir="rtl" className="flex items-center justify-between gap-2 border-t pt-4">
                      <span className="text-xs text-muted-foreground ltr-num">
                        {pagination.total} زبون · صفحة {pagination.current_page} من {pagination.last_page}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" disabled={pagination.current_page <= 1}
                          onClick={() => pagination.current_page > 1 && goToPage(pagination.current_page - 1)}>
                          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
                        </Button>
                        <Button variant="outline" size="sm" disabled={pagination.current_page >= pagination.last_page}
                          onClick={() => pagination.current_page < pagination.last_page && goToPage(pagination.current_page + 1)}>
                          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTemplate>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete Customer')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>{t('Are you sure you want to delete the customer "{{name}}"?', { name: selectedCustomer?.full_name })}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {t('This action cannot be undone.')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">سيتم إخفاء بياناته الشخصية والاحتفاظ بسجل الطلبات.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>{t('Cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>{t('Delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}