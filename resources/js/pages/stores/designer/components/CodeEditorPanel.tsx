import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Braces, Check, FileCode2, FileJson2, Paintbrush } from 'lucide-react';
import CodeEditor from '@/components/code-editor';
import type { BuilderDesignTokens, BuilderSectionConfig } from '@/builder/types';

export type DesignerMode = 'visual' | 'code';
type CodeTab = 'theme' | 'css' | 'js' | 'head';

export interface ThemeJsonPayload {
  theme?: string;
  tokens?: BuilderDesignTokens;
  sections?: Array<Partial<BuilderSectionConfig>>;
}

type Props = {
  theme: string;
  tokens: BuilderDesignTokens;
  sections: BuilderSectionConfig[];
  customCss: string;
  customJs: string;
  headInject: string;
  onApplyThemeJson: (parsed: ThemeJsonPayload) => void;
  onCssChange: (value: string) => void;
  onJsChange: (value: string) => void;
  onHeadChange: (value: string) => void;
};

const TABS: Array<{ key: CodeTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'theme', label: 'theme.json', icon: FileJson2 },
  { key: 'css', label: 'custom.css', icon: Paintbrush },
  { key: 'js', label: 'scripts.js', icon: Braces },
  { key: 'head', label: 'head_inject.html', icon: FileCode2 },
];

/**
 * Code editor mode of the store designer — a tabbed CodeMirror surface over
 * the raw layout schema (theme.json) plus custom.css / scripts.js /
 * head_inject.html. The live preview stays mounted beside it and re-renders
 * as soon as the JSON parses or CSS is typed.
 */
export const CodeEditorPanel: React.FC<Props> = ({
  theme,
  tokens,
  sections,
  customCss,
  customJs,
  headInject,
  onApplyThemeJson,
  onCssChange,
  onJsChange,
  onHeadChange,
}) => {
  const [tab, setTab] = useState<CodeTab>('theme');

  /* ---------------- theme.json (validated live) ---------------- */
  const canonical = useMemo(
    () => JSON.stringify({ theme, tokens, sections }, null, 2),
    [theme, tokens, sections]
  );
  const [themeText, setThemeText] = useState(canonical);
  const lastPushed = useRef(canonical);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    // External change (visual builder / template switch / load): resync text.
    if (canonical !== lastPushed.current) {
      setThemeText(canonical);
      lastPushed.current = canonical;
      setJsonError(null);
    }
  }, [canonical]);

  const handleThemeText = (next: string) => {
    setThemeText(next);
    if (!next.trim()) {
      setJsonError('الملف فارغ — أضف JSON صالح.');
      return;
    }
    try {
      const parsed = JSON.parse(next) as ThemeJsonPayload;
      setJsonError(null);
      lastPushed.current = next;
      onApplyThemeJson(parsed);
    } catch (e) {
      setJsonError((e as Error)?.message || 'JSON غير صالح');
    }
  };

  /* ---------------- render ---------------- */
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 px-3 py-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            dir="ltr"
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-xs font-bold transition ${
              tab === key ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
        <span className="ms-auto hidden shrink-0 items-center gap-1 ps-3 text-[11px] font-bold text-slate-400 sm:flex">
          يُحفظ تلقائياً ويُطبّق فوراً على المعاينة
        </span>
      </div>

      {/* Validation banner */}
      {tab === 'theme' && (
        <div
          className={`flex items-center gap-2 border-b px-4 py-2 text-xs font-bold ${
            jsonError ? 'border-red-100 bg-red-50 text-red-600' : 'border-emerald-100 bg-emerald-50 text-emerald-700'
          }`}
          dir="ltr"
        >
          {jsonError ? (
            <>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">JSON error: {jsonError}</span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>Valid JSON — preview is live</span>
            </>
          )}
        </div>
      )}
      {tab === 'head' && (
        <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          يُحقن هذا المحتوى داخل وسم &lt;head&gt; في متجرك العام (مناسب لوسوم Meta وGoogle Verification).
        </p>
      )}
      {tab === 'js' && (
        <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          أكواد JavaScript / بكسلات التتبع تُحقن في نهاية صفحة المتجر العام فقط (لا تعمل داخل المعاينة).
        </p>
      )}

      {/* Editors */}
      <div className="min-h-0 flex-1 overflow-hidden" dir="ltr">
        {tab === 'theme' && (
          <CodeEditor value={themeText} onChange={handleThemeText} language="json" height="100%" />
        )}
        {tab === 'css' && (
          <CodeEditor value={customCss} onChange={onCssChange} language="css" height="100%" placeholder={'/* مثال:\n.hero-section { padding-top: 0 !important; } */'} />
        )}
        {tab === 'js' && (
          <CodeEditor value={customJs} onChange={onJsChange} language="javascript" height="100%" placeholder="// console.log('مرحباً من متجري');" />
        )}
        {tab === 'head' && (
          <CodeEditor value={headInject} onChange={onHeadChange} language="html" height="100%" placeholder={'<meta name="..." content="..." />'} />
        )}
      </div>
    </div>
  );
};

export default CodeEditorPanel;
