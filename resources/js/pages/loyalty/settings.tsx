import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';

function SuffixInput({ suffix, className, ...props }: React.ComponentProps<typeof Input> & { suffix?: string }) {
  return (
    <div
      dir="ltr"
      className="flex h-10 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[1px] focus-within:ring-ring/50"
    >
      <Input
        dir="ltr"
        className={cn('h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0', className)}
        {...props}
      />
      {suffix ? <span className="shrink-0 whitespace-nowrap text-sm font-medium text-muted-foreground">{suffix}</span> : null}
    </div>
  );
}

export default function LoyaltySettings() {
  const { t } = useTranslation();
  const { settings, currency_symbol } = usePage().props as any;
  const currencySymbol: string = typeof currency_symbol === 'string' && currency_symbol ? currency_symbol : '₪';

  const [form, setForm] = useState({
    is_enabled: settings?.is_enabled ?? true,
    points_per_currency: settings?.points_per_currency ?? 1,
    points_value: settings?.points_value ?? 0.01,
    minimum_redemption_points: settings?.minimum_redemption_points ?? 100,
    maximum_discount_percentage: settings?.maximum_discount_percentage ?? 50,
    signup_bonus_points: settings?.signup_bonus_points ?? 0,
    review_bonus_points: settings?.review_bonus_points ?? 0,
    points_expire: settings?.points_expire ?? false,
    expiry_days: settings?.expiry_days ?? 90,
    expiry_reminder_days: settings?.expiry_reminder_days ?? 7,
  });

  const setField = (key: keyof typeof form, value: number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleIntChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setField(key, parseInt(e.target.value, 10) || 0);
  };

  const handleFloatChange = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setField(key, parseFloat(e.target.value) || 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.post(route('loyalty.settings.update'), form, {
      preserveScroll: true,
      preserveState: true,
    });
  };

  const handleCancel = () => router.visit(route('dashboard'));

  return (
    <PageTemplate
      title={t('Loyalty Points Settings')}
      description={t('Configure your loyalty points program')}
      url="/loyalty/settings"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Loyalty Points') }
      ]}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('General Settings')}</CardTitle>
              <CardDescription>{t('Configure your loyalty points program')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:border-primary/50">
                <div className="space-y-1">
                  <Label>{t('Enable Loyalty Points')}</Label>
                  <p className="text-sm text-muted-foreground">{t('Turn the loyalty points system on or off')}</p>
                </div>
                <Switch
                  checked={form.is_enabled}
                  onCheckedChange={(checked) => setField('is_enabled', checked)}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('Points per Currency')}</Label>
                  <p className="text-xs text-muted-foreground">{t('How many points customer earns per 1 unit of currency')}</p>
                  <SuffixInput
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={form.points_per_currency}
                    onChange={handleIntChange('points_per_currency')}
                    suffix={t('point')}
                    aria-label={t('Points per Currency')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('Points Value')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Monetary value of a single point')}</p>
                  <SuffixInput
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.0001}
                    value={form.points_value}
                    onChange={handleFloatChange('points_value')}
                    suffix={currencySymbol}
                    aria-label={t('Points Value')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {!form.is_enabled && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
              البرنامج معطل حالياً — الإعدادات محفوظة لكن لا تُطبق على العملاء ولا تُمنح نقاط حتى تفعيله.
            </div>
          )}
          <div className={!form.is_enabled ? 'opacity-60' : ''}>
          {/* Redemption Settings */}
          <Card className={!form.is_enabled ? 'pointer-events-none' : ''}>
            <CardHeader>
              <CardTitle>{t('Redemption Settings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('Minimum Redemption Points')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Minimum points a customer must have to redeem')}</p>
                  <SuffixInput
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={form.minimum_redemption_points}
                    onChange={handleIntChange('minimum_redemption_points')}
                    suffix={t('point')}
                    aria-label={t('Minimum Redemption Points')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('Maximum Discount (%)')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Maximum percentage of order total that can be paid with points')}</p>
                  <SuffixInput
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step={1}
                    value={form.maximum_discount_percentage}
                    onChange={handleFloatChange('maximum_discount_percentage')}
                    suffix="%"
                    aria-label={t('Maximum Discount (%)')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bonus Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Bonus Settings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('Signup Bonus Points')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Points awarded when a customer creates an account')}</p>
                  <SuffixInput
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={form.signup_bonus_points}
                    onChange={handleIntChange('signup_bonus_points')}
                    suffix={t('point')}
                    aria-label={t('Signup Bonus Points')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('Review Bonus Points')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Points awarded when a customer writes a product review')}</p>
                  <SuffixInput
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={form.review_bonus_points}
                    onChange={handleIntChange('review_bonus_points')}
                    suffix={t('point')}
                    aria-label={t('Review Bonus Points')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Points Expiry */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Points Expiry')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:border-primary/50">
                <div className="space-y-1">
                  <Label>{t('Enable Points Expiry')}</Label>
                  <p className="text-sm text-muted-foreground">{t('Let earned points expire after a period of time')}</p>
                </div>
                <Switch
                  checked={form.points_expire}
                  onCheckedChange={(checked) => setField('points_expire', checked)}
                />
              </div>

              {form.points_expire && (
                <div className="space-y-4">
                  <div className="space-y-2 max-w-md">
                    <Label>{t('Points validity period (in days)')}</Label>
                    <p className="text-xs text-muted-foreground">{t('How long earned points stay valid')}</p>
                    <SuffixInput
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={3650}
                      step={1}
                      value={form.expiry_days}
                      onChange={handleIntChange('expiry_days')}
                      suffix={t('day')}
                      aria-label={t('Points validity period (in days)')}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">التنبيه قبل الانتهاء سيُضاف قريباً عبر نظام الإشعارات الحالي — الإعداد الحالي يحفظ صلاحية النقاط فقط.</p>
                </div>
              )}
            </CardContent>
            </Card>
          </div>

          {/* Sticky form action footer */}
          <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                {t('Cancel')}
              </Button>
              <Button type="submit">
                {t('Save Settings')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </PageTemplate>
  );
}