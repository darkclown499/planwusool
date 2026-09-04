import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { router, usePage, Link } from '@inertiajs/react';
import { apiGet, apiPut } from '@/utils/api';
import {
  Download, Search, TrendingUp, HandCoins, Clock, RotateCcw, Wallet, Banknote,
  CheckCircle2, XCircle, Eye, Landmark, Plus, Trash2, Loader2, ChevronDown,
  CreditCard, Save, KeyRound, Globe2, Link2, Building2,
  Info, LayoutDashboard, Settings2, ReceiptText, PiggyBank,
} from 'lucide-react';
import { hasPermission } from '@/utils/permissions';

/* ───────────────────────── methods UI ───────────────────────── */

interface CredentialField { key: string; label: string; type?: string; value: string; placeholder?: string; }
interface PaymentMethod {
  method: string; label: string; enabled: boolean; fields: CredentialField[];
  type?: string; section?: string; region?: string; currencies?: string[];
  catalog_desc?: string; badge_label?: string; badge_variant?: string; is_partner?: boolean;
}
interface PaymentGroup { id: string; label: string; methods: PaymentMethod[]; }

const SECTION_META: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; desc: string }> = {
  connected: { icon: Link2, label: 'متصلة', desc: 'بوابات مربوطة فعلياً — يتم التحقق عبر المزود.' },
  partner: { icon: Info, label: 'تحتاج عقداً مع المزود', desc: 'يتطلب حساب تاجر وبيانات ربط من المزود. لا يوجد نموذج ربط وهمي.' },
  manual: { icon: Wallet, label: 'تحويل ومحافظ يدوية', desc: 'تحويل يدوي — يقدّم التاجر التعليمات ويؤكد الدفع يدوياً بعد مراجعة الإثبات.' },
  international: { icon: Globe2, label: 'بوابات دولية', desc: 'بوابات دولية قائمة — محفوظة كما هي.' },
};

const REGION_LABEL: Record<string, string> = { palestine: 'فلسطين', jordan: 'الأردن', israel: 'إسرائيل', crypto: 'العملات الرقمية', international: 'دولي', global: 'عالمي' };

