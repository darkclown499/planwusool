import React, { useState, useMemo, useCallback } from 'react';
import type { DesignTokens, TemplateConfig } from '@/templates/types';
import { applyDesignTokensToCSS } from '@/utils/designTokens';
import { UpgradePrompt } from '@/templates/PlanGuard';

interface AdvancedBuilderProps {
  template: TemplateConfig | null;
  storeId?: number | string;
  designTokens?: DesignTokens | null;
  userPlanName?: string | null;
  userPlanTier?: 'starter' | 'growth' | 'professional';
  isSuperAdmin?: boolean;
  onSave?: (tokens: DesignTokens) => void;
  onClose?: () => void;
}

/**
 * AdvancedBuilder - premium-only template customization panel.
 * Lets the store owner change colors, typography, and spacing.
 * Requires the professional plan (advanced builder access).
 */
export const AdvancedBuilder: React.FC<AdvancedBuilderProps> = ({
  template,
  storeId,
  designTokens,
  userPlanName,
  userPlanTier,
  isSuperAdmin = false,
  onSave,
  onClose,
}) => {
  const [tokens, setTokens] = useState<DesignTokens>(
    () => designTokens || template?.design_tokens || { colors: {} }
  );
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'spacing' | 'export'>('colors');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleTokenChange = useCallback(
    (group: keyof DesignTokens, key: string, value: string) => {
      setTokens((prev) => ({
        ...prev,
        [group]: { ...(prev[group] || {}), [key]: value },
      }));
      setSaved(false);
    },
    []
  );

  // Live preview: apply tokens to CSS vars immediately
  const applyPreview = useCallback(
    (next: DesignTokens) => {
      applyDesignTokensToCSS(next);
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      if (storeId) {
        const response = await fetch(`/api/stores/${storeId}/design-tokens`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          },
          body: JSON.stringify({ design_tokens: tokens }),
        });
        if (!response.ok) {
          throw new Error('Failed to save');
        }
      }
      if (onSave) onSave(tokens);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error('Failed to save design tokens:', error);
    } finally {
      setSaving(false);
    }
  }, [storeId, tokens, onSave]);

  // Guard: only advanced builder access (professional plan or admin)
  const canAccess = useMemo(
    () => isSuperAdmin || userPlanTier === 'professional',
    [isSuperAdmin, userPlanTier]
  );

  if (!canAccess) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <UpgradePrompt
          templateSlug={template?.slug}
          templateName={template?.name}
          requiredPlan="professional"
          userPlanName={userPlanName}
          userPlanTier={userPlanTier}
        />
      </div>
    );
  }

  const colors = tokens.colors || {};

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div>
          <h3 className="font-bold text-gray-900">محرر التنسيق المتقدم</h3>
          <p className="text-xs text-gray-500">قم بتخصيص هوية قالب «{template?.name || ''}»</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200"
            aria-label="إغلاق"
          >
            <XIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([
          ['colors', 'الألوان'],
          ['typography', 'الخطوط'],
          ['spacing', 'المسافات'],
          ['export', 'الكود'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 text-sm font-semibold transition ${
              activeTab === key
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'colors' && (
          <ColorPanel colors={colors} onChange={(k, v) => {
            handleTokenChange('colors', k, v);
            applyPreview({ ...tokens, colors: { ...colors, [k]: v } });
          }} />
        )}
        {activeTab === 'typography' && (
          <TypographyPanel tokens={tokens} onChange={handleTokenChange} />
        )}
        {activeTab === 'spacing' && (
          <SpacingPanel tokens={tokens} onChange={handleTokenChange} />
        )}
        {activeTab === 'export' && (
          <ExportPanel tokens={tokens} />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
        <span className="text-xs text-gray-500">يتم تطبيق التغييرات مباشرة (معاينة حية)</span>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs font-medium text-emerald-600">تم الحفظ ✓</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Panels ---------- */

const ColorPanel: React.FC<{ colors: Record<string, string>; onChange: (key: string, value: string) => void }> = ({ colors, onChange }) => {
  const groups: Record<string, string[]> = {
    'الأساسية': ['primary-50', 'primary-100', 'primary-500', 'primary-600', 'primary-700'],
    'الخلفيات': ['background', 'surface'],
    'النصوص': ['text-primary', 'text-muted'],
    'إضافية': ['secondary-500'],
  };

  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([groupName, keys]) => (
        <div key={groupName}>
          <h4 className="mb-2 text-sm font-semibold text-gray-700">{groupName}</h4>
          <div className="grid grid-cols-2 gap-3">
            {keys.map((key) => {
              const value = colors[key] || '#000000';
              return (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={normalizeColor(value)}
                    onChange={(e) => onChange(key, e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-600">{key}</div>
                    <div className="text-[10px] text-gray-400" dir="ltr">{value}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const TypographyPanel: React.FC<{ tokens: DesignTokens; onChange: (g: keyof DesignTokens, k: string, v: string) => void }> = ({ tokens, onChange }) => {
  const typography = tokens.typography || {};
  return (
    <div className="space-y-4">
      {[
        ['font-family', 'الخط الرئيسي'],
        ['font-family-body', 'خط النصوص'],
        ['font-family-heading', 'خط العناوين'],
        ['heading-weight', 'وزن العناوين'],
      ].map(([key, label]) => (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
          <input
            type="text"
            value={typography[key] || ''}
            onChange={(e) => onChange('typography', key, e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            dir="ltr"
            placeholder="مثال: Tajawal, Playfair Display"
          />
        </div>
      ))}
    </div>
  );
};

const SpacingPanel: React.FC<{ tokens: DesignTokens; onChange: (g: keyof DesignTokens, k: string, v: string) => void }> = ({ tokens, onChange }) => {
  const spacing = tokens.spacing || {};
  return (
    <div className="space-y-4">
      {[
        ['section', 'مسافة الأقسام'],
        ['container', 'مسافة الحاوية'],
      ].map(([key, label]) => (
        <div key={key}>
          <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
          <input
            type="text"
            value={spacing[key] || ''}
            onChange={(e) => onChange('spacing', key, e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            dir="ltr"
            placeholder="مثال: py-12, px-4"
          />
        </div>
      ))}
      <p className="text-xs text-gray-400">استخدم فئات Tailwind CSS مثل py-8، px-4، mx-auto</p>
    </div>
  );
};

const ExportPanel: React.FC<{ tokens: DesignTokens }> = ({ tokens }) => {
  const css = useMemo(() => {
    const lines: string[] = [':root {'];
    const colors = tokens.colors || {};
    Object.entries(colors).forEach(([key, value]) => {
      lines.push(`  --twc-${kebab(key)}: ${value};`);
    });
    const typography = tokens.typography || {};
    Object.entries(typography).forEach(([key, value]) => {
      lines.push(`  --twf-${kebab(key)}: ${value};`);
    });
    lines.push('}');
    return lines.join('\n');
  }, [tokens]);

  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-sm font-semibold text-gray-700">CSS Variables المُولدة</h4>
        <pre
          className="max-h-64 overflow-auto rounded-xl bg-gray-900 p-4 text-xs text-emerald-400"
          dir="ltr"
        >
          {css}
        </pre>
      </div>
      <button
        onClick={copy}
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        {copied ? 'تم النسخ ✓' : 'نسخ الكود'}
      </button>
      <p className="text-xs text-gray-400">
        يمكنك لصق هذه المتغيرات في ملف CSS مخصص لمزيد من التحكم.
      </p>
    </div>
  );
};

/* ---------- Helpers ---------- */

const normalizeColor = (value: string): string => {
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  if (/^rgb/.test(value)) {
    const match = value.match(/[\d.]+/g);
    if (match && match.length >= 3) {
      return `#${match.slice(0, 3).map((n) => Math.min(255, Math.round(Number(n))).toString(16).padStart(2, '0')).join('')}`;
    }
  }
  return '#000000';
};

const kebab = (str: string): string => str.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()).toLowerCase();

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default AdvancedBuilder;