import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Save, Plus, Trash2, AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, FileText, EyeOff } from 'lucide-react';
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
import UpgradeModal from '@/components/UpgradeModal';

const TAB_ORDER = ['general', 'pricing', 'inventory', 'content', 'variants', 'advanced'];

function ImageFieldHint({ hint }: { hint: string }) {
  return <p className="text-xs text-muted-foreground mt-1">{hint}</p>;
}

export default function CreateProduct() {
  const { t } = useTranslation();
  const { categories, taxes, errors, planLimits } = usePage().props as any;
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [isDraft, setIsDraft] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    specifications: '',
    details: '',
    price: '',
    cost_price: '',
    sale_price: '',
    stock: 0,
    low_stock_warning: 5,
    track_inventory: true,
    allow_backorder: false,
    cover_image: '',
    images: '',
    category_id: '',
    tax_id: '',
    is_active: true,
    is_tax_included: true,
    is_downloadable: false,
    downloadable_file: '',
  });

  const [quickSpecs, setQuickSpecs] = useState([{ key: '', value: '' }]);
  const [customFields, setCustomFields] = useState([{ name: '', value: '' }]);
  const [variants, setVariants] = useState([{
    name: '',
    values: [''],
    price: '',
    cost_price: '',
    stock: 0,
    low_stock_warning: 0,
  }]);

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

  const generateSku = () => {
    const name = formData.name.trim();
    const cat = categories?.find((c: any) => String(c.id) === formData.category_id);
    const prefix = name ? name.substring(0, 3).toUpperCase() : 'PRD';
    const catPrefix = cat ? cat.name.substring(0, 2).toUpperCase() : '';
    const num = String(Math.floor(Math.random() * 900) + 100);
    const sku = catPrefix ? `${catPrefix}-${prefix}-${num}` : `${prefix}-${num}`;
    setField('sku', sku);
  };

  const getTabErrors = (tab: string): boolean => {
    if (!errors) return false;
    const tabFields: Record<string, string[]> = {
      general: ['name', 'sku', 'category_id'],
      pricing: ['price', 'cost_price'],
      inventory: ['stock'],
      content: [],
      variants: [],
      advanced: [],
    };
    return (tabFields[tab] || []).some(f => errors[f]);
  };

  const handleSubmit = (e?: React.FormEvent, draft = false) => {
    if (e) e.preventDefault();
    if (planLimits && !planLimits.can_create) {
      setShowUpgrade(true);
      return;
    }
    setIsDraft(draft);
    const productData = {
      ...formData,
      is_published: !draft,
      quick_specs: quickSpecs.filter(s => s.key.trim() !== ''),
      variants: variants.filter(v => v.name.trim() !== ''),
      custom_fields: customFields.filter(f => f.name.trim() !== ''),
    };
    router.post(route('products.store'), productData);
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

  const tabIndex = TAB_ORDER.indexOf(activeTab);

  return (
    <PageTemplate
      title={t('Create Product')}
      url="/products/create"
      backUrl={route('products.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Product Management'), href: route('products.index') },
        { title: t('Products'), href: route('products.index') },
        { title: t('Create Product') },
      ]}
    >
      <UpgradeModal open={showUpgrade} onOpenChange={setShowUpgrade} limitType="resource" current={planLimits?.current_products} max={planLimits?.max_products} />

      {planLimits && !planLimits.can_create && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            <strong>{t('Product limit reached')}:</strong> {t('You have {{current}}/{{max}} products.', { current: planLimits.current_products, max: planLimits.max_products })}
            <button onClick={() => setShowUpgrade(true)} className="me-1 font-semibold underline">{t('Upgrade your plan')}</button>
            {t('to add more products.')}
          </div>
        </div>
      )}

      <form noValidate onSubmit={(e) => handleSubmit(e)} className="space-y-4 pb-24" dir="rtl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList dir="rtl" className="grid w-full grid-cols-6 gap-1 h-auto p-1">
            {TAB_ORDER.map((tab) => {
              const hasError = getTabErrors(tab);
              const tabLabels: Record<string, string> = {
                general: t('General'),
                pricing: t('Pricing'),
                inventory: t('Inventory'),
                content: t('Content'),
                variants: t('Variants'),
                advanced: t('Advanced'),
              };
              return (
                <TabsTrigger key={tab} value={tab} className="relative text-xs sm:text-sm">
                  <span>{tabLabels[tab]}</span>
                  {hasError && (
                    <span className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* General */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">{t('Product Information')}</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-start">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="name" required>{t('Product Name')}</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder={t('Enter product name')} aria-invalid={!!errors.name} />
                    <InputError message={errors.name} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label required>{t('Product Code (SKU)')}</Label>
                    <div className="flex gap-2">
                      <Input id="sku" name="sku" value={formData.sku} onChange={handleChange} placeholder="PROD-001" aria-invalid={!!errors.sku} className="flex-1" />
                      <Button type="button" variant="outline" size="sm" onClick={generateSku} className="shrink-0 gap-1.5" title={t('Auto-generate SKU')}>
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t('Generate')}</span>
                      </Button>
                    </div>
                    <InputError message={errors.sku} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
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
                  <div className="grid gap-1.5">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <MediaPicker
                      label={t('Cover Image')}
                      value={formData.cover_image}
                      onChange={(v) => handleSelectChange('cover_image', v)}
                      placeholder={t('Select cover image...')}
                      required
                      dragDrop
                    />
                    <ImageFieldHint hint={t('Recommended: 800x800 pixels (square)')} />
                  </div>
                  <div>
                    <MediaPicker
                      label={t('Product Images')}
                      value={formData.images}
                      onChange={(v) => handleSelectChange('images', v)}
                      placeholder={t('Select product images...')}
                      multiple
                      dragDrop
                    />
                    <ImageFieldHint hint={t('Optional. Recommended: 800x800 pixels (square)')} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
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
          <TabsContent value="pricing" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">{t('Pricing Information')}</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-start">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="cost_price" required>{t('Cost Price')}</Label>
                    <CurrencyInput id="cost_price" name="cost_price" type="number" step="0.01" value={formData.cost_price} onChange={handleChange} placeholder="0.00" aria-invalid={!!errors.cost_price} />
                    <InputError message={errors.cost_price} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="price" required>{t('Selling Price')}</Label>
                    <CurrencyInput id="price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} placeholder="0.00" aria-invalid={!!errors.price} />
                    <InputError message={errors.price} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="sale_price">{t('Discounted Price')}</Label>
                    <CurrencyInput id="sale_price" name="sale_price" type="number" step="0.01" value={formData.sale_price} onChange={handleChange} placeholder="0.00" />
                  </div>
                </div>
                <ProfitSummary costPrice={formData.cost_price} sellingPrice={formData.price} />
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="text-start">
                    <Label>{t('Price includes tax')}</Label>
                  </div>
                  <Switch checked={formData.is_tax_included} onCheckedChange={(c) => setField('is_tax_included', c)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory */}
          <TabsContent value="inventory" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">{t('Inventory Management')}</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-start">
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="text-start">
                    <Label>{t('Track Inventory for this Product')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Manage stock quantity and low stock alerts for this product')}</p>
                  </div>
                  <Switch checked={formData.track_inventory} onCheckedChange={(c) => setField('track_inventory', c)} />
                </div>
                {formData.track_inventory && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="grid gap-1.5">
                        <Label htmlFor="stock" required>{t('Stock Quantity')}</Label>
                        <Input id="stock" name="stock" type="number" value={formData.stock} onChange={handleChange} placeholder="0" aria-invalid={!!errors.stock} />
                        <InputError message={errors.stock} />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="low_stock_warning">{t('Low Stock Warning')}</Label>
                        <Input id="low_stock_warning" name="low_stock_warning" type="number" value={formData.low_stock_warning} onChange={handleChange} placeholder="5" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="text-start">
                        <Label>{t('Allow Purchases When Out of Stock')}</Label>
                        <p className="text-sm text-muted-foreground">{t('Customers can still order this product when stock reaches zero')}</p>
                      </div>
                      <Switch checked={formData.allow_backorder} onCheckedChange={(c) => setField('allow_backorder', c)} />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="text-start">
                    <Label>{t('Digital Product (Downloadable)')}</Label>
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
          <TabsContent value="content" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">{t('Product Content')}</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-start">
                <div>
                  <Label>{t('Product Description')}</Label>
                  <RichTextEditor value={formData.description} onChange={(v) => handleSelectChange('description', v)} placeholder={t('Enter product description...')} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>{t('Quick Specs')}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setQuickSpecs([...quickSpecs, { key: '', value: '' }])}>
                      <Plus className="h-4 w-4 me-1" />{t('Add')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {quickSpecs.map((spec, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input placeholder={t('Key')} value={spec.key} onChange={(e) => handleQuickSpecChange(i, 'key', e.target.value)} />
                        <Input placeholder={t('Value')} value={spec.value} onChange={(e) => handleQuickSpecChange(i, 'value', e.target.value)} />
                        <Button type="button" variant="ghost" size="sm" onClick={() => setQuickSpecs(quickSpecs.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Variants - Grid Layout */}
          <TabsContent value="variants" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t('Product Variants')}</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setVariants([...variants, { name: '', values: [''], price: '', cost_price: '', stock: 0, low_stock_warning: 0 }])}>
                    <Plus className="h-4 w-4 me-2" />{t('Add Variant')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-start">
                {variants.map((variant, index) => (
                  <div key={index} className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 border-b border-gray-100">
                      <Input
                        placeholder={t('Variant name (e.g., Color, Size)')}
                        value={variant.name}
                        onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                        className="flex-1 font-medium"
                      />
                      <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setVariants(variants.filter((_, i) => i !== index))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {variant.values.map((value, vi) => (
                          <div key={vi} className="flex items-center gap-1">
                            <Input
                              placeholder={t('Value')}
                              value={value}
                              onChange={(e) => handleVariantValueChange(index, vi, e.target.value)}
                              className="w-28"
                            />
                            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400" onClick={() => {
                              const nv = [...variants];
                              nv[index].values.push('');
                              setVariants(nv);
                            }}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t('Price')}</Label>
                          <Input type="number" step="0.01" placeholder="0.00" value={variant.price} onChange={(e) => handleVariantChange(index, 'price', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t('Cost')}</Label>
                          <Input type="number" step="0.01" placeholder="0.00" value={variant.cost_price} onChange={(e) => handleVariantChange(index, 'cost_price', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t('Stock')}</Label>
                          <Input type="number" placeholder="0" value={variant.stock} onChange={(e) => handleVariantChange(index, 'stock', parseInt(e.target.value) || 0)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{t('Low Stock')}</Label>
                          <Input type="number" placeholder="0" value={variant.low_stock_warning} onChange={(e) => handleVariantChange(index, 'low_stock_warning', parseInt(e.target.value) || 0)} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced / Custom Fields */}
          <TabsContent value="advanced" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t('Custom Fields')}</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCustomFields([...customFields, { name: '', value: '' }])}>
                    <Plus className="h-4 w-4 me-2" />{t('Add Custom Field')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-start">
                {customFields.map((field, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input placeholder={t('Field name')} value={field.name} onChange={(e) => { const f = [...customFields]; f[index].name = e.target.value; setCustomFields(f); }} />
                    <Input placeholder={t('Field value')} value={field.value} onChange={(e) => { const f = [...customFields]; f[index].value = e.target.value; setCustomFields(f); }} />
                    <Button type="button" variant="ghost" size="sm" onClick={() => setCustomFields(customFields.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14" dir="rtl">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={tabIndex <= 0}
                onClick={() => tabIndex > 0 && setActiveTab(TAB_ORDER[tabIndex - 1])}
                className="gap-1"
              >
                {t('Previous')}
                <ChevronLeft className="h-4 w-4 rtl-flip" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={tabIndex >= TAB_ORDER.length - 1}
                onClick={() => tabIndex < TAB_ORDER.length - 1 && setActiveTab(TAB_ORDER[tabIndex + 1])}
                className="gap-1"
              >
                <ChevronRight className="h-4 w-4 rtl-flip" />
                {t('Next')}
              </Button>
              <span className="text-xs text-muted-foreground me-2 hidden sm:inline">
                {TAB_ORDER.indexOf(activeTab) + 1}/{TAB_ORDER.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => handleSubmit(e as any, true)}
                className="gap-1.5"
              >
                <EyeOff className="h-4 w-4" />
                {t('Save as Draft')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={(e) => handleSubmit(e as any, false)}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="h-4 w-4" />
                {t('Save Product')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
