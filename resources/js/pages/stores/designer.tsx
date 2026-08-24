import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Code2, Eye, LayoutTemplate, Loader2, Palette, Save, Settings2, Store } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import MediaPicker from '@/components/MediaPicker';
import { apiGet, apiPut } from '@/utils/api';
import { getImageUrl } from '@/utils/image-helper';
import { getTemplateModule, type TemplateModule } from '@/templates-v2';
import StoreTemplatesGrid from './components/store-templates-grid';

/* ===================================================================== */
/* Slots Designer — the v2 store editor.                                  */
/*                                                                        */
/* Templates are complete storefront applications, so there is nothing to */
/* drag & drop. The editor instead exposes what each template declares:   */
/*   1. القوالب — switch the whole storefront application                 */
/*   2. المحتوى — the active template's editable slots (contentSchema)    */
/*   3. الهوية — brand tokens (colors / radius / typography)              */
/*   4. الأكواد — custom CSS / JS / head injection                        */
/* Everything saves through PUT /api/stores/{id}/designer.                 */
/* ===================================================================== */

interface SlotField {
  key: string;
  label: string;
  type: 'text' | 'image';
  group?: string;
  default?: string;
}

interface Props {
  store: any;
  availableThemes: string[];
  settings: any;
  storeUrl: string;
}

type Tab = 'templates' | 'content' | 'brand' | 'code';

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'templates', label: 'القوالب', icon: <LayoutTemplate className="h-4 w-4" /> },
  { id: 'content', label: 'المحتوى', icon: <Settings2 className="h-4 w-4" /> },
  { id: 'brand', label: 'الهوية', icon: <Palette className="h-4 w-4" /> },
  { id: 'code', label: 'الأكواد المخصصة', icon: <Code2 className="h-4 w-4" /> },
];

/** Set a value at a dotted path inside a nested object (immutable). */
function setDotted(obj: Record<string, any>, path: string, value: any): Record<string, any> {
  const next = { ...obj };
  const parts = path.split('.');
  let cur: any = next;
  for (let i = 0; i < parts.length - 1; i++) {
    cur[parts[i]] = { ...(cur[parts[i]] || {}) };
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
  return next;
}

/** Read a value at a dotted path. */
function getDotted(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
}

/** Strip trailing slashes from URL/path. */
function stripTrailingSlash(url: string): string {
  return String(url || '').trim().replace(/\/+$/, '');
}

/** Resolve to absolute URL and strip trailing slash. */
function normalizeImageUrl(url: string): string {
  if (!url) return '';
  const trimmed = stripTrailingSlash(String(url).trim());
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  try {
    return stripTrailingSlash(getImageUrl(trimmed));
  } catch {
    return trimmed;
  }
}

/** Sanitize hero_images array: strip slashes, resolve to absolute URLs, filter malformed, cap 10. */
function sanitizeHeroImages(images: any): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .map((u: any) => String(u || '').trim())
    .filter(Boolean)
    .map((u) => normalizeImageUrl(u))
    .filter((u) => u && u.length > 5 && u !== '/' && u !== '//' && !u.endsWith('//'))
    .slice(0, 10);
}

function getInitialTab(): Tab {
  if (typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search).get('tab') as Tab | null;
    if (q && ['templates', 'content', 'brand', 'code'].includes(q)) return q;
  }
  return 'templates';
}

