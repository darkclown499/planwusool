import React, { useEffect, useState } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
  Save, Loader2, CheckCircle2, XCircle, Info, BarChart3, Music2, Facebook,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';

interface Props {
  store: any;
  settings: any;
}

const META_RE = /^\d{10,20}$/;
const TIKTOK_RE = /^[A-Za-z0-9]{16,24}$/;
const GA4_RE = /^(G-|GT-)[A-Za-z0-9-]{4,}$/;

interface TrackingField {
  key: 'google_analytics_id' | 'meta_pixel_id' | 'tiktok_pixel_id';
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  placeholder: string;
  validate: (v: string) => boolean;
  hint: string;
}

export default function StoreMarketingPage({ store, settings }: Props) {
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
      title: t('Meta Pixel'),
      description: 'متابعة زوار المتجر وإعادة الاستهداف عبر فيسبوك وإنستغرام.',
      placeholder: 'مثال: 123456789012345',
      validate: (v) => v.trim() === '' || META_RE.test(v.trim()),
      hint: '10-20 رقم فقط — من إعدادات Meta Events Manager',
    },
    {
      key: 'tiktok_pixel_id',
      id: 'tiktok_pixel_id',
      icon: <Music2 className="h-9 w-9 text-black" />,
      title: t('TikTok Pixel'),
      description: 'قياس الحملات والتحويلات عبر تطبيق تيك توك.',
      placeholder: 'مثال: CVR12345ABCDEFG',
      validate: (v) => v.trim() === '' || TIKTOK_RE.test(v.trim()),
      hint: '16-24 حرفاً/رقماً — يُحفظ بأحرف كبيرة تلقائياً',
    },
    {
      key: 'google_analytics_id',
      id: 'google_analytics_id',
      icon: <BarChart3 className="h-9 w-9 text-[#EA4335]" />,
      title: t('Google Analytics'),
      description: 'تحليل سلوك الزوار في تقرير Google Analytics 4.',
      placeholder: 'مثال: G-ABCDE12345',
      validate: (v) => v.trim() === '' || GA4_RE.test(v.trim()),
      hint: 'يبدأ بـ G- أو GT- (مثل G-XXXXXXXXXX)',
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

  const connected = (value: string) => Boolean(value && value.trim());

  return (
    <PageTemplate
      title="التسويق والتتبع"
      description="اربط بكسلات الإعلانات لتتبّع التحويلات وقياس أداء حملاتك"
      url={`/stores/${store.id}/marketing`}
      actions={pageActions}
      stickyHeader
      backUrl={route('stores.index')}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'إدارة المتجر', href: route('stores.index') },
        { title: 'التسويق والتتبع' },
      ]}
    >
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{t('Your store sends conversion, page-view, product-view and search events to the connected advertising pixels. Events include the selected currency, product IDs and order numbers for accurate ad attribution.')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => {
          const value = form[field.key];
          const isConnected = connected(value);
          const error = errors[field.key];
          return (
            <Card key={field.id} className="overflow-hidden">
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                  {field.icon}
                  <div>
                    <CardTitle className="text-base">{field.title}</CardTitle>
                    <CardDescription className="mt-1 leading-relaxed">{field.description}</CardDescription>
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {isConnected ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      {t('connected')}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      {t('not set')}
                    </>
                  )}
                </span>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor={field.id} className="text-xs font-semibold text-muted-foreground">
                  {t('Pixel ID')}
                </Label>
                <Input
                  id={field.id}
                  dir="ltr"
                  value={value}
                  disabled={saving}
                  placeholder={field.placeholder}
                  onChange={(e) => handleChange(field, e.target.value)}
                  className={error ? 'border-red-400 focus-visible:ring-red-400' : ''}
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
    </PageTemplate>
  );
}