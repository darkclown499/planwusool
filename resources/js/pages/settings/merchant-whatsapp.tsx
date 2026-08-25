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
import { MessageCircle, CheckCircle2, AlertCircle, Send, Save, Info } from 'lucide-react';

interface WhatsappSettings {
  is_enabled: boolean;
  whatsapp_number: string;
  whatsapp_number_normalized: string | null;
  whatsapp_number_masked: string;
  status: {
    is_enabled: boolean;
    has_number: boolean;
    number_normalized: string | null;
    number_masked: string;
    provider: string | null;
    provider_status: string;
    status: string;
    status_key: string;
    status_label: string;
    badge: string;
    is_ready: boolean;
  };
}

interface Props {
  whatsappSettings: WhatsappSettings;
  providerConfigured: boolean;
  providerStatus: string;
}

export default function MerchantWhatsapp({ whatsappSettings, providerConfigured, providerStatus }: Props) {
  const { props } = usePage<any>();
  const storeId = props.store?.id || props.storeId || window.location.pathname.match(/stores\/(\d+)/)?.[1];

  const { data, setData, put, processing, errors } = useForm({
    is_whatsapp_enabled: whatsappSettings.is_enabled || false,
    whatsapp_number: whatsappSettings.whatsapp_number || '',
  });

  const [testLoading, setTestLoading] = useState(false);
  const status = whatsappSettings.status;

  const getBadgeVariant = (badge: string) => {
    if (badge === 'green') return 'default';
    if (badge === 'amber') return 'secondary';
    return 'outline';
  };

  const getStatusIcon = () => {
    if (status.status_key === 'ready') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status.status_key === 'no_number') return <AlertCircle className="h-4 w-4 text-gray-400" />;
    return <Info className="h-4 w-4 text-amber-600" />;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = storeId
      ? route('stores.notifications.whatsapp.update', storeId)
      : route('stores.notifications.whatsapp.update', 1);
    put(url, {
      onSuccess: () => toast.success('تم حفظ إعدادات واتساب بنجاح'),
      onError: () => toast.error('تعذر حفظ الإعدادات'),
    });
  };

  const handleTest = async () => {
    setTestLoading(true);
    try {
      const url = storeId
        ? route('stores.notifications.whatsapp.test', storeId)
        : route('stores.notifications.whatsapp.test', 1);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || 'تم إرسال رسالة الاختبار');
      } else {
        toast.error(data.message || 'تعذر إرسال رسالة الاختبار');
      }
    } catch {
      toast.error('تعذر إرسال رسالة الاختبار');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">إشعارات الطلبات</h1>
        <p className="text-sm text-muted-foreground mt-1">استقبل إشعاراً على واتساب فور وصول طلب جديد إلى متجرك.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            إشعارات واتساب
          </CardTitle>
          <CardDescription>استقبل إشعاراً على واتساب فور وصول طلب جديد إلى متجرك — يعمل حتى عندما لا تكون داخل لوحة التحكم.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <span className="text-sm font-medium">{status.status_label}</span>
            </div>
            <Badge variant={getBadgeVariant(status.badge) as any} className={status.badge === 'green' ? 'bg-green-600 text-white' : ''}>
              {status.status_key === 'ready' ? 'مفعّل' : status.status_key === 'no_number' ? 'غير مضبوط' : status.status_key === 'not_enabled' ? 'متوقف' : 'محدود'}
            </Badge>
          </div>

          {!status.is_ready && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {status.status_key === 'no_number' && 'لم يتم إضافة رقم واتساب'}
                {status.status_key === 'not_enabled' && 'إشعارات واتساب غير مفعلة'}
                {status.status_key === 'no_provider' && 'خدمة واتساب غير متاحة حالياً (لم يتم تكوين المزود من قبل المنصة)'}
                {status.status_key === 'incomplete_config' && 'إعداد خدمة واتساب غير مكتمل (تواصل مع الدعم)'}
              </AlertDescription>
            </Alert>
          )}

          {status.is_ready && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-green-800">إشعارات واتساب مفعلة — سيصلك إشعار عند كل طلب جديد</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <Label htmlFor="is_whatsapp_enabled" className="text-sm font-semibold">تفعيل إشعارات الطلبات عبر واتساب</Label>
                <p className="text-xs text-muted-foreground">سنرسل لك إشعاراً على واتساب عند وصول طلب جديد</p>
              </div>
              <Switch
                id="is_whatsapp_enabled"
                checked={data.is_whatsapp_enabled}
                onCheckedChange={(v) => setData('is_whatsapp_enabled', v)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp_number">رقم واتساب لاستقبال الطلبات</Label>
              <Input
                id="whatsapp_number"
                dir="ltr"
                placeholder="059 123 4567"
                value={data.whatsapp_number}
                onChange={(e) => setData('whatsapp_number', e.target.value)}
                className="text-left"
              />
              {errors.whatsapp_number && <p className="text-sm text-red-600">{errors.whatsapp_number}</p>}
              <p className="text-xs text-muted-foreground">سيتم إرسال إشعارات الطلبات الجديدة إلى هذا الرقم حتى عندما لا تكون داخل لوحة التحكم.</p>
              <p className="text-xs text-muted-foreground">مثال: 0591234567 أو +970591234567 — سيتم التحويل تلقائياً إلى E.164</p>
              {whatsappSettings.whatsapp_number_masked && (
                <p className="text-xs text-muted-foreground">الرقم المحفوظ: {whatsappSettings.whatsapp_number_masked}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" disabled={processing} className="gap-2 w-full sm:w-auto">
                <Save className="h-4 w-4" />
                حفظ الإعدادات
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testLoading || !status.has_number || !status.is_ready}
                className="gap-2 w-full sm:w-auto"
                title={!status.is_ready ? status.status_label : undefined}
              >
                <Send className="h-4 w-4" />
                {testLoading ? 'جاري الإرسال...' : 'إرسال رسالة اختبار'}
              </Button>
            </div>
            {!status.is_ready && status.has_number && (
              <p className="text-xs text-amber-600">خدمة إشعارات واتساب غير متاحة حالياً — يمكنك حفظ الرقم وتفعيله، وسيتم الإرسال تلقائياً عند توفر المزود.</p>
            )}
          </form>

          <div className="rounded-xl bg-muted p-4 text-xs space-y-1">
            <p className="font-semibold">حالة الخدمة:</p>
            <p>المزود: {status.provider || 'غير مضبوط'} ({providerStatus})</p>
            <p>الرقم: {status.number_masked || '—'}</p>
            <p className="text-muted-foreground">التاجر لا يحتاج لإدخال API — بيانات المزود محفوظة على مستوى المنصة في .env</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
