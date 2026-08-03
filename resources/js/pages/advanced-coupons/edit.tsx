import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Save } from 'lucide-react';
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
import InputError from '@/components/input-error';
import { X, Plus } from 'lucide-react';

interface Props {
  coupon: any;
  availableProducts: { id: number; name: string; price: number }[];
  availableCategories: { id: number; name: string }[];
  countries: { id: number; name: string; code: string }[];
  states: { id: number; name: string; country_id: number }[];
  cities: { id: number; name: string; state_id: number }[];
  discountTypes: { value: string; label: string }[];
}

export default function EditAdvancedCoupon({ coupon, availableProducts, availableCategories, countries, states, cities, discountTypes }: Props) {
  const { t } = useTranslation();
  const { errors } = usePage().props as any;

  const [formData, setFormData] = useState({
    name: coupon.name || '',
    code: coupon.code || '',
    code_type: coupon.code_type || 'manual' as 'manual' | 'auto',
    description: coupon.description || '',
    discount_type: coupon.discount_type || 'fixed',
    discount_value: coupon.discount_value ? String(coupon.discount_value) : '',
    max_discount_amount: coupon.max_discount_amount ? String(coupon.max_discount_amount) : '',
    minimum_order_amount: coupon.minimum_order_amount ? String(coupon.minimum_order_amount) : '',
    usage_limit: coupon.usage_limit || '',
    per_customer_limit: coupon.per_customer_limit || '',
    exclude_on_sale_items: coupon.exclude_on_sale_items || false,
    first_order_only: coupon.first_order_only || false,
    starts_at: coupon.starts_at || '',
    expires_at: coupon.expires_at || '',
    status: coupon.status ?? true,
    // BOGO
    bogo_product_id: coupon.bogo_product_id ? String(coupon.bogo_product_id) : '',
    bogo_quantity: String(coupon.bogo_quantity || 1),
    bogo_free_quantity: String(coupon.bogo_free_quantity || 1),
    // Product bindings
    product_ids: (coupon.product_ids || []) as number[],
    excluded_product_ids: (coupon.excluded_product_ids || []) as number[],
    category_ids: Array.isArray(coupon.category_ids) ? coupon.category_ids.map((id: any) => typeof id === 'object' ? id.id : Number(id)) : [],
    // Regions
    regions: (coupon.regions || []).map((r: { country_id: number | null; state_id: number | null; city_id: number | null }) => ({
      country_id: r.country_id || null,
      state_id: r.state_id || null,
      city_id: r.city_id || null,
    })),
  });

  const [productSearch, setProductSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: result }));
  };

  const toggleProduct = (productId: number) => {
    setFormData(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId],
    }));
  };

  const toggleExcludedProduct = (productId: number) => {
    setFormData(prev => ({
      ...prev,
      excluded_product_ids: prev.excluded_product_ids.includes(productId)
        ? prev.excluded_product_ids.filter(id => id !== productId)
        : [...prev.excluded_product_ids, productId],
      product_ids: prev.product_ids.filter(id => id !== productId),
    }));
  };

  const toggleCategory = (categoryId: number) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter(id => id !== categoryId)
        : [...prev.category_ids, categoryId],
    }));
  };

  const addRegion = () => {
    setFormData(prev => ({
      ...prev,
      regions: [...prev.regions, { country_id: null, state_id: null, city_id: null }],
    }));
  };

  const updateRegion = (index: number, field: string, value: number | null) => {
    setFormData(prev => {
      const regions = [...prev.regions];
      regions[index] = { ...regions[index], [field]: value };
      if (field === 'country_id') {
        regions[index].state_id = null;
        regions[index].city_id = null;
      }
      if (field === 'state_id') {
        regions[index].city_id = null;
      }
      return { ...prev, regions };
    });
  };

