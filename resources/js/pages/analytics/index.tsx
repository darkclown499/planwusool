import React, { useMemo, useState } from 'react';
import { route } from 'ziggy-js';
import { PageTemplate } from '@/components/page-template';
import { router } from '@inertiajs/react';
import {
  CalendarRange,
  ChevronDown,
  Download,
  FileDown,
  FileText,
  Inbox,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
  Receipt,
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '@/utils/currency-helper';
import { hasPermission } from '@/utils/permissions';
import { tOrderStatus, tPaymentMethod } from '@/utils/order-status';
import { format, startOfMonth, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface MoneyGroup {
  code: string;
  symbol: string;
  amount: number;
}

interface ChangeInfo {
  change: number | null;
  is_new: boolean;
}

interface MoneyMetric {
  groups: MoneyGroup[];
  previous_groups: MoneyGroup[];
  primary: number;
  previous_primary: number;
  change: ChangeInfo;
  orders?: number | null;
}

interface CountMetric {
  current: number;
  previous: number | null;
  change: ChangeInfo;
}

interface AnalyticsPayload {
  has_no_store?: boolean;
  period?: {
    key: string;
    timezone: string;
    from: string;
    to: string;
    from_label: string;
    to_label: string;
  };
  metrics?: {
    gmv: MoneyMetric;
    collected: MoneyMetric;
    pending_collection: MoneyMetric;
    aov: MoneyMetric;
    valid_orders: CountMetric;
    cancelled_orders: CountMetric;
    total_customers: CountMetric;
    repeat_customers: CountMetric;
    new_customers: CountMetric;
  };
  trend?: {
    granularity: 'hour' | 'day' | 'week';
    currency: string;
    labels: string[];
    valid_value: number[];
    collected: number[];
    orders: number[];
  };
  order_status_breakdown?: Array<{
    status: string;
    count: number;
    percentage: number;
    value: MoneyGroup[];
    primary: number;
  }>;
  payment_method_breakdown?: Array<{
    method: string;
    orders: number;
    valid_orders: number;
    valid_value: MoneyGroup[];
    collected: MoneyGroup[];
    valid_value_primary: number;
    collected_primary: number;
  }>;
  top_products?: {
    by_value: Array<{ name: string; units: number; orders: number; revenue: MoneyGroup[]; primary: number }>;
    by_quantity: Array<{ name: string; units: number; orders: number; revenue: MoneyGroup[]; primary: number }>;
  };
  top_customers?: Array<{ name: string; orders: number; spent: MoneyGroup[]; primary_spent: number }>;
  new_vs_returning?: {
    new_orders: number;
    returning_orders: number;
    new_customers: number;
    returning_customers: number;
  };
}

interface Props {
  analytics: AnalyticsPayload;
  preset: string;
  from?: string | null;
  to?: string | null;
}

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

const fmtNum = (value: number) => Number(value || 0).toLocaleString('en-US');

function ChangeBadge({ change, is_new, allTime }: { change: number | null; is_new: boolean; allTime?: boolean }) {
  const { t } = useTranslation();
  if (allTime) return null;
  if (change === null) {
    if (is_new) return <Badge variant="outline" className="bg-green-500/10 text-green-600">{t('New')}</Badge>;
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const positive = change > 0;
  return (
    <span className={cn('text-xs font-medium tabular-nums', positive ? 'text-green-600' : 'text-red-600')}>
      {positive ? '+' : ''}
      {change.toFixed(1)}%
    </span>
  );
}

function MetricCard({
  title,
  icon,
  value,
  change,
  isNew,
  allTime,
  extra,
}: {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  change?: number | null;
  isNew?: boolean;
  allTime?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="flex items-center gap-2">
          {change !== undefined && <ChangeBadge change={change ?? null} is_new={!!isNew} allTime={allTime} />}
          {extra}
        </div>
      </CardContent>
    </Card>
  );
}

function MoneySubtext({ groups }: { groups: MoneyGroup[] }) {
  const { t } = useTranslation();
  if (!groups || groups.length <= 1) return null;
  return (
    <span className="mt-1 block text-xs text-muted-foreground">
      {groups.map((g) => `${g.amount.toLocaleString('en-US')} ${g.symbol || g.code}`).join(' · ')}
    </span>
  );
}

function EmptyState({ hint }: { hint?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        {hint || t('No data available yet')}
      </p>
    </div>
  );
}

type PresetKey = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';

function DateRangePicker({ preset, from, to }: { preset: string; from?: string | null; to?: string | null }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<PresetKey>((preset as PresetKey) || 'last_30_days');
  const [customFrom, setCustomFrom] = useState<string>(from || format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState<string>(to || todayStr());

  const applyRange = (presetKey: string, f?: Date, tDate?: Date) => {
    const params: Record<string, string> = { preset: presetKey };
    if (presetKey === 'custom' && f && tDate) {
      params.from = format(f, 'yyyy-MM-dd');
      params.to = format(tDate, 'yyyy-MM-dd');
      setSelected('custom');
    }
    setOpen(false);
    router.get(route('analytics.index'), params, { preserveScroll: true });
  };

  const presets: { key: PresetKey; label: string }[] = [
    { key: 'today', label: t('Today') },
    { key: 'yesterday', label: t('Yesterday') },
    { key: 'last_7_days', label: t('Last 7 Days') },
    { key: 'last_30_days', label: t('Last 30 Days') },
    { key: 'this_month', label: t('This Month') },
    { key: 'last_month', label: t('Last Month') },
    { key: 'custom', label: t('Custom Range') },
  ];

  const summary =
    selected === 'custom' && from && to ? `${from} → ${to}` : presets.find((p) => p.key === selected)?.label || t('Date Range');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 justify-start gap-2">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <span className="max-w-40 truncate font-normal">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="grid grid-cols-2 gap-1.5">
          {presets.map((p) => {
            const active = p.key === selected && (p.key !== 'custom' || !!(from && to));
            return (
              <button
                key={p.key}
                type="button"
                onClick={() =>
                  p.key === 'custom'
                    ? setSelected('custom')
                    : applyRange(
                        p.key,
                        p.key === 'today' ? new Date() : p.key === 'yesterday' ? subDays(new Date(), 1) : undefined,
                        undefined,
                      )
                }
                className={cn(
                  'rounded-lg px-3 py-2 text-xs font-medium transition',
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted/60 hover:bg-muted',
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        {selected === 'custom' && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('From')}</label>
                <Input
                  type="date"
                  dir="ltr"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('To')}</label>
                <Input
                  type="date"
                  dir="ltr"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => {
                if (!customFrom || !customTo) return;
                applyRange('custom', new Date(customFrom), new Date(customTo));
              }}
            >
              {t('Apply')}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ExportDropdown(params: { preset: string; from?: string | null; to?: string | null }) {
  const { t } = useTranslation();
  if (!hasPermission('export-analytics')) return null;

  const openExport = (formatKind: 'csv' | 'pdf') => {
    const query: Record<string, string> = { preset: params.preset };
    if (params.preset === 'custom') {
      if (params.from) query.from = params.from;
      if (params.to) query.to = params.to;
    }
    const url = formatKind === 'pdf' ? route('analytics.export.pdf', query) : route('analytics.export', query);
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

const chartTooltipStyle = {
  background: 'var(--background)',
  color: 'var(--foreground)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  fontSize: '12px',
} as const;

type TrendKey = 'valid_value' | 'collected' | 'orders';

export default function Analytics({ analytics, preset, from, to }: Props) {
  const { t } = useTranslation();
  const [trendKey, setTrendKey] = useState<TrendKey>('valid_value');

  const metrics = analytics?.metrics ?? ({} as NonNullable<AnalyticsPayload['metrics']>);
  const trend = analytics?.trend ?? { granularity: 'day', currency: '', labels: [], valid_value: [], collected: [], orders: [] };
  const hasNoStore = analytics?.has_no_store;

  const chartData = useMemo(
    () =>
      trend.labels.map((label, index) => ({
        label,
        value: trend.valid_value[index] ?? 0,
        collected: trend.collected[index] ?? 0,
        orders: trend.orders[index] ?? 0,
      })),
    [trend],
  );

  const trendSeries = {
    valid_value: { name: t('Valid Orders') + ' (' + (trend.currency || '') + ')', color: '#10b77f', dataKey: 'value' as const },
    collected: { name: t('Collected'), color: '#3b82f6', dataKey: 'collected' as const },
    orders: { name: t('Orders'), color: '#a855f7', dataKey: 'orders' as const },
  }[trendKey];

  const statusBreakdown = analytics?.order_status_breakdown ?? [];
  const methodBreakdown = analytics?.payment_method_breakdown ?? [];
  const topByValue = analytics?.top_products?.by_value ?? [];
  const topCustomers = analytics?.top_customers ?? [];
  const nvr = analytics?.new_vs_returning ?? { new_orders: 0, returning_orders: 0, new_customers: 0, returning_customers: 0 };

  return (
    <PageTemplate
      title={t('Analytics & Reporting')}
      url="/analytics"
      action={
        <div className="flex items-center gap-2">
          <DateRangePicker preset={preset} from={from} to={to} />
          <ExportDropdown preset={preset} from={from} to={to} />
        </div>
      }
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Analytics & Reporting') },
      ]}
    >
      {hasNoStore ? (
        <EmptyState hint={t('Select a store to view reports')} />
      ) : (
        <div className="space-y-6">
          {/* Key metrics */}
          {metrics.gmv ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title={t('GMV')}
                icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                value={formatCurrency(metrics.gmv.primary)}
                change={metrics.gmv.change?.change}
                isNew={metrics.gmv.change?.is_new}
                extra={<MoneySubtext groups={metrics.gmv.groups} />}
              />
              <MetricCard
                title={t('Collected')}
                icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
                value={formatCurrency(metrics.collected.primary)}
                change={metrics.collected.change?.change}
                isNew={metrics.collected.change?.is_new}
                extra={<MoneySubtext groups={metrics.collected.groups} />}
              />
              <MetricCard
                title={t('Valid Orders')}
                icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
                value={fmtNum(metrics.valid_orders.current)}
                change={metrics.valid_orders.change?.change}
                isNew={metrics.valid_orders.change?.is_new}
              />
              <MetricCard
                title={t('Average order value')}
                icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
                value={formatCurrency(metrics.aov.primary)}
                change={metrics.aov.change?.change}
                isNew={metrics.aov.change?.is_new}
                extra={<MoneySubtext groups={metrics.aov.groups} />}
              />
            </div>
          ) : (
            <EmptyState />
          )}

          {/* Secondary metrics */}
          {metrics.gmv ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title={t('Pending Collection')}
                icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
                value={formatCurrency(metrics.pending_collection.primary)}
                change={metrics.pending_collection.change?.change}
                isNew={metrics.pending_collection.change?.is_new}
                extra={<MoneySubtext groups={metrics.pending_collection.groups} />}
              />
              <MetricCard
                title={t('Cancelled Orders')}
                icon={<XCircle className="h-4 w-4 text-muted-foreground" />}
                value={fmtNum(metrics.cancelled_orders.current)}
                change={metrics.cancelled_orders.change?.change}
                isNew={metrics.cancelled_orders.change?.is_new}
              />
              <MetricCard
                title={t('Total Customers')}
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                value={fmtNum(metrics.total_customers.current)}
                allTime
              />
              <MetricCard
                title={t('New Customers')}
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                value={fmtNum(metrics.new_customers.current)}
                change={metrics.new_customers.change?.change}
                isNew={metrics.new_customers.change?.is_new}
              />
            </div>
          ) : null}

          {/* Trend */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>{t('Sales Trend')}</CardTitle>
              <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5">
                {(['valid_value', 'collected', 'orders'] as TrendKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTrendKey(key)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition',
                      trendKey === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {key === 'valid_value' ? t('GMV') : key === 'collected' ? t('Collected') : t('Orders')}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={trendSeries.color} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={trendSeries.color} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="var(--muted-foreground)"
                        width={64}
                        allowDecimals={trendKey !== 'orders'}
                      />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value: any) =>
                          trendKey === 'orders' ? [Number(value), trendSeries.name] : [formatCurrency(value), trendSeries.name]
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey={trendSeries.dataKey}
                        stroke={trendSeries.color}
                        strokeWidth={2}
                        fill="url(#trendFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Breakdowns */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('Order Status Breakdown')}</CardTitle>
              </CardHeader>
              <CardContent>
                {statusBreakdown.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-3">
                    {statusBreakdown.map((row) => (
                      <div key={row.status} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{tOrderStatus(row.status)}</p>
                          <p className="text-xs text-muted-foreground">{fmtNum(row.count)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="outline">{row.percentage.toFixed(1)}%</Badge>
                          {row.primary > 0 && <span className="text-xs tabular-nums text-muted-foreground">{formatCurrency(row.primary)}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('Payment Method Breakdown')}</CardTitle>
              </CardHeader>
              <CardContent>
                {methodBreakdown.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-3">
                    {methodBreakdown.map((row) => (
                      <div key={row.method} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{tPaymentMethod(row.method)}</p>
                          <p className="text-xs text-muted-foreground">{fmtNum(row.orders)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant="outline">{fmtNum(row.valid_orders)}</Badge>
                          <span className="text-sm font-semibold tabular-nums text-green-600">
                            {formatCurrency(row.valid_value_primary)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* New vs returning + top products */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('New vs Returning')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{t('New Customers')}</p>
                    <p className="mt-1 text-xl font-bold tabular-nums">{fmtNum(nvr.new_customers)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {fmtNum(nvr.new_orders)} {t('Orders')}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{t('Returning Customers')}</p>
                    <p className="mt-1 text-xl font-bold tabular-nums">{fmtNum(nvr.returning_customers)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {fmtNum(nvr.returning_orders)} {t('Orders')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('Top Selling Products')}</CardTitle>
              </CardHeader>
              <CardContent>
                {topByValue.length === 0 ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-3">
                    {topByValue.map((product, index) => (
                      <div key={index} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {fmtNum(product.units)} {t('units sold')}
                          </p>
                        </div>
                        <div className="shrink-0 text-end">
                          <p className="font-semibold tabular-nums text-green-600">{formatCurrency(product.primary)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top customers */}
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
                          {fmtNum(customer.orders)} {t('Orders')}
                        </p>
                      </div>
                      <div className="shrink-0 text-end">
                        <p className="font-semibold tabular-nums text-green-600">{formatCurrency(customer.primary_spent)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageTemplate>
  );
}