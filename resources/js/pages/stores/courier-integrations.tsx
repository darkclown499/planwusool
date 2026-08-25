import React, { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { apiGet, apiPost, apiPut } from '@/utils/api';
import { usePage } from '@inertiajs/react';
import { Truck, CheckCircle2, AlertCircle, Link2, Package, Globe, Building2, Clock3, HelpCircle, ChevronDown, Shield, ExternalLink, ArrowLeft } from 'lucide-react';
import { CourierLogo } from '@/components/courier-logo';
import { toast } from 'sonner';

const PROVIDER_FIELDS: Record<string, {key:string,label:string,helper:string,placeholder:string,type:string,required:boolean}[]> = {
  aramex: [
    {key:'username', label:'اسم المستخدم', helper:'Username من حساب Aramex للأعمال', placeholder:'your_username', type:'text', required:true},
    {key:'password', label:'كلمة المرور', helper:'Password لحساب Aramex', placeholder:'••••••••', type:'password', required:true},
    {key:'account_number', label:'رقم الحساب', helper:'Account Number', placeholder:'123456', type:'text', required:true},
    {key:'account_pin', label:'رقم PIN', helper:'Account PIN', placeholder:'****', type:'password', required:true},
    {key:'account_entity', label:'الكيان', helper:'Entity code مثل AMM للعمان', placeholder:'AMM', type:'text', required:true},
    {key:'account_country_code', label:'رمز الدولة', helper:'Country Code مثل JO', placeholder:'JO', type:'text', required:true},
  ],
  dhl: [
    {key:'api_key', label:'API Key', helper:'المفتاح من DHL Developer Portal', placeholder:'api_key_...', type:'text', required:true},
    {key:'api_secret', label:'API Secret', helper:'السر من نفس التطبيق', placeholder:'••••••••', type:'password', required:true},
  ],
  mock: [
    {key:'api_key', label:'API Key (تجريبي)', helper:'استخدم valid_mock_key للاختبار', placeholder:'valid_mock_key', type:'text', required:true},
  ],
};

const HELP_GUIDE: Record<string, React.ReactNode> = {
  aramex: (<ol className="list-decimal ps-5 space-y-1 text-xs leading-relaxed"><li>يجب أن يكون لديك حساب أعمال لدى Aramex</li><li>اطلب API credentials من مدير حسابك</li><li>ستحصل على Username / Password / Account Number / PIN / Entity / Country Code</li><li>أدخلها هنا ثم اضغط اختبار الاتصال</li><li>المصدر: <a href="https://www.aramex.com/developers" target="_blank" className="underline text-emerald-700">aramex.com/developers</a></li></ol>),
  dhl: (<ol className="list-decimal ps-5 space-y-1 text-xs leading-relaxed"><li>افتح <a href="https://developer.dhl.com" target="_blank" className="underline text-emerald-700">DHL Developer Portal</a></li><li>أنشئ تطبيقاً وفعّل MyDHL API</li><li>انسخ API Key و API Secret</li><li>أدخلها هنا واختبر الاتصال</li></ol>),
  mock: (<p className="text-xs">للاختبار بدون حساب حقيقي، استخدم <code className="bg-slate-100 px-1 rounded">valid_mock_key</code></p>),
};

function statusLabel(s:string, isActive:boolean){
  if (!isActive) return {label:'موقوف', color:'bg-slate-400'};
  if (s==='connected') return {label:'متصل', color:'bg-emerald-600'};
  if (s==='testing') return {label:'جاري الاختبار', color:'bg-amber-500'};
  if (s==='incomplete') return {label:'بيانات ناقصة', color:'bg-amber-600'};
  if (s==='error') return {label:'فشل الاتصال', color:'bg-red-600'};
  if (s==='not_connected') return {label:'غير مربوط', color:'bg-slate-500'};
  return {label:s, color:'bg-slate-500'};
}

export default function CourierIntegrations() {
  const { store, integrations: initial, catalog } = usePage().props as any;
  const [integrations, setIntegrations] = useState<any[]>(initial || []);
  const [requests, setRequests] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [requestFor, setRequestFor] = useState<any | null>(null);
  const [creds, setCreds] = useState<Record<string,string>>({});
  const [reqForm, setReqForm] = useState({ contact_name:'', phone:'', email:'', has_existing_account:false, account_number:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const refresh = async () => {
    const res:any = await apiGet(`/api/stores/${store.id}/courier-integrations`);
    setIntegrations(res.integrations || []);
    try { const r2:any = await apiGet(`/api/stores/${store.id}/courier-requests`); setRequests(r2.requests||[]); } catch {}
  };

  useEffect(()=>{ if(!initial) refresh(); else { apiGet(`/api/stores/${store.id}/courier-requests`).then((r:any)=>setRequests(r.requests||[])).catch(()=>{}); } },[]);

  const openConnect = (cat:any) => { setSelected(cat); setCreds({}); setHelpOpen(false); };
  const openEdit = (integ:any) => { setEditing(integ); setCreds({}); };

  const handleSave = async () => {
    if(!selected) return;
    setSaving(true);
    try {
      await apiPost(`/api/stores/${store.id}/courier-integrations`, { provider: selected.slug, credentials: creds, settings: {} });
      toast.success('تم حفظ الربط — حالة: بيانات ناقصة أو غير مربوط حتى الاختبار');
      setSelected(null); refresh();
    } catch(e:any){ toast.error(e?.message || 'فشل الحفظ'); }
    finally{ setSaving(false); }
  };

  const handleUpdate = async () => {
    if(!editing) return;
    setSaving(true);
    try {
      await apiPut(`/api/stores/${store.id}/courier-integrations/${editing.id}`, { credentials: creds });
      toast.success('تم تحديث بيانات الربط — اختبر الاتصال');
      setEditing(null); setCreds({}); refresh();
    } catch(e:any){ toast.error(e?.message || 'فشل التحديث'); }
    finally{ setSaving(false); }
  };

  const handleRequest = async () => {
    if(!requestFor) return;
    if(!reqForm.phone.trim()) { toast.error('رقم الهاتف مطلوب'); return; }
    setSaving(true);
    try {
      await apiPost(`/api/stores/${store.id}/courier-requests`, { provider: requestFor.slug, contact_name: reqForm.contact_name, phone: reqForm.phone, email: reqForm.email, has_existing_account: reqForm.has_existing_account, account_number: reqForm.account_number, notes: reqForm.notes });
      toast.success('تم إرسال طلب الربط — قيد المراجعة');
      setRequestFor(null); setReqForm({ contact_name:'', phone:'', email:'', has_existing_account:false, account_number:'', notes:'' }); refresh();
    } catch(e:any){ toast.error(e?.message || 'فشل الإرسال'); }
    finally{ setSaving(false); }
  };

  const handleTest = async (integration:any) => {
    try {
      const res:any = await apiPost(`/api/stores/${store.id}/courier-integrations/${integration.id}/test`, {});
      if(res.success) toast.success('متصل بنجاح');
      else toast.error(res.error || 'فشل الاتصال');
      refresh();
    } catch(e:any){ const msg=(e as any)?.message || ''; toast.error(msg || 'فشل الاختبار'); refresh(); }
  };
  const handleToggleActive = async (integ:any, val:boolean) => {
    await apiPut(`/api/stores/${store.id}/courier-integrations/${integ.id}`, { is_active: val });
    toast.success(val ? 'تم التفعيل' : 'تم الإيقاف'); refresh();
  };
  const handleDelete = async (integ:any) => {
    if(!confirm('حذف الربط؟')) return;
    await apiPost(`/api/stores/${store.id}/courier-integrations/${integ.id}`, {}); // placeholder
    // use delete
    await fetch(`/api/stores/${store.id}/courier-integrations/${integ.id}`, {method:'DELETE', headers:{'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')||'', 'Accept':'application/json'}});
    toast.success('تم الحذف'); refresh();
  };

  const locals = catalog.filter((c:any)=>c.region==='local');
  const globals = catalog.filter((c:any)=>c.region==='global');
  const customs = catalog.filter((c:any)=>c.region==='custom');

  const isConnected = (slug:string)=> integrations.some((i:any)=>i.provider===slug && i.status==='connected' && i.is_active);
  const hasPendingRequest = (slug:string)=> requests.some((r:any)=>r.provider===slug && ['new','contacted','waiting_provider','credentials_received'].includes(r.status));
  const getInteg = (slug:string)=> integrations.find((i:any)=>i.provider===slug);

  const getServices = (item:any): string[] => item.services || item.capabilities || [];
  const renderCard = (item:any) => {
    const connected = isConnected(item.slug);
    const pending = hasPendingRequest(item.slug);
    const isManual = item.status==='manual';
    const isReady = item.status==='ready';
    const isSupported = ['aramex','dhl','mock'].includes(item.slug);
    const integ = getInteg(item.slug);
    const st = integ ? statusLabel(integ.status, integ.is_active) : null;
    const isTogo = item.slug==='togo';
    return (
      <Card key={item.slug} className={`flex flex-col ${isTogo ? 'ring-1 ring-emerald-100 border-emerald-200' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex gap-3 min-w-0">
              <CourierLogo src={item.logo} name={item.name} size={48} />
              <div className="min-w-0">
                <CardTitle className="text-sm truncate">{item.name_ar || item.name}</CardTitle>
                <p className="text-xs text-muted-foreground truncate">{item.coverage || ''}</p>
                {isTogo && <p className="text-[11px] text-emerald-700 font-medium">منصة تربط متجرك بعدة شركات توصيل</p>}
                {integ?.last_tested_at && <p className="text-[10px] text-slate-400">آخر اختبار: {new Date(integ.last_tested_at).toLocaleString('ar-EG')}</p>}
              </div>
            </div>
            {integ ? <Badge className={`${st?.color} text-white shrink-0`}>{st?.label}</Badge> : pending ? <Badge variant="outline" className="border-amber-300 text-amber-700 gap-1 shrink-0"><Clock3 className="h-3 w-3"/> قيد المراجعة</Badge> : isManual ? <Badge variant="secondary" className="shrink-0">يتطلب تنسيق الربط</Badge> : isReady && isSupported ? <Badge variant="outline" className="shrink-0">متاح للربط</Badge> : isReady ? <Badge variant="outline" className="shrink-0">قريباً</Badge> : <Badge variant="outline" className="shrink-0">توصيل يدوي</Badge>}
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-1">
            {getServices(item).length ? getServices(item).map((c:string)=><Badge key={c} variant="outline" className="text-[11px] font-normal bg-slate-50">{c}</Badge>) : <span className="text-[11px] text-slate-400">توصيل يدوي — بدون API</span>}
          </div>
          {isTogo && <p className="text-[11px] leading-relaxed text-slate-500">بعد تفعيل حسابك، يمكنك إدارة إرسال الطلبات عبر شبكة شركات التوصيل المتاحة في TOGO.</p>}
          {integ?.last_error && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{integ.last_error}</p>}
          <div className="mt-auto pt-2 space-y-1">
            {item.slug==='city_express' ? (
              <Badge variant="outline" className="w-full justify-center py-1.5 border-slate-200 bg-slate-50">توصيل يدوي</Badge>
            ) : isManual ? (
              <Button size="sm" variant="outline" className="w-full" onClick={()=>setRequestFor(item)} disabled={pending}>{pending ? 'طلب الربط قيد المراجعة' : 'طلب ربط'}</Button>
            ) : isReady && isSupported ? (
              connected ? (
                <div className="space-y-1">
                  <Button size="sm" variant="outline" className="w-full" onClick={()=>openEdit(integ)}>تحديث بيانات الربط</Button>
                  <div className="grid grid-cols-2 gap-1">
                    <Button size="sm" variant="ghost" onClick={()=>handleTest(integ)}>اختبار الاتصال</Button>
                    <Button size="sm" variant="ghost" onClick={()=>handleToggleActive(integ, !integ.is_active)}>{integ.is_active ? 'إيقاف الربط' : 'تفعيل'}</Button>
                  </div>
                  <Button size="sm" variant="ghost" className="w-full text-red-600" onClick={async()=>{ if(confirm('حذف الربط؟')){ await fetch(`/api/stores/${store.id}/courier-integrations/${integ.id}`, {method:'DELETE', headers:{'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')||'', 'Accept':'application/json'}}); toast.success('تم الحذف'); refresh(); }}}>حذف الربط</Button>
                  <Button size="sm" className="w-full mt-1" onClick={()=>window.location.href=`/stores/${store.id}/shipping`}>ربط شركة التوصيل بطريقة شحن</Button>
                </div>
              ) : (
                <Button size="sm" className="w-full gap-1.5" onClick={()=>openConnect(item)}><Link2 className="h-4 w-4"/> ربط حساب API</Button>
              )
            ) : (
              <Button size="sm" variant="outline" disabled className="w-full">قريباً</Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const hasConnected = integrations.some((i:any)=>i.status==='connected' && i.is_active);

  return (
    <PageTemplate title="شركات التوصيل" description="اربط متجرك بشركة توصيل لإرسال الطلبات وتتبع الشحنات تلقائياً." url={`/stores/${store.id}/shipping/integrations`} breadcrumbs={[{title:'لوحة التحكم', href: route('dashboard')},{title:'إدارة المتجر', href: route('stores.index')},{title:'الشحن والتوصيل', href: `/stores/${store.id}/shipping`},{title:'شركات التوصيل'}]}>
      <Button variant="ghost" size="sm" className="mb-4 gap-1.5 -ms-2" onClick={()=>window.location.href=`/stores/${store.id}/shipping`}><ArrowLeft className="h-4 w-4"/> العودة إلى الشحن والتوصيل</Button>
      <div className="space-y-6">
        {!hasConnected && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex gap-3"><AlertCircle className="h-5 w-5 text-amber-600 mt-0.5"/><div><p className="text-sm font-bold">اربط شركة توصيل</p><p className="text-xs text-muted-foreground">اختر شركة من القائمة وادخل بيانات الربط لبدء الإرسال التلقائي</p></div></div>
              <Button size="sm" onClick={()=>document.getElementById('locals')?.scrollIntoView({behavior:'smooth'})}>ابدأ الربط</Button>
            </CardContent>
          </Card>
        )}

        {integrations.length>0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600"/> متصلة ({integrations.filter((i:any)=>i.status==='connected').length})</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {integrations.map((i:any)=>{
                const st=statusLabel(i.status,i.is_active);
                return (
                <div key={i.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2"><div className="h-8 w-8 rounded bg-emerald-50 flex items-center justify-center"><Truck className="h-4 w-4 text-emerald-600"/></div><div><p className="text-sm font-bold">{i.provider}</p><p className="text-xs text-muted-foreground">{st.label} {i.last_tested_at ? `• ${new Date(i.last_tested_at).toLocaleString('ar-EG')}` : ''}</p>{i.last_error && <p className="text-xs text-red-600">{i.last_error}</p>}</div></div>
                  <div className="flex gap-1"><Button size="sm" variant="outline" onClick={()=>handleTest(i)}>اختبار</Button><Button size="sm" variant="ghost" onClick={()=>openEdit(i)}>إدارة</Button></div>
                </div>
              )})}
            </CardContent>
          </Card>
        )}

        <div id="locals">
          <h3 className="font-bold flex items-center gap-2 mb-3"><Building2 className="h-4 w-4"/> شركات توصيل فلسطينية</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{locals.map(renderCard)}</div>
        </div>
        <div>
          <h3 className="font-bold flex items-center gap-2 mb-3"><Globe className="h-4 w-4"/> شركات عالمية</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{globals.map(renderCard)}</div>
        </div>
        <div>
          <h3 className="font-bold flex items-center gap-2 mb-3"><Package className="h-4 w-4"/> ربط مخصص</h3>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{customs.map(renderCard)}</div>
        </div>
      </div>

      {/* Credentials wizard */}
      <Dialog open={!!selected} onOpenChange={(o)=>!o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>ربط حساب API — {selected?.name_ar || selected?.name}</DialogTitle><DialogDescription className="text-xs">الحقول من وثائق المزود الرسمية. الأسرار تُشفّر ولا تُعاد للواجهة بعد الحفظ.</DialogDescription></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-emerald-700"><HelpCircle className="h-3.5 w-3.5"/> من أين أحصل على بيانات الربط؟ <ChevronDown className="h-3 w-3"/></CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded-lg border bg-slate-50 p-3">{selected && HELP_GUIDE[selected.slug]}</CollapsibleContent>
            </Collapsible>
            {(PROVIDER_FIELDS[selected?.slug] || PROVIDER_FIELDS['mock']).map(f=>(
              <div key={f.key}>
                <Label className="flex items-center gap-1">{f.label} {f.required && <span className="text-red-600">*</span>} <span className="text-[10px] font-normal text-slate-400">{f.helper}</span></Label>
                <Input type={f.type} value={creds[f.key]||''} onChange={e=>setCreds({...creds, [f.key]:e.target.value})} placeholder={f.placeholder} />
              </div>
            ))}
            <p className="text-xs text-amber-600 flex gap-1"><Shield className="h-3 w-3"/> لن يتم عرض الأسرار بعد الحفظ — ستظهر كـ ••••••••</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setSelected(null)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? '...جارٍ الحفظ' : 'حفظ'}</Button>
          </DialogFooter>
          <p className="text-[11px] text-center text-slate-400">الحفظ = بيانات ناقصة/غير مربوط حتى اختبار الاتصال</p>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o)=>!o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>إدارة الربط — {editing?.provider}</DialogTitle><DialogDescription className="text-xs">الحالة: {editing && statusLabel(editing.status, editing.is_active).label} {editing?.last_tested_at && `• آخر اختبار ${new Date(editing.last_tested_at).toLocaleString('ar-EG')}`}</DialogDescription></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {editing?.last_error && <div className="rounded bg-red-50 border border-red-200 p-2 text-xs text-red-700">{editing.last_error}</div>}
            <div className="rounded border p-3 space-y-2">
              <p className="text-xs font-bold">بيانات محفوظة</p>
              {Object.keys(editing?.credentials_masked || {}).map(k=>(
                <div key={k} className="flex justify-between text-xs"><span className="font-medium">{k}</span><span dir="ltr" className="font-mono bg-slate-100 px-2 py-0.5 rounded">••••••••</span></div>
              ))}
              <p className="text-[11px] text-slate-500">اترك الحقل فارغاً للحفاظ على القيمة الحالية</p>
            </div>
            {(PROVIDER_FIELDS[editing?.provider] || []).map(f=>(
              <div key={f.key}><Label>{f.label}</Label><Input type={f.type} value={creds[f.key]||''} onChange={e=>setCreds({...creds, [f.key]:e.target.value})} placeholder="اتركه فارغاً للحفاظ" /></div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center justify-between rounded border p-2"><span className="text-xs font-medium">إرسال تلقائي</span><Switch checked={!!editing?.auto_submit_orders} onCheckedChange={async v=>{ await apiPut(`/api/stores/${store.id}/courier-integrations/${editing.id}`, {auto_submit_orders:v}); refresh(); }} /></div>
              <div className="flex items-center justify-between rounded border p-2"><span className="text-xs font-medium">مزامنة الحالة</span><Switch checked={!!editing?.auto_sync_status} onCheckedChange={async v=>{ await apiPut(`/api/stores/${store.id}/courier-integrations/${editing.id}`, {auto_sync_status:v}); refresh(); }} /></div>
            </div>
          </div>
          <DialogFooter className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={()=>setEditing(null)}>إغلاق</Button>
            <Button variant="outline" onClick={async()=>{ await handleTest(editing); }}>اختبار الاتصال</Button>
            <Button onClick={handleUpdate} disabled={saving}>تحديث</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!requestFor} onOpenChange={(o)=>!o && setRequestFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>طلب ربط شركة التوصيل — {requestFor?.name_ar || requestFor?.name}</DialogTitle><DialogDescription className="text-xs">سيتم مراجعة الطلب والتواصل معك لاستكمال الربط مع الشركة.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>اسم المتجر</Label><Input value={store.name} disabled /></div>
              <div><Label>الشركة المختارة</Label><Input value={requestFor?.name_ar || requestFor?.name || ''} disabled /></div>
            </div>
            <div><Label>اسم المسؤول *</Label><Input value={reqForm.contact_name} onChange={e=>setReqForm({...reqForm, contact_name:e.target.value})} placeholder="الاسم الكامل" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>رقم الهاتف *</Label><Input value={reqForm.phone} onChange={e=>setReqForm({...reqForm, phone:e.target.value})} placeholder="059..." dir="ltr" /></div>
              <div><Label>البريد الإلكتروني</Label><Input type="email" value={reqForm.email} onChange={e=>setReqForm({...reqForm, email:e.target.value})} placeholder="email@example.com" dir="ltr" /></div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><p className="text-sm font-medium">هل لديك حساب قائم مع الشركة؟</p><p className="text-xs text-muted-foreground">إذا نعم، أدخل رقم الحساب</p></div>
              <Switch checked={reqForm.has_existing_account} onCheckedChange={(v)=>setReqForm({...reqForm, has_existing_account:v})} />
            </div>
            {reqForm.has_existing_account && (
              <div><Label>رقم الحساب / رقم العميل</Label><Input value={reqForm.account_number} onChange={e=>setReqForm({...reqForm, account_number:e.target.value})} placeholder="إن وجد" /></div>
            )}
            <div><Label>ملاحظات</Label><Textarea value={reqForm.notes} onChange={e=>setReqForm({...reqForm, notes:e.target.value})} placeholder="تفاصيل إضافية..." rows={3} /></div>
            <p className="text-xs text-slate-500">حالة الطلب بعد الإرسال: <span className="font-bold text-amber-700">طلب الربط قيد المراجعة</span> — لا يُعتبر متصلاً حتى يتم التهيئة من الدعم.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setRequestFor(null)}>إلغاء</Button>
            <Button onClick={handleRequest} disabled={saving}>{saving ? '...جارٍ الإرسال' : 'إرسال الطلب'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
