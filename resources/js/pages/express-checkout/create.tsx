import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Link, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';

const PAYMENT_GATEWAYS = [
  { value: 'credit_card', labelKey: 'Credit/Debit Cards' },
  { value: 'paypal', labelKey: 'PayPal' },
  { value: 'apple_pay', labelKey: 'Apple Pay' },
  { value: 'google_pay', labelKey: 'Google Pay' },
  { value: 'samsung_pay', labelKey: 'Samsung Pay' },
] as const;

function GatewayLogo({ value, label }: { value: string; label: string }) {
  if (value === 'samsung_pay') {
    return (
      <span dir="ltr" className="flex items-center justify-center">
        <svg viewBox="0 0 112 40" className="h-8 w-auto" aria-hidden="true">
          <rect width="112" height="40" rx="6" fill="#ffffff" />
          <rect x="1" y="1" width="110" height="38" rx="5" fill="none" stroke="#e2e8f0" strokeWidth="1" />
          <text x="56" y="26" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1428A0" fontFamily="Arial, sans-serif">
            SAMSUNG Pay
          </text>
        </svg>
      </span>
    );
  }

  if (value === 'credit_card') {
    return (
      <span dir="ltr" className="flex items-center gap-2">
        <img src="/images/logos/Visa.png" alt={label} className="h-6 w-auto max-w-[72px] object-contain" />
        <img src="/images/logos/MasterCard.png" alt={label} className="h-6 w-auto max-w-[72px] object-contain" />
      </span>
    );
  }

  const logoMap: Record<string, string> = {
    paypal: '/images/logos/paypal.png',
    apple_pay: '/images/logos/apple.png',
    google_pay: '/images/logos/google.png',
  };

  return <img src={logoMap[value]} alt={label} className="h-6 w-auto max-w-[88px] object-contain" />;
}

