import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { addDays, addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function CalendarDatePicker({
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

  const selected = value ? new Date(value) : null;
  const monthStart = startOfMonth(view);
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(view) });
  const leadingBlanks = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
  const startOfWeekSun = new Date(2024, 0, 7); // a Sunday
  const weekDays = Array.from({ length: 7 }).map((_, i) =>
    format(addDays(startOfWeekSun, i), 'EEEEE', { locale: ar }),
  );

  const cells: (string | null)[] = [...Array(leadingBlanks).fill(null), ...days.map((d) => format(d, 'yyyy-MM-dd'))];

  const apply = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

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
            <span className={selected ? '' : 'text-muted-foreground'}>
              {selected ? format(selected, 'd MMMM yyyy', { locale: ar }) : t('Select date')}
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
                    onClick={() => apply(iso)}
                    disabled={!!((min && iso < min) || (max && iso > max))}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md text-sm transition hover:bg-accent',
                      iso === value ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary' : '',
                      (min && iso < min) || (max && iso > max) ? 'cursor-not-allowed opacity-40 hover:bg-transparent' : '',
                    )}
                  >
                    {Number(iso.slice(8))}
                  </button>
                ) : (
                  <div key={i} />
                ),
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function CreateCoupon() {
  const { t } = useTranslation();
  const { errors, storeCurrency, globalSettings } = usePage().props as any;
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    type: 'percentage',
    discount_amount: '',
    minimum_spend: '',
    maximum_spend: '',
    start_date: '',
    expiry_date: '',
    use_limit_per_coupon: '',
    use_limit_per_user: '1',
    status: true,
    single_use: false,
    code_type: 'manual',
  });

  const currencySymbol = storeCurrency?.symbol || globalSettings?.currencySymbol || '₪';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseFloat(value)) : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = () => {
    const submissionData = {
      ...formData,
      start_date: formData.start_date || null,
      expiry_date: formData.expiry_date || null,
    };
    router.post(route('coupon-system.store'), submissionData);
  };

  const handleCancel = () => router.visit(route('coupon-system.index'));

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, code: result }));
  };

  const isPercentage = formData.type === 'percentage';

  const pageActions = [
    {
      label: t('Save Coupon'),
      icon: <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: handleSubmit,
    },
  ];

  const inputError = (field: string) => <InputError message={errors?.[field]} />;

  return (
    <PageTemplate
      title={t('Create Coupon')}
      url="/coupon-system/create"
      actions={pageActions}
      backUrl={route('coupon-system.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Coupon System'), href: route('coupon-system.index') },
        { title: t('Create Coupon') },
      ]}
    >
      <form noValidate className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">{t('General')}</TabsTrigger>
            <TabsTrigger value="restrictions">{t('Restrictions')}</TabsTrigger>
            <TabsTrigger value="usage">{t('Usage Limits')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Coupon Information')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Label htmlFor="name" required>{t('Coupon Name')}</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={t('Enter coupon name')}
                      aria-invalid={!!errors?.name}
                    />
                    {inputError('name')}
                  </div>

                  <div className="grid gap-1">
                    <Label htmlFor="code" required>{t('Coupon Code')}</Label>
                    <div className="relative">
                      <Input
                        id="code"
                        name="code"
                        value={formData.code}
                        onChange={handleChange}
                        placeholder={t('SAVE20')}
                        className="pe-24"
                        aria-invalid={!!errors?.code}
                      />
                      <button
                        type="button"
                        onClick={generateCode}
                        className="absolute end-1.5 top-1/2 flex h-7 -translate-y-1/2 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {t('Generate')}
                      </button>
                    </div>
                    {inputError('code')}
                  </div>

                  <div className="grid gap-1 md:col-span-2">
                    <Label htmlFor="description">{t('Description')}</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder={t('Coupon description')}
                    />
                  </div>

                  <div className="grid gap-1">
                    <Label htmlFor="type" required>{t('Discount Type')}</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => handleSelectChange('type', value)}
                    >
                      <SelectTrigger aria-invalid={!!errors?.type}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">{t('Percentage Discount')}</SelectItem>
                        <SelectItem value="flat">{t('Fixed Amount')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {inputError('type')}
                  </div>

                  <div className="grid gap-1">
                    <Label htmlFor="discount_amount" required>
                      {isPercentage ? t('Discount Percentage (%)') : t('Discount Amount')}
                    </Label>
                    <div className="relative">
                      <Input
                        id="discount_amount"
                        name="discount_amount"
                        type="number"
                        step={isPercentage ? '1' : '0.01'}
                        value={formData.discount_amount}
                        onChange={handleChange}
                        placeholder={isPercentage ? '20' : '10.00'}
                        className={isPercentage ? '' : 'pe-14'}
                        aria-invalid={!!errors?.discount_amount}
                      />
                      {!isPercentage && (
                        <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm font-semibold text-muted-foreground">
                          {currencySymbol}
                        </span>
                      )}
                    </div>
                    {inputError('discount_amount')}
                  </div>

                  <CalendarDatePicker
                    id="start_date"
                    label={t('Start Date')}
                    value={formData.start_date}
                    onChange={(v) => handleSelectChange('start_date', v)}
                    max={formData.expiry_date || undefined}
                    required={false}
                  />

                  <CalendarDatePicker
                    id="expiry_date"
                    label={t('End Date')}
                    value={formData.expiry_date}
                    onChange={(v) => handleSelectChange('expiry_date', v)}
                    min={formData.start_date || undefined}
                    required={false}
                  />

                  <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2 md:items-start">
                    <div>
                      <Label>{t('Coupon Status')}</Label>
                      <p className="text-sm text-muted-foreground">{t('Enable or disable coupon')}</p>
                    </div>
                    <Switch
                      checked={formData.status}
                      onCheckedChange={(checked) => handleSwitchChange('status', checked)}
                    />
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
                    <Label htmlFor="minimum_spend">{t('Minimum Spend Amount')}</Label>
                    <div className="relative">
                      <Input
                        id="minimum_spend"
                        name="minimum_spend"
                        type="number"
                        step="0.01"
                        value={formData.minimum_spend}
                        onChange={handleChange}
                        placeholder="0.00"
                        className="pe-14"
                      />
                      <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm font-semibold text-muted-foreground">
                        {currencySymbol}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('Min spend helper')}</p>
                  </div>

                  <div className="grid gap-1">
                    <Label htmlFor="maximum_spend">{t('Maximum Spend Amount')}</Label>
                    <div className="relative">
                      <Input
                        id="maximum_spend"
                        name="maximum_spend"
                        type="number"
                        step="0.01"
                        value={formData.maximum_spend}
                        onChange={handleChange}
                        placeholder="0.00"
                        className="pe-14"
                      />
                      <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm font-semibold text-muted-foreground">
                        {currencySymbol}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('Max spend helper')}</p>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4 md:col-span-2">
                    <div>
                      <Label>{t('Single Use Only')}</Label>
                      <p className="text-sm text-muted-foreground">{t('Cannot be used with other discount coupons')}</p>
                    </div>
                    <Switch
                      checked={formData.single_use}
                      onCheckedChange={(checked) => handleSwitchChange('single_use', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Usage Limits')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Label htmlFor="use_limit_per_coupon">{t('Usage Limit per Coupon')}</Label>
                    <Input
                      id="use_limit_per_coupon"
                      name="use_limit_per_coupon"
                      type="number"
                      min={0}
                      step={1}
                      value={formData.use_limit_per_coupon}
                      onChange={handleChange}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">{t('Per coupon usage helper')}</p>
                  </div>

                  <div className="grid gap-1">
                    <Label htmlFor="use_limit_per_user">{t('Usage Limit per User')}</Label>
                    <Input
                      id="use_limit_per_user"
                      name="use_limit_per_user"
                      type="number"
                      min={1}
                      step={1}
                      value={formData.use_limit_per_user}
                      onChange={handleChange}
                      placeholder="1"
                    />
                    <p className="text-xs text-muted-foreground">{t('Per user usage helper')}</p>
                  </div>
                </div>
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
              {t('Save Coupon')}
            </Button>
          </div>
        </div>
      </form>
    </PageTemplate>
  );
}