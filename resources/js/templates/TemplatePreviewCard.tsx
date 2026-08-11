import React, { useState } from 'react';
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
 * TemplatePreviewCard - shows a full-page screenshot of the template.
 * On hover the page auto-scrolls from top to bottom. Each card has a
 * "معاينة" button that opens the demo store with that template applied.
 */
export const TemplatePreviewCard: React.FC<TemplatePreviewCardProps> = ({
  template,
  demoStoreUrl = '',
  isLocked = false,
  isActive = false,
  previewImageUrl,
  onSelect,
}) => {
  const [imgError, setImgError] = useState(false);

  const imageUrl =
    previewImageUrl || `/templates/previews/${template.slug}.webp`;

  const previewUrl = demoStoreUrl
    ? `${demoStoreUrl}?theme=${encodeURIComponent(template.slug)}&preview=1`
    : '';

  const openPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewUrl) {
      window.open(previewUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const primaryColor = template.design_tokens?.colors?.['primary-500'] || '#10b77f';

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-xl ${
        isActive
          ? 'border-indigo-500 ring-2 ring-indigo-500/30'
          : 'border-gray-200'
      }`}
    >
      {/* Full-page scrollable preview */}
      <button
        type="button"
        onClick={onSelect}
        className="template-preview-card block w-full text-start"
        aria-label={`اختيار قالب ${template.name}`}
      >
        <div className="relative h-60 w-full overflow-hidden bg-gray-100">
          <div className="template-preview-fade template-preview-fade-top" />
          {imgError ? (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: template.design_tokens?.colors?.background || '#f3f4f6' }}
            >
              <span className="text-sm font-semibold" style={{ color: primaryColor }}>
                {template.name}
              </span>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={`معاينة ${template.name}`}
              loading="lazy"
              className="template-preview-scroll h-auto w-full"
              onError={() => setImgError(true)}
            />
          )}
          <div className="template-preview-fade template-preview-fade-bottom" />

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
              style={{ backgroundColor: primaryColor }}
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