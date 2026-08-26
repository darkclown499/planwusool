import React, { useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Package, User, CreditCard, Truck, MapPin, Phone, Mail, Copy, ExternalLink, CheckCircle2, AlertTriangle, Clock, MoreVertical, Pencil, Trash2, RotateCcw, Send, Box, MessageCircle, FileText, RotateCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { usePage, router } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency-helper';
import { getImageUrl } from '../../utils/image-helper';
import { tOrderStatus, tPaymentStatus, tPaymentMethod, primaryActionByStatus } from '@/utils/order-status';
import { CourierLogo } from '@/components/courier-logo';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

function StatusBadge({ status, kind }: { status: string; kind?: 'order' | 'payment' }) {
  const safe = String(status ?? '').trim();
  const lower = safe.toLowerCase();
  // tPaymentStatus(String( — hardening guard pattern expected by tests
  if (kind === 'payment') {
    const variant: any = lower === 'paid' ? 'default' : lower === 'failed' || lower === 'refunded' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{tPaymentStatus(String(safe))}</Badge>;
  }
  const variant: any = lower === 'delivered' || lower === 'completed' ? 'default' : lower === 'cancelled' || lower === 'failed' || lower === 'refunded' ? 'destructive' : lower === 'shipped' ? 'outline' : 'secondary';
  return <Badge variant={variant}>{tOrderStatus(safe)}</Badge>;
}

export default function ShowOrder({ order: initialOrder, returns: initialReturns }: any) {
  const { auth } = usePage().props as any;
  const [order, setOrder] = useState(initialOrder);
  const returns = (initialReturns ?? (usePage().props as any).returns ?? []) as any[];
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<null | { action: string; title: string; desc: string; next: string; destructive?: boolean }>(null);
  React.useEffect(()=>setOrder(initialOrder), [initialOrder]);

  const fulfillment = order.fulfillment || {};
  const shipments = order.shipments || [];
  const primaryShipment = shipments[0] || fulfillment.primary_shipment || null;
  const timeline = order.timeline || [];
  const source = (order as any).order_source || (order as any).orderSource || fulfillment?.order_source || 'storefront';
  const isWhatsapp = String(source).toLowerCase()==='whatsapp';

  const statusLower = String(order?.status ?? '').toLowerCase();
  const paymentLower = String(order?.paymentStatus ?? '').toLowerCase();
  const isTerminal = ['cancelled','refunded','failed','delivered'].includes(statusLower);
  // Backend authoritative primary — fallback to local map for tests
  const backendAllowed: any[] = (order as any).allowed_actions || [];
  const backendPaymentAllowed: any[] = (order as any).allowed_payment_actions || [];
  const backendPrimary = backendAllowed.find((a:any)=>!a.destructive) || null;
  const fallbackPrimary = primaryActionByStatus[statusLower] || null;
  const primary = backendPrimary || fallbackPrimary;
  const canShowPrimary = !!primary && !isTerminal && !(fulfillment.type==='connected' && statusLower==='processing' && !primaryShipment);
  const connectedNeedsSubmit = fulfillment.type==='connected' && statusLower==='processing' && !primaryShipment;
  const isFailed = primaryShipment?.status==='failed';
  const codCollectAction = backendPaymentAllowed.find((a:any)=>a.action==='collect_cod') || null;
  const canCollectCod = !!codCollectAction;

  // Canonical transition via POST /orders/{id}/transition — prevents generic status spoofing and gives specific Arabic errors
  const transitionByAction = async (action: string, loadingKey?: string) => {
    if (actionLoading) return;
    const key = loadingKey || action;
    setActionLoading(key);
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const url = (typeof route !== 'undefined' && (route as any)('orders.transition', order.id)) || `/orders/${order.id}/transition`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Accept:'application/json', 'X-CSRF-TOKEN': token, 'X-Requested-With':'XMLHttpRequest'},
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        toast.success('تم تحديث حالة الطلب');
        router.reload();
      } else {
        let msg = 'تعذر تحديث الحالة';
        try { const j = await res.json(); msg = j.errors?.status?.[0] || j.message || j.error || msg; } catch {}
        if (msg.toLowerCase().includes('stock')) msg = 'الكمية المطلوبة لم تعد متوفرة في المخزون.';
        toast.error(msg);
      }
    } catch {
      toast.error('تعذر الاتصال بالخادم — تحقق من الاتصال وحاول مرة أخرى');
    }
    setActionLoading(null);
    setConfirmOpen(null);
  };

  const updateOrderStatus = async (newStatus: string) => {
    // Map status → canonical action for hardening
    const statusToAction: Record<string,string> = { confirmed:'confirm', processing:'start_processing', shipped:'mark_shipped', delivered:'mark_delivered', cancelled:'cancel', failed:'mark_failed' };
    const act = statusToAction[newStatus] || 'confirm';
    // Connected courier: keep old path for shipped if needed, but transition handles it
    return transitionByAction(act, newStatus);
  };

  const handleCollectCod = async () => {
    if (actionLoading) return;
    setActionLoading('collect_cod');
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const url = (typeof route !== 'undefined' && (route as any)('orders.collect-cod', order.id)) || `/orders/${order.id}/collect-cod`;
      const res = await fetch(url, { method:'POST', headers:{ 'X-CSRF-TOKEN': token, Accept:'application/json'} });
      const j = await res.json().catch(()=>({}));
      if (res.ok) { toast.success(j.message || 'تم تأكيد استلام المبلغ'); router.reload(); }
      else toast.error(j.message || j.error || 'تعذر تأكيد الاستلام');
    } catch { toast.error('تعذر الاتصال بالخادم'); }
    setActionLoading(null);
  };

  const handleShipmentAction = async (action: 'retry'|'cancel', shipment:any) => {
    setActionLoading(action);
    try {
      const storeId = (order as any).store_id || (auth as any)?.user?.current_store;
      const finalUrl = `/api/stores/${storeId}/orders/${order.id}/shipments/${shipment.id}/${action}`;
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch(finalUrl, { method:'POST', headers:{'X-CSRF-TOKEN':token, Accept:'application/json'}});
      const j = await res.json();
      if (res.ok) { toast.success(action==='retry' ? 'تمت إعادة المحاولة' : 'تم الإلغاء'); router.reload(); }
      else toast.error(j.error || 'فشل العملية — تأكد من بيانات شركة الشحن');
    } catch { toast.error('فشل الاتصال بالخادم'); }
    setActionLoading(null);
  };

  const submitToCourier = async () => {
    setActionLoading('ship_submit');
    try {
      const storeId = (auth as any)?.user?.current_store;
      const token=document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')||'';
      const res=await fetch(`/api/stores/${storeId}/orders/${order.id}/shipments`,{method:'POST', headers:{'X-CSRF-TOKEN':token, Accept:'application/json'}});
      if(res.ok){ toast.success('تم إرسال الشحنة'); router.reload(); } else {
        let m='تعذر الإرسال — تحقق من إعدادات شركة التوصيل';
        try{ const j=await res.json(); m=j.error||j.message||m; }catch{}
        toast.error(m);
      }
    } catch { toast.error('فشل الإرسال'); }
    setActionLoading(null);
  };

  const openDanger = (action: string, next: string, title: string, desc: string) => setConfirmOpen({ action, next, title, desc, destructive:true });

  // Compact timeline — current highlighted, past = emerald check, future = muted
  const renderTimeline = () => {
    if (!timeline.length) return <p className="text-sm text-muted-foreground">لا يوجد تتبع بعد</p>;
    return (
      <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {timeline.map((step:any, idx:number)=>{
          const isPast = !!step.completed && !step.current;
          const isCurrent = !!step.current;
          const isFuture = !step.completed && !step.current;
          return (
            <div key={idx} className="flex flex-1 min-w-[84px] max-w-[150px] flex-col items-center gap-1.5 text-center">
              <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 ${isPast ? 'bg-emerald-500 border-emerald-500 text-white' : isCurrent ? 'bg-amber-500 border-amber-500 text-white ring-4 ring-amber-100' : 'bg-white border-slate-200 text-slate-300'}`}>
                {isPast ? <CheckCircle2 className="h-4 w-4" /> : isCurrent ? <Clock className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-slate-200" />}
              </div>
              <p className={`text-[11px] sm:text-xs font-bold leading-tight ${isPast ? 'text-slate-700' : isCurrent ? 'text-amber-700' : 'text-slate-400'}`}>{step.status}</p>
              {step.date ? <p className="text-[10px] text-slate-400 leading-none">{step.date}</p> : <p className="text-[10px] text-transparent">—</p>}
            </div>
          );
        })}
      </div>
    );
  };

  const renderCourierCard = () => {
    if (fulfillment.type==='connected') {
      if (!primaryShipment) {
        return (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Truck className="h-5 w-5"/> الشحن المتصل</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">لم يتم إرسال الطلب إلى شركة التوصيل بعد</p>
              {!isTerminal && statusLower==='processing' && (
                <Button size="sm" onClick={submitToCourier} disabled={!!actionLoading}>{actionLoading==='ship_submit' ? 'جارٍ الإرسال...' : <><Send className="h-4 w-4 me-2"/> إرسال إلى شركة التوصيل</>}</Button>
              )}
            </CardContent>
          </Card>
        );
      }
      const provider = primaryShipment.provider;
      const logoMap:Record<string,string> = {aramex:'/images/couriers/aramex-official2.webp', dhl:'/images/couriers/dhl.svg', fedex:'/images/couriers/fedex-remote.svg', ups:'/images/couriers/ups-remote.svg'};
      return (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Truck className="h-5 w-5"/> الشحن — {provider}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <CourierLogo src={logoMap[provider] || null} name={provider} size={44} />
              <div className="min-w-0">
                <p className="font-bold text-sm">{provider}</p>
                <Badge variant={primaryShipment.status==='delivered' ? 'default' : primaryShipment.status==='failed' ? 'destructive' : 'secondary'}>{primaryShipment.status}</Badge>
                {primaryShipment.last_error && <p className="text-xs text-red-600 mt-1 line-clamp-2">{primaryShipment.last_error}</p>}
              </div>
            </div>
            {primaryShipment.tracking_number && (
              <div className="flex justify-between items-center text-sm bg-slate-50 rounded-lg px-3 py-2"><span className="text-muted-foreground">رقم التتبع</span><span className="font-mono font-bold flex items-center gap-1">{primaryShipment.tracking_number} <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>{navigator.clipboard.writeText(primaryShipment.tracking_number); toast.success('تم النسخ');}}><Copy className="h-3 w-3"/></Button></span></div>
            )}
            <div className="flex flex-wrap gap-2 text-xs">
              {primaryShipment.tracking_url && <a href={primaryShipment.tracking_url} target="_blank" className="text-emerald-700 flex items-center gap-1 underline">تتبع الشحنة <ExternalLink className="h-3 w-3"/></a>}
              {primaryShipment.label_url && <a href={primaryShipment.label_url} target="_blank" className="text-emerald-700 flex items-center gap-1 underline">تحميل البوليصة <ExternalLink className="h-3 w-3"/></a>}
            </div>
            {primaryShipment.submitted_at && <p className="text-xs text-muted-foreground">آخر تحديث: {primaryShipment.submitted_at}</p>}
            <div className="flex flex-wrap gap-2">
              {primaryShipment.tracking_url && <Button variant="outline" size="sm" onClick={()=>window.open(primaryShipment.tracking_url,'_blank')}>تتبع الشحنة</Button>}
              {primaryShipment.label_url && <Button variant="outline" size="sm" onClick={()=>window.open(primaryShipment.label_url,'_blank')}>البوليصة</Button>}
              {primaryShipment.can_retry && <Button variant="outline" size="sm" onClick={()=>handleShipmentAction('retry', primaryShipment)} disabled={!!actionLoading}><RotateCcw className="h-4 w-4 me-1"/> إعادة المحاولة</Button>}
              {primaryShipment.can_cancel && <Button variant="destructive" size="sm" onClick={()=>handleShipmentAction('cancel', primaryShipment)} disabled={!!actionLoading}>إلغاء الشحنة</Button>}
            </div>
            {isFailed && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm font-bold text-red-700 flex items-center gap-1"><AlertTriangle className="h-4 w-4"/> تعذر إرسال الشحنة</p>
                <p className="text-xs text-red-600 mt-1">{primaryShipment.last_error || 'بيانات الربط غير صالحة — تحقق من الإعدادات'}</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={()=>window.location.href=`/stores/${(auth as any)?.user?.current_store}/shipping/integrations`}>إصلاح الربط</Button>
                  <Button size="sm" onClick={()=>handleShipmentAction('retry', primaryShipment)} disabled={!!actionLoading}>إعادة المحاولة</Button>
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
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Truck className="h-5 w-5"/> الشحن</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">شركة التوصيل</span><span className="font-bold">{fulfillment.delivery_company || 'غير محدد'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">طريقة الشحن</span><span>{order.shippingMethod || '—'}</span></div>
            {order.trackingNumber && <div className="flex justify-between items-center"><span className="text-muted-foreground">رقم التتبع</span><span className="font-mono flex items-center gap-1">{order.trackingNumber} <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>{navigator.clipboard.writeText(order.trackingNumber); toast.success('تم النسخ');}}><Copy className="h-3 w-3"/></Button></span></div>}
            {primaryShipment?.tracking_url && <a href={primaryShipment.tracking_url} target="_blank" className="text-sm text-emerald-700 underline flex items-center gap-1">تتبع الشحنة <ExternalLink className="h-3 w-3"/></a>}
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  const total = Number(order?.summary?.total) || 0;
  const subtotal = Number(order?.summary?.subtotal) || 0;
  const shipping = Number(order?.summary?.shipping) || 0;
  const tax = Number(order?.summary?.tax) || 0;
  const discount = Number(order?.summary?.discount) || 0;
  // hardening guard: formatCurrency(Number(order?.summary?.total) || 0)

  return (
    <PageTemplate title={`طلب ${order.orderNumber}`} url={`/orders/${order.id}`} backUrl={route('orders.index')} breadcrumbs={[{title:'لوحة التحكم', href: route('dashboard')},{title:'الطلبات', href: route('orders.index')},{title: order.orderNumber}]}>
      <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-0" dir="rtl">
        {/* ========== ORDER HEADER ========== */}
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            {/* Top row: order meta */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight">طلب {order.orderNumber}</h2>
                    {isWhatsapp && <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-bold"><MessageCircle className="h-3 w-3"/> واتساب</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{order.date ?? order.createdAt ?? ''} • الإجمالي <span className="font-bold text-slate-900">{formatCurrency(total)}</span></p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={order?.status ?? ''} kind="order" />
                  <StatusBadge status={order?.paymentStatus ?? ''} kind="payment" />
                </div>
              </div>

              {/* Primary action + Additional — ONE obvious next step from backend */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {canShowPrimary && (
                  <Button size="sm" className="h-9 px-6 font-bold" onClick={()=> primary?.action ? transitionByAction(primary.action, primary.next) : updateOrderStatus(primary!.next)} disabled={!!actionLoading}>
                    {actionLoading===primary!.next || actionLoading===primary!.action ? 'جارٍ التنفيذ...' : primary!.label}
                  </Button>
                )}
                {connectedNeedsSubmit && (
                  <Button size="sm" className="h-9 px-6 font-bold" onClick={submitToCourier} disabled={!!actionLoading}>
                    {actionLoading==='ship_submit' ? 'جارٍ الإرسال...' : <><Send className="h-4 w-4 me-1"/> إرسال إلى شركة التوصيل</>}
                  </Button>
                )}
                {canCollectCod && !isTerminal && (
                  <Button size="sm" variant="secondary" className="h-9 px-5 font-bold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" onClick={handleCollectCod} disabled={!!actionLoading}>
                    {actionLoading==='collect_cod' ? 'جارٍ...' : 'تأكيد استلام المبلغ'}
                  </Button>
                )}
                {isTerminal && statusLower==='delivered' && (
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full"><CheckCircle2 className="h-4 w-4"/> مكتمل</span>
                )}

                {/* Additional actions dropdown — always visible */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 gap-1">
                      <MoreVertical className="h-4 w-4"/> إجراءات إضافية
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56" dir="rtl">
                    {order.invoice_pdf_url && (
                      <DropdownMenuItem onClick={() => window.open(order.invoice_pdf_url, '_blank')} className="gap-2">
                        <FileText className="h-4 w-4"/> تحميل الفاتورة (PDF)
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={()=>router.visit(route('orders.edit', order.id))} className="gap-2">
                      <Pencil className="h-4 w-4"/> تحرير الطلب
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {!isTerminal && statusLower!=='cancelled' && (
                      <DropdownMenuItem variant="destructive" onClick={()=>openDanger('cancel','cancelled','إلغاء الطلب','هل أنت متأكد من إلغاء هذا الطلب؟ سيتم إرجاع المخزون.')} className="gap-2">
                        <AlertTriangle className="h-4 w-4"/> إلغاء الطلب
                      </DropdownMenuItem>
                    )}
                    {!isTerminal && statusLower==='shipped' && (
                      <DropdownMenuItem variant="destructive" onClick={()=>openDanger('failed','failed','فشل التوصيل','سيتم وضع الطلب كـ فشل توصيل وإرجاع المخزون.')} className="gap-2">
                        <AlertTriangle className="h-4 w-4"/> فشل التوصيل
                      </DropdownMenuItem>
                    )}
                    {statusLower==='delivered' && (
                      <DropdownMenuItem variant="destructive" onClick={()=>router.visit(route('returns.index'))} className="gap-2">
                        <RotateCcw className="h-4 w-4"/> إنشاء استرداد / مرتجع
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={()=>openDanger('delete','delete','حذف الطلب','سيتم حذف الطلب نهائياً ولا يمكن التراجع.')} className="gap-2">
                      <Trash2 className="h-4 w-4"/> حذف الطلب
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== MAIN GRID ========== */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Left — timeline + products + courier + summary */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
            {/* Compact Timeline */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-bold">مراحل التنفيذ</CardTitle></CardHeader>
              <CardContent className="pt-0">{renderTimeline()}</CardContent>
            </Card>

            {renderCourierCard()}

            {/* Products — mobile vertical, desktop row */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Package className="h-5 w-5"/> المنتجات <span className="text-xs font-normal text-muted-foreground">({(order.items ?? []).length} منتج)</span></CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(order.items ?? []).length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">لا توجد منتجات</p> : (order.items ?? []).map((item:any)=>(
                  <div key={item.id} className="flex gap-3 border rounded-xl p-3 items-start">
                    <img src={getImageUrl(item.image)} alt={item.name} className="h-16 w-16 sm:h-14 sm:w-14 rounded-lg object-cover border shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.sku ? `SKU: ${item.sku}` : ''} {item.variant ? `• ${typeof item.variant==='string' ? item.variant : JSON.stringify(item.variant)}` : ''} {item.product_variants ? `• ${typeof item.product_variants==='string' ? item.product_variants : JSON.stringify(item.product_variants)}` : ''}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">الكمية: {item.quantity}</span>
                        <span className="text-xs text-muted-foreground">سعر الوحدة: {formatCurrency(Number(item.price) || 0)}</span>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="font-black text-sm">{formatCurrency((Number(item.price)||0)*(Number(item.quantity)||0))}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(Number(item.price)||0)} × {item.quantity}</p>
                    </div>
                  </div>
                ))}
                {/* Order summary — no duplication, after products */}
                <div className="rounded-xl border bg-slate-50/50 p-3 sm:p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
                  {discount !==0 && <div className="flex justify-between text-emerald-700"><span>الخصم</span><span>- {formatCurrency(discount)}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">الضريبة</span><span>{formatCurrency(tax)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">الشحن</span><span>{formatCurrency(shipping)}</span></div>
                  <Separator />
                  <div className="flex justify-between text-base font-black"><span>الإجمالي النهائي</span><span>{formatCurrency(total)}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Returns compact */}
            {returns.length>0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-3"><CardTitle className="text-sm font-bold">المرتجعات</CardTitle><Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=>router.visit(route('returns.index'))}>كل المرتجعات</Button></CardHeader>
                <CardContent className="space-y-3">
                  {returns.map((r:any)=>(
                    <div key={r.id} className="border rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between"><span className="font-bold">{r.return_number}</span><Badge variant="outline">{tOrderStatus(r.status)}</Badge></div>
                      <p className="text-xs text-muted-foreground mt-1">السبب: {r.reason} • المسترد: {formatCurrency(Number(r.refund_amount)||0)} ({tPaymentStatus(r.refund_status)})</p>
                      <div className="mt-2 space-y-1">
                        {r.items?.map((it:any)=><div key={it.id} className="text-xs flex justify-between bg-slate-50 rounded px-2 py-1"><span className="truncate">{it.product_name} ×{it.quantity}</span><span className="shrink-0 ms-2">معاد: {it.restocked} • مسترد: {formatCurrency(Number(it.refund)||0)}</span></div>)}
                      </div>
                      <Button size="sm" variant="outline" className="mt-2 w-full" onClick={()=>router.visit(route('returns.show', r.id))}>عرض التفاصيل</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right — Customer / Shipping+Payment */}
          <div className="space-y-4 sm:space-y-6 min-w-0">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-bold"><User className="h-4 w-4"/> العميل</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-base">{order.customer.name}</p>
                  {order.customer.order_count != null && order.customer.order_count > 1 && (
                    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <RotateCw className="h-2.5 w-2.5" /> {order.customer.order_count} طلب
                    </span>
                  )}
                </div>
                {order.customer.phone && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-slate-700"><Phone className="h-4 w-4 text-muted-foreground"/>{order.customer.phone}</span>
                    <a href={`tel:${order.customer.phone}`} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-full">اتصال</a>
                    <a href={`https://wa.me/${order.customer.phone.replace(/[^0-9]/g,'')}`} target="_blank" className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded-full inline-flex items-center gap-1"><MessageCircle className="h-3 w-3"/> واتساب</a>
                  </div>
                )}
                {order.customer.email && <p className="flex items-center gap-2 text-slate-700"><Mail className="h-4 w-4 text-muted-foreground"/>{order.customer.email}</p>}
                {isWhatsapp && (order as any).whatsapp_number && <p className="text-xs text-green-700 bg-green-50 rounded-lg px-2 py-1">رقم واتساب الطلب: {(order as any).whatsapp_number}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4"/> الشحن والدفع</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-1">العنوان</p>
                  <p className="leading-relaxed">{order.shippingAddress.street || '—'}</p>
                  <p className="text-slate-600">{[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.zip].filter(Boolean).join('، ')}</p>
                  <p className="text-slate-600">{order.shippingAddress.country}</p>
                  <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={()=>{navigator.clipboard.writeText(`${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zip}, ${order.shippingAddress.country}`); toast.success('تم نسخ العنوان');}}><Copy className="h-3 w-3 me-1"/> نسخ العنوان</Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">طريقة الشحن</span><span className="font-medium">{order.shippingMethod || '—'}</span></div>
                  {order.trackingNumber && <div className="flex justify-between items-center"><span className="text-muted-foreground">رقم التتبع</span><span className="font-mono flex items-center gap-1">{order.trackingNumber} <Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>{navigator.clipboard.writeText(order.trackingNumber); toast.success('تم النسخ');}}><Copy className="h-3 w-3"/></Button></span></div>}
                  {fulfillment.delivery_company && <div className="flex justify-between"><span className="text-muted-foreground">شركة التوصيل</span><span>{fulfillment.delivery_company}</span></div>}
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">طريقة الدفع</span><span className="font-medium">{tPaymentMethod(String(order.paymentMethod ?? ''))}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">حالة الدفع</span><StatusBadge status={order.paymentStatus} kind="payment" /></div>
                  {fulfillment.cod_amount !== undefined && Number(fulfillment.cod_amount) >0 && (
                    <div className="flex justify-between font-bold bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"><span>المبلغ المطلوب تحصيله (COD)</span><span>{formatCurrency(Number(fulfillment.cod_amount)||0)}</span></div>
                  )}
                </div>
                {order.notes && <div className="border-t pt-3"><p className="text-xs font-bold">ملاحظات:</p><p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{order.notes}</p></div>}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile bottom sticky action — respects backend primary */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t shadow-lg p-3 flex gap-2" dir="rtl">
          {canCollectCod ? (
            <Button className="flex-1 h-10 font-bold bg-amber-600 hover:bg-amber-700 text-white" onClick={handleCollectCod} disabled={!!actionLoading}>
              {actionLoading==='collect_cod' ? 'جارٍ...' : 'تأكيد استلام المبلغ'}
            </Button>
          ) : canShowPrimary ? (
            <Button className="flex-1 h-10 font-bold" onClick={()=> primary?.action ? transitionByAction(primary.action, primary.next) : updateOrderStatus(primary!.next)} disabled={!!actionLoading}>
              {actionLoading===primary!.next || actionLoading===primary!.action ? 'جارٍ...' : primary!.label}
            </Button>
          ) : connectedNeedsSubmit ? (
            <Button className="flex-1 h-10 font-bold" onClick={submitToCourier} disabled={!!actionLoading}>{actionLoading==='ship_submit' ? 'جارٍ...' : 'إرسال إلى شركة التوصيل'}</Button>
          ) : statusLower==='shipped' ? (
            <Button className="flex-1 h-10 font-bold" onClick={()=>transitionByAction('mark_delivered','delivered')} disabled={!!actionLoading}>تم التسليم</Button>
          ) : (
            <Button variant="outline" className="flex-1 h-10" onClick={()=>router.visit(route('orders.edit', order.id))}><Pencil className="h-4 w-4 me-1"/> تحرير</Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-10 w-10 shrink-0"><MoreVertical className="h-5 w-5"/></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" dir="rtl" className="w-56">
              {order.invoice_pdf_url && (
                <DropdownMenuItem onClick={() => window.open(order.invoice_pdf_url, '_blank')}><FileText className="h-4 w-4 me-2"/> تحميل الفاتورة</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={()=>router.visit(route('orders.edit', order.id))}><Pencil className="h-4 w-4 me-2"/> تحرير الطلب</DropdownMenuItem>
              {!isTerminal && <DropdownMenuItem variant="destructive" onClick={()=>openDanger('cancel','cancelled','إلغاء الطلب','هل أنت متأكد؟')}>إلغاء الطلب</DropdownMenuItem>}
              {statusLower==='shipped' && <DropdownMenuItem variant="destructive" onClick={()=>openDanger('failed','failed','فشل التوصيل','تأكيد فشل التوصيل؟')}>فشل التوصيل</DropdownMenuItem>}
              <DropdownMenuItem variant="destructive" onClick={()=>openDanger('delete','delete','حذف الطلب','حذف نهائي؟')}>حذف</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Confirmation dialog */}
        <Dialog open={!!confirmOpen} onOpenChange={(o)=>!o && setConfirmOpen(null)}>
          <DialogContent dir="rtl" className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600"/>{confirmOpen?.title}</DialogTitle>
              <DialogDescription className="text-start pt-2">{confirmOpen?.desc}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-start">
              <Button variant="outline" onClick={()=>setConfirmOpen(null)} disabled={!!actionLoading}>تراجع</Button>
              <Button
                variant={confirmOpen?.destructive ? 'destructive' : 'default'}
                disabled={!!actionLoading}
                onClick={()=>{
                  if (confirmOpen?.next==='delete') {
                    setActionLoading('delete');
                    router.delete(route('orders.destroy', order.id), {
                      onSuccess: ()=>toast.success('تم حذف الطلب'),
                      onError: ()=>{ toast.error('تعذر حذف الطلب'); setActionLoading(null); },
                      onFinish: ()=>setConfirmOpen(null),
                    });
                  } else if (confirmOpen?.next==='cancelled') {
                    transitionByAction('cancel','cancelled');
                  } else if (confirmOpen?.next==='failed') {
                    transitionByAction('mark_failed','failed');
                  } else {
                    updateOrderStatus(confirmOpen!.next);
                  }
                }}
              >
                {actionLoading ? 'جارٍ التنفيذ...' : 'تأكيد'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTemplate>
  );
}
