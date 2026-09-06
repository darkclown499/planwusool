import React, { useMemo, useState, useRef, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
   Save, Mail, Search, Share2, Globe, Link2,
    XCircle, Info, Loader2, Trash2, History, CheckCircle2, PenLine, Paintbrush,
    Boxes, Truck, CreditCard, Store, ShieldCheck, AlertCircle, Image as ImageIcon, ExternalLink, Check, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import MediaPicker from '@/components/MediaPicker';
import { AccordionSection } from '@/components/accordion-section';
import { apiPut, apiPost } from '@/utils/api';
import DesignerNavigationModal from '@/components/DesignerNavigationModal';
import { getImageUrl } from '@/utils/image-helper';

interface Props {
  store: any;
  settings: any;
  storeUrl?: string;
  publishReadiness?: { hasProducts: boolean; hasShipping: boolean; hasPayments: boolean; isReady: boolean; missing: string[] };
}

const LEGACY_SOCIAL_MAP: Record<string, string> = {
  facebook: 'facebook_url',
  instagram: 'instagram_url',
  twitter: 'twitter_url',
  youtube: 'youtube_url',
  whatsapp: 'whatsapp_url',
};

const HelpTip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button type="button" className="inline-flex items-center text-muted-foreground hover:text-foreground">
        <Info className="h-3.5 w-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="top">{text}</TooltipContent>
  </Tooltip>
);

const SectionResetButton = ({ onReset }: { onReset: () => void }) => {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onReset}
      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
    >
      <History className="h-3.5 w-3.5 me-1" />
      {t('Reset')}
    </Button>
  );
};

const GoogleSnippetPreview = ({ title, url, description, favicon }: { title: string; url: string; description: string; favicon?: string }) => {
  const { t } = useTranslation();
  let hostname = '';
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    hostname = url;
  }
  return (
    <div className="rounded-xl border border-border bg-white p-4 sm:p-5" dir="ltr">
      <div className="mb-2 flex items-center gap-2.5">
        {favicon ? (
          <img src={getImageUrl(favicon)} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F1F3F4] text-xs font-medium text-gray-600">
            {hostname?.charAt(0).toUpperCase() || 'S'}
          </div>
        )}
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13px] text-gray-700">{hostname || t('Store Link')}</div>
          <div className="truncate text-[12px] text-gray-500">{url || ''}</div>
        </div>
      </div>
      <h3 className="mb-1 truncate text-xl font-normal leading-snug text-[#1a0dab] hover:underline">
        {title ? title : <span className="font-normal text-gray-400">{t('No meta title set')}</span>}
      </h3>
      <p className="line-clamp-2 text-sm leading-snug text-gray-800">
        {description ? description : <span className="text-gray-400">{t('No meta description set')}</span>}
      </p>
    </div>
  );
};

const SocialPreview = ({ title, description, image, domain, storeName }: { title: string; description: string; image: string; domain: string; storeName: string }) => {
  let hostname = '';
  try {
    hostname = new URL(domain).hostname.replace(/^www\./, '');
  } catch {
    hostname = domain;
  }
  const displayTitle = title || storeName || 'اسم المتجر';
  const displayDesc = description || 'وصف المتجر سيظهر هنا عند مشاركة الرابط...';
  const resolvedImage = image ? getImageUrl(image) : '';
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white" dir="rtl">
      <div className="relative aspect-[1.91/1] w-full overflow-hidden bg-gray-100">
        {resolvedImage ? (
          <img
            src={resolvedImage}
            alt={displayTitle}
            className="h-full w-full object-cover"
            data-testid="social-preview-image"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-50 to-gray-100 p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
              <ImageIcon className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500">لا توجد صورة مشاركة — ستظهر صورة افتراضية عند المشاركة</p>
          </div>
        )}
      </div>
      <div className="border-t bg-[#F0F2F5] p-3 sm:p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{hostname || 'alraed1.wusool.ps'}</div>
        <div className="mt-1 line-clamp-1 text-[15px] font-semibold leading-snug text-[#050505]">{displayTitle}</div>
        <div className="mt-1 line-clamp-2 text-[13px] leading-snug text-[#65676B]">{displayDesc}</div>
      </div>
    </div>
  );
};

