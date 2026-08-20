import React from 'react';
import { Palette, SlidersHorizontal, X, Check } from 'lucide-react';
import { getBuilderTemplateSummaries } from '@/builder';
import { DEFAULT_TOKENS } from '@/builder/design-tokens';
import { getSectionMeta } from '@/builder';
import type { BuilderDesignTokens, BuilderSectionConfig, BuilderTemplateSummary } from '@/builder/types';
import { PropField, GroupLabel, Toggle } from './controls';

type Props = {
  section: BuilderSectionConfig | null;
  onSectionPropChange: (key: string, value: any) => void;
  currentTheme: string;
  onThemeChange: (slug: string) => void;
  designTokens: BuilderDesignTokens;
  onTokensChange: (next: BuilderDesignTokens) => void;
};

const FONTS = [
  { value: "'Tajawal', 'Cairo', sans-serif", label: 'Tajawal' },
  { value: "'Cairo', 'Tajawal', sans-serif", label: 'Cairo' },
  { value: "'Almarai', sans-serif", label: 'Almarai' },
  { value: "'Noto Kufi Arabic', sans-serif", label: 'Noto Kufi' },
  { value: "'Rubik', 'Tajawal', sans-serif", label: 'Rubik' },
];

export const Inspector: React.FC<Props> = ({
  section,
  onSectionPropChange,
  currentTheme,
  onThemeChange,
  designTokens,
  onTokensChange,
}) => {
  const [tab, setTab] = React.useState<'section' | 'global'>(section ? 'section' : 'global');
  const templates = React.useMemo(() => getBuilderTemplateSummaries(), []);

  React.useEffect(() => {
    if (section) setTab('section');
  }, [section]);

  const tokens = React.useMemo<BuilderDesignTokens>(
    () => ({ ...DEFAULT_TOKENS, colors: { ...DEFAULT_TOKENS.colors, ...(designTokens?.colors || {}) }, typography: { ...DEFAULT_TOKENS.typography, ...(designTokens?.typography || {}) }, radius: designTokens?.radius || DEFAULT_TOKENS.radius, spacing: designTokens?.spacing || DEFAULT_TOKENS.spacing }),
    [designTokens]
  );

  const setColor = (key: string, value: string) =>
    onTokensChange({ ...designTokens, colors: { ...(designTokens?.colors || {}), [key]: value } });

  const setFont = (key: string, value: string) =>
    onTokensChange({ ...designTokens, typography: { ...(designTokens?.typography || {}), [key]: value } });

  const meta = section ? getSectionMeta(section.type) : null;
  const sectionProps = section?.props || {};
  const visibleProps = meta?.props.filter((p) => p.group !== 'behavior') || [];
  const behaviorProps = meta?.props.filter((p) => p.group === 'behavior') || [];

  return (
    <div className="flex h-full flex-col overflow-hidden border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
          {tab === 'global' ? <Palette className="h-4 w-4 text-emerald-600" /> : <SlidersHorizontal className="h-4 w-4 text-emerald-600" />}
          {tab === 'global' ? 'التصميم العام' : meta?.name || 'خصائص السيكشن'}
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => setTab('section')}
          className={`flex-1 py-2.5 transition ${tab === 'section' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-400'}`}
        >
          السيكشن
        </button>
        <button
          type="button"
          onClick={() => setTab('global')}
          className={`flex-1 py-2.5 transition ${tab === 'global' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-slate-400'}`}
        >
          عام
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {tab === 'section' ? (
          section && meta ? (
            <>
              {(visibleProps.length || behaviorProps.length) ? (
                visibleProps.map((prop) => (
                  <PropField key={prop.key} prop={prop} value={sectionProps[prop.key]} onChange={onSectionPropChange} />
                ))
              ) : (
                <p className="py-6 text-center text-xs text-slate-400">لا توجد خصائص قابلة للتعديل في هذا السيكشن.</p>
              )}

              {behaviorProps.length > 0 && (
                <>
                  <GroupLabel>السلوك</GroupLabel>
                  {behaviorProps.map((prop) => (
                    <div key={prop.key} className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-xs font-bold text-slate-700">{prop.label}</span>
                      <Toggle checked={sectionProps[prop.key] !== false} onChange={(v) => onSectionPropChange(prop.key, v)} />
                    </div>
                  ))}
                </>
              )}
            </>
          ) : (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 py-10 text-center">
              <SlidersHorizontal className="h-8 w-8 text-slate-300" />
              <p className="text-xs font-bold text-slate-400">اختر سيكشن من اللوحة لتعديل خصائصه</p>
            </div>
          )
        ) : (
          <>
            {/* Template picker */}
            <GroupLabel>القالب</GroupLabel>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t: BuilderTemplateSummary) => {
                const active = t.slug === currentTheme;
                return (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => onThemeChange(t.slug)}
                    className={`group relative overflow-hidden rounded-xl border text-start transition ${
                      active ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <span className="block h-14 w-full" style={{ background: t.preview }} />
                    <span className="flex items-center justify-between bg-white px-2.5 py-2">
                      <span className="text-[11px] font-bold text-slate-700">{t.name}</span>
                      {active && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                    </span>
                    {!t.is_free && <span className="absolute top-1 right-1 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white">مميز</span>}
                  </button>
                );
              })}
            </div>

            <GroupLabel>الألوان</GroupLabel>
            <div className="space-y-3">
              {(
                [
                  ['primary', 'اللون الأساسي'],
                  ['secondary', 'اللون الثانوي'],
                  ['accent', 'لون التمييز'],
                  ['background', 'خلفية الصفحة'],
                  ['surface', 'خلفية الأقسام'],
                  ['text_primary', 'لون النصوص الأساسية'],
                  ['text_secondary', 'لون النصوص الثانوية'],
                  ['border', 'لون الحدود'],
                ] as Array<[string, string]>
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-700">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={tokens.colors[key] || '#0f8a5f'}
                      onChange={(e) => setColor(key, e.target.value)}
                      className="h-7 w-9 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5"
                    />
                    <input
                      type="text"
                      value={tokens.colors[key] || ''}
                      onChange={(e) => setColor(key, e.target.value)}
                      className="w-20 rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-emerald-400"
                    />
                  </div>
                </div>
              ))}
            </div>

            <GroupLabel>الخطوط</GroupLabel>
            <div className="mb-3">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">خط العناوين</span>
              <select
                value={tokens.typography?.heading_font || FONTS[0].value}
                onChange={(e) => setFont('heading_font', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-400"
              >
                {FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">خط النصوص</span>
              <select
                value={tokens.typography?.body_font || FONTS[0].value}
                onChange={(e) => setFont('body_font', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-400"
              >
                {FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <GroupLabel>الشكل</GroupLabel>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-700">نعومة الزوايا</span>
              <select
                value={tokens.radius || '1rem'}
                onChange={(e) => onTokensChange({ ...designTokens, radius: e.target.value })}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 outline-none"
              >
                <option value="0.375rem">صغيرة</option>
                <option value="0.75rem">متوسطة</option>
                <option value="1rem">كبيرة</option>
                <option value="1.5rem">ناعمة جداً</option>
                <option value="9999px">دائرية</option>
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const EmptyInspectorHint: React.FC = () => (
  <div className="flex h-full items-center justify-center p-8 text-center">
    <div>
      <X className="mx-auto mb-2 h-6 w-6 text-slate-300" />
      <p className="text-xs text-slate-400">اختر سيكشن لتعديل خصائصه</p>
    </div>
  </div>
);