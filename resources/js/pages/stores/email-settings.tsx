import React, { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/custom-toast';
import { apiGet, apiPut, apiPost } from '@/utils/api';
import { Loader2, Mail, Send, ShieldCheck, AlertCircle, CheckCircle2, Clock, XCircle, Settings2 } from 'lucide-react';

interface Props {
  store: { id: number; name: string; slug: string };
}

interface MailConfig {
  provider: string;
  driver: string;
  host: string;
  port: string;
  username: string;
  encryption: string;
  from_address: string;
  from_name: string;
  password_configured: boolean;
  password_masked: string;
  status: string;
  last_tested_at: string | null;
  last_error: string | null;
}

const statusMeta: Record<string, { label: string; color: string; icon: any; desc: string }> = {
  not_configured: { label: 'غير مهيأ', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Settings2, desc: 'لم يتم إعداد بريد المتجر بعد.' },
  incomplete: { label: 'بيانات ناقصة', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertCircle, desc: 'أكمل جميع الحقول المطلوبة.' },
  testing: { label: 'جاري الاختبار', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: Clock, desc: 'يتم اختبار الاتصال...' },
  connected: { label: 'متصل', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, desc: 'البريد جاهز لإرسال رموز التحقق.' },
  error: { label: 'فشل الاتصال', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle, desc: 'فشل الاتصال — راجع البيانات.' },
};

export default function StoreEmailSettings({ store }: Props) {
  const [config, setConfig] = useState<MailConfig | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState<1|2|3>(1);
  const [showHelp, setShowHelp] = useState(false);
  const [form, setForm] = useState({
    host: '',
    port: '587',
    username: '',
    password: '',
    encryption: 'tls',
    from_address: '',
    from_name: '',
  });

  const load = async () => {
    try {
      const res = await apiGet(`/api/stores/${store.id}/email-config`);
      const c = res.config as MailConfig;
      setConfig(c);
      setForm({
        host: c.host || '',
        port: c.port || '587',
        username: c.username || '',
        password: '',
        encryption: c.encryption || 'tls',
        from_address: c.from_address || '',
        from_name: c.from_name || store.name,
      });
      // auto-enter editing if not connected
      if (c.status !== 'connected') { setEditing(true); setStep(1); } else { setEditing(false); }
    } catch {
      toast.error('تعذر تحميل إعدادات البريد');
    } finally {
      setLoaded(true);
    }
  };

  useEffect(()=>{ load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        host: form.host.trim(),
        port: parseInt(form.port,10),
        username: form.username.trim(),
        encryption: form.encryption,
        from_address: form.from_address.trim(),
        from_name: form.from_name.trim(),
      };
      if (form.password.trim() !== '') payload.password = form.password;
      const res = await apiPut(`/api/stores/${store.id}/email-config`, payload);
      setConfig(res.config);
      if (form.password) setForm(f=>({...f,password:''}));
      toast.success('تم حفظ إعدادات البريد');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'تعذر الحفظ';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const sendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) { toast.error('أدخل بريداً لإرسال التجربة'); return; }
    setTesting(true);
    try {
      const res = await apiPost(`/api/stores/${store.id}/email-config/test`, { email: testEmail.trim() });
      setConfig(res.config);
      toast.success(res.message || 'تم إرسال رسالة تجريبية بنجاح');
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.message || err?.message || 'فشل الإرسال';
      if (data?.config) setConfig(data.config);
      toast.error(msg);
      // reload to reflect error status
      load();
    } finally { setTesting(false); }
  };

  if (!loaded) {
    return (
      <PageTemplate title="إعدادات البريد" description="إعدادات البريد الخاصة بمتجرك" url={`/stores/${store.id}/email-settings`} breadcrumbs={[{title:'لوحة التحكم', href: route('dashboard')},{title:'إدارة المتجر', href: route('stores.index')},{title:'إعدادات البريد'}]}>
        <div className="flex h-[40vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-emerald-500" /></div>
      </PageTemplate>
    );
  }

  const status = config?.status || 'not_configured';
  const meta = statusMeta[status] || statusMeta.not_configured;
  const StatusIcon = meta.icon;

  return (
    <PageTemplate
      title="إعدادات البريد الإلكتروني"
      description="اربط وسيلة إرسال البريد الخاصة بمتجرك لإرسال رموز التحقق ورسائل العملاء."
      url={`/stores/${store.id}/email-settings`}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'إدارة المتجر', href: route('stores.index') },
        { title: 'إعدادات البريد' },
      ]}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Intro */}
        <p className="text-sm text-slate-600">اربط بريد متجرك لإرسال رموز التحقق ورسائل الطلبات لعملائك باستخدام هوية متجرك الخاصة.</p>

        {/* Status + sender identity */}
        <Card className={`border ${meta.color}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg border bg-white ${meta.color}`}>
                  <StatusIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold">{status==='connected' ? 'البريد متصل' : status==='error' ? 'يوجد خطأ في الاتصال' : 'البريد غير مهيأ'}</p>
                  <p className="text-xs opacity-80">{meta.desc}</p>
                  {config?.last_tested_at && <p className="text-xs opacity-60 mt-0.5">آخر اختبار: {new Date(config.last_tested_at).toLocaleString('ar-PS')}</p>}
                  {config?.last_error && status==='error' && <p className="text-xs text-red-600 mt-1 max-w-md break-words">{config.last_error}</p>}
                </div>
              </div>
              {status==='connected' && (
                <div className="text-xs text-center">
                  <p className="font-bold text-slate-800">المرسل:</p>
                  <p className="font-semibold">{config?.from_name || store.name}</p>
                  <p className="font-mono" dir="ltr">{config?.from_address}</p>
                </div>
              )}
            </div>
            {!editing && (
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={()=>{ setEditing(true); setStep(1); }}><Settings2 className="h-4 w-4 ms-2" />تعديل الإعدادات</Button>
                <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={()=> document.getElementById('test-card')?.scrollIntoView({behavior:'smooth'})}><Send className="h-4 w-4 ms-2" />إرسال رسالة تجريبية</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progressive disclosure: summary or wizard */}
        {!editing ? (
          <Card className="border-emerald-100 bg-emerald-50/40">
            <CardContent className="p-4 flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-slate-600">البريد جاهز — سيتم إرسال رسائل عملائك (التحقق والطلبات) من بريد متجرك الخاص. يمكنك اختبار الإرسال أو تعديل الإعدادات في أي وقت.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Step indicators */}
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-3 py-1 rounded-full border ${step===1?'bg-violet-600 text-white border-violet-600':'bg-white text-slate-500'}`}>1. بيانات المرسل</span>
              <span className="text-slate-400">—</span>
              <span className={`px-3 py-1 rounded-full border ${step===2?'bg-violet-600 text-white border-violet-600':'bg-white text-slate-500'}`}>2. خدمة البريد</span>
              <span className="text-slate-400">—</span>
              <span className={`px-3 py-1 rounded-full border ${step===3?'bg-violet-600 text-white border-violet-600':'bg-white text-slate-500'}`}>3. اختبار الاتصال</span>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Mail className="h-4 w-4" /></span>
                  {step===1 ? 'بيانات المرسل' : step===2 ? 'بيانات خدمة البريد' : 'اختبار الاتصال'}
                </CardTitle>
                <CardDescription>
                  {step===1 ? 'هوية المرسل التي سيراها عملاؤك.' : step===2 ? 'بيانات SMTP الخاصة بمزود بريدك.' : 'اختبر الإرسال — لن تُعتبر الإعدادات متصلة إلا بعد نجاح حقيقي.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {step===1 && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>اسم المرسل</Label>
                      <Input value={form.from_name} onChange={e=>setForm({...form, from_name:e.target.value})} placeholder={store.name} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>بريد المرسل</Label>
                      <Input value={form.from_address} onChange={e=>setForm({...form, from_address:e.target.value})} placeholder="shop@example.com" dir="ltr" className="text-left" />
                    </div>
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={()=>{ setEditing(false); if(status==='connected') setStep(1); }}>إلغاء</Button>
                      <Button onClick={()=> setStep(2)} className="bg-violet-600 hover:bg-violet-700" disabled={!form.from_address || !form.from_name}>التالي</Button>
                    </div>
                  </div>
                )}
                {step===2 && (
                  <form onSubmit={(e)=>{ e.preventDefault(); setSaving(true); const payload:any={host:form.host.trim(),port:parseInt(form.port,10),username:form.username.trim(),encryption:form.encryption,from_address:form.from_address.trim(),from_name:form.from_name.trim()}; if(form.password.trim()!=='') payload.password=form.password; apiPut(`/api/stores/${store.id}/email-config`,payload).then(res=>{ setConfig(res.config); if(form.password) setForm(f=>({...f,password:''})); toast.success('تم حفظ الإعدادات'); setStep(3); }).catch((err:any)=> toast.error(err?.response?.data?.message||'تعذر الحفظ')).finally(()=> setSaving(false)); }} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>SMTP Host</Label>
                        <Input value={form.host} onChange={e=>setForm({...form, host:e.target.value})} placeholder="smtp.example.com" dir="ltr" className="text-left font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Port</Label>
                        <Input value={form.port} onChange={e=>setForm({...form, port:e.target.value})} placeholder="587" dir="ltr" className="text-left font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Encryption</Label>
                        <Select value={form.encryption} onValueChange={v=>setForm({...form, encryption:v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tls">TLS</SelectItem>
                            <SelectItem value="ssl">SSL</SelectItem>
                            <SelectItem value="none">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Username</Label>
                        <Input value={form.username} onChange={e=>setForm({...form, username:e.target.value})} placeholder="user@example.com" dir="ltr" className="text-left font-mono" />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label>Password</Label>
                        <Input type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} placeholder={config?.password_configured ? '•••••••• (اتركه فارغاً)' : '••••••••'} dir="ltr" className="text-left font-mono" />
                        <p className="text-xs text-slate-400">اتركه فارغاً للاحتفاظ الحالي.</p>
                      </div>
                    </div>
                    {/* Help collapsible */}
                    <div className="rounded-xl border bg-slate-50 p-3">
                      <button type="button" onClick={()=> setShowHelp(!showHelp)} className="text-xs font-bold text-violet-700">من أين أحصل على هذه البيانات؟ {showHelp ? '▲' : '▼'}</button>
                      {showHelp && (
                        <div className="mt-2 space-y-2 text-xs text-slate-600 leading-relaxed">
                          <p><strong>الاستضافة/cPanel:</strong> ستجد إعدادات SMTP في لوحة الاستضافة ضمن Email Accounts → Connect Devices.</p>
                          <p><strong>Gmail / Google Workspace:</strong> كلمة المرور العادية قد لا تعمل؛ قد تحتاج إلى كلمة مرور تطبيقات (App Password) أو OAuth حسب مزودك.</p>
                          <p><strong>Microsoft 365 / Outlook:</strong> راجع وثائق Microsoft لإعدادات SMTP (smtp.office365.com) والتأكد من تفعيل SMTP Auth.</p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={()=> setStep(1)}>السابق</Button>
                      <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                        {saving ? <><Loader2 className="h-4 w-4 animate-spin ms-2" />جاري الحفظ...</> : <>حفظ ومتابعة</>}
                      </Button>
                    </div>
                  </form>
                )}
                {step===3 && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">أدخل بريداً لاختبار الإرسال الحقيقي. لن تُعتبر الإعدادات متصلة إلا بعد نجاح هذا الاختبار.</p>
                    <form onSubmit={sendTest} className="flex flex-col sm:flex-row gap-3">
                      <Input type="email" value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="test@example.com" dir="ltr" className="flex-1 text-left" required />
                      <Button type="submit" disabled={testing} className="bg-violet-600 hover:bg-violet-700 shrink-0">
                        {testing ? <><Loader2 className="h-4 w-4 animate-spin ms-2" />جاري الإرسال...</> : <><Send className="h-4 w-4 ms-2" />إرسال رسالة تجريبية</>}
                      </Button>
                    </form>
                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={()=> setStep(2)}>السابق</Button>
                      <Button type="button" onClick={()=>{ setEditing(false); load(); }} variant="outline" className="bg-emerald-50">إنهاء</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Test card also visible when editing step 3 or not editing */}
        {(!editing || step===3) && (
          <Card id="test-card" className={editing && step!==3 ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600"><Send className="h-4 w-4" /></span>
                اختبار الاتصال
              </CardTitle>
              <CardDescription>لن يتم اعتبار الإعدادات "متصلة" إلا بعد نجاح اختبار إرسال حقيقي.</CardDescription>
            </CardHeader>
            <CardContent>
              {!editing && (
                <form onSubmit={sendTest} className="flex flex-col sm:flex-row gap-3">
                  <Input type="email" value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="test@example.com" dir="ltr" className="flex-1 text-left" required />
                  <Button type="submit" disabled={testing} className="bg-violet-600 hover:bg-violet-700 shrink-0">
                    {testing ? <><Loader2 className="h-4 w-4 animate-spin ms-2" />جاري الإرسال...</> : <><Send className="h-4 w-4 ms-2" />إرسال رسالة تجريبية</>}
                  </Button>
                </form>
              )}
              <p className="text-xs text-slate-400 mt-2">سيتم الإرسال من <span className="font-mono" dir="ltr">{config?.from_address || '—'}</span> بإعدادات هذا المتجر فقط.</p>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 bg-slate-50/60">
          <CardContent className="p-4 flex gap-3">
            <ShieldCheck className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-slate-500">إعدادات البريد منفصلة عن سياسة حسابات العملاء. تفعيل "التحقق عبر البريد" يتطلب أن تكون الحالة "متصل" هنا أولاً.</p>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
