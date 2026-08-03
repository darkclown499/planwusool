import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';

export default function LoyaltySettings() {
  const { t } = useTranslation();
  const { settings } = usePage().props as any;

  const [form, setForm] = useState({
    is_enabled: settings?.is_enabled ?? true,
    points_per_currency: settings?.points_per_currency ?? 1,
    points_value: settings?.points_value ?? 0.01,
    minimum_redemption_points: settings?.minimum_redemption_points ?? 100,
    maximum_discount_percentage: settings?.maximum_discount_percentage ?? 50,
    signup_bonus_points: settings?.signup_bonus_points ?? 0,
    review_bonus_points: settings?.review_bonus_points ?? 0,
    points_expire: settings?.points_expire ?? false,
    expiry_months: settings?.expiry_months ?? 12,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.post(route('loyalty.settings.update'), form, {
      preserveScroll: true,
      preserveState: true,
    });
  };

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
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('Enable Loyalty Points')}</Label>
                  <p className="text-sm text-muted-foreground">{t('Turn the loyalty points system on or off')}</p>
                </div>
                <Switch
                  checked={form.is_enabled}
                  onCheckedChange={(checked) => setForm({ ...form, is_enabled: checked })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Points per Currency')}</Label>
                  <p className="text-xs text-muted-foreground">{t('How many points customer earns per 1 unit of currency')}</p>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.points_per_currency}
                    onChange={(e) => setForm({ ...form, points_per_currency: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('Points Value')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Monetary value of a single point')}</p>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={form.points_value}
                    onChange={(e) => setForm({ ...form, points_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Redemption Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Redemption Settings')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Minimum Redemption Points')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Minimum points a customer must have to redeem')}</p>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.minimum_redemption_points}
                    onChange={(e) => setForm({ ...form, minimum_redemption_points: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('Maximum Discount (%)')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Maximum percentage of order total that can be paid with points')}</p>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={form.maximum_discount_percentage}
                    onChange={(e) => setForm({ ...form, maximum_discount_percentage: parseFloat(e.target.value) || 0 })}
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Signup Bonus Points')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Points awarded when a customer creates an account')}</p>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.signup_bonus_points}
                    onChange={(e) => setForm({ ...form, signup_bonus_points: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('Review Bonus Points')}</Label>
                  <p className="text-xs text-muted-foreground">{t('Points awarded when a customer writes a product review')}</p>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.review_bonus_points}
                    onChange={(e) => setForm({ ...form, review_bonus_points: parseFloat(e.target.value) || 0 })}
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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('Enable Points Expiry')}</Label>
                  <p className="text-sm text-muted-foreground">{t('Let earned points expire after a period of time')}</p>
                </div>
                <Switch
                  checked={form.points_expire}
                  onCheckedChange={(checked) => setForm({ ...form, points_expire: checked })}
                />
              </div>

              {form.points_expire && (
                <div className="space-y-2">
                  <Label>{t('Expiry (months)')}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    value={form.expiry_months}
                    onChange={(e) => setForm({ ...form, expiry_months: parseInt(e.target.value) || 12 })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit">{t('Save Settings')}</Button>
          </div>
        </div>
      </form>
    </PageTemplate>
  );
}

