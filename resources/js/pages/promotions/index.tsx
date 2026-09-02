import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Plus, Percent, Banknote, Truck, Gift, Layers, Edit, Trash2, Copy, Search, RotateCcw, BarChart3, CopyPlus } from 'lucide-react';
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

type PromotionStatus = 'active' | 'scheduled' | 'expired' | 'disabled';

const STATUS_BADGE: Record<PromotionStatus, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; labelKey: string }> = {
  active: { variant: 'default', labelKey: 'Active' },
  scheduled: { variant: 'outline', labelKey: 'Scheduled' },
  expired: { variant: 'outline', labelKey: 'Expired' },
  disabled: { variant: 'secondary', labelKey: 'Disabled' },
};

const STATUS_SWITCH_VALUE: Record<string, boolean> = {
  active: true,
  scheduled: true,
  disabled: false,
};

export default function PromotionsIndex() {
  const { t } = useTranslation();
  const { promotions = { data: [] }, filters = {}, overall = {}, auth } = usePage().props as any;
  const [promotionToDelete, setPromotionToDelete] = useState<number | null>(null);
  const [promotionToDuplicate, setPromotionToDuplicate] = useState<number | null>(null);
  const [search, setSearch] = useState(filters.search || '');
  const [status, setStatus] = useState(filters.status || 'all');
  const [perPage, setPerPage] = useState(filters.per_page || 10);

  const applyFilters = (newParams: any = {}) => {
    router.get(route('promotions.index'), {
      search: newParams.search !== undefined ? newParams.search : search,
      status: newParams.status !== undefined ? newParams.status : status,
      per_page: newParams.per_page !== undefined ? newParams.per_page : perPage,
    }, { preserveState: true, replace: true });
  };

  const handleActionClick = (action: string, permission: string, promotionId?: number) => {
    if (!checkPermission(permission, auth)) return;

    switch (action) {
      case 'edit':
        router.visit(route('promotions.edit', promotionId));
        break;
      case 'analytics':
        router.visit(route('promotions.analytics', promotionId));
        break;
      case 'delete':
        setPromotionToDelete(promotionId!);
        break;
      case 'duplicate':
        setPromotionToDuplicate(promotionId!);
        break;
      case 'create':
        router.visit(route('promotions.create'));
        break;
      case 'toggle-status':
        router.post(route('promotions.toggle-status', promotionId), {}, { preserveScroll: true });
        break;
    }
  };

  const openCreate = () => handleActionClick('create', 'create-advanced-coupons');

  const filtersActive = !!(search || status !== 'all' || Number(perPage) !== 10);

  const resetFilters = () => {
    setSearch('');
    setStatus('all');
    setPerPage(10);
    router.get(route('promotions.index'), {}, { preserveState: true, replace: true });
  };

  const handleDelete = () => {
    if (promotionToDelete && checkPermission('delete-advanced-coupons', auth)) {
      router.delete(route('promotions.destroy', promotionToDelete), { preserveScroll: true });
      setPromotionToDelete(null);
    }
  };

  const handleDuplicate = () => {
    if (promotionToDuplicate) {
      router.post(route('promotions.duplicate', promotionToDuplicate), {}, { preserveScroll: true });
      setPromotionToDuplicate(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t('Promotion code copied to clipboard'));
  };

  const formatDiscount = (promotion: any) => {
    switch (promotion.discount_type) {
      case 'percentage':
        return `${promotion.discount_value}%`;
      case 'fixed':
        return formatCurrency(promotion.discount_value);
      case 'free_shipping':
        return t('Free Shipping');
      case 'buy_one_get_one':
        return 'BOGO';
      case 'quantity':
        return t('Quantity Tiers');
      default:
        return '';
    }
  };

  const pageActions = [
    ...(hasPermission('manage-advanced-coupons') || hasPermission('create-advanced-coupons') ? [{
      label: t('Create Promotion'),
      icon: <Plus className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: openCreate
    }] : [])
  ];

  const statCards = [
    { label: t('Total Promotions'), value: overall?.total_promotions ?? 0, icon: Percent, color: 'bg-blue-100 text-blue-600' },
    { label: t('Active Promotions'), value: overall?.active ?? 0, icon: Layers, color: 'bg-emerald-100 text-emerald-600' },
    { label: t('Scheduled Promotions'), value: overall?.scheduled ?? 0, icon: BarChart3, color: 'bg-purple-100 text-purple-600' },
    { label: t('Expired Promotions'), value: overall?.expired ?? 0, icon: Gift, color: 'bg-amber-100 text-amber-600' },
  ];

  return (
    <PageTemplate
      title={t('Promotions')}
      description={t('Create powerful promotional campaigns with smart discount rules')}
      url="/promotions"
      actions={pageActions}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Promotions') }
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
                  placeholder={t('Search promotions...')}
                  aria-label={t('Search promotions...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyFilters({ search }); }}
                />
              </div>
              <Select value={status} onValueChange={(v) => { setStatus(v); applyFilters({ status: v }); }}>
                <SelectTrigger className="w-40" aria-label={t('Status')}>
                  <SelectValue placeholder={t('All Statuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Statuses')}</SelectItem>
                  <SelectItem value="active">{t('Active')}</SelectItem>
                  <SelectItem value="scheduled">{t('Scheduled')}</SelectItem>
                  <SelectItem value="expired">{t('Expired')}</SelectItem>
                  <SelectItem value="disabled">{t('Disabled')}</SelectItem>
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

        {/* Promotions List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Promotions List')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!promotions || !promotions.data || promotions.data.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-2 text-muted-foreground">{t('No promotions found')}</p>
                  {hasPermission('create-advanced-coupons') && (
                    <Button variant="outline" className="mt-4" onClick={openCreate}>
                      <Plus className="h-4 w-4 me-2" />
                      {t('Create your first promotion')}
                    </Button>
                  )}
                </div>
              ) : (
                promotions.data.map((promotion: any) => {
                  const badge =
                    STATUS_BADGE[(promotion.status as PromotionStatus) || 'disabled'] || STATUS_BADGE.disabled;
                  const analytics = promotion.analytics || {};
                  const isAuto = promotion.code_type === 'auto';
                  return (
                    <div key={promotion.id} className="flex flex-wrap items-center justify-between gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {promotion.discount_type === 'percentage' && <Percent className="h-6 w-6 text-primary" />}
                          {promotion.discount_type === 'fixed' && <Banknote className="h-6 w-6 text-primary" />}
                          {promotion.discount_type === 'free_shipping' && <Truck className="h-6 w-6 text-primary" />}
                          {promotion.discount_type === 'buy_one_get_one' && <Gift className="h-6 w-6 text-primary" />}
                          {promotion.discount_type === 'quantity' && <Layers className="h-6 w-6 text-primary" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold truncate">{promotion.name}</h3>
                            <Badge variant={badge.variant}>{t(badge.labelKey)}</Badge>
                            {promotion.first_order_only && (
                              <Badge variant="outline">{t('First Order')}</Badge>
                            )}
                            {promotion.stackable && (
                              <Badge variant="secondary">{t('Stackable')}</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {isAuto ? (
                              <Badge variant="outline">{t('Auto Apply')}</Badge>
                            ) : (
                              <>
                                <code className="text-sm bg-muted px-2 py-0.5 rounded">{promotion.code}</code>
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyCode(promotion.code)}>
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            <span className="text-xs font-medium text-primary">
                              {formatDiscount(promotion)}
                            </span>
                            {promotion.max_discount_amount != null && (
                              <span className="text-xs text-muted-foreground">
                                {t('Max')}: {formatCurrency(promotion.max_discount_amount)}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {typeof analytics.uses === 'number' && (
                              <span>{t('Uses')}: {analytics.uses}</span>
                            )}
                            {typeof analytics.total_discount_granted === 'number' && (
                              <span>{t('Discounted')}: {formatCurrency(analytics.total_discount_granted)}</span>
                            )}
                            {promotion.minimum_order_amount > 0 && (
                              <span>{t('Min order')}: {formatCurrency(promotion.minimum_order_amount)}</span>
                            )}
                            {promotion.used_count > 0 && !isAuto && (
                              <span>{t('Used')}: {promotion.used_count}</span>
                            )}
                            {promotion.expires_at && (
                              <span className={new Date(promotion.expires_at) < new Date() ? 'text-red-600 font-medium' : ''}>
                                {t('Expires')}: {new Date(promotion.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPermission('manage-advanced-coupons') && (
                          <Button variant="ghost" size="sm" onClick={() => handleActionClick('analytics', 'manage-advanced-coupons', promotion.id)} aria-label={t('Analytics')}>
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission('edit-advanced-coupons') && (
                          <Button variant="ghost" size="sm" onClick={() => handleActionClick('edit', 'edit-advanced-coupons', promotion.id)} aria-label={t('Edit')}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission('manage-advanced-coupons') && (
                          <Button variant="ghost" size="sm" onClick={() => handleActionClick('duplicate', 'manage-advanced-coupons', promotion.id)} aria-label={t('Duplicate')}>
                            <CopyPlus className="h-4 w-4" />
                          </Button>
                        )}
                        {hasPermission('manage-advanced-coupons') && promotion.status === 'active' && (
                          <Switch
                            checked={!!STATUS_SWITCH_VALUE[promotion.status]}
                            onCheckedChange={() => handleActionClick('toggle-status', 'manage-advanced-coupons', promotion.id)}
                          />
                        )}
                        {hasPermission('delete-advanced-coupons') && (
                          <Button variant="ghost" size="sm" onClick={() => handleActionClick('delete', 'delete-advanced-coupons', promotion.id)} aria-label={t('Delete')}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!promotionToDelete} onOpenChange={(open) => !open && setPromotionToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete Promotion')}</DialogTitle>
            {promotionToDelete && (
              <DialogDescription>
                {t('Are you sure you want to delete this promotion? This action cannot be undone.')}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromotionToDelete(null)}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Confirmation Dialog */}
      <Dialog open={!!promotionToDuplicate} onOpenChange={(open) => !open && setPromotionToDuplicate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Duplicate Promotion')}</DialogTitle>
            <DialogDescription>
              {t('Create a copy of this promotion with all of its settings and rules?')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromotionToDuplicate(null)}>
              {t('Cancel')}
            </Button>
            <Button variant="default" onClick={handleDuplicate}>
              <CopyPlus className="h-4 w-4 me-2" />
              {t('Duplicate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}