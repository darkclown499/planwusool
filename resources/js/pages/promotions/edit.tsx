import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  products: { id: number; name: string }[];
  categories: { id: number; name: string }[];
  promotion: any;
}

const DISCOUNT_TYPES = [
  { value: 'fixed', labelKey: 'Fixed Amount' },
  { value: 'percentage', labelKey: 'Percentage Discount' },
  { value: 'free_shipping', labelKey: 'Free Shipping' },
  { value: 'buy_one_get_one', labelKey: 'Buy 1 Get 1' },
  { value: 'quantity', labelKey: 'Quantity Discount' },
];

const AUDIENCE_OPTIONS = [
  { value: 'everyone', labelKey: 'Everyone' },
  { value: 'registered', labelKey: 'Registered Customers' },
  { value: 'first_order', labelKey: 'First Order Only' },
  { value: 'repeat', labelKey: 'Repeat Customers' },
];

function ComboboxSelect({
  options,
  placeholder,
  selectedIds,
  onSelect,
}: {
  options: { id: number; name: string }[];
  placeholder: string;
  selectedIds: number[];
  onSelect: (id: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = options.filter(
    (o) => !selectedIds.includes(o.id) && o.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative">
      <Search className="absolute start-9 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="ps-14"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(o.id);
                setQuery('');
              }}
              className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-sm transition hover:bg-accent"
            >
              <span className="truncate">{o.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DateTimePicker({
  id,
  label,
  value,
  onChange,
  min,
  max,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => (value ? new Date(value) : new Date()));
  const [pickedDate, setPickedDate] = useState<string>(value ? value.slice(0, 10) : '');
  const [pickedTime, setPickedTime] = useState<string>(value ? value.slice(11, 16) : '12:00');

  const parsed = value ? new Date(value) : null;
  const monthStart = startOfMonth(view);
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(view) });
  const leadingBlanks = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
  const startOfWeekSun = new Date(2024, 0, 7);
  const weekDays = Array.from({ length: 7 }).map((_, i) => format(addDays(startOfWeekSun, i), 'EEEEE', { locale: ar }));

  const cells: (string | null)[] = [...Array(leadingBlanks).fill(null), ...days.map((d) => format(d, 'yyyy-MM-dd'))];

  const apply = () => {
    if (!pickedDate) return;
    onChange(`${pickedDate}T${pickedTime || '00:00'}`);
    setOpen(false);
  };

  const displayTime = value ? value.slice(11, 16) : pickedTime;

  return (
    <div>
      <Label htmlFor={id} required={required}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="mt-1.5 h-10 w-full justify-start gap-2 font-normal"
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className={parsed ? '' : 'text-muted-foreground'}>
              {parsed ? `${format(parsed, 'd MMMM yyyy', { locale: ar })} - ${displayTime}` : t('Select date and time')}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" size="icon" onClick={() => setView((v) => subMonths(v, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{format(view, 'MMMM yyyy', { locale: ar })}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => setView((v) => addMonths(v, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
              {weekDays.map((d, i) => (
                <div key={i} className="flex h-7 items-center justify-center">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((iso, i) =>
                iso ? (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPickedDate(iso)}
                    disabled={!!((min && iso < min.slice(0, 10)) || (max && iso > max.slice(0, 10)))}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md text-sm transition hover:bg-accent',
                      iso === pickedDate ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary' : '',
                      (min && iso < min.slice(0, 10)) || (max && iso > max.slice(0, 10))
                        ? 'cursor-not-allowed opacity-40 hover:bg-transparent'
                        : '',
                    )}
                  >
                    {Number(iso.slice(8))}
                  </button>
                ) : (
                  <div key={i} />
                ),
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 border-t pt-3">
              <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                type="time"
                dir="ltr"
                value={pickedTime}
                onChange={(e) => setPickedTime(e.target.value)}
                className="h-9 flex-1"
              />
              <Button type="button" size="sm" onClick={apply} disabled={!pickedDate}>
                {t('Apply')}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function EditPromotion({ products, categories, promotion }: Props) {
  const { t } = useTranslation();
  const { errors } = usePage().props as any;

  const initialTiers = (promotion.quantity_tiers || []).map((tier: any) => ({
    min_qty: String(tier.min_qty ?? ''),
    discount_value: String(tier.discount_value ?? ''),
    max_discount_amount: String(tier.max_discount_amount ?? ''),
  }));

  const [formData, setFormData] = useState({
    name: promotion.name || '',
    code: promotion.code || '',
    code_type: promotion.code_type || 'manual' as 'manual' | 'auto',
    description: promotion.description || '',
    discount_type: promotion.discount_type || 'fixed',
    discount_value: promotion.discount_value ? String(promotion.discount_value) : '',
    max_discount_amount: promotion.max_discount_amount ? String(promotion.max_discount_amount) : '',
    quantity_tiers: initialTiers,
    minimum_order_amount: promotion.minimum_order_amount ? String(promotion.minimum_order_amount) : '',
    usage_limit: promotion.usage_limit || '',
    per_customer_limit: promotion.per_customer_limit || '',
    exclude_on_sale_items: !!promotion.exclude_on_sale_items,
    first_order_only: !!promotion.first_order_only,
    audience: promotion.audience || 'everyone',
    stackable: !!promotion.stackable,
    starts_at: promotion.starts_at || '',
    expires_at: promotion.expires_at || '',
    status: promotion.status ?? true,
    bogo_product_id: promotion.bogo_product_id ? String(promotion.bogo_product_id) : '',
    bogo_quantity: String(promotion.bogo_quantity || 1),
    bogo_free_quantity: String(promotion.bogo_free_quantity || 1),
    product_ids: (promotion.product_ids || []) as number[],
    excluded_product_ids: (promotion.excluded_product_ids || []) as number[],
    category_ids: Array.isArray(promotion.category_ids)
      ? promotion.category_ids.map((id: any) => (typeof id === 'object' ? id.id : Number(id)))
      : [],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, code: result }));
  };

  const toggleProduct = (productId: number) => {
    setFormData((prev) => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter((id) => id !== productId)
        : [...prev.product_ids, productId],
      excluded_product_ids: prev.excluded_product_ids.filter((id) => id !== productId),
    }));
  };

  const toggleExcludedProduct = (productId: number) => {
    setFormData((prev) => ({
      ...prev,
      excluded_product_ids: prev.excluded_product_ids.includes(productId)
        ? prev.excluded_product_ids.filter((id) => id !== productId)
        : [...prev.excluded_product_ids, productId],
      product_ids: prev.product_ids.filter((id) => id !== productId),
    }));
  };

  const removeProduct = (productId: number) => {
    setFormData((prev) => ({
      ...prev,
      product_ids: prev.product_ids.filter((id) => id !== productId),
      excluded_product_ids: prev.excluded_product_ids.filter((id) => id !== productId),
    }));
  };

  const toggleCategory = (categoryId: number) => {
    setFormData((prev) => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter((id: any) => id !== categoryId)
        : [...prev.category_ids, categoryId],
    }));
  };

  const removeCategory = (categoryId: number) => {
    setFormData((prev) => ({ ...prev, category_ids: prev.category_ids.filter((id: any) => id !== categoryId) }));
  };

  const addTier = () => {
    setFormData((prev) => ({
      ...prev,
      quantity_tiers: [...prev.quantity_tiers, { min_qty: '2', discount_value: '', max_discount_amount: '' }],
    }));
  };

  const updateTier = (index: number, field: string, value: string) => {
    setFormData((prev) => {
      const tiers = [...prev.quantity_tiers];
      tiers[index] = { ...tiers[index], [field]: value };
      return { ...prev, quantity_tiers: tiers };
    });
  };

  const removeTier = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      quantity_tiers: prev.quantity_tiers.filter((_: any, i: number) => i !== index),
    }));
  };

  const productsAdded = [...formData.product_ids, ...formData.excluded_product_ids]
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is { id: number; name: string } => !!p);

  const handleSubmit = () => {
    const submissionData = {
      ...formData,
      discount_value: formData.discount_value ? parseFloat(formData.discount_value) : 0,
      max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
      minimum_order_amount: formData.minimum_order_amount ? parseFloat(formData.minimum_order_amount) : 0,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      per_customer_limit: formData.per_customer_limit ? parseInt(formData.per_customer_limit) : null,
      quantity_tiers: formData.quantity_tiers.map((tier: any) => ({
        min_qty: parseInt(tier.min_qty) || 2,
        discount_value: parseFloat(tier.discount_value) || 0,
        max_discount_amount: tier.max_discount_amount ? parseFloat(tier.max_discount_amount) : null,
      })),
      bogo_product_id: formData.bogo_product_id ? parseInt(formData.bogo_product_id) : null,
      bogo_quantity: parseInt(formData.bogo_quantity || '1'),
      bogo_free_quantity: parseInt(formData.bogo_free_quantity || '1'),
      starts_at: formData.starts_at || null,
      expires_at: formData.expires_at || null,
      stackable: formData.stackable,
    };

    router.put(route('promotions.update', promotion.id), submissionData);
  };

  const handleCancel = () => router.visit(route('promotions.index'));

  const isPercentageDiscount = formData.discount_type === 'percentage';
  const isQuantityDiscount = formData.discount_type === 'quantity';
  const isBogo = formData.discount_type === 'buy_one_get_one';
  const isFreeShipping = formData.discount_type === 'free_shipping';
  const discountShowsValue = !isFreeShipping && !isBogo && !isQuantityDiscount;

  return (
    <PageTemplate
      title={t('Edit Promotion')}
      description={formData.name || t('Edit this promotion')}
      url={`/promotions/${promotion.id}/edit`}
      backUrl={route('promotions.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Promotions'), href: route('promotions.index') },
        { title: t('Edit Promotion') },
      ]}
    >
      <form noValidate className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">{t('General')}</TabsTrigger>
            <TabsTrigger value="restrictions">{t('Restrictions')}</TabsTrigger>
            <TabsTrigger value="products">{t('Products & Categories')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Promotion Information')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Label htmlFor="name" required>{t('Promotion Name')}</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} placeholder={t('e.g. Summer Sale')} />
                    <InputError message={errors.name} />
                  </div>

                  <div className="grid gap-1">
                    <Label htmlFor="code_type">{t('Code Type')}</Label>
                    <Select value={formData.code_type} onValueChange={(v) => handleSelectChange('code_type', v)}>
                      <SelectTrigger aria-label={t('Code Type')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">{t('Manual Code')}</SelectItem>
                        <SelectItem value="auto">{t('Auto Generate')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.code_type === 'manual' && (
                    <div className="grid gap-1 md:col-span-2">
                      <Label htmlFor="code" required>{t('Promotion Code')}</Label>
                      <div className="relative">
                        <Input
                          id="code"
                          name="code"
                          value={formData.code}
                          onChange={handleChange}
                          placeholder={t('e.g. SUMMER20')}
                          className="pe-24"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          onClick={generateCode}
                          className="absolute end-1.5 top-1/2 flex h-7 -translate-y-1/2 gap-1 px-2.5 text-xs"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          {t('Generate')}
                        </Button>
                      </div>
                      <InputError message={errors.code} />
                    </div>
                  )}

                  <div className="grid gap-1 md:col-span-2">
                    <Label htmlFor="description">{t('Description')}</Label>
                    <Textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder={t('Promotion description (optional)')} />
                  </div>

                  <div className="grid gap-1">
                    <Label htmlFor="discount_type" required>{t('Discount Type')}</Label>
                    <Select value={formData.discount_type} onValueChange={(v) => handleSelectChange('discount_type', v)}>
                      <SelectTrigger aria-label={t('Discount Type')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISCOUNT_TYPES.map((dt) => (
                          <SelectItem key={dt.value} value={dt.value}>{t(dt.labelKey)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <InputError message={errors.discount_type} />
                  </div>

                  {discountShowsValue && (
                    <div className="grid gap-1">
                      <Label htmlFor="discount_value" required>
                        {isPercentageDiscount ? t('Discount Percentage (%)') : t('Discount Amount')}
                      </Label>
                      <Input
                        id="discount_value"
                        name="discount_value"
                        type="number"
                        step={isPercentageDiscount ? '1' : '0.01'}
                        value={formData.discount_value}
                        onChange={handleChange}
                        placeholder={isPercentageDiscount ? '20' : '10.00'}
                      />
                      <InputError message={errors.discount_value} />
                    </div>
                  )}

                  {isPercentageDiscount && (
                    <div className="grid gap-1 md:col-span-2">
                      <Label htmlFor="max_discount_amount">{t('Maximum Discount Amount')}</Label>
                      <Input
                        id="max_discount_amount"
                        name="max_discount_amount"
                        type="number"
                        step="0.01"
                        value={formData.max_discount_amount}
                        onChange={handleChange}
                        placeholder={t('Leave empty for no limit')}
                      />
                      <p className="text-xs text-muted-foreground">{t('Protect your profit margin by capping the discount')}</p>
                    </div>
                  )}

                  {isQuantityDiscount && (
                    <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/20 p-4">
                      <div className="flex items-center justify-between">
                        <Label>{t('Quantity Discount Tiers')}</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addTier}>
                          <Plus className="h-4 w-4 me-1" />
                          {t('Add Tier')}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{t('Apply a discount when the cart quantity reaches a threshold')}</p>
                      <InputError message={errors.quantity_tiers} />
                      {formData.quantity_tiers.length === 0 && (
                        <p className="text-sm text-muted-foreground">{t('No tiers added. Add at least one quantity threshold.')}</p>
                      )}
                      {formData.quantity_tiers.map((tier: any, index: number) => (
                        <div key={index} className="flex flex-wrap items-end gap-3 rounded-md border bg-background p-3">
                          <div className="grid gap-1">
                            <Label className="text-xs">{t('Min Quantity')}</Label>
                            <Input
                              type="number"
                              min="2"
                              value={tier.min_qty}
                              onChange={(e) => updateTier(index, 'min_qty', e.target.value)}
                              className="w-28"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs">{t('Discount %')}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={tier.discount_value}
                              onChange={(e) => updateTier(index, 'discount_value', e.target.value)}
                              className="w-28"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label className="text-xs">{t('Max Discount Amount (Optional)')}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={tier.max_discount_amount}
                              onChange={(e) => updateTier(index, 'max_discount_amount', e.target.value)}
                              className="w-32"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => removeTier(index)}
                            aria-label={t('Remove Tier')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {isBogo && (
                    <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/20 p-4 md:col-span-2 md:grid-cols-2">
                      <div>
                        <Label htmlFor="bogo_product_id">{t('Specific Product (Optional)')}</Label>
                        <Select value={formData.bogo_product_id} onValueChange={(v) => handleSelectChange('bogo_product_id', v)}>
                          <SelectTrigger aria-label={t('Specific Product')}>
                            <SelectValue placeholder={t('All eligible products')} />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                  <div className="grid gap-1">
                    <Label htmlFor="audience">{t('Customer Eligibility')}</Label>
                    <Select value={formData.audience} onValueChange={(v) => handleSelectChange('audience', v)}>
                      <SelectTrigger aria-label={t('Customer Eligibility')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AUDIENCE_OPTIONS.map((ao) => (
                          <SelectItem key={ao.value} value={ao.value}>{t(ao.labelKey)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <InputError message={errors.audience} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label>{t('Stackable')}</Label>
                      <p className="text-sm text-muted-foreground">{t('Allow this promotion to stack with other discounts')}</p>
                    </div>
                    <Switch checked={formData.stackable} onCheckedChange={(checked) => handleSwitchChange('stackable', checked)} />
                  </div>

                  <DateTimePicker
                    id="starts_at"
                    label={t('Start Date')}
                    value={formData.starts_at}
                    onChange={(v) => handleSelectChange('starts_at', v)}
                    max={formData.expires_at || undefined}
                  />

                  <DateTimePicker
                    id="expires_at"
                    label={t('End Date')}
                    value={formData.expires_at}
                    onChange={(v) => handleSelectChange('expires_at', v)}
                    min={formData.starts_at || undefined}
                  />
                  {errors.expires_at && <div className="md:col-span-2"><InputError message={errors.expires_at} /></div>}

                  <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
                    <div>
                      <Label>{t('Promotion Status')}</Label>
                      <p className="text-sm text-muted-foreground">{t('Enable or disable the promotion')}</p>
                    </div>
                    <Switch checked={formData.status} onCheckedChange={(checked) => handleSwitchChange('status', checked)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="restrictions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Usage Restrictions')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Label htmlFor="minimum_order_amount">{t('Minimum Order Amount')}</Label>
                    <Input
                      id="minimum_order_amount"
                      name="minimum_order_amount"
                      type="number"
                      step="0.01"
                      value={formData.minimum_order_amount}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="grid gap-1">
                    <Label htmlFor="usage_limit">{t('Usage Limit (Total)')}</Label>
                    <Input id="usage_limit" name="usage_limit" type="number" min="1" value={formData.usage_limit} onChange={handleChange} placeholder={t('Unlimited')} />
                  </div>

                  <div className="grid gap-1">
                    <Label htmlFor="per_customer_limit">{t('Per Customer Limit')}</Label>
                    <Input id="per_customer_limit" name="per_customer_limit" type="number" min="1" value={formData.per_customer_limit} onChange={handleChange} placeholder={t('Unlimited')} />
                  </div>

                  <div className="grid gap-1 md:grid-cols-2 md:gap-6 md:col-span-2">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <Label>{t('Exclude Sale Items')}</Label>
                        <p className="text-sm text-muted-foreground">{t('Promotion cannot be applied to products already on sale')}</p>
                      </div>
                      <Switch checked={formData.exclude_on_sale_items} onCheckedChange={(checked) => handleSwitchChange('exclude_on_sale_items', checked)} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <Label>{t('First Order Only')}</Label>
                        <p className="text-sm text-muted-foreground">{t('Promotion applies only to first-time customers')}</p>
                      </div>
                      <Switch checked={formData.first_order_only} onCheckedChange={(checked) => handleSwitchChange('first_order_only', checked)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Included Products')}</CardTitle>
                <CardDescription>{t('Search and add products, then keep them included or excluded.')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ComboboxSelect
                  options={products}
                  placeholder={t('Add products')}
                  selectedIds={[...formData.product_ids, ...formData.excluded_product_ids]}
                  onSelect={(id) => toggleProduct(id)}
                />
                {productsAdded.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('No products selected yet')}</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    {productsAdded.map((product) => {
                      const isIncluded = formData.product_ids.includes(product.id);
                      return (
                        <div
                          key={product.id}
                          className={cn(
                            'flex items-center justify-between gap-3 border-b p-3 last:border-b-0 transition-colors',
                            isIncluded ? 'bg-emerald-50/60' : 'bg-red-50/60',
                          )}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <span className="truncate text-sm font-medium">{product.name}</span>
                            <Badge variant={isIncluded ? 'success' : 'destructive'}>
                              {isIncluded ? t('Included') : t('Excluded')}
                            </Badge>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => (isIncluded ? toggleExcludedProduct(product.id) : toggleProduct(product.id))}
                            >
                              {isIncluded ? t('Exclude') : t('Include')}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => removeProduct(product.id)}
                              aria-label={t('Remove')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('Included Categories')}</CardTitle>
                <CardDescription>{t('Search and add the categories this promotion applies to.')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ComboboxSelect
                  options={categories}
                  placeholder={t('Add categories')}
                  selectedIds={formData.category_ids}
                  onSelect={(id) => toggleCategory(id)}
                />
                {formData.category_ids.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('No categories selected yet')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.category_ids.map((id: any) => {
                      const category = categories.find((c) => c.id === id);
                      if (!category) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
                        >
                          <Badge variant="success" className="px-0 py-0 bg-transparent text-emerald-700">
                            {t('Selected')}
                          </Badge>
                          {category.name}
                          <button
                            type="button"
                            onClick={() => removeCategory(id)}
                            aria-label={t('Remove')}
                            className="text-emerald-600 transition hover:text-emerald-900"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t('Cancel')} / {t('Back')}
            </Button>
            <Button type="button" onClick={handleSubmit}>
              <Save className="h-4 w-4 me-2" />
              {t('Save Promotion')}
            </Button>
          </div>
        </div>
      </form>
    </PageTemplate>
  );
}