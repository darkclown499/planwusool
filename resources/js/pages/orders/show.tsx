import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { ArrowLeft, Package, User, CreditCard, Truck, MapPin, Phone, Mail, Copy, ExternalLink, CheckCircle2, AlertCircle, Clock, XCircle, RotateCcw, Send, Box } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { usePage, router } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { getImageUrl } from '../../utils/image-helper';
import { hasPermission } from '@/utils/permissions';
import { tOrderStatus, tPaymentStatus } from '@/utils/order-status';
import { CourierLogo } from '@/components/courier-logo';
import { toast } from 'sonner';

function StatusBadge({ status, variant }: { status: string; variant?: string }) {
  const map: Record<string, string> = {
    pending: 'قيد الانتظار',
    confirmed: 'مؤكد',
    processing: 'قيد التجهيز',
    shipped: 'تم الشحن',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
    refunded: 'مسترجع',
    paid: 'مدفوع',
    failed: 'فشل',
  };
  const safe = String(status ?? '').trim();
  return <Badge variant={variant as any}>{map[safe.toLowerCase()] || safe}</Badge>;
}

export default function ShowOrder({ order: initialOrder, returns: initialReturns }: any) {
  const { auth } = usePage().props as any;
  const [order, setOrder] = useState(initialOrder);
  const returns = (initialReturns ?? (usePage().props as any).returns ?? []) as any[];
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  React.useEffect(()=>setOrder(initialOrder), [initialOrder]);

  const fulfillment = order.fulfillment || {};
  const shipments = order.shipments || [];
  const primaryShipment = shipments[0] || fulfillment.primary_shipment || null;
  const timeline = order.timeline || [];

  const updateOrderStatus = async (newStatus: string) => {
    setActionLoading(newStatus);
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const safePaymentStatus = String(order?.paymentStatus ?? 'pending').toLowerCase();
      const res = await fetch(route('orders.update', order.id), {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', Accept:'application/json', 'X-CSRF-TOKEN': token, 'X-Requested-With':'XMLHttpRequest'},
        body: JSON.stringify({ status: newStatus, payment_status: safePaymentStatus, tracking_number: order.trackingNumber || '', notes: order.notes || '' }),
      });
      if (res.ok) {
        toast.success('تم تحديث حالة الطلب');
        router.reload();
      } else {
        const j = await res.json();
        toast.error(j.errors?.status?.[0] || 'تعذر تحديث الحالة');
      }
    } catch { toast.error('خطأ في التحديث'); }
    setActionLoading(null);
  };

  const handleShipmentAction = async (action: 'retry'|'cancel', shipment:any) => {
    setActionLoading(action);
    try {
      const url = action==='retry' ? `/api/stores/${order.store_id || ''}/orders/${order.id}/shipments/${shipment.id}/retry` : `/api/stores/${order.store_id || ''}/orders/${order.id}/shipments/${shipment.id}/cancel`;
      // fallback to order.store_id from auth if not in order
      const storeId = (order as any).store_id || (auth as any)?.user?.current_store;
      const finalUrl = `/api/stores/${storeId}/orders/${order.id}/shipments/${shipment.id}/${action}`;
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch(finalUrl, { method:'POST', headers:{'X-CSRF-TOKEN':token, Accept:'application/json'}});
      const j = await res.json();
      if (res.ok) { toast.success(action==='retry' ? 'تمت إعادة المحاولة' : 'تم الإلغاء'); router.reload(); }
      else toast.error(j.error || 'فشل العملية');
    } catch { toast.error('فشل'); }
    setActionLoading(null);
  };

  const statusLower = String(order?.status ?? '').toLowerCase();
  const paymentLower = String(order?.paymentStatus ?? '').toLowerCase();
  const isCancelled = statusLower==='cancelled';
  const isDelivered = statusLower==='delivered';
  const canConfirm = statusLower==='pending';
  const canProcess = ['pending','confirmed'].includes(statusLower);
  const canReady = statusLower==='processing';
  const canOut = ['processing','shipped'].includes(statusLower) && fulfillment.type!=='connected';
  const canDeliverManual = statusLower==='shipped' && fulfillment.type!=='connected';
  const notSubmitted = fulfillment.type==='connected' && !primaryShipment;
  const isFailed = primaryShipment?.status==='failed';

  const renderTimeline = () => (
    <div className="space-y-0 border-s-2 border-slate-100 ms-2">
      {timeline.map((step:any, idx:number)=>(
        <div key={idx} className="relative flex gap-3 pb-6 last:pb-0">
          <div className={`absolute -start-[9px] top-1 h-4 w-4 rounded-full border-2 bg-white flex items-center justify-center ${step.completed ? 'border-emerald-500 bg-emerald-500' : step.current ? 'border-amber-500 bg-amber-500' : 'border-slate-200'}`}>
            {step.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
          </div>
          <div className="ms-4">
            <p className={`text-sm font-bold ${step.completed ? 'text-slate-800' : 'text-slate-400'}`}>{step.status}</p>
            {step.date && <p className="text-xs text-slate-500">{step.date}</p>}
          </div>
        </div>
      ))}
    </div>
  );

  const renderCourierCard = () => {
    if (fulfillment.type==='connected') {
      if (!primaryShipment) {
        return (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5"/> الشحن</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">لم يتم إرسال الطلب إلى شركة التوصيل بعد</p>
              <Button size="sm" onClick={async()=>{
                const storeId = (auth as any)?.user?.current_store;
                const token=document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')||'';
                const res=await fetch(`/api/stores/${storeId}/orders/${order.id}/shipments`,{method:'POST', headers:{'X-CSRF-TOKEN':token, Accept:'application/json'}});
                if(res.ok){ toast.success('تم إرسال الشحنة'); router.reload(); } else toast.error('تعذر الإرسال');
              }}><Send className="h-4 w-4 me-2"/> إرسال إلى شركة التوصيل</Button>
            </CardContent>
          </Card>
        );
      }
      const provider = primaryShipment.provider;
      const logoMap:Record<string,string> = {aramex:'/images/couriers/aramex-official2.webp', dhl:'/images/couriers/dhl.svg', fedex:'/images/couriers/fedex-remote.svg', ups:'/images/couriers/ups-remote.svg'};
      return (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5"/> الشحن — {provider}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <CourierLogo src={logoMap[provider] || null} name={provider} size={48} />
              <div>
                <p className="font-bold text-sm">{provider}</p>
                <Badge variant={primaryShipment.status==='delivered' ? 'default' : primaryShipment.status==='failed' ? 'destructive' : 'secondary'}>{primaryShipment.status}</Badge>
                {primaryShipment.last_error && <p className="text-xs text-red-600 mt-1">{primaryShipment.last_error}</p>}
              </div>
            </div>
            {primaryShipment.tracking_number && (
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">رقم التتبع</span><span className="font-mono flex items-center gap-1">{primaryShipment.tracking_number} <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>{navigator.clipboard.writeText(primaryShipment.tracking_number); toast.success('تم النسخ');}}><Copy className="h-3 w-3"/></Button></span></div>
            )}
            {primaryShipment.tracking_url && <a href={primaryShipment.tracking_url} target="_blank" className="text-sm text-emerald-700 flex items-center gap-1 underline">تتبع الشحنة <ExternalLink className="h-3 w-3"/></a>}
            {primaryShipment.label_url && <a href={primaryShipment.label_url} target="_blank" className="text-sm text-emerald-700 flex items-center gap-1 underline">تحميل/طباعة البوليصة <ExternalLink className="h-3 w-3"/></a>}
            {primaryShipment.submitted_at && <p className="text-xs text-muted-foreground">آخر تحديث: {primaryShipment.submitted_at}</p>}
            <div className="flex flex-wrap gap-2">
              {primaryShipment.tracking_url && <Button variant="outline" size="sm" onClick={()=>window.open(primaryShipment.tracking_url,'_blank')}>تتبع الشحنة</Button>}
              {primaryShipment.label_url && <Button variant="outline" size="sm" onClick={()=>window.open(primaryShipment.label_url,'_blank')}>البوليصة</Button>}
              {primaryShipment.can_retry && <Button variant="outline" size="sm" onClick={()=>handleShipmentAction('retry', primaryShipment)} disabled={!!actionLoading}><RotateCcw className="h-4 w-4 me-1"/> إعادة المحاولة</Button>}
              {primaryShipment.can_cancel && <Button variant="destructive" size="sm" onClick={()=>handleShipmentAction('cancel', primaryShipment)}>إلغاء الشحنة</Button>}
            </div>
            {isFailed && (
              <div className="rounded bg-red-50 border border-red-200 p-3">
                <p className="text-sm font-bold text-red-700">تعذر إرسال الشحنة</p>
                <p className="text-xs text-red-600">{primaryShipment.last_error || 'بيانات الربط غير صالحة'}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={()=>window.location.href=`/stores/${(auth as any)?.user?.current_store}/shipping/integrations`}>إصلاح الربط</Button>
                  <Button size="sm" onClick={()=>handleShipmentAction('retry', primaryShipment)}>إعادة المحاولة</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    if (fulfillment.type==='manual') {
      return (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5"/> الشحن</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm"><span className="text-muted-foreground">شركة التوصيل:</span> {fulfillment.delivery_company || 'غير محدد'}</p>
            <p className="text-sm"><span className="text-muted-foreground">نوع التنفيذ:</span> توصيل يدوي</p>
            {!isDelivered && !isCancelled && (
              <div className="flex gap-2 mt-3">
                {statusLower==='processing' && <Button size="sm" onClick={()=>updateOrderStatus('shipped')}>خرج للتوصيل</Button>}
                {statusLower==='shipped' && <Button size="sm" onClick={()=>updateOrderStatus('delivered')}>تم التسليم</Button>}
                <Button size="sm" variant="outline" onClick={()=>updateOrderStatus('cancelled')}>فشل التوصيل</Button>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardHeader><CardTitle>التنفيذ: توصيل شخصي</CardTitle></CardHeader>
        <CardContent>
          {!isDelivered && !isCancelled && (
            <div className="flex gap-2">
              {canReady && <Button size="sm" onClick={()=>updateOrderStatus('shipped')}>جاهز للتوصيل</Button>}
              {statusLower==='shipped' && <Button size="sm" onClick={()=>updateOrderStatus('delivered')}>تم التسليم</Button>}
              {statusLower!=='cancelled' && <Button size="sm" variant="outline" onClick={()=>updateOrderStatus('cancelled')}>إلغاء</Button>}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <PageTemplate title={`طلب ${order.orderNumber}`} url={`/orders/${order.id}`} backUrl={route('orders.index')} breadcrumbs={[{title:'لوحة التحكم', href: route('dashboard')},{title:'الطلبات', href: route('orders.index')},{title: order.orderNumber}]}>
      <div className="space-y-6" dir="rtl">
        {/* HEADER */}
        <Card>
          <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-black">طلب {order.orderNumber}</h2>
              <p className="text-xs text-muted-foreground">{order.date ?? ''} • {order.customer?.name ?? '—'} • {formatCurrency(Number(order.summary?.total) || 0)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{tOrderStatus(String(order?.status ?? ''))}</Badge>
              <Badge variant="outline">{tPaymentStatus(String(order?.paymentStatus ?? ''))}</Badge>
              <Badge variant="secondary">{fulfillment.type==='connected' ? 'شحن متصل' : fulfillment.type==='manual' ? 'يدوي' : 'شخصي'}</Badge>
            </div>
          </CardContent>
          <div className="px-4 pb-4 flex flex-wrap gap-2">
            {canConfirm && <Button size="sm" onClick={()=>updateOrderStatus('confirmed')} disabled={!!actionLoading}>تأكيد الطلب</Button>}
            {statusLower==='confirmed' && <Button size="sm" onClick={()=>updateOrderStatus('processing')}>بدء التجهيز</Button>}
            {statusLower==='processing' && fulfillment.type!=='connected' && <Button size="sm" onClick={()=>updateOrderStatus('shipped')}>جاهز للشحن</Button>}
            {statusLower==='processing' && fulfillment.type==='connected' && notSubmitted && <Button size="sm" onClick={async()=>{
              const storeId=(auth as any)?.user?.current_store;
              const token=document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')||'';
              const res=await fetch(`/api/stores/${storeId}/orders/${order.id}/shipments`,{method:'POST', headers:{'X-CSRF-TOKEN':token}});
              if(res.ok) {toast.success('تم الإرسال'); router.reload();} else toast.error('تعذر الإرسال');
            }}>إرسال إلى شركة التوصيل</Button>}
            {!isCancelled && !isDelivered && <Button size="sm" variant="outline" onClick={()=>updateOrderStatus('cancelled')}>إلغاء الطلب</Button>}
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>مراحل التنفيذ</CardTitle></CardHeader>
              <CardContent>{renderTimeline()}</CardContent>
            </Card>
            {renderCourierCard()}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5"/> المنتجات</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(order.items ?? []).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">لا توجد منتجات</p> : (order.items ?? []).map((item:any)=>(
                  <div key={item.id} className="flex gap-3 border rounded-lg p-3">
                    <img src={getImageUrl(item.image)} alt={item.name} className="h-14 w-14 rounded object-cover border" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {item.sku} • الكمية: {item.quantity}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm">{formatCurrency(Number(item.price) || 0)}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency((Number(item.price)||0)*(Number(item.quantity)||0))}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Returns section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between"><CardTitle>المرتجعات</CardTitle><Button size="sm" variant="outline" onClick={()=>router.visit(route('returns.index'))}>كل المرتجعات</Button></CardHeader>
              <CardContent>
                {(!returns || returns.length===0) ? <p className="text-sm text-muted-foreground py-4 text-center">لا توجد طلبات إرجاع</p> : (
                  <div className="space-y-3">
                    {returns.map((r:any)=>(
                      <div key={r.id} className="border rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between"><span className="font-bold">{r.return_number}</span><Badge>{r.status}</Badge></div>
                        <p className="text-xs text-muted-foreground">السبب: {r.reason} • الاسترداد: {r.refund_amount} ({r.refund_status})</p>
                        <div className="mt-1 space-y-1">
                          {r.items?.map((it:any)=><div key={it.id} className="text-xs flex justify-between"><span>{it.product_name} ×{it.quantity}</span><span>معاد: {it.restocked} • مسترد: {it.refund}</span></div>)}
                        </div>
                        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={()=>router.visit(route('returns.show', r.id))}>عرض التفاصيل</Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5"/> العميل</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-bold">{order.customer.name}</p>
                {order.customer.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground"/>{order.customer.phone} <a href={`tel:${order.customer.phone}`} className="text-emerald-700 underline text-xs">اتصال</a> <a href={`https://wa.me/${order.customer.phone.replace(/[^0-9]/g,'')}`} target="_blank" className="text-emerald-700 underline text-xs">واتساب</a></p>}
                {order.customer.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground"/>{order.customer.email}</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5"/> عنوان التوصيل</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}، {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                <p>{order.shippingAddress.country}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={()=>{navigator.clipboard.writeText(`${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state}`); toast.success('تم النسخ');}}><Copy className="h-3 w-3 me-1"/> نسخ العنوان</Button>
                </div>
                {order.notes && <div className="mt-3 border-t pt-2"><p className="text-xs font-bold">ملاحظات:</p><p className="text-xs text-muted-foreground">{order.notes}</p></div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5"/> الدفع</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">طريقة الدفع</span><span>{order.paymentMethod ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">حالة الدفع</span><Badge variant={paymentLower==='paid' ? 'default' : 'secondary'}>{tPaymentStatus(String(order?.paymentStatus ?? ''))}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الإجمالي</span><span className="font-bold">{formatCurrency(Number(order?.summary?.total) || 0)}</span></div>
                {fulfillment.cod_amount !== undefined && (
                  <div className="flex justify-between"><span className="text-muted-foreground">المبلغ المطلوب تحصيله (COD)</span><span className="font-bold">{formatCurrency(fulfillment.cod_amount || 0)}</span></div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}
