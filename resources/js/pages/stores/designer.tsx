import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Check,
  Code2,
  Eye,
  LayoutTemplate,
  Loader2,
  Palette,
  Save,
  Settings2,
  Store,
} from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MediaPicker from '@/components/MediaPicker';
import { apiGet, apiPut } from '@/utils/api';
import { getTemplateModule, listTemplateModules, type TemplateModule } from '@/templates-v2';

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

export default function StoreDesigner({ store, availableThemes, storeUrl }: Props) {
  const [tab, setTab] = useState<Tab>('templates');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const modules = useMemo(() => listTemplateModules(), []);
  const activeModule: TemplateModule | null = useMemo(() => {
    try {
      return getTemplateModule(theme);
    } catch {
      return null;
    }
  }, [theme]);

  const isAllowed = useCallback((slug: string) => availableThemes.includes(slug), [availableThemes]);

  /** Apply a template switch immediately (theme-only payload). */
  const applyTemplate = async (slug: string, name: string) => {
    setSaving(true);
    try {
      await apiPut(`/api/stores/${store.id}/designer`, { theme: slug });
      setTheme(slug);
      toast.success('تم تطبيق القالب', { description: `قالب «${name}» أصبح نشطاً.` });
    } catch {
      toast.error('تعذر تطبيق القالب');
    } finally {
      setSaving(false);
    }
  };

  /** Persist the content blob (slot values). */
  const saveContent = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/stores/${store.id}/designer`, { content });
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
              onClick={() => setTab(id)}
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
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {modules.map((m) => {
                  const active = theme === m.meta.slug;
                  const locked = !isAllowed(m.meta.slug);
                  return (
                    <div
                      key={m.meta.slug}
                      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                        active ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'
                      } ${locked ? 'opacity-60' : ''}`}
                    >
                      <div className="relative h-32" style={{ background: m.meta.preview }}>
                        <span className="absolute inset-x-5 top-5 bottom-0 flex flex-col gap-2 opacity-90">
                          <span className="h-2.5 w-2/3 rounded-full bg-black/10" />
                          <span className="h-10 w-full rounded-md bg-white/45" />
                          <span className="flex gap-1.5">
                            {[...Array(4)].map((_, i) => (
                              <span key={i} className="aspect-[3/4] flex-1 rounded bg-white/55" />
                            ))}
                          </span>
                        </span>
                        <span className="absolute bottom-2 right-3 rounded-lg bg-black/45 px-2 py-0.5 text-sm font-black text-white backdrop-blur-sm">
                          {m.meta.name}
                        </span>
                        {active && (
                          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow">
                            <Check className="h-3.5 w-3.5" /> نشط الآن
                          </span>
                        )}
                      </div>
                      <div className="p-3.5">
                        <p className="mb-2 line-clamp-2 min-h-9 text-xs leading-relaxed text-gray-500">{m.meta.description}</p>
                        <Button
                          size="sm"
                          variant={active ? 'ghost' : 'default'}
                          disabled={active || locked || saving}
                          onClick={() => applyTemplate(m.meta.slug, m.meta.name)}
                          className={active ? 'w-full gap-1.5 text-emerald-600' : 'w-full gap-1.5'}
                          style={!active && !locked ? { backgroundColor: m.meta.accent } : undefined}
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : active ? <Check className="h-3.5 w-3.5" /> : null}
                          {locked ? 'غير متاح في باقتك' : active ? 'مطبَّق حالياً' : 'تطبيق القالب'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center">
                  <p className="text-sm font-bold text-slate-500">تريد رؤية القوالب على بياناتك الحقيقية؟</p>
                  <Button size="sm" variant="outline" className="mt-3" asChild>
                    <a href={`/stores/${store.id}/templates`}>تصفح معرض القوالب</a>
                  </Button>
                </div>
              </div>
            )}

            {/* -------------------------- CONTENT -------------------------- */}
            {tab === 'content' && (
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
            )}

            {/* --------------------------- BRAND --------------------------- */}
            {tab === 'brand' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-black text-slate-900">هوية المتجر البصرية</h2>
                    <p className="mt-0.5 text-xs text-gray-500">الألوان والاستدارة والخط — تُطبَّق فوق أي قالب.</p>
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
            )}

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
