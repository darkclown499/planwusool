import React, { useState, useEffect, useRef } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { ShoppingCart, ShoppingBag, Download, Trash2, Send, CheckCircle, DollarSign, Search, MessageCircle } from 'lucide-react';
import { hasPermission } from '@/utils/permissions';

export default function AbandonedCarts() {
  const { t } = useTranslation();
  const { carts = { data: [] }, stats = { total: 0, new: 0, reminder_sent: 0, recovered: 0, expired: 0, recovered_amount: 0, total_abandoned_amount: 0, recovery_rate: 0 }, filters = {}, currency_symbol } = usePage().props as any;
  const [cartToDelete, setCartToDelete] = useState<number | null>(null);
  const [search, setSearch] = useState(filters.search || '');
  const [status, setStatus] = useState(filters.status || 'all');
  const didMount = useRef(false);

  const currencySymbol: string = typeof currency_symbol === 'string' && currency_symbol ? currency_symbol : '₪';

  const formatCurrency = (amount: number) => {
    const value = (Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${currencySymbol} ${value}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      new: { variant: 'default' as const, label: t('New') },
      reminder_sent: { variant: 'secondary' as const, label: t('Reminder Sent') },
      recovered: { variant: 'outline' as const, label: t('Recovered') },
      expired: { variant: 'destructive' as const, label: t('Expired') },
      unsubscribed: { variant: 'destructive' as const, label: t('Unsubscribed') },
    };
    return variants[status] || { variant: 'default' as const, label: status };
  };

  const handleSendReminder = (cartId: number) => {
    router.post(route('abandoned-carts.send-reminder', cartId), {}, { preserveScroll: true });
  };

  const handleMarkRecovered = (cartId: number) => {
    router.post(route('abandoned-carts.mark-recovered', cartId), {}, { preserveScroll: true });
  };

  const handleExport = () => {
    window.open(route('abandoned-carts.export'), '_blank');
  };

  const handleDelete = () => {
    if (cartToDelete) {
      router.delete(route('abandoned-carts.destroy', cartToDelete));
      setCartToDelete(null);
    }
  };

  useEffect(() => {
    if (!didMount.current) {
      return;
    }
    const debounce = setTimeout(() => {
      router.get(
        route('abandoned-carts.index'),
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
      route('abandoned-carts.index'),
      { search: search.trim() || undefined, status: status === 'all' ? undefined : status },
      { preserveState: true, replace: true, preserveScroll: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <PageTemplate
      title={t('Abandoned Cart Recovery')}
      description={t('Track and recover abandoned shopping carts')}
      url="/abandoned-carts"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Abandoned Carts') }
      ]}
    >
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('Total Carts')}</p>
                <div className="mt-2 text-2xl font-bold text-foreground">{stats.total || 0}</div>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ShoppingCart className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('Recovered')}</p>
                  <div className="mt-2 text-2xl font-bold text-green-600">{stats.recovered || 0}</div>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-green-600">{stats.recovery_rate || 0}%</span>
                <span className="text-xs font-medium text-muted-foreground">{t('recovery rate')}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('Pending Recovery')}</p>
                  <div className="mt-2 text-2xl font-bold text-amber-600">{(stats.new || 0) + (stats.reminder_sent || 0)}</div>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <ShoppingCart className="h-6 w-6" />
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground">{stats.new || 0} {t('new')}, {stats.reminder_sent || 0} {t('reminder sent')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('Recovered Revenue')}</p>
                  <div className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(stats.recovered_amount || 0)}</div>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground">{formatCurrency(stats.total_abandoned_amount || 0)} {t('in abandoned carts')}</p>
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
                placeholder={t('Search by customer name or phone...')}
                className="ps-9"
                aria-label={t('Search by customer name or phone...')}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Statuses')}</SelectItem>
                <SelectItem value="new">{t('Pending Recovery')}</SelectItem>
                <SelectItem value="reminder_sent">{t('Reminder Sent')}</SelectItem>
                <SelectItem value="recovered">{t('Recovered')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasPermission('export-abandoned-carts') && (
            <Button type="button" variant="outline" onClick={handleExport} className="shrink-0">
              <Download className="h-4 w-4 me-2" />
              {t('Export Data')}
            </Button>
          )}
        </div>

        {/* Carts List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t('Abandoned Carts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {carts.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                      <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <span className="absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <span className="text-[10px] font-bold">!</span>
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{t('No abandoned carts yet')}</h3>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    {t('Abandoned carts will appear here when customers leave without completing checkout, so you can remind them and win them back.')}
                  </p>
                  <Button type="button" className="mt-6" onClick={() => router.visit(route('settings'))}>
                    <MessageCircle className="h-4 w-4 me-2" />
                    {t('Set up WhatsApp reminder automation')}
                  </Button>
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-start py-3 px-4 font-medium">{t('Customer')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Contact')}</th>
                        <th className="text-end py-3 px-4 font-medium">{t('Cart Total')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Items')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Status')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Last Activity')}</th>
                        <th className="text-start py-3 px-4 font-medium">{t('Actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carts.data.map((cart: any) => {
                        const badge = getStatusBadge(cart.status);
                        const items = Array.isArray(cart.cart_items) ? cart.cart_items : [];
                        const hasEmailOrPhone = cart.customer_email || cart.customer_phone;

                        return (
                          <tr key={cart.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-4 font-medium">
                              {cart.customer_name || cart.customer_id ? `#${cart.customer_id}` : t('Guest')}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {cart.customer_email && <div>{cart.customer_email}</div>}
                              {cart.customer_phone && <div>{cart.customer_phone}</div>}
                              {!cart.customer_email && !cart.customer_phone && <span className="text-xs">-</span>}
                            </td>
                            <td className="py-3 px-4 text-end font-semibold">{formatCurrency(cart.cart_total)}</td>
                            <td className="py-3 px-4">{items.length} {t('items')}</td>
                            <td className="py-3 px-4">
                              <Badge variant={badge.variant}>{badge.label}</Badge>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                              {cart.last_activity_at ? new Date(cart.last_activity_at).toLocaleDateString() : '-'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                {hasPermission('send-abandoned-cart-reminders') && cart.status !== 'recovered' && cart.status !== 'expired' && hasEmailOrPhone && (
                                  <Button variant="ghost" size="sm" onClick={() => handleSendReminder(cart.id)}>
                                    <Send className="h-4 w-4 text-blue-600" />
                                  </Button>
                                )}
                                {cart.status !== 'recovered' && (
                                  <Button variant="ghost" size="sm" onClick={() => handleMarkRecovered(cart.id)}>
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                                {hasPermission('delete-abandoned-carts') && (
                                  <Button variant="ghost" size="sm" onClick={() => setCartToDelete(cart.id)}>
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <Dialog open={!!cartToDelete} onOpenChange={(open) => !open && setCartToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Delete Cart')}</DialogTitle>
            <DialogDescription>{t('Are you sure you want to delete this abandoned cart record?')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCartToDelete(null)}>{t('Cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t('Delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}