import React, { useMemo, useState } from 'react';
import type { PlanTier, TemplateConfig } from '@/templates/types';
import { getAllTemplates, getTemplatesByCategory } from '@/templates/registry';
import { PLAN_HIERARCHY } from '@/templates/types';
import { UpgradePrompt } from '@/templates/PlanGuard';

interface TemplateGalleryProps {
  currentSlug?: string;
  userPlanName?: string | null;
  userPlanTier?: PlanTier;
  isSuperAdmin?: boolean;
  onSelect?: (templateSlug: string) => void;
  onPreview?: (templateSlug: string) => void;
  className?: string;
}

/**
 * TemplateGallery - grid of all 29 templates with access control.
 * Free/Growth plans see all templates but paid ones show upgrade prompts.
 */
export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  currentSlug,
  userPlanName,
  userPlanTier = 'starter',
  isSuperAdmin = false,
  onSelect,
  onPreview,
  className = '',
}) => {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(currentSlug || null);
  const [filter, setFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null);

  const allTemplates = useMemo(() => getAllTemplates(), []);
  const byCategory = useMemo(() => getTemplatesByCategory(), []);

  const filtered = useMemo(() => {
    let list = allTemplates;
    if (filter === 'free') list = list.filter((t) => t.is_free);
    if (filter === 'paid') list = list.filter((t) => !t.is_free);
    return list;
  }, [allTemplates, filter]);

  const categories = Object.keys(byCategory);

  const canAccess = (template: TemplateConfig): boolean =>
    isSuperAdmin || template.is_free || PLAN_HIERARCHY[userPlanTier] >= PLAN_HIERARCHY[template.plan_required];

  const handleSelect = (template: TemplateConfig) => {
    if (!canAccess(template)) {
      setSelectedTemplate(template);
      return;
    }
    setSelectedSlug(template.slug);
    if (onSelect) onSelect(template.slug);
  };

  return (
    <div className={className}>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {([
          ['all', 'الكل'],
          ['free', 'المجانية'],
          ['paid', 'المدفوعة'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="mr-auto text-sm text-gray-500">
          {filtered.length} قالب
        </span>
      </div>

      {/* Categories */}
      {categories
        .filter((cat) => filtered.some((t) => t.category === cat))
        .map((category) => {
          const templates = filtered.filter((t) => t.category === category);
          return (
            <div key={category} className="mb-8">
              <h3 className="mb-4 text-lg font-bold text-gray-900">{categoryLabel(category)}</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.slug}
                    template={template}
                    isActive={template.slug === currentSlug || template.slug === selectedSlug}
                    isLocked={!canAccess(template)}
                    onSelect={() => handleSelect(template)}
                    onPreview={() => {
                      if (onPreview) onPreview(template.slug);
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}

      {/* Upgrade modal for locked templates */}
      {selectedTemplate && !canAccess(selectedTemplate) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedTemplate(null)}>
          <div className="max-w-lg" onClick={(e) => e.stopPropagation()}>
            <UpgradePrompt
              templateSlug={selectedTemplate.slug}
              templateName={selectedTemplate.name}
              requiredPlan={selectedTemplate.plan_required}
              userPlanName={userPlanName}
              userPlanTier={userPlanTier}
            />
            <button
              onClick={() => setSelectedTemplate(null)}
              className="mx-auto mt-3 block rounded-lg bg-white/90 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface TemplateCardProps {
  template: TemplateConfig;
  isActive?: boolean;
  isLocked?: boolean;
  onSelect: () => void;
  onPreview?: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, isActive, isLocked, onSelect, onPreview }) => {
  const primaryColor = template.design_tokens?.colors?.['primary-500'] || '#10b77f';

  return (
    <div
      className={`group overflow-hidden rounded-2xl border bg-white transition hover:shadow-lg ${
        isActive ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-gray-200'
      }`}
    >
      {/* Preview thumbnail (colored placeholder based on design tokens) */}
      <button
        onClick={onPreview || onSelect}
        className="relative block h-40 w-full overflow-hidden"
        style={{
          background: template.design_tokens?.colors?.background || '#ffffff',
        }}
        aria-label={`معاينة ${template.name}`}
      >
        <div className="absolute inset-0 flex flex-col p-4">
          <div
            className="h-2.5 w-16 rounded"
            style={{ background: primaryColor, borderRadius: 'var(--twb-radius, 0.375rem)' }}
          />
          <div className="mt-3 h-2 w-3/4 rounded bg-black/10" />
          <div className="mt-2 h-2 w-1/2 rounded bg-black/5" />
          <div className="mt-auto grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 rounded-lg"
                style={{ background: template.design_tokens?.colors?.surface || '#f9fafb' }}
              />
            ))}
          </div>
        </div>

        {/* Lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="flex flex-col items-center gap-1 text-white">
              <LockIcon className="h-8 w-8" />
              <span className="text-xs font-semibold">قالب مدفوع</span>
            </div>
          </div>
        )}

        {/* Free/Pro badge */}
        <div
          className={`absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white ${
            template.is_free ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        >
          {template.is_free ? 'مجاني' : 'مدفوع'}
        </div>
      </button>

      {/* Card body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-bold text-gray-900">{template.name}</h4>
            <p className="mt-0.5 text-[11px] text-gray-500">{categoryLabel(template.category)}</p>
          </div>
          {isActive && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              مستخدم الآن
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-xs text-gray-500">{template.description}</p>

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
              القالب الحالي
            </span>
          ) : (
            <button
              onClick={onSelect}
              className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
            >
              استخدام القالب
            </button>
          )}
          {onPreview && (
            <button
              onClick={onPreview}
              className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              معاينة
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const categoryLabels: Record<string, string> = {
  general: 'عام',
  fashion: 'أزياء وموضة',
  electronics: 'إلكترونيات',
  food: 'طعام ومطاعم',
  beauty: 'تجميل',
  digital: 'منتجات رقمية',
  luxury: 'فخامة',
  b2b: 'جملة B2B',
  home: 'منزل وديكور',
  automotive: 'سيارات',
  sports: 'رياضة',
  kids: 'أطفال',
  grocery: 'مواد غذائية',
  handmade: 'حرف يدوية',
  perfume: 'عطور',
  health: 'صحة',
  pets: 'حيوانات أليفة',
  books: 'كتب',
  flowers: 'زهور',
};

const categoryLabel = (key: string): string => categoryLabels[key] || key;

const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

export default TemplateGallery;