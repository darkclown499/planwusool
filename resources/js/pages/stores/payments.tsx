import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/custom-toast';
import { apiGet, apiPut } from '@/utils/api';
import {
  Loader2, ChevronDown, CreditCard, Save, ExternalLink, KeyRound, CheckCircle2,
  Globe2, MapPin, Coins, Link2, Wallet, Building2, Info,
} from 'lucide-react';

interface CredentialField { key: string; label: string; type?: string; value: string; placeholder?: string; }
interface PaymentMethod {
  method: string; label: string; enabled: boolean; fields: CredentialField[];
  type?: string; section?: string; region?: string; currencies?: string[];
  catalog_desc?: string; badge_label?: string; badge_variant?: string; is_partner?: boolean;
}
interface PaymentGroup { id: string; label: string; methods: PaymentMethod[]; }
interface Props { store: { id: number; name: string; slug: string }; }

const SECTION_META: Record<string, { icon: React.ComponentType<{className?: string}>; label: string; desc: string }> = {
  connected: { icon: Link2, label: 'متصلة', desc: 'بوابات مربوطة فعلياً — يتم التحقق عبر المزود.' },
  partner: { icon: Info, label: 'تحتاج عقداً مع المزود', desc: 'يتطلب حساب تاجر وبيانات ربط من المزود. لا يوجد نموذج ربط وهمي.' },
  manual: { icon: Wallet, label: 'تحويل ومحافظ يدوية', desc: 'تحويل يدوي — يقدّم التاجر التعليمات ويؤكد الدفع يدوياً بعد مراجعة الإثبات.' },
  international: { icon: Globe2, label: 'بوابات دولية', desc: 'بوابات دولية قائمة — محفوظة كما هي.' },
};

const REGION_LABEL: Record<string,string> = { palestine:'فلسطين', jordan:'الأردن', israel:'إسرائيل', crypto:'العملات الرقمية', international:'دولي', global:'عالمي' };

