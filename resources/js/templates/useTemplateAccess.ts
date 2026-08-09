import { useMemo, useCallback } from 'react';
import {
  type PlanTier,
  type TemplateConfig,
  type TemplateSectionConfig,
  canAccessTemplate,
  getTemplateTierFromPlanName,
} from '@/templates/types';
import { getTemplateConfig } from '@/templates/registry';

interface TemplateAccessOptions {
  templateSlug?: string;
  userPlanName?: string | null;
  userPlanTier?: PlanTier;
  isSuperAdmin?: boolean;
  isPreview?: boolean;
}

interface TemplateAccessResult {
  template: TemplateConfig | null;
  canActivate: boolean;
  canCustomize: boolean;
  canUseAdvancedBuilder: boolean;
  planTier: PlanTier;
  isLocked: boolean;
  filterSections: (sections: TemplateSectionConfig[]) => TemplateSectionConfig[];
}

/**
 * Hook for checking template access based on user's plan tier.
 */
export function useTemplateAccess({
  templateSlug,
  userPlanName,
  userPlanTier,
  isSuperAdmin = false,
  isPreview = false,
}: TemplateAccessOptions): TemplateAccessResult {
  const planTier: PlanTier = useMemo(
    () => userPlanTier || getTemplateTierFromPlanName(userPlanName),
    [userPlanName, userPlanTier]
  );

  const template = useMemo(
    () => (templateSlug ? getTemplateConfig(templateSlug) : null),
    [templateSlug]
  );

  const canActivate = useMemo(() => {
    if (isSuperAdmin || isPreview) return true;
    if (!template) return false;
    return canAccessTemplate(template, planTier);
  }, [template, planTier, isSuperAdmin, isPreview]);

  // Advanced builder is only available on professional tier
  const canCustomize = useMemo(
    () => isSuperAdmin || planTier === 'professional',
    [planTier, isSuperAdmin]
  );

  const canUseAdvancedBuilder = useMemo(
    () => canActivate && canCustomize,
    [canActivate, canCustomize]
  );

  const isLocked = useMemo(
    () => !isSuperAdmin && !!template && !canAccessTemplate(template, planTier),
    [template, planTier, isSuperAdmin]
  );

  /**
   * Filter sections based on plan conditions.
   * Sections with conditions that exclude this plan are removed.
   */
  const filterSections = useCallback(
    (sections: TemplateSectionConfig[]): TemplateSectionConfig[] => {
      return sections
        .filter((section) => {
          if (!section.conditions) return true;

          const { plan_type, action } = section.conditions;
          if (action === 'hide' && plan_type && !plan_type.includes(planTier)) {
            return false;
          }
          if (action === 'show' && plan_type && !plan_type.includes(planTier)) {
            return false;
          }
          return true;
        })
        .sort((a, b) => a.order - b.order);
    },
    [planTier]
  );

  return {
    template,
    canActivate,
    canCustomize,
    canUseAdvancedBuilder,
    planTier,
    isLocked,
    filterSections,
  };
}

// Re-export for convenience
export { getTemplateTierFromPlanName };