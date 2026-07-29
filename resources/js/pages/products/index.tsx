import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Plus, Download, Package, Eye, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { getImageUrl } from '@/utils/image-helper';
import { formatCurrency } from '@/utils/currency-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';
import UpgradeModal from '@/components/UpgradeModal';

export default function Products() {
  const { t } = useTranslation();
  const { products, stats, auth, planLimits } = usePage().props as any;
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

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
    }
  };

  const handleDelete = () => {
    if (productToDelete && checkPermission('delete-products', auth)) {
      router.delete(route('products.destroy', productToDelete));
      setProductToDelete(null);
    }
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
              <p className="text-xs text-muted-foreground">{t('Need restocking')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total Value')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
              <p className="text-xs text-muted-foreground">{t('Inventory value')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Products List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Product Catalog')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-2 text-muted-foreground">{t('No products found')}</p>
                  {hasPermission('create-products') && (
                    <Button variant="outline" className="mt-4" onClick={() => handleActionClick('create', 'create-products')}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('Create your first product')}
                    </Button>
                  )}
                </div>
              ) : (
                products.map((product: any) => (
                  <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden border">
                        {product.cover_image ? (
                          <img src={getImageUrl(product.cover_image)} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                            <Package className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{product.name}</h3>
                          <Badge variant={product.is_active ? 'default' : 'secondary'}>
                            {product.is_active ? t('Active') : t('Inactive')}
                          </Badge>
                          {product.stock <= 0 && <Badge variant="destructive">{t('Out of Stock')}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{t('SKU: {{sku}}', { sku: product.sku || '-' })}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{formatCurrency(product.sale_price || product.price)}</span>
                            {product.sale_price && <span className="text-xs line-through text-muted-foreground">{formatCurrency(product.price)}</span>}
                          </div>
                          <span className="text-xs text-muted-foreground">{t('Stock: {{stock}}', { stock: product.stock })}</span>
                          <span className="text-xs text-muted-foreground">{product.category?.name || '-'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {hasPermission('view-products') && (
                        <Button variant="ghost" size="sm" onClick={() => handleActionClick('view', 'view-products', product.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('edit-products') && (
                        <Button variant="ghost" size="sm" onClick={() => handleActionClick('edit', 'edit-products', product.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {hasPermission('delete-products') && (
                        <Button variant="ghost" size="sm" onClick={() => handleActionClick('delete', 'delete-products', product.id)}>
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
