import React, { useMemo, useState, useRef, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
   Save, Mail, Globe, Search,
   XCircle, Info, Loader2, Trash2, Palette, History, CheckCircle2, Building2, PenLine, Power, Paintbrush,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import MediaPicker from '@/components/MediaPicker';
import { AccordionSection } from '@/components/accordion-section';
import { apiPut, apiPost } from '@/utils/api';
import DomainsTab from './components/domains-tab';

interface Props {
  store: any;
  settings: any;
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
          <img src={favicon} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
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

export default function StoreSettings({ store, settings }: Props) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<any>(settings || {});
  const [socialLinks, setSocialLinks] = useState<any[]>(() => initSocialLinks(settings));
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.search.includes('tab=seo')) {
        return 'seo';
      }
      if (window.location.search.includes('tab=domains')) {
        return 'domains';
      }
    }
    return 'general';
  });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showDiscard, setShowDiscard] = useState(false);
  const [resettingSection, setResettingSection] = useState<string | null>(null);
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
    setFormData((prev: any) => ({ ...prev, [key]: value }));
    setDirty(true);
    setAutoSaveState('idle');
  };

  const handleSave = () => {
    if (hasErrors || saving) return;
    setSaving(true);
    router.put(route('stores.settings.update', store.id), { settings: formData }, {
      preserveScroll: true,
      onFinish: () => {
        setSaving(false);
        setDirty(false);
      },
    });
  };

  // Auto-save draft in background (debounced)
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
    const domain = store.custom_domain || store.custom_subdomain || '';
    if (domain) {
      return domain.startsWith('http') ? domain : `https://${domain}`;
    }
    try {
      return route('store.home', { storeSlug: store.slug });
    } catch {
      return '';
    }
  }, [store]);

  return (
    <PageTemplate
      title={t('Store Settings')}
      url="/stores/settings"
      actions={pageActions}
      stickyHeader
      backUrl={route('stores.index')}
      breadcrumbs={[
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Store Management'), href: route('stores.index') },
        { title: t('Store Settings') },
      ]}
    >
<div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          {autoSaveState === 'saving' && <><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> <span className="text-muted-foreground">{t('Auto-saving draft...')}</span></>}
          {autoSaveState === 'saved' && <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> <span className="text-green-600">{t('Draft saved automatically')}</span></>}
          {autoSaveState === 'error' && <><XCircle className="h-3.5 w-3.5 text-red-500" /> <span className="text-red-500">{t('Auto-save failed, please save manually')}</span></>}
          {dirty && !saving && <span className="text-xs text-muted-foreground">{t('Unsaved changes')}</span>}
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => router.visit(`/stores/${store.id}/features`)}>
          <Power className="h-3.5 w-3.5" />
          الميزات
        </Button>
      </div>

      {hasErrors && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {t('Please fix the highlighted fields below before saving.')}
        </div>
      )}

      {/* Visual designer callout — replaces the legacy template tab */}
      <Card className="mb-5 border-emerald-200 bg-gradient-to-l from-emerald-50 via-white to-white">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
              <Paintbrush className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">تصميم وتنسيق المتجر</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                خصص قالبك، الألوان، البانرات، وترتيب السيكشنات عبر المحرر البصري الحي.
              </p>
            </div>
          </div>
          <Button type="button" size="lg" className="shrink-0 gap-2" onClick={() => router.visit(`/stores/${store.id}/designer`)}>
            <Paintbrush className="h-4 w-4" />
            افتح المصمم البصري
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 border-b border-border bg-transparent p-0">
          <TabsTrigger value="general" className="border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <PenLine className="h-4 w-4 me-2" />
            {t('General')}
          </TabsTrigger>
          <TabsTrigger value="seo" className="border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Search className="h-4 w-4 me-2" />
            {t('SEO')}
          </TabsTrigger>
          <TabsTrigger value="domains" className="border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Globe className="h-4 w-4 me-2" />
            {t('Domains')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 mt-6">
          <AccordionSection
            title={t('General Settings')}
            icon={<PenLine className="h-4 w-4" />}
            defaultOpen
            onReset={() => handleResetSection('status')}
            resetDisabled={resettingSection === 'status'}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('Store Status')}</Label>
                  <p className="text-sm text-muted-foreground">{t('Enable or disable store')}</p>
                </div>
                <Switch
                  checked={storeStatusOn}
                  onCheckedChange={(checked) => updateSetting('store_status', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
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
            </div>
          </AccordionSection>

          <AccordionSection
            title={t('Store Branding')}
            icon={<Palette className="h-4 w-4" />}
            subtitle={t('Upload your logo and favicon. You can drag & drop an image directly.')}
            onReset={() => handleResetSection('branding')}
            resetDisabled={resettingSection === 'branding'}
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <MediaPicker
                  label={t('Store Logo')}
                  value={formData.logo || ''}
                  onChange={(value) => updateSetting('logo', value)}
                  placeholder={t('Select store logo...')}
                  dropzoneLabel={t('Upload store logo (PNG/SVG)')}
                  dragDrop
                />
              </div>
              <div>
                <MediaPicker
                  label={t('Store Favicon')}
                  value={formData.favicon || ''}
                  onChange={(value) => updateSetting('favicon', value)}
                  placeholder={t('Select store favicon...')}
                  dropzoneLabel={t('Upload store icon / Favicon (32x32)')}
                  dragDrop
                />
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            title={t('Store Homepage Content')}
            icon={<Building2 className="h-4 w-4" />}
            onReset={() => handleResetSection('homepage')}
            resetDisabled={resettingSection === 'homepage'}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="welcome_message">{t('Welcome Message')}</Label>
                <Input
                  id="welcome_message"
                  value={formData.welcome_message || ''}
                  onChange={(e) => updateSetting('welcome_message', e.target.value)}
                  placeholder={t('Welcome to our store!')}
                />
              </div>
              <div>
                <Label htmlFor="store_description">{t('Store Description')}</Label>
                <Textarea
                  id="store_description"
                  value={formData.store_description || ''}
                  onChange={(e) => updateSetting('store_description', e.target.value)}
                  placeholder={t('Brief description of your store...')}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="copyright_text">{t('Copyright Text')}</Label>
                <Input
                  id="copyright_text"
                  value={formData.copyright_text || ''}
                  onChange={(e) => updateSetting('copyright_text', e.target.value)}
                  placeholder={t('© 2026 Your Store Name. All rights reserved.')}
                />
              </div>
            </div>
          </AccordionSection>

          <Card>
            <CardContent className="flex items-start gap-3 pt-5">
              <div className="mt-0.5">
                <Mail className="h-4 w-4 text-gray-600" />
              </div>
              <div className="flex-1">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo" className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Right column (RTL): input fields */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      {t('SEO Settings')}
                      <HelpTip text={t('These meta tags help search engines understand and rank your store.')} />
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 text-start">
                      {t('Improve your store visibility in search engines with these settings.')}
                    </p>
                  </div>
                  <SectionResetButton onReset={() => handleResetSection('seo')} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="meta_title" className="flex items-center gap-1.5">
                    {t('Meta Title')}
                    <HelpTip text={t('Keep it under 70 characters for best search engine display.')} />
                  </Label>
                  <Input
                    id="meta_title"
                    value={formData.meta_title || ''}
                    onChange={(e) => updateSetting('meta_title', e.target.value)}
                    placeholder={t('Your Store Name - Best Products Online')}
                    maxLength={100}
                  />
                  <div className={`text-xs mt-1 ${(formData.meta_title?.length || 0) > 70 ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                    {formData.meta_title?.length || 0}/70 {t('characters')}
                    {(formData.meta_title?.length || 0) > 70 && ` — ${t('Exceeds recommended limit')}`}
                  </div>
                </div>
                <div>
                  <Label htmlFor="meta_description" className="flex items-center gap-1.5">
                    {t('Meta Description')}
                    <HelpTip text={t('Keep it under 160 characters for best search engine display.')} />
                  </Label>
                  <Textarea
                    id="meta_description"
                    value={formData.meta_description || ''}
                    onChange={(e) => updateSetting('meta_description', e.target.value)}
                    placeholder={t('A short description that appears in search engine results...')}
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
                    {t('Meta Keywords')}
                    <HelpTip text={t('Separate keywords with commas')} />
                  </Label>
                  <Input
                    id="meta_keywords"
                    value={formData.meta_keywords || ''}
                    onChange={(e) => updateSetting('meta_keywords', e.target.value)}
                    placeholder={t('store, online store, products')}
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('Separate keywords with commas')}</p>
                </div>
                <div className="pt-2">
                  <MediaPicker
                    label={t('Social Share Image (Open Graph)')}
                    value={formData.og_image || ''}
                    onChange={(value) => updateSetting('og_image', value)}
                    placeholder={t('Select image for social media sharing...')}
                    dragDrop
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('This image is shown when your store link is shared on Facebook and WhatsApp.')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('Recommended size: 1200x630px for optimal social media sharing. Max file size: 5MB')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Left column (RTL): sticky live Google preview */}
            <div className="self-start lg:sticky lg:top-20">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    {t('Google Search Preview')}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 text-start">
                    {t('This preview shows how your store may appear in Google search results.')}
                  </p>
                </CardHeader>
                <CardContent>
                  <GoogleSnippetPreview
                    title={formData.meta_title || store.name}
                    url={seoPreviewUrl}
                    description={formData.meta_description || formData.store_description || ''}
                    favicon={formData.favicon || ''}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>


        <TabsContent value="domains" className="space-y-4 mt-0">
          <DomainsTab storeId={Number(store?.id)} />
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
    </PageTemplate>
  );
}
