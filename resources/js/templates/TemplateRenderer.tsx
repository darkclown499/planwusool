import React, { useEffect, useMemo } from 'react';
import type { TemplateConfig, DesignTokens, TemplateSectionConfig } from '@/templates/types';
import { SECTION_COMPONENTS } from '@/templates/sections';
import { useTemplateAccess } from '@/templates/useTemplateAccess';
import { UpgradePrompt } from '@/templates/PlanGuard';
import { mergeDesignTokens, applyDesignTokensToCSS, tokensToCssVars } from '@/utils/designTokens';

interface TemplateRendererProps {
  template: TemplateConfig | null;
  storeData?: any;
  designTokens?: DesignTokens | null;
  overrides?: { sections?: TemplateSectionConfig[] } | null;
  userPlanName?: string | null;
  userPlanTier?: 'starter' | 'growth' | 'professional';
  isSuperAdmin?: boolean;
  isPreview?: boolean;
  loading?: boolean;
}

/**
 * TemplateRenderer - renders a store using a template's JSON config.
 * Enforces plan access via guards and applies design tokens as CSS variables.
 */
export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  template,
  storeData,
  designTokens,
  overrides,
  userPlanName,
  userPlanTier,
  isSuperAdmin = false,
  isPreview = false,
  loading = false,
}) => {
  const { canActivate, filterSections } = useTemplateAccess({
    templateSlug: template?.slug,
    userPlanName,
    userPlanTier,
    isSuperAdmin,
    isPreview,
  });

  // Merge template tokens with store overrides
  const mergedTokens = useMemo(
    () => mergeDesignTokens(template?.design_tokens, designTokens),
    [template?.design_tokens, designTokens]
  );

  // Apply design tokens to CSS variables
  useEffect(() => {
    applyDesignTokensToCSS(mergedTokens);
  }, [mergedTokens]);

  if (loading) {
    return <StoreSkeleton />;
  }

  if (!template) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900">القالب غير موجود</h1>
        <p className="mt-2 text-sm text-gray-600">لم يتم العثور على القالب المطلوب.</p>
      </div>
    );
  }

  // Locked template - show upgrade prompt but render preview-like skeleton
  if (!canActivate) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <UpgradePrompt
          templateSlug={template.slug}
          templateName={template.name}
          requiredPlan={template.plan_required}
          userPlanName={userPlanName}
          userPlanTier={userPlanTier}
        />
      </div>
    );
  }

  // Determine effective sections (overrides take precedence)
  const sections: TemplateSectionConfig[] = overrides?.sections?.length
    ? overrides.sections
    : template.sections;

  const enabledSections = filterSections(sections.filter((s) => s.enabled));

  return (
    <div
      className={`min-h-screen ${template.layout.dark_mode ? 'dark' : ''}`}
      style={{
        background: 'var(--twc-background, #ffffff)',
        color: 'var(--twc-text-primary, #111827)',
        ...tokensToCssVars(mergedTokens),
      }}
      dir="rtl"
    >
      {enabledSections.map((section) => {
        const Component = SECTION_COMPONENTS[section.type];
        if (!Component) {
          return (
            <div key={section.id} className="bg-amber-50 p-4 text-center text-sm text-amber-800">
              قسم غير معروف: {section.id} ({section.type})
            </div>
          );
        }
        return (
          <Component
            key={section.id}
            section={section}
            storeData={storeData}
            designTokens={mergedTokens}
            isPreview={isPreview}
          />
        );
      })}
    </div>
  );
};

/**
 * Loading skeleton for store template.
 */
export const StoreSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="h-16 animate-pulse bg-gray-200" />
    <div className="mx-auto max-w-7xl px-4 py-16">
      <div className="mx-auto h-10 w-2/3 animate-pulse rounded bg-gray-200" />
      <div className="mx-auto mt-4 h-4 w-1/2 animate-pulse rounded bg-gray-200" />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-gray-200" />
        ))}
      </div>
    </div>
  </div>
);

export default TemplateRenderer;