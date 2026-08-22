import React from 'react';
import { Palette, SlidersHorizontal, X, LayoutTemplate, ChevronLeft } from 'lucide-react';
import { DEFAULT_TOKENS } from '@/builder/design-tokens';
import { getSectionMeta } from '@/builder';
import type { BuilderDesignTokens, BuilderSectionConfig } from '@/builder/types';
import { PropField, GroupLabel, Toggle } from './controls';

type Props = {
  section: BuilderSectionConfig | null;
  onSectionPropChange: (key: string, value: any) => void;
  themesUrl: string;
  designTokens: BuilderDesignTokens;
  onTokensChange: (next: BuilderDesignTokens) => void;
  /** The store's own categories — feeds the category multi-select editor. */
  storeCategories?: any[];
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
  themesUrl,
  designTokens,
  onTokensChange,
  storeCategories = [],
}) => {
  const [tab, setTab] = React.useState<'section' | 'global'>(section ? 'section' : 'global');

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
  // "أساسي" = everyday content fields (title/image/count). Everything else
  // (layout/style) plus behavior switches lives in "متقدم".
  const basicProps = meta?.props.filter((p) => p.group === 'content') || [];
  const advancedProps = meta?.props.filter((p) => p.group !== 'content' && p.group !== 'behavior') || [];
  const behaviorProps = meta?.props.filter((p) => p.group === 'behavior') || [];
  const [propTab, setPropTab] = React.useState<'basic' | 'advanced'>('basic');

  React.useEffect(() => {
    if (section) {
      setPropTab('basic');
    }
  }, [section?.id]);

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
              {/* أساسي / متقدم sub-tabs */}
              <div className="my-3 flex rounded-full bg-slate-100 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPropTab('basic')}
                  className={`flex-1 rounded-full py-1.5 transition ${propTab === 'basic' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                >
                  أساسي
                </button>
                <button
                  type="button"
                  onClick={() => setPropTab('advanced')}
                  className={`flex-1 rounded-full py-1.5 transition ${propTab === 'advanced' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                >
                  متقدم
                </button>
              </div>

              {propTab === 'basic' ? (
                basicProps.length ? (
                  basicProps.map((prop) => (
                    <PropField
                      key={prop.key}
                      prop={prop}
                      value={sectionProps[prop.key]}
                      onChange={onSectionPropChange}
                      storeCategories={storeCategories}
                    />
                  ))
                ) : (
                  <p className="py-6 text-center text-xs text-slate-400">لا توجد خصائص أساسية لهذا القسم — جرّب تبويب «متقدم».</p>
                )
              ) : (
                <>
                  {advancedProps.length || behaviorProps.length ? (
                    advancedProps.map((prop) => (
                      <PropField
                        key={prop.key}
                        prop={prop}
                        value={sectionProps[prop.key]}
                        onChange={onSectionPropChange}
                        storeCategories={storeCategories}
                      />
                    ))
                  ) : (
                    <p className="py-6 text-center text-xs text-slate-400">لا توجد إعدادات متقدمة في هذا القسم.</p>
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
            {/* Template selection lives on the dedicated gallery page */}
            <GroupLabel>القالب</GroupLabel>
            <a
              href={themesUrl}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-600"
            >
              <span className="flex items-center gap-2">
                <LayoutTemplate className="h-4 w-4 text-emerald-500" />
                معرض القوالب
              </span>
              <ChevronLeft className="h-4 w-4" />
            </a>
            <p className="mt-2 mb-1 text-[11px] leading-relaxed text-slate-400">
              استعرض القوالب الجاهزة بمعاينة حية وطبّقها من صفحة القوالب المخصصة.
            </p>

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