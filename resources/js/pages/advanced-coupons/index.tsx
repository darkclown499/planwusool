import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Plus, Download, Percent, Banknote, Truck, Gift, Sparkles, Edit, Trash2, Copy, Search, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';
import { toast } from 'sonner';

export default function AdvancedCoupons() {
  const { t } = useTranslation();
  const { coupons = { data: [] }, stats = { total: 0, active: 0, percentage: 0, fixed: 0, free_shipping: 0, bogo: 0 }, filters = {}, auth } = usePage().props as any;
  const [couponToDelete, setCouponToDelete] = useState<number | null>(null);
  const [search, setSearch] = useState(filters.search || '');
  const [discountType, setDiscountType] = useState(filters.discount_type || 'all');
  const [status, setStatus] = useState(filters.status || 'all');
  const [perPage, setPerPage] = useState(filters.per_page || 10);

  const applyFilters = (newParams: any = {}) => {
    router.get(route('advanced-coupons.index'), {
      search: newParams.search !== undefined ? newParams.search : search,
      discount_type: newParams.discount_type !== undefined ? newParams.discount_type : discountType,
      status: newParams.status !== undefined ? newParams.status : status,
      per_page: newParams.per_page !== undefined ? newParams.per_page : perPage,
    }, { preserveState: true, replace: true });
  };

  const handleActionClick = (action: string, permission: string, couponId?: number) => {
    if (!checkPermission(permission, auth)) return;

    switch (action) {
      case 'edit':
        router.visit(route('advanced-coupons.edit', couponId));
        break;
      case 'delete':
        setCouponToDelete(couponId!);
        break;
      case 'create':
        router.visit(route('advanced-coupons.create'));
        break;
      case 'export':
        window.open(route('advanced-coupons.export', { search, discount_type: discountType, status }), '_blank');
        break;
      case 'toggle-status':
        router.post(route('advanced-coupons.toggle-status', couponId), {}, { preserveScroll: true });
        break;
    }
  };

  const openCreate = () => handleActionClick('create', 'create-coupon-system');

  const filtersActive = !!(search || discountType !== 'all' || status !== 'all' || Number(perPage) !== 10);

  const resetFilters = () => {
    setSearch('');
    setDiscountType('all');
    setStatus('all');
    setPerPage(10);
    router.get(route('advanced-coupons.index'), {}, { preserveState: true, replace: true });
  };

  const handleDelete = () => {
    if (couponToDelete && checkPermission('delete-coupon-system', auth)) {
      router.delete(route('advanced-coupons.destroy', couponToDelete), { preserveScroll: true });
      setCouponToDelete(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t('Coupon code copied to clipboard'));
  };

  const formatDiscount = (coupon: any) => {
    switch (coupon.discount_type) {
      case 'percentage':
        return `${coupon.discount_value}%`;
      case 'fixed':
        return formatCurrency(coupon.discount_value);
      case 'free_shipping':
        return t('Free Shipping');
      case 'buy_one_get_one':
        return 'BOGO';
      default:
        return '';
    }
  };

  const pageActions = [
    ...(hasPermission('export-coupon-system') ? [{
      label: t('Export'),
      icon: <Download className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => handleActionClick('export', 'export-coupon-system')
    }] : []),
    ...(hasPermission('create-coupon-system') ? [{
      label: t('Create Advanced Coupon'),
      icon: <Plus className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: openCreate
    }] : [])
  ];

  const statCards = [
    { label: t('Total Coupons'), value: stats.total, icon: Percent, color: 'bg-blue-100 text-blue-600' },
    { label: t('Active Coupons'), value: stats.active, icon: Sparkles, color: 'bg-emerald-100 text-emerald-600' },
    { label: t('Percentage / Fixed'), value: (stats.percentage || 0) + (stats.fixed || 0), icon: Banknote, color: 'bg-purple-100 text-purple-600' },
    { label: t('Free Shipping / BOGO'), value: (stats.free_shipping || 0) + (stats.bogo || 0), icon: Gift, color: 'bg-amber-100 text-amber-600' },
  ];

  return (
    <PageTemplate
      title={t('Advanced Coupons')}
      description={t('Create powerful promotional campaigns with smart discount rules')}
      url="/advanced-coupons"
      actions={pageActions}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Advanced Coupons') }
      ]}
    >
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card, i) => (
            <Card key={i} className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <div className={`p-2 rounded-full ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{card.value || 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="ps-9 w-full sm:w-64"
                  placeholder={t('Search coupons...')}
                  aria-label={t('Search coupons...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyFilters({ search }); }}
                />
              </div>
              <Select value={discountType} onValueChange={(v) => { setDiscountType(v); applyFilters({ discount_type: v }); }}>
                <SelectTrigger className="w-44" aria-label={t('Discount Type')}>
                  <SelectValue placeholder={t('All Offer Types')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Offer Types')}</SelectItem>
                  <SelectItem value="percentage">{t('Percentage')}</SelectItem>
                  <SelectItem value="fixed">{t('Fixed Amount')}</SelectItem>
                  <SelectItem value="free_shipping">{t('Free Shipping')}</SelectItem>
                  <SelectItem value="buy_one_get_one">{t('Buy 1 Get 1')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => { setStatus(v); applyFilters({ status: v }); }}>
                <SelectTrigger className="w-36" aria-label={t('Status')}>
                  <SelectValue placeholder={t('All Offer Statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Offer Statuses')}</SelectItem>
                  <SelectItem value="active">{t('Active')}</SelectItem>
                  <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                  <SelectItem value="scheduled">{t('Scheduled')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); applyFilters({ per_page: v }); }}>
                <SelectTrigger className="w-32 gap-1" aria-label={t('Show')}>
                  <span className="text-xs text-muted-foreground">{t('Show')}:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              {filtersActive && (
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={resetFilters}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t('Reset Filters')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Coupons List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Advanced Coupons List')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!coupons || !coupons.data || coupons.data.length === 0 ? (
                filtersActive ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                    <p className="mt-2 text-muted-foreground">لا توجد كوبونات متقدمة تطابق البحث أو الفلاتر الحالية</p>
                    <Button variant="outline" className="mt-4" onClick={resetFilters}>
                      <RotateCcw className="h-4 w-4 me-2" />
                      {t('Reset Filters')}
                    </Button>
                  </div>
                ) : (
                <div className="text-center py-12">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-2 text-muted-foreground">{t('No advanced coupons found')}</p>
                  {hasPermission('create-coupon-system') && (
                    <Button variant="outline" className="mt-4" onClick={openCreate}>
                      <Plus className="h-4 w-4 me-2" />
                      {t('Create your first advanced coupon')}
                    </Button>
                  )}
                </div>
                )
              ) : (
                coupons.data.map((coupon: any) => (
                  <div key={coupon.id} className="flex flex-wrap items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {coupon.discount_type === 'percentage' && <Percent className="h-6 w-6 text-primary" />}
                        {coupon.discount_type === 'fixed' && <Banknote className="h-6 w-6 text-primary" />}
                        {coupon.discount_type === 'free_shipping' && <Truck className="h-6 w-6 text-primary" />}
                        {coupon.discount_type === 'buy_one_get_one' && <Gift className="h-6 w-6 text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold truncate">{coupon.name}</h3>
                          <Badge variant={coupon.status ? 'default' : 'secondary'}>
                            {coupon.status ? t('Active') : t('Inactive')}
                          </Badge>
                          {coupon.first_order_only && (
                            <Badge variant="outline">{t('First Order')}</Badge>
                          )}
                          {coupon.exclude_on_sale_items && (
                            <Badge variant="outline">{t('No Sale Items')}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">{coupon.code}</code>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyCode(coupon.code)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <span className="text-xs font-medium text-primary">
                            {formatDiscount(coupon)}
                          </span>
                          {coupon.max_discount_amount != null && (
                            <span className="text-xs text-muted-foreground">
                              {t('Max')}: {formatCurrency(coupon.max_discount_amount)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{t('Used')}: {coupon.used_count}/{coupon.usage_limit || t('∞')}</span>
                          {coupon.minimum_order_amount > 0 && (
                            <span>{t('Min order')}: {formatCurrency(coupon.minimum_order_amount)}</span>
                          )}
                          {coupon.products_count > 0 && (
                            <span>{coupon.products_count} {t('products')}</span>
                          )}
                          {coupon.categories_count > 0 && (
                            <span>{coupon.categories_count} {t('categories')}</span>
                          )}
                          {coupon.regions_count > 0 && (
                            <span>{coupon.regions_count} {t('regions')}</span>
                          )}
                          {coupon.expires_at && (
                            <span className={new Date(coupon.expires_at) < new Date() ? 'text-red-600 font-medium' : ''}>
                              {t('Expires')}: {new Date(coupon.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasPermission('edit-coupon-system') && (
                        <Button variant="ghost" size="sm" onClick={() => handleActionClick('edit', 'edit-coupon-system', coupon.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('toggle-status-coupon-system') && (
                        <Switch
                          checked={!!coupon.status}
                          onCheckedChange={() => handleActionClick('toggle-status', 'toggle-status-coupon-system', coupon.id)}
                        />
                      )}
                      {hasPermission('delete-coupon-system') && (
                        <Button variant="ghost" size="sm" onClick={() => handleActionClick('delete', 'delete-coupon-system', coupon.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!couponToDelete} onOpenChange={(open) => !open && setCouponToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete Advanced Coupon')}</DialogTitle>
            <DialogDescription>
              {t('Are you sure you want to delete this coupon? This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCouponToDelete(null)}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}

