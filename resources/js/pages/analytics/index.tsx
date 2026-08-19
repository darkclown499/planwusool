import React, { useEffect, useMemo, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { router } from '@inertiajs/react';
import {
  CalendarRange,
  ChevronDown,
  Download,
  Eye,
  FileDown,
  FileText,
  Inbox,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  Percent,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '@/utils/currency-helper';
import { hasPermission } from '@/utils/permissions';
import { format, startOfMonth, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  analytics: {
    metrics: any;
    topProducts: any[];
    topCustomers: any[];
    recentActivity: any[];
    revenueChart: any[];
    salesChart: any[];
  };
  from?: string | null;
  to?: string | null;
}

type PresetKey = 'today' | 'last7' | 'thisMonth' | 'custom';

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

function EmptyState({ hint }: { hint?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{hint || t('No data available yet')}</p>
    </div>
  );
}

const fmtNum = (value: number) => Number(value || 0).toLocaleString('en-US');

function DateRangePicker({ from, to }: { from?: string | null; to?: string | null }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState<PresetKey>(from && to ? 'custom' : 'thisMonth');
  const [customFrom, setCustomFrom] = useState<string>(from || format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState<string>(to || todayStr());

  useEffect(() => {
    setPreset(from && to ? 'custom' : 'thisMonth');
    if (from) setCustomFrom(from);
    if (to) setCustomTo(to);
  }, [from, to]);

  const applyRange = (f: Date, tDate: Date) => {
    setOpen(false);
    router.get(
      route('analytics.index'),
      { from: format(f, 'yyyy-MM-dd'), to: format(tDate, 'yyyy-MM-dd') },
      { preserveScroll: true },
    );
  };

  const handlePreset = (value: PresetKey) => {
    const now = new Date();
    if (value === 'today') return applyRange(now, now);
    if (value === 'last7') return applyRange(subDays(now, 6), now);
    if (value === 'thisMonth') return applyRange(startOfMonth(now), now);
    setPreset('custom');
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    applyRange(new Date(customFrom), new Date(customTo));
  };

  const presets: { key: PresetKey; label: string }[] = [
    { key: 'today', label: t('Today') },
    { key: 'last7', label: t('Last 7 Days') },
    { key: 'thisMonth', label: t('This Month') },
    { key: 'custom', label: t('Custom Range') },
  ];

  const summary =
    preset === 'custom' && from && to ? `${from} → ${to}` : presets.find((p) => p.key === preset)?.label || t('Date Range');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 justify-start gap-2">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <span className="max-w-40 truncate font-normal">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="grid grid-cols-2 gap-1.5">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePreset(p.key)}
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-medium transition',
                preset === p.key && p.key !== 'custom' ? 'bg-primary text-primary-foreground' : 'bg-muted/60 hover:bg-muted',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('From')}</label>
                <Input type="date" dir="ltr" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('To')}</label>
                <Input type="date" dir="ltr" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </div>
            <Button type="button" size="sm" className="w-full" onClick={applyCustom}>
              {t('Apply')}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ExportDropdown() {
  const { t } = useTranslation();
  if (!hasPermission('export-analytics')) return null;

  const openExport = (formatKind: 'csv' | 'pdf') => {
    const url = formatKind === 'pdf' ? route('analytics.export.pdf') : route('analytics.export');
    window.open(url, '_blank');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm" className="h-8 gap-2">
          <Download className="h-4 w-4" />
          {t('Export Report')}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => openExport('csv')}>
          <FileText className="h-4 w-4 text-muted-foreground" />
          {t('Export CSV')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openExport('pdf')}>
          <FileDown className="h-4 w-4 text-muted-foreground" />
          {t('Export PDF')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MetricCard({
  title,
  icon,
  value,
  sub,
}: {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function Analytics({ analytics, from, to }: Props) {
  const { t } = useTranslation();

  const metrics = analytics?.metrics ?? { revenue: { current: 0, total: 0, change: 0 } };
  const revenue = metrics.revenue ?? { current: 0, total: 0, change: 0 };
  const orders = metrics.orders ?? { current: 0, change: 0 };
  const customers = metrics.customers ?? { total: 0, new: 0 };
  const conversion = metrics.conversion ?? { rate: 0, change: 0 };

  const topProducts = analytics?.topProducts ?? [];
  const topCustomers = analytics?.topCustomers ?? [];
  const recentActivity = analytics?.recentActivity ?? [];
  const revenueChart = useMemo(() => analytics?.revenueChart ?? [], [analytics]);
  const salesChart = useMemo(() => analytics?.salesChart ?? [], [analytics]);

  const revenueTotal = useMemo(() => revenueChart.reduce((s, d) => s + (Number(d.revenue) || 0), 0), [revenueChart]);

  const activityIcon = (type: string) => {
    switch (type) {
      case 'Order':
        return <ShoppingCart className="h-4 w-4 text-primary" />;
      case 'Customer':
        return <Users className="h-4 w-4 text-primary" />;
      case 'Product':
        return <Eye className="h-4 w-4 text-primary" />;
      default:
        return <TrendingUp className="h-4 w-4 text-primary" />;
    }
  };

  const chartTooltipStyle = {
    background: 'var(--background)',
    color: 'var(--foreground)',
    border: '1px solid var(--border)',
    borderRadius: '0.5rem',
    fontSize: '12px',
  } as const;

  return (
    <PageTemplate
      title={t('Analytics & Reporting')}
      url="/analytics"
      action={
        <div className="flex items-center gap-2">
          <DateRangePicker from={from} to={to} />
          <ExportDropdown />
        </div>
      }
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Analytics & Reporting') },
      ]}
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title={t('Total Revenue')}
            icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
            value={formatCurrency(revenue.current)}
            sub={
              <>
                <span className={revenue.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {revenue.change >= 0 ? '+' : ''}
                  {revenue.change.toFixed(1)}%
                </span>
                {' '}
                {t('from last month')}
                <span className="mt-1 block text-muted-foreground">
                  {t('Total')}: {formatCurrency(revenue.total)}
                </span>
              </>
            }
          />

          <MetricCard
            title={t('Total Orders')}
            icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
            value={fmtNum(orders.current)}
            sub={
              <span className={orders.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                {orders.change >= 0 ? '+' : ''}
                {orders.change}
                {' '}
                {t('from last month')}
              </span>
            }
          />

          <MetricCard
            title={t('Total Customers')}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            value={fmtNum(customers.total)}
            sub={<span className="text-muted-foreground">+{fmtNum(customers.new)} {t('new this month')}</span>}
          />

          <MetricCard
            title={t('Conversion Rate')}
            icon={<Percent className="h-4 w-4 text-muted-foreground" />}
            value={`${conversion.rate.toFixed(1)}%`}
            sub={
              <span className={conversion.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                {conversion.change >= 0 ? '+' : ''}
                {conversion.change.toFixed(1)}%
                {' '}
                {t('from last month')}
              </span>
            }
          />
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>{t('Revenue Overview')}</span>
                <Badge variant="outline">{formatCurrency(revenueTotal)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueChart.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChart} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b77f" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b77f" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={64} />
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(value: any) => [formatCurrency(value), t('Revenue')]} />
                      <Area type="monotone" dataKey="revenue" stroke="#10b77f" strokeWidth={2} fill="url(#revenueFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Sales Trend')}</CardTitle>
            </CardHeader>
            <CardContent>
              {salesChart.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesChart} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={40} allowDecimals={false} />
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(value: any) => [value, t('Orders')]} />
                      <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products & Customers */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('Top Selling Products')}</CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {fmtNum(product.sales)} {t('units sold')}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="font-semibold tabular-nums text-green-600">{product.revenue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Top Customers')}</CardTitle>
            </CardHeader>
            <CardContent>
              {topCustomers.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-3">
                  {topCustomers.map((customer, index) => (
                    <div key={index} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {fmtNum(customer.orders)} {t('orders')}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="font-semibold tabular-nums text-green-600">{customer.spent}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Recent Activity')}</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        {activityIcon(activity.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{activity.description}</p>
                        <p className="text-sm text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                    {activity.amount && <Badge variant="outline" className="shrink-0 tabular-nums">{activity.amount}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}