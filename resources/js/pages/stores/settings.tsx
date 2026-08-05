import React, { useMemo, useState, useRef, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import {
  Save, Facebook, Instagram, X, Youtube, Mail, Globe, Clock, Coins, Languages, Search,
  BarChart3, XCircle, Info, Loader2, Trash2, Plus, Share2, Palette, Phone, History, ArrowRight, CheckCircle2, Building2, MapPin, PenLine, Wrench, TrendingUp, FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import MediaPicker from '@/components/MediaPicker';
import { SearchableSelect } from '@/components/searchable-select';
import { AccordionSection } from '@/components/accordion-section';
import { apiPut, apiPost } from '@/utils/api';
import DomainsTab from './components/domains-tab';

interface Props {
  store: any;
  settings: any;
  currencies: any[];
  timezones: Record<string, string>;
  locationData: any[];
}

const STORE_LANGUAGES: { code: string; label: string }[] = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ru', label: 'Русский' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'he', label: 'עברית' },
  { code: 'pl', label: 'Polski' },
  { code: 'da', label: 'Dansk' },
];

const SOCIAL_PLATFORMS: { value: string; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'snapchat', label: 'Snapchat' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'custom', label: 'Other / Custom' },
];

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

const PlatformIcon = ({ platform, className }: { platform: string; className?: string }) => {
  switch (platform) {
    case 'facebook': return <Facebook className={className} />;
    case 'instagram': return <Instagram className={`${className} text-pink-600`} />;
    case 'twitter': return <X className={className} />;
    case 'youtube': return <Youtube className={`${className} text-red-600`} />;
    case 'whatsapp': return <Phone className={`${className} text-green-600`} />;
    default: return <Share2 className={className} />;
  }
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

export default function StoreSettings({ store, settings, currencies, timezones, locationData = [] }: Props) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<any>(settings || {});
  const [socialLinks, setSocialLinks] = useState<any[]>(() => initSocialLinks(settings));
  const [activeTab, setActiveTab] = useState('general');
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

  const isValidHttpUrl = (value?: string) => {
    if (!value || !value.trim()) return true;
    try {
      const url = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const isValidEmail = (value?: string) => {
    if (!value || !value.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    socialLinks.forEach((link, index) => {
      if (link.url && !isValidHttpUrl(link.url)) {
        errors[`social_${index}`] = t('Enter a valid URL starting with http:// or https://');
      }
    });
    if (!isValidEmail(formData.email)) {
      errors['email'] = t('Enter a valid email address');
    }
    if (formData.exchangeRate !== undefined && formData.exchangeRate !== '' && formData.exchangeRate !== null) {
      const rate = Number(formData.exchangeRate);
      if (isNaN(rate) || rate < 0) {
        errors['exchangeRate'] = t('Enter a valid exchange rate (0 or greater)');
      }
    }
    return errors;
  }, [formData, socialLinks]);

  const hasErrors = Object.keys(validationErrors).length > 0;

  const updateSetting = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
    setDirty(true);
    setAutoSaveState('idle');
  };

  const setSocial = (links: any[]) => {
    setSocialLinks(links);
    setFormData((prev: any) => ({ ...prev, social_links: links }));
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

  const currencyOptions = currencies.map((c) => ({
    value: c.code,
    label: `${c.code} — ${c.name}`,
    hint: c.symbol,
  }));
  const timezoneOptions = Object.entries(timezones || {}).map(([key, label]) => ({ value: key, label: String(label) }));
  const languageOptions = STORE_LANGUAGES.map((l) => ({ value: l.code, label: l.label }));

  const cityOptions = useMemo(() => {
    const options: { value: string; label: string; hint: string }[] = [];
    (locationData || []).forEach((country) => {
      (country.states || []).forEach((state: any) => {
        (state.cities || []).forEach((city: any) => {
          options.push({ value: `city-${city.id}`, label: city.name, hint: `${state.name} — ${country.name}` });
        });
      });
    });
    return options;
  }, [locationData]);

  const handleCitySelect = (value: string) => {
    if (!value.startsWith('city-')) {
      updateSetting('city', value);
      return;
    }
    const cityId = value.replace('city-', '');
    for (const country of locationData || []) {
      for (const state of country.states || []) {
        const match = (state.cities || []).find((c: any) => String(c.id) === cityId);
        if (match) {
          updateSetting('city', match.name);
          updateSetting('state', state.name);
          updateSetting('country', country.name);
          return;
        }
      }
    }
  };

  const currencyValue = (formData.defaultCurrency || (formData.default_currency ? String(formData.default_currency).toUpperCase() : '')) || 'ILS';
  const timezoneValue = formData.defaultTimezone || formData.timezone || 'UTC';
  const languageValue = formData.language || formData.defaultLanguage || 'ar';
  const maintenanceOn = formData.maintenance_mode === true || formData.maintenance_mode === 'true';
  const storeStatusOn = formData.store_status === true || formData.store_status === 'true';

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
        </div>
        {dirty && !saving && <span className="text-xs text-muted-foreground">{t('Unsaved changes')}</span>}
      </div>

      {hasErrors && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          {t('Please fix the highlighted fields below before saving.')}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 border-b border-border bg-transparent p-0">
          <TabsTrigger value="general" className="border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <PenLine className="h-4 w-4 me-2" />
            {t('General')}
          </TabsTrigger>
          <TabsTrigger value="seo" className="border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Search className="h-4 w-4 me-2" />
            {t('SEO')}
          </TabsTrigger>
          <TabsTrigger value="advanced" className="border-b-2 border-transparent rounded-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
            <Wrench className="h-4 w-4 me-2" />
            {t('Advanced')}
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
            title={t('Regional Settings')}
            icon={<Globe className="h-4 w-4" />}
            subtitle={t('These settings control how prices, dates, and content are displayed in your store.')}
            defaultOpen
            onReset={() => handleResetSection('regional')}
            resetDisabled={resettingSection === 'regional'}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="flex items-center gap-1.5 mb-2">
                  <Coins className="h-3.5 w-3.5" />
                  {t('Default Currency')}
                  <HelpTip text={t('Used for all prices across your store and checkout.')} />
                </Label>
                <SearchableSelect
                  value={currencyValue}
                  onChange={(value) => {
                    updateSetting('defaultCurrency', value);
                    updateSetting('default_currency', value.toLowerCase());
                  }}
                  options={currencyOptions}
                  placeholder={t('Select currency...')}
                  searchPlaceholder={t('Search currencies...')}
                  allowFreeText={false}
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 mb-2">
                  <Clock className="h-3.5 w-3.5" />
                  {t('Store Timezone')}
                  <HelpTip text={t('Determines how dates and times are shown in orders and reports.')} />
                </Label>
                <SearchableSelect
                  value={timezoneValue}
                  onChange={(value) => {
                    updateSetting('defaultTimezone', value);
                    updateSetting('timezone', value);
                  }}
                  options={timezoneOptions}
                  placeholder={t('Select timezone...')}
                  searchPlaceholder={t('Search timezones...')}
                  allowFreeText={false}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <div>
                <Label className="flex items-center gap-1.5 mb-2">
                  <Languages className="h-3.5 w-3.5" />
                  {t('Store Language')}
                  <HelpTip text={t('Default language used on your public storefront.')} />
                </Label>
                <SearchableSelect
                  value={languageValue}
                  onChange={(value) => updateSetting('language', value)}
                  options={languageOptions}
                  placeholder={t('Select language...')}
                  searchPlaceholder={t('Search languages...')}
                  allowFreeText={false}
                />
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            title={t('Secondary Currency & Tax')}
            icon={<Coins className="h-4 w-4" />}
            subtitle={t('Show a second currency alongside your default currency and include tax info on invoices.')}
            onReset={() => handleResetSection('currency_tax')}
            resetDisabled={resettingSection === 'currency_tax'}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="flex items-center gap-1.5 mb-2">
                  <Coins className="h-3.5 w-3.5" />
                  {t('Secondary Currency')}
                  <HelpTip text={t('When set, prices are shown in both your default currency and this one (e.g. ILS + USD for international customers).')} />
                </Label>
                <SearchableSelect
                  value={formData.secondaryCurrency || ''}
                  onChange={(value) => updateSetting('secondaryCurrency', value || null)}
                  options={currencyOptions}
                  placeholder={t('None — single currency')}
                  searchPlaceholder={t('Search currencies...')}
                  allowFreeText={false}
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t('Exchange Rate')}
                  <HelpTip text={t('How much 1 unit of your default currency equals in the secondary currency. E.g. 1 USD = 3.7 ILS.')} />
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.exchangeRate ?? ''}
                  onChange={(e) => updateSetting('exchangeRate', e.target.value === '' ? null : e.target.value)}
                  placeholder={t('e.g. 3.70')}
                />
                {validationErrors.exchangeRate && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.exchangeRate}</p>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <div>
                <Label className="flex items-center gap-1.5 mb-2">
                  <FileText className="h-3.5 w-3.5" />
                  {t('VAT Number')}
                  <HelpTip text={t('Shown on invoices. Used to identify your business for tax purposes.')} />
                </Label>
                <Input
                  value={formData.vat_number || ''}
                  onChange={(e) => updateSetting('vat_number', e.target.value)}
                  placeholder={t('e.g. 123456789')}
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5 mb-2">
                  <FileText className="h-3.5 w-3.5" />
                  {t('Tax Registration Number')}
                  <HelpTip text={t('Also shown on invoices if your jurisdiction requires it.')} />
                </Label>
                <Input
                  value={formData.tax_registration_number || ''}
                  onChange={(e) => updateSetting('tax_registration_number', e.target.value)}
                  placeholder={t('e.g. 510000000')}
                />
              </div>
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
                  dragDrop
                />
              </div>
              <div>
                <MediaPicker
                  label={t('Store Favicon')}
                  value={formData.favicon || ''}
                  onChange={(value) => updateSetting('favicon', value)}
                  placeholder={t('Select store favicon...')}
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

          <AccordionSection
            title={t('Store Address')}
            icon={<MapPin className="h-4 w-4" />}
            subtitle={t('Type a city name to get suggestions, or enter your address manually.')}
            onReset={() => handleResetSection('address')}
            resetDisabled={resettingSection === 'address'}
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">{t('Address')}</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => updateSetting('address', e.target.value)}
                  placeholder={t('123 Main Street')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">{t('City')}</Label>
                  <SearchableSelect
                    value={cityOptions.find((o) => o.label === formData.city)?.value || formData.city || ''}
                    onChange={handleCitySelect}
                    options={cityOptions}
                    placeholder={t('Type city name...')}
                    searchPlaceholder={t('Search cities...')}
                    allowFreeText
                  />
                </div>
                <div>
                  <Label htmlFor="state">{t('State/Province')}</Label>
                  <Input
                    id="state"
                    value={formData.state || ''}
                    onChange={(e) => updateSetting('state', e.target.value)}
                    placeholder={t('NY')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">{t('Country')}</Label>
                  <Input
                    id="country"
                    value={formData.country || ''}
                    onChange={(e) => updateSetting('country', e.target.value)}
                    placeholder={t('United States')}
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">{t('Postal Code')}</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code || ''}
                    onChange={(e) => updateSetting('postal_code', e.target.value)}
                    placeholder={t('10001')}
                  />
                </div>
              </div>
            </div>
          </AccordionSection>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('Social Media Links')}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 text-start">{t('Add or remove platforms as you need.')}</p>
                </div>
                <SectionResetButton onReset={() => handleResetSection('social')} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {socialLinks.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">{t('No social links added yet.')}</p>
              )}
              {socialLinks.map((link, index) => (
                <div key={index} className="grid grid-cols-[200px_1fr_auto_auto] items-end gap-3">
                  <div>
                    <Label className="mb-1 block">{t('Platform')}</Label>
                    <Select
                      value={link.platform}
                      onValueChange={(value) => {
                        const next = [...socialLinks];
                        next[index] = { ...next[index], platform: value };
                        setSocial(next);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOCIAL_PLATFORMS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <span className="flex items-center gap-2">
                              <PlatformIcon platform={p.value} className="h-4 w-4" />
                              {p.value === 'custom' ? t('Other / Custom') : p.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1 block">{t('URL')}</Label>
                    <Input
                      dir="ltr"
                      className={validationErrors[`social_${index}`] ? 'border-red-500' : ''}
                      value={link.url || ''}
                      onChange={(e) => {
                        const next = [...socialLinks];
                        next[index] = { ...next[index], url: e.target.value };
                        setSocial(next);
                      }}
                      placeholder="https://..."
                    />
                    {validationErrors[`social_${index}`] && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> {validationErrors[`social_${index}`]}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={link.enabled !== false}
                      onCheckedChange={(checked) => {
                        const next = [...socialLinks];
                        next[index] = { ...next[index], enabled: checked };
                        setSocial(next);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setSocial(socialLinks.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setSocial([...socialLinks, { platform: 'tiktok', url: '', enabled: true }])}>
                <Plus className="h-4 w-4 me-2" />
                {t('Add Platform')}
              </Button>
            </CardContent>
          </Card>

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

        <TabsContent value="seo" className="space-y-4 mt-6">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {t('Tracking & Analytics')}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 text-start">
                    {t('Add tracking IDs to measure your store traffic and conversions.')}
                  </p>
                </div>
                <SectionResetButton onReset={() => handleResetSection('tracking')} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="google_analytics_id" className="flex items-center gap-1.5">
                    {t('Google Analytics ID')}
                    <HelpTip text={t('Found in your GA4 property settings. Format: G-XXXXXXXXXX.')} />
                  </Label>
                  <Input
                    id="google_analytics_id"
                    dir="ltr"
                    value={formData.google_analytics_id || ''}
                    onChange={(e) => updateSetting('google_analytics_id', e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('Example: G-XXXXXXXXXX or UA-XXXXX-X')}</p>
                </div>
                <div>
                  <Label htmlFor="meta_pixel_id" className="flex items-center gap-1.5">
                    {t('Meta Pixel ID')}
                    <HelpTip text={t('Found in your Meta Business Suite under Events Manager.')} />
                  </Label>
                  <Input
                    id="meta_pixel_id"
                    dir="ltr"
                    value={formData.meta_pixel_id || ''}
                    onChange={(e) => updateSetting('meta_pixel_id', e.target.value)}
                    placeholder="123456789012345"
                  />
                  <p className="text-xs text-muted-foreground mt-1">{t('Example: 123456789012345')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t('WhatsApp Widget')}
              </CardTitle>
              <p className="text-sm text-muted-foreground text-start">
                {t('Add a floating WhatsApp button to your store for customer support. This is separate from order notifications.')}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('Enable WhatsApp Widget')}</Label>
                  <p className="text-sm text-muted-foreground">{t('Show floating WhatsApp button on storefront')}</p>
                </div>
                <Switch
                  checked={formData.whatsapp_widget_enabled === true || formData.whatsapp_widget_enabled === 'true'}
                  onCheckedChange={(checked) => updateSetting('whatsapp_widget_enabled', checked)}
                />
              </div>

              {(formData.whatsapp_widget_enabled === true || formData.whatsapp_widget_enabled === 'true') && (
                <>
                  <div>
                    <Label htmlFor="whatsapp_widget_phone">{t('WhatsApp Phone Number')}</Label>
                    <Input
                      id="whatsapp_widget_phone"
                      value={formData.whatsapp_widget_phone || ''}
                      onChange={(e) => updateSetting('whatsapp_widget_phone', e.target.value)}
                      placeholder="+919876543210"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('Enter phone number with country code (e.g., +919876543210, +1234567890)')}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="whatsapp_widget_message">{t('Default Message')}</Label>
                    <Textarea
                      id="whatsapp_widget_message"
                      value={formData.whatsapp_widget_message || ''}
                      onChange={(e) => updateSetting('whatsapp_widget_message', e.target.value)}
                      placeholder={t('Hello! I need help with...')}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('Pre-filled message when customers click the widget')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="whatsapp_widget_position">{t('Widget Position')}</Label>
                      <Select value={formData.whatsapp_widget_position || 'right'} onValueChange={(value) => updateSetting('whatsapp_widget_position', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">{t('Left')}</SelectItem>
                          <SelectItem value="right">{t('Right')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>{t('Display Options')}</Label>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{t('Show on Mobile')}</Label>
                        <p className="text-sm text-muted-foreground">{t('Display widget on mobile devices')}</p>
                      </div>
                      <Switch
                        checked={formData.whatsapp_widget_show_on_mobile === true || formData.whatsapp_widget_show_on_mobile === 'true'}
                        onCheckedChange={(checked) => updateSetting('whatsapp_widget_show_on_mobile', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>{t('Show on Desktop')}</Label>
                        <p className="text-sm text-muted-foreground">{t('Display widget on desktop devices')}</p>
                      </div>
                      <Switch
                        checked={formData.whatsapp_widget_show_on_desktop === true || formData.whatsapp_widget_show_on_desktop === 'true'}
                        onCheckedChange={(checked) => updateSetting('whatsapp_widget_show_on_desktop', checked)}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium mb-1 text-start">{t('Custom CSS & JavaScript')}</h4>
                  <p className="text-sm text-muted-foreground text-start">
                    {t('Custom code with revision history has moved to its own page.')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.visit(route('stores.appearance', store.id))}
                  className="shrink-0"
                >
                  {t('Open Appearance')}
                  <ArrowRight className="h-4 w-4 ms-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
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
