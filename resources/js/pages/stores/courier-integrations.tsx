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
import { apiGet, apiPost, apiPut } from '@/utils/api';
import { usePage } from '@inertiajs/react';
import { Truck, CheckCircle2, AlertCircle, Link2, Package, Globe, Building2, Clock3 } from 'lucide-react';
import { toast } from 'sonner';

export default function CourierIntegrations() {
  const { store, integrations: initial, catalog } = usePage().props as any;
  const [integrations, setIntegrations] = useState<any[]>(initial || []);
  const [requests, setRequests] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [requestFor, setRequestFor] = useState<any | null>(null);
  const [creds, setCreds] = useState<Record<string,string>>({});
  const [reqForm, setReqForm] = useState({ contact_name:'', phone:'', email:'', has_existing_account:false, account_number:'', notes:'' });
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const res:any = await apiGet(`/api/stores/${store.id}/courier-integrations`);
    setIntegrations(res.integrations || []);
    try { const r2:any = await apiGet(`/api/stores/${store.id}/courier-requests`); setRequests(r2.requests||[]); } catch {}
  };

  useEffect(()=>{ if(!initial) refresh(); else { apiGet(`/api/stores/${store.id}/courier-requests`).then((r:any)=>setRequests(r.requests||[])).catch(()=>{}); } },[]);

  const openConnect = (cat:any) => {
    setSelected(cat);
    setCreds({});
  };

  const handleSave = async () => {
    if(!selected) return;
    setSaving(true);
    try {
      await apiPost(`/api/stores/${store.id}/courier-integrations`, { provider: selected.slug, credentials: creds, settings: {} });
      toast.success('تم حفظ الربط');
      setSelected(null);
      refresh();
    } catch(e:any){ toast.error(e?.message || 'فشل الحفظ'); }
    finally{ setSaving(false); }
  };

  const handleRequest = async () => {
    if(!requestFor) return;
    if(!reqForm.phone.trim()) { toast.error('رقم الهاتف مطلوب'); return; }
    setSaving(true);
    try {
      await apiPost(`/api/stores/${store.id}/courier-requests`, { provider: requestFor.slug, contact_name: reqForm.contact_name, phone: reqForm.phone, email: reqForm.email, has_existing_account: reqForm.has_existing_account, account_number: reqForm.account_number, notes: reqForm.notes });
      toast.success('تم إرسال طلب الربط — قيد المراجعة');
      setRequestFor(null);
      setReqForm({ contact_name:'', phone:'', email:'', has_existing_account:false, account_number:'', notes:'' });
      refresh();
    } catch(e:any){ toast.error(e?.message || 'فشل الإرسال'); }
    finally{ setSaving(false); }
  };

  const handleTest = async (integration:any) => {
    try {
      const res:any = await apiPost(`/api/stores/${store.id}/courier-integrations/${integration.id}/test`, {});
      if(res.success) toast.success('متصل بنجاح');
      else toast.error(res.error || 'فشل الاتصال');
      refresh();
    } catch(e:any){ toast.error('فشل الاختبار'); }
  };

  const locals = catalog.filter((c:any)=>c.region==='local');
  const globals = catalog.filter((c:any)=>c.region==='global');
  const customs = catalog.filter((c:any)=>c.region==='custom');

  const isConnected = (slug:string)=> integrations.some((i:any)=>i.provider===slug && i.status==='connected');
  const hasPendingRequest = (slug:string)=> requests.some((r:any)=>r.provider===slug && ['new','contacted','waiting_provider','credentials_received'].includes(r.status));

  const renderCard = (item:any) => {
    const connected = isConnected(item.slug);
    const pending = hasPendingRequest(item.slug);
    const isManual = item.status==='manual';
    const isReady = item.status==='ready';
    const isSupported = ['aramex','dhl','mock'].includes(item.slug); // only implemented adapters
    return (
      <Card key={item.slug} className="flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">{item.name.substring(0,2).toUpperCase()}</div>
              <div>
                <CardTitle className="text-sm">{item.name_ar || item.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{item.name} • {item.region}</p>
              </div>
            </div>
            {connected ? <Badge className="bg-emerald-600">متصل</Badge> : pending ? <Badge variant="outline" className="border-amber-300 text-amber-700 gap-1"><Clock3 className="h-3 w-3"/> قيد المراجعة</Badge> : isManual ? <Badge variant="secondary">يتطلب تنسيق</Badge> : isReady && isSupported ? <Badge variant="outline">متاح للربط</Badge> : isReady ? <Badge variant="outline">قريباً</Badge> : <Badge variant="outline">توصيل يدوي</Badge>}
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-2">
          <p className="text-xs text-muted-foreground line-clamp-2">{item.evidence || ''}</p>
          <div className="flex flex-wrap gap-1">
            {(item.capabilities||[]).length ? (item.capabilities||[]).map((c:string)=><Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>) : <span className="text-[11px] text-slate-400">توصيل يدوي — بدون API</span>}
          </div>
          <div className="mt-auto pt-2">
            {item.slug==='city_express' ? (
              <Badge variant="outline" className="w-full justify-center py-1.5 border-slate-200 bg-slate-50">توصيل يدوي</Badge>
            ) : isManual ? (
              <Button size="sm" variant="outline" className="w-full" onClick={()=>setRequestFor(item)} disabled={pending}>{pending ? 'طلب الربط قيد المراجعة' : 'طلب ربط'}</Button>
            ) : isReady && isSupported ? (
              <Button size="sm" className="w-full gap-1.5" onClick={()=>openConnect(item)} disabled={connected}>
                {connected ? <><CheckCircle2 className="h-4 w-4"/> متصل</> : <><Link2 className="h-4 w-4"/> ربط حساب API</>}
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled className="w-full">قريباً</Button>
            )}
            {connected && (
              <Button size="sm" variant="ghost" className="w-full mt-1" onClick={()=>{ const integ=integrations.find((i:any)=>i.provider===item.slug); if(integ) handleTest(integ); }}>اختبار الاتصال</Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PageTemplate title="شركات التوصيل" description="اربط متجرك بشركة التوصيل التي تتعامل معها لإرسال الطلبات وتتبعها تلقائياً." url={`/stores/${store.id}/shipping/integrations`} breadcrumbs={[{title:'لوحة التحكم', href: route('dashboard')},{title:'إدارة المتجر', href: route('stores.index')},{title:'الشحن والتوصيل', href: `/stores/${store.id}/shipping`},{title:'شركات التوصيل'}]}>
      <div className="space-y-6">
        {integrations.length>0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600"/> متصلة</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {integrations.map((i:any)=>(
                <div key={i.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-2"><div className="h-8 w-8 rounded bg-emerald-50 flex items-center justify-center"><Truck className="h-4 w-4 text-emerald-600"/></div><div><p className="text-sm font-bold">{i.provider}</p><p className="text-xs text-muted-foreground">{i.status}</p></div></div>
                  <Button size="sm" variant="outline" onClick={()=>handleTest(i)}>اختبار</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div>
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

      <Dialog open={!!selected} onOpenChange={(o)=>!o && setSelected(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ربط حساب API — {selected?.name_ar || selected?.name}</DialogTitle><DialogDescription className="text-xs">الحقول من وثائق المزود الرسمية. الأسرار تُشفّر ولا تُعاد للواجهة بعد الحفظ.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{selected?.evidence}</p>
            <div>
              <Label>API Key / المفتاح</Label>
              <Input value={creds['api_key']||''} onChange={e=>setCreds({...creds, api_key:e.target.value})} placeholder="••••••••" />
            </div>
            {selected?.slug==='aramex' && (
              <>
                <div><Label>Username</Label><Input value={creds['username']||''} onChange={e=>setCreds({...creds, username:e.target.value})}/></div>
                <div><Label>Password</Label><Input type="password" value={creds['password']||''} onChange={e=>setCreds({...creds, password:e.target.value})}/></div>
                <div><Label>Account Number</Label><Input value={creds['account_number']||''} onChange={e=>setCreds({...creds, account_number:e.target.value})}/></div>
                <div><Label>Account Pin</Label><Input value={creds['account_pin']||''} onChange={e=>setCreds({...creds, account_pin:e.target.value})}/></div>
                <div><Label>Entity</Label><Input value={creds['account_entity']||''} onChange={e=>setCreds({...creds, account_entity:e.target.value})} placeholder="e.g. AMM"/></div>
                <div><Label>Country Code</Label><Input value={creds['account_country_code']||''} onChange={e=>setCreds({...creds, account_country_code:e.target.value})} placeholder="JO"/></div>
              </>
            )}
            {selected?.slug==='dhl' && (
              <>
                <div><Label>API Secret</Label><Input type="password" value={creds['api_secret']||''} onChange={e=>setCreds({...creds, api_secret:e.target.value})}/></div>
              </>
            )}
            <p className="text-xs text-amber-600">لن يتم عرض الأسرار بعد الحفظ — ستظهر كـ ••••••••</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setSelected(null)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? '...جارٍ الحفظ' : 'حفظ واختبار الاتصال'}</Button>
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
