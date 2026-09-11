import React, { useMemo, useState } from 'react';
import { route } from 'ziggy-js';
import { PageTemplate } from '@/components/page-template';
import { router } from '@inertiajs/react';
import {
  AlertTriangle,
  CalendarRange,
  ChevronDown,
  Inbox,
  PiggyBank,
  Receipt,
  RotateCcw,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface ProfitSummary {
  code: string;
  symbol: string;
  known_revenue: number;
  unknown_cost_revenue: number;
  total_revenue: number;
  cost_coverage_pct: number;
  cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
  refunded_amount: number;
  attributable_refunds: number;
  excluded_refunds: number;
  refund_adjusted_profit: number | null;
  refund_state: 'complete' | 'partial';
  known_cost_orders: number;
  total_orders: number;
}

interface RankedProduct {
  product_id: number | null;
  product_name: string;
  product_sku: string | null;
  currency: string;
  units: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
}

interface RefundedOrder {
  id: number;
  order_number: string;
  currency: string;
  refunded_amount: number;
  refunded_at: string | null;
  coverage: 'complete' | 'partial';
}

interface ProfitOverview {
  has_no_store?: boolean;
  summary: ProfitSummary[];
  trend: {
    labels: string[];
    known_revenue: number[];
    cogs: number[];
    gross_profit: number[];
    margin_pct: number[];
  };
  top: RankedProduct[];
  negative: RankedProduct[];
  refunded_orders: RefundedOrder[];
}

interface Props {
  profit: ProfitOverview;
  preset: string;
  from?: string | null;
  to?: string | null;
  primary_currency: string;
}

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

const fmtNum = (value: number | null | undefined) => Number(value || 0).toLocaleString('en-US');

const fmtPct = (value: number | null | undefined) => `${Number(value || 0).toFixed(1)}%`;

function EmptyState({ hint, sub }: { hint?: string; sub?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{hint || t('No data for this period')}</p>
      {sub && <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{sub}</p>}
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
    router.get(route('analytics.profit'), params, { preserveScroll: true });
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
                <label className="mb-1 block text-xs text-muted-foreground">{t('From date')}</label>
                <Input type="date" dir="ltr" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">{t('To date')}</label>
                <Input type="date" dir="ltr" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} />
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

function MetricTile({
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
      <CardContent className="space-y-1">
        <div className="truncate text-xl font-bold tabular-nums md:text-2xl">{value}</div>
        {sub && <p className="text-xs leading-relaxed text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

const chartTooltipStyle = {
  background: 'var(--background)',
  color: 'var(--foreground)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  fontSize: '12px',
} as const;

function RankedTable({
  rows,
  negative,
  primaryCurrency,
}: {
  rows: RankedProduct[];
  negative?: boolean;
  primaryCurrency: string;
}) {
  const { t } = useTranslation();

  const fmtValue = (amount: number, code: string) =>
    code === primaryCurrency ? formatCurrency(amount) : `${amount.toLocaleString('en-US')} ${code}`;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="pb-2 pe-3 text-start font-medium">{t('Product')}</th>
              <th className="pb-2 pe-3 text-end font-medium">{t('Units Sold')}</th>
              <th className="pb-2 pe-3 text-end font-medium">{t('Revenue')}</th>
              <th className="pb-2 pe-3 text-end font-medium">{t('Cost')}</th>
              <th className="pb-2 pe-3 text-end font-medium">{t('Gross Profit')}</th>
              <th className="pb-2 text-end font-medium">{t('Margin')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.product_id ?? row.product_sku ?? row.product_name}-${index}`} className="border-b last:border-0">
                <td className="py-2.5 pe-3">
                  <p className="truncate font-medium">{row.product_name}</p>
                  {row.product_sku && <p className="text-xs text-muted-foreground">{row.product_sku}</p>}
                </td>
                <td className="py-2.5 pe-3 text-end tabular-nums">{fmtNum(row.units)}</td>
                <td className="py-2.5 pe-3 text-end tabular-nums text-muted-foreground">{fmtValue(row.revenue, row.currency)}</td>
                <td className="py-2.5 pe-3 text-end tabular-nums text-muted-foreground">{fmtValue(row.cogs, row.currency)}</td>
                <td className={cn('py-2.5 pe-3 text-end font-semibold tabular-nums', negative ? 'text-red-600' : 'text-green-600')}>
                  {fmtValue(row.gross_profit, row.currency)}
                </td>
                <td className={cn('py-2.5 text-end tabular-nums', negative ? 'text-red-600' : 'text-muted-foreground')}>{fmtPct(row.margin_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((row, index) => (
          <div key={`${row.product_id ?? row.product_sku ?? row.product_name}-${index}`} className="rounded-lg border p-3">
            <p className="truncate font-medium">{row.product_name}</p>
            {row.product_sku && <p className="text-xs text-muted-foreground">{row.product_sku}</p>}
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t('Units Sold')}</span>
                <span className="tabular-nums">{fmtNum(row.units)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t('Revenue')}</span>
                <span className="tabular-nums">{fmtValue(row.revenue, row.currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t('Cost')}</span>
                <span className="tabular-nums">{fmtValue(row.cogs, row.currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t('Gross Profit')}</span>
                <span className={cn('font-semibold tabular-nums', negative ? 'text-red-600' : 'text-green-600')}>
                  {fmtValue(row.gross_profit, row.currency)}
                </span>
              </div>
              <div className="col-span-2 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t('Margin')}</span>
                <span className={cn('tabular-nums', negative ? 'text-red-600' : 'text-muted-foreground')}>{fmtPct(row.margin_pct)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Profit({ profit, preset, from, to, primary_currency }: Props) {
  const { t } = useTranslation();

  const summary = profit?.summary ?? [];
  const primary = summary[0];
  const trend = profit?.trend ?? { labels: [], known_revenue: [], cogs: [], gross_profit: [], margin_pct: [] };
  const top = profit?.top ?? [];
  const negative = profit?.negative ?? [];
  const refunded = profit?.refunded_orders ?? [];

  const chartData = useMemo(
    () =>
      trend.labels.map((label, index) => ({
        label,
        known: trend.known_revenue[index] ?? 0,
        cogs: trend.cogs[index] ?? 0,
        gross: trend.gross_profit[index] ?? 0,
      })),
    [trend],
  );

  const showUnknownBanner = !!(primary && primary.unknown_cost_revenue > 0);
  const showPartialRefundBanner = !!(primary && primary.refund_state === 'partial');

  return (
    <PageTemplate
      title={t('Profit')}
      url="/analytics/profit"
      action={<DateRangePicker preset={preset} from={from} to={to} />}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Analytics & Reporting'), href: route('analytics.index') },
        { title: t('Profit') },
      ]}
    >
      {profit?.has_no_store ? (
        <EmptyState hint={t('Select a store to view reports')} />
      ) : !primary ? (
        <Card>
          <CardContent>
            <EmptyState
              hint={t('No cost data yet')}
              sub={t('Set cost price guidance')}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(showUnknownBanner || showPartialRefundBanner) && (
            <div className="space-y-2">
              {showUnknownBanner && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t('Unknown Cost Profit Banner')}</span>
                </div>
              )}
              {showPartialRefundBanner && (
                <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-800">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t('Partial Refund Banner')}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <MetricTile
              title={t('Known Cost Revenue')}
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
              value={formatCurrency(primary.known_revenue)}
              sub={`${fmtNum(primary.known_cost_orders)} / ${fmtNum(primary.total_orders)} ${t('Orders')}`}
            />
            <MetricTile
              title={t('Cost of Goods Sold')}
              icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
              value={formatCurrency(primary.cogs)}
            />
            <MetricTile
              title={t('Gross Profit')}
              icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />}
              value={formatCurrency(primary.gross_profit)}
            />
            <MetricTile
              title={t('Gross Margin')}
              icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
              value={fmtPct(primary.gross_margin_pct)}
            />
            <MetricTile
              title={t('Cost Coverage')}
              icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
              value={fmtPct(primary.cost_coverage_pct)}
            />
            <MetricTile
              title={t('Refund-Adjusted Profit')}
              icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />}
              value={primary.refund_adjusted_profit === null ? '—' : formatCurrency(primary.refund_adjusted_profit)}
              sub={
                primary.refunded_amount > 0
                  ? `${t('Refunded')}: ${formatCurrency(primary.refunded_amount)} ${
                      primary.excluded_refunds > 0 ? `· ${t('Excluded')}: ${formatCurrency(primary.excluded_refunds)}` : ''
                    }`
                  : undefined
              }
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>{t('Gross Profit Trend')}</CardTitle>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#10b77f' }} />
                  {t('Gross Profit')}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#3b82f6' }} />
                  {t('Known Cost Revenue')}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#f59e0b' }} />
                  {t('Cost of Goods Sold')}
                </span>
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
                        <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b77f" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b77f" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={64} />
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        formatter={(value: any, name: any) =>
                          name === 'Gross Profit' || name === 'Known Cost Revenue' || name === 'Cost' ? [formatCurrency(value), name] : [value, name]
                        }
                      />
                      <Area type="monotone" dataKey="known" name={t('Known Cost Revenue')} stroke="#3b82f6" strokeWidth={1.5} fill="transparent" />
                      <Area type="monotone" dataKey="cogs" name={t('Cost of Goods Sold')} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" />
                      <Area type="monotone" dataKey="gross" name={t('Gross Profit')} stroke="#10b77f" strokeWidth={2} fill="url(#profitFill)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Most Profitable Products')}</CardTitle>
            </CardHeader>
            <CardContent>
              {top.length === 0 ? (
                <EmptyState />
              ) : (
                <RankedTable rows={top} primaryCurrency={primary_currency} />
              )}
            </CardContent>
          </Card>

          {negative.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('Negative Margin Products')}</CardTitle>
              </CardHeader>
              <CardContent>
                <RankedTable rows={negative} negative primaryCurrency={primary_currency} />
              </CardContent>
            </Card>
          )}

          {refunded.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('Refunded Orders')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {refunded.map((order) => (
                    <div key={order.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">#{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.currency === primary_currency
                            ? formatCurrency(order.refunded_amount)
                            : `${order.refunded_amount.toLocaleString('en-US')} ${order.currency}`}
                        </p>
                      </div>
                      <Badge variant={order.coverage === 'complete' ? 'outline' : 'secondary'} className="shrink-0">
                        {order.coverage === 'complete' ? t('Complete') : t('Partial')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </PageTemplate>
  );
}