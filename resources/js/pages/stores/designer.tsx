import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { Loader2, Check, Save, Monitor, Tablet, Smartphone, ExternalLink, XCircle, AlertTriangle, Code2, LayoutGrid } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { Button } from '@/components/ui/button';
import { apiGet, apiPut } from '@/utils/api';
import { getBuilderTemplate } from '@/builder';
import { defaultSectionProps } from '@/builder';
import type { BuilderDesignTokens, BuilderSectionConfig, BuilderSectionType } from '@/builder/types';
import { SectionLibrary } from './designer/components/SectionLibrary';
import { Canvas } from './designer/components/Canvas';
import { Inspector } from './designer/components/Inspector';
import CodeEditorPanel, { type DesignerMode, type ThemeJsonPayload } from './designer/components/CodeEditorPanel';

type Device = 'desktop' | 'tablet' | 'mobile';

interface Props {
  store: { id: number; name: string; slug: string; theme?: string };
  availableThemes?: string[];
  settings?: Record<string, any>;
}

const DEVICE_WIDTHS: Record<Device, string> = {
  desktop: 'w-full',
  tablet: 'w-[820px]',
  mobile: 'w-[400px]',
};

export default function StoreDesigner({ store, settings = {} }: Props) {
  const [theme, setTheme] = useState<string>('');
  const [sections, setSections] = useState<BuilderSectionConfig[]>([]);
  const [designTokens, setDesignTokens] = useState<BuilderDesignTokens>({ colors: {} });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>('desktop');
  const [mode, setMode] = useState<DesignerMode>('visual');
  const [customCss, setCustomCss] = useState('');
  const [customJs, setCustomJs] = useState('');
  const [headInject, setHeadInject] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [seedDefaults, setSeedDefaults] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(false);

  const apiUrl = `/api/stores/${store.id}/designer`;

  const load = useCallback(async () => {
    try {
      const data = await apiGet(apiUrl);
      skipNextSave.current = true;
      const themeSlug = data.theme || store.theme || 'zen';
      const tpl = getBuilderTemplate(themeSlug);
      setTheme(themeSlug);
      setSections(
        data.sections?.length
          ? data.sections.map((s: any, i: number) => ({ id: s.id, type: s.type, enabled: s.enabled !== false, order: i, props: { ...defaultSectionProps(s.type), ...(s.props || {}) } }))
          : (tpl?.sections || []).map((s) => ({ ...s }))
      );
      setDesignTokens({ colors: { ...(tpl?.tokens?.colors || {}), ...(data.design_tokens?.colors || {}) }, typography: { ...(data.design_tokens?.typography || {}) }, radius: data.design_tokens?.radius });
      setCustomCss(typeof data.custom_css === 'string' ? data.custom_css : '');
      setCustomJs(typeof data.custom_js === 'string' ? data.custom_js : '');
      setHeadInject(typeof data.head_inject === 'string' ? data.head_inject : '');
      setSeedDefaults(!data.sections?.length);
      setLoaded(true);
    } catch (e) {
      console.error('Failed to load designer state', e);
      setSaveState('error');
    }
  }, [apiUrl, store.theme]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    async (nextTheme?: string, nextSections?: BuilderSectionConfig[], nextTokens?: BuilderDesignTokens) => {
      setSaveState('saving');
      try {
        await apiPut(apiUrl, {
          theme: nextTheme ?? theme,
          sections: nextSections ?? sections,
          design_tokens: nextTokens ?? designTokens,
          custom_css: customCss,
          custom_js: customJs,
          head_inject: headInject,
        });
        setSaveState('saved');
      } catch (e) {
        console.error('Save failed', e);
        setSaveState('error');
      }
    },
    [apiUrl, theme, sections, designTokens, customCss, customJs, headInject]
  );

  // Task 1 — persist the template's default schema on first load when the
  // store has no custom overrides yet, so the live store is never a blank canvas.
  useEffect(() => {
    if (!loaded || !seedDefaults) return;
    setSeedDefaults(false);
    persist();
  }, [loaded, seedDefaults, persist]);

  // Debounced autosave
  useEffect(() => {
    if (!loaded || skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(), 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, designTokens, theme, loaded]);

  // Debounced autosave for the code-editor assets (css/js/head).
  useEffect(() => {
    if (!loaded || skipNextSave.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(), 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customCss, customJs, headInject, loaded]);

  // Live-apply the merchant's custom CSS inside the designer preview.
  useEffect(() => {
    let el = document.getElementById('wusool-store-custom-css') as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = 'wusool-store-custom-css';
      document.head.appendChild(el);
    }
    el.textContent = customCss || '';
    return () => {
      el?.remove();
    };
  }, [customCss]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === 'library') {
      const type = draggableId.replace('lib:', '') as BuilderSectionType;
      const next = [...sections];
      const instance: BuilderSectionConfig = {
        id: `${type}-${Date.now()}`,
        type,
        enabled: true,
        order: destination.index,
        props: defaultSectionProps(type),
      };
      next.splice(destination.index, 0, instance);
      setSections(next.map((s, i) => ({ ...s, order: i })));
      setSelectedId(instance.id);
    } else if (source.droppableId === 'canvas') {
      const next = [...sections];
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      setSections(next.map((s, i) => ({ ...s, order: i })));
    }
  };

  const addSection = (type: string) => {
    const instance: BuilderSectionConfig = {
      id: `${type}-${Date.now()}`,
      type: type as BuilderSectionType,
      enabled: true,
      order: sections.length,
      props: defaultSectionProps(type as BuilderSectionType),
    };
    setSections([...sections, instance]);
    setSelectedId(instance.id);
  };

  const updateSectionProp = (id: string, key: string, value: any) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, props: { ...s.props, [key]: value } } : s)));
  };

  const toggleSection = (id: string, enabled: boolean) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)));
  };

  const deleteSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i })));
    if (selectedId === id) setSelectedId(null);
  };

  /** Apply a parsed theme.json from code-editor mode onto live designer state. */
  const applyThemeJson = useCallback((parsed: ThemeJsonPayload) => {
    if (!parsed || typeof parsed !== 'object') return;
    if (typeof parsed.theme === 'string' && parsed.theme) {
      const nextTpl = getBuilderTemplate(parsed.theme);
      if (nextTpl) setTheme(nextTpl.slug);
    }
    if (Array.isArray(parsed.sections)) {
      const normalized = parsed.sections
        .filter((sec) => !!sec && !!sec.type)
        .map((sec, i) => ({
          id: String(sec.id || `${sec.type}-${i + 1}`),
          type: sec.type as BuilderSectionType,
          enabled: sec.enabled !== false,
          order: Number(sec.order) || i,
          props: { ...defaultSectionProps(sec.type as BuilderSectionType), ...(sec.props || {}) },
        }));
      setSections(normalized);
      skipNextSave.current = false;
    }
    if (parsed.tokens && typeof parsed.tokens === 'object') {
      setDesignTokens((prev) => ({
        ...prev,
        ...parsed.tokens,
        colors: { ...(prev?.colors || {}), ...(parsed.tokens?.colors || {}) },
        typography: { ...(prev?.typography || {}), ...(parsed.tokens?.typography || {}) },
        radius: parsed.tokens?.radius ?? prev?.radius,
      }));
    }
  }, []);

  const storeData = React.useMemo(
    () => ({
      ...store,
      categories: [] as any[],
      products: [] as any[],
      config: { ...settings, storeName: store?.name || 'متجري' },
      storeSettings: settings,
      content: {},
      offers: [],
      pages: [],
      behavior: {},
    }),
    [store, settings]
  );

  const selectedSection = sections.find((s) => s.id === selectedId) || null;
  const previewUrl = `https://${store.slug}.${window.location.host.split(':')[0]}`;

  const statusEl = (() => {
    switch (saveState) {
      case 'saving':
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            حفظ...
          </span>
        );
      case 'saved':
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <Check className="h-3.5 w-3.5" />
            محفوظ
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-red-600">
            <XCircle className="h-3.5 w-3.5" />
            فشل الحفظ — حاول مرة أخرى
          </span>
        );
      default:
        return null;
    }
  })();

  return (
    <PageTemplate
      title="مصمم المتجر"
      description="اسحب وأفلت الأقسام وصمّم متجرك بحرية كاملة"
      url={`/stores/${store.id}/designer`}
      backUrl={`/stores/${store.id}/settings?tab=template`}
      noPadding
      action={
        <div className="flex items-center gap-3">
          {/* Designer mode switcher — visual builder / code editor */}
          <div className="flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {(
              [
                ['visual', 'المصمم البصري', LayoutGrid],
                ['code', 'محرر الكود', Code2],
              ] as Array<[DesignerMode, string, React.ComponentType<{ className?: string }>]>
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  mode === key ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-600'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
          {statusEl}
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-2"
            onClick={() => window.open(previewUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            عرض المتجر
          </Button>
          <Button size="sm" className="h-8 gap-2" onClick={() => persist()} disabled={saveState === 'saving'}>
            {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ
          </Button>
        </div>
      }
    >
      {!loaded ? (
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          {mode === 'code' && (
            <div className="flex h-[calc(100vh-112px)] gap-4">
              {/* Code editor */}
              <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
                <CodeEditorPanel
                  theme={theme}
                  tokens={designTokens}
                  sections={sections}
                  customCss={customCss}
                  customJs={customJs}
                  headInject={headInject}
                  onApplyThemeJson={applyThemeJson}
                  onCssChange={setCustomCss}
                  onJsChange={setCustomJs}
                  onHeadChange={setHeadInject}
                />
              </main>

              {/* Live preview stays mounted beside the editor */}
              <aside className="hidden w-[460px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100 xl:flex">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
                  <span className="text-xs font-extrabold text-slate-600">معاينة حيّة</span>
                  <span className="text-[11px] text-slate-400">تتحدث فوراً مع كل تعديل</span>
                </div>
                <div className="min-h-0 flex-1 overflow-auto p-4">
                  <div className="mx-auto min-h-[600px] w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <Canvas
                      sections={sections}
                      storeData={storeData}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      onToggleEnabled={toggleSection}
                      onDelete={deleteSection}
                    />
                  </div>
                </div>
              </aside>
            </div>
          )}

          {mode === 'visual' && (
          <div className="flex h-[calc(100vh-112px)] gap-4">
            {/* Section library */}
            <aside className="w-[280px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <SectionLibrary onAdd={addSection} />
            </aside>

            {/* Live canvas */}
            <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
                <div className="flex items-center gap-1.5 rounded-full bg-slate-100 p-1">
                  {(
                    [
                      ['desktop', 'ديسكتوب', Monitor],
                      ['tablet', 'تابلت', Tablet],
                      ['mobile', 'موبايل', Smartphone],
                    ] as Array<[Device, string, React.ComponentType<{ className?: string }>]>
                  ).map(([key, label, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDevice(key)}
                      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                        device === key ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-400">
                  {sections.filter((s) => s.enabled).length} سيكشن ظاهر من {sections.length}
                </span>
              </div>
              <div className="flex-1 overflow-auto">
                <div className="mx-auto p-8">
                  <div
                    className={`mx-auto ${DEVICE_WIDTHS[device]} min-h-[600px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-300`}
                    style={{ maxWidth: '100%' }}
                  >
                    <Canvas
                      sections={sections}
                      storeData={storeData}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      onToggleEnabled={toggleSection}
                      onDelete={deleteSection}
                    />
                  </div>
                </div>
              </div>
            </main>

            {/* Inspector */}
            <aside className="w-[320px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Inspector
                section={selectedSection}
                onSectionPropChange={(key, value) => selectedId && updateSectionProp(selectedId, key, value)}
                themesUrl={`/stores/${store.id}/themes`}
                designTokens={designTokens}
                onTokensChange={(next) => setDesignTokens(next)}
              />
            </aside>
          </div>
          )}
        </DragDropContext>
      )}
      {saveState === 'error' && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg">
          <AlertTriangle className="h-4 w-4" />
          تعذّر حفظ التصميم. تحقق من اتصالك ثم اضغط حفظ.
        </div>
      )}
    </PageTemplate>
  );
}