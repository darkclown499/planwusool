import React, { useState } from 'react';
import { route } from 'ziggy-js';
import { PageTemplate } from '@/components/page-template';
import { router } from '@inertiajs/react';
import { CalendarRange, ChevronDown, Download, FileText, Inbox, Repeat, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/currency-helper';
import { hasPermission } from '@/utils/permissions';
import { cn } from '@/lib/utils';

interface MoneyGroup {
  code: string;
  symbol: string;
  amount: number;
}

interface CountMetric {
  current: number;
  previous: number | null;
  change: { change: number | null; is_new: boolean };
}

interface CustomerAnalyticsPayload {
  has_no_store?: boolean;
  period?: { key: string; from: string; to: string };
  stats?: {
    total_customers: number;
    repeat_customers: number;
    unique_in_period: CountMetric;
    new_customers: CountMetric;
    returning_customers: CountMetric;
    repeat_rate: number;
  };
  new_vs_returning?: {
    new_orders: number;
    returning_orders: number;
  };
  top_customers?: Array<{ name: string; orders: number; spent: MoneyGroup[]; primary_spent: number }>;
}

interface Props {
  customerAnalytics: CustomerAnalyticsPayload;
  preset: string;
  from?: string | null;
  to?: string | null;
}

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

const PRESETS = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month'] as const;

function PeriodPicker({ preset }: { preset: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const applyPreset = (key: string) => {
    setOpen(false);
    router.get(route('analytics.customers'), { preset: key }, { preserveScroll: true });
  };

  const labels: Record<string, string> = {
    today: t('Today'),
    yesterday: t('Yesterday'),
    last_7_days: t('Last 7 Days'),
    last_30_days: t('Last 30 Days'),
    this_month: t('This Month'),
    last_month: t('Last Month'),
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 justify-start gap-2">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <span className="font-normal">{labels[preset] || labels.last_30_days}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-medium transition',
                preset === key ? 'bg-primary text-primary-foreground' : 'bg-muted/60 hover:bg-muted',
              )}
            >
              {labels[key]}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ExportCsv(params: { preset: string; from?: string | null; to?: string | null }) {
  const { t } = useTranslation();
  if (!hasPermission('export-analytics')) return null;
  const query: Record<string, string> = { preset: params.preset };
  if (params.preset === 'custom') {
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <Download className="h-4 w-4" />
          {t('Export CSV')}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => window.open(route('analytics.export.customers', query), '_blank')}>
          <FileText className="h-4 w-4 text-muted-foreground" />
          {t('Customers Report')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(route('analytics.export', query), '_blank')}>
          <FileText className="h-4 w-4 text-muted-foreground" />
          {t('Sales Report')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const fmtNum = (value: number) => Number(value || 0).toLocaleString('en-US');

function StatCard({ title, icon, value, change, isNew, suffix }: {
  title: string;
  icon: React.ReactNode;
  value: string;
  change?: number | null;
  isNew?: boolean;
  suffix?: string;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          {change === undefined ? (
            <span className="text-xs text-muted-foreground">{suffix || '—'}</span>
          ) : change === null ? (
            isNew ? (
              <span className="text-xs font-medium text-green-600">{t('New')}</span>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )
          ) : (
            <span className={cn('text-xs font-medium tabular-nums', change > 0 ? 'text-green-600' : 'text-red-600')}>
              {change > 0 ? '+' : ''}
              {change.toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsCustomers({ customerAnalytics, preset, from, to }: Props) {
  const { t } = useTranslation();

  const stats = customerAnalytics?.stats;
  const nvr = customerAnalytics?.new_vs_returning ?? { new_orders: 0, returning_orders: 0 };
  const topCustomers = customerAnalytics?.top_customers ?? [];

  if (customerAnalytics?.has_no_store) {
    return (
      <PageTemplate title={t('Customers Report')} url="/analytics/customers" breadcrumbs={[{ title: t('Dashboard'), href: route('dashboard') }]}>
        <EmptyState hint={t('Select a store to view reports')} />
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title={t('Customers Report')}
      url="/analytics/customers"
      action={
        <div className="flex items-center gap-2">
          <PeriodPicker preset={preset} />
          <ExportCsv preset={preset} from={from} to={to} />
        </div>
      }
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Analytics & Reporting'), href: route('analytics.index') },
        { title: t('Customers') },
      ]}
    >
      {!stats ? (
        <EmptyState />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title={t('Total Customers')}
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              value={fmtNum(stats.total_customers)}
              suffix={t('all time')}
            />
            <StatCard
              title={t('Repeat Customers')}
              icon={<Repeat className="h-4 w-4 text-muted-foreground" />}
              value={fmtNum(stats.repeat_customers)}
              suffix={t('all time')}
            />
            <StatCard
              title={t('Unique Customers')}
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              value={fmtNum(stats.unique_in_period.current)}
              change={stats.unique_in_period.change?.change}
              isNew={stats.unique_in_period.change?.is_new}
            />
            <StatCard
              title={t('New Customers')}
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              value={fmtNum(stats.new_customers.current)}
              change={stats.new_customers.change?.change}
              isNew={stats.new_customers.change?.is_new}
            />
            <StatCard
              title={t('Returning Customers')}
              icon={<Repeat className="h-4 w-4 text-muted-foreground" />}
              value={fmtNum(stats.returning_customers.current)}
              change={stats.returning_customers.change?.change}
              isNew={stats.returning_customers.change?.is_new}
            />
            <StatCard
              title={t('Repeat Rate')}
              icon={<Repeat className="h-4 w-4 text-muted-foreground" />}
              value={`${stats.repeat_rate.toFixed(1)}%`}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('New vs Returning')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{t('New Orders')}</p>
                    <p className="mt-1 text-xl font-bold tabular-nums">{fmtNum(nvr.new_orders)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{t('Returning Orders')}</p>
                    <p className="mt-1 text-xl font-bold tabular-nums">{fmtNum(nvr.returning_orders)}</p>
                  </div>
                </div>
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
                            {fmtNum(customer.orders)} {t('Orders')}
                          </p>
                        </div>
                        <div className="shrink-0 text-end">
                          <p className="font-semibold tabular-nums text-green-600">{formatCurrency(customer.primary_spent)}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('Total Spending')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}