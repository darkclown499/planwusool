import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { ArrowLeft, Save, Plus, Trash2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import MediaPicker from '@/components/MediaPicker';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import InputError from '@/components/input-error';

export default function CreateProduct() {
  const { t } = useTranslation();
  const { categories, taxes, errors } = usePage().props as any;
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
    cover_image: '',
    images: '',
    category_id: '',
    tax_id: '',
    is_active: true,
    is_tax_included: true,
    is_downloadable: false,
    downloadable_file: '',
  });
  const [customFields, setCustomFields] = useState([{ name: '', value: '' }]);
  const [variants, setVariants] = useState([{ 
    name: '', 
    values: [''],
    price: '',
    cost_price: '',
    stock: 0,
    low_stock_warning: 0
  }]);
  const [quickSpecs, setQuickSpecs] = useState([{ key: '', value: '' }]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkboxes
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked
      });
      // If switching from downloadable back to non-downloadable, clear file
      if (name === 'is_downloadable' && !checked) {
        setFormData(prev => ({
          ...prev,
          is_downloadable: false,
          downloadable_file: ''
        }));
      }
    } else {
      const isNumberField = ['stock', 'low_stock_warning', 'cost_price', 'price', 'sale_price'].includes(name);
      setFormData({
        ...formData,
        [name]: type === 'number' ? parseFloat(value) : value
      });
      
      // Calculate profit margin when sale_price or cost_price changes
      if ((name === 'sale_price' || name === 'cost_price') && formData.cost_price && formData.price) {
        const margin = ((formData.price - formData.cost_price) / formData.cost_price) * 100;
      }
    }
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData({
      ...formData,
      [name]: checked
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const calculateProfitMargin = () => {
    if (!formData.cost_price || !formData.price) return 0;
    return ((formData.price - formData.cost_price) / formData.cost_price) * 100;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Convert variants and custom fields to the format expected by the backend
    const productData = {
      ...formData,
      quick_specs: quickSpecs.filter((s: any) => s.key.trim() !== '' && s.value.trim() !== ''),
      variants: variants.filter((v: any) => v.name.trim() !== ''),
      custom_fields: customFields.filter((f: any) => f.name.trim() !== '')
    };
    
    router.post(route('products.store'), productData);
  };

  const handleQuickSpecChange = (index: number, field: string, value: string) => {
    const newSpecs = [...quickSpecs];
    newSpecs[index][field] = value;
    setQuickSpecs(newSpecs);
  };

  const addQuickSpec = () => {
    setQuickSpecs([...quickSpecs, { key: '', value: '' }]);
  };

  const removeQuickSpec = (index: number) => {
    setQuickSpecs(quickSpecs.filter((_, i) => i !== index));
  };

  const pageActions = [
    {
      label: t('Save Product'),
      icon: <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: handleSubmit
    }
  ];

  return (
    <PageTemplate 
      title={t('Create Product')}
      url="/products/create"
      actions={pageActions}
      backUrl={route('products.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Product Management'), href: route('products.index') },
        { title: t('Products'), href: route('products.index') },
        { title: t('Create Product') }
      ]}
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-6" dir="rtl">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-6 gap-2 rtl:flex-row-reverse">
            <TabsTrigger value="advanced">{t('Advanced')}</TabsTrigger>
            <TabsTrigger value="variants">{t('Variants')}</TabsTrigger>
            <TabsTrigger value="content">{t('Content')}</TabsTrigger>
            <TabsTrigger value="inventory">{t('Inventory')}</TabsTrigger>
            <TabsTrigger value="pricing">{t('Pricing')}</TabsTrigger>
            <TabsTrigger value="general">{t('General')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Product Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1 mb-4 text-right">
                    <Label htmlFor="name" required>{t('Product Name')}</Label>
                    <Input 
                      id="name" 
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={t('Enter product name')} 
                      aria-invalid={!!errors.name}
                    />
                    <InputError message={errors.name} />
                  </div>
                <div className="grid gap-1 mb-4 text-right">
                  <Label htmlFor="sku" required>{t('رمز المنتج (SKU)')}</Label>
                  <Input 
                    id="sku" 
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    placeholder={t('رمز المنتج (مثل:PROD-001)')}
                    aria-invalid={!!errors.sku}
                  />
                  <InputError message={errors.sku} />
                </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1 mb-4 text-right">
                    <Label htmlFor="category_id" required>{t('Category')}</Label>
                    <Select 
                      value={formData.category_id} 
                      onValueChange={(value) => handleSelectChange('category_id', value)}
                    >
                      <SelectTrigger aria-invalid={!!errors.category_id}>
                        <SelectValue placeholder={t('Select category')} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category: any) => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <InputError message={errors.category_id} />
                  </div>
                  <div>
                    <Label htmlFor="tax_id">{t('Product Tax')}</Label>
                    <Select 
                      value={formData.tax_id} 
                      onValueChange={(value) => handleSelectChange('tax_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('Select tax class')} />
                      </SelectTrigger>
                      <SelectContent>
                        {taxes?.map((tax: any) => (
                          <SelectItem key={tax.id} value={String(tax.id)}>
                            {tax.name} ({tax.rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <MediaPicker
                      label={t('Cover Image *')}
                      value={formData.cover_image}
                      onChange={(value) => handleSelectChange('cover_image', value)}
                      placeholder={t('Select cover image...')}
                    />
                  </div>
                  <div>
                    <MediaPicker
                      label={t('Product Images')}
                      value={formData.images}
                      onChange={(value) => handleSelectChange('images', value)}
                      multiple={true}
                      placeholder={t('Select product images...')}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-right">
                    <Label>{t('Product Display')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Show product on store')}</p>
                  </div>
                  <Switch 
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Pricing Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                <div className="grid grid-cols-4 gap-4">
                  <div className="grid gap-1 mb-4 text-right">
                    <Label htmlFor="cost_price" required>{t('Cost Price')}</Label>
                    <Input 
                      id="cost_price" 
                      name="cost_price"
                      type="number" 
                      step="0.01" 
                      value={formData.cost_price}
                      onChange={handleChange}
                      placeholder="0.00" 
                      aria-invalid={!!errors.cost_price}
                    />
                    <InputError message={errors.cost_price} />
                  </div>
                  <div className="grid gap-1 mb-4 text-right">
                    <Label htmlFor="price" required>{t('Price')}</Label>
                    <Input 
                      id="price" 
                      name="price"
                      type="number" 
                      step="0.01" 
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="0.00" 
                      aria-invalid={!!errors.price}
                    />
                    <InputError message={errors.price} />
                  </div>
                  <div className="grid gap-1 mb-4 text-right">
                    <Label htmlFor="sale_price" required>{t('Sale Price')}</Label>
                    <Input 
                      id="sale_price" 
                      name="sale_price"
                      type="number" 
                      step="0.01" 
                      value={formData.sale_price}
                      onChange={handleChange}
                      placeholder="0.00" 
                      aria-invalid={!!errors.sale_price}
                    />
                    <InputError message={errors.sale_price} />
                  </div>
                  <div className="flex flex-col gap-2">
                    {calculateProfitMargin() > 0 && (
                      <div className="p-2 bg-green-50 rounded text-sm">
                        <span className="font-semibold">Profit Margin:</span> {calculateProfitMargin().toFixed(2)}%
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-4">
                  <div className="text-right">
                    <Label>{t('Should price include tax?')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Should price include tax?')}</p>
                  </div>
                  <Switch 
                    checked={formData.is_tax_included}
                    onCheckedChange={(checked) => handleSwitchChange('is_tax_included', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Inventory Management')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                <div className="grid gap-1 mb-4 text-right">
                  <Label htmlFor="stock" required>{t('Stock Quantity')}</Label>
                  <Input 
                    id="stock" 
                    name="stock"
                    type="number" 
                    value={formData.stock}
                    onChange={handleChange}
                    placeholder="0" 
                    aria-invalid={!!errors.stock}
                  />
                  <InputError message={errors.stock} />
                </div>
                <div className="grid gap-1 mb-4 text-right">
                  <Label htmlFor="low_stock_warning">{t('Low Stock Warning')}</Label>
                  <Input 
                    id="low_stock_warning" 
                    name="low_stock_warning"
                    type="number" 
                    value={formData.low_stock_warning}
                    onChange={handleChange}
                    placeholder="5"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-right">
                    <Label>{t('Downloadable Product')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Is this a digital product?')}</p>
                  </div>
                  <Switch 
                    checked={formData.is_downloadable}
                    onCheckedChange={(checked) => {
                      handleSwitchChange('is_downloadable', checked);
                      if (!checked) {
                        setFormData(prev => ({...prev, downloadable_file: ''}));
                      }
                    }}
                  />
                </div>
                <div className={formData.is_downloadable ? "block" : "hidden"}>
                  <MediaPicker
                    label={t('Downloadable File')}
                    value={formData.downloadable_file}
                    onChange={(value) => handleSelectChange('downloadable_file', value)}
                    placeholder={t('Select downloadable file...')}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Product Content')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                <div>
                  <Label>{t('Product Description')}</Label>
                  <RichTextEditor
                    value={formData.description}
                    onChange={(value) => handleSelectChange('description', value)}
                    placeholder={t('Enter product description...')}
                  />
                </div>
                <div>
                  <Label>{t('Product Specifications')}</Label>
                  <RichTextEditor
                    value={formData.specifications}
                    onChange={(value) => handleSelectChange('specifications', value)}
                    placeholder={t('Enter product specifications...')}
                  />
                </div>
                <div>
                  <Label>{t('Product Details')}</Label>
                  <RichTextEditor
                    value={formData.details}
                    onChange={(value) => handleSelectChange('details', value)}
                    placeholder={t('Enter additional product details...')}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variants" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('Product Variants')}</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setVariants([...variants, { name: '', values: [''] }])}
                  >
                    <Plus className="h-4 w-4 me-2" />
                    {t('Add Variant')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                {variants.map((variant: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Input
                        placeholder={t('Variant name (e.g., Color, Size)')}
                        value={variant.name}
                        onChange={(e) => {
                          const newVariants = [...variants];
                          newVariants[index].name = e.target.value;
                          setVariants(newVariants);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setVariants(variants.filter((_: any, i: number) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {variant.values.map((value: string, valueIndex: number) => (
                        <div key={valueIndex} className="flex items-center space-x-2 rtl:space-x-reverse">
                          <Input
                            placeholder={t('Variant value')}
                            value={value}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[index].values[valueIndex] = e.target.value;
                              setVariants(newVariants);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newVariants = [...variants];
                              newVariants[index].values.push('');
                              setVariants(newVariants);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('Custom Fields')}</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomFields([...customFields, { name: '', value: '' }])}
                  >
                    <Plus className="h-4 w-4 me-2" />
                    {t('Add Custom Field')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-right">
                {customFields.map((field: any, index: number) => (
                  <div key={index} className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Input
                      placeholder={t('Field name')}
                      value={field.name}
                      onChange={(e) => {
                        const newFields = [...customFields];
                        newFields[index].name = e.target.value;
                        setCustomFields(newFields);
                      }}
                    />
                    <Input
                      placeholder={t('Field value')}
                      value={field.value}
                      onChange={(e) => {
                        const newFields = [...customFields];
                        newFields[index].value = e.target.value;
                        setCustomFields(newFields);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCustomFields(customFields.filter((_: any, i: number) => i !== index))}
                    >
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
