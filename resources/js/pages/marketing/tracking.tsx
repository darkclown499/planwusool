import React, { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
  Save, Loader2, CheckCircle2, MinusCircle, Info, BarChart3, Music2, Facebook, ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { Badge } from '@/components/ui/badge';

interface Props {
  store: any;
  settings: any;
}

const META_RE = /^\d{10,20}$/;
const TIKTOK_RE = /^[A-Za-z0-9]{16,24}$/;
const GA4_RE = /^(G-|GT-|UA-|AW-|DC-|YT-)[A-Za-z0-9-]{4,}$/;

interface TrackingField {
  key: 'google_analytics_id' | 'meta_pixel_id' | 'tiktok_pixel_id';
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  placeholder: string;
  label: string;
  validate: (v: string) => boolean;
  hint: string;
}

export default function MarketingTrackingPage({ store, settings }: Props) {
  const { t } = useTranslation();

  const [form, setForm] = useState<Record<'google_analytics_id' | 'meta_pixel_id' | 'tiktok_pixel_id', string>>({
    google_analytics_id: settings?.google_analytics_id || '',
    meta_pixel_id: settings?.meta_pixel_id || '',
    tiktok_pixel_id: settings?.tiktok_pixel_id || '',
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fields: TrackingField[] = [
    {
      key: 'meta_pixel_id',
      id: 'meta_pixel_id',
      icon: <Facebook className="h-9 w-9 text-[#1877F2]" />,
      title: 'Meta Pixel',
      description: 'يساعدك على قياس زيارات المتجر والتحويلات عند استخدام إعلانات Meta.',
      placeholder: 'مثال: 123456789012345',
      label: 'معرّف Meta Pixel',
      validate: (v) => v.trim() === '' || META_RE.test(v.trim()),
      hint: '10-20 رقم فقط — من إعدادات Meta Events Manager',
    },
    {
      key: 'tiktok_pixel_id',
      id: 'tiktok_pixel_id',
      icon: <Music2 className="h-9 w-9 text-black dark:text-white" />,
      title: 'TikTok Pixel',
      description: 'يساعدك على قياس أداء الحملات والتحويلات من TikTok.',
      placeholder: 'مثال: CEXAMPLE1234ABCD',
      label: 'معرّف TikTok Pixel',
      validate: (v) => v.trim() === '' || TIKTOK_RE.test(v.trim()),
      hint: '16-24 حرفاً/رقماً — يُحفظ بأحرف كبيرة تلقائياً',
    },
    {
      key: 'google_analytics_id',
      id: 'google_analytics_id',
      icon: <BarChart3 className="h-9 w-9 text-[#EA4335]" />,
      title: 'Google Analytics',
      description: 'تابع زيارات وسلوك مستخدمي متجرك عبر Google Analytics 4.',
      placeholder: 'مثال: G-XXXXXXXXXX',
      label: 'Measurement ID',
      validate: (v) => v.trim() === '' || GA4_RE.test(v.trim()),
      hint: 'يبدأ بـ G- (مثل G-XXXXXXXXXX) — GA4 فقط',
    },
  ];

  useEffect(() => {
    setForm({
      google_analytics_id: settings?.google_analytics_id || '',
      meta_pixel_id: settings?.meta_pixel_id || '',
      tiktok_pixel_id: settings?.tiktok_pixel_id || '',
    });
    setDirty(false);
  }, [settings?.google_analytics_id, settings?.meta_pixel_id, settings?.tiktok_pixel_id]);

  const handleChange = (field: TrackingField, value: string) => {
    const next = { ...form, [field.key]: value };
    setForm(next);
    setDirty(true);
    setErrors((prev) => {
      const copy = { ...prev };
      if (!field.validate(value)) {
        copy[field.key] = t('Invalid ID');
      } else {
        delete copy[field.key];
      }
      return copy;
    });
  };

  const hasErrors = Object.keys(errors).length > 0;

  const handleSave = () => {
    if (hasErrors || saving) return;
    setSaving(true);
    router.put(
      route('stores.settings.update', store.id),
      {
        settings: {
          google_analytics_id: form.google_analytics_id.trim(),
          meta_pixel_id: form.meta_pixel_id.trim(),
          tiktok_pixel_id: form.tiktok_pixel_id.trim(),
        },
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success(t('Changes saved successfully'));
          setDirty(false);
        },
        onError: () => {
          toast.error(t('Error saving changes'));
        },
        onFinish: () => setSaving(false),
      },
    );
  };

  const pageActions = [
    {
      label: saving ? t('Saving...') : t('Save Changes'),
      icon: saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: handleSave,
      disabled: hasErrors || saving || !dirty,
    },
  ];

  const isConfigured = (value: string) => Boolean(value && value.trim());

  return (
    <PageTemplate
      title="التتبع والإعلانات"
      description="اربط أدوات القياس الإعلاني والتحليلات بمتجرك لمتابعة الزيارات والتحويلات."
      url={`/stores/${store.id}/tracking`}
      actions={pageActions}
      stickyHeader
      backUrl={route('stores.index')}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'التسويق', href: route('coupon-system.index') },
        { title: 'التتبع والإعلانات' },
      ]}
    >
      {/* Status overview */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">أدوات القياس</CardTitle>
          <CardDescription className="text-xs">حالة إعداد أدوات التتبع في متجرك — "تم الإعداد" يعني وجود معرّف صالح محفوظ.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5">
              <span className="text-sm font-medium">Meta Pixel</span>
              <Badge variant={isConfigured(form.meta_pixel_id) ? 'default' : 'secondary'} className={isConfigured(form.meta_pixel_id) ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                {isConfigured(form.meta_pixel_id) ? 'تم الإعداد' : 'غير مضاف'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5">
              <span className="text-sm font-medium">TikTok Pixel</span>
              <Badge variant={isConfigured(form.tiktok_pixel_id) ? 'default' : 'secondary'} className={isConfigured(form.tiktok_pixel_id) ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                {isConfigured(form.tiktok_pixel_id) ? 'تم الإعداد' : 'غير مضاف'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5">
              <span className="text-sm font-medium">Google Analytics</span>
              <Badge variant={isConfigured(form.google_analytics_id) ? 'default' : 'secondary'} className={isConfigured(form.google_analytics_id) ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
                {isConfigured(form.google_analytics_id) ? 'تم الإعداد' : 'غير مضاف'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capability intro */}
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>يرسل متجرك أحداث التحويل ومشاهدة الصفحات والمنتجات والبحث إلى بكسلات الإعلانات المتصلة. تشمل الأحداث العملة المحددة ومعرّفات المنتجات وأرقام الطلبات لقياس دقيق لأداء الإعلانات. جميع الحقول اختيارية — استخدمها فقط إذا كنت تعتمد على هذه المنصات الإعلانية.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => {
          const value = form[field.key];
          const configured = isConfigured(value);
          const error = errors[field.key];
          return (
            <Card key={field.id} className="overflow-hidden flex flex-col">
              <CardHeader className="flex-row items-start justify-between space-y-0 gap-2">
                <div className="flex items-start gap-3">
                  {field.icon}
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {field.title}
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">اختياري</span>
                    </CardTitle>
                    <CardDescription className="mt-1 leading-relaxed text-xs">{field.description}</CardDescription>
                    <p className="mt-1 text-[11px] text-muted-foreground">استخدمه فقط إذا كنت تعتمد على هذه المنصة الإعلانية.</p>
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    configured ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {configured ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      تم الإعداد
                    </>
                  ) : (
                    <>
                      <MinusCircle className="h-3 w-3" />
                      غير مضاف
                    </>
                  )}
                </span>
              </CardHeader>
              <CardContent className="space-y-2 flex-1">
                <Label htmlFor={field.id} className="text-xs font-semibold text-muted-foreground">
                  {field.label}
                </Label>
                <Input
                  id={field.id}
                  dir="ltr"
                  value={value}
                  disabled={saving}
                  placeholder={field.placeholder}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className={error ? 'border-red-400 focus-visible:ring-red-400' : ''}
                  data-testid={`tracking-${field.key}`}
                />
                {error ? (
                  <p className="text-xs font-semibold text-red-600">{error}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Privacy note */}
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        ملاحظة: يتم تحميل بكسلات التتبع مباشرة في واجهة المتجر عند وجود معرّف صالح. لا يتم حالياً تطبيق بوابة موافقة الزوار قبل التحميل.
      </p>
    </PageTemplate>
  );
}
