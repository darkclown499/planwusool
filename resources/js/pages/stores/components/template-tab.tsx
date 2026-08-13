import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { router } from '@inertiajs/react';
import { LayoutTemplate, Palette, Pencil, Plus, Trash2, CheckCircle2, Loader2, Globe, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import MediaPicker from '@/components/MediaPicker';
import { apiPut } from '@/utils/api';
import { getImageUrl } from '@/utils/image-helper';
import { cn } from '@/lib/utils';

interface TemplateTabProps {
  store: any;
  availableThemes?: string[];
  storeContent?: any;
}

interface ThemeOption {
  value: string;
  name: string;
  desc: string;
  accent: string;
  icon: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'basic',
    name: 'الأساس',
    desc: 'تصميم بسيط وحديث يناسب جميع المتاجر.',
    accent: '#10b77f',
    icon: '🌿',
  },
  {
    value: 'arabic-gadgets',
    name: 'الإلكترونيات العربي',
    desc: 'تصميم عربي فاخر لمتاجر الإلكترونيات والأجهزة الذكية.',
    accent: '#f97316',
    icon: '📱',
  },
];

const DEFAULT_CONTENT: any = {
  announcement: { enabled: true, text: '', link: '' },
  banner: { enabled: false, title: '', subtitle: '', button_text: 'تسوّق الآن', button_link: '#template-products', image: '', background: '' },
  features: [],
  testimonials: [],
  faqs: [],
  trust_bar: { enabled: true },
  newsletter: { enabled: true },
};