function initSocialLinks(s: any): any[] {
  if (Array.isArray(s?.social_links) && s.social_links.length > 0) {
    return s.social_links.map((l: any) => ({ ...l }));
  }
  const legacy: any[] = [];
  Object.entries(LEGACY_SOCIAL_MAP).forEach(([platform, key]) => {
    if (s?.[key]) {
      legacy.push({ platform, url: s[key], enabled: true });
    }
  });
  return legacy;
}

export default function StoreSettings({ store, settings, storeUrl, publishReadiness }: Props) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<any>(settings || {});
  const [socialLinks, setSocialLinks] = useState<any[]>(() => initSocialLinks(settings));
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && ['general','seo'].includes(tab)) return tab;
    }
    return 'general';
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showDiscard, setShowDiscard] = useState(false);
  const [resettingSection, setResettingSection] = useState<string | null>(null);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [showPublishGuard, setShowPublishGuard] = useState(false);
  const [publishGuardMissing, setPublishGuardMissing] = useState<string[]>([]);
  const initialRef = useRef<any>(settings);

  useEffect(() => {
    setFormData(settings);
    setSocialLinks(initSocialLinks(settings));
    setDirty(false);
  }, [settings]);

  const isValidEmail = (value?: string) => {
    if (!value || !value.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!isValidEmail(formData.email)) {
      errors['email'] = t('Enter a valid email address');
    }
    return errors;
  }, [formData, socialLinks]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  const updateSetting = (key: string, value: any) => {
    if (key === 'store_status' && (value === true || value === 'true' || value === 1 || value === '1')) {
      const readiness = publishReadiness;
      if (readiness && !readiness.isReady && readiness.missing?.length) {
        setPublishGuardMissing(readiness.missing);
        setShowPublishGuard(true);
        return;
      }
    }
    setFormData((prev: any) => ({ ...prev, [key]: value }));
    setDirty(true);
    setAutoSaveState('idle');
  };

  const handleSave = () => {
    if (hasErrors || saving) return;
    const enablingNow = formData.store_status === true || formData.store_status === 'true';
    if (enablingNow && publishReadiness && !publishReadiness.isReady && publishReadiness.missing?.length) {
      setPublishGuardMissing(publishReadiness.missing);
      setShowPublishGuard(true);
      return;
    }
    setSaving(true);
    router.put(route('stores.settings.update', store.id), { settings: formData }, {
      preserveScroll: true,
      onFinish: () => {
        setSaving(false);
        setDirty(false);
      },
    });
  };

  useEffect(() => {
    if (!dirty || saving) return;
    const timer = setTimeout(() => {
      setAutoSaveState('saving');
      apiPut(route('stores.settings.autosave', store.id), { settings: formData })
        .then(() => setAutoSaveState('saved'))
        .catch(() => setAutoSaveState('error'));
    }, 1500);
    return () => clearTimeout(timer);
  }, [formData, dirty, saving, store.id]);

  const handleDiscard = () => {
    setFormData(initialRef.current);
    setSocialLinks(initSocialLinks(initialRef.current));
    setDirty(false);
    setAutoSaveState('idle');
    setShowDiscard(false);
  };

  const handleResetSection = (section: string) => {
    if (resettingSection) return;
    setResettingSection(section);
    apiPost(route('stores.settings.reset-section', store.id), { section })
      .catch(() => {})
      .finally(() => {
        setResettingSection(null);
        router.reload();
      });
  };

  const pageActions = [
    {
      label: t('Discard Changes'),
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'outline' as const,
      onClick: () => setShowDiscard(true),
      disabled: !dirty || saving,
    },
    {
      label: saving ? t('Saving...') : t('Save Settings'),
      icon: saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />,
      variant: 'default' as const,
      onClick: handleSave,
      disabled: hasErrors || saving,
    },
  ];

  const maintenanceOn = formData.maintenance_mode === true || formData.maintenance_mode === 'true';
  const storeStatusOn = formData.store_status === true || formData.store_status === 'true';

  const seoPreviewUrl = useMemo(() => {
    // Server-computed canonical URL (Store::getStoreUrl) — includes verified
    // custom domains and the request scheme. Same truth as the store view page.
    if (storeUrl) return storeUrl;
    const domain = store.custom_domain || store.custom_subdomain || '';
    if (domain) {
      return domain.startsWith('http') ? domain : `https://${domain}`;
    }
    try {
      return route('store.home', { storeSlug: store.slug });
    } catch {
      return '';
    }
  }, [storeUrl, store]);

  const isHttps = useMemo(() => {
    try { return new URL(seoPreviewUrl).protocol === 'https:'; } catch { return seoPreviewUrl.startsWith('https://'); }
  }, [seoPreviewUrl]);

  const seoReadiness = useMemo(() => {
    const checks = [
      { id: 'title', label: 'عنوان SEO موجود', done: Boolean((formData.meta_title || '').trim()) },
      { id: 'desc', label: 'وصف SEO موجود', done: Boolean((formData.meta_description || '').trim()) },
      { id: 'og', label: 'صورة مشاركة موجودة', done: Boolean((formData.og_image || '').trim()) },
      { id: 'https', label: 'رابط المتجر يستخدم HTTPS', done: isHttps },
      { id: 'available', label: 'رابط المتجر متاح', done: Boolean(seoPreviewUrl) },
    ];
    const completed = checks.filter(c => c.done).length;
    const total = checks.length;
    let status: 'مكتمل' | 'بحاجة إلى تحسين' | 'غير مكتمل' = 'غير مكتمل';
    if (completed === total) status = 'مكتمل';
    else if (completed >= 3) status = 'بحاجة إلى تحسين';
    return { checks, completed, total, status };
  }, [formData.meta_title, formData.meta_description, formData.og_image, isHttps, seoPreviewUrl]);

  return (
    <PageTemplate
      title="إعدادات المتجر"
      description="الإعدادات العامة للمتجر — الاسم، الحالة، والظهور"
      url={`/stores/${store.id}/settings`}
      actions={pageActions}
      stickyHeader
      backUrl={route('stores.index')}
      breadcrumbs={[
        { title: 'لوحة التحكم', href: route('dashboard') },
        { title: 'إدارة المتجر', href: route('stores.index') },
        { title: 'إعدادات المتجر' },
      ]}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          {autoSaveState === 'saving' && <><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> <span className="text-muted-foreground">{t('Auto-saving draft...')}</span></>}
          {autoSaveState === 'saved' && <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> <span className="text-green-600">{t('Draft saved automatically')}</span></>}
          {autoSaveState === 'error' && <><XCircle className="h-3.5 w-3.5 text-red-500" /> <span className="text-red-500">{t('Auto-save failed, please save manually')}</span></>}
          {dirty && !saving && <span className="text-xs text-muted-foreground">{t('Unsaved changes')}</span>}
        </div>
        <button type="button" onClick={() => setDesignerOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-emerald-700 hover:underline">
          <Paintbrush className="h-3.5 w-3.5" />
          لتخصيص شكل ومحتوى واجهة المتجر، افتح مصمم المتجر
        </button>
      </div>

      {hasErrors && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {t('Please fix the highlighted fields below before saving.')}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto border-b border-border bg-transparent p-0 md:grid md:grid-cols-2">
          <TabsTrigger value="general" className="whitespace-nowrap border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <PenLine className="h-4 w-4 me-2" />
            عامة
          </TabsTrigger>
          <TabsTrigger value="seo" className="whitespace-nowrap border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Search className="h-4 w-4 me-2" />
            {t('SEO')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-6">
          {/* هوية المتجر - read-only info from canonical Store record */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="h-4 w-4 text-emerald-600" />
                هوية المتجر
              </CardTitle>
              <CardDescription className="text-start">الاسم والمعرّف الأساسي للمتجر — يُدار من صفحة المتجر الأساسية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">اسم المتجر</Label>
                  <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm font-medium">{store.name || '—'}</div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">المعرّف (slug)</Label>
                  <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm font-mono ltr" dir="ltr">{store.slug || '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>لتغيير الاسم أو المعرّف، استخدم صفحة <a href={route('stores.edit', store.id)} className="font-semibold underline hover:text-blue-900">إدارة المتجر</a> — نفس البيانات في كل مكان.</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="self-start">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    حالة المتجر
                  </CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResetSection('status')}
                    disabled={resettingSection === 'status'}
                    className="h-7 px-2 text-xs"
                  >
                    <History className="h-3.5 w-3.5 me-1" />
                    {t('Reset')}
                  </Button>
                </div>
                <CardDescription className="text-start">تحكم في توفر المتجر للعملاء ومعاينة وضع الصيانة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Label>{t('Store Status')}</Label>
                      <Badge variant={storeStatusOn ? 'success' : 'outline'} className={storeStatusOn ? 'bg-emerald-600' : ''}>
                        {storeStatusOn ? 'متاح للعملاء' : 'مخفي عن العملاء'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      عند التفعيل يُنشر المتجر ويصبح متاحًا للعملاء عبر رابط المتجر. عند الإيقاف لا يستطيع العملاء تصفح المتجر مع بقاء الإعدادات محفوظة.
                    </p>
                  </div>
                  <Switch
                    checked={storeStatusOn}
                    onCheckedChange={(checked) => updateSetting('store_status', checked)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-1.5">
                    <Label>{t('Maintenance Mode')}</Label>
                    <HelpTip text={t('While enabled, visitors see the maintenance message instead of your store.')} />
                  </div>
                  <Switch
                    checked={maintenanceOn}
                    onCheckedChange={(checked) => updateSetting('maintenance_mode', checked)}
                  />
                </div>
                {maintenanceOn && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                    <Label htmlFor="maintenance_message">{t('Maintenance Message')}</Label>
                    <Textarea
                      id="maintenance_message"
                      value={formData.maintenance_message || ''}
                      onChange={(e) => updateSetting('maintenance_message', e.target.value)}
                      placeholder={t('We are currently performing maintenance. Please check back soon!')}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground text-start">{t('This message will be shown to your visitors during maintenance.')}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="self-start">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4 text-emerald-600" />
                  التواصل
                </CardTitle>
                <CardDescription className="text-start">البريد الأساسي للتواصل وإشعارات المتجر</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t('Contact Email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    className={validationErrors['email'] ? 'border-red-500' : ''}
                    value={formData.email || ''}
                    onChange={(e) => updateSetting('email', e.target.value)}
                    placeholder="contact@yourstore.com"
                  />
                  {validationErrors['email'] && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> {validationErrors['email']}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">نفس البريد المستخدم في إشعارات المتجر — تعديل واحد يكفي.</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 flex items-start gap-2.5">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">رابط المتجر — الرابط الذي يستخدمه العملاء</p>
                    <p className="text-xs text-muted-foreground break-all mt-1 ltr" dir="ltr">{seoPreviewUrl || '—'}</p>
                    <p className="text-xs text-muted-foreground mt-1">متجرك متاح دائمًا على هذا الرابط. لإضافة دومين مخصص (مثل example.com) وربط المتجر به، استخدم صفحة الدومين.</p>
                    <a href={route('stores.domains', store.id)} className="inline-flex items-center gap-1 pt-1.5 text-xs font-medium text-emerald-700 underline-offset-2 hover:underline">
                      <Link2 className="h-3 w-3" />
                      إدارة الدومين (دومين مخصص)
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Right column (RTL): input fields */}
            <Card data-testid="seo-inputs-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      إعدادات الظهور في محركات البحث
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 text-start">
                      هذه البيانات تساعد محركات البحث والزوار على فهم متجرك.
                    </p>
                  </div>
                  <SectionResetButton onReset={() => handleResetSection('seo')} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="meta_title" className="flex items-center gap-1.5">
                    عنوان الظهور في محركات البحث
                    <HelpTip text="العنوان الذي قد يظهر في نتائج البحث." />
                  </Label>
                  <Input
                    id="meta_title"
                    value={formData.meta_title || ''}
                    onChange={(e) => updateSetting('meta_title', e.target.value)}
                    placeholder="مثال: الرائد للعطور والهدايا — أفضل العطور في فلسطين"
                    maxLength={100}
                  />
                  <div className={`text-xs mt-1 ${(formData.meta_title?.length || 0) > 70 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                    {formData.meta_title?.length || 0}/70 {t('characters')}
                    {(formData.meta_title?.length || 0) > 70 && ` — ${t('Exceeds recommended limit')}`}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">قد يظهر مقتطعًا في النتائج، لكن النص الكامل يبقى محفوظًا.</p>
                </div>
                <div>
                  <Label htmlFor="meta_description" className="flex items-center gap-1.5">
                    وصف المتجر لمحركات البحث
                    <HelpTip text="قد تستخدمه محركات البحث لعرض وصف مختصر في النتيجة." />
                  </Label>
                  <Textarea
                    id="meta_description"
                    value={formData.meta_description || ''}
                    onChange={(e) => updateSetting('meta_description', e.target.value)}
                    placeholder="وصف مختصر يساعد الزائر على فهم متجرك من نتيجة البحث..."
                    rows={4}
                    maxLength={200}
                  />
                  <div className={`text-xs mt-1 ${(formData.meta_description?.length || 0) > 160 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                    {formData.meta_description?.length || 0}/160 {t('characters')}
                    {(formData.meta_description?.length || 0) > 160 && ` — ${t('Exceeds recommended limit')}`}
                  </div>
                </div>
                <div>
                  <Label htmlFor="meta_keywords" className="flex items-center gap-1.5">
                    كلمات مفتاحية (اختياري)
                    <HelpTip text="افصل بينها بفواصل. تأثيرها محدود في محركات البحث الحديثة." />
                  </Label>
                  <Input
                    id="meta_keywords"
                    value={formData.meta_keywords || ''}
                    onChange={(e) => updateSetting('meta_keywords', e.target.value)}
                    placeholder="عطور, هدايا, فلسطين"
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground mt-1">اختياري — لا يؤثر كثيرًا على الترتيب حاليًا.</p>
                </div>
                <div className="pt-2 space-y-2">
                  <MediaPicker
                    label="صورة المشاركة (Open Graph)"
                    value={formData.og_image || ''}
                    onChange={(value) => updateSetting('og_image', value)}
                    placeholder={t('Select image for social media sharing...')}
                    dragDrop
                  />
                  <p className="text-xs text-muted-foreground">
                    الصورة التي قد تظهر عند مشاركة رابط متجرك.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    يفضل استخدام صورة أفقية بنسبة مناسبة للمشاركة (مقترح 1200×630). لا نرفض أي صورة صالحة بسبب الأبعاد فقط.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Left column (RTL): live previews stacked */}
            <div className="space-y-6 self-start lg:sticky lg:top-20">
              <Card data-testid="google-preview-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Search className="h-4 w-4" />
                    معاينة Google
                  </CardTitle>
                  <CardDescription className="text-start">
                    معاينة تقريبية لكيف قد يظهر رابط متجرك في نتائج البحث.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GoogleSnippetPreview
                    title={formData.meta_title || store.name}
                    url={seoPreviewUrl}
                    description={formData.meta_description || formData.store_description || ''}
                    favicon={formData.favicon || settings?.favicon || ''}
                  />
                  <p className="text-xs text-muted-foreground mt-3 text-start">قد تستخدم محركات البحث عنوانًا أو وصفًا مختلفًا أحيانًا.</p>
                </CardContent>
              </Card>

              <Card data-testid="social-preview-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Share2 className="h-4 w-4" />
                    معاينة المشاركة — Facebook وWhatsApp
                  </CardTitle>
                  <CardDescription className="text-start">
                    معاينة تقريبية لكيف قد يظهر رابط متجرك عند المشاركة.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SocialPreview
                    title={formData.meta_title || store.name}
                    description={formData.meta_description || formData.store_description || ''}
                    image={formData.og_image || ''}
                    domain={seoPreviewUrl}
                    storeName={store.name}
                  />
                  <p className="text-xs text-muted-foreground mt-3 text-start">الصورة تتحدث فور اختيارها — قبل الحفظ.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* SEO Readiness + Canonical row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card data-testid="seo-readiness-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    حالة تجهيز المتجر لمحركات البحث
                  </CardTitle>
                  <Badge variant={seoReadiness.status === 'مكتمل' ? 'default' : seoReadiness.status === 'بحاجة إلى تحسين' ? 'secondary' : 'outline'} className={seoReadiness.status === 'مكتمل' ? 'bg-emerald-600' : ''}>
                    {seoReadiness.status}
                  </Badge>
                </div>
                <CardDescription className="text-start">
                  {seoReadiness.completed} من {seoReadiness.total} مكتمل — إعدادات Wusool جاهزة، لا يعني تصدر Google.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {seoReadiness.checks.map((c) => (
                  <div key={c.id} className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5" data-testid={`readiness-${c.id}`}>
                    {c.done ? <Check className="h-4 w-4 text-emerald-600 shrink-0" /> : <X className="h-4 w-4 text-gray-400 shrink-0" />}
                    <span className={`text-sm ${c.done ? 'text-gray-900' : 'text-gray-500'}`}>{c.label}</span>
                    <span className="ms-auto text-xs">
                      {c.done ? <span className="text-emerald-600 font-medium">مكتمل</span> : <span className="text-gray-400">غير مكتمل</span>}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2 text-start">
                  الجاهزية تعني اكتمال إعدادات وصول — لا تعني ترتيبًا في Google أو موافقة محرك بحث.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="canonical-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4 text-emerald-600" />
                  الرابط الأساسي للمتجر
                </CardTitle>
                <CardDescription className="text-start">Canonical URL — نفس المنطق المستخدم في واجهة المتجر</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Globe className="h-3.5 w-3.5" />
                    الرابط الأساسي
                  </div>
                  <div className="text-sm font-mono break-all ltr" dir="ltr" data-testid="canonical-url">{seoPreviewUrl || '—'}</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {isHttps ? <Badge className="bg-emerald-600">HTTPS ✓</Badge> : <Badge variant="outline" className="border-amber-300 text-amber-700">غير HTTPS</Badge>}
                  <span className="text-muted-foreground">{isHttps ? 'الرابط يستخدم HTTPS' : 'يُنصح بتفعيل HTTPS'}</span>
                </div>
                <div className="rounded-lg bg-gray-50 border p-3 space-y-1">
                  <p className="text-xs font-medium">معلومات إضافية</p>
                  <p className="text-xs text-muted-foreground">خريطة الموقع: <span className="font-mono">/sitemap.xml</span> — متاحة ومولدة تلقائيًا</p>
                  <p className="text-xs text-muted-foreground">robots.txt — متاح مع قواعد منع صفحات الإدارة والبحث</p>
                  <p className="text-xs text-muted-foreground">لا يوجد تحكم index/noindex يدوي في هذه المرحلة — يُدار تلقائيًا حسب الصفحة.</p>
                </div>
                <p className="text-xs text-muted-foreground">يستخدم نفس منطق Store::getStoreUrl() و storeDomains() الكنسي.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showDiscard} onOpenChange={setShowDiscard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Discard Changes?')}</DialogTitle>
            <DialogDescription>
              {t('All unsaved changes will be lost. This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscard(false)}>{t('Cancel')}</Button>
            <Button variant="destructive" onClick={handleDiscard}>{t('Discard Changes')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPublishGuard} onOpenChange={setShowPublishGuard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <XCircle className="h-5 w-5 text-amber-600" />
              المتجر غير جاهز للنشر
            </DialogTitle>
            <DialogDescription className="text-start">
              يرجى إكمال الإعدادات التالية قبل تفعيل المتجر:
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1 ps-5 text-sm font-medium text-amber-800">
            {publishGuardMissing.map((m, i) => <li key={i}>{m === 'المنتجات' ? 'لم يتم إضافة المنتجات' : m === 'الشحن والتوصيل' ? 'لم يتم إعداد الشحن والتوصيل' : m === 'طرق الدفع' ? 'لم يتم إعداد الدفع' : m}</li>)}
          </ul>
          <div className="flex flex-wrap gap-2 pt-2">
            {publishGuardMissing.includes('الشحن والتوصيل') && <Button variant="outline" size="sm" className="gap-1.5 border-amber-300" onClick={() => { setShowPublishGuard(false); router.visit(`/stores/${store.id}/shipping`); }}><Truck className="h-4 w-4" /> إعداد الشحن</Button>}
            {publishGuardMissing.includes('طرق الدفع') && <Button variant="outline" size="sm" className="gap-1.5 border-amber-300" onClick={() => { setShowPublishGuard(false); router.visit(`/stores/${store.id}/payments`); }}><CreditCard className="h-4 w-4" /> إعداد الدفع</Button>}
            {publishGuardMissing.includes('المنتجات') && <Button variant="outline" size="sm" className="gap-1.5 border-amber-300" onClick={() => router.visit(route('products.create'))}><Boxes className="h-4 w-4" /> إضافة منتجات</Button>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishGuard(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DesignerNavigationModal open={designerOpen} onOpenChange={setDesignerOpen} storeId={store.id} />
    </PageTemplate>
  );
}
