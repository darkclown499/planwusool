import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  availableProducts: { id: number; name: string; price: number }[];
  availableCategories: { id: number; name: string }[];
  countries: { id: number; name: string; code: string }[];
  states: { id: number; name: string; country_id: number }[];
  cities: { id: number; name: string; state_id: number }[];
  discountTypes: { value: string; label: string }[];
}

function ComboboxSelect<T extends { id: number; name: string; price?: number }>({
  options,
  placeholder,
  selectedIds,
  onSelect,
  currencySymbol,
}: {
  options: T[];
  placeholder: string;
  selectedIds: number[];
  onSelect: (id: number) => void;
  currencySymbol: string;
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
              {typeof o.price === 'number' && (
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {currencySymbol} {o.price}
                </span>
              )}
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
  const startOfWeekSun = new Date(2024, 0, 7); // a Sunday
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

export default function CreateAdvancedCoupon({ availableProducts, availableCategories, countries, states, cities, discountTypes }: Props) {
  const { t } = useTranslation();
  const { errors, storeCurrency, globalSettings } = usePage().props as any;

  const currencySymbol = storeCurrency?.symbol || globalSettings?.currencySymbol || '₪';

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    code_type: 'manual' as 'manual' | 'auto',
    description: '',
    discount_type: 'fixed',
    discount_value: '',
    max_discount_amount: '',
    minimum_order_amount: '',
    usage_limit: '',
    per_customer_limit: '',
    exclude_on_sale_items: false,
    first_order_only: false,
    starts_at: '',
    expires_at: '',
    status: true,
    // BOGO
    bogo_product_id: '',
    bogo_quantity: '1',
    bogo_free_quantity: '1',
    // Product bindings
    product_ids: [] as number[],
    excluded_product_ids: [] as number[],
    category_ids: [] as number[],
    // Regions
    regions: [] as { country_id: number | null; state_id: number | null; city_id: number | null }[],
  });

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
      excluded_product_ids: prev.excluded_product_ids.filter(id => id !== productId),
    }));
  };

  const removeProduct = (productId: number) => {
    setFormData(prev => ({
      ...prev,
      product_ids: prev.product_ids.filter(id => id !== productId),
      excluded_product_ids: prev.excluded_product_ids.filter(id => id !== productId),
    }));
  };

  const productsAdded = [...formData.product_ids, ...formData.excluded_product_ids]
    .map(id => availableProducts.find(p => p.id === id))
    .filter((p): p is { id: number; name: string; price: number } => !!p);

  const removeCategory = (categoryId: number) => {
    setFormData(prev => ({ ...prev, category_ids: prev.category_ids.filter(id => id !== categoryId) }));
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
      // Clear sub-levels when changing parent
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
      regions: prev.regions.filter((_, i) => i !== index),
    }));
  };

  const applyRegionPreset = (preset: string) => {
    // "all" clears every restriction (coupon valid everywhere).
    if (preset === 'all') {
      setFormData(prev => ({ ...prev, regions: [] }));
      return;
    }

    // Resolve the Palestine country from the loaded options.
    const palestine = countries.find((c) => /palestine|فلسطين/i.test(c.name));
    if (!palestine) return;

    const statePattern = preset === 'west_bank' ? /west bank|الضفة/i : /jerusalem|القدس|interior|الداخل/i;
    const state = states.find((s) => s.country_id === palestine.id && statePattern.test(s.name));
    if (!state) return;

    const exists = formData.regions.some(
      (r) => r.country_id === palestine.id && r.state_id === state.id && r.city_id === null,
    );
    setFormData(prev => ({
      ...prev,
      // Re-clicking the same preset removes it; otherwise fill one row.
      regions: exists
        ? prev.regions.filter((r) => !(r.country_id === palestine.id && r.state_id === state.id))
        : [{ country_id: palestine.id, state_id: state.id, city_id: null }],
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
      regions: formData.regions.map(r => ({
        country_id: r.country_id || null,
        state_id: r.state_id || null,
        city_id: r.city_id || null,
      })),
    };

    router.post(route('advanced-coupons.store'), submissionData);
  };

  const handleCancel = () => router.visit(route('advanced-coupons.index'));

  const isPercentageDiscount = formData.discount_type === 'percentage';
  const discountShowsValue = formData.discount_type !== 'free_shipping' && formData.discount_type !== 'buy_one_get_one';

  const pageActions = [
    {
      label: t('Save Advanced Coupon'),
      icon: <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: handleSubmit,
    },
  ];

  return (
    <PageTemplate
      title={t('Create Advanced Coupon')}
      description={t('Create a powerful promotional coupon with smart discount rules')}
      url="/advanced-coupons/create"
      actions={pageActions}
      backUrl={route('advanced-coupons.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Advanced Coupons'), href: route('advanced-coupons.index') },
        { title: t('Create Advanced Coupon') },
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
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Label htmlFor="name" required>{t('Coupon Name')}</Label>
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
                      <Label htmlFor="code" required>{t('Coupon Code')}</Label>
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
                    <Textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder={t('Coupon description (optional)')} />
                  </div>

                  <div className="grid gap-1">
                    <Label htmlFor="discount_type" required>{t('Discount Type')}</Label>
                    <Select value={formData.discount_type} onValueChange={(v) => handleSelectChange('discount_type', v)}>
                      <SelectTrigger aria-label={t('Discount Type')}>
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

                  {discountShowsValue && (
                    <div className="grid gap-1">
                      <Label htmlFor="discount_value" required>
                        {isPercentageDiscount ? t('Discount Percentage (%)') : t('Discount Amount')}
                      </Label>
                      <div className="relative">
                        <Input
                          id="discount_value"
                          name="discount_value"
                          type="number"
                          step={isPercentageDiscount ? '1' : '0.01'}
                          value={formData.discount_value}
                          onChange={handleChange}
                          placeholder={isPercentageDiscount ? '20' : '10.00'}
                          className={isPercentageDiscount ? '' : 'pe-14'}
                        />
                        {!isPercentageDiscount && (
                          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm font-semibold text-muted-foreground">
                            {currencySymbol}
                          </span>
                        )}
                      </div>
                      <InputError message={errors.discount_value} />
                    </div>
                  )}

                  {isPercentageDiscount && (
                    <div className="grid gap-1 md:col-span-2">
                      <Label htmlFor="max_discount_amount">{t('Maximum Discount Amount')}</Label>
                      <div className="relative">
                        <Input
                          id="max_discount_amount"
                          name="max_discount_amount"
                          type="number"
                          step="0.01"
                          value={formData.max_discount_amount}
                          onChange={handleChange}
                          placeholder={t('Leave empty for no limit')}
                          className="pe-14"
                        />
                        <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm font-semibold text-muted-foreground">
                          {currencySymbol}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{t('Protect your profit margin by capping the discount')}</p>
                    </div>
                  )}

                  {formData.discount_type === 'buy_one_get_one' && (
                    <div className="grid grid-cols-1 gap-4 p-4 rounded-lg border bg-muted/20 md:col-span-2 md:grid-cols-2">
                      <div>
                        <Label htmlFor="bogo_product_id">{t('Specific Product (Optional)')}</Label>
                        <Select value={formData.bogo_product_id} onValueChange={(v) => handleSelectChange('bogo_product_id', v)}>
                          <SelectTrigger aria-label={t('Specific Product')}>
                            <SelectValue placeholder={t('All eligible products')} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProducts.map(p => (
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
                      <Label>{t('Coupon Status')}</Label>
                      <p className="text-sm text-muted-foreground">{t('Enable or disable the coupon')}</p>
                    </div>
                    <Switch checked={formData.status} onCheckedChange={(checked) => handleSwitchChange('status', checked)} />
                  </div>
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
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Label htmlFor="minimum_order_amount">{t('Minimum Order Amount')}</Label>
                    <div className="relative">
                      <Input
                        id="minimum_order_amount"
                        name="minimum_order_amount"
                        type="number"
                        step="0.01"
                        value={formData.minimum_order_amount}
                        onChange={handleChange}
                        placeholder="0.00"
                        className="pe-14"
                      />
                      <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm font-semibold text-muted-foreground">
                        {currencySymbol}
                      </span>
                    </div>
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
                        <p className="text-sm text-muted-foreground">{t('Coupon cannot be applied to products already on sale')}</p>
                      </div>
                      <Switch checked={formData.exclude_on_sale_items} onCheckedChange={(checked) => handleSwitchChange('exclude_on_sale_items', checked)} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <Label>{t('First Order Only')}</Label>
                        <p className="text-sm text-muted-foreground">{t('Coupon applies only to first-time customers')}</p>
                      </div>
                      <Switch checked={formData.first_order_only} onCheckedChange={(checked) => handleSwitchChange('first_order_only', checked)} />
                    </div>
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
                <CardDescription>{t('Search and add products, then keep them included or excluded.')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ComboboxSelect
                  options={availableProducts}
                  placeholder={t('Add products')}
                  selectedIds={[...formData.product_ids, ...formData.excluded_product_ids]}
                  currencySymbol={currencySymbol}
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
                            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                              {currencySymbol} {product.price}
                            </span>
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
                <CardDescription>{t('Search and add the categories this coupon applies to.')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ComboboxSelect
                  options={availableCategories}
                  placeholder={t('Add categories')}
                  selectedIds={formData.category_ids}
                  currencySymbol={currencySymbol}
                  onSelect={(id) => toggleCategory(id)}
                />
                {formData.category_ids.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('No categories selected yet')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.category_ids.map((id) => {
                      const category = availableCategories.find((c) => c.id === id);
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

          {/* ──────────────── Regions Tab ──────────────── */}
          <TabsContent value="regions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {t('Geographic Restrictions')}
                </CardTitle>
                <CardDescription>
                  {t('Leave empty to allow all regions. Add specific countries, states, or cities to restrict the coupon.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick regional presets */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{t('Quick presets')}:</span>
                  {[
                    { value: 'all', label: t('All Regions') },
                    { value: 'west_bank', label: t('West Bank') },
                    { value: 'jerusalem', label: t('Jerusalem & Interior') },
                  ].map((p) => (
                    <Button
                      key={p.value}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full text-xs"
                      onClick={() => applyRegionPreset(p.value)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>

                {formData.regions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
                      <MapPin className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-muted-foreground">
                      {t('No geographic restrictions — coupon is available for all regions')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('Add a region to limit where this coupon can be used')}
                    </p>
                    <Button type="button" variant="outline" className="mt-4" onClick={addRegion}>
                      <Plus className="h-4 w-4 me-2" />
                      {t('Add Geographic Restriction')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.regions.map((region, index) => (
                      <div key={index} className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
                        <div className="grid flex-1 grid-cols-1 gap-3 sm:min-w-[320px] sm:grid-cols-3">
                          <div className="grid gap-1">
                            <Label htmlFor={`region-${index}-country`} className="text-xs">{t('Country')}</Label>
                            <Select
                              value={region.country_id ? String(region.country_id) : ''}
                              onValueChange={(v) => updateRegion(index, 'country_id', v ? parseInt(v) : null)}
                            >
                              <SelectTrigger id={`region-${index}-country`} aria-label={t('Country')}>
                                <SelectValue placeholder={t('All Countries')} />
                              </SelectTrigger>
                              <SelectContent>
                                {countries.map((c) => (
                                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-1">
                            <Label htmlFor={`region-${index}-state`} className="text-xs">{t('Province / Region')}</Label>
                            <Select
                              value={region.state_id ? String(region.state_id) : ''}
                              onValueChange={(v) => updateRegion(index, 'state_id', v ? parseInt(v) : null)}
                              disabled={!region.country_id}
                            >
                              <SelectTrigger id={`region-${index}-state`} aria-label={t('Province / Region')}>
                                <SelectValue placeholder={t('All States')} />
                              </SelectTrigger>
                              <SelectContent>
                                {getFilteredStates(region.country_id).map((s) => (
                                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-1">
                            <Label htmlFor={`region-${index}-city`} className="text-xs">{t('City')}</Label>
                            <Select
                              value={region.city_id ? String(region.city_id) : ''}
                              onValueChange={(v) => updateRegion(index, 'city_id', v ? parseInt(v) : null)}
                              disabled={!region.state_id}
                            >
                              <SelectTrigger id={`region-${index}-city`} aria-label={t('City')}>
                                <SelectValue placeholder={t('All Cities')} />
                              </SelectTrigger>
                              <SelectContent>
                                {getFilteredCities(region.state_id).map((c) => (
                                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 self-end p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => removeRegion(index)}
                              aria-label={t('Delete Region')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t('Delete Region')}</TooltipContent>
                        </Tooltip>
                      </div>
                    ))}

                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={addRegion}>
                      <Plus className="h-4 w-4 me-2" />
                      {t('Add New Geographic Region')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sticky form action footer */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t('Cancel')} / {t('Back')}
            </Button>
            <Button type="button" onClick={handleSubmit}>
              <Save className="h-4 w-4 me-2" />
              {t('Save Advanced Coupon')}
            </Button>
          </div>
        </div>
      </form>
    </PageTemplate>
  );
}