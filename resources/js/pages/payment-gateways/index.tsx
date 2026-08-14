import { router } from '@inertiajs/react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Settings2,
  Zap,
  ShieldCheck,
  Landmark,
  Wallet,
  ArrowRight,
  Smartphone,
  Globe,
  FileClock,
  Receipt,
} from 'lucide-react';

const gateways = [
  { name: 'Stripe', region: 'Global', icon: ShieldCheck },
  { name: 'PayPal', region: 'Global', icon: Wallet },
  { name: 'Paystack', region: 'Africa', icon: Globe },
  { name: 'Flutterwave', region: 'Africa', icon: Globe },
  { name: 'MercadoPago', region: 'Latin America', icon: Globe },
  { name: 'Midtrans', region: 'Southeast Asia', icon: Globe },
  { name: 'Cashfree', region: 'India', icon: Landmark },
  { name: 'Razorpay', region: 'India', icon: Wallet },
  { name: 'CinetPay', region: 'West Africa', icon: Globe },
  { name: 'Khalti', region: 'Nepal', icon: Smartphone },
  { name: 'Iyzico', region: 'Turkey', icon: CreditCard },
  { name: 'Mollie', region: 'Europe', icon: CreditCard },
  { name: 'CoinGate', region: 'Global', icon: Globe },
  { name: 'Xendit', region: 'Southeast Asia', icon: Globe },
  { name: 'Bank Transfer', region: 'Global', icon: Landmark },
  { name: 'Cash on Delivery', region: 'Global', icon: Receipt },
];

export default function PaymentGatewaysIndex() {
  const { t } = useTranslation();

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Payment Gateways') },
  ];

  const stats = [
    { label: t('Supported Gateways'), value: '30+', icon: CreditCard },
    { label: t('Global Coverage'), value: '50+', icon: Globe },
    { label: t('Auto Settlement'), value: '24/7', icon: Zap },
  ];

  return (
    <PageTemplate
      title={t('Payment Gateways')}
      url="/payment-gateways"
      description={t('Configure and manage all payment gateways for your stores')}
      breadcrumbs={breadcrumbs}
      action={
        <Button onClick={() => router.visit(route('settings'))}>
          <Settings2 className="h-4 w-4 me-2" />
          {t('Open Payment Settings')}
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-2.5 bg-primary/10 rounded-lg">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('Available Gateways')}</CardTitle>
            <CardDescription>
              {t('Supported payment providers available for your stores')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {gateways.map((gateway) => (
                <div
                  key={gateway.name}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-background border rounded-lg">
                      <gateway.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{gateway.name}</p>
                      <p className="text-xs text-muted-foreground">{gateway.region}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{t('Active')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Why Use Built-in Gateways')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-3 p-4 border rounded-lg">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t('Secure Transactions')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('All gateways are PCI compliant with built-in fraud protection')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-4 border rounded-lg">
                <Zap className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t('Instant Setup')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('Add your API keys and start accepting payments in minutes')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-4 border rounded-lg">
                <FileClock className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t('Webhook Automation')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('Payment status is updated automatically via webhooks')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 p-4 border rounded-lg">
                <Globe className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t('Multi Currency')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('Accept payments in local currencies around the world')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div>
                <p className="font-medium text-sm">{t('Manage your gateway credentials')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('Configure API keys, test modes and more from the settings page')}
                </p>
              </div>
              <Button variant="outline" onClick={() => router.visit(route('settings'))}>
                {t('Go to Settings')}
                <ArrowRight className="h-4 w-4 ms-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
