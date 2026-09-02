import React from 'react';
import { PageTemplate } from '@/components/page-template';
import { Percent, Banknote, Truck, Gift, Layers, BarChart3, Receipt, PackageCheck, CircleDollarSign, ArrowRight, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { usePage } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { toast } from 'sonner';

export default function PromotionsAnalytics() {
  const { t } = useTranslation();
  const { promotion } = usePage().props as any;

  const discountIcon = () => {
    switch (promotion?.discount_type) {
      case 'percentage':
        return <Percent className="h-6 w-6 text-primary" />;
      case 'fixed':
        return <Banknote className="h-6 w-6 text-primary" />;
      case 'free_shipping':
        return <Truck className="h-6 w-6 text-primary" />;
      case 'buy_one_get_one':
        return <Gift className="h-6 w-6 text-primary" />;
      case 'quantity':
        return <Layers className="h-6 w-6 text-primary" />;
      default:
        return <Gift className="h-6 w-6 text-primary" />;
    }
  };

  const formatDiscount = () => {
    switch (promotion?.discount_type) {
      case 'percentage':
        return `${promotion.discount_value || ''}%`;
      case 'fixed':
        return formatCurrency(promotion.discount_value);
      case 'free_shipping':
        return t('Free Shipping');
      case 'buy_one_get_one':
        return 'BOGO';
      case 'quantity':
        return t('Quantity Discount');
      default:
        return '';
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(t('Promotion code copied to clipboard'));
  };

  const statCards = [
    { label: t('Uses'), value: promotion?.uses ?? 0, icon: PackageCheck, color: 'bg-blue-100 text-blue-600' },
    { label: t('Valid Order Value'), value: formatCurrency(promotion?.valid_order_value ?? 0), icon: CircleDollarSign, color: 'bg-emerald-100 text-emerald-600' },
    { label: t('Total Discount Granted'), value: formatCurrency(promotion?.total_discount_granted ?? 0), icon: Receipt, color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <PageTemplate
      title={promotion?.name || t('Promotion Analytics')}
      description={t('Performance and impact of this promotion over valid orders')}
      url={`/promotions/${promotion?.id}/analytics`}
      backUrl={route('promotions.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Promotions'), href: route('promotions.index') },
        { title: t('Analytics') },
      ]}
    >
      <div className="space-y-4">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.history.back()}>
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          {t('Back to Promotions')}
        </Button>

        <Card>
          <CardContent className="grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                {discountIcon()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{promotion?.name}</p>
                <p className="text-xs font-medium text-primary">{formatDiscount()}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Status')}</p>
              <Badge variant={promotion?.status ? 'default' : 'secondary'} className="mt-1">
                {promotion?.status ? t('Active') : t('Inactive')}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Code')}</p>
              {promotion?.code_type === 'auto' || !promotion?.code ? (
                <Badge variant="outline" className="mt-1">{t('Auto Apply')}</Badge>
              ) : (
                <div className="mt-1 flex items-center gap-1.5">
                  <code className="text-sm bg-muted px-2 py-0.5 rounded">{promotion.code}</code>
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyCode(promotion.code)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('Recorded Usage')}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{promotion?.used_count ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {statCards.map((card, i) => (
            <Card key={i} className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                <div className={`p-2 rounded-full ${card.color}`}>
                  <card.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">{card.value ?? 0}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              {t('About these metrics')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <PackageCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t('Uses counts every redemption tied to a valid order. Cancelled, failed, and refunded orders are excluded.')}</p>
            </div>
            <div className="flex items-start gap-2">
              <CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t('Valid Order Value is the total value of valid orders that used this promotion.')}</p>
            </div>
            <div className="flex items-start gap-2">
              <Receipt className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{t('Total Discount Granted is the cumulative discount amount this promotion has given across valid orders.')}</p>
            </div>
            <Separator />
            <p>{t('Only orders that are processed (not cancelled, failed, or refunded) are counted toward these metrics.')}</p>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}