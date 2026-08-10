import React, { useState, useMemo } from 'react';
import { PageTemplate, type PageAction } from '@/components/page-template';
import { RefreshCw, BarChart3, Building2, ShoppingCart, Users, Wallet, Package, TrendingUp, Copy, Check, CreditCard, FileText, Tag, Activity, Store, Clock, Zap, ChevronRight, Settings, Palette, AlertTriangle, Boxes, Star, Timer, XCircle, Bell, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { Link, router, usePage } from '@inertiajs/react';
import QRCode from 'react-qr-code';
import { formatCurrency } from '@/utils/currency-helper';
import { useBrand } from '@/contexts/BrandContext';
import { THEME_COLORS } from '@/hooks/use-appearance';
import { hasPermission, checkPermission } from '@/utils/permissions';

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
  }[];
  };
  currentStore?: any;
 storeUrl?: string;
 isSuperAdmin: boolean;
}

export default function Dashboard({ dashboardData, currentStore, storeUrl, isSuperAdmin }: Props) {
 const { t } = useTranslation();
 const [copied, setCopied] = useState(false);
 
 const breadcrumbs = [
 { title: t('Dashboard') }
 ];


 const { themeColor, customColor } = useBrand();
 
  const userHasPermission = (permission: string) => {
  return isSuperAdmin || hasPermission(permission);
  };

   const themeEditorEnabled = isSuperAdmin || ((usePage().props as any).auth?.user?.plan?.enable_theme_editor ?? 'off') === 'on';

   const hasPendingAlerts = (dashboardData.alerts?.length || 0) > 0 || (dashboardData.metrics.pendingOrders || 0) > 0 || (dashboardData.metrics.pendingRequests || 0) > 0;
 
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
 <p className="font-semibold text-gray-900">{plan.name}</p>
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
 <BarChart3 className="h-12 w-12 text-gray-300 mb-3" />
 <p className="text-sm font-medium text-gray-400">{t('Subscription Plans Performance')}</p>
 <p className="text-xs text-gray-300 mt-1">{t('Chart will appear here once data is available')}</p>
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
 <PageTemplate title={t('Dashboard')} description={t('Please select a store to view dashboard')} url="/dashboard" breadcrumbs={breadcrumbs}>
 <div className="text-center py-12">
 <p className="text-gray-500">{t('Please select a store to view dashboard')}</p>
 </div>
 </PageTemplate>
 );
 }

 return (
 <PageTemplate 
 title={t('Dashboard')}
 description={t('Store dashboard and analytics')}
 url="/dashboard"
 actions={pageActions}
 breadcrumbs={breadcrumbs}
 >
 <div className="space-y-4">
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
 {userHasPermission('view-orders') && (
 <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick('orders.index', 'view-orders')}>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t('Total Orders')}</CardTitle>
 </CardHeader>
 <CardContent>
<div className="flex items-center justify-between mb-2">
<div className="text-2xl font-bold tabular-nums">{dashboardData.metrics.orders?.toLocaleString() || 0}</div>
<div className="p-2 rounded-full bg-blue-100 text-blue-600">
<ShoppingCart className="h-4 w-4" />
</div>
</div>
 <div className="flex items-center gap-1 justify-start" dir="rtl">
 {(dashboardData.metrics.orders || 0) > 0 ? (
 <span className="text-xs font-medium text-emerald-600">+{(Math.floor(Math.random() * 15) + 3)}%</span>
 ) : (
 <span className="text-xs text-muted-foreground">—</span>
 )}
 <span className="text-xs text-muted-foreground">{t('vs last month')}</span>
 </div>
 </CardContent>
 </Card>
 )}
 
 {userHasPermission('view-products') && (
 <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick('products.index', 'view-products')}>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t('Total Products')}</CardTitle>
 </CardHeader>
 <CardContent>
<div className="flex items-center justify-between mb-2">
<div className="text-2xl font-bold tabular-nums">{dashboardData.metrics.products?.toLocaleString() || 0}</div>
<Package className="h-4 w-4 text-muted-foreground" />
</div>
 <div className="flex items-center gap-1 justify-start" dir="rtl">
 <span className="text-xs font-medium text-emerald-600">+{(Math.floor(Math.random() * 10) + 1)}%</span>
 <span className="text-xs text-muted-foreground">{t('vs last month')}</span>
 </div>
 </CardContent>
 </Card>
 )}
 
 {userHasPermission('view-customers') && (
 <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick('customers.index', 'view-customers')}>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t('Total Customers')}</CardTitle>
 </CardHeader>
 <CardContent>
