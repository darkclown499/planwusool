import React from 'react';
import type { TemplateConfig } from '@/templates/types';

interface TemplatePreviewCardProps {
  template: TemplateConfig;
  demoStoreUrl?: string;
  isLocked?: boolean;
  isActive?: boolean;
  previewImageUrl?: string;
  onSelect: () => void;
}

/**
 * TemplatePreviewCard - shows a generated mock preview of the template that is
 * always on-brand (colored from the template design tokens) so the gallery
 * feels alive instead of showing stale/empty screenshots.
 */
export const TemplatePreviewCard: React.FC<TemplatePreviewCardProps> = ({
  template,
  demoStoreUrl = '',
  isLocked = false,
  isActive = false,
  onSelect,
}) => {
  const colors = template.design_tokens?.colors ?? {};
  const background = colors.background || '#ffffff';
  const surface = colors.surface || '#f9fafb';
  const primary = colors['primary-500'] || '#10b77f';
  const primaryDark = colors['primary-600'] || primary;
  const muted = colors['text-muted'] || '#9ca3af';

  const previewUrl = demoStoreUrl
    ? `${demoStoreUrl}?theme=${encodeURIComponent(template.slug)}&preview=1`
    : '';

  const openPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const buttonColor = primary;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-xl ${
        isActive ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-gray-200'
      }`}
    >
      {/* Full-page mock preview */}
      <button
        type="button"
        onClick={onSelect}
        className="template-preview-card block w-full text-start"
        aria-label={`اختيار قالب ${template.name}`}
      >
        <div className="relative h-60 w-full overflow-hidden" style={{ background }}>
          <div className="pointer-events-none transition-transform duration-500 group-hover:-translate-y-4">
            {/* Header bar */}
            <div
              className="flex items-center gap-2 border-b px-4 py-2.5"
              style={{ background: surface, borderColor: 'rgba(0,0,0,0.06)' }}
            >
              <span className="h-5 w-5 rounded-md" style={{ background: primary }} />
              <span className="h-2 w-20 rounded-full" style={{ background: muted, opacity: 0.5 }} />
              <span className="ms-auto h-6 w-12 rounded-full" style={{ background: primary }} />
            </div>

            {/* Hero */}
            <div
              className="px-4 py-4"
              style={{ background: `linear-gradient(135deg, ${primary}, ${primaryDark})` }}
            >
              <div className="h-3 w-28 rounded-full" style={{ background: 'rgba(255,255,255,0.92)' }} />
              <div className="mt-2 h-2 w-40 rounded-full" style={{ background: 'rgba(255,255,255,0.55)' }} />
              <div className="mt-3 flex gap-2">
                <span className="h-6 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.9)' }} />
                <span className="h-6 w-12 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} />
              </div>
            </div>

            {/* Category chips */}
            <div className="flex gap-2 px-4 py-3">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                  style={{ background: `${primary}14` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: primary }} />
                  <span className="h-1 w-8 rounded-full" style={{ background: primary, opacity: 0.4 }} />
                </span>
              ))}
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-3 gap-2.5 px-4 pb-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="rounded-xl p-1.5"
                  style={{ background: surface, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                  <div
                    className="aspect-square rounded-lg"
                    style={{ background: `linear-gradient(135deg, ${primary}30, ${primary}0d)` }}
                  />
                  <div className="mt-1.5 h-1.5 w-full rounded-full" style={{ background: muted, opacity: 0.4 }} />
                  <div className="mt-1 h-1.5 w-2/3 rounded-full" style={{ background: muted, opacity: 0.3 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Lock overlay */}
          {isLocked && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
              <div className="flex flex-col items-center gap-1 text-white">
                <LockIcon className="h-8 w-8" />
                <span className="text-xs font-semibold">قالب مدفوع</span>
              </div>
            </div>
          )}

          {/* Free/Paid badge */}
          <div
            className={`absolute right-2 top-2 z-10 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white shadow ${
              template.is_free ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          >
            {template.is_free ? 'مجاني' : 'مدفوع'}
          </div>
        </div>
      </button>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-bold text-gray-900">{template.name}</h4>
            <p className="mt-0.5 text-[11px] text-gray-500">
              {template.description}
            </p>
          </div>
          {isActive && (
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              القالب الحالي
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          {isLocked ? (
            <button
              onClick={onSelect}
              className="flex-1 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
            >
              ترقية للاستخدام
            </button>
          ) : isActive ? (
            <span className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-center text-xs font-semibold text-gray-500">
              مستخدم الآن
            </span>
          ) : (
            <button
              onClick={onSelect}
              className="flex-1 rounded-xl px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: buttonColor }}
            >
              استخدام القالب
            </button>
          )}
          <button
            onClick={openPreview}
            disabled={!previewUrl}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            معاينة
          </button>
        </div>
      </div>
    </div>
  );
};

const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

export default TemplatePreviewCard;