export default function TemplateTab({ store, availableThemes = [], storeContent = {} }: TemplateTabProps) {
  const { t } = useTranslation();

  const themes = THEME_OPTIONS.filter((th) => !availableThemes.length || availableThemes.includes(th.value));
  const currentTheme = themes.find((th) => th.value === (store?.theme || 'basic')) || themes[0];

  const [themeDialogOpen, setThemeDialogOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>(store?.theme || 'basic');
  const [savingTheme, setSavingTheme] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [content, setContent] = useState<any>(() => ({ ...DEFAULT_CONTENT, ...(storeContent || {}) }));
  const [savingContent, setSavingContent] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setContent({ ...DEFAULT_CONTENT, ...(storeContent || {}) });
  }, [storeContent]);

  useEffect(() => {
    setSelectedTheme(store?.theme || 'basic');
  }, [store?.theme]);

  const handleChooseTheme = () => {
    if (!selectedTheme || savingTheme) return;
    setSavingTheme(true);
    apiPut(route('stores.settings.theme', store.id), { theme: selectedTheme })
      .then(() => {
        setThemeDialogOpen(false);
        router.reload();
      })
      .catch((err) => {
        const message = err?.data?.error || t('Failed to update template');
        console.error(message);
        setSavingTheme(false);
      });
  };

  const updateContent = (key: string, value: any) => {
    setContent((prev: any) => ({ ...prev, [key]: value }));
  };

  const saveContent = () => {
    if (savingContent) return;
    setSavingContent(true);
    apiPut(route('api.store-content.update', store.id), { content })
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      })
      .catch(() => {})
      .finally(() => setSavingContent(false));
  };

  const storeUrl = (() => {
    const slug = store?.slug;
    if (!slug) return '';
    const { protocol, hostname, port } = window.location;
    const parts = hostname.split('.');
    const base = parts.length >= 3 ? parts.slice(-2).join('.') : hostname;
    return `${protocol}//${slug}.${base}${port ? `:${port}` : ''}`;
  })();

  return (
    <div className="space-y-4">
      {/* Current template summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4" />
            {t('Store Template')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl text-white"
              style={{ background: currentTheme?.accent || '#10b77f' }}
            >
              {currentTheme?.icon || '🛒'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{currentTheme?.name || t('Basic')}</p>
              <p className="text-sm text-muted-foreground">{currentTheme?.desc || ''}</p>
              {storeUrl && (
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {t('View your store')}
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => setThemeDialogOpen(true)}>
              <Palette className="h-4 w-4 me-2" />
              {t('Choose Template')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditorOpen(true)}>
              <Pencil className="h-4 w-4 me-2" />
              {t('Edit Template')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme picker dialog */}
      <Dialog open={themeDialogOpen} onOpenChange={setThemeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('Choose Template')}</DialogTitle>
            <DialogDescription>{t('Select the template that best fits your store. You can switch anytime.')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            {themes.map((th) => {
              const active = selectedTheme === th.value;
              return (
                <button
                  key={th.value}
                  type="button"
                  onClick={() => setSelectedTheme(th.value)}
                  className={cn(
                    'rounded-xl border-2 p-4 text-start transition',
                    active ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 hover:border-gray-300',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{th.icon}</span>
                      <span className="font-semibold">{th.name}</span>
                    </div>
                    {active && <CheckCircle2 className="h-5 w-5 text-primary" />}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{th.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white" style={{ background: th.accent }}>
                    {th.value}
                  </span>
                </button>
              );
            })}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setThemeDialogOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button type="button" onClick={handleChooseTheme} disabled={savingTheme}>
              {savingTheme && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t('Apply Template')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template content editor dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Edit Template')} — {currentTheme?.name}</DialogTitle>
            <DialogDescription>{t('Customize the content of each section shown on your storefront.')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Announcement */}
            <TemplateSection title={t('Announcement Bar')}>
              <div className="flex items-center justify-between">
                <Label>{t('Enabled')}</Label>
                <Switch
                  checked={content?.announcement?.enabled !== false}
                  onCheckedChange={(v) => updateContent('announcement', { ...content.announcement, enabled: v })}
                />
              </div>
              <div className="grid gap-3">
                <div>
                  <Label>{t('Message')}</Label>
                  <Textarea
                    rows={2}
                    value={content?.announcement?.text || ''}
                    onChange={(e) => updateContent('announcement', { ...content.announcement, text: e.target.value })}
                    placeholder={t('🎉 شحن مجاني للطلبات فوق 200₪ — عروض حصرية كل أسبوع')}
                  />
                </div>
                <div>
                  <Label>{t('Link (optional)')}</Label>
                  <Input
                    dir="ltr"
                    value={content?.announcement?.link || ''}
                    onChange={(e) => updateContent('announcement', { ...content.announcement, link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </TemplateSection>

            {/* Banner */}
            <TemplateSection title={t('Promo Banner')}>
              <div className="flex items-center justify-between">
                <Label>{t('Enabled')}</Label>
                <Switch
                  checked={content?.banner?.enabled === true}
                  onCheckedChange={(v) => updateContent('banner', { ...content.banner, enabled: v })}
                />
              </div>
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>{t('Title')}</Label>
                    <Input value={content?.banner?.title || ''} onChange={(e) => updateContent('banner', { ...content.banner, title: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t('Subtitle')}</Label>
                    <Input value={content?.banner?.subtitle || ''} onChange={(e) => updateContent('banner', { ...content.banner, subtitle: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>{t('Button Text')}</Label>
                    <Input value={content?.banner?.button_text || ''} onChange={(e) => updateContent('banner', { ...content.banner, button_text: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t('Button Link')}</Label>
                    <Input dir="ltr" value={content?.banner?.button_link || ''} onChange={(e) => updateContent('banner', { ...content.banner, button_link: e.target.value })} />
                  </div>
                </div>
                <div>
                  <MediaPicker
                    label={t('Banner Image')}
                    value={content?.banner?.image || ''}
                    onChange={(v) => updateContent('banner', { ...content.banner, image: v })}
                    placeholder={t('Select image...')}
                    dragDrop
                  />
                </div>
              </div>
            </TemplateSection>

            {/* Features */}
            <TemplateSection title={t('Features')} badge={`${content?.features?.length || 0}`}>
              <ListEditor
                items={content?.features || []}
                onChange={(items) => updateContent('features', items)}
                fields={[
                  { key: 'icon', label: t('Icon (emoji)'), type: 'text' as const, placeholder: '🛍️' },
                  { key: 'title', label: t('Title'), type: 'text' as const },
                  { key: 'desc', label: t('Description'), type: 'textarea' as const },
                ]}
                addLabel={t('Add Feature')}
                emptyMessage={t('No features configured — defaults will be shown.')}
              />
            </TemplateSection>

            {/* Testimonials */}
            <TemplateSection title={t('Testimonials')} badge={`${content?.testimonials?.length || 0}`}>
              <ListEditor
                items={content?.testimonials || []}
                onChange={(items) => updateContent('testimonials', items)}
                fields={[
                  { key: 'name', label: t('Customer Name'), type: 'text' as const },
                  { key: 'rating', label: t('Rating (1-5)'), type: 'number' as const },
                  { key: 'text', label: t('Review'), type: 'textarea' as const },
                ]}
                addLabel={t('Add Testimonial')}
                emptyMessage={t('No testimonials configured — defaults will be shown.')}
              />
            </TemplateSection>

            {/* FAQs */}
            <TemplateSection title={t('FAQs')} badge={`${content?.faqs?.length || 0}`}>
              <ListEditor
                items={content?.faqs || []}
                onChange={(items) => updateContent('faqs', items)}
                fields={[
                  { key: 'q', label: t('Question'), type: 'text' as const },
                  { key: 'a', label: t('Answer'), type: 'textarea' as const },
                ]}
                addLabel={t('Add FAQ')}
                emptyMessage={t('No FAQs configured — defaults will be shown.')}
              />
            </TemplateSection>

            {/* Trust bar & newsletter */}
            <div className="grid gap-5 sm:grid-cols-2">
              <TemplateSection title={t('Trust Bar')}>
                <div className="flex items-center justify-between">
                  <Label>{t('Enabled')}</Label>
                  <Switch
                    checked={content?.trust_bar?.enabled !== false}
                    onCheckedChange={(v) => updateContent('trust_bar', { enabled: v })}
                  />
                </div>
              </TemplateSection>
              <TemplateSection title={t('Newsletter')}>
                <div className="flex items-center justify-between">
                  <Label>{t('Enabled')}</Label>
                  <Switch
                    checked={content?.newsletter?.enabled !== false}
                    onCheckedChange={(v) => updateContent('newsletter', { enabled: v })}
                  />
                </div>
              </TemplateSection>
            </div>
          </div>

          <DialogFooter className="gap-2">
            {saved && (
              <span className="inline-flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                {t('Saved')}
              </span>
            )}
            <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>
              {t('Close')}
            </Button>
            <Button type="button" onClick={saveContent} disabled={savingContent}>
              {savingContent && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t('Save Template')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------ Helpers ------------------------------ */

function TemplateSection({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
          {badge && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{badge}</span>}
        </div>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </div>
  );
}

interface ListField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number';
  placeholder?: string;
}

function ListEditor({
  items,
  onChange,
  fields,
  addLabel,
  emptyMessage,
}: {
  items: any[];
  onChange: (items: any[]) => void;
  fields: ListField[];
  addLabel: string;
  emptyMessage: string;
}) {
  const { t } = useTranslation();

  const updateItem = (index: number, key: string, value: any) => {
    const next = items.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    onChange(next);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    const empty: any = {};
    fields.forEach((f) => {
      empty[f.key] = f.type === 'number' ? (f.key === 'rating' ? 5 : 0) : '';
    });
    onChange([...items, empty]);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        <p>{emptyMessage}</p>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3.5 w-3.5 me-1.5" />
          {addLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="space-y-2 rounded-lg border bg-muted/10 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              {t('Item')} {index + 1}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => removeItem(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('Remove')}</TooltipContent>
            </Tooltip>
          </div>
          {fields.map((field) => (
            <div key={field.key}>
              <Label className="text-xs">{field.label}</Label>
              {field.type === 'textarea' ? (
                <Textarea
                  rows={2}
                  value={item[field.key] || ''}
                  onChange={(e) => updateItem(index, field.key, e.target.value)}
                  placeholder={field.placeholder}
                />
              ) : (
                <Input
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={item[field.key] ?? (field.type === 'number' ? '' : '')}
                  onChange={(e) => updateItem(index, field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-3.5 w-3.5 me-1.5" />
        {addLabel}
      </Button>
    </div>
  );
}