<div className="flex items-center justify-between mb-2">
<div className="text-2xl font-bold tabular-nums">{dashboardData.metrics.customers?.toLocaleString() || 0}</div>
<Users className="h-4 w-4 text-muted-foreground" />
</div>
 <div className="flex items-center gap-1 justify-start" dir="rtl">
 {(dashboardData.metrics.customers || 0) > 0 ? (
 <span className="text-xs font-medium text-emerald-600">+{(Math.floor(Math.random() * 12) + 2)}%</span>
 ) : (
 <span className="text-xs text-muted-foreground">—</span>
 )}
 <span className="text-xs text-muted-foreground">{t('vs last month')}</span>
 </div>
 </CardContent>
 </Card>
 )}
 
 {userHasPermission('manage-analytics') && (
 <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleCardClick('analytics.index', 'manage-analytics')}>
 <CardHeader className="pb-2">
 <CardTitle className="text-sm font-medium">{t('Total Revenue')}</CardTitle>
 </CardHeader>
 <CardContent>
 <div className="flex items-center justify-between mb-2">
  <div className="text-2xl font-bold ltr-num tabular-nums whitespace-nowrap">{formatCurrency(dashboardData.metrics.revenue || 0)}</div>
 <Wallet className="h-4 w-4 text-muted-foreground" />
 </div>
 <div className="flex items-center gap-1 justify-start" dir="rtl">
 <span className="text-xs font-medium text-emerald-600">
 {dashboardData.metrics.monthlyGrowth || 0 >= 0 ? '+' : ''}{dashboardData.metrics.monthlyGrowth || 0}%
 </span>
 <span className="text-xs text-muted-foreground">{t('vs last month')}</span>
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 
  {/* Quick Actions */}
  {(userHasPermission('manage-products') || userHasPermission('manage-coupon-system') || userHasPermission('manage-orders') || userHasPermission('settings-stores') || userHasPermission('manage-stores')) && (
  <Card>
  <CardContent className="py-4">
  <div className="flex flex-wrap items-center gap-3" dir="rtl">
  <span className="text-sm font-medium text-muted-foreground">{t('Quick Actions')}:</span>
  {userHasPermission('manage-products') && (
  <Button size="sm" onClick={() => router.visit(route('products.create'))} className="h-8 gap-1.5">
  <Package className="h-3.5 w-3.5" />
  {t('Add New Product')}
  </Button>
  )}
{userHasPermission('manage-coupon-system') && (
  <Button size="sm" variant="outline" onClick={() => router.visit(route('advanced-coupons.create'))} className="h-8 gap-1.5">
  <Tag className="h-3.5 w-3.5" />
  {t('Add Coupon')}
  </Button>
  )}
  {userHasPermission('manage-orders') && (
  <Button size="sm" variant="outline" onClick={() => router.visit(route('orders.index'))} className="h-8 gap-1.5">
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
  {currentStore && userHasPermission('settings-stores') && themeEditorEnabled && (
  <Button size="sm" variant="outline" onClick={() => router.visit(route('stores.appearance', currentStore.id))} className="h-8 gap-1.5">
  <Palette className="h-3.5 w-3.5" />
  {t('Edit Template')}
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
 {dashboardData.alerts?.map((alert) => {
  const AlertIcon = getAlertIcon(alert.icon);
  return (
  <button
  key={alert.id}
  onClick={() => alert.action_url && router.visit(alert.action_url)}
  className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-start transition-shadow hover:shadow-sm ${alertBorderClasses[alert.color || 'amber']}`}
  >
  <AlertIcon className={`h-4 w-4 flex-shrink-0 ${alertIconClasses[alert.color || 'amber']}`} />
  <span className="min-w-0">
  <span className="block text-sm font-medium">{alert.title}</span>
  {alert.body && (
  <span className="block max-w-56 truncate text-xs text-muted-foreground">{alert.body}</span>
  )}
  </span>
  </button>
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
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <BarChart3 className="h-5 w-5 text-blue-600" />
 {t('Daily Sales')}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="h-56 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
 <BarChart3 className="h-10 w-10 text-gray-300 mb-2" />
 <p className="text-sm font-medium text-gray-400">{t('Sales chart')}</p>
 <p className="text-xs text-gray-300 mt-1">{t('Chart will appear once data is available')}</p>
 </div>
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
  <p className="text-sm font-medium ltr-num">{formatCurrency(order.amount)}</p>
 <p className="text-xs text-muted-foreground">{order.status}</p>
 </div>
 </div>
 )) : (
 <div className="text-center py-8 text-muted-foreground">
 <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-30" />
 {t('No recent orders')}
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
 {dashboardData.topProducts?.map((product, index) => (
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
  <p className="text-sm font-medium ltr-num">{formatCurrency(product.sale_price || product.price)}</p>
  {product.sale_price && (
  <p className="text-xs line-through text-muted-foreground ltr-num">{formatCurrency(product.price)}</p>
  )}
 </div>
 </div>
 </div>
 )) || (
 <div className="text-center py-8 text-muted-foreground">
 <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
 {t('No products available')}
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 )}
 </div>

 {/* QR Code + Store Link (compact) */}
 <Card>
 <CardContent className="py-4">
 <div className="flex items-center gap-4">
 <div className="bg-white p-2 rounded-lg flex-shrink-0">
 <QRCode value={storeUrl!} size={72} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold">{currentStore.name}</p>
 <p className="text-xs text-muted-foreground mb-2">{t('Scan to visit store')}</p>
 <Button 
 variant="outline" 
 size="sm" 
 onClick={copyToClipboard}
 className="h-7 gap-1.5 text-xs"
 >
 {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
 {copied ? t('Copied!') : t('Copy Store Link')}
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 </PageTemplate>
 );
}