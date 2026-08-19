import React, { useState, useMemo, useRef } from 'react';
import { PageTemplate, type PageAction } from '@/components/page-template';
import { RefreshCw, BarChart3, Building2, ShoppingCart, Users, Wallet, Package, TrendingUp, Copy, Check, CreditCard, FileText, Tag, Activity, Store, Clock, Zap, ChevronRight, Settings, AlertTriangle, Boxes, Star, Timer, XCircle, Bell, CheckCircle, ExternalLink, MessageSquare, X, Plus, Download, QrCode, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';
import { Link, router, usePage } from '@inertiajs/react';
import QRCode from 'react-qr-code';
import { formatCurrency } from '@/utils/currency-helper';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';
import { hasPermission, checkPermission } from '@/utils/permissions';
import { getCsrfToken } from '@/utils/csrf';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar as RechartsBar, BarChart as RechartsBarChart } from 'recharts';

interface Props {
  dashboardData: {
    metrics: {
      orders?: number;
      products?: number;
      customers?: number;
      revenue?: number;
      totalCompanies?: number;
      totalStores?: number;
      activeStores?: number;
      totalPlans?: number;
      activePlans?: number;
      totalRevenue?: number;
      monthlyRevenue?: number;
      monthlyGrowth?: number;
      ordersGrowth?: number;
      productsGrowth?: number;
      customersGrowth?: number;
      pendingRequests?: number;
      pendingOrders?: number;
      approvedOrders?: number;
      totalOrders?: number;
      activeCoupons?: number;
      totalCoupons?: number;
    };
    recentOrders: any[];
    topProducts?: any[];
    topPlans?: any[];
    revenueChart?: any[];
    salesChart?: any[];
    alerts?: {
      id: number;
      type: string;
      title: string;
      body: string;
      icon?: string | null;
      color?: string | null;
      action_url?: string | null;
      is_read: boolean;
      created_at?: string | null;
      count?: number;
      group_ids?: number[];
    }[];
  };
  currentStore?: any;
  storeUrl?: string;
  onboarding?: {
    show: boolean;
    pendingCount: number;
    totalCount: number;
    steps: {
      key: string;
      done: boolean;
      href: string | null;
    }[];
  };
  isSuperAdmin: boolean;
}

