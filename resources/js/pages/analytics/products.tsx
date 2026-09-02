import React, { FormEvent, useState } from 'react';
import { route } from 'ziggy-js';
import { PageTemplate } from '@/components/page-template';
import { router } from '@inertiajs/react';
import { CalendarRange, ChevronDown, Download, FileText, Inbox, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

interface ProductRow {
  id: number | null;
  name: string;
  units: number;
  orders: number;
  revenue: MoneyGroup[];
  primary: number;
}

interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface Props {
  products: { products: ProductRow[]; pagination: Pagination };
  search: string;
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
    router.get(route('analytics.products'), { preset: key }, { preserveScroll: true });
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
        <DropdownMenuItem onClick={() => window.open(route('analytics.export.products', query), '_blank')}>
          <FileText className="h-4 w-4 text-muted-foreground" />
          {t('Products Report')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open(route('analytics.export', query), '_blank')}>
          <FileText className="h-4 w-4 text-muted-foreground" />
          {t('Sales Report')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AnalyticsProducts({ products, search, preset, from, to }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(search || '');

  const { products: rows, pagination } = products;
  const customQuery: Record<string, string> = { preset };
  if (preset === 'custom') {
    if (from) customQuery.from = from;
    if (to) customQuery.to = to;
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.last_page) return;
    router.get(route('analytics.products'), { ...customQuery, search, page, per_page: pagination.per_page }, { preserveScroll: true });
  };

  const setPerPage = (perPage: number) => {
    router.get(route('analytics.products'), { ...customQuery, search, page: 1, per_page: perPage }, { preserveScroll: true });
  };

  const submitSearch = (event?: FormEvent) => {
    event?.preventDefault();
    router.get(route('analytics.products'), { ...customQuery, search: draft.trim(), page: 1 }, { preserveScroll: true });
  };

  const perPageOptions = [10, 20, 50];

  return (
    <PageTemplate
      title={t('Products Report')}
      url="/analytics/products"
      action={
        <div className="flex items-center gap-2">
          <PeriodPicker preset={preset} />
          <ExportCsv preset={preset} from={from} to={to} />
        </div>
      }
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Analytics & Reporting'), href: route('analytics.index') },
        { title: t('Products') },
      ]}
    >
      <form onSubmit={submitSearch} className="flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            dir="auto"
            className="ps-9"
            placeholder={t('Search Products')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm">
          {t('Search')}
        </Button>
      </form>

      <Card className="mt-4">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Product')}</TableHead>
                  <TableHead className="text-end">{t('Units Sold')}</TableHead>
                  <TableHead className="text-end">{t('Orders')}</TableHead>
                  <TableHead className="text-end">{t('Revenue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id ?? row.name}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-end tabular-nums">{row.units.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-end tabular-nums">{row.orders.toLocaleString('en-US')}</TableCell>
                    <TableCell className="text-end">
                      <span className="font-semibold tabular-nums text-green-600">{formatCurrency(row.primary)}</span>
                      {row.revenue.length > 1 && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {row.revenue.map((g) => `${g.amount.toLocaleString('en-US')} ${g.symbol || g.code}`).join(' · ')}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination.last_page > 1 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            {pagination.total === 0 ? 0 : (pagination.current_page - 1) * pagination.per_page + 1}–{Math.min(
              pagination.current_page * pagination.per_page,
              pagination.total,
            )}{' '}
            {t('of')} {pagination.total.toLocaleString('en-US')}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.current_page <= 1}
              onClick={() => goToPage(pagination.current_page - 1)}
            >
              {t('Previous')}
            </Button>
            {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
              .filter((page) => Math.abs(page - pagination.current_page) <= 2)
              .map((page) => (
                <Button
                  key={page}
                  variant={page === pagination.current_page ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 px-0"
                  onClick={() => goToPage(page)}
                >
                  {page}
                </Button>
              ))}
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.current_page >= pagination.last_page}
              onClick={() => goToPage(pagination.current_page + 1)}
            >
              {t('Next')}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('Per Page')}</span>
            <select
              className="h-8 rounded-md border bg-background px-2 text-sm"
              value={pagination.per_page}
              onChange={(e) => setPerPage(Number(e.target.value))}
            >
              {perPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}