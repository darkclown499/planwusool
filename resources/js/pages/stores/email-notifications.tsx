import React, { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/custom-toast';
import { apiGet, apiPut } from '@/utils/api';
import { Loader2, Mail, Eye, AlertCircle, ShoppingBag, CreditCard, Truck, User } from 'lucide-react';

interface Props { store: { id:number; name:string } }

const groupIcons: Record<string, any> = { account: User, orders: ShoppingBag, payment: CreditCard, shipping: Truck };

export default function EmailNotifications({ store }: Props) {
  const [groups, setGroups] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await apiGet(`/api/stores/${store.id}/email-notifications`);
      setGroups(res.data.groups || []);
      setConnected(res.data.connected);
      setLogs(res.logs || []);
    } catch { toast.error('تعذر تحميل الإشعارات'); } finally { setLoaded(true); }
  };
  useEffect(()=>{ load(); },[]);

  const toggle = async (key:string, enabled:boolean) => {
    if (!connected) { toast.error('اربط البريد أولاً لتفعيل إشعارات العملاء.'); return; }
    setSaving(key);
    try {
      const res = await apiPut(`/api/stores/${store.id}/email-notifications`, { key, enabled });
      setGroups(res.data.groups || []);
      toast.success('تم الحفظ');
    } catch { toast.error('تعذر الحفظ'); } finally { setSaving(null); }
  };

  const preview = async (key:string) => {
    try { const res = await apiGet(`/api/stores/${store.id}/email-notifications/preview?type=${key}`); setPreviewHtml(res.html); } catch { toast.error('تعذر المعاينة'); }
  };

  if (!loaded) return <PageTemplate title="إشعارات البريد" description="إشعارات العملاء" url={`/stores/${store.id}/notifications/email`} breadcrumbs={[{title:'لوحة التحكم',href:route('dashboard')},{title:'إدارة المتجر',href:route('stores.index')},{title:'إشعارات البريد'}]}><div className="flex h-[40vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-emerald-500" /></div></PageTemplate>;

  return (
    <PageTemplate title="إشعارات البريد" description="اختر متى نرسل رسائل لعملائك." url={`/stores/${store.id}/notifications/email`} breadcrumbs={[{title:'لوحة التحكم',href:route('dashboard')},{title:'إدارة المتجر',href:route('stores.index')},{title:'إشعارات البريد'}]}>
      <div className="mx-auto max-w-3xl space-y-6">
        {!connected && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex gap-2 text-sm text-amber-800"><AlertCircle className="h-5 w-5" />اربط البريد أولاً لتفعيل إشعارات العملاء.</div>
              <Button size="sm" className="bg-violet-600" onClick={()=> window.location.href=`/stores/${store.id}/email-settings`}>إعداد البريد</Button>
            </CardContent>
          </Card>
        )}
        <Card className="border-violet-100 bg-violet-50/30">
          <CardContent className="p-3 text-xs text-slate-600">تأكيد البريد (OTP) يتحكم به من <a href={`/stores/${store.id}/customer-accounts`} className="font-bold text-violet-700 underline">حسابات العملاء</a> — يعرض هنا كـ "مطلوب حسب إعدادات حسابات العملاء" مع رابط إدارة.</CardContent>
        </Card>

        {groups.map((g:any)=> {
          const Icon = groupIcons[g.id] || Mail;
          return (
            <Card key={g.id} className={!connected?'opacity-60':''}>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100"><Icon className="h-4 w-4" /></span>{g.label}</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {g.features.map((f:any)=> (
                  <div key={f.key} className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">{f.label}</p>
                      <p className="text-xs text-slate-500">{f.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="ghost" onClick={()=> preview(f.key)}><Eye className="h-4 w-4" /> معاينة</Button>
                      <Switch checked={f.enabled} disabled={!connected || saving===f.key} onCheckedChange={v=> toggle(f.key,v)} />
                      {saving===f.key && <Loader2 className="h-3 w-4 animate-spin" />}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        {logs.length>0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">آخر الرسائل</CardTitle><CardDescription>مقتطف من سجل الإرسال (بدون كلمات مرور).</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {logs.map((l:any)=> (
                <div key={l.id} className="flex items-center justify-between text-xs border rounded-xl px-3 py-2">
                  <span className="font-bold">{l.type}</span>
                  <span className="font-mono">{l.recipient}</span>
                  <span className={l.status==='sent'?'text-emerald-600':'text-red-600'}>{l.status==='sent'?'تم الإرسال':'فشل'}</span>
                  <span className="text-slate-400">{l.sent_at ? new Date(l.sent_at).toLocaleString('ar-PS') : '—'}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {previewHtml && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={()=> setPreviewHtml(null)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto p-4" onClick={e=> e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">معاينة فقط — بيانات تجريبية</p>
                <Button size="sm" variant="ghost" onClick={()=> setPreviewHtml(null)}>إغلاق</Button>
              </div>
              <div dangerouslySetInnerHTML={{__html: previewHtml}} />
            </div>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}
