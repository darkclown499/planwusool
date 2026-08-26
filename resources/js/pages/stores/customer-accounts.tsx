import React, { useState, useRef, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/custom-toast';
import { apiPut, apiGet } from '@/utils/api';
import { Loader2, Users, LogIn, UserPlus, ShoppingBag, ShieldCheck, Mail, CheckCircle2, AlertCircle, Settings2 } from 'lucide-react';

interface FeatureItem {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  locked: boolean;
  lockReason: string;
  value?: string;
}

interface Props {
  store: { id: number; name: string; slug: string };
}

export default function CustomerAccounts({ store }: Props) {
  const [items, setItems] = useState<FeatureItem[]>([]);
  const [verificationMethod, setVerificationMethod] = useState<'none' | 'email'>('email');
  const [mailStatus, setMailStatus] = useState<string>('not_configured');
  const [mailFrom, setMailFrom] = useState<string>('');
  const [loaded, setLoaded] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = async () => {
    try {
      const res = await apiGet(`/api/stores/${store.id}/features`);
      const all: FeatureItem[] = (res.groups || []).flatMap((g: any) => g.features);
      setItems(all);
      const vm = (res.customer_verification_method as string) || all.find(f=>f.key==='customer_verification_method')?.value || 'email';
      setVerificationMethod(vm === 'email' ? 'email' : 'none');
      setMailStatus(res.mail_status || 'not_configured');
      setMailFrom(res.mail_config?.from_address || '');
    } catch {
      toast.error('تعذر تحميل إعدادات حسابات العملاء');
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
    return () => Object.values(timers.current).forEach((t) => clearTimeout(t));
  }, []);

  const findEnabled = (key: string) => items.find(f=>f.key===key)?.enabled ?? true;
  const masterOn = findEnabled('customer_accounts_enabled');
  const regOn = findEnabled('customer_registration_enabled');
  const loginOn = findEnabled('enable_customer_login');
  const guestOn = findEnabled('guest_checkout');

  const toggle = (key: string, enabled: boolean) => {
    setItems((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f)));
    setSavingKey(key);
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(async () => {
      try {
        const res = await apiPut(`/api/stores/${store.id}/features`, { key, enabled });
        if (res.groups) {
          const all: FeatureItem[] = (res.groups || []).flatMap((g: any) => g.features);
          setItems(all);
          const vm = (res.customer_verification_method as string) || all.find(f=>f.key==='customer_verification_method')?.value || verificationMethod;
          setVerificationMethod(vm === 'email' ? 'email' : 'none');
          if (res.mail_status) setMailStatus(res.mail_status);
          if (res.mail_config?.from_address) setMailFrom(res.mail_config.from_address);
        }
        toast.success('تم الحفظ بنجاح');
      } catch {
        toast.error('تعذر حفظ التغيير');
        load();
      } finally {
        setSavingKey(null);
      }
    }, 400);
  };

  const setVerification = (method: 'none' | 'email') => {
    if (method === 'email' && mailStatus !== 'connected') {
      toast.error('لا يمكنك تفعيل التحقق عبر البريد قبل إعداد وسيلة إرسال البريد الخاصة بمتجرك.');
      return;
    }
    setVerificationMethod(method);
    setSavingKey('customer_verification_method');
    if (timers.current['customer_verification_method']) clearTimeout(timers.current['customer_verification_method']);
    timers.current['customer_verification_method'] = setTimeout(async () => {
      try {
        const res = await apiPut(`/api/stores/${store.id}/features`, { key: 'customer_verification_method', value: method });
        if (res.groups) {
          const all: FeatureItem[] = (res.groups || []).flatMap((g: any) => g.features);
          setItems(all);
          if (res.mail_status) setMailStatus(res.mail_status);
          if (res.mail_config?.from_address) setMailFrom(res.mail_config.from_address);
        }
        const vm = (res.customer_verification_method as string) || method;
        setVerificationMethod(vm === 'email' ? 'email' : 'none');
        toast.success('تم الحفظ بنجاح');
      } catch (err: any) {
        const msg = err?.response?.data?.error || 'تعذر حفظ طريقة التفعيل';
        if (err?.response?.data?.needs_mail_config) {
          toast.error(msg);
        } else {
          toast.error(msg);
        }
        load();
      } finally {
        setSavingKey(null);
      }
    }, 300);
  };

  return (
    <PageTemplate
      title="حسابات العملاء"
      description="تحكم في تسجيل العملاء وتسجيل الدخول والدفع كزائر والتحقق عبر البريد"
      url={`/stores/${store.id}/customer-accounts`}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'إدارة المتجر', href: route('stores.index') },
        { title: 'حسابات العملاء' },
      ]}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {!loaded ? (
          <div className="flex h-[40vh] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
            {/* Section 1: Master */}
            <Card className={!masterOn ? 'border-amber-200' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Users className="h-4 w-4" />
                  </span>
                  حسابات العملاء
                </CardTitle>
                <CardDescription>يسمح للعملاء بإنشاء حسابات وتسجيل الدخول ومتابعة طلباتهم.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-4 bg-slate-50/50">
                  <div className="flex gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        تفعيل حسابات العملاء
                        {savingKey === 'customer_accounts_enabled' && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">عند الإيقاف يختفي زر الدخول ويمنع التسجيل ويتاح الدفع كزائر تلقائياً.</p>
                    </div>
                  </div>
                  <Switch checked={masterOn} disabled={savingKey === 'customer_accounts_enabled'} onCheckedChange={(v) => toggle('customer_accounts_enabled', v)} />
                </div>
                {!masterOn && (
                  <div className="mt-3 flex gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>حسابات العملاء متوقفة — لن يظهر للزوار أي زر لتسجيل الدخول أو إنشاء حساب. الدفع كزائر متاح تلقائياً حتى لا يتعطل إتمام الطلب.</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 2: Registration & Login */}
            <Card className={!masterOn ? 'opacity-60 pointer-events-none' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <Settings2 className="h-4 w-4" />
                  </span>
                  التسجيل وتسجيل الدخول
                </CardTitle>
                <CardDescription>التحكم الدقيق في من يستطيع إنشاء حساب ومن يستطيع تسجيل الدخول.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {/* Registration */}
                <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-3.5 hover:bg-slate-50 transition">
                  <div className="flex gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><UserPlus className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        السماح بإنشاء حساب جديد
                        {savingKey === 'customer_registration_enabled' && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">يسمح للعملاء الجدد بإنشاء حساب في متجرك.</p>
                    </div>
                  </div>
                  <Switch checked={regOn} disabled={!masterOn || savingKey === 'customer_registration_enabled'} onCheckedChange={(v)=> toggle('customer_registration_enabled', v)} />
                </div>
                {/* Login */}
                <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-3.5 hover:bg-slate-50 transition">
                  <div className="flex gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><LogIn className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        السماح بتسجيل الدخول
                        {savingKey === 'enable_customer_login' && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">يسمح للعملاء الحاليين بتسجيل الدخول ومتابعة طلباتهم.</p>
                    </div>
                  </div>
                  <Switch checked={loginOn} disabled={!masterOn || savingKey === 'enable_customer_login'} onCheckedChange={(v)=> toggle('enable_customer_login', v)} />
                </div>
                {/* Guest */}
                <div className="flex items-center justify-between gap-4 rounded-xl px-3 py-3.5 hover:bg-slate-50 transition">
                  <div className="flex gap-3 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><ShoppingBag className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        السماح بالدفع كزائر
                        {savingKey === 'guest_checkout' && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">يتم الطلب دون الحاجة لإنشاء حساب.</p>
                    </div>
                  </div>
                  <Switch checked={masterOn ? guestOn : true} disabled={!masterOn || savingKey === 'guest_checkout'} onCheckedChange={(v)=> toggle('guest_checkout', v)} />
                </div>
                {!masterOn && <p className="text-xs text-slate-400 px-1">حسابات العملاء متوقفة — الإعدادات أعلاه معطلة مؤقتاً.</p>}
              </CardContent>
            </Card>

            {/* Section 3: Verification */}
            <Card className={!masterOn || !regOn ? 'opacity-90' : ''}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Mail className="h-4 w-4" /></span>
                  تفعيل الحسابات الجديدة
                </CardTitle>
                <CardDescription>كيف تريد تفعيل حساب العميل بعد التسجيل؟</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!regOn || !masterOn ? (
                  <div className="rounded-xl bg-slate-50 border p-4 text-sm text-slate-500 text-center">
                    فعّل إنشاء الحسابات أولًا لاستخدام التحقق من الحساب.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={()=> setVerification('none')}
                        disabled={savingKey==='customer_verification_method'}
                        className={`text-start rounded-xl border-2 p-4 transition ${verificationMethod==='none' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${verificationMethod==='none' ? 'border-emerald-500' : 'border-slate-300'}`}>
                            {verificationMethod==='none' && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                          </span>
                          <span className="text-sm font-bold text-slate-800">بدون تحقق</span>
                          {savingKey==='customer_verification_method' && verificationMethod==='none' && <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500 ms-auto" />}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">يتم تفعيل الحساب مباشرة بعد التسجيل.</p>
                      </button>
                      <button
                        type="button"
                        onClick={()=> setVerification('email')}
                        disabled={savingKey==='customer_verification_method' || (mailStatus!=='connected' && verificationMethod!=='email')}
                        className={`text-start rounded-xl border-2 p-4 transition ${verificationMethod==='email' ? 'border-violet-500 bg-violet-50/40' : mailStatus!=='connected' ? 'border-slate-200 bg-slate-50 opacity-60' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${verificationMethod==='email' ? 'border-violet-500' : 'border-slate-300'}`}>
                            {verificationMethod==='email' && <span className="h-2 w-2 rounded-full bg-violet-500" />}
                          </span>
                          <span className="text-sm font-bold text-slate-800">رمز تحقق عبر البريد الإلكتروني</span>
                          {savingKey==='customer_verification_method' && verificationMethod==='email' && <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500 ms-auto" />}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">نرسل رمزًا من 6 أرقام إلى بريد العميل قبل تفعيل الحساب.</p>
                      </button>
                    </div>

                    {/* Email status when email selected */}
                    {verificationMethod==='email' && (
                      <div className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${mailStatus==='connected' ? 'bg-emerald-50/40 border-emerald-200' : 'bg-amber-50/60 border-amber-200'}`}>
                        <div className="flex items-center gap-2 text-sm">
                          {mailStatus==='connected' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-amber-600" />}
                          <div>
                            <span className={mailStatus==='connected' ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                              {mailStatus==='connected' ? '✓ البريد جاهز' : '⚠ البريد غير مهيأ'}
                            </span>
                            {mailStatus==='connected' ? (
                              <p className="text-xs text-slate-500 mt-0.5">سيتم إرسال رموز التحقق من: <span className="font-mono" dir="ltr">{mailFrom || '—'}</span></p>
                            ) : (
                              <p className="text-xs text-slate-600 mt-0.5">لإرسال رموز التحقق يجب أولاً ربط وسيلة إرسال البريد الخاصة بمتجرك.</p>
                            )}
                          </div>
                        </div>
                        <a href={`/stores/${store.id}/email-settings`} className={`text-xs font-bold hover:underline shrink-0 px-3 py-1.5 rounded-lg border ${mailStatus==='connected' ? 'text-violet-700 border-violet-200 bg-white' : 'text-white bg-violet-600 border-violet-600'}`}>
                          {mailStatus==='connected' ? 'إدارة إعدادات البريد' : 'إعداد البريد الإلكتروني'}
                        </a>
                      </div>
                    )}
                    <p className="text-xs text-slate-400">صفحة حسابات العملاء تتحكم في <strong>السياسة</strong> (هل نطلب تحققاً). إعدادات الإرسال تُدار من <strong>إعدادات البريد</strong> المنفصلة.</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-emerald-100 bg-emerald-50/40">
              <CardContent className="flex gap-3 p-4">
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-slate-800">ملاحظة</p>
                  <p className="text-xs leading-relaxed text-slate-500">
                    هذه هي الصفحة الوحيدة لإعدادات حسابات العملاء. لا يتم تكرار نفس الخيار في أي تبويب آخر داخل إعدادات المتجر.
                    التغييرات تظهر فوراً في واجهة المتجر بدون تأخير.
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageTemplate>
  );
}
