import React, { useMemo, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
  Banknote,
  CircleCheckBig,
  Copy,
  Download,
  Edit,
  Eye,
  Percent,
  Plus,
  Search,
  Tag,
  Ticket,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { Switch } from '@/components/ui/switch';
import { hasPermission, checkPermission } from '@/utils/permissions';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'active' | 'expired' | 'disabled';
type TypeFilter = 'all' | 'percentage' | 'flat';

export default function CouponSystem() {
  const { t } = useTranslation();
  const { coupons = { data: [] }, stats = { total: 0, active: 0, percentage: 0, flat: 0 }, auth } = usePage().props as any;
  const [couponToDelete, setCouponToDelete] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const allCoupons = useMemo(() => coupons?.data ?? [], [coupons]);

  const handleActionClick = (action: string, permission: string, couponId?: number) => {
    if (!checkPermission(permission, auth)) {
      return;
    }

    switch (action) {
      case 'view':
        router.visit(route('coupon-system.show', couponId));
        break;
      case 'edit':
        router.visit(route('coupon-system.edit', couponId));
        break;
      case 'delete':
        setCouponToDelete(couponId!);
        break;
      case 'create':
        router.visit(route('coupon-system.create'));
        break;
      case 'export':
        window.open(route('coupon-system.export'), '_blank');
        break;
      case 'toggle-status':
        handleToggleStatus(couponId!);
        break;
    }
  };

  const openCreate = () => handleActionClick('create', 'create-coupon-system');

  const handleToggleStatus = (couponId: number) => {
    router.post(route('store-coupons.toggle-status', couponId), {}, {
      preserveScroll: true,
      onSuccess: () => {
        // Flash message will be handled by setupFlashMessages in app.tsx
      }
    });
  };

  const handleDelete = () => {
    if (couponToDelete && checkPermission('delete-coupon-system', auth)) {
      router.delete(route('store-coupons.destroy', couponToDelete));
      setCouponToDelete(null);
    }
  };

  const filteredCoupons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();
    return allCoupons.filter((coupon: any) => {
      const matchesSearch =
        !q ||
        (coupon.code && coupon.code.toLowerCase().includes(q)) ||
        (coupon.name && coupon.name.toLowerCase().includes(q));
      const expired = !!(coupon.expiry_date && new Date(coupon.expiry_date).getTime() < now);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !!coupon.status && !expired) ||
        (statusFilter === 'expired' && expired) ||
        (statusFilter === 'disabled' && !coupon.status);
      const matchesType = typeFilter === 'all' || coupon.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [allCoupons, searchQuery, statusFilter, typeFilter]);

  const pageActions = [
    ...(hasPermission('export-coupon-system') ? [{
      label: t('Export'),
      icon: <Download className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => handleActionClick('export', 'export-coupon-system')
    }] : []),
    ...(hasPermission('create-coupon-system') ? [{
      label: t('Create Coupon'),
      icon: <Plus className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: openCreate
    }] : [])
  ];

  const statCards = [
    { key: 'total', label: t('Total Coupons'), value: stats.total || 0, sub: t('All coupons'), icon: <Ticket className="h-4 w-4 text-muted-foreground" /> },
    { key: 'active', label: t('Active Coupons'), value: stats.active || 0, sub: `${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% ${t('active rate')}`, icon: <CircleCheckBig className="h-4 w-4 text-muted-foreground" /> },
    { key: 'percentage', label: t('Percentage Coupons'), value: stats.percentage || 0, sub: t('Discount percentage'), icon: <Percent className="h-4 w-4 text-muted-foreground" /> },
    { key: 'flat', label: t('Fixed Amount Coupons'), value: stats.flat || 0, sub: t('Fixed discount'), icon: <Banknote className="h-4 w-4 text-muted-foreground" /> },
  ];

  return (
    <PageTemplate
      title={t('Coupon System')}
      description={t('Manage your store coupons and discounts')}
      url="/coupon-system"
      actions={pageActions}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Coupon System') }
      ]}
    >
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                {card.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coupons List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Coupons List')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search & Filter Toolbar */}
              {allCoupons.length > 0 && (
                <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('Search by coupon code')}
                      className="ps-9 w-full"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('All Statuses')}</SelectItem>
                        <SelectItem value="active">{t('Active')}</SelectItem>
                        <SelectItem value="expired">{t('Expired')}</SelectItem>
                        <SelectItem value="disabled">{t('Disabled')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('All Types')}</SelectItem>
                        <SelectItem value="percentage">{t('Coupon Type Percentage')}</SelectItem>
                        <SelectItem value="flat">{t('Coupon Type Fixed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {allCoupons.length === 0 ? (
                <div className="text-center py-8">
                  <Tag className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-2 text-muted-foreground">{t('No coupons found')}</p>
                  {hasPermission('create-coupon-system') && (
                    <Button variant="outline" className="mt-4" onClick={openCreate}>
                      <Plus className="h-4 w-4 me-2" />
                      {t('Create your first coupon')}
                    </Button>
                  )}
                </div>
              ) : filteredCoupons.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-2 text-muted-foreground">{t('No coupons found')}</p>
                </div>
              ) : (
                filteredCoupons.map((coupon: any) => (
                  <div key={coupon.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        {coupon.type === 'percentage' ? (
                          <Percent className="h-6 w-6 text-primary" />
                        ) : (
                          <Banknote className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{coupon.name}</h3>
                          <Badge variant={coupon.status ? 'default' : 'secondary'}>
                            {coupon.status ? t('Active') : t('Inactive')}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded">{coupon.code}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(coupon.code);
                              toast.success(t('Coupon code copied to clipboard'));
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {coupon.type === 'percentage' ? t('Percentage') : t('Fixed')}:
                            {coupon.type === 'percentage' ? `${coupon.discount_amount}%` : formatCurrency(coupon.discount_amount)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {t('Used')}: {coupon.used_count}/{coupon.use_limit_per_coupon || t('Unlimited')}
                          </span>
                          {coupon.expiry_date && (
                            <span className="text-xs text-muted-foreground">
                              {t('Expires')}: {new Date(coupon.expiry_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {hasPermission('view-coupon-system') && (
                        <Button variant="ghost" size="sm" onClick={() => handleActionClick('view', 'view-coupon-system', coupon.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('edit-coupon-system') && (
                        <Button variant="ghost" size="sm" onClick={() => handleActionClick('edit', 'edit-coupon-system', coupon.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('toggle-status-coupon-system') && (
                        <div className="flex items-center space-x-2 me-2">
                          <Switch
                            checked={!!coupon.status}
                            onCheckedChange={() => handleActionClick('toggle-status', 'toggle-status-coupon-system', coupon.id)}
                          />
                        </div>
                      )}
                      {hasPermission('delete-coupon-system') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleActionClick('delete', 'delete-coupon-system', coupon.id)}
                        >
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
            <DialogTitle>{t('Delete Coupon')}</DialogTitle>
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