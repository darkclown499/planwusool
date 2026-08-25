import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm, usePage } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { useState } from 'react';
import { MessageCircle, CheckCircle2, AlertCircle, Send, Save, Info, Link2, Unlink, ExternalLink, Shield } from 'lucide-react';

interface Props {
  whatsappSettings: any;
  storeId: number;
}

export default function MerchantWhatsapp({ whatsappSettings, storeId }: Props) {
  const { props } = usePage<any>();
  const resolvedStoreId = storeId || props.store?.id || props.storeId || window.location.pathname.match(/stores\/(\d+)/)?.[1];
  const status = whatsappSettings.status || {};
  const integration = whatsappSettings.integration;

  const hasIntegration = !!whatsappSettings.has_token || !!integration;
  const isConnected = status.status_key === 'connected' || status.connection_status === 'connected';
  const isEnabled = whatsappSettings.is_enabled;

  const { data, setData, put, processing, errors } = useForm({
    access_token: '',
    phone_number_id: whatsappSettings.phone_number_id || '',
    waba_id: whatsappSettings.waba_id || '',
    business_phone: whatsappSettings.business_phone || '',
    notification_phone: whatsappSettings.notification_phone || '',
    is_enabled: isEnabled || false,
  });

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [showConnectForm, setShowConnectForm] = useState(!hasIntegration);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    put(route('stores.notifications.whatsapp.update', resolvedStoreId), {
      onSuccess: () => toast.success('تم حفظ إعدادات واتساب بنجاح'),
      onError: () => toast.error('تعذر حفظ الإعدادات'),
    });
  };

  const handleVerify = async () => {
    setVerifyLoading(true);
    try {
      // First save if form dirty
      const saveUrl = route('stores.notifications.whatsapp.update', resolvedStoreId);
      // Use fetch for verify
      const verifyUrl = route('stores.notifications.whatsapp.verify', resolvedStoreId);
      const res = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const d = await res.json();
      if (res.ok && d.success) {
        toast.success('تم ربط واتساب بنجاح');
        window.location.reload();
      } else {
        toast.error(d.message || 'تعذر الاتصال بحساب واتساب');
      }
    } catch {
      toast.error('تعذر الاتصال');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    try {
      const url = route('stores.notifications.whatsapp.test', resolvedStoreId);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const d = await res.json();
      if (res.ok && d.success) toast.success(d.message || 'تم إرسال رسالة الاختبار');
      else toast.error(d.message || 'تعذر إرسال رسالة الاختبار');
    } catch {
      toast.error('تعذر إرسال رسالة الاختبار');
    } finally {
      setTestLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('هل تريد فصل حساب واتساب عن هذا المتجر؟ ستتوقف إشعارات الطلبات عبر واتساب.')) return;
    try {
      const url = route('stores.notifications.whatsapp.disconnect', resolvedStoreId);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      if (res.ok) {
        toast.success('تم فصل واتساب');
        window.location.reload();
      } else toast.error('تعذر فصل واتساب');
    } catch {
      toast.error('تعذر فصل واتساب');
    }
  };

  const getBadge = () => {
    if (status.badge === 'green') return <Badge className="bg-green-600 text-white">متصل</Badge>;
    if (status.badge === 'red') return <Badge variant="destructive">خطأ في الاتصال</Badge>;
    if (status.badge === 'amber') return <Badge variant="secondary">يحتاج إعداد</Badge>;
    return <Badge variant="outline">{status.status_label}</Badge>;
  };

  return (
    <PageTemplate
      title="إشعارات الطلبات"
      description="اربط حساب WhatsApp Business الخاص بمتجرك لاستقبال إشعارات فورية عند وصول طلب جديد"
      url={`/stores/${resolvedStoreId}/notifications/whatsapp`}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'إدارة المتجر', href: route('stores.index') },
        { title: 'إشعارات الطلبات' },
      ]}
    >
      <div className="max-w-3xl mx-auto space-y-6" dir="rtl">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            إشعارات واتساب
          </CardTitle>
          <CardDescription>استقبل إشعاراً على واتساب فور وصول طلب جديد — يعمل حتى عندما لا تكون داخل لوحة التحكم.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              {isConnected ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : status.status_key === 'not_connected' ? <AlertCircle className="h-5 w-5 text-gray-400" /> : <Info className="h-5 w-5 text-amber-600" />}
              <div>
                <p className="text-sm font-semibold">{status.status_label}</p>
                <p className="text-xs text-muted-foreground">{status.has_integration ? `المزود: ${status.provider || 'meta'}` : 'غير مربوط'}</p>
              </div>
            </div>
            {getBadge()}
          </div>

          {!isConnected && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {status.status_key === 'not_connected' && 'غير مربوط — اضغط "ربط واتساب" لإدخال بيانات Meta الخاصة بك.'}
                {status.status_key === 'incomplete' && 'يحتاج إعداد — أكمل الحقول المطلوبة.'}
                {status.status_key === 'disconnected' && 'غير متصل — اختبر الاتصال.'}
                {status.status_key === 'error' && `خطأ في الاتصال: ${whatsappSettings.integration?.last_error || status.status_label}`}
                {status.status_key === 'disabled' && 'متوقف — فعّل الإشعارات.'}
              </AlertDescription>
            </Alert>
          )}

          {isConnected && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-800">
                WhatsApp Business ✓ متصل — رقم واتساب: {whatsappSettings.business_phone_masked || status.business_phone_masked || '—'} — آخر تحقق: {whatsappSettings.integration?.last_verified_at ? new Date(whatsappSettings.integration.last_verified_at).toLocaleString('ar') : '—'}
              </AlertDescription>
            </Alert>
          )}

          {/* Not connected: show connect button and form */}
          {!hasIntegration || showConnectForm ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="rounded-xl border p-4 space-y-4 bg-white">
                <h3 className="font-semibold flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  ربط واتساب
                </h3>
                <p className="text-xs text-muted-foreground">
                  أدخل بيانات Meta Cloud API الخاصة بمتجرك. التاجر فقط هو من يدخلها — لا تطلب من صاحب منصة Wusool أي credentials.
                  <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-green-700 ms-2">
                    فتح Meta for Developers <ExternalLink className="h-3 w-3" />
                  </a>
                </p>

                <div className="space-y-3">
                  <div>
                    <Label>Access Token <span className="text-red-500">*</span></Label>
                    <Input dir="ltr" type="password" placeholder="EAAGm..." value={data.access_token} onChange={(e) => setData('access_token', e.target.value)} className="text-left" />
                    <p className="text-xs text-muted-foreground mt-1">من Meta → WhatsApp → API Setup → Temporary/Permanent Access Token</p>
                    {whatsappSettings.has_token && <p className="text-xs text-green-600">تم حفظ Access Token ••••</p>}
                    {errors.access_token && <p className="text-sm text-red-600">{errors.access_token}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Phone Number ID <span className="text-red-500">*</span></Label>
                      <Input dir="ltr" placeholder="123456789..." value={data.phone_number_id} onChange={(e) => setData('phone_number_id', e.target.value)} className="text-left" />
                      <p className="text-xs text-muted-foreground mt-1">من API Setup → Phone number ID</p>
                      {errors.phone_number_id && <p className="text-sm text-red-600">{errors.phone_number_id}</p>}
                    </div>
                    <div>
                      <Label>WhatsApp Business Account ID (WABA ID)</Label>
                      <Input dir="ltr" placeholder="987654321..." value={data.waba_id} onChange={(e) => setData('waba_id', e.target.value)} className="text-left" />
                      <p className="text-xs text-muted-foreground mt-1">من Business Settings → WhatsApp Business Account</p>
                    </div>
                  </div>
                  <div>
                    <Label>رقم واتساب التجاري</Label>
                    <Input dir="ltr" placeholder="+970 59 123 4567" value={data.business_phone} onChange={(e) => setData('business_phone', e.target.value)} className="text-left" />
                    <p className="text-xs text-muted-foreground mt-1">رقم الواتساب المرتبط بـ Phone Number ID</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4 space-y-4">
                <h3 className="font-semibold">رقم استقبال إشعارات الطلبات</h3>
                <div>
                  <Label>رقم واتساب لاستقبال الطلبات <span className="text-red-500">*</span></Label>
                  <Input dir="ltr" placeholder="059 123 4567" value={data.notification_phone} onChange={(e) => setData('notification_phone', e.target.value)} className="text-left" />
                  <p className="text-xs text-muted-foreground mt-1">سيتم إرسال إشعارات الطلبات الجديدة إلى هذا الرقم حتى عندما لا تكون داخل لوحة التحكم.</p>
                  {errors.notification_phone && <p className="text-sm text-red-600">{errors.notification_phone}</p>}
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <Label>تفعيل إشعارات الطلبات عبر واتساب</Label>
                    <p className="text-xs text-muted-foreground">سنرسل لك إشعاراً عند وصول طلب جديد</p>
                  </div>
                  <Switch checked={data.is_enabled} onCheckedChange={(v) => setData('is_enabled', v)} />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" disabled={processing} className="gap-2 w-full sm:w-auto">
                  <Save className="h-4 w-4" />
                  حفظ الإعدادات
                </Button>
                <Button type="button" variant="outline" onClick={handleVerify} disabled={verifyLoading} className="gap-2 w-full sm:w-auto">
                  <Shield className="h-4 w-4" />
                  {verifyLoading ? 'جاري التحقق...' : 'اختبار الاتصال'}
                </Button>
              </div>
            </form>
          ) : (
            /* Connected view */
            <div className="space-y-4">
              <div className="rounded-xl border p-4 bg-green-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    WhatsApp Business ✓ متصل
                  </h3>
                  <Badge className="bg-green-600 text-white">متصل</Badge>
                </div>
                <div className="text-sm space-y-1">
                  <p>رقم واتساب: <span dir="ltr" className="font-mono">{whatsappSettings.business_phone || status.business_phone_masked || '—'}</span></p>
                  <p>رقم الاستقبال: <span dir="ltr" className="font-mono">{whatsappSettings.notification_phone_masked || status.number_masked || '—'}</span></p>
                  <p>آخر تحقق: {whatsappSettings.integration?.last_verified_at ? new Date(whatsappSettings.integration.last_verified_at).toLocaleString('ar') : '—'}</p>
                  <p>إشعارات الطلبات: {isEnabled ? 'مفعلة' : 'متوقفة'}</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleTest} disabled={testLoading} variant="outline" className="gap-2 w-full sm:w-auto">
                  <Send className="h-4 w-4" />
                  {testLoading ? 'جاري الإرسال...' : 'إرسال رسالة اختبار'}
                </Button>
                <Button onClick={() => setShowConnectForm(true)} variant="outline" className="gap-2 w-full sm:w-auto">
                  <Link2 className="h-4 w-4" />
                  إدارة الاتصال
                </Button>
                <Button onClick={handleDisconnect} variant="destructive" className="gap-2 w-full sm:w-auto">
                  <Unlink className="h-4 w-4" />
                  فصل واتساب
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-xl border p-3">
                <Label>تفعيل إشعارات الطلبات</Label>
                <Switch
                  checked={data.is_enabled}
                  onCheckedChange={(v) => {
                    setData('is_enabled', v);
                    // Auto save toggle
                    const url = route('stores.notifications.whatsapp.update', resolvedStoreId);
                    // Use fetch to avoid full page reload for toggle
                    fetch(url, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'X-Requested-With': 'XMLHttpRequest',
                      },
                      body: JSON.stringify({ ...data, is_enabled: v }),
                    }).then(() => window.location.reload());
                  }}
                />
              </div>
            </div>
          )}

          <div className="rounded-xl bg-muted p-3 text-xs">
            <p className="font-semibold">ملاحظة أمان:</p>
            <p className="text-muted-foreground">Access Token محفوظ مشفّر ولا يُعرض كاملاً بعد الحفظ. كل متجر معزول تماماً — Store A لا يرى بيانات Store B.</p>
          </div>
        </CardContent>
      </Card>
      </div>
    </PageTemplate>
  );
}
