import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Save, Plus, Trash2, AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, FileText, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { TagInput } from '@/components/ui/tag-input';
import VariantImageSlot from '@/components/VariantImageSlot';
import {
  generateVariantCombinations,
  mergeCombinationEdits,
  toCombinationEditsMap,
  type VariantCombination,
} from '@/utils/variant-combinations';

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
    short_description: '',
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
  const [variants, setVariants] = useState([{ name: '', values: [] as string[] }]);
  const [comboEdits, setComboEdits] = useState<Record<string, VariantCombination>>({});
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [showVariantFields, setShowVariantFields] = useState(false);

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
    const cleanedVariants = variantsEnabled
      ? variants
          .map(v => ({ ...v, values: (v.values || []).map(x => x.trim()).filter(Boolean) }))
          .filter(v => v.name.trim() !== '')
      : [];
    const generated = generateVariantCombinations(cleanedVariants);
    const combos = mergeCombinationEdits(generated, comboEdits);
    const productData = {
      ...formData,
      is_published: !draft,
      quick_specs: quickSpecs.filter(s => s.key.trim() !== ''),
      variants: cleanedVariants,
      variant_combinations: combos,
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

  const handleVariantValuesChange = (variantIndex: number, values: string[]) => {
    const newVariants = [...variants];
    newVariants[variantIndex].values = values;
    setVariants(newVariants);
  };

  const handleComboEdit = (id: string, field: keyof VariantCombination, value: any) => {
    setComboEdits(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value } as VariantCombination,
    }));
  };

  const addVariantGroup = () => {
    setVariants([...variants, { name: '', values: [] as string[] }]);
  };

  const removeVariantGroup = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
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
              <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('Product Content')}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t('Product Content Helper')}</p>
                </CardHeader>
              <CardContent className="space-y-4 text-start">
                <div>
                  <Label htmlFor="short_description">{t('Short Description')}</Label>
                  <Textarea id="short_description" name="short_description" rows={3} value={formData.short_description} onChange={handleChange} placeholder={t('Enter short description...')} />
                  <p className="text-xs text-muted-foreground mt-1">{t('A brief summary shown in storefront product previews')}</p>
                </div>
                <div>
                  <Label>{t('Product Description')}</Label>
                  <RichTextEditor value={formData.description} onChange={(v) => handleSelectChange('description', v)} placeholder={t('Enter product description...')} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>{t('Quick Specs')}</Label>
                    <span className="text-xs text-muted-foreground">{t('Property Name')} / {t('Property Details')}</span>
                  </div>
                  <div className="space-y-2">
                    {quickSpecs.map((spec, i) => (
                      <div key={i} className="flex items-center gap-2" dir="rtl">
                        <div className="grid flex-1 gap-1">
                          <span className="text-xs font-medium text-muted-foreground">{t('Property Name')}</span>
                          <Input placeholder={t('Property Name Placeholder')} value={spec.key} onChange={(e) => handleQuickSpecChange(i, 'key', e.target.value)} />
                        </div>
                        <div className="grid flex-1 gap-1">
                          <span className="text-xs font-medium text-muted-foreground">{t('Property Details')}</span>
                          <Input placeholder={t('Property Details Placeholder')} value={spec.value} onChange={(e) => handleQuickSpecChange(i, 'value', e.target.value)} />
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="shrink-0 mt-5 text-muted-foreground hover:text-destructive" onClick={() => setQuickSpecs(quickSpecs.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setQuickSpecs([...quickSpecs, { key: '', value: '' }])}>
                    <Plus className="h-4 w-4 me-1" />{t('Add Specification')}
                  </Button>
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
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-start">
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="text-start">
                    <Label>{t('This product comes in multiple colors or sizes')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Design options like size, color, or material for this product')}</p>
                  </div>
                  <Switch checked={variantsEnabled} onCheckedChange={setVariantsEnabled} />
                </div>

                {variantsEnabled && (
                  <>
                    <div className="flex items-center justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={addVariantGroup}>
                        <Plus className="h-4 w-4" />{t('Add Option')}
                      </Button>
                    </div>

                    {variants.map((variant, index) => (
                      <div key={index} className="rounded-xl border border-gray-200 overflow-hidden">
                        <div className="flex items-center justify-between gap-3 bg-gray-50 px-4 py-3 border-b border-gray-100">
                          <span className="text-sm font-semibold text-muted-foreground">{t('Option')} {index + 1}</span>
                          <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeVariantGroup(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="grid gap-1.5">
                            <Label htmlFor={`variant-name-${index}`} className="text-sm font-medium">
                              {t('Option Name')}
                            </Label>
                            <Input
                              id={`variant-name-${index}`}
                              placeholder={t('Option Name Placeholder')}
                              value={variant.name}
                              onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                              className="font-medium"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`variant-values-${index}`} className="text-sm font-medium">
                              {t('Available Options')}
                            </Label>
                            <TagInput
                              values={variant.values || []}
                              onChange={(values) => handleVariantValuesChange(index, values)}
                              placeholder={t('Type a value and press Enter')}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {(() => {
                      const generated = generateVariantCombinations(variants);
                      if (generated.length === 0) return null;
                      const combos = mergeCombinationEdits(generated, comboEdits);
                      return (
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                          <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-100">
                            <div>
                              <p className="text-sm font-semibold">{t('Variant Combinations')}</p>
                              <p className="text-xs text-muted-foreground">{t('Generated automatically from the options above')}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowVariantFields(!showVariantFields)}
                            >
                              {showVariantFields ? t('Hide Optional Fields') : t('Show Optional Fields')}
                            </Button>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50/70 text-xs text-muted-foreground border-b border-gray-100">
                                  <th className="px-3 py-2 text-start font-medium">{t('Image')}</th>
                                  <th className="px-3 py-2 text-start font-medium">{t('Combination')}</th>
                                  <th className="px-3 py-2 text-start font-medium">{t('Price')}</th>
                                  <th className="px-3 py-2 text-start font-medium">{t('Available Stock Quantity')}</th>
                                  {showVariantFields && (
                                    <>
                                      <th className="px-3 py-2 text-start font-medium">{t('Cost')}</th>
                                      <th className="px-3 py-2 text-start font-medium">{t('SKU (optional)')}</th>
                                    </>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {combos.map((combo) => (
                                  <tr key={combo.id} className="border-b border-gray-100 last:border-b-0">
                                    <td className="px-3 py-2">
                                      <VariantImageSlot value={combo.image} onChange={(v) => handleComboEdit(combo.id, 'image', v)} />
                                    </td>
                                    <td className="px-3 py-2 font-medium whitespace-nowrap">{combo.label}</td>
                                    <td className="px-3 py-2">
                                      <CurrencyInput type="number" step="0.01" placeholder="0.00" value={combo.price} onChange={(e) => handleComboEdit(combo.id, 'price', e.target.value)} />
                                    </td>
                                    <td className="px-3 py-2">
                                      <Input type="number" placeholder="0" value={combo.stock} onChange={(e) => handleComboEdit(combo.id, 'stock', e.target.value)} />
                                    </td>
                                    {showVariantFields && (
                                      <>
                                        <td className="px-3 py-2">
                                          <CurrencyInput type="number" step="0.01" placeholder="0.00" value={combo.cost_price} onChange={(e) => handleComboEdit(combo.id, 'cost_price', e.target.value)} />
                                        </td>
                                        <td className="px-3 py-2">
                                          <Input placeholder={t('SKU (optional)')} value={combo.sku} onChange={(e) => handleComboEdit(combo.id, 'sku', e.target.value)} />
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
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
