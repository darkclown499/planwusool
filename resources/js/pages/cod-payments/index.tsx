import React, { useState, useEffect, useRef } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { router, usePage, Link } from '@inertiajs/react';
import { Download, Eye, Banknote, Clock, CheckCircle2, Percent, Search } from 'lucide-react';
import { hasPermission } from '@/utils/permissions';

export default function CodPayments() {
  const { t } = useTranslation();
  const { payments = { data: [], links: [] }, filters = {}, stats = { total: 0, pending: 0, partial: 0, paid: 0, failed: 0, returned: 0, total_amount: 0, total_collected: 0, total_remaining: 0, collection_rate: 0 }, currency_symbol } = usePage().props as any;

  const [search, setSearch] = useState(filters.search || '');
  const [status, setStatus] = useState(filters.status || 'all');
  const didMount = useRef(false);

  const currencySymbol: string = typeof currency_symbol === 'string' && currency_symbol ? currency_symbol : '₪';

  const formatCurrency = (amount: number) => {
    const value = (Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${currencySymbol} ${value}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: t('Pending') },
      partial: { variant: 'default', label: t('Partial') },
      paid: { variant: 'outline', label: t('Paid') },
      failed: { variant: 'destructive', label: t('Failed') },
      cancelled: { variant: 'destructive', label: t('Cancelled') },
      returned: { variant: 'destructive', label: t('Returned') },
    };
    return variants[status] || { variant: 'default' as const, label: status };
  };

  const handleExport = () => {
    window.open(route('cod-payments.export'), '_blank');
  };

  useEffect(() => {
    if (!didMount.current) {
      return;
    }
    const debounce = setTimeout(() => {
      router.get(
        route('cod-payments.index'),
        { search: search.trim() || undefined, status: status === 'all' ? undefined : status },
        { preserveState: true, replace: true, preserveScroll: true }
      );
    }, 400);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    router.get(
      route('cod-payments.index'),
      { search: search.trim() || undefined, status: status === 'all' ? undefined : status },
      { preserveState: true, replace: true, preserveScroll: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <PageTemplate
      title={t('COD Payment Management')}
      description={t('Track and manage cash on delivery payments')}
      url="/cod-payments"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('COD Payments') }
      ]}
    >
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Total COD Revenue')}</p>
                <div className="mt-2 text-2xl font-bold text-foreground">{stats.total || 0}</div>
                <p className="mt-2 text-xs font-medium text-muted-foreground">{formatCurrency(stats.total_amount || 0)} {t('total value')}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Banknote className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Pending Collection')}</p>
                <div className="mt-2 text-2xl font-bold text-amber-600">{(stats.pending || 0) + (stats.partial || 0)}</div>
                <p className="mt-2 text-xs font-medium text-muted-foreground">{stats.pending || 0} {t('pending')}, {stats.partial || 0} {t('partial')}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Collected Revenue')}</p>
                <div className="mt-2 text-2xl font-bold text-green-600">{stats.paid || 0}</div>
                <p className="mt-2 text-xs font-medium text-muted-foreground">{formatCurrency(stats.total_collected || 0)} {t('collected')}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Collection Rate')}</p>
                <div className="mt-2 text-2xl font-bold text-violet-600">{stats.collection_rate || 0}%</div>
                <p className="mt-2 text-xs font-medium text-muted-foreground">{formatCurrency(stats.total_remaining || 0)} {t('remaining')}</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Percent className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('Search by name, phone, email or order...')}
                className="ps-9"
                aria-label={t('Search by name, phone, email or order...')}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Statuses')}</SelectItem>
                <SelectItem value="pending">{t('pending')}</SelectItem>
                <SelectItem value="paid">{t('collected')}</SelectItem>
                <SelectItem value="partial">{t('Partially collected')}</SelectItem>
                <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasPermission('export-cod-payments') && (
            <Button type="button" variant="outline" onClick={handleExport} className="shrink-0">
              <Download className="h-4 w-4 me-2" />
              {t('Export')}
            </Button>
          )}
        </div>

        {/* Payments List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t('COD Payments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                      <Banknote className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <span className="absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <span className="text-[10px] font-bold">!</span>
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{t('No COD payments yet')}</h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    {t('COD payments will appear here for you to track collection on cash on delivery orders.')}
                  </p>
                  <Button type="button" className="mt-6" onClick={() => router.visit(route('settings'))}>
                    <Banknote className="h-4 w-4 me-2" />
                    {t('COD fee settings')}
                  </Button>
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-start py-3 px-4 font-medium">{t('Order')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Customer')}</th>
                        <th className="text-end py-3 px-4 font-medium">{t('Total')}</th>
                        <th className="text-end py-3 px-4 font-medium">{t('Collected')}</th>
                        <th className="text-end py-3 px-4 font-medium">{t('Remaining')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Status')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Delivery')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Date')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.data.map((payment: any) => {
                        const badge = getStatusBadge(payment.status);
                        return (
                          <tr key={payment.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 font-mono text-xs">
                              #{payment.order_number || 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium">{payment.customer_name || t('N/A')}</div>
                              {payment.customer_phone && (
                                <div className="text-xs text-muted-foreground">{payment.customer_phone}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-end font-semibold">
                              {formatCurrency(payment.total_amount)}
                            </td>
                            <td className="py-3 px-4 text-end text-green-600 font-medium">
                              {formatCurrency(payment.amount_collected)}
                            </td>
                            <td className="py-3 px-4 text-end text-amber-600 font-medium">
                              {formatCurrency(payment.amount_remaining)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                            </td>
                            <td className="py-3 px-4 text-xs text-muted-foreground">
                              {payment.delivery_company || '-'}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground whitespace-nowrap text-xs">
                              {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : '-'}
                            </td>
                            <td className="py-3 px-4">
                              <Link
                                href={route('cod-payments.show', payment.id)}
                                className="inline-flex items-center text-primary hover:underline"
                              >
                                <Eye className="h-4 w-4 me-1" />
                                {t('View')}
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {payments.links && payments.links.length > 3 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    {t('Showing')} {payments.from || 0} – {payments.to || 0} {t('of')} {payments.total || 0}
                  </p>
                  <div className="flex gap-1">
                    {payments.links.map((link: any, idx: number) => {
                      if (link.url === null) {
                        return (
                          <span
                            key={idx}
                            className="px-2 py-1 text-sm text-muted-foreground cursor-not-allowed"
                            dangerouslySetInnerHTML={{ __html: link.label }}
                          />
                        );
                      }
                      return (
                        <Button
                          key={idx}
                          variant={link.active ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => router.get(link.url, {}, { preserveScroll: true })}
                          dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}