const removeRegion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      regions: prev.regions.filter((_: { country_id: number | null; state_id: number | null; city_id: number | null }, i: number) => i !== index),
    }));
  };

  const getFilteredStates = (countryId: number | null) => {
    if (!countryId) return [];
    return states.filter(s => s.country_id === countryId);
  };

  const getFilteredCities = (stateId: number | null) => {
    if (!stateId) return [];
    return cities.filter(c => c.state_id === stateId);
  };

  const handleSubmit = () => {
    const submissionData = {
      ...formData,
      discount_value: formData.discount_value ? parseFloat(formData.discount_value) : 0,
      max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
      minimum_order_amount: formData.minimum_order_amount ? parseFloat(formData.minimum_order_amount) : 0,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      per_customer_limit: formData.per_customer_limit ? parseInt(formData.per_customer_limit) : null,
      bogo_product_id: formData.bogo_product_id ? parseInt(formData.bogo_product_id) : null,
      bogo_quantity: parseInt(formData.bogo_quantity || '1'),
      bogo_free_quantity: parseInt(formData.bogo_free_quantity || '1'),
      starts_at: formData.starts_at || null,
      expires_at: formData.expires_at || null,
      _method: 'PUT',
    };

    router.post(route('advanced-coupons.update', coupon.id), submissionData);
  };

  const filteredProducts = availableProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );
  const filteredCategories = availableCategories.filter(c =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const isProductIncluded = (id: number) => formData.product_ids.includes(id);
  const isProductExcluded = (id: number) => formData.excluded_product_ids.includes(id);
  const isCategorySelected = (id: number) => formData.category_ids.includes(id);

  const pageActions = [
    {
      label: t('Update Coupon'),
      icon: <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: handleSubmit,
    },
  ];

  return (
    <PageTemplate
      title={t('Edit Advanced Coupon')}
      description={t('Modify the coupon settings and rules')}
      url={`/advanced-coupons/${coupon.id}/edit`}
      actions={pageActions}
      backUrl={route('advanced-coupons.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Advanced Coupons'), href: route('advanced-coupons.index') },
        { title: t('Edit: ') + coupon.name },
      ]}
    >
      <form noValidate className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">{t('General')}</TabsTrigger>
            <TabsTrigger value="restrictions">{t('Restrictions')}</TabsTrigger>
            <TabsTrigger value="products">{t('Products & Categories')}</TabsTrigger>
            <TabsTrigger value="regions">{t('Regions')}</TabsTrigger>
          </TabsList>

          {/* ──────────────── General Tab ──────────────── */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Coupon Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" required>{t('Coupon Name')}</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder={t('e.g. Summer Sale')} />
                    <InputError message={errors.name} />
                  </div>
                  <div>
                    <Label htmlFor="code_type">{t('Code Type')}</Label>
                    <Select value={formData.code_type} onValueChange={(v) => handleSelectChange('code_type', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">{t('Manual Code')}</SelectItem>
                        <SelectItem value="auto">{t('Auto Generate')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.code_type === 'manual' && (
                  <div>
                    <Label htmlFor="code" required>{t('Coupon Code')}</Label>
                    <div className="flex gap-2">
                      <Input id="code" name="code" value={formData.code} onChange={handleChange} placeholder={t('e.g. SUMMER20')} />
                      <Button type="button" variant="outline" onClick={generateCode}>
                        {t('Generate')}
                      </Button>
                    </div>
                    <InputError message={errors.code} />
                  </div>
                )}

                <div>
                  <Label htmlFor="description">{t('Description')}</Label>
                  <Textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder={t('Coupon description (optional)')} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discount_type" required>{t('Discount Type')}</Label>
                    <Select value={formData.discount_type} onValueChange={(v) => handleSelectChange('discount_type', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {discountTypes.map((dt) => (
                          <SelectItem key={dt.value} value={dt.value}>{t(dt.label)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <InputError message={errors.discount_type} />
                  </div>
                  {formData.discount_type !== 'free_shipping' && formData.discount_type !== 'buy_one_get_one' && (
                    <div>
                      <Label htmlFor="discount_value" required>
                        {formData.discount_type === 'percentage' ? t('Discount Percentage (%)') : t('Discount Amount')}
                      </Label>
                      <Input id="discount_value" name="discount_value" type="number" step={formData.discount_type === 'percentage' ? '1' : '0.01'} value={formData.discount_value} onChange={handleChange} placeholder={formData.discount_type === 'percentage' ? '20' : '10.00'} />
                      <InputError message={errors.discount_value} />
                    </div>
                  )}
                </div>

                {formData.discount_type === 'percentage' && (
                  <div>
                    <Label htmlFor="max_discount_amount">{t('Maximum Discount Amount')}</Label>
                    <Input id="max_discount_amount" name="max_discount_amount" type="number" step="0.01" value={formData.max_discount_amount} onChange={handleChange} placeholder={t('Leave empty for no limit')} />
                    <p className="text-xs text-muted-foreground mt-1">{t('Protect your profit margin by capping the discount')}</p>
                  </div>
                )}

                {formData.discount_type === 'buy_one_get_one' && (
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
                    <div>
                      <Label htmlFor="bogo_product_id">{t('Specific Product (Optional)')}</Label>
                      <Select value={formData.bogo_product_id} onValueChange={(v) => handleSelectChange('bogo_product_id', v)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('All eligible products')} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProducts.map(p => (
                            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="bogo_quantity">{t('Buy Quantity')}</Label>
                        <Input id="bogo_quantity" name="bogo_quantity" type="number" min="1" value={formData.bogo_quantity} onChange={handleChange} />
                      </div>
                      <div>
                        <Label htmlFor="bogo_free_quantity">{t('Free Quantity')}</Label>
                        <Input id="bogo_free_quantity" name="bogo_free_quantity" type="number" min="1" value={formData.bogo_free_quantity} onChange={handleChange} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="starts_at">{t('Start Date')}</Label>
                    <Input id="starts_at" name="starts_at" type="datetime-local" value={formData.starts_at} onChange={handleChange} />
                  </div>
                  <div>
                    <Label htmlFor="expires_at">{t('End Date')}</Label>
                    <Input id="expires_at" name="expires_at" type="datetime-local" value={formData.expires_at} onChange={handleChange} />
                    <InputError message={errors.expires_at} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('Coupon Status')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Enable or disable the coupon')}</p>
                  </div>
                  <Switch checked={formData.status} onCheckedChange={(checked) => handleSwitchChange('status', checked)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──────────────── Restrictions Tab ──────────────── */}
          <TabsContent value="restrictions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Usage Restrictions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minimum_order_amount">{t('Minimum Order Amount')}</Label>
                    <Input id="minimum_order_amount" name="minimum_order_amount" type="number" step="0.01" value={formData.minimum_order_amount} onChange={handleChange} placeholder="0.00" />
                  </div>
                  <div>
                    <Label htmlFor="usage_limit">{t('Usage Limit (Total)')}</Label>
                    <Input id="usage_limit" name="usage_limit" type="number" min="1" value={formData.usage_limit} onChange={handleChange} placeholder={t('Unlimited')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="per_customer_limit">{t('Per Customer Limit')}</Label>
                    <Input id="per_customer_limit" name="per_customer_limit" type="number" min="1" value={formData.per_customer_limit} onChange={handleChange} placeholder={t('Unlimited')} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>{t('Exclude Sale Items')}</Label>
                      <p className="text-sm text-muted-foreground">{t('Coupon cannot be applied to products already on sale')}</p>
                    </div>
                    <Switch checked={formData.exclude_on_sale_items} onCheckedChange={(checked) => handleSwitchChange('exclude_on_sale_items', checked)} />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label>{t('First Order Only')}</Label>
                      <p className="text-sm text-muted-foreground">{t('Coupon applies only to first-time customers')}</p>
                    </div>
                    <Switch checked={formData.first_order_only} onCheckedChange={(checked) => handleSwitchChange('first_order_only', checked)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──────────────── Products & Categories Tab ──────────────── */}
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Included Products')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  className="mb-4"
                  placeholder={t('Search products...')}
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                  {filteredProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">{t('No products found')}</p>
                  ) : (
                    filteredProducts.map((product) => {
                      const included = isProductIncluded(product.id);
                      const excluded = isProductExcluded(product.id);
                      return (
                        <div key={product.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm truncate">{product.name}</span>
                            <span className="text-xs text-muted-foreground">${product.price}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={excluded ? 'destructive' : 'outline'}
                              className="h-7 text-xs"
                              onClick={() => toggleExcludedProduct(product.id)}
                            >
                              {excluded ? t('Excluded') : t('Exclude')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={included ? 'default' : 'outline'}
                              className="h-7 text-xs"
                              onClick={() => toggleProduct(product.id)}
                            >
                              {included ? t('Included') : t('Include')}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('Included Categories')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  className="mb-4"
                  placeholder={t('Search categories...')}
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                  {filteredCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">{t('No categories found')}</p>
                  ) : (
                    filteredCategories.map((category) => {
                      const selected = isCategorySelected(category.id);
                      return (
                        <div key={category.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                          <span className="text-sm">{category.name}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant={selected ? 'default' : 'outline'}
                            className="h-7 text-xs"
                            onClick={() => toggleCategory(category.id)}
                          >
                            {selected ? t('Selected') : t('Select')}
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──────────────── Regions Tab ──────────────── */}
          <TabsContent value="regions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('Geographic Restrictions')}</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addRegion}>
                  <Plus className="h-4 w-4 me-1" />
                  {t('Add Region')}
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('Leave empty to allow all regions. Add specific countries, states, or cities to restrict the coupon.')}
                </p>

                {formData.regions.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground">{t('No regional restrictions — coupon is available worldwide')}</p>
                    <Button type="button" variant="outline" className="mt-2" onClick={addRegion}>
                      <Plus className="h-4 w-4 me-1" />
                      {t('Add Restriction')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.regions.map((region: any, index: number) => (
                      <div key={index} className="flex flex-wrap items-end gap-3 p-3 border rounded-lg">
                        <div className="flex-1 min-w-[150px]">
                          <Label className="text-xs">{t('Country')}</Label>
                          <Select
                            value={region.country_id ? String(region.country_id) : ''}
                            onValueChange={(v) => updateRegion(index, 'country_id', v ? parseInt(v) : null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('All Countries')} />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                          <Label className="text-xs">{t('State')}</Label>
                          <Select
                            value={region.state_id ? String(region.state_id) : ''}
                            onValueChange={(v) => updateRegion(index, 'state_id', v ? parseInt(v) : null)}
                            disabled={!region.country_id}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('All States')} />
                            </SelectTrigger>
                            <SelectContent>
                              {getFilteredStates(region.country_id).map((s) => (
                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                          <Label className="text-xs">{t('City')}</Label>
                          <Select
                            value={region.city_id ? String(region.city_id) : ''}
                            onValueChange={(v) => updateRegion(index, 'city_id', v ? parseInt(v) : null)}
                            disabled={!region.state_id}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('All Cities')} />
                            </SelectTrigger>
                            <SelectContent>
                              {getFilteredCities(region.state_id).map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeRegion(index)} className="h-9">
                          <X className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addRegion}>
                      <Plus className="h-4 w-4 me-1" />
                      {t('Add Another Region')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </PageTemplate>
  );
}
