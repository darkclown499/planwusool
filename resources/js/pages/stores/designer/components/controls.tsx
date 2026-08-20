import React from 'react';
import {
  Megaphone,
  Layout,
  Sparkles,
  Grid,
  Package,
  BadgePercent,
  Image,
  Shield,
  Star,
  HelpCircle,
  Video,
  Mail,
  Phone,
  PanelBottom,
  Code,
  type LucideIcon,
} from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import type { BuilderPropSchema } from '@/builder/types';

export const SECTION_ICONS: Record<string, LucideIcon> = {
  megaphone: Megaphone,
  layout: Layout,
  sparkles: Sparkles,
  grid: Grid,
  package: Package,
  badge: BadgePercent,
  image: Image,
  shield: Shield,
  star: Star,
  help: HelpCircle,
  video: Video,
  mail: Mail,
  phone: Phone,
  'panel-bottom': PanelBottom,
  code: Code,
};

export const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-1 pt-4 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
    {children}
  </div>
);

export const FieldLabel: React.FC<{ label: string; hint?: string }> = ({ label, hint }) => (
  <div className="mb-1.5">
    <span className="text-xs font-bold text-slate-700">{label}</span>
    {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
  </div>
);

export const toggleClass = (on: boolean) =>
  `relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
    on ? 'bg-emerald-500' : 'bg-slate-300'
  }`;

export const knobClass = (on: boolean) =>
  `inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-[19px]' : 'translate-x-[2px]'}`;

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={toggleClass(checked)}>
    <span className={knobClass(checked)} />
  </button>
);

/** Renders an editable field based on a prop schema entry. */
export const PropField: React.FC<{
  prop: BuilderPropSchema;
  value: any;
  onChange: (key: string, value: any) => void;
}> = ({ prop, value, onChange }) => {
  const set = (v: any) => onChange(prop.key, v);

  switch (prop.type) {
    case 'boolean':
      return (
        <div className="mb-4 flex items-center justify-between gap-3">
          <FieldLabel label={prop.label} />
          <Toggle checked={!!value} onChange={(v) => set(v)} />
        </div>
      );

    case 'select':
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} />
          <select
            value={value || prop.default || ''}
            onChange={(e) => set(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            {(prop.options || []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );

    case 'color':
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} />
          <div className="flex items-center gap-2">
            <span
              className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-slate-200"
              style={{ background: value || prop.default || '#0f8a5f' }}
            />
            <input
              type="color"
              value={normalizeColor(value || prop.default || '#0f8a5f')}
              onChange={(e) => set(e.target.value)}
              className="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
            />
            <input
              type="text"
              value={value || prop.default || ''}
              onChange={(e) => set(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-400"
              placeholder="#hex"
            />
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} />
          <MediaPicker
            label={prop.label}
            value={value || ''}
            onChange={(v) => set(v)}
            placeholder="اختر صورة..."
            dragDrop
          />
        </div>
      );

    case 'textarea':
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} />
          <textarea
            value={value || ''}
            onChange={(e) => set(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      );

    case 'number':
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} />
          <input
            type="number"
            value={value ?? prop.default ?? ''}
            onChange={(e) => set(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      );

    case 'link':
    case 'text':
    default:
      return (
        <div className="mb-4">
          <FieldLabel label={prop.label} />
          <input
            type="text"
            value={value || ''}
            onChange={(e) => set(e.target.value)}
            placeholder={prop.hint || ''}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      );
  }
};

export const normalizeColor = (v: string): string => {
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return v;
  return '#0f8a5f';
};