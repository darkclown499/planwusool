import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { router, usePage, Link } from '@inertiajs/react';
import { DollarSign, Download, Eye, Banknote, CheckCircle, Landmark } from 'lucide-react';
import { hasPermission } from '@/utils/permissions';

export default function CodPayments() {
  const { t } = useTranslation();
  const { payments = { data: [] }, filters = {}, stats = { total: 0, pending: 0, partial: 0, paid: 0, failed: 0, returned: 0, total_amount: 0, total_collected: 0, total_remaining: 0, collection_rate: 0 }, auth } = usePage().props as any;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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

  const handleFilterChange = (key: string, value: string) => {
    router.get(route('cod-payments.index'), { ...filters, [key]: value }, { preserveState: true, preserveScroll: true, replace: true });
  };

  return (
    <PageTemplate
      title={t('COD Payment Management')}
      description={t('Track and manage cash on delivery payments')}
      url="/cod-payments"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('COD Payments') }
      ]}
      actions={[
        ...(hasPermission('export-cod-payments') ? [{
          label: t('Export'),
          icon: <Download className="h-4 w-4" />,
          variant: 'outline' as const,
          onClick: handleExport
        }] : [])
      ]}
    >
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Total COD Orders')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.total_amount || 0)} {t('total value')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Pending Collection')}</CardTitle>
              <Banknote className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{(stats.pending || 0) + (stats.partial || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pending || 0} {t('pending')}, {stats.partial || 0} {t('partial')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Collected')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.paid || 0}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.total_collected || 0)} {t('collected')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Collection Rate')}</CardTitle>
              <Landmark className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.collection_rate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.total_remaining || 0)} {t('remaining')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="search" className="sr-only">{t('Search')}</Label>
                <Input
                  id="search"
                  placeholder={t('Search by name, phone, email or order...')}
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
              <div className="w-[180px]">
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('All Status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All Status')}</SelectItem>
                    <SelectItem value="pending">{t('Pending')}</SelectItem>
                    <SelectItem value="partial">{t('Partial')}</SelectItem>
                    <SelectItem value="paid">{t('Paid')}</SelectItem>
                    <SelectItem value="failed">{t('Failed')}</SelectItem>
                    <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                    <SelectItem value="returned">{t('Returned')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('COD Payments')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.data.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-2 text-muted-foreground">{t('No COD payments found')}</p>
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">{t('Order')}</th>
                        <th className="text-left py-3 px-4 font-medium">{t('Customer')}</th>
                        <th className="text-right py-3 px-4 font-medium">{t('Total')}</th>
                        <th className="text-right py-3 px-4 font-medium">{t('Collected')}</th>
                        <th className="text-right py-3 px-4 font-medium">{t('Remaining')}</th>
                        <th className="text-left py-3 px-4 font-medium">{t('Status')}</th>
                        <th className="text-left py-3 px-4 font-medium">{t('Delivery')}</th>
                        <th className="text-left py-3 px-4 font-medium">{t('Date')}</th>
                        <th className="text-left py-3 px-4 font-medium">{t('Actions')}</th>
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
                            <td className="py-3 px-4 text-right font-semibold">
                              {formatCurrency(payment.total_amount)}
                            </td>
                            <td className="py-3 px-4 text-right text-green-600 font-medium">
                              {formatCurrency(payment.amount_collected)}
                            </td>
                            <td className="py-3 px-4 text-right text-amber-600 font-medium">
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