export default function StoreDesigner({ store, availableThemes, storeUrl }: Props) {
  const [tab, setTab] = useState<Tab>(() => getInitialTab());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const [heroUploading, setHeroUploading] = useState(false);

  const handleTabChange = (next: Tab) => {
    setTab(next);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', next);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Remote state (from GET designer)
  const [theme, setTheme] = useState<string>('bazaar-market');
  const [tokens, setTokens] = useState<Record<string, any>>({});
  const [content, setContent] = useState<Record<string, any>>({});
  const [customCss, setCustomCss] = useState('');
  const [customJs, setCustomJs] = useState('');
  const [headInject, setHeadInject] = useState('');

  useEffect(() => {
    let alive = true;
    apiGet(`/api/stores/${store.id}/designer`)
      .then((res: any) => {
        if (!alive || !res) return;
        setTheme(res.theme || 'bazaar-market');
        setTokens(res.design_tokens || {});
        setContent(res.content || {});
        setCustomCss(res.custom_css || '');
        setCustomJs(res.custom_js || '');
        setHeadInject(res.head_inject || '');
      })
      .catch(() => toast.error('تعذر تحميل إعدادات المصمم'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [store.id]);

  const activeModule: TemplateModule | null = useMemo(() => {
    try {
      return getTemplateModule(theme);
    } catch {
      return null;
    }
  }, [theme]);

  /** Persist the content blob (slot values). */
  const saveContent = async () => {
    setSaving(true);
    try {
      // Normalize hero_images: strip trailing slashes, resolve to absolute URLs, filter malformed
      let payloadContent: Record<string, any> = { ...content };
      const rawNested = getDotted(content, 'hero_banner.images');
      const rawFlat = getDotted(content, 'hero_images');
      const rawImages = rawNested !== undefined ? rawNested : rawFlat;
      if (rawImages !== undefined) {
        const clean = sanitizeHeroImages(rawImages);
        // Persist consistently under both keys: hero_banner.images (nested) and hero_images (flat) for DB/validator/transformer consistency
        payloadContent = setDotted(payloadContent, 'hero_banner.images', clean);
        payloadContent = setDotted(payloadContent, 'hero_images', clean);
        // Also ensure hero_banner object exists for other hero fields
        const heroType = getDotted(content, 'hero_banner.type') ?? getDotted(content, 'hero_type');
        if (heroType !== undefined) {
          payloadContent = setDotted(payloadContent, 'hero_banner.type', String(heroType).trim().replace(/\/+$/, ''));
          payloadContent = setDotted(payloadContent, 'hero_type', String(heroType).trim().replace(/\/+$/, ''));
        }
        const heroVideo = getDotted(content, 'hero_banner.video_url') ?? getDotted(content, 'hero_video_url');
        if (heroVideo !== undefined) {
          const cleanVideo = stripTrailingSlash(String(heroVideo).trim());
          const normVideo = cleanVideo ? (cleanVideo.startsWith('http') ? cleanVideo : normalizeImageUrl(cleanVideo)) : '';
          payloadContent = setDotted(payloadContent, 'hero_banner.video_url', normVideo);
          payloadContent = setDotted(payloadContent, 'hero_video_url', normVideo);
        }
        const heroYoutube = getDotted(content, 'hero_banner.youtube_url') ?? getDotted(content, 'hero_youtube_url');
        if (heroYoutube !== undefined) {
          const cleanYt = stripTrailingSlash(String(heroYoutube).trim());
          payloadContent = setDotted(payloadContent, 'hero_banner.youtube_url', cleanYt);
          payloadContent = setDotted(payloadContent, 'hero_youtube_url', cleanYt);
        }
        const overlay = getDotted(content, 'hero_banner.overlay_opacity') ?? getDotted(content, 'overlay_opacity');
        if (overlay !== undefined) {
          const num = Math.min(100, Math.max(0, Number(overlay)));
          payloadContent = setDotted(payloadContent, 'hero_banner.overlay_opacity', num);
          payloadContent = setDotted(payloadContent, 'overlay_opacity', num);
        }
        // Sync local state to normalized payload so UI reflects cleaned URLs immediately
        setContent(payloadContent);
      }
      await apiPut(`/api/stores/${store.id}/designer`, { content: payloadContent });
      toast.success('تم حفظ المحتوى');
    } catch {
      toast.error('تعذر حفظ المحتوى');
    } finally {
      setSaving(false);
    }
  };

  /** Persist brand tokens. */
  const saveTokens = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/stores/${store.id}/designer`, { design_tokens: tokens });
      toast.success('تم حفظ هوية المتجر');
    } catch {
      toast.error('تعذر حفظ الهوية');
    } finally {
      setSaving(false);
    }
  };

  /** Persist custom code assets. */
  const saveCode = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/stores/${store.id}/designer`, {
        custom_css: customCss,
        custom_js: customJs,
        head_inject: headInject,
      });
      toast.success('تم حفظ الأكواد المخصصة');
    } catch {
      toast.error('تعذر حفظ الأكواد — تأكد من سلامة الكود');
    } finally {
      setSaving(false);
    }
  };

  const colors = (tokens?.colors || {}) as Record<string, string>;
  const typography = (tokens?.typography || {}) as Record<string, any>;

  return (
    <PageTemplate title="تخصيص تصميم المتجر" url={`/stores/${store.id}/designer`}>
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black text-gray-900">
              <Store className="h-7 w-7 text-emerald-500" />
              تخصيص تصميم المتجر
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              كل قالب تطبيق متجر متكامل — بدّل القالب، عدّل محتواه، واضبط هويتك البصرية.
            </p>
          </div>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Eye className="h-4 w-4" /> معاينة المتجر
          </a>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-1.5 rounded-2xl bg-slate-100 p-1.5">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTabChange(id)}
              disabled={loading && id !== 'templates'}
              className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-black transition ${
                tab === id ? 'bg-white text-emerald-700 shadow' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-24 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" /> جارٍ التحميل…
          </div>
        ) : (
          <>
            {/* ------------------------- TEMPLATES ------------------------- */}
            {tab === 'templates' && (
              <StoreTemplatesGrid
                store={store}
                activeTheme={theme}
                availableThemes={availableThemes}
                onApplied={(slug) => setTheme(slug)}
              />
            )}

            {/* -------------------------- CONTENT -------------------------- */}
            {tab === 'content' && (() => {
              const announcementText = (getDotted(content, 'announcement.text') ?? '') as string;
              const announcementBg = (getDotted(content, 'announcement.bg_color') ?? '') as string;
              const announcementColor = (getDotted(content, 'announcement.text_color') ?? '') as string;
              const showAnnouncementRaw = getDotted(content, 'announcement.enabled');
              const showAnnouncement = showAnnouncementRaw === undefined ? true : !!showAnnouncementRaw;
              const previewBg = announcementBg.trim() ? announcementBg.trim() : 'linear-gradient(90deg,#2b2320,#4a3a33 50%,#2b2320)';
              const previewColor = announcementColor.trim() ? announcementColor.trim() : '#f5ede2';
              const isGradient = previewBg.includes('gradient');
              const previewText = announcementText.trim() || 'توصيل سريع لجميع المناطق — والدفع عند الاستلام متاح';
              return (
                <div className="space-y-5">
                  {/* Announcement Bar Controls */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-black text-slate-900">شريط الإعلانات العلوي</h2>
                        <p className="mt-0.5 text-xs text-gray-500">نص ولون الشريط المتحرك فوق الهيدر — يظهر في معاينة المتجر فور الحفظ.</p>
                      </div>
                      <Button size="sm" onClick={saveContent} disabled={saving} className="gap-1.5">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
                      </Button>
                    </div>

                    {/* Live preview */}
                    <div className="mb-5 overflow-hidden rounded-xl ring-1 ring-slate-200">
                      <div
                        dir="rtl"
                        className="flex items-center justify-center gap-2 px-4 py-2 text-center"
                        style={isGradient ? { background: previewBg, color: previewColor } : { backgroundColor: previewBg, color: previewColor }}
                      >
                        <span aria-hidden>✦</span>
                        <span className="text-xs font-medium tracking-wide" style={{ color: previewColor }}>{previewText}</span>
                        <span aria-hidden>✦</span>
                      </div>
                      {!showAnnouncement && (
                        <p className="bg-amber-50 px-3 py-1.5 text-center text-xs font-bold text-amber-700">مخفي — لن يظهر في المتجر حتى تفعّل الإظهار</p>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label className="mb-1.5 block text-xs font-black text-slate-600">نص شريط الإعلانات</Label>
                        <Input
                          value={announcementText}
                          onChange={(e) => setContent(setDotted(content, 'announcement.text', e.target.value))}
                          placeholder="توصيل سريع لجميع المناطق — والدفع عند الاستلام متاح"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs font-black text-slate-600">لون خلفية الشريط</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={announcementBg && /^#[0-9a-fA-F]{6}$/.test(announcementBg.trim()) ? announcementBg.trim() : '#2b2320'}
                            onChange={(e) => setContent(setDotted(content, 'announcement.bg_color', e.target.value))}
                            className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                            aria-label="لون خلفية الشريط"
                          />
                          <Input
                            dir="ltr"
                            value={announcementBg}
                            onChange={(e) => setContent(setDotted(content, 'announcement.bg_color', e.target.value))}
                            placeholder="#2b2320 أو linear-gradient(...)"
                            className="flex-1 bg-white font-mono text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs font-black text-slate-600">لون النص</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={announcementColor && /^#[0-9a-fA-F]{6}$/.test(announcementColor.trim()) ? announcementColor.trim() : '#f5ede2'}
                            onChange={(e) => setContent(setDotted(content, 'announcement.text_color', e.target.value))}
                            className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                            aria-label="لون النص"
                          />
                          <Input
                            dir="ltr"
                            value={announcementColor}
                            onChange={(e) => setContent(setDotted(content, 'announcement.text_color', e.target.value))}
                            placeholder="#f5ede2"
                            className="flex-1 bg-white font-mono text-sm"
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                        <div>
                          <p className="text-sm font-black text-slate-800">إظهار/إخفاء الشريط العلوي</p>
                          <p className="text-xs text-gray-500">عند الإخفاء لا يظهر الشريط في أي صفحة بالمتجر</p>
                        </div>
                        <Switch
                          checked={showAnnouncement}
                          onCheckedChange={(v) => setContent(setDotted(content, 'announcement.enabled', v))}
                          aria-label="إظهار شريط الإعلانات"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Template slots */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="font-black text-slate-900">محتوى قالب «{activeModule?.meta.name ?? theme}»</h2>
                        <p className="mt-0.5 text-xs text-gray-500">عدّل نصوص وصور الواجهة التي يعرضها قالبك.</p>
                      </div>
                      {!!activeModule?.contentSchema?.length && (
                        <Button size="sm" onClick={saveContent} disabled={saving} className="gap-1.5">
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
                        </Button>
                      )}
                    </div>

                    {!activeModule?.contentSchema?.length ? (
                      <p className="py-10 text-center text-sm text-gray-400">
                        هذا القالب لا يعرض حقول محتوى قابلة للتعديل حالياً.
                      </p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {(activeModule.contentSchema as SlotField[]).map((field) => {
                          const value = getDotted(content, field.key) ?? field.default ?? '';
                          return (
                            <div key={field.key}>
                              <Label className="mb-1.5 block text-xs font-black text-slate-600">{field.label}</Label>
                              {field.type === 'image' ? (
                                <MediaPicker
                                  value={value}
                                  onChange={(url: string) => setContent(setDotted(content, field.key, url))}
                                />
                              ) : (
                                <Input
                                  value={String(value)}
                                  onChange={(e) => setContent(setDotted(content, field.key, e.target.value))}
                                  placeholder={field.default}
                                  className="bg-white"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* --------------------------- BRAND --------------------------- */}
            {tab === 'brand' && (() => {
              const heroType = (getDotted(content, 'hero_banner.type') ?? getDotted(content, 'hero_type') ?? 'image') as string;
              const rawHeroImages = (getDotted(content, 'hero_banner.images') ?? getDotted(content, 'hero_images') ?? []) as any;
              const heroImages = sanitizeHeroImages(rawHeroImages);
              const heroVideoUrl = stripTrailingSlash(String(getDotted(content, 'hero_banner.video_url') ?? getDotted(content, 'hero_video_url') ?? ''));
              const heroYoutubeUrl = stripTrailingSlash(String(getDotted(content, 'hero_banner.youtube_url') ?? getDotted(content, 'hero_youtube_url') ?? ''));
              const heroOverlay = Number(getDotted(content, 'hero_banner.overlay_opacity') ?? getDotted(content, 'overlay_opacity') ?? 35);
              const heroHeading = (getDotted(content, 'hero_banner.heading') ?? '') as string;
              const heroSubtitle = (getDotted(content, 'hero_banner.subtitle') ?? '') as string;
              const heroCtaLabel = (getDotted(content, 'hero_banner.cta_label') ?? '') as string;
              const heroCtaLink = (getDotted(content, 'hero_banner.cta_link') ?? '') as string;
              const getYoutubeId = (url: string) => {
                try {
                  const u = new URL(url);
                  if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0];
                  if (u.searchParams.get('v')) return u.searchParams.get('v')!.split('&')[0];
                  const parts = u.pathname.split('/').filter(Boolean);
                  const idx = parts.indexOf('embed');
                  if (idx !== -1 && parts[idx + 1]) return parts[idx + 1].split('?')[0];
                  return parts[parts.length - 1]?.split('?')[0] ?? null;
                } catch { const m = url.match(/[a-zA-Z0-9_-]{11}/); return m ? m[0] : null; }
              };
              const youtubeId = heroYoutubeUrl ? getYoutubeId(heroYoutubeUrl) : null;
              return (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="font-black text-slate-900">هوية المتجر البصرية</h2>
                        <p className="mt-0.5 text-xs text-gray-500">الألوان والاستدارة والخط — تُطبَّق فوق أي قالب.</p>
                      </div>
                      <Button size="sm" onClick={saveTokens} disabled={saving} className="gap-1.5">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
                      </Button>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <Label className="mb-1.5 block text-xs font-black text-slate-600">اللون الأساسي</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={colors.primary || '#0d9488'}
                            onChange={(e) => setTokens({ ...tokens, colors: { ...colors, primary: e.target.value } })}
                            className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                            aria-label="اختيار اللون الأساسي"
                          />
                          <Input
                            dir="ltr"
                            value={colors.primary || '#0d9488'}
                            onChange={(e) => setTokens({ ...tokens, colors: { ...colors, primary: e.target.value } })}
                            className="max-w-32 bg-white font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="mb-1.5 block text-xs font-black text-slate-600">اللون الثانوي</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={colors.secondary || '#f59e0b'}
                            onChange={(e) => setTokens({ ...tokens, colors: { ...colors, secondary: e.target.value } })}
                            className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                            aria-label="اختيار اللون الثانوي"
                          />
                          <Input
                            dir="ltr"
                            value={colors.secondary || '#f59e0b'}
                            onChange={(e) => setTokens({ ...tokens, colors: { ...colors, secondary: e.target.value } })}
                            className="max-w-32 bg-white font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="mb-1.5 block text-xs font-black text-slate-600">استدارة الزوايا</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={32}
                            value={parseInt(String(tokens.radius ?? 16), 10) || 0}
                            onChange={(e) => setTokens({ ...tokens, radius: `${e.target.value}px` })}
                            className="flex-1 accent-emerald-600"
                            aria-label="استدارة الزوايا"
                          />
                          <span className="min-w-12 rounded-lg bg-slate-100 px-2 py-1 text-center font-mono text-xs font-bold text-slate-600">
                            {String(tokens.radius ?? '16px')}
                          </span>
                        </div>
                      </div>

                      <div>
                        <Label className="mb-1.5 block text-xs font-black text-slate-600">عائلة الخط</Label>
                        <select
                          value={typography.font_family || ''}
                          onChange={(e) => setTokens({ ...tokens, typography: { ...typography, font_family: e.target.value } })}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="">افتراضي القالب</option>
                          <option value="Cairo">Cairo</option>
                          <option value="Tajawal">Tajawal</option>
                          <option value="Almarai">Almarai</option>
                          <option value="IBM Plex Sans Arabic">IBM Plex Sans Arabic</option>
                        </select>
                      </div>
                    </div>

                    {/* Live token preview */}
                    <div className="mt-6 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                      <p className="mb-3 text-xs font-black text-slate-400">معاينة سريعة</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className="px-5 py-2 text-sm font-black text-white shadow"
                          style={{ backgroundColor: colors.primary || '#0d9488', borderRadius: tokens.radius || '16px' }}
                        >
                          زر أساسي
                        </span>
                        <span
                          className="px-5 py-2 text-sm font-black text-white shadow"
                          style={{ backgroundColor: colors.secondary || '#f59e0b', borderRadius: tokens.radius || '16px' }}
                        >
                          زر ثانوي
                        </span>
                        <span
                          className="border px-5 py-2 text-sm font-bold text-slate-700"
                          style={{ borderColor: colors.primary || '#0d9488', borderRadius: tokens.radius || '16px' }}
                        >
                          عنصر محدد
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Hero Banner Settings */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-black text-slate-900">إعدادات البنر الرئيسي (Hero Banner)</h2>
                        <p className="mt-0.5 text-xs text-gray-500">اختر نوع الوسائط، اضبط الطبقة الداكنة والمحتوى النصي للبنر.</p>
                      </div>
                      <Button size="sm" onClick={saveContent} disabled={saving} className="gap-1.5">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
                      </Button>
                    </div>

                    {/* Banner Type Toggle */}
                    <div className="mb-4 flex flex-wrap gap-2 rounded-xl bg-slate-100 p-1.5">
                      {[
                        { id: 'image', label: 'معرض صور' },
                        { id: 'video', label: 'فيديو مباشر' },
                        { id: 'youtube', label: 'يوتيوب' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            let tmp = setDotted(content, 'hero_banner.type', opt.id);
                            tmp = setDotted(tmp, 'hero_type', opt.id);
                            setContent(tmp);
                          }}
                          className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-black transition ${heroType === opt.id ? 'bg-white text-emerald-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Media Inputs */}
                    {heroType === 'image' && (
                      <div className="mb-4 space-y-3">
                        <Label className="block text-xs font-black text-slate-600">صور السلايدر (معرض الصور)</Label>
                        {heroImages.length === 0 && <p className="text-xs text-gray-400">لم تضف أي صورة بعد — سيتم استخدام الصور الافتراضية للقالب.</p>}
                        <div className="grid gap-3 sm:grid-cols-2">
                          {heroImages.map((img: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="flex-1">
                                <MediaPicker
                                  value={img ? normalizeImageUrl(img) : img}
                                  onChange={(url: string) => {
                                    const clean = normalizeImageUrl(url);
                                    const next = [...heroImages];
                                    next[idx] = clean;
                                    let tmp = setDotted(content, 'hero_banner.images', next);
                                    tmp = setDotted(tmp, 'hero_images', next);
                                    setContent(tmp);
                                  }}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const next = heroImages.filter((_: string, i: number) => i !== idx);
                                  let tmp = setDotted(content, 'hero_banner.images', next);
                                  tmp = setDotted(tmp, 'hero_images', next);
                                  setContent(tmp);
                                }}
                                className="shrink-0 text-red-600 hover:text-red-700"
                              >
                                حذف
                              </Button>
                            </div>
                          ))}
                        </div>
                        <input
                          ref={heroFileRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;
                            const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
                            if (valid.length === 0) {
                              toast.warning('الرجاء اختيار ملف صورة');
                              e.target.value = '';
                              return;
                            }
                            setHeroUploading(true);
                            try {
                              const fd = new FormData();
                              valid.forEach((f) => fd.append('files[]', f));
                              const res = await fetch(route('api.media.batch'), {
                                method: 'POST',
                                body: fd,
                                headers: {
                                  Accept: 'application/json',
                                  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                },
                              });
                              const json: any = await res.json();
                              if (res.ok && json?.data?.length) {
                                const urls: string[] = (json.data as any[]).map((d: any) => {
                                  const raw = String(d.url || '');
                                  if (!raw) return '';
                                  if (raw.startsWith('/storage')) return raw;
                                  const m = raw.match(/\/storage\/.*$/);
                                  return m ? m[0] : raw;
                                }).filter(Boolean).map((u) => normalizeImageUrl(u)).filter(Boolean);
                                if (urls.length) {
                                  const next = [...heroImages, ...urls].slice(0, 10);
                                  let tmp = setDotted(content, 'hero_banner.images', next);
                                  tmp = setDotted(tmp, 'hero_images', next);
                                  setContent(tmp);
                                  toast.success('تم رفع الصورة');
                                }
                              } else {
                                toast.error(json?.message || 'فشل الرفع');
                              }
                            } catch {
                              toast.error('حدث خطأ أثناء الرفع');
                            } finally {
                              setHeroUploading(false);
                              e.target.value = '';
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={heroUploading}
                          onClick={() => heroFileRef.current?.click()}
                          className="gap-1.5"
                        >
                          {heroUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          + إضافة صورة
                        </Button>
                      </div>
                    )}

                    {heroType === 'video' && (
                      <div className="mb-4 space-y-3">
                        <Label className="block text-xs font-black text-slate-600">رابط فيديو MP4 (رفع مباشر)</Label>
                        <Input
                          dir="ltr"
                          value={heroVideoUrl ? normalizeImageUrl(heroVideoUrl) : heroVideoUrl}
                          onChange={(e) => {
                            const clean = stripTrailingSlash(e.target.value.trim());
                            const norm = clean ? (clean.startsWith('http') ? clean : normalizeImageUrl(clean)) : '';
                            let tmp = setDotted(content, 'hero_banner.video_url', norm);
                            tmp = setDotted(tmp, 'hero_video_url', norm);
                            setContent(tmp);
                          }}
                          placeholder="https://example.com/video.mp4"
                          className="bg-white font-mono text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">أو اختر ملف فيديو:</span>
                          <MediaPicker
                            value={heroVideoUrl ? normalizeImageUrl(heroVideoUrl) : heroVideoUrl}
                            onChange={(url: string) => {
                              const clean = normalizeImageUrl(url);
                              let tmp = setDotted(content, 'hero_banner.video_url', clean);
                              tmp = setDotted(tmp, 'hero_video_url', clean);
                              setContent(tmp);
                            }}
                          />
                        </div>
                        {heroVideoUrl && (
                          <video src={normalizeImageUrl(heroVideoUrl)} controls className="mt-2 max-h-48 w-full rounded-lg border object-cover" />
                        )}
                      </div>
                    )}

                    {heroType === 'youtube' && (
                      <div className="mb-4 space-y-3">
                        <Label className="block text-xs font-black text-slate-600">رابط يوتيوب</Label>
                        <Input
                          dir="ltr"
                          value={heroYoutubeUrl ? stripTrailingSlash(heroYoutubeUrl) : heroYoutubeUrl}
                          onChange={(e) => {
                            const clean = stripTrailingSlash(e.target.value.trim());
                            let tmp = setDotted(content, 'hero_banner.youtube_url', clean);
                            tmp = setDotted(tmp, 'hero_youtube_url', clean);
                            setContent(tmp);
                          }}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="bg-white font-mono text-sm"
                        />
                        {youtubeId && (
                          <div className="overflow-hidden rounded-xl border">
                            <iframe
                              className="aspect-video w-full"
                              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&mute=1&controls=1`}
                              title="YouTube preview"
                              frameBorder="0"
                              allow="autoplay; fullscreen"
                              allowFullScreen
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Overlay Opacity */}
                    <div className="mb-4">
                      <Label className="mb-1.5 block text-xs font-black text-slate-600">شفافية الطبقة الداكنة ({heroOverlay}%)</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={heroOverlay}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            let tmp = setDotted(content, 'hero_banner.overlay_opacity', val);
                            tmp = setDotted(tmp, 'overlay_opacity', val);
                            setContent(tmp);
                          }}
                          className="flex-1 accent-emerald-600"
                          aria-label="شفافية الطبقة"
                        />
                        <span className="min-w-12 rounded-lg bg-slate-100 px-2 py-1 text-center font-mono text-xs font-bold text-slate-600">
                          {heroOverlay}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-gradient-to-r from-transparent to-black" style={{ opacity: heroOverlay / 100 }} />
                    </div>

                    {/* Content & Action Fields */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label className="mb-1.5 block text-xs font-black text-slate-600">العنوان الرئيسي</Label>
                        <Input
                          value={heroHeading}
                          onChange={(e) => {
                            let tmp = setDotted(content, 'hero_banner.heading', e.target.value);
                            tmp = setDotted(tmp, 'hero_heading', e.target.value);
                            setContent(tmp);
                          }}
                          placeholder="أناقة تُروى كقصة"
                          className="bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="mb-1.5 block text-xs font-black text-slate-600">الوصف الفرعي</Label>
                        <Input
                          value={heroSubtitle}
                          onChange={(e) => {
                            let tmp = setDotted(content, 'hero_banner.subtitle', e.target.value);
                            tmp = setDotted(tmp, 'hero_subtitle', e.target.value);
                            setContent(tmp);
                          }}
                          placeholder="تشكيلة الموسم الجديدة — قطع مختارة بعناية"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs font-black text-slate-600">نص الزر</Label>
                        <Input
                          value={heroCtaLabel}
                          onChange={(e) => {
                            let tmp = setDotted(content, 'hero_banner.cta_label', e.target.value);
                            tmp = setDotted(tmp, 'hero_cta_label', e.target.value);
                            setContent(tmp);
                          }}
                          placeholder="اكتشفي التشكيلة"
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs font-black text-slate-600">رابط الزر</Label>
                        <Input
                          dir="ltr"
                          value={heroCtaLink}
                          onChange={(e) => {
                            const clean = stripTrailingSlash(e.target.value.trim());
                            let tmp = setDotted(content, 'hero_banner.cta_link', clean);
                            tmp = setDotted(tmp, 'hero_cta_link', clean);
                            setContent(tmp);
                          }}
                          placeholder="#atelier-new أو /category/..."
                          className="bg-white font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Live hero preview */}
                    <div className="mt-6 overflow-hidden rounded-xl border">
                      <p className="bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-400">معاينة البنر (حية)</p>
                      <div className="relative flex min-h-[260px] items-center bg-stone-900 p-6 text-white">
                        {heroType === 'video' && heroVideoUrl ? (
                          <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" src={heroVideoUrl} />
                        ) : heroType === 'youtube' && youtubeId ? (
                          <iframe
                            className="absolute inset-0 h-full w-full object-cover"
                            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${youtubeId}`}
                            title="YouTube preview"
                            frameBorder="0"
                            allow="autoplay; fullscreen"
                          />
                        ) : heroImages.length > 0 ? (
                          <img src={heroImages[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-l from-stone-800 to-stone-900" />
                        )}
                        <div className="absolute inset-0 bg-black" style={{ opacity: heroOverlay / 100 }} />
                        <div className="relative z-10 max-w-md">
                          <h3 className="font-serif text-2xl font-bold leading-tight sm:text-3xl">{heroHeading || 'العنوان الرئيسي'}</h3>
                          <p className="mt-2 text-sm text-white/80">{heroSubtitle || 'الوصف الفرعي للبنر'}</p>
                          {(heroCtaLabel || 'اكتشفي') && (
                            <span className="mt-3 inline-block rounded border border-white/70 px-5 py-2 text-xs font-bold text-white">
                              {heroCtaLabel || 'نص الزر'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Helper guidelines */}
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-black text-blue-800">📷 صورة البنر</p>
                        <p className="mt-1 text-xs leading-relaxed text-blue-700">
                          المقاس الموصى به: 1920×1080 بكسل للشاشات الكبيرة، و 1080×1350 بكسل للهواتف. أقصى حجم: 2MB (صيغة WebP أو JPG).
                        </p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-black text-emerald-800">🎬 الفيديو المباشر</p>
                        <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                          صيغة MP4 بحجم لا يتجاوز 15MB لضمان سرعة التحميل على الهواتف.
                        </p>
                      </div>
                      <div className="rounded-xl border border-purple-100 bg-purple-50 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-black text-purple-800">▶️ يوتيوب</p>
                        <p className="mt-1 text-xs leading-relaxed text-purple-700">
                          أدخل رابط الفيديو المباشر وستتم معالجته للتشغيل التلقائي الصامت.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ---------------------------- CODE ---------------------------- */}
            {tab === 'code' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-black text-slate-900">أكواد مخصصة</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      CSS و JS يُحقنان داخل واجهة متجرك فقط — في بيئة معزولة ومنقّاة من الأكواد الخطرة.
                    </p>
                  </div>
                  <Button size="sm" onClick={saveCode} disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
                  </Button>
                </div>

                <div className="space-y-5">
                  <div>
                    <Label className="mb-1.5 block text-xs font-black text-slate-600">CSS مخصص</Label>
                    <Textarea
                      dir="ltr"
                      rows={8}
                      value={customCss}
                      onChange={(e) => setCustomCss(e.target.value)}
                      placeholder=".my-store-button { background: #0d9488; }"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-black text-slate-600">JavaScript مخصص</Label>
                    <Textarea
                      dir="ltr"
                      rows={8}
                      value={customJs}
                      onChange={(e) => setCustomJs(e.target.value)}
                      placeholder="// يعمل بعد اكتمال تحميل الصفحة"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs font-black text-slate-600">وسوم الرأس (Head Inject)</Label>
                    <Textarea
                      dir="ltr"
                      rows={4}
                      value={headInject}
                      onChange={(e) => setHeadInject(e.target.value)}
                      placeholder='<meta name="..." content="..." />'
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageTemplate>
  );
}
