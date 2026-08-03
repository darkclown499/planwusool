import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { router, usePage, Link } from '@inertiajs/react';
import { ArrowLeft, DollarSign, Banknote, CheckCircle, XCircle, Truck, Clock, AlertTriangle } from 'lucide-react';
import { hasPermission } from '@/utils/permissions';

interface PaymentHistoryEntry {
  id: number;
  amount: number;
  payment_method: string;
  collected_by_name: string | null;
  collected_by_user: string | null;
  reference: string | null;
  notes: string | null;
  collected_at: string;
}

interface PaymentItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface Payment {
  id: number;
  order_number: string;
  order_status: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  total_amount: number;
  cod_fee: number;
  amount_collected: number;
  amount_remaining: number;
  status: string;
  delivery_company: string | null;
  delivery_tracking_number: string | null;
  notes: string | null;
  created_at: string;
  collected_at: string | null;
  history: PaymentHistoryEntry[];
  items: PaymentItem[];
}

export default function CodPaymentShow() {
  const { t } = useTranslation();
  const { payment } = usePage().props as any;

  const [collectDialogOpen, setCollectDialogOpen] = useState(false);
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  // Collection form
  const [collectAmount, setCollectAmount] = useState(payment.amount_remaining);
  const [collectMethod, setCollectMethod] = useState('cash');
  const [collectByName, setCollectByName] = useState('');
  const [collectReference, setCollectReference] = useState('');
  const [collectNotes, setCollectNotes] = useState('');

  // Delivery form
  const [deliveryCompany, setDeliveryCompany] = useState(payment.delivery_company || '');
  const [deliveryTracking, setDeliveryTracking] = useState(payment.delivery_tracking_number || '');
  const [deliveryNotes, setDeliveryNotes] = useState(payment.notes || '');

  // Status form
  const [newStatus, setNewStatus] = useState('failed');
  const [statusNotes, setStatusNotes] = useState('');

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

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: t('Cash'),
      card_terminal: t('Card Terminal'),
      bank_transfer: t('Bank Transfer'),
      other: t('Other'),
    };
    return labels[method] || method;
  };

  const handleCollect = () => {
    router.post(route('cod-payments.collect', payment.id), {
      amount: collectAmount,
      payment_method: collectMethod,
      collected_by_name: collectByName,
      reference: collectReference,
      notes: collectNotes,
    }, { preserveScroll: true, onSuccess: () => setCollectDialogOpen(false) });
  };

  const handleUpdateDelivery = () => {
    router.post(route('cod-payments.delivery-info', payment.id), {
      delivery_company: deliveryCompany,
      delivery_tracking_number: deliveryTracking,
      notes: deliveryNotes,
    }, { preserveScroll: true, onSuccess: () => setDeliveryDialogOpen(false) });
  };

  const handleChangeStatus = () => {
    router.post(route('cod-payments.status', payment.id), {
      status: newStatus,
      notes: statusNotes,
    }, { preserveScroll: true, onSuccess: () => setStatusDialogOpen(false) });
  };

  const badge = getStatusBadge(payment.status);
  const isCollectable = payment.status === 'pending' || payment.status === 'partial';
  const isActive = payment.status !== 'paid' && payment.status !== 'cancelled' && payment.status !== 'returned';

  return (
    <PageTemplate
      title={`${t('COD Payment')} #${payment.order_number}`}
      description={t('Manage cash on delivery payment details')}
      url={`/cod-payments/${payment.id}`}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('COD Payments'), href: route('cod-payments.index') },
        { title: `#${payment.order_number}` }
      ]}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Link
          href={route('cod-payments.index')}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 me-1" />
          {t('Back to COD Payments')}
        </Link>

        {/* Payment Summary Card */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Order Total')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(payment.total_amount)}</div>
              <p className="text-xs text-muted-foreground">{t('COD Fee')}: {formatCurrency(payment.cod_fee)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Collected')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(payment.amount_collected)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Remaining')}</CardTitle>
              <Banknote className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatCurrency(payment.amount_remaining)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('Status')}</CardTitle>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mt-2">
                {isCollectable && hasPermission('collect-cod-payments') && (
                  <Button size="sm" onClick={() => setCollectDialogOpen(true)}>
                    <DollarSign className="h-4 w-4 me-1" />
                    {t('Collect Payment')}
                  </Button>
                )}
                {isActive && hasPermission('manage-cod-payments') && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setDeliveryDialogOpen(true)}>
                      <Truck className="h-4 w-4 me-1" />
                      {t('Delivery Info')}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setStatusDialogOpen(true)}>
                      <AlertTriangle className="h-4 w-4 me-1" />
                      {t('Change Status')}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer & Order Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('Customer Information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Name')}:</span>
                <span className="font-medium">{payment.customer_name || t('N/A')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Phone')}:</span>
                <span className="font-medium">{payment.customer_phone || t('N/A')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Email')}:</span>
                <span className="font-medium">{payment.customer_email || t('N/A')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Order Status')}:</span>
                <span className="font-medium capitalize">{payment.order_status || t('N/A')}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('Delivery Information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Delivery Company')}:</span>
                <span className="font-medium">{payment.delivery_company || t('Not set')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Tracking Number')}:</span>
                <span className="font-medium">{payment.delivery_tracking_number || t('Not set')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Created At')}:</span>
                <span className="font-medium">{payment.created_at ? new Date(payment.created_at).toLocaleString() : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Collected At')}:</span>
                <span className="font-medium">{payment.collected_at ? new Date(payment.collected_at).toLocaleString() : '-'}</span>
              </div>
              {payment.notes && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground block mb-1">{t('Notes')}:</span>
                  <p className="text-sm">{payment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        {payment.items && payment.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('Order Items')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">{t('Product')}</th>
                      <th className="text-right py-2 px-3 font-medium">{t('Price')}</th>
                      <th className="text-right py-2 px-3 font-medium">{t('Qty')}</th>
                      <th className="text-right py-2 px-3 font-medium">{t('Total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payment.items.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2 px-3">{item.name}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(item.price)}</td>
                        <td className="py-2 px-3 text-right">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-medium">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Collection History')}</CardTitle>
          </CardHeader>
          <CardContent>
            {payment.history && payment.history.length > 0 ? (
              <div className="space-y-3">
                {payment.history.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{formatCurrency(entry.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {getMethodLabel(entry.payment_method)}
                          {entry.collected_by_name && ` · ${entry.collected_by_name}`}
                          {entry.collected_by_user && ` · ${entry.collected_by_user}`}
                        </p>
                        {entry.reference && (
                          <p className="text-xs text-muted-foreground">{t('Ref')}: {entry.reference}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {entry.collected_at ? new Date(entry.collected_at).toLocaleString() : '-'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Clock className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
                <p className="mt-2 text-sm text-muted-foreground">{t('No collection history yet')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Collect Payment Dialog */}
      <Dialog open={collectDialogOpen} onOpenChange={setCollectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Record Payment Collection')}</DialogTitle>
            <DialogDescription>
              {t('Record a partial or full payment collection for this COD order.')}
              <br />
              {t('Remaining')}: <strong>{formatCurrency(payment.amount_remaining)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">{t('Amount')}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={payment.amount_remaining}
                value={collectAmount}
                onChange={(e) => setCollectAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="method">{t('Payment Method')}</Label>
              <Select value={collectMethod} onValueChange={setCollectMethod}>
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('Cash')}</SelectItem>
                  <SelectItem value="card_terminal">{t('Card Terminal')}</SelectItem>
                  <SelectItem value="bank_transfer">{t('Bank Transfer')}</SelectItem>
                  <SelectItem value="other">{t('Other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="collected_by">{t('Collected By')}</Label>
              <Input
                id="collected_by"
                value={collectByName}
                onChange={(e) => setCollectByName(e.target.value)}
                placeholder={t('Driver / staff name')}
              />
            </div>
            <div>
              <Label htmlFor="reference">{t('Reference')} ({t('optional')})</Label>
              <Input
                id="reference"
                value={collectReference}
                onChange={(e) => setCollectReference(e.target.value)}
                placeholder={t('Transaction ID or receipt number')}
              />
            </div>
            <div>
              <Label htmlFor="collectNotes">{t('Notes')} ({t('optional')})</Label>
              <Textarea
                id="collectNotes"
                value={collectNotes}
                onChange={(e) => setCollectNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleCollect} disabled={!collectAmount || collectAmount <= 0}>
              <DollarSign className="h-4 w-4 me-1" />
              {t('Record Collection')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Info Dialog */}
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Update Delivery Information')}</DialogTitle>
            <DialogDescription>
              {t('Update the delivery company and tracking number.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deliveryCompany">{t('Delivery Company')}</Label>
              <Input
                id="deliveryCompany"
                value={deliveryCompany}
                onChange={(e) => setDeliveryCompany(e.target.value)}
                placeholder={t('e.g., Aramex, DHL, FedEx')}
              />
            </div>
            <div>
              <Label htmlFor="trackingNumber">{t('Tracking Number')}</Label>
              <Input
                id="trackingNumber"
                value={deliveryTracking}
                onChange={(e) => setDeliveryTracking(e.target.value)}
                placeholder={t('Delivery tracking number')}
              />
            </div>
            <div>
              <Label htmlFor="deliveryNotes">{t('Notes')} ({t('optional')})</Label>
              <Textarea
                id="deliveryNotes"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                rows={2}
                placeholder={t('Additional notes')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleUpdateDelivery}>
              <Truck className="h-4 w-4 me-1" />
              {t('Update Delivery Info')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Change Payment Status')}</DialogTitle>
            <DialogDescription>
              {t('Mark this COD payment as failed, cancelled, or returned. This action is irreversible.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newStatus">{t('New Status')}</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger id="newStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="failed">{t('Failed')}</SelectItem>
                  <SelectItem value="cancelled">{t('Cancelled')}</SelectItem>
                  <SelectItem value="returned">{t('Returned')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="statusNotes">{t('Reason / Notes')}</Label>
              <Textarea
                id="statusNotes"
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
                placeholder={t('Explain why this payment is being marked as...')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>{t('Cancel')}</Button>
            <Button variant="destructive" onClick={handleChangeStatus}>
              <XCircle className="h-4 w-4 me-1" />
              {t('Change Status')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}