export default function Dashboard({ dashboardData, currentStore, storeUrl, onboarding, isSuperAdmin }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [chartMode, setChartMode] = useState<'sales' | 'revenue'>('sales');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());
  const [qrOpen, setQrOpen] = useState(false);
  const qrDialogRef = useRef<HTMLDivElement>(null);

  const formatPrice = (value: number | string) => {
    const formatted = formatCurrency(value);
    const match = formatted.match(/(.*?)([^0-9.,\-\s]+?)\s*$/);
    if (match && match[1]?.trim()) {
      return `${match[1].replace(/\s+$/, '')} ${match[2]}`;
    }
    return formatted;
  };

  const downloadQr = () => {
    const svg = qrDialogRef.current?.querySelector('svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `store-qr-${(currentStore?.slug || currentStore?.id || 'store')}.png`;
      a.click();
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Merge group_ids into the dismissed set so collapsing duplicate alerts
  // dismisses the whole group at once.
  const dismissAlert = async (alert: any) => {
    const ids = Array.isArray(alert?.group_ids) && alert.group_ids.length > 0
      ? alert.group_ids
      : [alert?.id];

    setDismissedAlerts(prev => {
      const next = new Set(prev);
      ids.forEach((id: number) => next.add(id));
      return next;
    });

    try {
      await Promise.all(ids.map((id: number) =>
        fetch(route('api.merchant-notifications.mark-read', id), {
          method: 'POST',
          headers: { 'X-CSRF-TOKEN': getCsrfToken() || '', 'Accept': 'application/json' },
        }).catch(() => {})
      ));
    } catch {
      // Ignore — the card is already hidden locally.
    }
  };

  const visibleAlerts = (dashboardData.alerts || []).filter(
    (alert) => !dismissedAlerts.has(alert.id)
  );

  const breadcrumbs = [
    { title: t('Dashboard') }
  ];

  const { themeColor, customColor } = useBrand();

  const userHasPermission = (permission: string) => {
    return isSuperAdmin || hasPermission(permission);
  };

  const hasPendingAlerts = (visibleAlerts.length) > 0 || (dashboardData.metrics.pendingOrders || 0) > 0 || (dashboardData.metrics.pendingRequests || 0) > 0;

  const handleCardClick = (routeName: string, requiredPermission: string, id?: any) => {
    if (!checkPermission(requiredPermission, (usePage().props as any).auth)) {
      return;
    }

    if (id) {
      router.visit(route(routeName, id));
    } else {
      router.visit(route(routeName));
    }
  };

  const getThemeColorValue = () => {
    return themeColor === 'custom' ? customColor : THEME_COLORS[themeColor];
  };

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(storeUrl!);
      } else {
        // Fallback for browsers without clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = storeUrl!;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const pageActions: PageAction[] = [
    {
      label: t('Refresh'),
      icon: <RefreshCw className="h-4 w-4" />,
      variant: 'outline',
      onClick: () => router.reload({ only: ['dashboardData'] })
    }
  ];

  const kpiCards = useMemo(() => [
    {
      title: t('Total Revenue'),
      value: formatCurrency(dashboardData.metrics.totalRevenue || 0),
      subtitle: t('All-time earnings'),
      icon: Wallet,
      color: 'bg-yellow-100 text-yellow-600',
      trend: dashboardData.metrics.monthlyGrowth,
    },
    {
      title: t('Monthly Growth'),
      value: `${(dashboardData.metrics.monthlyGrowth || 0) >= 0 ? '+' : ''}${dashboardData.metrics.monthlyGrowth || 0}%`,
      subtitle: t('System growing monthly'),
      icon: TrendingUp,
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      title: t('Active Plans'),
      value: dashboardData.metrics.activePlans || 0,
      subtitle: t('Currently enabled plans'),
      icon: Package,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: t('Total Stores'),
      value: dashboardData.metrics.totalStores || 0,
      subtitle: `${dashboardData.metrics.activeStores || 0} ${t('active')}`,
      icon: Store,
      color: 'bg-green-100 text-green-600',
    },
    {
      title: t('Total Companies'),
      value: dashboardData.metrics.totalCompanies || 0,
      subtitle: t('Registered companies'),
      icon: Building2,
      color: 'bg-blue-100 text-blue-600',
    },
  ], [dashboardData.metrics, t]);

  const translateActivityType = (type: string) => {
    const map: Record<string, string> = {
      company_registered: t('New company registered'),
      store_created: t('New store created'),
      plan_subscribed: t('Plan subscription'),
      plan_requested: t('Plan request'),
    };
    return map[type] || t('System Activity');
  };

  const translateActivityStatus = (status: string) => {
    const map: Record<string, string> = {
      active: t('Active'),
      approved: t('Approved'),
      pending: t('Pending'),
      inactive: t('Inactive'),
    };
    return map[status] || status;
  };

  const translateActivityDescription = (activity: any) => {
    if (activity.type === 'company_registered') {
      return `${t('New company')} "${activity.company}" ${t('registered')}`;
    }
    if (activity.type === 'store_created') {
      return `${t('New store')} "${activity.company}" ${t('created')}`;
    }
    if (activity.type === 'plan_subscribed') {
      return `${activity.company} ${t('subscribed to plan')}`;
    }
    if (activity.type === 'plan_requested') {
      return `${activity.company} ${t('requested plan upgrade')}`;
    }
    return activity.description || t('System Activity');
  };

  const formatTimeAgo = (timeStr: string) => {
    if (!timeStr) return t('Recently');
    const match = timeStr.match(/(\d+)\s+(\w+)\s+ago/);
    if (!match) return timeStr;
    const num = parseInt(match[1]);
    const unit = match[2];
    const unitMap: Record<string, { ar: string; en: string }> = {
      second: { ar: 'ثانية', en: 'seconds' },
      seconds: { ar: 'ثواني', en: 'seconds' },
      minute: { ar: 'دقيقة', en: 'minute' },
      minutes: { ar: 'دقائق', en: 'minutes' },
      hour: { ar: 'ساعة', en: 'hour' },
      hours: { ar: 'ساعات', en: 'hours' },
      day: { ar: 'يوم', en: 'day' },
      days: { ar: 'أيام', en: 'days' },
      week: { ar: 'أسبوع', en: 'week' },
      weeks: { ar: 'أسابيع', en: 'weeks' },
      month: { ar: 'شهر', en: 'month' },
      months: { ar: 'أشهر', en: 'months' },
      year: { ar: 'سنة', en: 'year' },
      years: { ar: 'سنوات', en: 'years' },
    };
    const mapped = unitMap[unit] || { ar: unit, en: unit };
    return `${t('since')} ${num} ${mapped.ar}`;
  };

  const alertBorderClasses: Record<string, string> = {
    green: 'border-green-200',
    red: 'border-red-200',
    amber: 'border-amber-200',
    blue: 'border-blue-200',
    purple: 'border-purple-200',
    yellow: 'border-yellow-200',
    gray: 'border-gray-200',
  };
  const alertIconClasses: Record<string, string> = {
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    yellow: 'text-yellow-600',
    gray: 'text-gray-600',
  };
  const alertIconMap: Record<string, any> = {
    ShoppingCart,
    Package,
    XCircle,
    AlertTriangle,
    Boxes,
    Star,
    Timer,
    FileText,
    CheckCircle,
    Wallet,
    Bell,
  };
  const getAlertIcon = (icon: string | null | undefined) => alertIconMap[icon || ''] || Activity;

  const TrendLine = ({ value }: { value?: number }) => {
    if (value === undefined || value === null) {
      return null;
    }
    if (value === 0) {
      return (
        <div className="rtl-start flex items-center gap-1.5 min-w-0">
          <Badge variant="outline" className="text-xs ltr-num">0%</Badge>
          <span className="text-xs text-muted-foreground truncate">{t('vs last month')}</span>
        </div>
      );
    }
    const positive = value > 0;
    return (
      <div className="rtl-start flex items-center gap-1.5 min-w-0">
        <span dir="ltr" className={`ltr-num text-xs font-medium ${positive ? 'text-emerald-700' : 'text-red-600'}`}>
          {positive ? '+' : ''}{value.toLocaleString()}%
        </span>
        <span className="text-xs text-muted-foreground truncate">{t('vs last month')}</span>
      </div>
    );
  };

  if (isSuperAdmin) {
    return (
      <PageTemplate title={t('Dashboard')} description={t('Wusool system-wide statistics and overview')} url="/dashboard" actions={pageActions} breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* KPI Cards Row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {kpiCards.map((card, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-2xl font-bold ltr-num">{card.value}</div>
                    <div className={`p-3 rounded-full flex items-center justify-center ${card.color}`}>
                      <card.icon className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Middle Row: Activity + Plans Performance */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* System Activity Log */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  {t('System Activity')}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 me-1" />
                  {t('Live')}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentOrders.length > 0 ? dashboardData.recentOrders.map((activity, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${
                        activity.type === 'company_registered' ? 'bg-blue-500' :
                        activity.type === 'store_created' ? 'bg-green-500' :
                        activity.type === 'plan_subscribed' ? 'bg-purple-500' :
                        activity.type === 'plan_requested' ? 'bg-orange-500' :
                        'bg-gray-500'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {translateActivityDescription(activity)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatTimeAgo(activity.time)}
                        </p>
                      </div>
                      <div className={`px-2 py-0.5 text-[10px] rounded-full font-medium ${
                        activity.status === 'active' || activity.status === 'approved' ? 'bg-green-100 text-green-700' :
                        activity.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {translateActivityStatus(activity.status)}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t('No recent system activity')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Subscription Plans Performance */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                  {t('Subscription Plans Performance')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(dashboardData.topPlans?.length ?? 0) > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.topPlans?.map((plan, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-green-100 text-green-600' :
                            index === 1 ? 'bg-blue-100 text-blue-600' :
                            index === 2 ? 'bg-purple-100 text-purple-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            #{index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{t(plan.name)}</p>
                            <p className="text-sm text-gray-500">{plan.subscribers || plan.orders || 0} {t('active subscriptions')}</p>
                          </div>
                        </div>
                        <div className="text-end">
                          <p className="font-bold text-lg text-gray-900 ltr-num">{formatCurrency(plan.revenue || 0)}</p>
                          <p className="text-xs text-gray-500">{t('monthly revenue')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Chart Placeholder */
                  <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <BarChart3 className="h-12 w-12 text-gray-500 mb-3" />
                    <p className="text-sm font-medium text-gray-400">{t('Subscription Plans Performance')}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('Chart will appear here once data is available')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row: Quick Shortcuts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                {t('Quick Shortcuts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => router.visit(route('companies.index'))}
                  className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 group"
                >
                  <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="text-start flex-1">
                    <p className="font-semibold text-sm">{t('Companies')}</p>
                    <p className="text-xs text-muted-foreground">{t('Manage companies')}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>

                <button
                  onClick={() => router.visit(route('plans.index'))}
                  className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-green-50 hover:border-green-300 transition-all duration-200 group"
                >
                  <div className="p-2.5 rounded-lg bg-green-100 text-green-600 group-hover:scale-110 transition-transform">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="text-start flex-1">
                    <p className="font-semibold text-sm">{t('Subscription Plans')}</p>
                    <p className="text-xs text-muted-foreground">{t('Manage plans')}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>

                <button
                  onClick={() => router.visit(route('referral.index'))}
                  className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 group"
                >
                  <div className="p-2.5 rounded-lg bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="text-start flex-1">
                    <p className="font-semibold text-sm">{t('Referral Program')}</p>
                    <p className="text-xs text-muted-foreground">{t('Manage referrals')}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>

                <button
                  onClick={() => router.visit(route('settings'))}
                  className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 group"
                >
                  <div className="p-2.5 rounded-lg bg-orange-100 text-orange-600 group-hover:scale-110 transition-transform">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div className="text-start flex-1">
                    <p className="font-semibold text-sm">{t('System Settings')}</p>
                    <p className="text-xs text-muted-foreground">{t('Configure platform')}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTemplate>
    );
  }

  if (!currentStore) {
    return (
      <PageTemplate title={t('Dashboard')} description={t('Store dashboard and analytics')} url="/dashboard" breadcrumbs={breadcrumbs}>
        <div className="flex flex-col items-center justify-center text-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Store className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">{t('No store selected')}</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t('Select a store from the sidebar to see your dashboard and start selling.')}
          </p>
          {userHasPermission('manage-stores') && (
            <Button className="mt-5" onClick={() => router.visit(route('stores.index'))}>
              <Store className="h-4 w-4 me-2" />
              {t('Manage Stores')}
            </Button>
          )}
        </div>
      </PageTemplate>
    );
  }

  const salesData = dashboardData.salesChart || [];
  const revenueData = dashboardData.revenueChart || [];
  const chartData = chartMode === 'sales' ? salesData : revenueData;

  const storeSubdomain = (() => {
    try {
      return new URL(storeUrl!).hostname;
    } catch {
      return currentStore?.slug || '';
    }
  })();

  const emptyBaseline = chartData.length === 0
    ? Array.from({ length: 30 }, (_, i) => ({ date: `${i + 1}`, orders: 0, revenue: 0 }))
    : chartData;

  return (
    <PageTemplate
      title={t('Dashboard')}
      description={t('Store dashboard and analytics')}
      url="/dashboard"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-4">
        {/* Store Spotlight Bar */}
        <div className="rounded-xl border bg-card shadow-sm bg-gradient-to-l from-primary/10 via-transparent to-transparent">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
            {/* Store Info — right */}
            <div className="order-2 min-w-0 text-center sm:order-1 sm:text-start">
              <div className="flex items-center justify-center gap-2 mb-1 sm:justify-start">
                <Store className="h-4 w-4 flex-shrink-0 text-primary" />
                <p className="truncate text-base font-bold">{currentStore.name}</p>
              </div>
              <div className="mt-2 mb-1 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="inline-flex items-center rounded-full border bg-white/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  <Globe className="me-1 h-3 w-3 text-primary" />
                  <span dir="ltr" className="ltr-num font-mono">{storeSubdomain}</span>
                </span>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <span className="me-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  {t('Active')}
                </span>
              </div>
            </div>

            {/* Quick Actions — center */}
            <div className="order-3 flex flex-wrap items-center justify-center gap-2 sm:order-2">
              <Button size="sm" variant="outline" onClick={copyToClipboard} className="h-8 gap-1.5">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t('Copied!') : t('نسخ رابط المتجر')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.open(storeUrl!, '_blank')} className="h-8 gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                {t('عرض المتجر')}
              </Button>
              {userHasPermission('manage-analytics') && (
                <Button size="sm" variant="ghost" onClick={() => router.visit(route('analytics.index'))} className="h-8 gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {t('Analytics & Reporting')}
                </Button>
              )}
            </div>

            {/* QR Code — left, click to expand */}
            <div className="order-1 flex flex-shrink-0 items-center justify-center sm:order-3">
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                title={t('Expand QR code')}
                className="group relative rounded-xl bg-white p-2 shadow-sm ring-1 ring-black/5 transition-all hover:shadow-md"
              >
                <QRCode value={storeUrl!} size={72} />
                <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <QrCode className="h-6 w-6 text-white" />
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Onboarding Stepper */}
        {onboarding?.show && !isSuperAdmin && (() => {
          const doneCount = Math.max(onboarding.totalCount - (onboarding.pendingCount || 0), 0);
          const percent = onboarding.totalCount > 0 ? Math.round((doneCount / onboarding.totalCount) * 100) : 0;
          return (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{t('ابدأ من هنا')}</CardTitle>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    <span className="ltr-num" dir="ltr">{percent}%</span> {t('إكمال تهيئة المتجر')}
                  </span>
                </div>
                <Progress value={percent} className="mt-3 h-2" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {onboarding.steps.map((step) => {
                    const stepMeta = {
                      products: { icon: Package, label: t('Add your products') },
                      whatsapp: { icon: MessageSquare, label: t('Set up WhatsApp') },
                      payments: { icon: CreditCard, label: t('Configure payment methods') },
                      published: { icon: CheckCircle, label: t('Publish your store') },
                    }[step.key] || { icon: CheckCircle, label: step.key };
                    const Icon = stepMeta.icon;
                    return step.done ? (
                      <div key={step.key} className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                        <span className="truncate text-xs font-medium text-green-800">{stepMeta.label}</span>
                      </div>
                    ) : (
                      <Link key={step.key} href={step.href || '#'} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm transition-colors hover:border-primary hover:bg-primary/5">
                        <Icon className="h-4 w-4 flex-shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium">{stepMeta.label}</span>
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {userHasPermission('view-orders') && (
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick('orders.index', 'view-orders')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total Orders')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-2xl font-bold tabular-nums ltr-num">{dashboardData.metrics.orders?.toLocaleString() || 0}</div>
                  <div className="flex-shrink-0 p-2.5 rounded-full bg-blue-100 text-blue-600">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <TrendLine value={dashboardData.metrics.ordersGrowth} />
                </div>
              </CardContent>
            </Card>
          )}

          {userHasPermission('view-products') && (
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick('products.index', 'view-products')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total Products')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-2xl font-bold tabular-nums ltr-num">{dashboardData.metrics.products?.toLocaleString() || 0}</div>
                  <div className="flex-shrink-0 p-2.5 rounded-full bg-purple-100 text-purple-600">
                    <Package className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <TrendLine value={dashboardData.metrics.productsGrowth} />
                </div>
              </CardContent>
            </Card>
          )}

          {userHasPermission('view-customers') && (
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick('customers.index', 'view-customers')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total Customers')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-2xl font-bold tabular-nums ltr-num">{dashboardData.metrics.customers?.toLocaleString() || 0}</div>
                  <div className="flex-shrink-0 p-2.5 rounded-full bg-green-100 text-green-600">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <TrendLine value={dashboardData.metrics.customersGrowth} />
                </div>
              </CardContent>
            </Card>
          )}

          {userHasPermission('manage-analytics') && (
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick('analytics.index', 'manage-analytics')}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('Total Revenue')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 whitespace-nowrap text-2xl font-bold tabular-nums ltr-num">{formatPrice(dashboardData.metrics.revenue || 0)}</div>
                  <div className="flex-shrink-0 p-2.5 rounded-full bg-yellow-100 text-yellow-600">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <TrendLine value={dashboardData.metrics.monthlyGrowth} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        {(userHasPermission('manage-products') || userHasPermission('manage-coupon-system') || userHasPermission('manage-orders') || userHasPermission('settings-stores') || userHasPermission('manage-stores')) && (
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">{t('Quick Actions')}:</span>
                {userHasPermission('manage-products') && (
                  <Button size="sm" variant="default" onClick={() => router.visit(route('products.create'))} className="h-8 gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    {t('إضافة منتج')}
                  </Button>
                )}
                {userHasPermission('manage-coupon-system') && (
                  <Button size="sm" variant="outline" onClick={() => router.visit(route('advanced-coupons.create'))} className="h-8 gap-1.5">
                    <Tag className="h-3.5 w-3.5" />
                    {t('Add Coupon')}
                  </Button>
                )}
                {userHasPermission('manage-orders') && (
                  <Button size="sm" variant="outline" onClick={() => router.visit(route('orders.create'))} className="h-8 gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {t('Create Manual Order')}
                  </Button>
                )}
                {currentStore && userHasPermission('settings-stores') && (
                  <Button size="sm" variant="outline" onClick={() => router.visit(route('stores.settings', currentStore.id))} className="h-8 gap-1.5">
                    <Settings className="h-3.5 w-3.5" />
                    {t('Store Settings')}
                  </Button>
                )}
                {userHasPermission('manage-stores') && (
                  <Button size="sm" variant="outline" onClick={() => router.visit(route('stores.index'))} className="h-8 gap-1.5">
                    <Store className="h-3.5 w-3.5" />
                    {t('Manage Stores')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vital Alerts */}
        {userHasPermission('manage-orders') && (
          <Card className={hasPendingAlerts ? "border-amber-200 bg-amber-50/50" : "border-emerald-200 bg-emerald-50/50"}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className={hasPendingAlerts ? "h-4 w-4 text-amber-600" : "h-4 w-4 text-emerald-600"} />
                {t('Vital Alerts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {visibleAlerts.map((alert) => {
                  const AlertIcon = getAlertIcon(alert.icon);
                  const groupCount = alert.count || 1;
                  return (
                    <div
                      key={alert.id}
                      className={`group relative flex items-center gap-2 rounded-lg border bg-white px-3 py-2 pe-9 text-start transition-shadow hover:shadow-sm ${alertBorderClasses[alert.color || 'amber']}`}
                    >
                      {alert.action_url ? (
                        <button
                          type="button"
                          onClick={() => router.visit(alert.action_url)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-start"
                        >
                          <AlertIcon className={`h-4 w-4 flex-shrink-0 ${alertIconClasses[alert.color || 'amber']}`} />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{alert.title}</span>
                            {alert.body && (
                              <span className="block max-w-56 truncate text-xs text-muted-foreground">{alert.body}</span>
                            )}
                          </span>
                          {groupCount > 1 && (
                            <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                              ×{groupCount}
                            </span>
                          )}
                        </button>
                      ) : (
                        <div className="flex min-w-0 flex-1 items-center gap-2 text-start">
                          <AlertIcon className={`h-4 w-4 flex-shrink-0 ${alertIconClasses[alert.color || 'amber']}`} />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{alert.title}</span>
                            {alert.body && (
                              <span className="block max-w-56 truncate text-xs text-muted-foreground">{alert.body}</span>
                            )}
                          </span>
                          {groupCount > 1 && (
                            <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                              ×{groupCount}
                            </span>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => dismissAlert(alert)}
                        aria-label={t('Dismiss')}
                        className="absolute top-1.5 left-1.5 rounded-full p-1 text-muted-foreground opacity-60 transition-all hover:bg-gray-100 hover:text-gray-900 hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
                {(dashboardData.metrics.pendingOrders || 0) > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-white border border-amber-200 px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-sm font-medium">{dashboardData.metrics.pendingOrders} {t('pending orders awaiting shipment')}</span>
                  </div>
                )}
                {(dashboardData.metrics.pendingRequests || 0) > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-white border border-orange-200 px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-sm font-medium">{dashboardData.metrics.pendingRequests} {t('pending plan requests')}</span>
                  </div>
                )}
                {(!dashboardData.alerts || dashboardData.alerts.length === 0) && (dashboardData.metrics.pendingOrders || 0) === 0 && (dashboardData.metrics.pendingRequests || 0) === 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-white border border-emerald-200 px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700">{t('All orders are up to date — no pending actions')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chart + Top Products + Recent Orders */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Daily Sales Chart */}
          {userHasPermission('manage-analytics') && (
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  {t('Sales Last 30 Days')}
                </CardTitle>
                <div className="inline-flex items-center rounded-lg border p-0.5">
                  <button
                    type="button"
                    onClick={() => setChartMode('sales')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${chartMode === 'sales' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {t('Orders')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMode('revenue')}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${chartMode === 'revenue' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {t('Revenue')}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    {chartMode === 'sales' ? (
                      <RechartsBarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
                        <RechartsBar dataKey="orders" name={t('Orders')} fill={getThemeColorValue()} radius={[4, 4, 0, 0]} />
                      </RechartsBarChart>
                    ) : (
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={getThemeColorValue()} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={getThemeColorValue()} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(value: any) => formatCurrency(Number(value) || 0)} />
                        <Area type="monotone" dataKey="revenue" name={t('Revenue')} stroke={getThemeColorValue()} strokeWidth={2} fill="url(#revenueGradient)" />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="relative h-[220px] rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={emptyBaseline} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} domain={[0, 1]} allowDecimals={false} />
                        <Area
                          type="monotone"
                          dataKey={chartMode === 'sales' ? 'orders' : 'revenue'}
                          stroke="#cbd5e1"
                          strokeWidth={1.5}
                          strokeDasharray="6 6"
                          fill="none"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-500">
                      <BarChart3 className="me-2 h-4 w-4" />
                      {t('No sales in the last 30 days yet')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Orders */}
          {userHasPermission('view-orders') && (
            <Card>
              <CardHeader>
                <CardTitle>{t('Recent Orders')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData.recentOrders.length > 0 ? dashboardData.recentOrders.slice(0, 5).map((order, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <Link
                          href={route('orders.show', order.id)}
                          className="font-medium hover:underline text-sm"
                          style={{ color: getThemeColorValue() }}
                        >
                          {order.order_number}
                        </Link>
                        <p className="text-xs text-muted-foreground">{order.customer}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-medium ltr-num">{formatPrice(order.amount)}</p>
                        <p className="text-xs text-muted-foreground">{order.status}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-muted-foreground">
                        <ShoppingCart className="h-6 w-6" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-gray-500">{t('No recent orders')}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t('Orders will appear here once customers start buying')}</p>
                      <Button size="sm" variant="outline" className="mt-4" onClick={() => router.visit(route('orders.index'))}>
                        <ShoppingCart className="h-3.5 w-3.5 me-1.5" />
                        {t('عرض كل الطلبات')}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Products */}
          {userHasPermission('view-products') && (
            <Card>
              <CardHeader>
                <CardTitle>{t('Top Products')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(dashboardData.topProducts?.length ?? 0) > 0 ? dashboardData.topProducts?.map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <Link
                          href={route('products.show', product.id)}
                          className="font-medium hover:underline text-sm"
                          style={{ color: getThemeColorValue() }}
                        >
                          {product.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{product.sold} {t('sold')}</p>
                      </div>
                      <div className="text-end">
                        <div className="flex flex-col items-end">
                          <p className="text-sm font-medium ltr-num">{formatPrice(product.sale_price || product.price)}</p>
                          {product.sale_price && (
                            <p className="text-xs line-through text-muted-foreground ltr-num">{formatPrice(product.price)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-muted-foreground">
                        <Package className="h-6 w-6" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-gray-500">{t('No products available')}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t('Products will appear here as they get sold')}</p>
                      {userHasPermission('manage-products') && (
                        <Button size="sm" variant="outline" className="mt-4" onClick={() => router.visit(route('products.index'))}>
                          <Package className="h-3.5 w-3.5 me-1.5" />
                          {t('عرض كل المنتجات')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* QR Code Expand Modal */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('رمز المتجر QR')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            <div ref={qrDialogRef} className="rounded-2xl border bg-white p-5 shadow-sm">
              <QRCode value={storeUrl!} size={220} />
            </div>
            <p className="max-w-xs text-center text-xs text-muted-foreground" dir="ltr">
              {storeUrl}
            </p>
            <div className="flex w-full gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4 me-2" /> : <Copy className="h-4 w-4 me-2" />}
                {copied ? t('Copied!') : t('نسخ رابط المتجر')}
              </Button>
              <Button type="button" className="flex-1" onClick={downloadQr}>
                <Download className="h-4 w-4 me-2" />
                {t('تحميل QR')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}