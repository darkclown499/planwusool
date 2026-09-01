import React, { useState, useEffect, useRef } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { router, usePage } from '@inertiajs/react';
import { Download, Search, TrendingUp, HandCoins, Clock, RotateCcw, Wallet, Banknote, CheckCircle2, XCircle, Eye, Landmark, Plus, Trash2 } from 'lucide-react';

export default function PaymentOperations() {
  const { t } = useTranslation();
  const {
    metrics = { gmv: [], collected: [], pending_collection: [], refunded: [], net_collected: [], gmv_total: 0, collected_total: 0, pending_collection_total: 0, refunded_total: 0, net_collected_total: 0, cod_pending_count: 0, bank_pending_count: 0 },
    rows = { data: [], links: [] },
    filters = {},
    codPending = [],
    settlements = [],
    currencies = ['ILS'],
  } = usePage().props as any;

  const [search, setSearch] = useState(filters.search || '');
  const [collectionState, setCollectionState] = useState(filters.collection_state || 'all');
  const [paymentMethod, setPaymentMethod] = useState(filters.payment_method || 'all');
  const [dateFrom, setDateFrom] = useState(filters.date_from || '');
  const [dateTo, setDateTo] = useState(filters.date_to || '');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const didMount = useRef(false);

  const formatAmount = (amount: number, symbol = '₪') =>
    `${symbol} ${(Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const symbolFor = (code: string) => code;

  const summaryLine = (groups: any[]) => groups.map((g: any) => formatAmount(g.amount, g.symbol)).join(' + ');

  const applyFilters = () => {
    router.get(
      route('payments.operations'),
      {
        search: search.trim() || undefined,
        collection_state: collectionState === 'all' ? undefined : collectionState,
        payment_method: paymentMethod === 'all' ? undefined : paymentMethod,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      },
      { preserveState: true, replace: true, preserveScroll: true }
    );
  };

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    const debounce = setTimeout(applyFilters, 400);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionState, paymentMethod, dateFrom, dateTo]);

  const handleExport = () => {
    const params: any = {};
    if (search.trim()) params.search = search.trim();
    if (collectionState !== 'all') params.collection_state = collectionState;
    if (paymentMethod !== 'all') params.payment_method = paymentMethod;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const qs = new URLSearchParams(params).toString();
    window.open(route('payments.operations.export') + (qs ? `?${qs}` : ''), '_blank');
  };

  const post = async (url: string, body?: any, okMsg?: string) => {
    if (actionLoading) return;
    setActionLoading(url);
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': token, 'X-Requested-With': 'XMLHttpRequest' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        if (j.message) alert(j.message);
        window.location.reload();
      } else {
        alert(j.message || j.error || 'فشلت العملية');
      }
    } catch {
      alert('تعذر الاتصال بالخادم');
    }
    setActionLoading(null);
  };

  const collectCod = (row: any) => {
    if (!confirm(`تأكيد تحصيل مبلغ الطلب ${row.order_number}؟`)) return;
    post(route('orders.collect-cod', row.id));
  };
  const confirmBank = (row: any) => {
    if (!confirm(`تأكيد استلام التحويل البنكي للطلب ${row.order_number}؟`)) return;
    post(route('orders.confirm-bank', row.id));
  };
  const rejectBank = (row: any) => {
    const note = prompt('سبب رفض إثبات التحويل:') || '';
    post(route('orders.reject-bank', row.id), { note });
  };
  const openReceipt = (url: string) => window.open(url, '_blank');

  const pmLabel = (m: string) => ({
    cod: 'الدفع عند الاستلام',
    cash: 'الدفع عند الاستلام',
    cash_on_delivery: 'الدفع عند الاستلام',
    bank: 'تحويل بنكي',
    bank_transfer: 'تحويل بنكي',
    whatsapp: 'واتساب',
    telegram: 'تيليجرام',
    offline: 'دفع يدوي',
  }[m] || m);

  const psLabel = (s: string) => ({
    pending: 'بانتظار الدفع',
    paid: 'مدفوع',
    failed: 'فشل الدفع',
    refunded: 'مسترجع',
    partially_refunded: 'استرجاع جزئي',
  }[s] || s);

  const osLabel = (s: string) => ({
    pending: 'قيد الانتظار', confirmed: 'مؤكد', processing: 'قيد التجهيز',
    shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي',
    failed: 'فشل', refunded: 'مسترجع', returned: 'مرتجع', completed: 'مكتمل',
  }[s] || s);

  return (
    <PageTemplate
      title="عمليات الدفع"
      description="الإيرادات والتحصيل وتسوية الدفعات — إدارة العمليات المالية"
      url="/payments/operations"
      breadcrumbs={[{ title: t('Dashboard'), href: route('dashboard') }, { title: 'عمليات الدفع' }]}
    >
      <div className="space-y-4">
        {/* Metric cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><TrendingUp className="h-4 w-4" /> إجمالي قيمة الطلبات</p>
                <div className="mt-2 text-2xl font-bold">{metrics.gmv_total}</div>
                <p className="mt-2 text-xs text-muted-foreground">{summaryLine(metrics.gmv)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><HandCoins className="h-4 w-4" /> تم تحصيله</p>
                <div className="mt-2 text-2xl font-bold text-green-600">{metrics.collected_total}</div>
                <p className="mt-2 text-xs text-muted-foreground">{summaryLine(metrics.collected)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><Clock className="h-4 w-4" /> بانتظار التحصيل</p>
                <div className="mt-2 text-2xl font-bold text-amber-600">{metrics.pending_collection_total}</div>
                <p className="mt-2 text-xs text-muted-foreground">{summaryLine(metrics.pending_collection)}</p>
                <p className="mt-1 text-xs text-muted-foreground">COD مستحق: {metrics.cod_pending_count} — تحويلات بنكية: {metrics.bank_pending_count}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><Wallet className="h-4 w-4" /> صافي المحصّل</p>
                <div className="mt-2 text-2xl font-bold">{metrics.net_collected_total}</div>
                <p className="mt-2 text-xs text-muted-foreground"><RotateCcw className="inline h-3 w-3" /> مستردّات: {metrics.refunded_total}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-bold">سجل العمليات</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="رقم الطلب / الاسم / الهاتف" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={collectionState} onValueChange={setCollectionState}>
              <SelectTrigger><SelectValue placeholder="حالة التحصيل" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="pending_collection">بانتظار التحصيل</SelectItem>
                <SelectItem value="collected">محصّل</SelectItem>
                <SelectItem value="refunded">مسترد</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue placeholder="طريقة الدفع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="cod">الدفع عند الاستلام</SelectItem>
                <SelectItem value="bank">تحويل بنكي</SelectItem>
                <SelectItem value="online">مدفوعات إلكترونية</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </CardContent>
        </Card>

        {/* Actions / Export */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-1 h-4 w-4" /> تصدير CSV</Button>
        </div>

        {/* Ledger */}
        <Card>
          <CardContent className="p-0">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="p-3 text-right">الطلب</th>
                    <th className="p-3 text-right">العميل</th>
                    <th className="p-3 text-right">المبلغ</th>
                    <th className="p-3 text-right">طريقة الدفع</th>
                    <th className="p-3 text-right">الدفع</th>
                    <th className="p-3 text-right">الحالة</th>
                    <th className="p-3 text-right">التحصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.data.map((row: any) => (
                    <tr key={row.id} className="border-b">
                      <td className="p-3 font-medium">{row.order_number}</td>
                      <td className="p-3">{row.customer_name}<br /><span className="text-xs text-muted-foreground" dir="ltr">{row.customer_phone}</span></td>
                      <td className="p-3">{formatAmount(row.total_amount, symbolFor(row.currency))}</td>
                      <td className="p-3">{pmLabel(row.payment_method)}</td>
                      <td className="p-3"><Badge variant={row.payment_status === 'paid' ? 'default' : row.payment_status === 'refunded' || row.payment_status === 'failed' ? 'destructive' : 'secondary'}>{psLabel(row.payment_status)}</Badge></td>
                      <td className="p-3"><Badge variant="outline">{osLabel(row.order_status)}</Badge></td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {row.can_collect_cod && <Button size="sm" variant="default" onClick={() => collectCod(row)}><Banknote className="mr-1 h-3.5 w-3.5" /> تحصيل COD</Button>}
                          {row.can_confirm_bank && <><Button size="sm" variant="default" onClick={() => confirmBank(row)}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> تأكيد</Button><Button size="sm" variant="destructive" onClick={() => rejectBank(row)}><XCircle className="mr-1 h-3.5 w-3.5" /> رفض</Button></>}
                          {row.receipt_url && <Button size="sm" variant="outline" onClick={() => openReceipt(row.receipt_url)}><Eye className="mr-1 h-3.5 w-3.5" /> الإثبات</Button>}
                          {row.cod && row.cod.status !== 'pending' && <span className="text-xs text-muted-foreground">COD: {row.cod.status} ({formatAmount(row.cod.amount_remaining, symbolFor(row.currency))} متبقي)</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.data.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">لا توجد عمليات مطابقة</td></tr>}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {rows.data.map((row: any) => (
                <div key={row.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between"><span className="font-semibold">{row.order_number}</span><Badge variant={row.payment_status === 'paid' ? 'default' : 'secondary'}>{psLabel(row.payment_status)}</Badge></div>
                  <div className="text-sm text-muted-foreground">{row.customer_name} — <span dir="ltr">{row.customer_phone}</span></div>
                  <div className="flex items-center justify-between">
                    <span>{pmLabel(row.payment_method)} / {osLabel(row.order_status)}</span>
                    <span className="font-bold">{formatAmount(row.total_amount, symbolFor(row.currency))}</span>
                  </div>
                  {(row.can_collect_cod || row.can_confirm_bank || row.receipt_url) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {row.can_collect_cod && <Button size="sm" variant="default" onClick={() => collectCod(row)}>تحصيل COD</Button>}
                      {row.can_confirm_bank && <><Button size="sm" variant="default" onClick={() => confirmBank(row)}>تأكيد</Button><Button size="sm" variant="destructive" onClick={() => rejectBank(row)}>رفض</Button></>}
                      {row.receipt_url && <Button size="sm" variant="outline" onClick={() => openReceipt(row.receipt_url)}><Eye className="mr-1 h-3.5 w-3.5" /> الإثبات</Button>}
                    </div>
                  )}
                </div>
              ))}
              {rows.data.length === 0 && <div className="p-6 text-center text-muted-foreground">لا توجد عمليات مطابقة</div>}
            </div>
          </CardContent>
        </Card>

        {/* COD Settlement */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold"><Landmark className="mr-1.5 inline h-4 w-4" /> تسوية تحصيل COD</CardTitle>
            {codPending.length > 0 && <Button size="sm" onClick={() => createSettlement(codPending)}><Plus className="mr-1 h-4 w-4" /> إنشاء دفعة ({codPending.length})</Button>}
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">اختر الطلبات الجاهزة (المتبقي كامل) لإنشاء دفعة تحصيل — سيؤكد التسوية جمع المبالغ وتحويل الطلبات إلى مدفوع.</p>
            {settlements.length > 0 ? (
              <div className="space-y-2">
                {settlements.map((s: any) => (
                  <div key={s.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${s.status === 'settled' ? 'bg-muted/40' : ''}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{s.reference}</span>
                        <Badge variant={s.status === 'settled' ? 'default' : 'secondary'}>{s.status === 'settled' ? 'تمت التسوية' : 'مسودة'}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {s.items_count} طلب{s.courier_company ? ` — ${s.courier_company}` : ''}{s.period_start ? ` — ${s.period_start} إلى ${s.period_end}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm">
                        <span className="text-muted-foreground">إجمالي: {formatAmount(s.gross_amount, symbolFor(s.currency))}</span>
                        {s.courier_fees > 0 && <div className="text-muted-foreground">رسوم: {formatAmount(s.courier_fees, symbolFor(s.currency))}</div>}
                        <div className="font-bold">صافي: {formatAmount(s.net_amount, symbolFor(s.currency))}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        {s.status === 'draft' && (
                          <>
                            <Button size="sm" variant="default" onClick={() => settleSettlement(s)}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> تسوية</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteSettlement(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </>
                        )}
                        {s.status === 'settled' && s.settled_at && <span className="text-xs text-muted-foreground">{s.settled_at}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground py-2">لا توجد دفعات تحصيل حالياً.</p>}
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );

  function createSettlement(list: any[]) {
    const selected = window.prompt(`عدد الطلبات القابلة للتحصيل: ${list.length}\nأدخل اسم شركة التوصيل (اختياري):`) ?? '';
    if (selected === null) return;
    const ids = list.map((c: any) => c.id);
    post(route('payments.settlements.store'), { cod_payment_ids: ids, courier_company: selected.trim() || null, courier_fees: 0, adjustment: 0 });
  }
  function settleSettlement(s: any) {
    if (!confirm(`تأكيد تسوية دفعة ${s.reference}؟ سيُحوَّل كل طلب داخلها إلى مدفوع.`)) return;
    post(route('payments.settlements.settle', s.id));
  }
  function deleteSettlement(s: any) {
    if (!confirm(`حذف مسودة الدفعة ${s.reference}؟`)) return;
    doDelete(route('payments.settlements.destroy', s.id));
  }
  async function doDelete(url: string) {
    if (actionLoading) return;
    setActionLoading(url);
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch(url, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': token, Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { if (j.message) alert(j.message); window.location.reload(); } else alert(j.message || 'فشلت العملية');
    } catch { alert('تعذر الاتصال بالخادم'); }
    setActionLoading(null);
  }
}