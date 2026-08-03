import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { ShoppingCart, Download, Trash2, Send, CheckCircle, DollarSign } from 'lucide-react';
import { hasPermission, checkPermission } from '@/utils/permissions';

export default function AbandonedCarts() {
  const { t } = useTranslation();
  const { carts = { data: [] }, stats = { total: 0, new: 0, reminder_sent: 0, recovered: 0, expired: 0, recovered_amount: 0, total_abandoned_amount: 0, recovery_rate: 0 }, auth } = usePage().props as any;
  const [cartToDelete, setCartToDelete] = useState<number | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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

  return (
    <PageTemplate
      title={t('Abandoned Cart Recovery')}
      description={t('Track and recover abandoned shopping carts')}
      url="/abandoned-carts"
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Abandoned Carts') }
      ]}
      actions={[
        ...(hasPermission('export-abandoned-carts') ? [{
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
              <CardTitle className="text-sm font-medium">{t('Total Carts')}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Recovered')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.recovered || 0}</div>
              <p className="text-xs text-muted-foreground">{stats.recovery_rate || 0}% {t('recovery rate')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Pending Recovery')}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{(stats.new || 0) + (stats.reminder_sent || 0)}</div>
              <p className="text-xs text-muted-foreground">{stats.new || 0} {t('new')}, {stats.reminder_sent || 0} {t('reminder sent')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Recovered Revenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.recovered_amount || 0)}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(stats.total_abandoned_amount || 0)} {t('in abandoned carts')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Carts List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Abandoned Carts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {carts.data.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="mt-2 text-muted-foreground">{t('No abandoned carts found')}</p>
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">{t('Customer')}</th>
                        <th className="text-left py-3 px-4 font-medium">{t('Contact')}</th>
                        <th className="text-right py-3 px-4 font-medium">{t('Cart Total')}</th>
                        <th className="text-left py-3 px-4 font-medium">{t('Items')}</th>
                        <th className="text-left py-3 px-4 font-medium">{t('Status')}</th>
                        <th className="text-left py-3 px-4 font-medium">{t('Last Activity')}</th>
                        <th className="text-left py-3 px-4 font-medium">{t('Actions')}</th>
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
                            <td className="py-3 px-4 text-right font-semibold">{formatCurrency(cart.cart_total)}</td>
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

