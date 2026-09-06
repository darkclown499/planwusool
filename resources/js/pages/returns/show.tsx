import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { usePage, router, Link } from '@inertiajs/react';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/currency-helper';
import { tReturnStatus, tReturnRefundStatus } from '@/utils/order-status';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const REASONS: Record<string, string> = {
  not_suitable: 'المنتج غير مناسب',
  wrong_size: 'المقاس غير مناسب',
  damaged: 'وصل المنتج تالفاً',
  different_description: 'المنتج مختلف عن الوصف',
  wrong_product: 'وصل منتج خاطئ',
  other: 'سبب آخر',
};

function getReasonText(reason?: string | null): string {
  if (!reason) return '-';
  return REASONS[reason] ?? reason;
}

function formatDateValue(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' });
}

function customerName(c?: any): string {
  if (!c) return '';
  return c.full_name || c.email || c.phone || '';
}

function StatusBadge({ status }: { status: string }) {
  const s = String(status ?? '').toLowerCase();
  const variant: any =
    s === 'completed' ? 'default'
    : s === 'approved' || s === 'received' ? 'secondary'
    : s === 'rejected' || s === 'cancelled' ? 'destructive'
    : 'outline';
  return <Badge variant={variant}>{tReturnStatus(status)}</Badge>;
}