function badgeStyle(variant?: string) {
  if (variant === 'connected') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (variant === 'manual') return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (variant === 'partner') return 'bg-sky-50 text-sky-700 ring-sky-200';
  if (variant === 'inactive') return 'bg-slate-100 text-slate-500 ring-slate-200';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

function ProviderCard({ m, expanded, pending, saving, drafts, setDraft, onToggle, onSave, onExpand }: any) {
  const isOpen = !!expanded[m.method];
  const isPartner = !!m.is_partner;
  const showForm = !isPartner;
  return (
    <Card className={`transition-all duration-300 ${m.enabled ? 'border-emerald-400 ring-1 ring-emerald-300/60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {m.type === 'manual' ? <Wallet className="h-5 w-5" /> : m.is_partner ? <Building2 className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                <span className="truncate">{m.label}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${badgeStyle(m.badge_variant)}`}>
                  {m.badge_label || (m.enabled ? 'مفعل' : 'غير مفعّل')}
                </span>
              </CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-1.5 text-[11px]" dir="ltr">
                <span className="capitalize">{m.method}</span>
                {m.currencies?.length ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">{m.currencies.join(' · ')}</span> : null}
                <span className="rounded bg-slate-50 px-1.5 py-0.5 text-[10px]">{REGION_LABEL[m.region] || m.region}</span>
              </CardDescription>
              {m.catalog_desc && <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">{m.catalog_desc}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {pending && <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />}
            <Switch checked={m.enabled} disabled={pending || isPartner} onCheckedChange={(v) => onToggle(m.method, v)} />
          </div>
        </div>
        {isPartner && (
          <div className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-[11px] leading-4 text-sky-800">
            يتطلب حساب تاجر وبيانات ربط من المزود — تواصل مع <span className="font-bold">{m.label}</span> لفتح حساب والحصول على بيانات الربط. لا يوجد ربط وهمي.
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!isPartner && (
          <button type="button" onClick={() => onExpand(m.method)} className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100">
            <span className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> الإعدادات والتعليمات {m.fields.length > 0 ? `(${m.fields.length})` : ''}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
        {isPartner && m.enabled && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">هذه الطريقة تحتاج عقداً — التفعيل وحده لا ينشئ ربطاً. سيتم التفعيل الحقيقي بعد توفير بيانات المزود.</p>
        )}
        {showForm && isOpen && (
          <div className="space-y-2.5 rounded-xl border border-slate-100 p-3">
            {m.fields.length === 0 ? (
              <p className="text-xs text-slate-400">{m.type === 'manual' ? 'أدخل بيانات المستفيد والتعليمات التي ستظهر للعميل عند الطلب.' : 'هذه الطريقة لا تتطلب مفاتيح ربط.'}</p>
            ) : m.fields.map((c: CredentialField) => (
              <div key={c.key}>
                <label className="mb-1 block text-[11px] font-bold text-slate-500" dir="auto">{c.label}</label>
                {c.type === 'textarea' ? (
                  <Textarea rows={3} placeholder={c.value ? 'محفوظ — اكتب للاستبدال' : (c.placeholder || 'اكتب التعليمات التي ستظهر للعميل...')} value={drafts[m.method]?.[c.key] ?? ''} onChange={(e) => setDraft(m.method, c.key, e.target.value)} />
                ) : (
                  <Input dir="ltr" type={c.type === 'password' ? 'password' : 'text'} placeholder={c.value ? `المحفوظ: ${c.value}` : (c.placeholder || 'المفتاح')} value={drafts[m.method]?.[c.key] ?? ''} onChange={(e) => setDraft(m.method, c.key, e.target.value)} />
                )}
              </div>
            ))}
            <Button type="button" size="sm" className="mt-1 w-full gap-1.5" onClick={() => onSave(m.method)} disabled={saving === m.method}>
              {saving === m.method ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ الإعدادات
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MethodsTab({ storeId }: { storeId: number | null }) {
  const [list, setList] = useState<PaymentMethod[]>([]);
  const [activeSection, setActiveSection] = useState<string>('all');
  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});
  const [savingCreds, setSavingCreds] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const apiUrl = storeId ? `/api/stores/${storeId}/payments` : null;

  const load = useCallback(async () => {
    if (!apiUrl) { setLoaded(true); return; }
    try {
      const res = await apiGet(apiUrl);
      if (res.methods) setList(res.methods);
      setLoaded(true);
    } catch { toastError('تعذر تحميل إعدادات الدفع.'); setLoaded(true); }
  }, [apiUrl]);

  useEffect(() => { load(); const ref = timers.current; return () => { Object.values(ref).forEach((t) => clearTimeout(t)); }; }, [load]);

  const persistToggle = async (method: string, enabled: boolean) => {
    if (!apiUrl) return;
    try { await apiPut(apiUrl, { method, enabled }); toastOk('تم الحفظ بنجاح'); }
    catch { toastError('تعذر حفظ الحالة. حاول مرة أخرى.'); }
    finally { setPendingToggles((p) => ({ ...p, [method]: false })); }
  };
  const onToggle = (method: string, enabled: boolean) => {
    const item = list.find((l) => l.method === method);
    if (item?.is_partner && enabled) { toastError('هذه الطريقة تحتاج عقداً مع المزود — لا يمكن تفعيل الربط قبل توفير بيانات المزود.'); return; }
    setList((prev) => prev.map((m) => m.method === method ? { ...m, enabled } : m));
    setPendingToggles((p) => ({ ...p, [method]: true }));
    if (timers.current[method]) clearTimeout(timers.current[method]);
    timers.current[method] = setTimeout(() => persistToggle(method, enabled), 400);
  };
  const saveCredentials = async (method: string) => {
    const config = drafts[method] || {};
    const payload: Record<string, string> = {};
    Object.entries(config).forEach(([k, v]) => { if (v && v.trim() !== '') payload[k] = v.trim(); });
    if (Object.keys(payload).length === 0) { toastError('أدخل قيمة واحدة على الأقل لحفظها (القيم الفارغة تُتجاهل).'); return; }
    setSavingCreds(method);
    try {
      const res = await apiPut(apiUrl as string, { method, config: payload });
      if (res.methods) setList(res.methods);
      setDrafts((d) => ({ ...d, [method]: {} }));
      toastOk('تم الحفظ بنجاح');
    } catch { toastError('تعذر حفظ الإعدادات. حاول مرة أخرى.'); }
    finally { setSavingCreds(null); }
  };
  const setDraft = (method: string, key: string, value: string) => setDrafts((prev) => ({ ...prev, [method]: { ...(prev[method] || {}), [key]: value } }));

  const enabledCount = list.filter((m) => m.enabled).length;
  const filtered = useMemo(() => {
    let arr = [...list];
    if (activeSection !== 'all') arr = arr.filter((m) => m.section === activeSection);
    if (activeRegion !== 'all') arr = arr.filter((m) => m.region === activeRegion);
    return arr;
  }, [list, activeSection, activeRegion]);

  const sectionCounts = useMemo(() => {
    const c: Record<string, number> = { all: list.length };
    Object.keys(SECTION_META).forEach((s) => c[s] = list.filter((m) => m.section === s).length);
    return c;
  }, [list]);

  const regionOptions = ['all', 'palestine', 'jordan', 'israel', 'international', 'crypto'] as const;

  if (!apiUrl) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">حدّد متجراً لإدارة طرق الدفع.</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {!loaded ? (
        <div className="flex h-[40vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-emerald-500" /></div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
            <button type="button" onClick={() => setActiveSection('all')} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${activeSection === 'all' ? 'bg-slate-900 text-white shadow' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
              <CreditCard className="h-3.5 w-3.5" /> الكل <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeSection === 'all' ? 'bg-white/20' : 'bg-white'}`}>{sectionCounts.all}</span>
            </button>
            {Object.entries(SECTION_META).map(([id, meta]) => {
              const Icon = meta.icon;
              return (
                <button key={id} type="button" onClick={() => setActiveSection(id)} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${activeSection === id ? 'bg-emerald-600 text-white shadow' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                  <Icon className="h-3.5 w-3.5" />{meta.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeSection === id ? 'bg-white/20' : 'bg-white'}`}>{sectionCounts[id] || 0}</span>
                </button>
              );
            })}
            <span className="mr-auto flex items-center gap-1.5 pl-3 text-[11px] font-bold text-emerald-600">
              {enabledCount > 0 && (<><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>{enabledCount} مفعلة</>)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500">المنطقة:</span>
            {regionOptions.map((r) => (
              <button key={r} type="button" onClick={() => setActiveRegion(r)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${activeRegion === r ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
                {r === 'all' ? 'الكل' : ({ palestine: 'فلسطين', jordan: 'الأردن', israel: 'إسرائيل', international: 'دولي', crypto: 'العملات الرقمية' } as any)[r] || r}
              </button>
            ))}
          </div>

          {activeSection !== 'all' && (
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-800">
              <span className="font-bold">{SECTION_META[activeSection]?.label}:</span> {SECTION_META[activeSection]?.desc}
              {activeSection === 'partner' && <span className="mr-2 font-bold">لا يوجد ربط وهمي — يتطلب عقداً.</span>}
              {activeSection === 'manual' && <span className="mr-2">الدفع لا يُعتبر مدفوعاً تلقائياً — بانتظار تأكيد التاجر.</span>}
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">لا توجد طرق دفع في هذا القسم/المنطقة.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((m) => (
                <ProviderCard key={m.method} m={m} expanded={expanded} pending={!!pendingToggles[m.method]} saving={savingCreds} drafts={drafts} setDraft={setDraft} onToggle={onToggle} onSave={saveCredentials} onExpand={(id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }))} />
              ))}
            </div>
          )}

          <Card className="border-sky-100 bg-sky-50/50">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                <div>
                  <p className="text-sm font-bold text-slate-800">ملاحظة</p>
                  <p className="text-xs leading-5 text-slate-600">
                    هذا هو المكان الوحيد لإعداد بوابات الدفع. الحقول الفارغة تُتجاهل للإبقاء على القيمة الحالية، والمفاتيح الحساسة تُشفّر تلقائياً. طرق <span className="font-bold">تحتاج عقداً</span> لا تعرض نموذج ربط وهمي — تواصل مع المزود لفتح حساب تاجر.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function toastOk(message: string) {
  import('@/components/custom-toast').then((m) => m.toast.success(message));
}
function toastError(message: string) {
  import('@/components/custom-toast').then((m) => m.toast.error(message));
}

/* ───────────────────────── operations tab ───────────────────────── */

function OperationsTab() {
  const { metrics = {}, rows = { data: [], links: [] }, filters = {}, currencies = ['ILS'], codPending = [], settlements = [] } = usePage().props as any;

  const [search, setSearch] = useState(filters.search || '');
  const [collectionState, setCollectionState] = useState(filters.collection_state || 'all');
  const [paymentMethod, setPaymentMethod] = useState(filters.payment_method || 'all');
  const [dateFrom, setDateFrom] = useState(filters.date_from || '');
  const [dateTo, setDateTo] = useState(filters.date_to || '');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const didMount = useRef(false);

  const formatAmount = (amount: number, symbol = '₪') => `${symbol} ${(Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const summaryLine = (groups: any[]) => groups.map((g: any) => formatAmount(g.amount, g.symbol)).join(' + ');

  const applyFilters = () => {
    router.get(route('cod-payments.index'), {
      tab: 'operations',
      search: search.trim() || undefined,
      collection_state: collectionState === 'all' ? undefined : collectionState,
      payment_method: paymentMethod === 'all' ? undefined : paymentMethod,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }, { preserveState: true, replace: true, preserveScroll: true });
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
    const params: any = { tab: 'operations' };
    if (search.trim()) params.search = search.trim();
    if (collectionState !== 'all') params.collection_state = collectionState;
    if (paymentMethod !== 'all') params.payment_method = paymentMethod;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    const qs = new URLSearchParams(params).toString();
    window.open(route('payments.operations.export') + (qs ? `?${qs}` : ''), '_blank');
  };

  const post = async (url: string, body?: any) => {
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
      if (res.ok) { if (j.message) alert(j.message); window.location.reload(); }
      else alert(j.message || j.error || 'فشلت العملية');
    } catch { alert('تعذر الاتصال بالخادم'); }
    setActionLoading(null);
  };
  const doDelete = async (url: string) => {
    if (actionLoading) return;
    setActionLoading(url);
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch(url, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': token, Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { if (j.message) alert(j.message); window.location.reload(); } else alert(j.message || 'فشلت العملية');
    } catch { alert('تعذر الاتصال بالخادم'); }
    setActionLoading(null);
  };

  const collectCod = (row: any) => { if (!confirm(`تأكيد تحصيل مبلغ الطلب ${row.order_number}؟`)) return; post(route('orders.collect-cod', row.id)); };
  const confirmBank = (row: any) => { if (!confirm(`تأكيد استلام التحويل البنكي للطلب ${row.order_number}؟`)) return; post(route('orders.confirm-bank', row.id)); };
  const rejectBank = (row: any) => { const note = prompt('سبب رفض إثبات التحويل:') || ''; post(route('orders.reject-bank', row.id), { note }); };
  const openReceipt = (url: string) => window.open(url, '_blank');
  const createSettlement = (list: any[]) => {
    const selected = window.prompt(`عدد الطلبات القابلة للتحصيل: ${list.length}\nأدخل اسم شركة التوصيل (اختياري):`) ?? '';
    if (selected === null) return;
    const ids = list.map((c: any) => c.id);
    post(route('payments.settlements.store'), { cod_payment_ids: ids, courier_company: selected.trim() || null, courier_fees: 0, adjustment: 0 });
  };

  const pmLabel = (m: string) => ({ cod: 'الدفع عند الاستلام', cash: 'نقدًا', cash_on_delivery: 'الدفع عند الاستلام', bank: 'تحويل بنكي', bank_transfer: 'تحويل بنكي', whatsapp: 'واتساب', telegram: 'تيليجرام', offline: 'دفع يدوي' }[m] || m);
  const psLabel = (s: string) => ({ pending: 'بانتظار الدفع', paid: 'مدفوع', failed: 'فشل الدفع', refunded: 'مسترجع', partially_refunded: 'استرجاع جزئي' }[s] || s);
  const osLabel = (s: string) => ({ pending: 'قيد الانتظار', confirmed: 'مؤكد', processing: 'قيد التجهيز', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغي', failed: 'فشل', refunded: 'مسترجع', returned: 'مرتجع', completed: 'مكتمل' }[s] || s);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="flex items-start justify-between gap-4 pt-6">
          <div><p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><TrendingUp className="h-4 w-4" /> إجمالي قيمة الطلبات</p>
            <div className="mt-2 text-2xl font-bold">{metrics.gmv_total}</div>
            <p className="mt-2 text-xs text-muted-foreground">{summaryLine(metrics.gmv)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-start justify-between gap-4 pt-6">
          <div><p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><HandCoins className="h-4 w-4" /> تم تحصيله</p>
            <div className="mt-2 text-2xl font-bold text-green-600">{metrics.collected_total}</div>
            <p className="mt-2 text-xs text-muted-foreground">{summaryLine(metrics.collected)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-start justify-between gap-4 pt-6">
          <div><p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><Clock className="h-4 w-4" /> بانتظار التحصيل</p>
            <div className="mt-2 text-2xl font-bold text-amber-600">{metrics.pending_collection_total}</div>
            <p className="mt-2 text-xs text-muted-foreground">{summaryLine(metrics.pending_collection)}</p>
            <p className="mt-1 text-xs text-muted-foreground">COD مستحق: {metrics.cod_pending_count} — تحويلات بنكية: {metrics.bank_pending_count}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-start justify-between gap-4 pt-6">
          <div><p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><Wallet className="h-4 w-4" /> صافي المحصّل</p>
            <div className="mt-2 text-2xl font-bold">{metrics.net_collected_total}</div>
            <p className="mt-2 text-xs text-muted-foreground"><RotateCcw className="inline h-3 w-3" /> مستردّات: {metrics.refunded_total}</p></div>
        </CardContent></Card>
      </div>

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

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-1 h-4 w-4" /> تصدير CSV</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-muted-foreground">
                <th className="p-3 text-right">الطلب</th><th className="p-3 text-right">العميل</th><th className="p-3 text-right">المبلغ</th>
                <th className="p-3 text-right">طريقة الدفع</th><th className="p-3 text-right">الدفع</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">التحصيل</th>
              </tr></thead>
              <tbody>
                {rows.data.map((row: any) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-3 font-medium">{row.order_number}</td>
                    <td className="p-3">{row.customer_name}<br /><span className="text-xs text-muted-foreground" dir="ltr">{row.customer_phone}</span></td>
                    <td className="p-3">{formatAmount(row.total_amount, row.currency)}</td>
                    <td className="p-3">{pmLabel(row.payment_method)}</td>
                    <td className="p-3"><Badge variant={row.payment_status === 'paid' ? 'default' : row.payment_status === 'refunded' || row.payment_status === 'failed' ? 'destructive' : 'secondary'}>{psLabel(row.payment_status)}</Badge></td>
                    <td className="p-3"><Badge variant="outline">{osLabel(row.order_status)}</Badge></td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {row.can_collect_cod && <Button size="sm" variant="default" onClick={() => collectCod(row)}><Banknote className="mr-1 h-3.5 w-3.5" /> تحصيل COD</Button>}
                        {row.can_confirm_bank && <><Button size="sm" variant="default" onClick={() => confirmBank(row)}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> تأكيد</Button><Button size="sm" variant="destructive" onClick={() => rejectBank(row)}><XCircle className="mr-1 h-3.5 w-3.5" /> رفض</Button></>}
                        {row.receipt_url && <Button size="sm" variant="outline" onClick={() => openReceipt(row.receipt_url)}><Eye className="mr-1 h-3.5 w-3.5" /> الإثبات</Button>}
                        {row.cod && row.cod.status !== 'pending' && <span className="text-xs text-muted-foreground">COD: {row.cod.status} ({formatAmount(row.cod.amount_remaining, row.currency)} متبقي)</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.data.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">لا توجد عمليات مطابقة</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y">
            {rows.data.map((row: any) => (
              <div key={row.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between"><span className="font-semibold">{row.order_number}</span><Badge variant={row.payment_status === 'paid' ? 'default' : 'secondary'}>{psLabel(row.payment_status)}</Badge></div>
                <div className="text-sm text-muted-foreground">{row.customer_name} — <span dir="ltr">{row.customer_phone}</span></div>
                <div className="flex items-center justify-between"><span>{pmLabel(row.payment_method)} / {osLabel(row.order_status)}</span><span className="font-bold">{formatAmount(row.total_amount, row.currency)}</span></div>
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

      <SettlementsSection
        codPending={codPending}
        settlements={settlements}
        currencies={currencies}
        onAction={post}
        onDelete={doDelete}
        onCreate={createSettlement}
        creating={actionLoading === route('payments.settlements.store')}
      />
    </div>
  );
}

function SettlementsSection({ codPending, settlements, currencies, onAction, onDelete, onCreate, creating }: any) {
  const symbol = (c: string) => c || 'ILS';
  const formatAmount = (amount: number, cur = 'ILS') => `${symbol(cur)} ${(Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold"><Landmark className="mr-1.5 inline h-4 w-4" /> تسوية تحصيل COD</CardTitle>
        {codPending.length > 0 && <Button size="sm" onClick={() => onCreate(codPending)} disabled={creating}><Plus className="mr-1 h-4 w-4" /> إنشاء دفعة ({codPending.length})</Button>}
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
                  <div className="text-xs text-muted-foreground mt-1">{s.items_count} طلب{s.courier_company ? ` — ${s.courier_company}` : ''}{s.period_start ? ` — ${s.period_start} إلى ${s.period_end}` : ''}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">إجمالي: {formatAmount(s.gross_amount, s.currency)}</span>
                    {s.courier_fees > 0 && <div className="text-muted-foreground">رسوم: {formatAmount(s.courier_fees, s.currency)}</div>}
                    <div className="font-bold">صافي: {formatAmount(s.net_amount, s.currency)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {s.status === 'draft' && (
                      <>
                        <Button size="sm" variant="default" onClick={() => { if (confirm(`تأكيد تسوية دفعة ${s.reference}؟ سيُحوَّل كل طلب داخلها إلى مدفوع.`)) onAction(route('payments.settlements.settle', s.id)); }}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> تسوية</Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm(`حذف مسودة الدفعة ${s.reference}؟`)) onDelete(route('payments.settlements.destroy', s.id)); }}><Trash2 className="h-3.5 w-3.5" /></Button>
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
  );
}

/* ───────────────────────── COD tab ───────────────────────── */

function CodTab() {
  const { payments = { data: [], links: [] }, filters = {}, stats = {}, currency_symbol = '₪' } = usePage().props as any;
  const [search, setSearch] = useState(filters.search || '');
  const [status, setStatus] = useState(filters.status || 'all');
  const didMount = useRef(false);

  const formatCurrency = (amount: number) => `${currency_symbol} ${(Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const statusBadge = (s: string) => ({ pending: { v: 'secondary' as const, l: 'قيد الانتظار' }, partial: { v: 'default' as const, l: 'تحصيل جزئي' }, paid: { v: 'outline' as const, l: 'تم التحصيل' }, failed: { v: 'destructive' as const, l: 'فشل' }, cancelled: { v: 'destructive' as const, l: 'ملغي' }, returned: { v: 'destructive' as const, l: 'مرتجع' } }[s] || { v: 'default' as const, l: s });

  const handleExport = () => window.open(route('cod-payments.export'), '_blank');

  const refresh = (extra: any = {}) => {
    const p: any = { tab: 'cod' };
    if (search.trim()) p.search = search.trim();
    if (status !== 'all') p.status = status;
    Object.assign(p, extra);
    router.get(route('cod-payments.index'), p, { preserveState: true, replace: true, preserveScroll: true });
  };

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    const debounce = setTimeout(() => refresh(), 400);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="flex items-start justify-between gap-4 pt-6">
          <div><p className="text-sm font-medium text-muted-foreground">إجمالي إيرادات COD</p>
            <div className="mt-2 text-2xl font-bold">{stats.total || 0}</div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">{formatCurrency(stats.total_amount || 0)} إجمالي القيمة</p></div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Banknote className="h-6 w-6" /></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-start justify-between gap-4 pt-6">
          <div><p className="text-sm font-medium text-muted-foreground">بانتظار التحصيل</p>
            <div className="mt-2 text-2xl font-bold text-amber-600">{(stats.pending || 0) + (stats.partial || 0)}</div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">{stats.pending || 0} قيد الانتظار، {stats.partial || 0} جزئي</p></div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Clock className="h-6 w-6" /></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-start justify-between gap-4 pt-6">
          <div><p className="text-sm font-medium text-muted-foreground">الإيرادات المحصّلة</p>
            <div className="mt-2 text-2xl font-bold text-green-600">{stats.paid || 0}</div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">{formatCurrency(stats.total_collected || 0)} محصّل</p></div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600"><CheckCircle2 className="h-6 w-6" /></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-start justify-between gap-4 pt-6">
          <div><p className="text-sm font-medium text-muted-foreground">معدل التحصيل</p>
            <div className="mt-2 text-2xl font-bold text-violet-600">{stats.collection_rate || 0}%</div>
            <p className="mt-2 text-xs font-medium text-muted-foreground">{formatCurrency(stats.total_remaining || 0)} متبقي</p></div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><PiggyBank className="h-6 w-6" /></div>
        </CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف أو الطلب..." className="ps-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="pending">قيد الانتظار</SelectItem>
              <SelectItem value="paid">تم التحصيل</SelectItem>
              <SelectItem value="partial">تحصيل جزئي</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasPermission('export-cod-payments') && (
          <Button type="button" variant="outline" onClick={handleExport} className="shrink-0"><Download className="h-4 w-4 me-2" /> تصدير</Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base font-semibold">مدفوعات الدفع عند الاستلام</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payments.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                <Banknote className="h-8 w-8 text-muted-foreground" />
                <h3 className="mt-4 text-base font-semibold">لا توجد مدفوعات COD بعد</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">ستظهر مدفوعات الدفع عند الاستلام هنا لتتبع التحصيل.</p>
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-start py-3 px-4 font-medium">الطلب</th><th className="text-start py-3 px-4 font-medium">العميل</th>
                    <th className="text-end py-3 px-4 font-medium">المبلغ</th><th className="text-end py-3 px-4 font-medium">المحصّل</th>
                    <th className="text-end py-3 px-4 font-medium">المتبقي</th><th className="text-start py-3 px-4 font-medium">الحالة</th>
                    <th className="text-start py-3 px-4 font-medium">التاريخ</th><th className="text-start py-3 px-4 font-medium">إجراءات</th>
                  </tr></thead>
                  <tbody>
                    {payments.data.map((payment: any) => {
                      const b = statusBadge(payment.status);
                      return (
                        <tr key={payment.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-4 font-mono text-xs">#{payment.order_number || 'N/A'}</td>
                          <td className="py-3 px-4"><div className="font-medium">{payment.customer_name || 'N/A'}</div>{payment.customer_phone && <div className="text-xs text-muted-foreground">{payment.customer_phone}</div>}</td>
                          <td className="py-3 px-4 text-end font-semibold">{formatCurrency(payment.total_amount)}</td>
                          <td className="py-3 px-4 text-end text-green-600 font-medium">{formatCurrency(payment.amount_collected)}</td>
                          <td className="py-3 px-4 text-end text-amber-600 font-medium">{formatCurrency(payment.amount_remaining)}</td>
                          <td className="py-3 px-4"><Badge variant={b.v}>{b.l}</Badge></td>
                          <td className="py-3 px-4 text-muted-foreground whitespace-nowrap text-xs">{payment.created_at ? new Date(payment.created_at).toLocaleDateString() : '-'}</td>
                          <td className="py-3 px-4"><Link href={route('cod-payments.show', payment.id)} className="inline-flex items-center text-primary hover:underline"><Eye className="h-4 w-4 me-1" /> عرض</Link></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {payments.links && payments.links.length > 3 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">عرض {payments.from || 0} – {payments.to || 0} من {payments.total || 0}</p>
                <div className="flex gap-1">
                  {payments.links.map((link: any, idx: number) => link.url === null ? (
                    <span key={idx} className="px-2 py-1 text-sm text-muted-foreground cursor-not-allowed" dangerouslySetInnerHTML={{ __html: link.label }} />
                  ) : (
                    <Button key={idx} variant={link.active ? 'default' : 'outline'} size="sm" onClick={() => router.get(link.url, {}, { preserveScroll: true })} dangerouslySetInnerHTML={{ __html: link.label }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────────────────────── overview tab ───────────────────────── */

function OverviewTab() {
  const { overview = {}, currencies = ['ILS'] } = usePage().props as any;
  const metrics = overview.metrics || {};
  const codStats = overview.cod_stats || {};
  const symbol = (c: string) => c || 'ILS';
  const formatAmount = (amount: number, cur = 'ILS') => `${symbol(cur)} ${(Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const summaryLine = (groups: any[]) => groups.map((g: any) => formatAmount(g.amount, g.symbol)).join(' + ');

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><LayoutDashboard className="h-7 w-7" /></div>
          <div>
            <p className="text-lg font-bold">نظرة عامة على المدفوعات</p>
            <p className="text-sm text-muted-foreground">قراءة مالية موحّدة لحساب متجرك — لا تختلط العملات، والمنهجية مطابقة لمركز العمليات.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="flex items-start justify-between gap-4 pt-6">
          <div><p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><TrendingUp className="h-4 w-4" /> إجمالي قيمة الطلبات</p>
            <div className="mt-2 text-2xl font-bold">{metrics.gmv_total}</div>
            <p className="mt-2 text-xs text-muted-foreground">{summaryLine(metrics.gmv)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-start justify-between gap-4 pt-6">
          <div><p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><HandCoins className="h-4 w-4" /> تم تحصيله</p>
            <div className="mt-2 text-2xl font-bold text-green-600">{metrics.collected_total}</div>
            <p className="mt-2 text-xs text-muted-foreground">{summaryLine(metrics.collected)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-start justify-between gap-4 pt-6">
          <div><p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><Clock className="h-4 w-4" /> بانتظار التحصيل</p>
            <div className="mt-2 text-2xl font-bold text-amber-600">{metrics.pending_collection_total}</div>
            <p className="mt-2 text-xs text-muted-foreground">{summaryLine(metrics.pending_collection)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-start justify-between gap-4 pt-6">
          <div><p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><Wallet className="h-4 w-4" /> صافي المحصّل</p>
            <div className="mt-2 text-2xl font-bold">{metrics.net_collected_total}</div>
            <p className="mt-2 text-xs text-muted-foreground"><RotateCcw className="inline h-3 w-3" /> مستردّات: {metrics.refunded_total}</p></div>
        </CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="flex items-center justify-between gap-4 pt-6">
          <div><p className="text-sm font-medium text-muted-foreground">طلبات COD محصّلة</p><div className="mt-2 text-2xl font-bold">{codStats.paid || 0}</div></div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600"><CheckCircle2 className="h-6 w-6" /></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center justify-between gap-4 pt-6">
          <div><p className="text-sm font-medium text-muted-foreground">باقي تحصيل COD</p><div className="mt-2 text-2xl font-bold text-amber-600">{(codStats.pending || 0) + (codStats.partial || 0)}</div></div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Banknote className="h-6 w-6" /></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center justify-between gap-4 pt-6">
          <div><p className="text-sm font-medium text-muted-foreground">دفعات تحصيل جاهزة</p><div className="mt-2 text-2xl font-bold">{overview.cod_pending_count || 0}</div></div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><ReceiptText className="h-6 w-6" /></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center justify-between gap-4 pt-6">
          <div><p className="text-sm font-medium text-muted-foreground">طرق دفع مفعّلة</p><div className="mt-2 text-2xl font-bold">{overview.enabled_methods || 0}<span className="text-sm text-muted-foreground"> / {overview.total_methods || 0}</span></div></div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Settings2 className="h-6 w-6" /></div>
        </CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {hasPermission('settings-stores') && (
          <Card className="cursor-pointer border-sky-100 bg-sky-50/50 transition hover:border-sky-300" onClick={() => router.get(route('cod-payments.index'), { tab: 'methods' }, { preserveScroll: true })}>
            <CardContent className="flex items-start gap-4 p-6"><Settings2 className="mt-0.5 h-6 w-6 shrink-0 text-sky-600" />
              <div><p className="text-sm font-bold">طرق الدفع</p><p className="mt-1 text-xs leading-5 text-slate-600">كوّن بواباتك وطُرقك اليدوية وفعّلها من مكان واحد — بدون نماذج ربط وهمية.</p></div>
            </CardContent>
          </Card>
        )}
        {hasPermission('manage-orders') && (
          <Card className="cursor-pointer border-violet-100 bg-violet-50/50 transition hover:border-violet-300" onClick={() => router.get(route('cod-payments.index'), { tab: 'operations' }, { preserveScroll: true })}>
            <CardContent className="flex items-start gap-4 p-6"><HandCoins className="mt-0.5 h-6 w-6 shrink-0 text-violet-600" />
              <div><p className="text-sm font-bold">العمليات والتحصيل</p><p className="mt-1 text-xs leading-5 text-slate-600">سجل العمليات، تأكيد التحويلات، تحصيل COD، وتسويات الدفعات.</p></div>
            </CardContent>
          </Card>
        )}
        {hasPermission('manage-cod-payments') && (
          <Card className="cursor-pointer border-amber-100 bg-amber-50/50 transition hover:border-amber-300" onClick={() => router.get(route('cod-payments.index'), { tab: 'cod' }, { preserveScroll: true })}>
            <CardContent className="flex items-start gap-4 p-6"><Banknote className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
              <div><p className="text-sm font-bold">الدفع عند الاستلام</p><p className="mt-1 text-xs leading-5 text-slate-600">تتبّع وتحصيل مدفوعات COD لكل طلب.</p></div>
            </CardContent>
          </Card>
        )}
        {hasPermission('manage-orders') && (
          <Card className="cursor-pointer border-emerald-100 bg-emerald-50/50 transition hover:border-emerald-300" onClick={() => router.get(route('cod-payments.index'), { tab: 'settlements' }, { preserveScroll: true })}>
            <CardContent className="flex items-start gap-4 p-6"><Landmark className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
              <div><p className="text-sm font-bold">التسويات</p><p className="mt-1 text-xs leading-5 text-slate-600">أنشئ وسوّي دفعات تحصيل COD بشكل ذرّي وآمن.</p></div>
            </CardContent>
          </Card>
        )}
      </div>

      {(!currencies || currencies.length === 0) && (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">حدّد متجراً لعرض نظرة عامة على المدفوعات.</p>
      )}
    </div>
  );
}

/* ───────────────────────── hub shell ───────────────────────── */

export default function PaymentsHub() {
  const { t } = useTranslation();
  const {
    tab = 'overview',
    tabs = [],
    store = { id: null },
  } = usePage().props as any;

  const TAB_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
    overview: { label: 'نظرة عامة', icon: LayoutDashboard },
    methods: { label: 'طرق الدفع', icon: Settings2 },
    operations: { label: 'العمليات', icon: HandCoins },
    cod: { label: 'الدفع عند الاستلام', icon: Banknote },
    settlements: { label: 'التسويات', icon: Landmark },
  };

  const visibleTabs = tabs.filter((tb: any) => tb.permission === null || hasPermission(tb.permission));

  const switchTab = (id: string) => {
    if (id === tab) return;
    router.get(route('cod-payments.index'), { tab: id }, { preserveScroll: true });
  };

  return (
    <PageTemplate
      title="المدفوعات والتحصيل"
      description="مركز الدفعات والتحصيل الموحّد — طرق الدفع، العمليات، الدفع عند الاستلام، والتسويات"
      url="/cod-payments"
      breadcrumbs={[{ title: t('Dashboard'), href: route('dashboard') }, { title: 'المدفوعات والتحصيل' }]}
    >
      <div className="space-y-4">
        <Tabs value={tab} onValueChange={switchTab}>
          <TabsList className="h-auto flex-wrap gap-1 rounded-2xl border border-border bg-card p-1.5">
            {visibleTabs.map((tb: any) => {
              const Icon = TAB_META[tb.id]?.icon || Settings2;
              return (
                <TabsTrigger key={tb.id} value={tb.id} className="gap-1.5">
                  <Icon className="h-4 w-4" />
                  {TAB_META[tb.id]?.label || tb.label || tb.id}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'methods' && <MethodsTab storeId={store?.id ?? null} />}
        {tab === 'operations' && <OperationsTab />}
        {tab === 'cod' && <CodTab />}
        {tab === 'settlements' && <SettlementsView />}
      </div>
    </PageTemplate>
  );
}

function SettlementsView() {
  const { codPending = [], settlements = [], currencies = ['ILS'] } = usePage().props as any;
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const post = async (url: string, body?: any) => {
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
      if (res.ok) { if (j.message) alert(j.message); window.location.reload(); }
      else alert(j.message || j.error || 'فشلت العملية');
    } catch { alert('تعذر الاتصال بالخادم'); }
    setActionLoading(null);
  };
  const doDelete = async (url: string) => {
    if (actionLoading) return;
    setActionLoading(url);
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch(url, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': token, Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { if (j.message) alert(j.message); window.location.reload(); }
      else alert(j.message || 'فشلت العملية');
    } catch { alert('تعذر الاتصال بالخادم'); }
    setActionLoading(null);
  };
  const createSettlement = (list: any[]) => {
    const selected = window.prompt(`عدد الطلبات القابلة للتحصيل: ${list.length}\nأدخل اسم شركة التوصيل (اختياري):`) ?? '';
    if (selected === null) return;
    const ids = list.map((c: any) => c.id);
    post(route('payments.settlements.store'), { cod_payment_ids: ids, courier_company: selected.trim() || null, courier_fees: 0, adjustment: 0 });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm font-bold"><Landmark className="mr-1.5 inline h-4 w-4" /> تسوية تحصيل COD</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">اختر الطلبات الجاهزة (المتبقي كامل) لإنشاء دفعة تحصيل — سيؤكد التسوية جمع المبالغ وتحويل الطلبات إلى مدفوع.</p>
          <SSettlements codPending={codPending} settlements={settlements} currencies={currencies} onCreate={createSettlement} onAction={post} onDelete={doDelete} actionLoading={actionLoading} />
        </CardContent>
      </Card>
    </div>
  );
}

function SSettlements({ codPending, settlements, currencies, onCreate, onAction, onDelete, actionLoading }: any) {
  const symbol = (c: string) => c || 'ILS';
  const formatAmount = (amount: number, cur = 'ILS') => `${symbol(cur)} ${(Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <div className="space-y-3">
      {codPending.length > 0 && <Button size="sm" onClick={() => onCreate(codPending)} disabled={!!actionLoading}><Plus className="mr-1 h-4 w-4" /> إنشاء دفعة ({codPending.length})</Button>}
      {settlements.length > 0 ? (
        <div className="space-y-2">
          {settlements.map((s: any) => (
            <div key={s.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${s.status === 'settled' ? 'bg-muted/40' : ''}`}>
              <div>
                <div className="flex items-center gap-2"><span className="font-semibold">{s.reference}</span>
                  <Badge variant={s.status === 'settled' ? 'default' : 'secondary'}>{s.status === 'settled' ? 'تمت التسوية' : 'مسودة'}</Badge></div>
                <div className="text-xs text-muted-foreground mt-1">{s.items_count} طلب{s.courier_company ? ` — ${s.courier_company}` : ''}{s.period_start ? ` — ${s.period_start} إلى ${s.period_end}` : ''}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">إجمالي: {formatAmount(s.gross_amount, s.currency)}</span>
                  {s.courier_fees > 0 && <div className="text-muted-foreground">رسوم: {formatAmount(s.courier_fees, s.currency)}</div>}
                  <div className="font-bold">صافي: {formatAmount(s.net_amount, s.currency)}</div>
                </div>
                <div className="flex items-center gap-1">
                  {s.status === 'draft' && (<>
                    <Button size="sm" variant="default" onClick={() => { if (confirm(`تأكيد تسوية دفعة ${s.reference}؟`)) onAction(route('payments.settlements.settle', s.id)); }}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> تسوية</Button>
                    <Button size="sm" variant="destructive" onClick={() => { if (confirm(`حذف مسودة الدفعة ${s.reference}؟`)) onDelete(route('payments.settlements.destroy', s.id)); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </>)}
                  {s.status === 'settled' && s.settled_at && <span className="text-xs text-muted-foreground">{s.settled_at}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-muted-foreground py-2">لا توجد دفعات تحصيل حالياً.</p>}
    </div>
  );
}
