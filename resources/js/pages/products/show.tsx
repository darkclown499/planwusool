import { createSafeHtml } from '@/utils/xss-protection';
import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { Edit, Package, DollarSign, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { getImageUrl } from '@/utils/image-helper';
import { getProductThumbnail } from '@/utils/product-image-helper';
import { formatCurrency } from '@/utils/currency-helper';
import { hasPermission, checkPermission } from '@/utils/permissions';

function parseProductImages(raw: unknown): string[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean);
  }

  const trimmed = String(raw).trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      // fall through to comma splitting
    }
  }

  return trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function ShowProduct() {
  const { t } = useTranslation();
  const { product, stats, auth } = usePage().props as any;


  const handleActionClick = (action: string, permission: string) => {
    if (!checkPermission(permission, auth)) {
      return;
    }
    
    switch (action) {
      case 'edit':
        router.visit(route('products.edit', product.id));
        break;
    }
  };

  const pageActions = [
    ...(hasPermission('edit-products') ? [{
      label: t('Edit Product'),
      icon: <Edit className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => handleActionClick('edit', 'edit-products')
    }] : [])
  ];

  // Parse product images (supports JSON-encoded arrays and comma-separated strings)
  const productImages = parseProductImages(product.images);

  return (
    <PageTemplate 
      title={t('Product Details')}
      url="/products/show"
      actions={pageActions}
      backUrl={route('products.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Product Management'), href: route('products.index') },
        { title: t('Products'), href: route('products.index') },
        { title: t('Product Details') }
      ]}
    >
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{t('Product Information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-32 h-32 rounded-lg overflow-hidden border shrink-0">
                  {getProductThumbnail(product) ? (
                    <img
                      src={getImageUrl(getProductThumbnail(product))}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <Package className="h-10 w-10 text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold">{product.name}</h2>
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? t('Active') : t('Inactive')}
                    </Badge>
                    {product.stock <= 0 && (
                      <Badge variant="destructive">{t('Out of Stock')}</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mb-2">{t('SKU: {{sku}}', { sku: product.sku || '-' })}</p>
                  <div className="flex flex-wrap items-center gap-4 mb-2">
                    <span className="text-lg font-semibold text-primary">
                      {formatCurrency(product.sale_price || product.price)}
                    </span>
                    {product.sale_price && (
                      <span className="text-sm line-through text-muted-foreground">
                        {formatCurrency(product.price)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Quick Stats')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{t('Stock')}</span>
                </div>
                <span className="font-semibold text-end">{t('{{stock}} units', { stock: product.stock })}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{t('Revenue')}</span>
                </div>
                <span className="font-semibold text-end">{formatCurrency(stats.revenue || 0)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{t('Total Sold')}</span>
                </div>
                <span className="font-semibold text-end">{stats.total_sold || 0}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{t('Orders')}</span>
                </div>
                <span className="font-semibold text-end">{stats.total_orders || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('Product Details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">{t('Category')}</span>
                <span className="text-end">{product.category?.name || '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">{t('Product Tax')}</span>
                <span className="text-end">{product.tax?.name || '-'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">{t('Product Display')}</span>
                <Badge variant={product.is_active ? "default" : "secondary"}>
                  {product.is_active ? t('Active') : t('Inactive')}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">{t('Downloadable')}</span>
                <span className="text-end">{product.is_downloadable ? t('Yes') : t('No')}</span>
              </div>
              {product.downloadable_file && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-muted-foreground shrink-0">{t('Download File')}</span>
                  <span className="text-sm text-blue-600 truncate text-end min-w-0">{product.downloadable_file}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">{t('Created')}</span>
                <span className="text-sm text-end">{new Date(product.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">{t('Updated')}</span>
                <span className="text-sm text-end">{new Date(product.updated_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Pricing & Inventory')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">{t('Current Price')}</span>
                <span className="font-semibold text-green-600 text-end">{formatCurrency(product.sale_price || product.price)}</span>
              </div>
              {product.sale_price && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-muted-foreground">{t('Original Price')}</span>
                  <span className="font-semibold line-through text-muted-foreground text-end">{formatCurrency(product.price)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">{t('Stock Quantity')}</span>
                <span className="text-end">{t('{{stock}} units', { stock: product.stock })}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {product.description && (
          <Card>
            <CardHeader>
              <CardTitle>{t('Product Description')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none" dangerouslySetInnerHTML={createSafeHtml(product.description)} />
            </CardContent>
          </Card>
        )}

        {product.specifications && (
          <Card>
            <CardHeader>
              <CardTitle>{t('Product Specifications')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none" dangerouslySetInnerHTML={createSafeHtml(product.specifications)} />
            </CardContent>
          </Card>
        )}

        {product.details && (
          <Card>
            <CardHeader>
              <CardTitle>{t('Product Details')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none" dangerouslySetInnerHTML={createSafeHtml(product.details)} />
            </CardContent>
          </Card>
        )}

        {product.variants && product.variants.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('Product Variants')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {product.variants.map((variant: any, index: number) => (
                  <div key={index}>
                    <h4 className="font-medium mb-2">{variant.name}</h4>
                    <div className="flex flex-wrap gap-2">
                      {(variant.values || []).map((value: string, valueIndex: number) => (
                        <Badge key={valueIndex} variant="outline">{value}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {product.custom_fields && product.custom_fields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('Custom Fields')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {product.custom_fields.map((field: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{field.name}</span>
                    <span>{field.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {productImages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('Product Images')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {productImages.map((image: string, index: number) => (
                  <div key={index} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img
                      src={getImageUrl(image)}
                      alt={t('Product image {{number}}', { number: index + 1 })}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <span className="absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-medium text-white">
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTemplate>
  );
}