export default function ReturnShow() {
  const { ret, order } = usePage().props as any;
  const [restockQty, setRestockQty] = useState<Record<number, number>>({});
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('');
  const [confirm, setConfirm] = useState<null | { action: 'reject' | 'complete' | 'refund'; title: string; desc: string }>(null);
  const [submitting, setSubmitting] = useState(false);

  const status = String(ret.status || '').toLowerCase();

  const post = (url: string, data: any, extra = {}) => {
    setSubmitting(true);
    router.post(url, data, {
      preserveScroll: true,
      onSuccess: () => { setSubmitting(false); toast.success('تم'); },
      onError: (e) => { setSubmitting(false); toast.error(Object.values(e)[0] as any); },
      ...extra,
    });
  };

  const runAction = () => {
    if (!confirm) return;
    if (confirm.action === 'reject') {
      post(route('returns.reject', ret.id), { merchant_note: '' });
    } else if (confirm.action === 'complete') {
      post(route('returns.complete', ret.id), {});
    } else if (confirm.action === 'refund') {
      post(route('returns.refund', ret.id), { amount: parseFloat(refundAmount) || 0, method: refundMethod });
    }
    setConfirm(null);
  };

  const timeline: { label: string; value: string | null }[] = [
    { label: 'تاريخ تقديم الطلب', value: ret.requested_at || ret.created_at },
    { label: 'تاريخ الموافقة', value: ret.approved_at },
    { label: 'تاريخ الاستلام', value: ret.received_at },
    { label: 'تاريخ الإكمال', value: ret.completed_at },
    { label: 'تاريخ الإلغاء', value: ret.cancelled_at },
  ].filter((t) => t.value);

  return (
    <PageTemplate
      title={`المرتجع ${ret.return_number}`}
      url={`/returns/${ret.id}`}
      breadcrumbs={[{ title: 'المرتجعات', href: route('returns.index') }, { title: ret.return_number }]}
    >
      <div className="space-y-4">
        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              المرتجع {ret.return_number}
              <StatusBadge status={status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <p className="flex flex-wrap items-center gap-1">
                <span className="text-muted-foreground">الطلب الأصلي:</span>
                <Link href={route('orders.show', order?.id ?? ret.order_id)} className="font-semibold text-primary hover:underline ltr-num">
                  {order?.order_number ?? ret.order_id}
                </Link>
              </p>
              <p><span className="text-muted-foreground">العميل:</span> {customerName(ret.customer) || ret.customer_email || '-'}</p>
              <p><span className="text-muted-foreground">سبب الإرجاع:</span> {getReasonText(ret.reason)}</p>
              <p>
                <span className="text-muted-foreground">حالة الاسترداد:</span>{' '}
                {ret.refund_amount > 0
                  ? `${tReturnRefundStatus(ret.refund_status)} — ${formatCurrency(ret.refund_amount)}`
                  : 'لا يوجد استرداد مالي'}
              </p>
            </div>
            {ret.customer_note && (
              <p><span className="text-muted-foreground">ملاحظة العميل:</span> {ret.customer_note}</p>
            )}
            {ret.merchant_note && (
              <p><span className="text-muted-foreground">ملاحظة المتجر:</span> {ret.merchant_note}</p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2">
              {status === 'requested' && (
                <>
                  <Button size="sm" onClick={() => post(route('returns.approve', ret.id), { merchant_note: '' })}>
                    قبول الإرجاع
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirm({ action: 'reject', title: 'رفض طلب الإرجاع؟', desc: 'سيُرفض هذا الطلب ولن يتم استلام المنتج أو إعادة تخزينه. لا يعود المبلغ للعميل تلقائياً.' })}>
                    رفض الإرجاع
                  </Button>
                </>
              )}
              {(status === 'approved' || status === 'in_transit') && (
                <Button size="sm" onClick={() => post(route('returns.received', ret.id), {})}>
                  تم استلام المنتج
                </Button>
              )}
              {status === 'received' && (
                <Button
                  size="sm"
                  onClick={() => setConfirm({ action: 'complete', title: 'إكمال الإرجاع؟', desc: 'سيُغلق طلب الإرجاع. تذكّر تسجيل إعادة التخزين أو الاسترداد المالي قبل الإكمال إذا لم يتمّ بعد.' })}
                >
                  إكمال الإرجاع
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Items + restock */}
        <Card>
          <CardHeader><CardTitle>المنتجات المرتجعة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ret.items?.map((it: any) => (
              <div key={it.id} className="border rounded p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-sm">{it.order_item?.product_name ?? it.product_id}</p>
                  <StatusBadge status={status} />
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                  <span className="text-muted-foreground">الكمية المطلوب إرجاعها: <b className="text-foreground">{it.quantity}</b></span>
                  <span className="text-muted-foreground">المعاد تخزينها: <b className="text-foreground">{it.restocked_quantity}</b></span>
                  <span className="text-muted-foreground">سبب الإرجاع: <b className="text-foreground">{getReasonText(it.reason)}</b></span>
                </div>
                {status === 'received' && (
                  <div className="flex gap-2 items-end pt-1">
                    <div className="w-32">
                      <Label className="text-xs">الكمية لإعادة التخزين</Label>
                      <Input
                        type="number"
                        min={0}
                        max={it.quantity - it.restocked_quantity}
                        value={restockQty[it.id] ?? ''}
                        onChange={(e) => setRestockQty({ ...restockQty, [it.id]: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>
                    <Button size="sm" onClick={() => post(route('returns.restock', ret.id), { items: [{ return_item_id: it.id, quantity: restockQty[it.id] || 0 }] })}>
                      إعادة للمخزون
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {status === 'received' && (
              <p className="text-xs text-muted-foreground">
                أعد تخزين الكمية المستلمة من كل منتج عند استلامه. تُحتسب الكمية المعاد تخزينها مرة واحدة فقط.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Manual refund */}
        {['received', 'approved', 'completed'].includes(status) && (
          <Card>
            <CardHeader><CardTitle>تسجيل استرداد مالي (يدوي)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                إكمال الإرجاع لا يعني إعادة المبلغ تلقائياً. سجّل هنا الاسترداد بعد تنفيذ عملية الإرجاع المالي لدى مزوّد الدفع أو يدوياً.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>المبلغ</Label>
                  <Input type="number" step="0.01" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <Label>الطريقة</Label>
                  <Input value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} placeholder="نقداً / تحويل بنكي" />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => setConfirm({ action: 'refund', title: 'تسجيل الاسترداد المالي؟', desc: 'سيُسلَّج مبلغ الاسترداد ويُحدَّث حالة الدفع للطلب. تأكد من تنفيذ التحويل الفعلي خارج النظام.' })}>
                    تسجيل
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'requested' && (
          <p className="text-xs text-muted-foreground">
            طلب إرجاع جديد بانتظار قرارك. عند القبول، ينتقل الطلب لمرحلة استلام المنتج. عند الرفض يُغلق الطلب دون استلام المنتج.
          </p>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <Card>
            <CardHeader><CardTitle>الخط الزمني</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {timeline.map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-muted-foreground text-xs">{t.label}</p>
                    <p className="ltr-num text-xs">{formatDateValue(t.value)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Separator />
      </div>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.desc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>إلغاء</Button>
            <Button variant={confirm?.action === 'reject' ? 'destructive' : 'default'} onClick={runAction} disabled={submitting}>
              {confirm?.action === 'reject' ? 'رفض' : confirm?.action === 'complete' ? 'إكمال' : 'تسجيل'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
