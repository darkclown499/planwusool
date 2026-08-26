import React, { useState, useEffect, useMemo } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Plus, Download, Package, Eye, Edit, Trash2, AlertTriangle, Search, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from '@/components/ui/pagination';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { getImageUrl } from '@/utils/image-helper';
import { getProductThumbnail } from '@/utils/product-image-helper';
import { formatCurrency } from '@/utils/currency-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';
import UpgradeModal from '@/components/UpgradeModal';

export default function Products() {
  const { t } = useTranslation();
  const { products: paginatedProducts, stats, auth, planLimits, categories, lowStockThreshold, filters } = usePage().props as any;
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<'active' | 'inactive'>('active');

  const products: any[] = paginatedProducts?.data ?? [];

  const activeFilter = (filters || {}) as {
    search: string;
    category_id?: number | null;
    status?: string;
    sort: string;
    direction: string;
  };

  const [searchInput, setSearchInput] = useState(activeFilter.search ?? '');
  useEffect(() => {
    setSearchInput(activeFilter.search ?? '');
  }, [activeFilter?.search]);

  const applyFilters = (updates: Record<string, string | number | null> = {}) => {
    const next: Record<string, string | number | null> = {
      search: searchInput,
      category_id: String(activeFilter.category_id ?? '') || 'all',
      status: activeFilter.status ?? 'all',
      sort: activeFilter.sort ?? 'created_at',
      direction: activeFilter.direction ?? 'desc',
      ...updates,
    };
    const params: Record<string, string | number> = {
      sort: String(next.sort),
      direction: String(next.direction),
    };
    if (next.search) params.search = String(next.search);
    const cat = String(next.category_id);
    if (cat && cat !== 'all') params.category_id = Number(cat);
    const status = String(next.status);
    if (status && status !== 'all') params.status = status;

    router.get(route('products.index'), params, {
      preserveState: true,
      replace: true,
      preserveScroll: true,
    });
  };

  useEffect(() => {
    const id = setTimeout(() => {
      if ((searchInput ?? '') !== (activeFilter.search ?? '')) {
        applyFilters({ search: searchInput });
      }
    }, 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const toggleSort = (field: string) => {
    const same = activeFilter.sort === field;
    applyFilters({
      sort: field,
      direction: same && activeFilter.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const SortIcon = ({ column }: { column: string }) => {
    const isActive = activeFilter.sort === column;
    if (!isActive) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />;
    return activeFilter.direction === 'asc'
      ? <ArrowUp className="h-3 w-3 text-foreground" />
      : <ArrowDown className="h-3 w-3 text-foreground" />;
  };

  const handleActionClick = (action: string, permission: string, productId?: number) => {
    if (!checkPermission(permission, auth)) return;
    switch (action) {
      case 'view': router.visit(route('products.show', productId)); break;
      case 'edit': router.visit(route('products.edit', productId)); break;
      case 'delete': setProductToDelete(productId!); break;
      case 'create':
        if (planLimits && !planLimits.can_create) {
          setShowUpgrade(true);
          return;
        }
        router.visit(route('products.create'));
        break;
      case 'export': window.open(route('products.export'), '_blank'); break;
      default: break;
    }
  };

  const handleDelete = () => {
    if (productToDelete && checkPermission('delete-products', auth)) {
      router.delete(route('products.destroy', productToDelete));
      setProductToDelete(null);
    }
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    if (!checkPermission('delete-products', auth)) return;
    router.delete(route('products.bulk-destroy'), { data: { ids: Array.from(selected) }, preserveScroll: true });
    setSelected(new Set());
  };

  const handleBulkStatus = () => {
    if (selected.size === 0) return;
    if (!checkPermission('edit-products', auth)) return;
    router.post(route('products.bulk-status'), { ids: Array.from(selected), status: bulkStatus }, { preserveScroll: true });
    setSelected(new Set());
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (!products.length) return;
    if (selected.size === products.length) setSelected(new Set());
    else setSelected(new Set(products.map((p) => p.id)));
  };

  const pageActions = [
    ...(hasPermission('export-products') ? [{
      label: t('Export'),
      icon: <Download className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => handleActionClick('export', 'export-products'),
    }] : []),
    ...(hasPermission('create-products') ? [{
      label: t('Create Product'),
      icon: <Plus className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => handleActionClick('create', 'create-products'),
    }] : []),
  ];

  const selectedTotal = useMemo(() => selected.size, [selected.size]);

  return (
    <PageTemplate
      title={t('Products')}
      url="/products"
      actions={pageActions}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Product Management'), href: route('products.index') },
        { title: t('Products') },
      ]}
    >
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} limitType="resource" current={planLimits?.current_products} max={planLimits?.max_products} />

      <div className="space-y-4">
        {planLimits && !planLimits.can_create && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <strong>{t('Product limit reached')}:</strong> {t('You have {{current}}/{{max}} products.', { current: planLimits.current_products, max: planLimits.max_products })}
              <button onClick={() => setShowUpgrade(true)} className="me-1 font-semibold underline">{t('Upgrade your plan')}</button>
              {t('to add more products.')}
            </div>
          </div>
        )}

        {planLimits && planLimits.max_products > 0 && (
          <div className="text-sm text-muted-foreground">
            {t('Products')}: {planLimits.current_products} / {planLimits.max_products}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Products')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{t('All products')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Active Products')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                {t('{{percent}}% active rate', { percent: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0 })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Low Stock')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.lowStock}</div>
              <p className="text-xs text-muted-foreground">{t('Below {{threshold}} units', { threshold: lowStockThreshold })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Value')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold ltr-num">{formatCurrency(stats.totalValue)}</div>
              <p className="text-xs text-muted-foreground">{t('Inventory value')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Product Catalog')}</CardTitle>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('Search by name or SKU...') }
                  value={searchInput ?? ''}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="ps-10"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={String(activeFilter.category_id ?? '') || 'all'}
                  onValueChange={(value) => applyFilters({ category_id: value === 'all' ? null : value })}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder={t('Filter by category')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Categories')}</SelectItem>
                    {(categories || []).map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={activeFilter.status ?? 'all'}
                  onValueChange={(value) => applyFilters({ status: value === 'all' ? null : value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t('Filter by status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Status')}</SelectItem>
                    <SelectItem value="active">{t('Active')}</SelectItem>
                    <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                    <SelectItem value="low_stock">{t('Low Stock')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Floating bulk actions bar — revealed when items are selected */}
            {selectedTotal > 0 && (
              <div className="sticky top-2 z-20 -mx-6 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-center text-xs font-bold text-primary-foreground">
                    {selectedTotal}
                  </span>
                  <span>{t('Selected')}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {hasPermission('edit-products') && (
                    <>
                      <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as 'active' | 'inactive')}>
                        <SelectTrigger className="w-36 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{t('Active')}</SelectItem>
                          <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="secondary" onClick={handleBulkStatus}>
                        <CheckCircle className="h-4 w-4 me-2" />
                        {t('Change Status')}
                      </Button>
                    </>
                  )}
                  {hasPermission('delete-products') && (
                    <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                      <Trash2 className="h-4 w-4 me-2" />
                      {t('Bulk Delete')}
                    </Button>
                  )}
                </div>
              </div>
            )}
            {products.length === 0 ? (() => {
              const hasActiveSearch = !!(activeFilter.search || (activeFilter.category_id && String(activeFilter.category_id) !== 'all' && String(activeFilter.category_id) !== '') || (activeFilter.status && String(activeFilter.status) !== 'all' && String(activeFilter.status) !== ''));
              if (hasActiveSearch) {
                return (
                  <div className="text-center py-12 px-4">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                      <Search className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">لم نجد نتائج مطابقة</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                      جرب كلمات مختلفة أو امسح الفلاتر لعرض جميع المنتجات.
                    </p>
                    <Button variant="outline" className="mt-6 gap-2" onClick={() => { setSearchInput(''); applyFilters({ search: '', category_id: 'all', status: 'all' }); }}>
                      <RefreshCw className="h-4 w-4" />
                      مسح البحث والفلاتر
                    </Button>
                  </div>
                );
              }
              return (
                <div className="text-center py-12 px-4">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
                    <Package className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">لا توجد منتجات بعد</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    أضف منتجاتك حتى يستطيع العملاء رؤيتها وشراؤها من متجرك. يمكنك إضافة الصور والسعر والمخزون والتصنيف.
                  </p>
                  {hasPermission('create-products') && !selectedTotal && (
                    <Button className="mt-6 gap-2" onClick={() => handleActionClick('create', 'create-products')}>
                      <Plus className="h-4 w-4" />
                      إضافة أول منتج
                    </Button>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">تلميح: أضف تصنيفاً أولاً ثم أضف المنتجات داخله لتنظيم أفضل</p>
                </div>
              );
            })() : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                          <Checkbox
                            checked={products.length > 0 && selected.size === products.length}
                            aria-label={t('Select all')}
                            onCheckedChange={() => toggleSelectAll()}
                          />
                      </TableHead>
                      <TableHead>{t('Product')}</TableHead>
                      <TableHead>{t('Category')}</TableHead>
                      <TableHead>
                        <button
                          className="flex items-center gap-1 hover:underline"
                          onClick={() => toggleSort('price')}
                          aria-sort={activeFilter.sort === 'price' ? (activeFilter.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          {t('Price')} <SortIcon column="price" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="flex items-center gap-1 hover:underline"
                          onClick={() => toggleSort('stock')}
                          aria-sort={activeFilter.sort === 'stock' ? (activeFilter.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          {t('Stock')} <SortIcon column="stock" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[150px]">{t('Status')}</TableHead>
                      <TableHead>
                        <button
                          className="flex items-center gap-1 hover:underline"
                          onClick={() => toggleSort('created_at')}
                          aria-sort={activeFilter.sort === 'created_at' ? (activeFilter.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          {t('Date')} <SortIcon column="created_at" />
                        </button>
                      </TableHead>
                      <TableHead className="w-20 text-right">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product: any) => {
                      const isVariant = (product.inventory_mode === 'variant') && !!product.track_inventory && Array.isArray(product.variant_combinations) && product.variant_combinations.length > 0;
                      const untracked = !product.track_inventory;
                      let stockDisplay: any = null;
                      let stockColor = 'bg-emerald-100 text-emerald-800';
                      let statusLabel = 'متوفر';
                      let stockDot = 'bg-emerald-500';
                      let isLowStock = false;
                      if (untracked) {
                        stockDisplay = <span className="text-xs text-muted-foreground">غير متتبع</span>;
                        stockColor = 'bg-slate-100 text-slate-600';
                        statusLabel = 'غير متتبع';
                        stockDot = 'bg-slate-400';
                      } else if (isVariant) {
                        const combos = product.variant_combinations || [];
                        const total = combos.reduce((a: number, c: any) => a + (parseInt(String(c.stock ?? 0)) || 0), 0);
                        const outCount = combos.filter((c: any) => (parseInt(String(c.stock ?? 0)) || 0) <= 0 && !product.allow_backorder).length;
                        const lowCount = combos.filter((c: any) => {
                          const s = parseInt(String(c.stock ?? 0)) || 0;
                          const th = parseInt(String(c.low_stock_warning ?? product.low_stock_warning ?? lowStockThreshold)) || Number(lowStockThreshold);
                          return s > 0 && s < th;
                        }).length;
                        isLowStock = lowCount > 0;
                        const allOut = combos.length > 0 && combos.every((c: any) => (parseInt(String(c.stock ?? 0)) || 0) <= 0 && !product.allow_backorder);
                        if (product.allow_backorder) {
                          stockColor = 'bg-emerald-100 text-emerald-800';
                          statusLabel = 'متوفر (طلب مسبق)';
                          stockDot = 'bg-emerald-500';
                        } else if (allOut) {
                          stockColor = 'bg-red-100 text-red-800';
                          statusLabel = 'نفد المخزون';
                          stockDot = 'bg-red-500';
                        } else if (isLowStock) {
                          stockColor = 'bg-amber-100 text-amber-800';
                          statusLabel = 'مخزون منخفض';
                          stockDot = 'bg-amber-500';
                        }
                        stockDisplay = (
                          <span className="inline-flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${stockDot}`} /><span className="ltr-num font-bold tabular-nums">{total}</span><span className="text-xs text-muted-foreground">عبر {combos.length} خيارات</span></span>
                            {outCount > 0 && !allOut && <span className="text-[11px] text-red-600">{outCount} خيارات نفدت</span>}
                          </span>
                        );
                      } else {
                        isLowStock = Number(product.stock) < Number(lowStockThreshold) && Number(product.stock) > 0;
                        const out = Number(product.stock) <= 0 && !product.allow_backorder;
                        if (product.allow_backorder) {
                          stockColor = 'bg-emerald-100 text-emerald-800';
                          statusLabel = 'متوفر (طلب مسبق)';
                          stockDot = 'bg-emerald-500';
                        } else if (out) {
                          stockColor = 'bg-red-100 text-red-800';
                          statusLabel = 'نفد المخزون';
                          stockDot = 'bg-red-500';
                        } else if (isLowStock) {
                          stockColor = 'bg-amber-100 text-amber-800';
                          statusLabel = 'مخزون منخفض';
                          stockDot = 'bg-amber-500';
                        }
                        stockDisplay = (
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${stockDot}`} />
                            <span className="ltr-num font-bold tabular-nums">{product.stock}</span>
                            <span className="text-xs text-muted-foreground">{product.stock === 1 ? 'قطعة' : 'قطع'}</span>
                          </span>
                        );
                      }
                      return (
                        <TableRow key={product.id} className={selected.has(product.id) ? 'bg-muted/30' : undefined}>
                          <TableCell>
                            <Checkbox
                              checked={selected.has(product.id)}
                              aria-label={t('Select product')}
                              onCheckedChange={() => toggleSelect(product.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border">
                                {getProductThumbnail(product) ? (
                                  <img src={getImageUrl(getProductThumbnail(product))} alt={product.name} className="h-full w-full object-cover" />
                                ) : (
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[180px]">{product.sku || '-'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{product.category?.name || <span className="text-muted-foreground">{t('Uncategorized')}</span>}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="ltr-num font-bold text-gray-900">{formatCurrency(product.sale_price || product.price)}</span>
                              {product.sale_price && <span className="text-xs text-gray-400 line-through ltr-num">{formatCurrency(product.price)}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {stockDisplay}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant={product.is_active ? 'default' : 'secondary'}>
                                {product.is_active ? t('Active') : t('Inactive')}
                              </Badge>
                              <Badge className={stockColor}>
                                {statusLabel}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{product.created_at ? new Date(product.created_at).toLocaleDateString() : '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end space-x-1">
                              {hasPermission('view-products') && (
                                <Button variant="ghost" size="sm" onClick={() => handleActionClick('view', 'view-products', product.id)} title={t('View')}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              {hasPermission('edit-products') && (
                                <Button variant="ghost" size="sm" onClick={() => handleActionClick('edit', 'edit-products', product.id)} title={t('Edit')}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {hasPermission('delete-products') && (
                                <Button variant="ghost" size="sm" onClick={() => handleActionClick('delete', 'delete-products', product.id)} title={t('Delete')}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {paginatedProducts && paginatedProducts.last_page > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t('Showing {{from}}–{{to}} of {{total}} products', {
                from: paginatedProducts.from,
                to: paginatedProducts.to,
                total: paginatedProducts.total,
              })}
            </div>
            <Pagination>
              <PaginationContent>
                {paginatedProducts.links.map((link: any, index: number) => {
                  // RTL flow: "next" must point LEFT («) and "previous" must point
                  // RIGHT (»). Laravel ships LTR guillemets, so swap them on the
                  // first (previous) and last (next) pagination items.
                  let labelHtml = link.label;
                  const total = paginatedProducts.links.length;
                  if (index === 0) {
                    labelHtml = labelHtml
                      .replace(/&laquo;/g, '&raquo;')
                      .replace(/«/g, '»');
                  } else if (index === total - 1) {
                    labelHtml = labelHtml
                      .replace(/&raquo;/g, '&laquo;')
                      .replace(/»/g, '«');
                  }

                  if (!link.url) {
                    return (
                      <PaginationItem key={index}>
                        <span
                          className="px-3 py-1.5 text-sm text-muted-foreground"
                          dangerouslySetInnerHTML={{ __html: labelHtml }}
                        />
                      </PaginationItem>
                    );
                  }
                  return (
                    <PaginationItem key={index}>
                      <PaginationLink
                        isActive={link.active}
                        href={link.url}
                        dangerouslySetInnerHTML={{ __html: labelHtml }}
                      />
                    </PaginationItem>
                  );
                })}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete Product')}</DialogTitle>
            <DialogDescription>{t('Are you sure you want to delete this product? This action cannot be undone.')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductToDelete(null)}>{t('Cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t('Delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