export default function CreateExpressCheckout() {
  const { t } = useTranslation();
  const { errors } = usePage().props as any;
  const [checkoutType, setCheckoutType] = useState('buy_now');
  const [formData, setFormData] = useState({
    name: '',
    type: 'buy_now',
    description: '',
    button_text: 'اشترِ الآن',
    button_color: '#000000',
    is_active: true,
    payment_methods: ['credit_card', 'paypal'],
    default_payment_method: 'credit_card',
    skip_cart: true,
    auto_fill_customer_data: true,
    guest_checkout_allowed: false,
    mobile_optimized: true,
    save_payment_methods: false,
    success_redirect_url: '',
    cancel_redirect_url: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTypeChange = (value: string) => {
    setCheckoutType(value);
    setFormData(prev => ({
      ...prev,
      type: value
    }));
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    setFormData(prev => {
      let methods = [...(prev.payment_methods || [])];

      if (checked && !methods.includes(method)) {
        methods.push(method);
      } else if (!checked && methods.includes(method)) {
        methods = methods.filter(m => m !== method);
      }

      const currentDefault = prev.default_payment_method || '';
      const defaultPaymentMethod = methods.includes(currentDefault) ? currentDefault : (methods[0] || '');

      return {
        ...prev,
        payment_methods: methods,
        default_payment_method: defaultPaymentMethod
      };
    });
  };

  const handleDefaultPaymentChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      default_payment_method: value
    }));
  };

  const getPaymentGatewayLabel = (value: string) => {
    const gateway = PAYMENT_GATEWAYS.find((g) => g.value === value);
    return gateway ? t(gateway.labelKey) : value;
  };

  const handleSubmit = () => {
    router.post(route('express-checkout.store'), formData);
  };

  const handleCancel = () => router.visit(route('express-checkout.index'));

  const pageActions = [
    {
      label: t('Save Checkout'),
      icon: <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: () => handleSubmit()
    }
  ];

  return (
    <PageTemplate 
      title={t('Create Express Checkout')}
      url="/express-checkout/create"
      actions={pageActions}
      backUrl={route('express-checkout.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Express Checkout'), href: route('express-checkout.index') },
        { title: t('Create Express Checkout') }
      ]}
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">{t('General')}</TabsTrigger>
            <TabsTrigger value="payment">{t('Payment')}</TabsTrigger>
            <TabsTrigger value="settings">{t('Settings')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Checkout Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1 mb-4">
                    <Label htmlFor="name" required>{t('Checkout Name')}</Label>
                    <Input 
                      id="name" 
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder={t('Enter checkout name')}
                      aria-invalid={!!errors.name}
                    />
                    <InputError message={errors.name} />
                  </div>
                  <div>
                    <Label htmlFor="type" required>{t('Checkout Type / Payment Method')}</Label>
                    <Select value={checkoutType} onValueChange={handleTypeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy_now">{t('Buy Now')}</SelectItem>
                        <SelectItem value="express_cart">{t('Express Cart')}</SelectItem>
                        <SelectItem value="guest_checkout">{t('Guest Checkout')}</SelectItem>
                        <SelectItem value="mobile_optimized">{t('Mobile Optimized')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">{t('Description')}</Label>
                  <Textarea 
                    id="description" 
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder={t('Describe this checkout method')} 
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid gap-1">
                    <Label htmlFor="button_text">{t('Button Text')}</Label>
                    <Input
                      id="button_text"
                      name="button_text"
                      value={formData.button_text}
                      onChange={handleInputChange}
                      placeholder={t('Buy Now')}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="button_color">{t('Button Color')}</Label>
                    <div className="flex h-10 items-center gap-2 rounded-md border bg-background px-2">
                      <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border shadow-inner">
                        <input
                          id="button_color"
                          name="button_color"
                          type="color"
                          value={formData.button_color}
                          onChange={handleInputChange}
                          aria-label={t('Button Color')}
                          className="absolute -left-1 -top-1 h-9 w-9 cursor-pointer opacity-0"
                        />
                        <span className="block h-full w-full" style={{ background: formData.button_color }} />
                      </div>
                      <Input
                        type="text"
                        name="button_color"
                        value={formData.button_color}
                        onChange={handleInputChange}
                        className="h-8 w-24 border-0 bg-transparent font-mono text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
                        dir="ltr"
                        aria-label={t('Button Color')}
                        maxLength={7}
                      />
                    </div>
                  </div>

                  {/* Live button preview */}
                  <div className="grid gap-1 md:col-span-2">
                    <Label>{t('Button Preview')}</Label>
                    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 p-6">
                      <p className="text-xs text-muted-foreground">{t('Live preview of the checkout button')}</p>
                      <button
                        type="button"
                        className="rounded-lg px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                        style={{ background: formData.button_color }}
                      >
                        {formData.button_text || t('Buy Now')}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>{t('Checkout Status')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Enable or disable this checkout')}</p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleSwitchChange('is_active', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Payment Methods')}</CardTitle>
                <CardDescription>{t('Select which payment methods your customers can use to pay.')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {PAYMENT_GATEWAYS.map((gateway) => {
                    const isEnabled = formData.payment_methods.includes(gateway.value);
                    const label = t(gateway.labelKey);

                    return (
                      <div
                        key={gateway.value}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isEnabled}
                        onClick={() => handlePaymentMethodChange(gateway.value, !isEnabled)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handlePaymentMethodChange(gateway.value, !isEnabled);
                          }
                        }}
                        className={cn(
                          'flex cursor-pointer select-none flex-col items-center gap-4 rounded-xl border-2 bg-card p-5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          isEnabled
                            ? 'border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20'
                            : 'border-gray-200 hover:border-primary/40 hover:bg-muted/40'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-14 w-full items-center justify-center rounded-lg border bg-white shadow-sm transition-colors',
                            isEnabled ? 'border-primary/30' : 'border-muted'
                          )}
                        >
                          <GatewayLogo value={gateway.value} label={label} />
                        </div>

                        <span className={cn('text-sm font-semibold', isEnabled ? 'text-foreground' : 'text-muted-foreground')}>
                          {label}
                        </span>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => handlePaymentMethodChange(gateway.value, checked)}
                            aria-label={label}
                          />
                          <span className={cn('text-xs font-medium', isEnabled ? 'text-primary' : 'text-muted-foreground')}>
                            {isEnabled ? t('Enabled') : t('Disabled')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Separator />

                <div className="grid gap-1 rounded-lg border bg-muted/30 p-4">
                  <Label htmlFor="default_payment">{t('Default Payment Method')}</Label>
                  <p className="text-sm text-muted-foreground">{t('Choose the default payment method used when customers do not select one.')}</p>
                  <Select
                    value={formData.default_payment_method || undefined}
                    onValueChange={handleDefaultPaymentChange}
                    disabled={formData.payment_methods.length === 0}
                  >
                    <SelectTrigger id="default_payment" className="bg-background">
                      <SelectValue placeholder={t('Select default payment')} />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.payment_methods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {getPaymentGatewayLabel(method)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.payment_methods.length === 0 && (
                    <p className="text-xs text-muted-foreground">{t('Enable at least one payment method to choose a default.')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('Checkout Settings')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:border-primary/50">
                  <div className="space-y-1">
                    <Label>{t('Skip Cart Page')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Go directly to checkout')}</p>
                  </div>
                  <Switch
                    checked={formData.skip_cart}
                    onCheckedChange={(checked) => handleSwitchChange('skip_cart', checked)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:border-primary/50">
                  <div className="space-y-1">
                    <Label>{t('Auto-fill Customer Data')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Use saved customer information')}</p>
                  </div>
                  <Switch
                    checked={formData.auto_fill_customer_data}
                    onCheckedChange={(checked) => handleSwitchChange('auto_fill_customer_data', checked)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:border-primary/50">
                  <div className="space-y-1">
                    <Label>{t('Guest Checkout Allowed')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Allow checkout without account')}</p>
                  </div>
                  <Switch
                    checked={formData.guest_checkout_allowed}
                    onCheckedChange={(checked) => handleSwitchChange('guest_checkout_allowed', checked)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:border-primary/50">
                  <div className="space-y-1">
                    <Label>{t('Mobile Optimized')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Optimize for mobile devices')}</p>
                  </div>
                  <Switch
                    checked={formData.mobile_optimized}
                    onCheckedChange={(checked) => handleSwitchChange('mobile_optimized', checked)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:border-primary/50">
                  <div className="space-y-1">
                    <Label>{t('Save Payment Methods')}</Label>
                    <p className="text-sm text-muted-foreground">{t('Allow customers to save payment info')}</p>
                  </div>
                  <Switch
                    checked={formData.save_payment_methods}
                    onCheckedChange={(checked) => handleSwitchChange('save_payment_methods', checked)}
                  />
                </div>
                <div className="grid gap-1 rounded-xl border p-4">
                  <Label htmlFor="success_redirect_url">{t('Success Redirect URL')}</Label>
                  <p className="text-sm text-muted-foreground">{t('Redirect customers to this page after a successful payment')}</p>
                  <div dir="ltr" className="flex h-10 items-center gap-2 rounded-md border bg-background px-2">
                    <Link className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      id="success_redirect_url"
                      name="success_redirect_url"
                      dir="ltr"
                      value={formData.success_redirect_url}
                      onChange={handleInputChange}
                      placeholder={t('https://yourstore.com/thank-you')}
                      className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>
                <div className="grid gap-1 rounded-xl border p-4">
                  <Label htmlFor="cancel_redirect_url">{t('Cancel Redirect URL')}</Label>
                  <p className="text-sm text-muted-foreground">{t('Redirect customers to this page when they cancel payment')}</p>
                  <div dir="ltr" className="flex h-10 items-center gap-2 rounded-md border bg-background px-2">
                    <Link className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      id="cancel_redirect_url"
                      name="cancel_redirect_url"
                      dir="ltr"
                      value={formData.cancel_redirect_url}
                      onChange={handleInputChange}
                      placeholder={t('https://yourstore.com/cart')}
                      className="h-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
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
              {t('Save Checkout')}
            </Button>
          </div>
        </div>
      </form>
    </PageTemplate>
  );
}