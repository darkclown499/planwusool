import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Save, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { ProfitSummary } from '@/components/ui/profit-summary';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import MediaPicker from '@/components/MediaPicker';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import InputError from '@/components/input-error';

export default function EditProduct() {
  const { t } = useTranslation();
  const { product, categories, taxes, errors } = usePage().props as any;

  const [formData, setFormData] = useState({
    name: product.name || '',
    sku: product.sku || '',
    description: product.description || '',
    specifications: product.specifications || '',
    details: product.details || '',
    price: product.price || '',
    cost_price: product.cost_price || '',
    sale_price: product.sale_price || '',
    stock: product.stock || 0,
    low_stock_warning: product.low_stock_warning || 5,
    cover_image: product.cover_image || '',
    images: product.images || '',
    category_id: product.category_id ? String(product.category_id) : '',
    tax_id: product.tax_id ? String(product.tax_id) : '',
    is_active: product.is_active !== undefined ? product.is_active : true,
    is_tax_included: product.is_tax_included !== undefined ? product.is_tax_included : true,
    is_downloadable: product.is_downloadable || false,
    downloadable_file: product.downloadable_file || '',
  });

  const [quickSpecs, setQuickSpecs] = useState(
    product.quick_specs && product.quick_specs.length > 0 ? product.quick_specs : [{ key: '', value: '' }]
  );

  const [customFields, setCustomFields] = useState(
    product.custom_fields && product.custom_fields.length > 0 ? product.custom_fields : [{ name: '', value: '' }]
  );

  const [variants, setVariants] = useState(() => {
    if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
      return product.variants.map((v: any) => ({
        name: v.name || '',
        values: Array.isArray(v.values) ? v.values : (Array.isArray(v.options) ? v.options : ['']),
        price: v.price || '',
        cost_price: v.cost_price || '',
        stock: v.stock || 0,
        low_stock_warning: v.low_stock_warning || 0,
      }));
    }
    return [{ name: '', values: [''], price: '', cost_price: '', stock: 0, low_stock_warning: 0 }];
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        specifications: product.specifications || '',
        details: product.details || '',
        price: product.price || '',
        cost_price: product.cost_price || '',
        sale_price: product.sale_price || '',
        stock: product.stock || 0,
        low_stock_warning: product.low_stock_warning || 5,
        cover_image: product.cover_image || '',
        images: product.images || '',
        category_id: product.category_id ? String(product.category_id) : '',
        tax_id: product.tax_id ? String(product.tax_id) : '',
        is_active: product.is_active !== undefined ? product.is_active : true,
        is_tax_included: product.is_tax_included !== undefined ? product.is_tax_included : true,
        is_downloadable: product.is_downloadable || false,
        downloadable_file: product.downloadable_file || '',
      });
    }
  }, [product]);

  const setField = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setField(name, type === 'number' ? parseFloat(value) : value);
  };

  const handleSelectChange = (name: string, value: string) => {
    setField(name, value);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const productData = {
      ...formData,
      quick_specs: quickSpecs.filter((s: any) => s.key?.trim() !== ''),
      variants: variants.filter((v: any) => v.name?.trim() !== ''),
      custom_fields: customFields.filter((f: any) => f.name?.trim() !== ''),
    };
    router.put(route('products.update', product.id), productData);
  };

  const handleQuickSpecChange = (index: number, field: string, value: string) => {
    const newSpecs = [...quickSpecs];
    newSpecs[index][field as 'key' | 'value'] = value;
    setQuickSpecs(newSpecs);
  };

  const handleVariantChange = (index: number, field: string, value: any) => {
    const newVariants = [...variants];
    (newVariants[index] as any)[field] = value;
    setVariants(newVariants);
  };

  const handleVariantValueChange = (variantIndex: number, valueIndex: number, value: string) => {
    const newVariants = [...variants];
    if (!newVariants[variantIndex].values) newVariants[variantIndex].values = [];
    newVariants[variantIndex].values[valueIndex] = value;
    setVariants(newVariants);
  };

  const pageActions = [
    {
      label: t('Update Product'),
      icon: <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: handleSubmit,
    },
  ];

  return (
    <PageTemplate
      title={t('Edit Product')}
      url="/products/edit"
      actions={pageActions}
      backUrl={route('products.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Product Management'), href: route('products.index') },
        { title: t('Products'), href: route('products.index') },
        { title: t('Edit Product') },
      ]}
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-6" dir="rtl">
        <Tabs defaultValue="general" className="w-full">
          <TabsList dir="rtl" className="grid w-full grid-cols-6 gap-2">
            <TabsTrigger value="general">{t('General')}</TabsTrigger>
            <TabsTrigger value="pricing">{t('Pricing')}</TabsTrigger>
            <TabsTrigger value="inventory">{t('Inventory')}</TabsTrigger>
            <TabsTrigger value="content">{t('Content')}</TabsTrigger>
            <TabsTrigger value="variants">{t('Variants')}</TabsTrigger>
            <TabsTrigger value="advanced">{t('Advanced')}</TabsTrigger>
          </TabsList>

          {/* General */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>{t('Product Information')}</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-start">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1 mb-4 text-start">
                    <Label htmlFor="name" required>{t('Product Name')}</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder={t('Enter product name')} aria-invalid={!!errors.name} />
                    <InputError message={errors.name} />
                  </div>
                  <div className="grid gap-1 mb-4 text-start">
                    <Label htmlFor="sku" required>{t('SKU')}</Label>
                    <Input id="sku" name="sku" value={formData.sku} onChange={handleChange} placeholder={t('PROD-001')} aria-invalid={!!errors.sku} />
                    <InputError message={errors.sku} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1 mb-4 text-start">
                    <Label htmlFor="category_id" required>{t('Category')}</Label>
                    <Select value={formData.category_id} onValueChange={(v) => handleSelectChange('category_id', v)}>
                      <SelectTrigger aria-invalid={!!errors.category_id}>
                        <SelectValue placeholder={t('Select category')} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat: any) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <InputError message={errors.category_id} />
                  </div>
                  <div>
                    <Label>{t('Product Tax')}</Label>
                    <Select value={formData.tax_id} onValueChange={(v) => handleSelectChange('tax_id', v)}>
                      <SelectTrigger><SelectValue placeholder={t('Select tax class')} /></SelectTrigger>
                      <SelectContent>
                        {taxes?.map((tax: any) => (
                          <SelectItem key={tax.id} value={String(tax.id)}>{tax.name} ({tax.rate}%)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <MediaPicker label={t('Cover Image')} value={formData.cover_image} onChange={(v) => handleSelectChange('cover_image', v)} placeholder={t('Select cover image...')} required dragDrop />
                    <p className="text-xs text-muted-foreground mt-1">{t('Recommended: 800x800 pixels (square)')}</p>
                  </div>
                  <div>
                    <MediaPicker label={t('Product Images')} value={formData.images} onChange={(v) => handleSelectChange('images', v)} multiple={true} placeholder={t('Select product images...')} dragDrop />
                    <p className="text-xs text-muted-foreground mt-1">{t('Optional. Recommended: 800x800 pixels (square)')}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-start">
                    <Label>{t('Product Display')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Show product on store')}</p>
                  </div>
                  <Switch checked={formData.is_active} onCheckedChange={(c) => setField('is_active', c)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing */}
          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>{t('Pricing Information')}</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-start">
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-1 mb-4 text-start">
                    <Label htmlFor="price" required>{t('Selling Price')}</Label>
                    <CurrencyInput id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} placeholder="0.00" aria-invalid={!!errors.price} />
                    <InputError message={errors.price} />
                  </div>
                  <div className="grid gap-1 mb-4 text-start">
                    <Label htmlFor="cost_price">{t('Cost Price')}</Label>
                    <CurrencyInput id="cost_price" name="cost_price" type="number" step="0.01" value={formData.cost_price} onChange={handleChange} placeholder="0.00" />
                  </div>
                  <div className="grid gap-1 mb-4 text-start">
                    <Label htmlFor="sale_price">{t('Discounted Price')}</Label>
                    <CurrencyInput id="sale_price" name="sale_price" type="number" step="0.01" value={formData.sale_price} onChange={handleChange} placeholder="0.00" />
                  </div>
                </div>
                <ProfitSummary costPrice={formData.cost_price} sellingPrice={formData.price} />
                <div className="flex items-center justify-between gap-3 pt-4">
                  <div className="text-start">
                    <Label>{t('Price includes tax')}</Label>
                  </div>
                  <Switch checked={formData.is_tax_included} onCheckedChange={(c) => setField('is_tax_included', c)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>{t('Inventory Management')}</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-start">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1 mb-4 text-start">
                    <Label htmlFor="stock" required>{t('Stock Quantity')}</Label>
                    <Input id="stock" name="stock" type="number" value={formData.stock} onChange={handleChange} placeholder="0" aria-invalid={!!errors.stock} />
                    <InputError message={errors.stock} />
                  </div>
                  <div className="grid gap-1 mb-4 text-start">
                    <Label htmlFor="low_stock_warning">{t('Low Stock Warning')}</Label>
                    <Input id="low_stock_warning" name="low_stock_warning" type="number" value={formData.low_stock_warning} onChange={handleChange} placeholder="5" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-start">
                    <Label>{t('Downloadable Product')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Is this a digital product?')}</p>
                  </div>
                  <Switch checked={formData.is_downloadable} onCheckedChange={(c) => { setField('is_downloadable', c); if (!c) setField('downloadable_file', ''); }} />
                </div>
                {formData.is_downloadable && (
                  <MediaPicker label={t('Downloadable File')} value={formData.downloadable_file} onChange={(v) => handleSelectChange('downloadable_file', v)} placeholder={t('Select downloadable file...')} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content */}
          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader><CardTitle>{t('Product Content')}</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-start">
                <div>
                  <Label>{t('Product Description')}</Label>
                  <RichTextEditor key={`desc-${product.id}`} value={formData.description} onChange={(v) => handleSelectChange('description', v)} placeholder={t('Enter product description...')} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>{t('Quick Specs')}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setQuickSpecs([...quickSpecs, { key: '', value: '' }])}>
                      <Plus className="h-4 w-4 me-1" />{t('Add')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {quickSpecs.map((spec: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input placeholder={t('Key')} value={spec.key || ''} onChange={(e) => handleQuickSpecChange(i, 'key', e.target.value)} />
                        <Input placeholder={t('Value')} value={spec.value || ''} onChange={(e) => handleQuickSpecChange(i, 'value', e.target.value)} />
                        <Button type="button" variant="ghost" size="sm" onClick={() => setQuickSpecs(quickSpecs.filter((_: any, j: number) => j !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variants */}
          <TabsContent value="variants" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('Product Variants')}</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setVariants([...variants, { name: '', values: [''], price: '', cost_price: '', stock: 0, low_stock_warning: 0 }])}>
                    <Plus className="h-4 w-4 me-2" />{t('Add Variant')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-start">
                {variants.map((variant: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Input placeholder={t('Variant name (e.g., Color, Size)')} value={variant.name || ''} onChange={(e) => handleVariantChange(index, 'name', e.target.value)} />
                      <Button type="button" variant="ghost" size="sm" onClick={() => setVariants(variants.filter((_: any, i: number) => i !== index))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(variant.values || []).map((value: string, vi: number) => (
                        <div key={vi} className="flex items-center gap-2">
                          <Input placeholder={t('Variant value')} value={value || ''} onChange={(e) => handleVariantValueChange(index, vi, e.target.value)} />
                          <Button type="button" variant="outline" size="sm" onClick={() => {
                            const nv = [...variants];
                            if (!nv[index].values) nv[index].values = [];
                            nv[index].values.push('');
                            setVariants(nv);
                          }}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-3 border-t pt-3">
                      <div className="grid gap-1 text-start">
                        <Label className="text-xs">{t('Price')}</Label>
                        <Input type="number" step="0.01" placeholder="0.00" value={variant.price || ''} onChange={(e) => handleVariantChange(index, 'price', e.target.value)} />
                      </div>
                      <div className="grid gap-1 text-start">
                        <Label className="text-xs">{t('Cost Price')}</Label>
                        <Input type="number" step="0.01" placeholder="0.00" value={variant.cost_price || ''} onChange={(e) => handleVariantChange(index, 'cost_price', e.target.value)} />
                      </div>
                      <div className="grid gap-1 text-start">
                        <Label className="text-xs">{t('Stock')}</Label>
                        <Input type="number" placeholder="0" value={variant.stock || 0} onChange={(e) => handleVariantChange(index, 'stock', parseInt(e.target.value) || 0)} />
                      </div>
                      <div className="grid gap-1 text-start">
                        <Label className="text-xs">{t('Low Stock')}</Label>
                        <Input type="number" placeholder="0" value={variant.low_stock_warning || 0} onChange={(e) => handleVariantChange(index, 'low_stock_warning', parseInt(e.target.value) || 0)} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced / Custom Fields */}
          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('Custom Fields')}</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCustomFields([...customFields, { name: '', value: '' }])}>
                    <Plus className="h-4 w-4 me-2" />{t('Add Custom Field')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-start">
                {customFields.map((field: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input placeholder={t('Field name')} value={field.name || ''} onChange={(e) => { const f = [...customFields]; f[index].name = e.target.value; setCustomFields(f); }} />
                    <Input placeholder={t('Field value')} value={field.value || ''} onChange={(e) => { const f = [...customFields]; f[index].value = e.target.value; setCustomFields(f); }} />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setCustomFields(customFields.filter((_: any, i: number) => i !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </PageTemplate>
  );
}
