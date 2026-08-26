import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePage, router } from '@inertiajs/react';
import { toast } from 'sonner';

export default function ReturnShow() {
  const { ret, order } = usePage().props as any;
  const [restockQty, setRestockQty] = useState<Record<number, number>>({});
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('');

  const post = (url:string, data:any) => {
    router.post(url, data, { preserveScroll:true, onSuccess:()=>toast.success('تم'), onError:(e)=>toast.error(Object.values(e)[0] as any) });
  };

  return (
    <PageTemplate title={`الإرجاع ${ret.return_number}`} url={`/returns/${ret.id}`} breadcrumbs={[{title:'المرتجعات', href: route('returns.index')},{title: ret.return_number}] }>
      <div className="space-y-4" dir="rtl">
        <Card>
          <CardHeader><CardTitle>الإرجاع {ret.return_number} — {ret.status}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">الطلب:</span> {order?.order_number ?? ret.order_id}</p>
            <p><span className="text-muted-foreground">السبب:</span> {ret.reason}</p>
            <p><span className="text-muted-foreground">ملاحظة العميل:</span> {ret.customer_note || '-'}</p>
            <p><span className="text-muted-foreground">الاسترداد:</span> {ret.refund_status} — {ret.refund_amount}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {ret.status==='requested' && (<><Button size="sm" onClick={()=>post(route('returns.approve', ret.id), {merchant_note:''})}>قبول</Button><Button size="sm" variant="outline" onClick={()=>post(route('returns.reject', ret.id), {merchant_note:''})}>رفض</Button></>)}
              {ret.status==='approved' && <Button size="sm" onClick={()=>post(route('returns.received', ret.id), {})}>تم الاستلام</Button>}
              {ret.status==='received' && <Button size="sm" onClick={()=>post(route('returns.complete', ret.id), {})}>إكمال الإرجاع</Button>}
              <Badge>{ret.status}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>العناصر</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {ret.items?.map((it:any)=>(
              <div key={it.id} className="border rounded p-3 space-y-2">
                <p className="font-bold text-sm">{it.order_item?.product_name ?? it.product_id} — الكمية المطلوبة: {it.quantity} — المعاد تخزينها: {it.restocked_quantity}</p>
                <p className="text-xs text-muted-foreground">السبب: {it.reason}</p>
                {ret.status==='received' && (
                  <div className="flex gap-2 items-end">
                    <div><Label className="text-xs">إعادة للمخزون</Label><Input type="number" min={0} max={it.quantity - it.restocked_quantity} value={restockQty[it.id] ?? ''} onChange={(e)=>setRestockQty({...restockQty, [it.id]: parseInt(e.target.value)||0})} placeholder="0" /></div>
                    <Button size="sm" onClick={()=>post(route('returns.restock', ret.id), {items:[{return_item_id:it.id, quantity: restockQty[it.id]||0}]})}>إعادة للمخزون</Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>تسجيل استرداد مالي (يدوي)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">سجّل عملية الاسترداد بعد تنفيذها لدى مزود الدفع. لا يتم إرسال أموال تلقائياً.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label>المبلغ</Label><Input type="number" step="0.01" value={refundAmount} onChange={e=>setRefundAmount(e.target.value)} placeholder="0.00" /></div>
              <div><Label>الطريقة</Label><Input value={refundMethod} onChange={e=>setRefundMethod(e.target.value)} placeholder="نقداً / تحويل بنكي" /></div>
              <div className="flex items-end"><Button onClick={()=>post(route('returns.refund', ret.id), {amount: parseFloat(refundAmount)||0, method: refundMethod})}>تسجيل</Button></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