function badgeStyle(variant?: string) {
  if (variant==='connected') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (variant==='manual') return 'bg-amber-50 text-amber-700 ring-amber-200';
  if (variant==='partner') return 'bg-sky-50 text-sky-700 ring-sky-200';
  if (variant==='inactive') return 'bg-slate-100 text-slate-500 ring-slate-200';
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
              {m.type==='manual' ? <Wallet className="h-5 w-5"/> : m.is_partner ? <Building2 className="h-5 w-5"/> : <CreditCard className="h-5 w-5"/>}
            </span>
            <div className="min-w-0">
              <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                <span className="truncate">{m.label}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${badgeStyle(m.badge_variant)}`}>
                  {m.badge_label || (m.enabled ? 'مفعل':'غير مفعّل')}
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
            {pending && <Loader2 className="h-4 w-4 animate-spin text-emerald-500"/>}
            <Switch checked={m.enabled} disabled={pending || isPartner} onCheckedChange={(v)=> onToggle(m.method, v)} />
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
          <button type="button" onClick={()=> onExpand(m.method)} className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100">
            <span className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5"/> الإعدادات والتعليمات {m.fields.length>0 ? `(${m.fields.length})`:''}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen?'rotate-180':''}`}/>
          </button>
        )}
        {isPartner && m.enabled && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">هذه الطريقة تحتاج عقداً — التفعيل وحده لا ينشئ ربطاً. سيتم التفعيل الحقيقي بعد توفير بيانات المزود.</p>
        )}
        {showForm && isOpen && (
          <div className="space-y-2.5 rounded-xl border border-slate-100 p-3">
            {m.fields.length===0 ? (
              <p className="text-xs text-slate-400">{m.type==='manual' ? 'أدخل بيانات المستفيد والتعليمات التي ستظهر للعميل عند الطلب.' : 'هذه الطريقة لا تتطلب مفاتيح ربط.'}</p>
            ) : m.fields.map((c: CredentialField)=> (
              <div key={c.key}>
                <label className="mb-1 block text-[11px] font-bold text-slate-500" dir="auto">{c.label}</label>
                {c.type==='textarea' ? (
                  <Textarea rows={3} placeholder={c.value ? 'محفوظ — اكتب للاستبدال' : (c.placeholder || 'اكتب التعليمات التي ستظهر للعميل...')} value={drafts[m.method]?.[c.key] ?? ''} onChange={(e)=> setDraft(m.method, c.key, e.target.value)} />
                ) : (
                  <Input dir="ltr" type={c.type==='password' ? 'password':'text'} placeholder={c.value ? `المحفوظ: ${c.value}` : (c.placeholder || 'المفتاح')} value={drafts[m.method]?.[c.key] ?? ''} onChange={(e)=> setDraft(m.method, c.key, e.target.value)} />
                )}
              </div>
            ))}
            <Button type="button" size="sm" className="mt-1 w-full gap-1.5" onClick={()=> onSave(m.method)} disabled={saving===m.method}>
              {saving===m.method ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>} حفظ الإعدادات
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function StorePayments({ store }: Props) {
  const [list, setList] = useState<PaymentMethod[]>([]);
  const [groups, setGroups] = useState<PaymentGroup[]>([]);
  const [activeSection, setActiveSection] = useState<string>('all');
  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});
  const [savingCreds, setSavingCreds] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const apiUrl = `/api/stores/${store.id}/payments`;

  const load = useCallback(async () => {
    try {
      const res = await apiGet(apiUrl);
      if (res.methods) setList(res.methods);
      if (res.groups) setGroups(res.groups);
      setLoaded(true);
    } catch { toast.error('تعذر تحميل إعدادات الدفع.'); }
  }, [apiUrl]);

  useEffect(()=>{ load(); const ref=timers.current; return ()=>{ Object.values(ref).forEach((t)=> clearTimeout(t)); }; }, [load]);

  const persistToggle = async (method: string, enabled: boolean) => {
    try { await apiPut(apiUrl, { method, enabled }); toast.success('تم الحفظ بنجاح'); }
    catch { toast.error('تعذر حفظ الحالة. حاول مرة أخرى.'); }
    finally { setPendingToggles((p)=> ({...p, [method]: false})); }
  };
  const onToggle = (method: string, enabled: boolean) => {
    const item = list.find(l=> l.method===method);
    if (item?.is_partner && enabled) { toast.error('هذه الطريقة تحتاج عقداً مع المزود — لا يمكن تفعيل الربط قبل توفير بيانات المزود.'); return; }
    setList((prev)=> prev.map((m)=> m.method===method ? {...m, enabled}: m));
    setPendingToggles((p)=> ({...p, [method]: true}));
    if (timers.current[method]) clearTimeout(timers.current[method]);
    timers.current[method] = setTimeout(()=> persistToggle(method, enabled), 400);
  };
  const saveCredentials = async (method: string) => {
    const config = drafts[method] || {};
    const payload: Record<string,string> = {};
    Object.entries(config).forEach(([k,v])=> { if(v && v.trim()!=='') payload[k]=v.trim(); });
    if (Object.keys(payload).length===0){ toast.error('أدخل قيمة واحدة على الأقل لحفظها (القيم الفارغة تُتجاهل).'); return; }
    setSavingCreds(method);
    try { const res = await apiPut(apiUrl, { method, config: payload }); if(res.methods) setList(res.methods); setDrafts((d)=> ({...d, [method]:{}})); toast.success('تم الحفظ بنجاح'); }
    catch { toast.error('تعذر حفظ الإعدادات. حاول مرة أخرى.'); }
    finally { setSavingCreds(null); }
  };
  const setDraft = (method: string, key: string, value: string) => setDrafts((prev)=> ({...prev, [method]:{...(prev[method]||{}), [key]:value}}));

  const enabledCount = list.filter((m)=> m.enabled).length;

  const filtered = useMemo(()=>{
    let arr = [...list];
    if (activeSection!=='all') arr = arr.filter(m=> m.section===activeSection);
    if (activeRegion!=='all') arr = arr.filter(m=> m.region===activeRegion);
    return arr;
  }, [list, activeSection, activeRegion]);

  const sectionCounts = useMemo(()=>{
    const c: Record<string,number> = { all:list.length };
    Object.keys(SECTION_META).forEach(s=> c[s]=list.filter(m=> m.section===s).length);
    return c;
  }, [list]);

  const regionOptions = ['all','palestine','jordan','israel','international','crypto'] as const;

  return (
    <PageTemplate
      title="طرق الدفع"
      description="اختر كيف يستقبل متجرك المدفوعات — متصلة، تحتاج عقداً، يدوية، ودولية."
      url={`/stores/${store.id}/payments`}
      breadcrumbs={[{title:'لوحة التحكم', href: route('dashboard')},{title:'إدارة المتجر', href: route('stores.index')},{title:'طرق الدفع'}]}
    >
      <div className="mx-auto max-w-6xl space-y-4">
        {!loaded ? (
          <div className="flex h-[40vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-emerald-500"/></div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
              <button type="button" onClick={()=> setActiveSection('all')} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${activeSection==='all'?'bg-slate-900 text-white shadow':'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                <CreditCard className="h-3.5 w-3.5"/> الكل <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeSection==='all'?'bg-white/20':'bg-white'}`}>{sectionCounts.all}</span>
              </button>
              {Object.entries(SECTION_META).map(([id, meta])=> {
                const Icon=meta.icon;
                return (
                  <button key={id} type="button" onClick={()=> setActiveSection(id)} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${activeSection===id?'bg-emerald-600 text-white shadow':'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                    <Icon className="h-3.5 w-3.5"/>{meta.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeSection===id?'bg-white/20':'bg-white'}`}>{sectionCounts[id]||0}</span>
                  </button>
                );
              })}
              <span className="mr-auto flex items-center gap-1.5 pl-3 text-[11px] font-bold text-emerald-600">
                {enabledCount>0 && (<><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"/><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"/></span>{enabledCount} مفعلة</>)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">المنطقة:</span>
              {regionOptions.map(r=> (
                <button key={r} type="button" onClick={()=> setActiveRegion(r)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${activeRegion===r?'bg-emerald-600 text-white':'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
                  {r==='all' ? 'الكل' : ({ palestine:'فلسطين', jordan:'الأردن', israel:'إسرائيل', international:'دولي', crypto:'العملات الرقمية' } as any)[r] || r}
                </button>
              ))}
            </div>

            {activeSection!=='all' && (
              <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-800">
                <span className="font-bold">{SECTION_META[activeSection]?.label}:</span> {SECTION_META[activeSection]?.desc}
                {activeSection==='partner' && <span className="mr-2 font-bold">لا يوجد ربط وهمي — يتطلب عقداً.</span>}
                {activeSection==='manual' && <span className="mr-2">الدفع لا يُعتبر مدفوعاً تلقائياً — بانتظار تأكيد التاجر.</span>}
              </div>
            )}

            {filtered.length===0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">لا توجد طرق دفع في هذا القسم/المنطقة.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((m)=> (
                  <ProviderCard key={m.method} m={m} expanded={expanded} pending={!!pendingToggles[m.method]} saving={savingCreds} drafts={drafts} setDraft={setDraft} onToggle={onToggle} onSave={saveCredentials} onExpand={(id:string)=> setExpanded(e=> ({...e, [id]:!e[id]}))} />
                ))}
              </div>
            )}

            <Card className="border-sky-100 bg-sky-50/50">
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600"/>
                  <div>
                    <p className="text-sm font-bold text-slate-800">ملاحظة</p>
                    <p className="text-xs leading-5 text-slate-600">
                      هذا هو المكان الوحيد لإعداد بوابات الدفع. الحقول الفارغة تُتجاهل للإبقاء على القيمة الحالية، والمفاتيح الحساسة تُشفّر تلقائياً. طرق <span className="font-bold">تحتاج عقداً</span> لا تعرض نموذج ربط وهمي — تواصل مع المزود لفتح حساب تاجر.
                      <br/>العملة يجب أن تكون مدعومة من المزود — لن يتم تحويل 10 شيكل إلى دولار تلقائياً.
                    </p>
                  </div>
                </div>
                <a href={`/stores/${store.id}/settings`} className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-sky-700 hover:underline">إعدادات عامة المتجر<ExternalLink className="h-3.5 w-3.5"/></a>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageTemplate>
  );
}
