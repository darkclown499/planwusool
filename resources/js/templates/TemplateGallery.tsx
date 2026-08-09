import React, { useMemo, useState } from 'react';
import type { PlanTier, TemplateConfig } from '@/templates/types';
import { getAllTemplates, getTemplatesByCategory } from '@/templates/registry';
import { PLAN_HIERARCHY } from '@/templates/types';
import { UpgradePrompt } from '@/templates/PlanGuard';
import { TemplatePreviewCard } from '@/templates/TemplatePreviewCard';

interface TemplateGalleryProps {
  currentSlug?: string;
  userPlanName?: string | null;
  userPlanTier?: PlanTier;
  isSuperAdmin?: boolean;
  demoStoreUrl?: string;
  onSelect?: (templateSlug: string) => void;
  className?: string;
}

/**
 * TemplateGallery - grid of all 29 templates with access control.
 * Free/Growth plans see all templates but paid ones show upgrade prompts.
 * Each card shows a full-page scrollable preview + a "معاينة" button.
 */
export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  currentSlug,
  userPlanName,
  userPlanTier = 'starter',
  isSuperAdmin = false,
  demoStoreUrl = '',
  onSelect,
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
                  <TemplatePreviewCard
                    key={template.slug}
                    template={template}
                    demoStoreUrl={demoStoreUrl}
                    isActive={template.slug === currentSlug || template.slug === selectedSlug}
                    isLocked={!canAccess(template)}
                    onSelect={() => handleSelect(template)}
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

export default TemplateGallery;